import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  serial,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stories table
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  genre: varchar("genre").notNull(),
  wordLimit: integer("word_limit").notNull(),
  characterLimit: integer("character_limit").notNull().default(0), // 0 means no character limit
  maxSegments: integer("max_segments").notNull().default(30),
  isComplete: boolean("is_complete").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(true),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Story participants
export const storyParticipants = pgTable("story_participants", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  uniqParticipantIdx: index("uniq_participant_idx").on(table.storyId, table.userId),
}));

// Story segments (individual contributions)
export const storySegments = pgTable("story_segments", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  turn: integer("turn").notNull(),
  wordCount: integer("word_count").notNull(),
  characterCount: integer("character_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Story turns (tracking whose turn it is)
export const storyTurns = pgTable("story_turns", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
  currentTurn: integer("current_turn").notNull(),
  currentUserId: varchar("current_user_id").notNull().references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Story images 
export const storyImages = pgTable("story_images", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Story print orders
export const printOrders = pgTable("print_orders", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id").notNull().unique(),
  storyId: integer("story_id").notNull().references(() => stories.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  format: varchar("format").notNull(), // paperback, hardcover, ebook
  quantity: integer("quantity").notNull().default(1),
  specialRequests: text("special_requests"),
  status: varchar("status").notNull().default("pending"),
  totalPrice: integer("total_price").notNull(), // in cents
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  stories: many(stories),
  segments: many(storySegments),
  participations: many(storyParticipants),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  creator: one(users, {
    fields: [stories.creatorId],
    references: [users.id],
  }),
  segments: many(storySegments),
  participants: many(storyParticipants),
  turn: one(storyTurns),
  images: many(storyImages),
  orders: many(printOrders),
}));

export const storyParticipantsRelations = relations(storyParticipants, ({ one }) => ({
  story: one(stories, {
    fields: [storyParticipants.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [storyParticipants.userId],
    references: [users.id],
  }),
}));

export const storySegmentsRelations = relations(storySegments, ({ one }) => ({
  story: one(stories, {
    fields: [storySegments.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [storySegments.userId],
    references: [users.id],
  }),
}));

export const storyTurnsRelations = relations(storyTurns, ({ one }) => ({
  story: one(stories, {
    fields: [storyTurns.storyId],
    references: [stories.id],
  }),
  currentUser: one(users, {
    fields: [storyTurns.currentUserId],
    references: [users.id],
  }),
}));

// Insert schemas
export const upsertUserSchema = createInsertSchema(users);
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertStorySchema = createInsertSchema(stories).omit({ id: true });
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;

export const insertStoryParticipantSchema = createInsertSchema(storyParticipants).omit({ id: true, joinedAt: true });
export type InsertStoryParticipant = z.infer<typeof insertStoryParticipantSchema>;
export type StoryParticipant = typeof storyParticipants.$inferSelect;

export const insertStorySegmentSchema = createInsertSchema(storySegments).omit({ id: true, createdAt: true });
export type InsertStorySegment = z.infer<typeof insertStorySegmentSchema>;
export type StorySegment = typeof storySegments.$inferSelect;

export const insertStoryTurnSchema = createInsertSchema(storyTurns).omit({ id: true, updatedAt: true });
export type InsertStoryTurn = z.infer<typeof insertStoryTurnSchema>;
export type StoryTurn = typeof storyTurns.$inferSelect;

export const insertStoryImageSchema = createInsertSchema(storyImages).omit({ id: true, uploadedAt: true });
export type InsertStoryImage = z.infer<typeof insertStoryImageSchema>;
export type StoryImage = typeof storyImages.$inferSelect;

export const insertPrintOrderSchema = createInsertSchema(printOrders).omit({ id: true, orderId: true, createdAt: true });
export type InsertPrintOrder = z.infer<typeof insertPrintOrderSchema>;
export type PrintOrder = typeof printOrders.$inferSelect;

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required")
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Extended schemas for validation
export const storyFormSchema = insertStorySchema
  .omit({ creatorId: true }) // Remove creatorId from client validation
  .extend({
    wordLimit: z.preprocess(
      (val) => parseInt(String(val), 10),
      z.number().min(50).max(500)
    ),
    characterLimit: z.preprocess(
      (val) => parseInt(String(val), 10),
      z.number().min(0).max(2000)
    ),
    maxSegments: z.preprocess(
      (val) => parseInt(String(val), 10),
      z.number().min(5).max(100)
    ),
  });

// Server-side only schema that includes creatorId
export const serverStorySchema = storyFormSchema.extend({
  creatorId: z.string().min(1),
});

export const storySegmentFormSchema = z.object({
  content: z.string().min(1).max(5000),
  wordCount: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().min(1)
  ),
  characterCount: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().min(1)
  ),
});

export const printOrderFormSchema = insertPrintOrderSchema.extend({
  format: z.enum(["paperback", "hardcover", "ebook"]),
  quantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().min(1).max(100)
  ),
});
