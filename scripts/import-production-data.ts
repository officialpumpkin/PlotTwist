import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';

const PRODUCTION_DB_URL = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;

async function importProductionData() {
  try {
    console.log('🚀 Starting production data import...');
    
    // Connect to production database
    const prodSql = neon(PRODUCTION_DB_URL!);
    const prodDb = drizzle(prodSql, { schema });
    
    // Connect to development database  
    const devSql = neon(process.env.DATABASE_URL!);
    const devDb = drizzle(devSql, { schema });
    
    console.log('📡 Connected to both databases');
    
    // 1. Import users (excluding deleted test users)
    console.log('👥 Importing real users...');
    const prodUsers = await prodDb.select().from(schema.users);
    const realUsers = prodUsers.filter(user => 
      !user.username?.includes('deleted_user') &&
      user.username !== null &&
      user.email !== null
    );
    
    for (const user of realUsers) {
      try {
        await devDb.insert(schema.users)
          .values(user)
          .onConflictDoUpdate({
            target: [schema.users.id],
            set: {
              username: user.username,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl,
              updatedAt: new Date()
            }
          });
        console.log(`✅ Imported user: ${user.username}`);
      } catch (error) {
        console.log(`⚠️  User ${user.username} already exists, updated`);
      }
    }
    
    // 2. Import stories
    console.log('📚 Importing collaborative stories...');
    const prodStories = await prodDb.select().from(schema.stories);
    
    for (const story of prodStories) {
      if (story.title && story.title.trim() !== '') {
        try {
          await devDb.insert(schema.stories)
            .values(story)
            .onConflictDoUpdate({
              target: [schema.stories.id],
              set: {
                title: story.title,
                description: story.description,
                isPublic: story.isPublic,
                isCompleted: story.isCompleted,
                maxParticipants: story.maxParticipants,
                wordLimit: story.wordLimit,
                characterLimit: story.characterLimit,
                updatedAt: new Date()
              }
            });
          console.log(`✅ Imported story: "${story.title}"`);
        } catch (error) {
          console.log(`⚠️  Story "${story.title}" already exists, updated`);
        }
      }
    }
    
    // 3. Import story participants
    console.log('👫 Importing story collaborations...');
    const prodParticipants = await prodDb.select().from(schema.storyParticipants);
    
    for (const participant of prodParticipants) {
      try {
        await devDb.insert(schema.storyParticipants)
          .values(participant)
          .onConflictDoNothing();
      } catch (error) {
        // Skip conflicts silently
      }
    }
    console.log(`✅ Imported ${prodParticipants.length} participant relationships`);
    
    // 4. Import story segments (the actual collaborative writing)
    console.log('📝 Importing story segments...');
    const prodSegments = await prodDb.select().from(schema.storySegments);
    
    for (const segment of prodSegments) {
      try {
        await devDb.insert(schema.storySegments)
          .values(segment)
          .onConflictDoNothing();
      } catch (error) {
        // Skip conflicts silently
      }
    }
    console.log(`✅ Imported ${prodSegments.length} story segments`);
    
    // 5. Import story turns
    console.log('🔄 Importing turn-based mechanics...');
    const prodTurns = await prodDb.select().from(schema.storyTurns);
    
    for (const turn of prodTurns) {
      try {
        await devDb.insert(schema.storyTurns)
          .values(turn)
          .onConflictDoUpdate({
            target: [schema.storyTurns.storyId],
            set: {
              currentUserId: turn.currentUserId,
              turnOrder: turn.turnOrder,
              updatedAt: new Date()
            }
          });
      } catch (error) {
        // Skip conflicts silently
      }
    }
    console.log(`✅ Imported ${prodTurns.length} story turns`);
    
    // 6. Import user settings
    console.log('⚙️  Importing user preferences...');
    const prodSettings = await prodDb.select().from(schema.userSettings);
    
    for (const setting of prodSettings) {
      try {
        await devDb.insert(schema.userSettings)
          .values(setting)
          .onConflictDoUpdate({
            target: [schema.userSettings.userId],
            set: {
              turnNotifications: setting.turnNotifications,
              invitationNotifications: setting.invitationNotifications,
              completionNotifications: setting.completionNotifications,
              updatedAt: new Date()
            }
          });
      } catch (error) {
        // Skip conflicts silently
      }
    }
    console.log(`✅ Imported ${prodSettings.length} user settings`);
    
    console.log('\n🎉 Production data import completed successfully!');
    console.log(`Imported ${realUsers.length} real users and ${prodStories.length} collaborative stories`);
    console.log('Your development environment now has authentic beta testing data!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
importProductionData();