import {
  users,
  stories,
  storyParticipants,
  storySegments,
  storyTurns,
  storyImages,
  printOrders,
  storyInvitations,
  storyJoinRequests,
  storyEditRequests,
  userSettings,
  type User,
  type UpsertUser,
  type InsertStory,
  type InsertStoryParticipant,
  type InsertStorySegment,
  type InsertStoryTurn,
  type InsertStoryImage,
  type InsertPrintOrder,
  type InsertStoryInvitation,
  type InsertStoryJoinRequest,
  type InsertStoryEditRequest,
  type InsertUserSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, inArray, not, or, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import memoize from "memoizee";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  verifyUserEmail(id: string): Promise<void>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;

  // Story operations
  createStory(story: InsertStory): Promise<Story>;
  getStoryById(id: number): Promise<Story | undefined>;
  getStories(): Promise<Story[]>;
  updateStory(id: number, story: Partial<Story>): Promise<Story | undefined>;
  getStoriesByUser(userId: string): Promise<Story[]>;

  // Story participants
  addParticipant(participant: InsertStoryParticipant & { role?: string }): Promise<StoryParticipant>;
  getStoryParticipants(storyId: number): Promise<StoryParticipant[]>;
  isParticipant(storyId: number, userId: string): Promise<boolean>;
  removeParticipant(storyId: number, userId: string): Promise<void>;

  // Story segments
  addStorySegment(segment: InsertStorySegment): Promise<StorySegment>;
  getStorySegments(storyId: number): Promise<StorySegment[]>;
  getLatestSegments(storyId: number, limit: number): Promise<StorySegment[]>;

  // Story turns
  getStoryTurn(storyId: number): Promise<StoryTurn | undefined>;
  updateStoryTurn(storyId: number, turn: Partial<InsertStoryTurn>): Promise<StoryTurn | undefined>;
  createStoryTurn(turn: InsertStoryTurn): Promise<StoryTurn>;

  // Story images
  addStoryImage(image: InsertStoryImage): Promise<StoryImage>;
  getStoryImages(storyId: number): Promise<StoryImage[]>;

  // Print orders
  createPrintOrder(order: InsertPrintOrder): Promise<PrintOrder>;
  getUserOrders(userId: string): Promise<PrintOrder[]>;

  // User settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings>;

  // Story invitations
  createStoryInvitation(invitation: InsertStoryInvitation): Promise<StoryInvitation>;
  getStoryInvitationById(id: number): Promise<StoryInvitation | undefined>;
  updateStoryInvitation(id: number, updates: Partial<StoryInvitation>): Promise<StoryInvitation>;
  getPendingInvitationsForUser(userId: string): Promise<StoryInvitation[]>;

  // Story join requests
  getPendingJoinRequestsForUser(userId: string): Promise<StoryJoinRequest[]>;
  getStoryJoinRequest(storyId: number, userId: string): Promise<StoryJoinRequest | null>;
  getStoryJoinRequestById(requestId: number): Promise<StoryJoinRequest | null>;
  createStoryJoinRequest(data: any): Promise<StoryJoinRequest>;
  updateStoryJoinRequest(requestId: number, data: any): Promise<StoryJoinRequest>;

  // Edit request methods
  createEditRequest(data: any): Promise<any>;
  getEditRequestById(id: number): Promise<any | undefined>;
  getPendingEditRequestsForAuthor(authorId: string): Promise<any[]>;
  updateEditRequest(requestId: number, updates: { status: string }): Promise<any>;
  getSegmentById(id: number): Promise<any | undefined>;
  updateSegment(segmentId: number, updates: { content: string }): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Cache frequently accessed user data (5 minute TTL)
  private getUserCached = memoize(
    async (id: string): Promise<User | undefined> => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    },
    { 
      maxAge: 5 * 60 * 1000, // 5 minutes
      primitive: true 
    }
  );

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.getUserCached(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
      .then(rows => rows[0] || undefined);
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    return db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .then(rows => rows[0] || undefined);
  }

  async verifyUserEmail(id: string): Promise<void> {
    await db.update(users)
      .set({ 
        emailVerified: true, 
        emailVerificationToken: null 
      })
      .where(eq(users.id, id));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Use a proper database upsert with conflict resolution
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: [users.email],
        set: {
          id: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          username: userData.username,
          password: userData.password,
          emailVerified: userData.emailVerified,
          emailVerificationToken: userData.emailVerificationToken,
          passwordResetToken: userData.passwordResetToken,
          passwordResetExpires: userData.passwordResetExpires,
          passwordLastChanged: userData.passwordLastChanged,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Story operations
  async createStory(storyData: InsertStory): Promise<Story> {
    const [story] = await db
      .insert(stories)
      .values(storyData)
      .returning();
    return story;
  }

  async getStoryById(id: number): Promise<Story | undefined> {
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.id, id));
    return story;
  }

  async getStories(): Promise<Story[]> {
    return await db
      .select()
      .from(stories)
      .orderBy(desc(stories.createdAt));
  }

  async updateStory(id: number, storyData: Partial<Story>): Promise<Story | undefined> {
    const [story] = await db
      .update(stories)
      .set({
        ...storyData,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, id))
      .returning();
    return story;
  }

  async getStoriesByUser(userId: string): Promise<Story[]> {
    // Get stories where user is a participant
    const participantStories = await db
      .select({
        storyId: storyParticipants.storyId,
      })
      .from(storyParticipants)
      .where(eq(storyParticipants.userId, userId));

    const storyIds = participantStories.map(s => s.storyId);

    if (storyIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(stories)
      .where(inArray(stories.id, storyIds))
      .orderBy(desc(stories.updatedAt));
  }



  // Story participants
  async addParticipant(participantData: InsertStoryParticipant & { role?: string }): Promise<StoryParticipant> {
    const [participant] = await db
      .insert(storyParticipants)
      .values({
        ...participantData,
        role: participantData.role || "participant"
      })
      .returning();

    return participant;
  }

  async getStoryParticipants(storyId: number): Promise<StoryParticipant[]> {
    return await db
      .select()
      .from(storyParticipants)
      .where(eq(storyParticipants.storyId, storyId));
  }

  // Story participant management
  async isParticipant(storyId: number, userId: string): Promise<boolean> {
    const participant = await db
      .select()
      .from(storyParticipants)
      .where(and(eq(storyParticipants.storyId, storyId), eq(storyParticipants.userId, userId)))
      .limit(1);

    return participant.length > 0;
  }

  // Join request functions
  async getPendingJoinRequestsForUser(userId: string): Promise<StoryJoinRequest[]> {
    return await db
      .select()
      .from(storyJoinRequests)
      .where(and(
        eq(storyJoinRequests.authorId, userId),
        eq(storyJoinRequests.status, "pending")
      ))
      .orderBy(desc(storyJoinRequests.createdAt));
  }

  async getStoryJoinRequest(storyId: number, userId: string): Promise<StoryJoinRequest | null> {
    const request = await db
      .select()
      .from(storyJoinRequests)
      .where(and(
        eq(storyJoinRequests.storyId, storyId),
        eq(storyJoinRequests.requesterId, userId)
      ))
      .limit(1);

    return request.length > 0 ? request[0] : null;
  }

  async getStoryJoinRequestById(requestId: number): Promise<StoryJoinRequest | null> {
    const request = await db
      .select()
      .from(storyJoinRequests)
      .where(eq(storyJoinRequests.id, requestId))
      .limit(1);

    return request.length > 0 ? request[0] : null;
  }

  async createStoryJoinRequest(data: any): Promise<StoryJoinRequest> {
    const [request] = await db
      .insert(storyJoinRequests)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return request;
  }

  async updateStoryJoinRequest(requestId: number, data: any): Promise<StoryJoinRequest> {
    const [request] = await db
      .update(storyJoinRequests)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(storyJoinRequests.id, requestId))
      .returning();

    return request;
  }

  async removeParticipant(storyId: number, userId: string): Promise<void> {
    await db
      .delete(storyParticipants)
      .where(
        and(
          eq(storyParticipants.storyId, storyId),
          eq(storyParticipants.userId, userId)
        )
      );
  }

  // Story segments
  async addStorySegment(segmentData: InsertStorySegment): Promise<StorySegment> {
    const [segment] = await db
      .insert(storySegments)
      .values(segmentData)
      .returning();

    return segment;
  }

  async getStorySegments(storyId: number): Promise<StorySegment[]> {
    return await db
      .select()
      .from(storySegments)
      .where(eq(storySegments.storyId, storyId))
      .orderBy(asc(storySegments.turn));
  }

  async getLatestSegments(storyId: number, limit: number): Promise<StorySegment[]> {
    return await db
      .select()
      .from(storySegments)
      .where(eq(storySegments.storyId, storyId))
      .orderBy(desc(storySegments.turn))
      .limit(limit);
  }

  // Story turns
  async getStoryTurn(storyId: number): Promise<StoryTurn | undefined> {
    const [turn] = await db
      .select()
      .from(storyTurns)
      .where(eq(storyTurns.storyId, storyId));

    return turn;
  }

  async updateStoryTurn(storyId: number, turnData: Partial<InsertStoryTurn>): Promise<StoryTurn | undefined> {
    const [turn] = await db
      .update(storyTurns)
      .set({
        ...turnData,
        updatedAt: new Date(),
      })
      .where(eq(storyTurns.storyId, storyId))
      .returning();

    return turn;
  }

  async createStoryTurn(turnData: InsertStoryTurn): Promise<StoryTurn> {
    const [turn] = await db
      .insert(storyTurns)
      .values(turnData)
      .returning();

    return turn;
  }

  // Story images
  async addStoryImage(imageData: InsertStoryImage): Promise<StoryImage> {
    const [image] = await db
      .insert(storyImages)
      .values(imageData)
      .returning();

    return image;
  }

  async getStoryImages(storyId: number): Promise<StoryImage[]> {
    return await db
      .select()
      .from(storyImages)
      .where(eq(storyImages.storyId, storyId));
  }

  // Print orders
  async createPrintOrder(orderData: InsertPrintOrder): Promise<PrintOrder> {
    const orderId = `SW-${nanoid(6).toUpperCase()}`;

    const [order] = await db
      .insert(printOrders)
      .values({
        ...orderData,
        orderId,
      })
      .returning();

    return order;
  }

  async getUserOrders(userId: string): Promise<PrintOrder[]> {
    return await db
      .select()
      .from(printOrders)
      .where(eq(printOrders.userId, userId))
      .orderBy(desc(printOrders.createdAt));
  }

  // User settings methods
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }

  async createUserSettings(settingsData: InsertUserSettings): Promise<UserSettings> {
    const [settings] = await db
      .insert(userSettings)
      .values({
        ...settingsData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return settings;
  }

  async updateUserSettings(userId: string, settingsData: Partial<UserSettings>): Promise<UserSettings> {
    const [settings] = await db
      .update(userSettings)
      .set({
        ...settingsData,
        updatedAt: new Date()
      })
      .where(eq(userSettings.userId, userId))
      .returning();

    if (!settings) {
      throw new Error("User settings not found");
    }

    return settings;
  }

  // Story invitation methods
  async createStoryInvitation(invitationData: InsertStoryInvitation): Promise<StoryInvitation> {
    const [invitation] = await db
      .insert(storyInvitations)
      .values({
        ...invitationData,
        createdAt: new Date()
      })
      .returning();
    return invitation;
  }

  async getStoryInvitationById(id: number): Promise<StoryInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(storyInvitations)
      .where(eq(storyInvitations.id, id));
    return invitation;
  }

  async updateStoryInvitation(id: number, updates: Partial<StoryInvitation>): Promise<StoryInvitation> {
    const [invitation] = await db
      .update(storyInvitations)
      .set(updates)
      .where(eq(storyInvitations.id, id))
      .returning();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    return invitation;
  }

  async getPendingInvitationsForUser(userId: string): Promise<StoryInvitation[]> {
    // Get invitations where user is the invitee and status is pending
    return await db
      .select()
      .from(storyInvitations)
      .where(
        and(
          eq(storyInvitations.inviteeId, userId),
          eq(storyInvitations.status, "pending")
        )
      )
      .orderBy(desc(storyInvitations.createdAt));
  }

  async updateStoryJoinRequest(requestId: number, updates: { status: string }) {
    return await db
      .update(storyJoinRequests)
      .set(updates)
      .where(eq(storyJoinRequests.id, requestId))
      .returning();
  }

  // Edit request methods
  async createEditRequest(data: any) {
    const [editRequest] = await db
      .insert(storyEditRequests)
      .values(data)
      .returning();
    return editRequest;
  }

  async getEditRequestById(id: number) {
    const [editRequest] = await db
      .select()
      .from(storyEditRequests)
      .where(eq(storyEditRequests.id, id))
      .limit(1);
    return editRequest;
  }

  async getPendingEditRequestsForAuthor(authorId: string) {
    return await db
      .select()
      .from(storyEditRequests)
      .where(
        and(
          eq(storyEditRequests.authorId, authorId),
          eq(storyEditRequests.status, "pending")
        )
      )
      .orderBy(desc(storyEditRequests.createdAt));
  }

  async updateEditRequest(requestId: number, updates: { status: string }) {
    return await db
      .update(storyEditRequests)
      .set(updates)
      .where(eq(storyEditRequests.id, requestId))
      .returning();
  }

  async getSegmentById(id: number) {
    const [segment] = await db
      .select()
      .from(storySegments)
      .where(eq(storySegments.id, id))
      .limit(1);
    return segment;
  }

  async updateSegment(segmentId: number, updates: { content: string }) {
    return await db
      .update(storySegments)
      .set(updates)
      .where(eq(storySegments.id, segmentId))
      .returning();
  }
}

export const storage = new DatabaseStorage();