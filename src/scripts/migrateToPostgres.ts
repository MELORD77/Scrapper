import { promises as fs } from 'fs';
import path from 'path';
import { pool, initializeDatabase, testConnection, closePool } from '../database/db';
import { WatchList } from '../types/types';

const JSON_FILE = path.join(__dirname, '../../watched_items.json');

// Get category ID by name
async function getCategoryId(categoryName: string): Promise<number | null> {
  try {
    const result = await pool.query(
      'SELECT id FROM categories WHERE name = $1',
      [categoryName]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error('Error getting category ID:', error);
    return null;
  }
}

async function migrateData(): Promise<void> {
  console.log('🚀 Starting migration from JSON to PostgreSQL...\n');

  try {
    // Step 1: Test database connection
    console.log('📡 Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Failed to connect to database. Please check your .env configuration.');
      return;
    }

    // Step 2: Initialize database schema
    console.log('\n📋 Initializing database schema...');
    await initializeDatabase();

    // Step 3: Read JSON file
    console.log('\n📂 Reading JSON file...');
    const jsonData = await fs.readFile(JSON_FILE, 'utf8');
    const watchList: WatchList = JSON.parse(jsonData);
    console.log(`✅ Found ${Object.keys(watchList.users).length} users in JSON file`);

    // Step 4: Migrate users and subscriptions
    console.log('\n👥 Migrating users and subscriptions...');
    let userCount = 0;
    let subscriptionCount = 0;

    for (const [userId, categories] of Object.entries(watchList.users)) {
      // Insert user
      await pool.query(
        'INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
        [userId]
      );
      userCount++;

      // Insert subscriptions
      for (const category of categories) {
        const categoryId = await getCategoryId(category);
        if (categoryId) {
          await pool.query(
            `INSERT INTO user_subscriptions (user_id, category_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, category_id) DO NOTHING`,
            [userId, categoryId]
          );
          subscriptionCount++;
        }
      }
    }
    console.log(`✅ Migrated ${userCount} users and ${subscriptionCount} subscriptions`);

    // Step 5: Migrate ads
    console.log('\n📰 Migrating ads...');
    let totalAds = 0;

    for (const [category, ads] of Object.entries(watchList.lastAds)) {
      const categoryId = await getCategoryId(category);
      if (!categoryId) {
        console.log(`⚠️  Category '${category}' not found, skipping...`);
        continue;
      }

      console.log(`  Processing ${category}: ${ads.length} ads...`);

      for (const ad of ads) {
        await pool.query(
          `INSERT INTO ads (id, category_id, title, price, location, link, image, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             price = EXCLUDED.price,
             location = EXCLUDED.location,
             link = EXCLUDED.link,
             image = EXCLUDED.image,
             updated_at = CURRENT_TIMESTAMP`,
          [ad.id, categoryId, ad.title, ad.price, ad.location, ad.link, ad.image, ad.createdAt]
        );
        totalAds++;
      }
    }
    console.log(`✅ Migrated ${totalAds} ads`);

    // Step 6: Verify migration
    console.log('\n🔍 Verifying migration...');
    const userCountResult = await pool.query('SELECT COUNT(*) FROM users');
    const subscriptionCountResult = await pool.query('SELECT COUNT(*) FROM user_subscriptions');
    const adsCountResult = await pool.query('SELECT COUNT(*) FROM ads');

    console.log(`  Users in DB: ${userCountResult.rows[0].count}`);
    console.log(`  Subscriptions in DB: ${subscriptionCountResult.rows[0].count}`);
    console.log(`  Ads in DB: ${adsCountResult.rows[0].count}`);

    console.log('\n✅ Migration completed successfully! 🎉');
    console.log('\n📝 Next steps:');
    console.log('  1. Update your .env file with correct database credentials');
    console.log('  2. The application will now use PostgreSQL instead of JSON file');
    console.log('  3. You can backup and remove watched_items.json if you want');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('\n👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
