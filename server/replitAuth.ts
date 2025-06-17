import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import * as bcrypt from "bcryptjs";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { nanoid } from "nanoid";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      maxAge: sessionTtl,
      sameSite: 'lax', // Help with cross-site issues
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

async function upsertGoogleUser(
  profile: any,
) {
  await storage.upsertUser({
    id: `google:${profile.id}`, // Prefix with "google:" to avoid ID conflicts
    email: profile.emails?.[0]?.value,
    firstName: profile.name?.givenName,
    lastName: profile.name?.familyName,
    profileImageUrl: profile.photos?.[0]?.value,
    username: profile.displayName || profile.emails?.[0]?.value?.split("@")[0],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup Local Strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await storage.getUserByEmail(email);

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check if password field exists (for users who registered with OAuth)
        if (!user.password) {
          return done(null, false, { message: 'Please log in with the method you used to create your account' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Create user session similar to other auth methods
        const sessionUser = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
          },
          // No tokens for local users
          expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7, // 1 week expiration
        };

        return done(null, sessionUser);
      } catch (err) {
        return done(err);
      }
    }
  ));

  // Setup Replit Auth
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  // Setup Google Auth
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const googleCallbackURL = `https://${process.env.REPLIT_DOMAINS!.split(",")[0]}/api/auth/google/callback`;

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallbackURL,
        scope: ['profile', 'email']
      },
      async function(accessToken: string, refreshToken: string, profile: any, done: any) {
        try {
          await upsertGoogleUser(profile);

          // Create a user object similar to the Replit Auth user
          const user = {
            claims: {
              sub: `google:${profile.id}`,
              email: profile.emails?.[0]?.value,
              first_name: profile.name?.givenName,
              last_name: profile.name?.familyName,
              profile_image_url: profile.photos?.[0]?.value,
            },
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
          };

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }

  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user);
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    console.log("Deserializing user:", user);
    done(null, user);
  });

  // Replit Auth routes
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Google OAuth routes
  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { 
      failureRedirect: '/login',
      successRedirect: '/'
    })
  );

  // Note: Local auth registration is handled in routes.ts to support email verification

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({ 
          message: "Login successful",
          user: {
            id: user.claims.sub,
            email: user.claims.email,
            username: user.claims.username || user.claims.email.split('@')[0]
          }
        });
      });
    })(req, res, next);
  });

  // Shared logout route
  app.get("/api/logout", (req, res) => {
    const user = req.user as any;
    let authType = "replit";

    if (user?.claims?.sub?.startsWith("google:")) {
      authType = "google";
    } else if (user?.claims?.sub?.startsWith("local:")) {
      authType = "local";
    }

    req.logout(() => {
      if (authType === "google" || authType === "local") {
        // For Google and local users, just redirect to home
        res.redirect(`${req.protocol}://${req.hostname}`);
      } else {
        // For Replit users, use Replit's logout endpoint
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if it's a Google user
  const isGoogleUser = user?.claims?.sub?.startsWith("google:");

  if (isGoogleUser) {
    // Google auth doesn't need token refresh logic
    return next();
  }

  // Replit Auth token validation and refresh
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.redirect("/api/login");
  }
};