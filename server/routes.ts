import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { sendWelcomeEmail, sendStoryInvitationEmail, sendEmailVerification, sendPasswordResetEmail } from "./emailService";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "./db";
import { users } from "@shared/schema";
import { logger } from "./logger";
import { eq } from "drizzle-orm";
import {
  storyFormSchema,
  serverStorySchema,
  storySegmentFormSchema,
  printOrderFormSchema,
  registerSchema,
  loginSchema,
  stories,
  storyParticipants,
  storyTurns,
  storySegments,
  storyInvitations,
  storyJoinRequests,
  printOrders,
  userSettings,
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Set up file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage2,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images are allowed"));
  }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: any, res: any, next: any) => {
  // Check session-based auth first
  if (req.session?.userId && req.session?.user) {
    return next();
  }
  
  // Check passport-based auth
  if (req.user?.claims?.sub) {
    return next();
  }
  
  res.status(401).json({ message: "Unauthorized" });
};

const getCurrentUserId = (req: any): string | null => {
    return req.session?.userId || req.user?.claims?.sub || null;
  };

export async function registerRoutes(app: Express): Promise<Server> {
  // Request logging middleware
  app.use((req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = nanoid(8);

    req.requestId = requestId;
    req.startTime = startTime;

    const context = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      sessionId: req.sessionID,
      userId: req.session?.userId || req.user?.claims?.sub
    };

    logger.debug('Incoming request', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined
    }, context);

    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = Date.now() - startTime;
      logger.apiRequest(req.method, req.url, res.statusCode, duration, context);
      return originalSend.call(this, data);
    };

    next();
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  // Get current user
  app.get("/api/auth/user", async (req: any, res) => {
    console.log("=== /api/auth/user endpoint ===");
    console.log("Session data:", req.session);
    console.log("User from session:", req.session?.user);
    console.log("UserId from session:", req.session?.userId);
    console.log("Passport user:", req.user);
    console.log("Session ID:", req.sessionID);

    // Check for local auth session first
    if (req.session?.userId && req.session?.user) {
      console.log("Returning user from session");
      return res.json({
        id: req.session.user.id,
        email: req.session.user.email,
        username: req.session.user.username,
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName,
        profileImageUrl: req.session.user.profileImageUrl,
      });
    }

    // Check for passport-based auth (Replit Auth and Google Auth)
    if (req.user?.claims?.sub) {
      try {
        const userId = req.user.claims.sub;
        console.log("Looking up user in database for ID:", userId);
        const user = await storage.getUser(userId);
        console.log("Database lookup result:", user);
        
        if (user) {
          // Set session data for consistency
          req.session.userId = userId;
          req.session.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
          };
          
          // Save session
          await new Promise<void>((resolve, reject) => {
            req.session.save((err: any) => {
              if (err) {
                console.error("Session save error in auth/user:", err);
                reject(err);
              } else {
                console.log("Session saved in auth/user endpoint");
                resolve();
              }
            });
          });
          
          console.log("Returning user from database lookup");
          return res.json({
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
          });
        } else {
          console.log("No user found in database for ID:", userId);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }

    console.log("No valid authentication found, returning 401");
    return res.status(401).json({ message: "Unauthorized" });
  });

  // Email-based registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Validate with schema
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: result.error.format() 
        });
      }

      const { email, username, password } = result.data;

      // Check if user with this email or username exists
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate email verification token
      const verificationToken = nanoid(32);

      // Create user with unverified email
      const newUser = await storage.upsertUser({
        id: nanoid(),
        email,
        username,
        password: hashedPassword,
        emailVerified: false,
        emailVerificationToken: verificationToken,
      });

      // Send verification email (async, don't wait for it)
      // Use the request's host as it's what the user is actually using
      const host = req.get('host');
      const baseUrl = req.protocol + "://" + host;
      console.log("Using baseUrl for verification: " + baseUrl);
      sendEmailVerification(email, username, verificationToken, baseUrl).catch(error => {
        console.error('Failed to send verification email:', error);
      });

      // Return user without password and verification token
      const { password: _, emailVerificationToken: __, ...userWithoutPassword } = newUser;
      res.status(201).json({
        ...userWithoutPassword,
        message: "Account created! Please check your email to verify your account before logging in."
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const result = z.object({ email: z.string().email() }).safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid request",
          errors: result.error.errors,
        });
      }

      const { email } = result.data;

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "No account found with this email address" });
      }

      // Check if already verified
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Generate new verification token
      const verificationToken = nanoid(32);

      // Update user with new token
      await storage.upsertUser({
        ...user,
        emailVerificationToken: verificationToken,
      });

      // Send verification email
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || req.get('host');
      const baseUrl = "https://" + domain;

      const emailSent = await sendEmailVerification(email, user.username || 'User', verificationToken, baseUrl);

      if (emailSent) {
        res.json({ message: "Verification email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send verification email" });
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Forgot password
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const result = z.object({
        email: z.string().email(),
      }).safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Invalid email address",
          errors: result.error.errors,
        });
      }

      const { email } = result.data;

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, return success even if user doesn't exist
        return res.json({ message: "If an account with that email exists, we've sent a password reset link" });
      }

      // Generate password reset token
      const resetToken = nanoid(32);

      // Update user with reset token
      await storage.upsertUser({
        ...user,
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour expiry
      });

      // Send password reset email
      console.log("Attempting to send password reset email to: " + email);
      const host = req.get('host');
      const baseUrl = req.protocol + "://" + host;
      console.log("Using baseUrl for password reset: " + baseUrl);
      const emailSent = await sendPasswordResetEmail(email, user.username || 'User', resetToken, baseUrl);
      console.log("Password reset email sent result: " + emailSent);

      if (emailSent) {
        res.json({ message: "If an account with that email exists, we've sent a password reset link" });
      } else {
        console.error("Failed to send password reset email - emailSent was false");
        res.status(500).json({ message: "Failed to send password reset email" });
      }
    } catch (error) {
      console.error("Error sending password reset email:", error);
      res.status(500).json({ message: "Failed to send password reset email" });
    }
  });

  app.post("/api/auth/login", async (req: any, res) => {
    const context = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    try {
      const { email, password } = req.body;
      console.log("Login attempt for:", email);

      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const foundUser = user[0];

      // Check if email is verified
      if (!foundUser.emailVerified) {
        return res.status(401).json({
          message: "Please verify your email before logging in",
          emailVerificationRequired: true,
          email: foundUser.email,
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, foundUser.password || "");
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create user session - store user ID directly in session
      req.session.userId = foundUser.id;
      req.session.user = {
        id: foundUser.id,
        email: foundUser.email,
        username: foundUser.username,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        profileImageUrl: foundUser.profileImageUrl,
      };

      console.log("Setting session data:", {
        userId: req.session.userId,
        user: req.session.user
      });

      // Save session and ensure it's properly stored
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Session saved successfully");
            console.log("Session ID:", req.sessionID);
            console.log("Session after save:", {
              userId: req.session.userId,
              user: req.session.user
            });
            resolve();
          }
        });
      });

      const responseUser = {
        id: foundUser.id,
        email: foundUser.email,
        username: foundUser.username,
      };

      res.json({
        message: "Login successful",
        user: responseUser,
      });
    } catch (error) {
      logger.error("Login error", error as Error, context, {
        email: req.body.email,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid'); // Clear the session cookie
      res.json({ message: "Logged out successfully" });
    });
  });

  // Email verification endpoint
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Update user to be verified
      await storage.verifyUserEmail(user.id);

      res.json({ message: "Email verified successfully! You can now log in." });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Password reset verification endpoint
  app.get('/api/auth/verify-reset-token', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid reset token" });
      }

      // Find user by reset token
      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      res.json({ message: "Reset token is valid", email: user.email });
    } catch (error) {
      console.error("Error verifying reset token:", error);
      res.status(500).json({ message: "Failed to verify reset token" });
    }
  });

  // Reset password endpoint
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Reset token and new password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Find user by reset token
      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Update user with new password and clear reset token
      await storage.upsertUser({
        ...user,
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordLastChanged: new Date()
      });

      res.json({ message: "Password reset successfully! You can now log in with your new password." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Story routes
  // Get all stories
  app.get('/api/stories', async (req, res) => {
    try {
      const stories = await storage.getStories();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  // Get a specific story
  app.get('/api/stories/:id', async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const story = await storage.getStoryById(storyId);

      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      res.json(story);
    } catch (error) {
      console.error("Error fetching story:", error);
      res.status(500).json({ message: "Failed to fetch story" });
    }
  });

  // Create a new story
  app.post('/api/stories', isAuthenticated, async (req: any, res) => {
    try {
      // Make sure we have a userId
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ 
          message: "Unauthorized - user not properly authenticated",
          details: "User ID missing from authentication"
        });
      }

      const userId = req.user.claims.sub;
      console.log("Creating story with userID:", userId);

      try {
        // First validate client-side data
        const clientData = storyFormSchema.parse(req.body);

        // Then add creatorId and validate with server schema
        const validatedData = serverStorySchema.parse({
          ...clientData,
          creatorId: userId
        });

        const newStory = await storage.createStory(validatedData);

        // Add creator as a participant
        await storage.addParticipant({
          storyId: newStory.id,
          userId: userId
        });

        // Initialize turn to the creator
        await storage.createStoryTurn({
          storyId: newStory.id,
          currentTurn: 1,
          currentUserId: userId
        });

        res.status(201).json(newStory);
      } catch (validationError) {
        console.error("Validation error:", validationError);
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid story data", 
            errors: validationError.errors 
          });
        }
        throw validationError; // Re-throw if not a ZodError
      }
    } catch (error) {
      console.error("Error creating story:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid story data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create story" });
    }
  });

  // Get user's stories
  app.get('/api/my-stories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userStories = await storage.getStoriesByUser(userId);
      res.json(userStories);
    } catch (error) {
      console.error("Error fetching user stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  // Get stories where it's the user's turn
  app.get('/api/my-turn', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get all stories where user is a participant
      const allStories = await storage.getStories();
      const participantStories = [];

      for (const story of allStories) {
        const isParticipant = await storage.isParticipant(story.id, userId);
        if (isParticipant) {
          participantStories.push(story);
        }
      }

      // Get turns for these stories where it's the user's turn
      const myTurnStories = [];

      for (const story of participantStories) {
        const turn = await storage.getStoryTurn(story.id);
        if (turn && turn.currentUserId === userId && !story.isComplete) {
          myTurnStories.push(story);
        }
      }

      res.json(myTurnStories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  // Get stories waiting for others
  app.get('/api/waiting-turn', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get all stories where user is a participant
      const allStories = await storage.getStories();
      const participantStories = [];

      for (const story of allStories) {
        const isParticipant = await storage.isParticipant(story.id, userId);
        if (isParticipant) {
          participantStories.push(story);
        }
      }

      // Get turns for these stories where it's NOT the user's turn
      const waitingStories = [];

      for (const story of participantStories) {
        const turn = await storage.getStoryTurn(story.id);
        if (turn && turn.currentUserId !== userId && !story.isComplete) {
          waitingStories.push({
            ...story,
            currentTurn: turn.currentTurn,
            currentUserId: turn.currentUserId
          });
        }
      }

      res.json(waitingStories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  // Request to join a story
  app.post('/api/stories/:id/request-join', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { message } = req.body;

      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Check if user is already a participant
      const isAlreadyParticipant = await storage.isParticipant(storyId, userId);
      if (isAlreadyParticipant) {
        return res.status(400).json({ message: "Already a participant in this story" });
      }

      // Check if user is the author
      if (story.creatorId === userId) {
        return res.status(400).json({ message: "You are the author of this story" });
      }

      // Check if there's already a pending request
      const existingRequest = await storage.getStoryJoinRequest(storyId, userId);
      if (existingRequest && existingRequest.status === "pending") {
        return res.status(400).json({ message: "You already have a pending request for this story" });
      }

      // Create join request
      const joinRequest = await storage.createStoryJoinRequest({
        storyId,
        requesterId: userId,
        authorId: story.creatorId,
        message: message || null,
        status: "pending"
      });

      res.status(201).json(joinRequest);
    } catch (error) {
      console.error("Error creating join request:", error);
      res.status(500).json({ message: "Failed to create join request" });
    }
  });

  // Cancel join request
  app.delete('/api/stories/:id/cancel-request', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const joinRequest = await storage.getStoryJoinRequest(storyId, userId);
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }

      if (joinRequest.requesterId !== userId) {
        return res.status(403).json({ message: "You can only cancel your own requests" });
      }

      if (joinRequest.status !== "pending") {
        return res.status(400).json({ message: "Can only cancel pending requests" });
      }

      await storage.updateStoryJoinRequest(joinRequest.id, { status: "cancelled" });

      res.json({ message: "Join request cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling join request:", error);
      res.status(500).json({ message: "Failed to cancel join request" });
    }
  });

  // Get pending join requests for current user's stories (as author)
  app.get('/api/join-requests/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const requests = await storage.getPendingJoinRequestsForUser(userId);

      // Get additional data for each request
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          const story = await storage.getStoryById(request.storyId);
          const requester = await storage.getUser(request.requesterId);

          return {
            ...request,
            story: story ? {
              id: story.id,
              title: story.title,
              description: story.description,
              genre: story.genre,
            } : null,
            requester: requester ? {
              id: requester.id,
              username: requester.username || "Unknown",
              firstName: requester.firstName,
              lastName: requester.lastName,
              profileImageUrl: requester.profileImageUrl,
            } : null,
          };
        })
      );

      res.json(requestsWithDetails);
    } catch (error) {
      console.error("Error fetching pending join requests:", error);
      res.status(500).json({ message: "Failed to fetch join requests" });
    }
  });

  // Approve join request
  app.post('/api/join-requests/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const joinRequest = await storage.getStoryJoinRequestById(requestId);
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }

      if (joinRequest.authorId !== userId) {
        return res.status(403).json({ message: "Only the story author can approve requests" });
      }

      if (joinRequest.status !== "pending") {
        return res.status(400).json({ message: "Request has already been " + joinRequest.status });
      }

      // Update request status
      await storage.updateStoryJoinRequest(requestId, { status: "approved" });

      // Add user as participant
      await storage.addParticipant({
        storyId: joinRequest.storyId,
        userId: joinRequest.requesterId
      });

      res.json({ message: "Join request approved successfully" });
    } catch (error) {
      console.error("Error approving join request:", error);
      res.status(500).json({ message: "Failed to approve join request" });
    }
  });

  // Deny join request
  app.post('/api/join-requests/:id/deny', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const joinRequest = await storage.getStoryJoinRequestById(requestId);
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }

      if (joinRequest.authorId !== userId) {
        return res.status(403).json({ message: "Only the story author can deny requests" });
      }

      if (joinRequest.status !== "pending") {
        return res.status(400).json({ message: "Request has already been " + joinRequest.status });
      }

      // Update request status
      await storage.updateStoryJoinRequest(requestId, { status: "denied" });

      res.json({ message: "Join request denied successfully" });
    } catch (error) {
      console.error("Error denying join request:", error);
      res.status(500).json({ message: "Failed to deny join request" });
    }
  });

  // Get user's join request status for a story
  app.get('/api/stories/:id/join-request-status', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const joinRequest = await storage.getStoryJoinRequest(storyId, userId);

      if (!joinRequest) {
        return res.json({ hasRequest: false, status: null });
      }

      res.json({ 
        hasRequest: true, 
        status: joinRequest.status,
        requestId: joinRequest.id 
      });
    } catch (error) {
      console.error("Error fetching join request status:", error);
      res.status(500).json({ message: "Failed to fetch join request status" });
    }
  });

  // Get pending invitations for the current user
  app.get('/api/invitations/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Fetch pending invitations
      const invitations = await storage.getPendingInvitationsForUser(userId);

      // Get additional data for each invitation
      const invitationsWithDetails = await Promise.all(
        invitations.map(async (invitation) => {
          const story = await storage.getStoryById(invitation.storyId);
          const inviter = await storage.getUser(invitation.inviterId);

          return {
            ...invitation,
            story: story ? {
              id: story.id,
              title: story.title,
              description: story.description,
              genre: story.genre,
            } : null,
            inviter: inviter ? {
              id: inviter.id,
              username: inviter.username || "Unknown",
              profileImageUrl: inviter.profileImageUrl,
            } : null,
          };
        })
      );

      res.json(invitationsWithDetails);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Accept invitation
  app.post('/api/invitations/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      if (isNaN(invitationId)) {
        return res.status(400).json({ message: "Invalid invitation ID" });
      }

      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const invitation = await storage.getStoryInvitationById(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.inviteeId !== userId) {
        return res.status(403).json({ message: "You can only accept your own invitations" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation has already been " + invitation.status });
      }

      // Check if invitation has expired
      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Update invitation status
      await storage.updateStoryInvitation(invitationId, { status: "accepted" });

      // Add user as participant
      await storage.addParticipant({
        storyId: invitation.storyId,
        userId: userId
      });

      res.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Decline invitation
  app.post('/api/invitations/:id/decline', isAuthenticated, async (req: any, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      if (isNaN(invitationId)) {
        return res.status(400).json({ message: "Invalid invitation ID" });
      }

      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const invitation = await storage.getStoryInvitationById(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.inviteeId !== userId) {
        return res.status(403).json({ message: "You can only decline your own invitations" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation has already been " + invitation.status });
      }

      // Update invitation status
      await storage.updateStoryInvitation(invitationId, { status: "declined" });

      res.json({ message: "Invitation declined successfully" });
    } catch (error) {
      console.error("Error declining invitation:", error);
      res.status(500).json({ message: "Failed to decline invitation" });
    }
  });

  // Invite a user to a story
  app.post('/api/stories/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const inviterId = req.user.claims.sub;
      const { inviteType, email, username } = req.body;

      // Check if the story exists and the inviter is a participant
      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      const isInviterParticipant = await storage.isParticipant(storyId, inviterId);
      if (!isInviterParticipant && story.creatorId !== inviterId) {
        return res.status(403).json({ message: "Only story participants can invite others" });
      }

      // Generate token for invitation
      const token = nanoid(32);
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // Expire in 7 days

      if (inviteType === 'email') {
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        // Check if user with this email exists
        const inviteeUser = await storage.getUserByEmail(email);

        if (inviteeUser) {
          // Check if already a participant
          const isAlreadyParticipant = await storage.isParticipant(storyId, inviteeUser.id);
          if (isAlreadyParticipant) {
            return res.status(400).json({ message: "User is already a participant in this story" });
          }

          // Check if there's already a pending invitation
          const pendingInvitations = await storage.getPendingInvitationsForUser(inviteeUser.id);
          const alreadyInvited = pendingInvitations.some(inv => inv.storyId === storyId);
          if (alreadyInvited) {
            return res.status(400).json({ message: "User already has a pending invitation to this story" });
          }

          // Create invitation
          const invitation = await storage.createStoryInvitation({
            storyId,
            inviterId,
            inviteeId: inviteeUser.id,
            status: "pending",
            token,
            expiresAt: expirationDate
          });

          // Note: Real-time notifications would be implemented here with WebSocket/SSE
          console.log(`Invitation notification would be sent to user ${inviteeUser.id}`);

          // Send invitation email
          const inviter = await storage.getUser(inviterId);
          if (inviter && inviteeUser.email) {
            sendStoryInvitationEmail(
              inviteeUser.email,
              inviteeUser.username || 'there',
              inviter.username || 'A collaborator',
              story.title,
              story.description || ''
            ).catch(error => {
              console.error('Failed to send invitation email:', error);
            });
          }

          res.status(201).json({ 
            message: "Invitation sent to " + email,
            invitation
          });
        } else {
          // Create invitation with email only for non-users
          const invitation = await storage.createStoryInvitation({
            storyId,
            inviterId,
            inviteeEmail: email,
            status: "pending",
            token,
            expiresAt: expirationDate
          });

          // Send invitation email to non-user
          const inviter = await storage.getUser(inviterId);
          if (inviter) {
            sendStoryInvitationEmail(
              email,
              'there',
              inviter.username || 'A collaborator',
              story.title,
              story.description || ''
            ).catch(error => {
              console.error('Failed to send invitation email:', error);
            });
          }

          res.status(201).json({ 
            message: "Invitation sent to " + email,
            invitation
          });
        }
      } else if (inviteType === 'username') {
        if (!username) {
          return res.status(400).json({ message: "Username is required" });
        }

        // Find user by username
        const inviteeUser = await storage.getUserByUsername(username);

        if (!inviteeUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if already a participant
        const isAlreadyParticipant = await storage.isParticipant(storyId, inviteeUser.id);
        if (isAlreadyParticipant) {
          return res.status(400).json({ message: "User is already a participant in this story" });
        }

        // Check if there's already a pending invitation
        const pendingInvitations = await storage.getPendingInvitationsForUser(inviteeUser.id);
        const alreadyInvited = pendingInvitations.some(inv => inv.storyId === storyId);
        if (alreadyInvited) {
          return res.status(400).json({ message: "User already has a pending invitation to this story" });
        }

        // Create invitation
        const invitation = await storage.createStoryInvitation({
          storyId,
          inviterId,
          inviteeId: inviteeUser.id,
          status: "pending",
          token,
          expiresAt: expirationDate
        });

        // Note: Real-time notifications would be implemented here with WebSocket/SSE
        console.log(`Invitation notification would be sent to user ${inviteeUser.id}`);

        res.status(201).json({ 
            message: username + " has been invited to the story",
            invitation
        });
      } else {
        return res.status(400).json({ message: "Invalid invitation type" });
      }
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Get story participants
  app.get('/api/stories/:id/participants', async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);

      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      const participants = await storage.getStoryParticipants(storyId);

      // Get user details for each participant
      const participantsWithDetails = await Promise.all(
        participants.map(async (p) => {
          const user = await storage.getUser(p.userId);
          return {
            ...p,
            user: user ? {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl
            } : null
          };
        })
      );

      res.json(participantsWithDetails);
    } catch (error) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  // Leave a story (remove yourself as a participant)
  app.delete('/api/stories/:id/leave', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      // Check if story exists
      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Check if user is a participant
      const isParticipant = await storage.isParticipant(storyId, userId);
      if (!isParticipant) {
        return res.status(400).json({ message: "You are not a participant in this story" });
      }

      // Check if user is the creator - creators can't leave their own stories
      if (story.creatorId === userId) {
        return res.status(400).json({ message: "Story creators cannot leave their own stories" });
      }

      // Check if it's currently the user's turn
      const turn = await storage.getStoryTurn(storyId);
      if (turn && turn.currentUserId === userId) {
        return res.status(400).json({ message: "You cannot leave a story when it's your turn to contribute" });
      }

      // Remove user as participant
      await storage.removeParticipant(storyId, userId);

      res.status(200).json({ message: "Successfully left the story" });
    } catch (error) {
      console.error("Error leaving story:", error);
      res.status(500).json({ message: "Failed to leave story" });
    }
  });

  // Add a segment to a story
  app.post('/api/stories/:id/segments', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      if (story.isComplete) {
        return res.status(400).json({ message: "Story is already complete" });
      }

      // Check if user is a participant
      const isParticipant = await storage.isParticipant(storyId, userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this story" });
      }

      // Check if it's user's turn
      const turn = await storage.getStoryTurn(storyId);
      if (!turn || turn.currentUserId !== userId) {
        return res.status(403).json({ message: "It's not your turn" });
      }

      // Validate segment data
      const { content, wordCount, characterCount } = req.body;

      // Check for required fields
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      if (!wordCount || isNaN(parseInt(wordCount))) {
        return res.status(400).json({ message: "Valid word count is required" });
      }

      if (!characterCount || isNaN(parseInt(characterCount))) {
        return res.status(400).json({ message: "Valid character count is required" });
      }

      // Check word count against story's word limit
      if (parseInt(wordCount) > story.wordLimit) {
        return res.status(400).json({ 
          message: "Exceeded word limit of " + story.wordLimit
        });
      }

      // Check character count against story's character limit (if set)
      if (story.characterLimit > 0 && parseInt(characterCount) > story.characterLimit) {
        return res.status(400).json({
          message: "Exceeded character limit of " + story.characterLimit
        });
      }

      // Add the segment
      const segment = await storage.addStorySegment({
        content,
        wordCount: parseInt(wordCount),
        characterCount: parseInt(characterCount),
        storyId,
        userId,
        turn: turn.currentTurn
      });

      // Get all participants to determine next turn
      const participants = await storage.getStoryParticipants(storyId);

      if (participants.length > 1) {
        // Find the index of the current user
        const currentUserIndex = participants.findIndex(p => p.userId === userId);

        // Determine the next user (circular)
        const nextUserIndex = (currentUserIndex + 1) % participants.length;
        const nextUserId = participants[nextUserIndex].userId;

        // Update the turn
        await storage.updateStoryTurn(storyId, {
          currentTurn: turn.currentTurn + 1,
          currentUserId: nextUserId
        });
      } else {
        // If only one participant, they keep the turn but increment turn number
        await storage.updateStoryTurn(storyId, {
          currentTurn: turn.currentTurn + 1
        });
      }

      res.status(201).json(segment);
    } catch (error) {
      console.error("Error adding segment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid segment data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to add segment" });
    }
  });

  // Get all segments for a story
  app.get('/api/stories/:id/segments', async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);

      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      const segments = await storage.getStorySegments(storyId);

      // Get user details for each segment
      const segmentsWithUserDetails = await Promise.all(
        segments.map(async (seg) => {
          const user = await storage.getUser(seg.userId);
          return {
            ...seg,
            user: user ? {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl
            } : null
          };
        })
      );

      res.json(segmentsWithUserDetails);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ message: "Failed to fetch segments" });
    }
  });

  // Get current turn for a story
  app.get('/api/stories/:id/turn', async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);

      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      const turn = await storage.getStoryTurn(storyId);
      if (!turn) {
        return res.status(404).json({ message: "Turn information not found" });
      }

      // Get user details for current turn
      const currentUser = await storage.getUser(turn.currentUserId);

      res.json({
        ...turn,
        currentUser: currentUser ? {
          id: currentUser.id,
          username: currentUser.username,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          profileImageUrl: currentUser.profileImageUrl
        } : null
      });
    } catch (error) {
      console.error("Error fetching turn:", error);
      res.status(500).json({ message: "Failed to fetch turn information" });
    }
  });

  // Skip turn (authors only)
  app.post('/api/stories/:id/skip-turn', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      if (story.isComplete) {
        return res.status(400).json({ message: "Story is already complete" });
      }

      // Check if user is the author/creator
      if (story.creatorId !== userId) {
        return res.status(403).json({ message: "Only the story author can skip turns" });
      }

      // Get current turn
      const turn = await storage.getStoryTurn(storyId);
      if (!turn) {
        return res.status(404).json({ message: "Turn information not found" });
      }

      // Get all participants to determine next turn
      const participants = await storage.getStoryParticipants(storyId);

      if (participants.length > 1) {
        // Find the index of the current user whose turn is being skipped
        const currentUserIndex = participants.findIndex(p => p.userId === turn.currentUserId);

        // Determine the next user (circular)
        const nextUserIndex = (currentUserIndex + 1) % participants.length;
        const nextUserId = participants[nextUserIndex].userId;

        // Update the turn
        await storage.updateStoryTurn(storyId, {
          currentTurn: turn.currentTurn + 1,
          currentUserId: nextUserId
        });

        res.json({ 
          message: "Turn skipped successfully",
          nextUserId,
          currentTurn: turn.currentTurn + 1
        });
      } else {
        return res.status(400).json({ message: "Cannot skip turn with only one participant" });
      }
    } catch (error) {
      console.error("Error skipping turn:", error);
      res.status(500).json({ message: "Failed to skip turn" });
    }
  });

  // Mark a story as complete
  app.post('/api/stories/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Check if user is a participant
      const isParticipant = await storage.isParticipant(storyId, userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this story" });
      }

      // Update the story status
      const updatedStory = await storage.updateStory(storyId, {
        isComplete: true
      });

      res.json(updatedStory);
    } catch (error) {
      console.error("Error completing story:", error);
      res.status(500).json({ message: "Failed to complete story" });
    }
  });

  // Upload an image for a story
  app.post('/api/stories/:id/images', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Check if user is a participant
      const isParticipant = await storage.isParticipant(storyId, userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this story" });
      }

      // Get image file path
      const imagePath = "/uploads/" + req.file.filename;

      // Save image information
      const image = await storage.addStoryImage({
        storyId,
        imageUrl: imagePath,
        caption: req.body.caption || null,
        uploadedBy: userId
      });

      res.status(201).json(image);
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Get images for a story
  app.get('/api/stories/:id/images', async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);

      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      const images = await storage.getStoryImages(storyId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching images:", error);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  // Create a print order
  app.post('/api/stories/:id/print', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Check if user is a participant
      const isParticipant = await storage.isParticipant(storyId, userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this story" });
      }

      // Validate order data
      const validatedData = printOrderFormSchema.parse(req.body);

      // Create the order
      const order = await storage.createPrintOrder({
        ...validatedData,
        storyId,
        userId
      });

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating print order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid order data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create print order" });
    }
  });

  // Get user's print orders
  app.get('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getUserOrders(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Client error reporting
  app.post('/api/client-error', async (req, res) => {
    try {
      const errorData = req.body;
      const context = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).session?.userId || (req as any).user?.id
      };

      logger.error('Client-side error reported', undefined, context, errorData);
      res.status(200).json({ message: 'Error logged successfully' });
    } catch (error) {
      logger.error('Failed to log client error', error as Error);
      res.status(500).json({ message: 'Failed to log error' });
    }
  });

  // User profile routes
  app.get('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user statistics
      const userStories = await storage.getStoriesByUser(userId);
      const completedStories = userStories.filter(story => story.isComplete);

      // Get story segments by user
      let totalSegments = 0;
      let storiesContributed = 0;
      let seenStoryIds = new Set();

      const storyIds = userStories.map(story => story.id);
      for (const storyId of storyIds) {
        const segments = await storage.getStorySegments(storyId);
        const userSegments = segments.filter(segment => segment.userId === userId);
        totalSegments += userSegments.length;

        // Count distinct stories contributed to
        if (userSegments.length > 0 && !seenStoryIds.has(storyId)) {
          seenStoryIds.add(storyId);
          storiesContributed++;
        }
      }

      // Get user settings
      let userSettings = null;
      try {
        userSettings = await storage.getUserSettings(userId);
      } catch (error) {
        console.log("User settings not found, will create default");
      }

      if (!userSettings) {
        userSettings = await storage.createUserSettings({
          userId,
          turnNotifications: true,
          invitationNotifications: true,
          completionNotifications: true,
          fontSize: 16,
          editorHeight: 200,
          theme: "light"
        });
      }

      // Get pending invitations
      const pendingInvitations = await storage.getPendingInvitationsForUser(userId);

      // Get recent activity
      interface ActivityItem {
        id: string;
        type: string;
        storyId: number;
        storyTitle: string;
        date: Date | null;
      }

      const recentActivity: ActivityItem[] = [];

      // Add contributions to activity
      for (const storyId of storyIds) {
        const segments = await storage.getStorySegments(storyId);
        const story = await storage.getStoryById(storyId);

        const userSegments = segments
          .filter(segment => segment.userId === userId)
          .filter(segment => segment.createdAt) // Filter out null dates
          .sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .slice(0, 5); // Get 5 most recent

        userSegments.forEach(segment => {
          recentActivity.push({
            id: "segment-" + segment.id,
            type: 'contribution',
            storyId: storyId,
            storyTitle: story?.title || 'Unknown Story',
            date: segment.createdAt,
          });
        });
      }

      // Sort activity by date
      recentActivity.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      // Return user profile data
      res.json({
        ...user,
        stats: {
          storiesCreated: userStories.filter(story => story.creatorId === userId).length,
          storiesContributed,
          completedStories: completedStories.length,
          totalSegments
        },
        settings: userSettings,
        invitations: pendingInvitations,
        recentActivity: recentActivity.slice(0, 10) // Limit to 10 most recent activities
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // User settings routes
  app.get('/api/users/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let settings = await storage.getUserSettings(userId);

      if (!settings) {
        // Create default settings if none exist
        settings = await storage.createUserSettings({
          userId,
          turnNotifications: true,
          invitationNotifications: true,
          completionNotifications: true,
          fontSize: 16,
          editorHeight: 200,
          theme: "light"
        });
      }

      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  // Update notification settings
  app.patch('/api/users/settings/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { turnNotifications, invitationNotifications, completionNotifications } = req.body;

      // Get current settings
      let settings = await storage.getUserSettings(userId);

      if (!settings) {
        // Create default settings if none exist
        settings = await storage.createUserSettings({
          userId,
          turnNotifications: turnNotifications ?? true,
          invitationNotifications: invitationNotifications ?? true,
          completionNotifications: completionNotifications ?? true,
          fontSize: 16,
          editorHeight: 200,
          theme: "light"
        });
      } else {
        // Update existing settings
        settings = await storage.updateUserSettings(userId, {
          turnNotifications: turnNotifications ?? settings.turnNotifications,
          invitationNotifications: invitationNotifications ?? settings.invitationNotifications,
          completionNotifications: completionNotifications ?? settings.completionNotifications
        });
      }

      res.json(settings);
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  // Update appearance settings
  app.patch('/api/users/settings/appearance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fontSize, editorHeight, theme } = req.body;

      // Get current settings
      let settings = await storage.getUserSettings(userId);

      if (!settings) {
        // Create default settings if none exist
        settings = await storage.createUserSettings({
          userId,
          turnNotifications: true,
          invitationNotifications: true,
          completionNotifications: true,
          fontSize: fontSize ?? 16,
          editorHeight: editorHeight ?? 200,
          theme: theme ?? "light"
        });
      } else {
        // Update existing settings
        settings = await storage.updateUserSettings(userId, {
          fontSize: fontSize ?? settings.fontSize,
          editorHeight: editorHeight ?? settings.editorHeight,
          theme: theme ?? settings.theme
        });
      }

      res.json(settings);
    } catch (error) {
      console.error("Error updating appearance settings:", error);
      res.status(500).json({ message: "Failed to update appearance settings" });
    }
  });

  // Update user profile
  app.patch('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { username, firstName, lastName } = req.body;

      // Get current user
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if username is changing and if it's unique
      if (username && username !== user.username) {
        // Validate username
        if (username.length < 3) {
          return res.status(400).json({ message: "Username must be at least 3 characters long" });
        }

        // Check if username already exists
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (username !== undefined) updateData.username = username;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;

      // Update user
      const updatedUser = await storage.upsertUser({
        id: userId,
        ...updateData,
        email: user.email,
        emailVerified: user.emailVerified,
      });

      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Delete user account
  app.delete('/api/users/account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user details first
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`Starting account deletion for user: ${userId} (${user.email})`);

      // Begin transaction-like deletion process
      // 1. Remove from story participants
      await db.delete(storyParticipants).where(eq(storyParticipants.userId, userId));
      console.log(`Removed story participations for user: ${userId}`);

      // 2. Remove story segments (contributions)
      await db.delete(storySegments).where(eq(storySegments.userId, userId));
      console.log(`Removed story segments for user: ${userId}`);

      // 3. Update story turns to remove user references
      await db.delete(storyTurns).where(eq(storyTurns.currentUserId, userId));
      console.log(`Removed story turn references for user: ${userId}`);

      // 4. Remove story invitations (both sent and received)
      await db.delete(storyInvitations).where(eq(storyInvitations.inviterId, userId));
      await db.delete(storyInvitations).where(eq(storyInvitations.inviteeId, userId));
      console.log(`Removed story invitations for user: ${userId}`);

      // 5. Remove join requests (both sent and received)
      await db.delete(storyJoinRequests).where(eq(storyJoinRequests.requesterId, userId));
      await db.delete(storyJoinRequests).where(eq(storyJoinRequests.authorId, userId));
      console.log(`Removed join requests for user: ${userId}`);

      // 6. Remove print orders
      await db.delete(printOrders).where(eq(printOrders.userId, userId));
      console.log(`Removed print orders for user: ${userId}`);

      // 7. Remove user settings
      await db.delete(userSettings).where(eq(userSettings.userId, userId));
      console.log(`Removed user settings for user: ${userId}`);

      // 8. Handle stories created by user - mark as deleted user rather than cascading delete
      const userStories = await db.select().from(stories).where(eq(stories.creatorId, userId));
      
      // Create a placeholder "deleted user" if needed
      const deletedUserId = `deleted_${Date.now()}`;
      const deletedUser = await storage.upsertUser({
        id: deletedUserId,
        email: `deleted_${Date.now()}@example.com`,
        username: `deleted_user_${Date.now()}`,
        isDeleted: true,
        emailVerified: true,
      });

      // Transfer story ownership to deleted user placeholder
      if (userStories.length > 0) {
        await db.update(stories)
          .set({ creatorId: deletedUserId })
          .where(eq(stories.creatorId, userId));
        console.log(`Transferred ${userStories.length} stories to deleted user placeholder`);
      }

      // 9. Finally, mark the user as deleted (soft delete)
      await storage.upsertUser({
        ...user,
        email: `deleted_${Date.now()}@example.com`,
        username: `deleted_user_${Date.now()}`,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        originalUsername: user.username,
        isDeleted: true,
        emailVerificationToken: null,
        passwordResetToken: null,
        password: null,
      });

      console.log(`Successfully deleted account for user: ${userId}`);

      // Clear session
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
      });

      res.json({ 
        message: "Account successfully deleted",
        redirectTo: "/" 
      });

    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ 
        message: "Failed to delete account",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create HTTP server
  const server = createServer(app);

  return server;
}