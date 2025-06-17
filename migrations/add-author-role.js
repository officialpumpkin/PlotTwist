

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
    
    // 2. Check if we need to rename creatorId to authorId
    const hasCreatorId = columnCheck.rows.some(row => row.column_name === 'creatorId');
    const hasAuthorId = columnCheck.rows.some(row => row.column_name === 'authorId');
    
    if (hasCreatorId && !hasAuthorId) {
      console.log('🔄 Renaming creatorId to authorId...');
      await pool.query(`
        ALTER TABLE stories 
        RENAME COLUMN "creatorId" TO "authorId"
      `);
      console.log('✅ Renamed creatorId to authorId');
    } else if (hasAuthorId) {
      console.log('✅ authorId column already exists');
    } else {
      console.log('⚠️  No creator or author column found, adding authorId...');
      await pool.query(`
        ALTER TABLE stories 
        ADD COLUMN "authorId" VARCHAR NOT NULL DEFAULT 'unknown'
      `);
    }
    
    // 3. Update existing story creators to have author role
    await pool.query(`
      INSERT INTO story_participants (story_id, user_id, role)
      SELECT s.id, s."authorId", 'author'
      FROM stories s
      WHERE NOT EXISTS (
        SELECT 1 FROM story_participants sp 
        WHERE sp.story_id = s.id AND sp.user_id = s."authorId"
      )
    `);
    console.log('✅ Added story authors as participants with author role');
    
    // 4. Update existing participants to have author role if they are the story creator
    await pool.query(`
      UPDATE story_participants 
      SET role = 'author' 
      WHERE (story_id, user_id) IN (
        SELECT s.id, s."authorId" 
        FROM stories s 
        WHERE s."authorId" = story_participants.user_id 
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

