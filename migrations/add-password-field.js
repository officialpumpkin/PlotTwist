import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

// This function applies the migration
async function main() {
  console.log('Adding password column to users table...');
  
  try {
    // Check if the column already exists
    const checkColumnExists = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'password';
    `);
    
    if (checkColumnExists.rowCount === 0) {
      // Add password column
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN password varchar;
      `);
      console.log('Password column added successfully');
    } else {
      console.log('Password column already exists');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('Migration complete');
  process.exit(0);
}).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});