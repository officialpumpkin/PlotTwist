
import { Pool } from '@neondatabase/serverless';

async function migrateToAuthorRole() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔄 Starting migration to author role system...');
    
    // 1. Add the role column to story_participants (if not exists)
    await pool.query(`
      ALTER TABLE story_participants 
      ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'participant'
    `);
    
    // 2. Rename creatorId to authorId in stories table (if not exists)
    await pool.query(`
      ALTER TABLE stories 
      RENAME COLUMN creator_id TO author_id
    `);
    
    // 3. Update existing story creators to have author role
    await pool.query(`
      UPDATE story_participants 
      SET role = 'author' 
      WHERE (story_id, user_id) IN (
        SELECT s.id, s.author_id 
        FROM stories s 
        WHERE s.author_id = story_participants.user_id 
        AND s.id = story_participants.story_id
      )
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Updated story creators to have author role');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateToAuthorRole()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
