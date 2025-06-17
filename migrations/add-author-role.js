

import { Pool } from '@neondatabase/serverless';

async function migrateToAuthorRole() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔄 Starting migration to author role system...');
    
    // First, let's check what columns exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stories' 
      AND (column_name LIKE '%creator%' OR column_name LIKE '%author%')
    `);
    
    console.log('📋 Current story table columns:', columnCheck.rows);
    
    // 1. Add the role column to story_participants (if not exists)
    await pool.query(`
      ALTER TABLE story_participants 
      ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'participant'
    `);
    console.log('✅ Added role column to story_participants');
    
    // 2. Keep the existing creator_id column - no need to rename
    const hasCreatorId = columnCheck.rows.some(row => row.column_name === 'creator_id');
    
    if (!hasCreatorId) {
      console.log('⚠️  No creator_id column found, adding it...');
      await pool.query(`
        ALTER TABLE stories 
        ADD COLUMN creator_id VARCHAR NOT NULL DEFAULT 'unknown'
      `);
    } else {
      console.log('✅ creator_id column already exists');
    }
    
    // 3. Update existing story creators to have author role
    await pool.query(`
      INSERT INTO story_participants (story_id, user_id, role)
      SELECT s.id, s.creator_id, 'author'
      FROM stories s
      WHERE NOT EXISTS (
        SELECT 1 FROM story_participants sp 
        WHERE sp.story_id = s.id AND sp.user_id = s.creator_id
      )
    `);
    console.log('✅ Added story authors as participants with author role');
    
    // 4. Update existing participants to have author role if they are the story creator
    await pool.query(`
      UPDATE story_participants 
      SET role = 'author' 
      WHERE (story_id, user_id) IN (
        SELECT s.id, s.creator_id 
        FROM stories s 
        WHERE s.creator_id = story_participants.user_id 
        AND s.id = story_participants.story_id
      )
    `);
    console.log('✅ Updated existing participants to have correct roles');
    
    console.log('✅ Migration completed successfully!');
    
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

