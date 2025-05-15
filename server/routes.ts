import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import {
  storyFormSchema,
  serverStorySchema,
  storySegmentFormSchema,
  printOrderFormSchema,
  stories,
  storyParticipants,
  storyTurns,
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Story routes
  // Get all stories
  app.get('/api/stories', async (req, res) => {
    try {
      const stories = await storage.getPublicStories();
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
      
      // Get all stories
      const userStories = await storage.getStoriesByUser(userId);
      
      // Get turns for these stories
      const myTurnStories = [];
      
      for (const story of userStories) {
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
      
      // Get all stories
      const userStories = await storage.getStoriesByUser(userId);
      
      // Get turns for these stories
      const waitingStories = [];
      
      for (const story of userStories) {
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

  // Join a story
  app.post('/api/stories/:id/join', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      // Check if user is already a participant
      const isAlreadyParticipant = await storage.isParticipant(storyId, userId);
      if (isAlreadyParticipant) {
        return res.status(400).json({ message: "Already a participant in this story" });
      }
      
      // Add user as a participant
      const participant = await storage.addParticipant({
        storyId,
        userId
      });
      
      res.status(201).json(participant);
    } catch (error) {
      console.error("Error joining story:", error);
      res.status(500).json({ message: "Failed to join story" });
    }
  });
  
  // Invite a user to a story
  app.post('/api/stories/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const inviterId = req.user.claims.sub;
      const { usernameOrEmail } = req.body;
      
      if (!usernameOrEmail) {
        return res.status(400).json({ message: "Username or email is required" });
      }
      
      // Check if the story exists and the inviter is a participant
      const story = await storage.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      const isInviterParticipant = await storage.isParticipant(storyId, inviterId);
      if (!isInviterParticipant && story.creatorId !== inviterId) {
        return res.status(403).json({ message: "Only story participants can invite others" });
      }
      
      // Find the user to invite by username or email
      let inviteeUser;
      if (usernameOrEmail.includes('@')) {
        // Search by email
        inviteeUser = await storage.getUserByEmail(usernameOrEmail);
      } else {
        // Search by username
        inviteeUser = await storage.getUserByUsername(usernameOrEmail);
      }
      
      if (!inviteeUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if already a participant
      const isAlreadyParticipant = await storage.isParticipant(storyId, inviteeUser.id);
      if (isAlreadyParticipant) {
        return res.status(400).json({ message: "User is already a participant in this story" });
      }
      
      // Add the invitee as a participant
      const participant = await storage.addParticipant({
        storyId,
        userId: inviteeUser.id
      });
      
      res.status(201).json({
        message: `${inviteeUser.username || inviteeUser.email} has been invited to the story`,
        participant
      });
    } catch (error) {
      console.error("Error inviting user:", error);
      res.status(500).json({ message: "Failed to invite user" });
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
      const validatedData = storySegmentFormSchema.parse(req.body);
      
      // Check word count against story's word limit
      if (validatedData.wordCount > story.wordLimit) {
        return res.status(400).json({ 
          message: `Exceeded word limit of ${story.wordLimit}` 
        });
      }
      
      // Check character count against story's character limit (if set)
      if (story.characterLimit > 0 && validatedData.characterCount > story.characterLimit) {
        return res.status(400).json({
          message: `Exceeded character limit of ${story.characterLimit}`
        });
      }
      
      // Add the segment
      const segment = await storage.addStorySegment({
        ...validatedData,
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
      const imagePath = `/uploads/${req.file.filename}`;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
