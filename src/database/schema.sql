-- OLX Bot Database Schema

-- Create database (run this manually if needed)
-- CREATE DATABASE olx_bot;

-- Users table to store Telegram users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,  -- Telegram user ID
    username VARCHAR(255),
    first_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,  -- 'kvartira', 'macbook air', 'iphone'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions (watch list)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id)
);

-- Ads table to store scraped OLX ads
CREATE TABLE IF NOT EXISTS ads (
    id VARCHAR(255) PRIMARY KEY,  -- OLX ad ID
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    price VARCHAR(100),
    location VARCHAR(255),
    link TEXT NOT NULL,
    image TEXT,
    created_at VARCHAR(100),  -- OLX creation time (e.g., "bugun 14:30")
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_ads_category ON ads(category_id);
CREATE INDEX IF NOT EXISTS idx_ads_scraped_at ON ads(scraped_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_category ON user_subscriptions(category_id);

-- Insert default categories
INSERT INTO categories (name) VALUES ('kvartira'), ('macbook air'), ('iphone')
ON CONFLICT (name) DO NOTHING;
