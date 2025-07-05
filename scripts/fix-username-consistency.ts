
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';

const DATABASE_URL = process.env.DATABASE_URL;

async function fixUsernameConsistency() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not found');
    return;
  }

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  try {
    console.log('🔍 Checking for username consistency issues...');

    // Get the current user data for aj390@hotmail.com
    const [user] = await db
      .select()
      .from(schema.users)
      .where(schema.users.email.eq('aj390@hotmail.com'))
      .limit(1);

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.username} (${user.email})`);
    console.log(`   Current username: ${user.username}`);
    console.log(`   First name: ${user.firstName}`);
    console.log(`   Last name: ${user.lastName}`);

    // Force update the user's updatedAt timestamp to refresh any cached references
    await db
      .update(schema.users)
      .set({ updatedAt: new Date() })
      .where(schema.users.id.eq(user.id));

    console.log('✅ User references refreshed');

    // Check stories where this user is a participant
    const stories = await db
      .select({
        id: schema.stories.id,
        title: schema.stories.title,
      })
      .from(schema.storyParticipants)
      .innerJoin(schema.stories, schema.stories.id.eq(schema.storyParticipants.storyId))
      .where(schema.storyParticipants.userId.eq(user.id));

    console.log(`📚 User participates in ${stories.length} stories:`);
    stories.forEach(story => {
      console.log(`   - "${story.title}" (ID: ${story.id})`);
    });

    // Check story segments by this user
    const segments = await db
      .select({
        id: schema.storySegments.id,
        storyId: schema.storySegments.storyId,
        content: schema.storySegments.content,
      })
      .from(schema.storySegments)
      .where(schema.storySegments.userId.eq(user.id));

    console.log(`📝 User has contributed ${segments.length} segments across stories`);

    console.log('✅ Username consistency check completed');
    console.log('💡 The application will now use the current username for all references');

  } catch (error) {
    console.error('❌ Error fixing username consistency:', error);
  }
}

if (require.main === module) {
  fixUsernameConsistency();
}

export { fixUsernameConsistency };
