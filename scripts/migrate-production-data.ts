import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import ws from "ws";

// We'll need the production DATABASE_URL to connect to your deployed version
const PRODUCTION_DB_URL = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;

async function migrateProductionData() {
  try {
    console.log('🚀 Starting production data migration...');
    
    if (!PRODUCTION_DB_URL) {
      console.error('❌ PRODUCTION_DATABASE_URL not found. Please set it as an environment variable.');
      return;
    }
    
    // Connect to production database (your deployed app's database)
    const prodPool = new Pool({ 
      connectionString: PRODUCTION_DB_URL,
      webSocketConstructor: ws 
    });
    const prodDb = drizzle({ client: prodPool, schema });
    
    console.log('📡 Connected to production database');
    
    // Query and display the real data from your deployed app
    const prodUsers = await prodDb.select().from(schema.users);
    const prodStories = await prodDb.select().from(schema.stories);
    const prodSegments = await prodDb.select().from(schema.storySegments);
    
    console.log('\n📊 Production Data Summary:');
    console.log(`👥 Users: ${prodUsers.length}`);
    console.log(`📚 Stories: ${prodStories.length}`);
    console.log(`📝 Story Segments: ${prodSegments.length}`);
    
    // Display user details (excluding sensitive info)
    console.log('\n👥 Users in production:');
    prodUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.email?.substring(0, 3)}...)`);
    });
    
    // Display story details
    console.log('\n📚 Stories in production:');
    prodStories.forEach(story => {
      console.log(`  - "${story.title}" by ${story.creatorId}`);
    });
    
    await prodPool.end();
    
    console.log('\n✅ Production data analysis completed!');
    console.log('📋 This data can now be migrated to your development environment.');
    
  } catch (error) {
    console.error('❌ Failed to connect to production database:', error);
    console.log('\n💡 Make sure PRODUCTION_DATABASE_URL is set correctly.');
  }
}

// Run the analysis
migrateProductionData();