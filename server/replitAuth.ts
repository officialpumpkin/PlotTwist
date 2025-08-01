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

// Extend session types
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: {
      id: string;
      email: string;
      username: string;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
    };
  }
}

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
      domain: undefined, // Let browser determine domain
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
  // Check if user already exists to preserve their username
  const existingUser = await storage.getUserByEmail(claims["email"]);
  
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    // Preserve existing username if user exists, don't set allowUsernameUpdate
    username: existingUser?.username,
  });
}

async function upsertGoogleUser(
  profile: any,
) {
  const email = profile.emails?.[0]?.value;
  let username = profile.displayName || (email ? email.split("@")[0] : `user_${profile.id}`);

  console.log("Upserting Google user:", {
    id: `google:${profile.id}`,
    email,
    username,
    firstName: profile.name?.givenName,
    lastName: profile.name?.familyName,
  });

  // Check if a user with this email already exists (from local registration)
  const existingUser = await storage.getUserByEmail(email);
  
  if (existingUser && !existingUser.id.startsWith('google:')) {
    console.log("Found existing local user with this email. Updating their Google profile info.", {
      existingId: existingUser.id,
      email: email
    });
    
    // If existing user has a username, preserve it and skip username derivation
    if (existingUser.username) {
      username = existingUser.username;
      console.log("Preserving existing username:", existingUser.username);
    } else {
      // Only derive username if existing user doesn't have one
      // Check if the new username conflicts with another user
      const usernameConflict = await storage.getUserByUsername(username);
      if (usernameConflict && usernameConflict.id !== existingUser.id) {
        // Username is taken by another user, generate a unique one
        let counter = 1;
        let baseUsername = username;
        do {
          username = `${baseUsername}_${counter}`;
          counter++;
        } while (await storage.getUserByUsername(username));
        console.log("Generated unique username for existing user:", username);
      }
    }
    
    // Update the existing local user with Google profile information
    await storage.upsertUser({
      ...existingUser,
      username: existingUser.username, // Always use the existing username
      firstName: profile.name?.givenName || existingUser.firstName,
      lastName: profile.name?.familyName || existingUser.lastName,
      profileImageUrl: profile.photos?.[0]?.value || existingUser.profileImageUrl,
      emailVerified: true, // Mark as verified since Google verified it
      // Do not set allowUsernameUpdate - username should not change during OAuth login
    });
    
    return existingUser.id; // Return the existing user ID
  } else {
    // For new Google users, ensure username uniqueness
    const usernameConflict = await storage.getUserByUsername(username);
    if (usernameConflict) {
      // Generate a unique username by appending a number
      let counter = 1;
      let baseUsername = username;
      do {
        username = `${baseUsername}_${counter}`;
        counter++;
      } while (await storage.getUserByUsername(username));
      
      console.log("Generated unique username:", username);
    }
    
    // Create new Google user or update existing Google user
    await storage.upsertUser({
      id: `google:${profile.id}`, // Prefix with "google:" to avoid ID conflicts
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      profileImageUrl: profile.photos?.[0]?.value,
      username,
      emailVerified: true, // Google users are already verified
    });
    
    return `google:${profile.id}`;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport serialization
  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user);
    // Store the entire user object in the session
    done(null, user);
  });

  passport.deserializeUser(async (serializedUser: any, done) => {
    try {
      console.log("Deserializing user:", serializedUser);
      
      // If the serialized user has the expected structure, return it
      if (serializedUser && serializedUser.claims && serializedUser.claims.sub) {
        // Optionally verify the user still exists in the database
        const dbUser = await storage.getUser(serializedUser.claims.sub);
        
        // LOG: Passport deserialization details
        console.log("🎫 PASSPORT DESERIALIZE:", {
          userId: serializedUser.claims.sub,
          dbUserExists: !!dbUser,
          dbUsername: dbUser?.username,
          serializedEmail: serializedUser.claims.email
        });
        
        if (dbUser) {
          done(null, serializedUser);
        } else {
          // User no longer exists in database
          done(null, false);
        }
      } else {
        // Invalid user structure
        console.error("Invalid user structure during deserialization:", serializedUser);
        done(null, false);
      }
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });

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
    // Use the current request hostname for the callback URL
    const domain = process.env.REPLIT_DOMAINS!.split(",")[0];
    const googleCallbackURL = `https://${domain}/api/auth/google/callback`;

    console.log("Google OAuth Configuration:");
    console.log("- Client ID:", process.env.GOOGLE_CLIENT_ID ? "Set" : "Missing");
    console.log("- Client Secret:", process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Missing");
    console.log("- Callback URL:", googleCallbackURL);
    console.log("- Domain:", domain);

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallbackURL,
        scope: ['profile', 'email'],
        passReqToCallback: false
      },
      async function(accessToken: string, refreshToken: string, profile: any, done: any) {
        try {
          console.log("Google OAuth profile received:", {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            verified: profile.emails?.[0]?.verified
          });

          // Validate required profile data
          if (!profile.id || !profile.emails?.[0]?.value) {
            console.error("Invalid Google profile data:", profile);
            return done(new Error("Invalid profile data from Google"));
          }

          const actualUserId = await upsertGoogleUser(profile);

          // Create a user object similar to the Replit Auth user
          const user = {
            claims: {
              sub: actualUserId, // Use the actual user ID (could be existing local user ID)
              email: profile.emails[0].value,
              first_name: profile.name?.givenName,
              last_name: profile.name?.familyName,
              profile_image_url: profile.photos?.[0]?.value,
            },
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
          };

          console.log("Google OAuth user created successfully");
          return done(null, user);
        } catch (error) {
          console.error("Google OAuth strategy error:", error);
          return done(error, null);
        }
      }
    ));
  } else {
    console.warn("Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }

  // Google OAuth routes
  app.get('/api/auth/google', (req, res, next) => {
    try {
      console.log("Initiating Google OAuth flow");
      console.log("Request headers:", req.headers);
      console.log("Current domain:", req.get('host'));

      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error("Google OAuth not configured");
        return res.redirect('/login?error=oauth_not_configured');
      }

      const authenticator = passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
      });

      authenticator(req, res, (err) => {
        if (err) {
          console.error("Google OAuth authentication error:", err);
          console.error("Error details:", {
            name: err.name,
            message: err.message,
            stack: err.stack
          });
          return res.redirect('/login?error=oauth_auth_error');
        }
        next();
      });
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
      res.redirect('/login?error=oauth_init_failed');
    }
  });

  app.get('/api/auth/google/callback', 
    (req, res, next) => {
      console.log("Google OAuth callback received");
      console.log("Query params:", req.query);

      // Handle OAuth errors
      if (req.query.error) {
        console.error("Google OAuth error:", req.query.error);
        console.error("Error description:", req.query.error_description);
        return res.redirect('/login?error=oauth_failed');
      }

      passport.authenticate('google', { 
        failureRedirect: '/login?error=auth_failed'
      })(req, res, next);
    },
    async (req, res) => {
      try {
        console.log("Google OAuth callback - req.user:", req.user);

        // Check if user authentication was successful
        const user = req.user as any;
        if (!user?.claims?.sub) {
          console.error("No user claims found in Google OAuth callback");
          return res.redirect('/login?error=auth_failed');
        }

        console.log("Setting session for Google user:", user.claims.sub);

        // Get user details from database
        const dbUser = await storage.getUser(user.claims.sub);
        console.log("Retrieved dbUser:", dbUser);

        if (!dbUser) {
          console.error("No database user found for Google user:", user.claims.sub);
          return res.redirect('/login?error=user_not_found');
        }

        // Set session data with current database values
        req.session.userId = user.claims.sub;
        req.session.user = {
          id: dbUser.id,
          email: dbUser.email,
          username: dbUser.username, // Use database username, not derived username
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
        };

        console.log("Session data set:", {
          userId: req.session.userId,
          user: req.session.user
        });

        // Save session explicitly and wait for completion
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              console.error("Session save error:", err);
              reject(err);
            } else {
              console.log("Google OAuth session saved successfully");
              resolve();
            }
          });
        });

        // Regenerate session ID for security
        await new Promise<void>((resolve, reject) => {
          req.session.regenerate((err: any) => {
            if (err) {
              console.error("Session regenerate error:", err);
              reject(err);
            } else {
              // Re-set the session data after regeneration
              req.session.userId = user.claims.sub;
              req.session.user = {
                id: dbUser.id,
                email: dbUser.email,
                username: dbUser.username,
                firstName: dbUser.firstName,
                lastName: dbUser.lastName,
                profileImageUrl: dbUser.profileImageUrl,
              };
              console.log("Session regenerated successfully");
              resolve();
            }
          });
        });

        console.log("Redirecting to dashboard after successful Google OAuth");
        res.redirect('/dashboard');

      } catch (error) {
        console.error("Error in Google OAuth callback:", error);
        res.redirect('/login?error=internal_error');
      }
    }
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

        // Get fresh user data from database to ensure correct username
        const dbUser = await storage.getUser(user.claims.sub);
        
        // Set session data for consistent access
        req.session.userId = user.claims.sub;
        req.session.user = {
          id: user.claims.sub,
          email: user.claims.email,
          username: dbUser?.username || user.claims.email.split('@')[0],
          firstName: dbUser?.firstName,
          lastName: dbUser?.lastName,
          profileImageUrl: dbUser?.profileImageUrl,
        };

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