import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  genre: varchar("genre", { length: 50 }).notNull(),
  wordLimit: integer("word_limit").notNull(),
  characterLimit: integer("character_limit").notNull().default(0),
  maxSegments: integer("max_segments").notNull(),
  creatorId: varchar("creator_id", { length: 255 }).notNull(),
  isComplete: boolean("is_complete").notNull().default(false),
  firstChapterAssignment: varchar("first_chapter_assignment", { length: 10 }).notNull().default("author"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});