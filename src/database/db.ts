import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'olx_bot',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully at', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    return false;
  }
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id BIGINT PRIMARY KEY,
          username VARCHAR(255),
          first_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, category_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ads (
          id VARCHAR(255) PRIMARY KEY,
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          price VARCHAR(100),
          location VARCHAR(255),
          link TEXT NOT NULL,
          image TEXT,
          created_at VARCHAR(100),
          scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ads_category ON ads(category_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ads_scraped_at ON ads(scraped_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_category ON user_subscriptions(category_id);
    `);

    // Insert default categories
    await client.query(`
      INSERT INTO categories (name) VALUES ('kvartira'), ('macbook air'), ('iphone')
      ON CONFLICT (name) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('PostgreSQL pool closed');
}
