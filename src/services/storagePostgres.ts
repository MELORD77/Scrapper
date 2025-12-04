import { pool } from '../database/db';
import { WatchList, AdItem } from '../types/types';

class PostgresStorageService {
  // Get category ID by name
  private async getCategoryId(categoryName: string): Promise<number | null> {
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

  // Get category name by ID
  private async getCategoryName(categoryId: number): Promise<string | null> {
    try {
      const result = await pool.query(
        'SELECT name FROM categories WHERE id = $1',
        [categoryId]
      );
      return result.rows.length > 0 ? result.rows[0].name : null;
    } catch (error) {
      console.error('Error getting category name:', error);
      return null;
    }
  }

  // Load data (for backward compatibility - returns WatchList structure)
  async loadData(): Promise<void> {
    console.log('✅ Using PostgreSQL storage - no file loading needed');
  }

  // Save data (for backward compatibility - no-op since we save directly)
  async saveData(): Promise<void> {
    console.log('✅ Using PostgreSQL storage - data is already persisted');
  }

  // Get all watch list data (reconstructs the old JSON structure)
  async getWatchList(): Promise<WatchList> {
    try {
      const watchList: WatchList = {
        users: {},
        lastAds: {
          'kvartira': [],
          'macbook air': [],
          'iphone': []
        }
      };

      // Get all users and their subscriptions
      const usersResult = await pool.query(`
        SELECT u.id, c.name as category
        FROM users u
        JOIN user_subscriptions us ON u.id = us.user_id
        JOIN categories c ON us.category_id = c.id
        ORDER BY u.id, c.name
      `);

      for (const row of usersResult.rows) {
        const userId = row.id.toString();
        if (!watchList.users[userId]) {
          watchList.users[userId] = [];
        }
        watchList.users[userId].push(row.category);
      }

      // Get last ads for each category
      const categories = ['kvartira', 'macbook air', 'iphone'];
      for (const category of categories) {
        watchList.lastAds[category] = await this.getLastAds(category);
      }

      return watchList;
    } catch (error) {
      console.error('Error getting watch list:', error);
      return {
        users: {},
        lastAds: {
          'kvartira': [],
          'macbook air': [],
          'iphone': []
        }
      };
    }
  }

  // Get user's watch list
  async getUserWatchList(userId: string): Promise<string[]> {
    try {
      const result = await pool.query(`
        SELECT c.name
        FROM user_subscriptions us
        JOIN categories c ON us.category_id = c.id
        WHERE us.user_id = $1
      `, [userId]);

      return result.rows.map(row => row.name);
    } catch (error) {
      console.error('Error getting user watch list:', error);
      return [];
    }
  }

  // Add category to user's watch list
  async addUserWatchCategory(userId: string, category: string): Promise<void> {
    try {
      const categoryId = await this.getCategoryId(category);
      if (!categoryId) {
        console.error(`Category '${category}' not found`);
        return;
      }

      // Insert user if not exists
      await pool.query(`
        INSERT INTO users (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
      `, [userId]);

      // Add subscription
      await pool.query(`
        INSERT INTO user_subscriptions (user_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, category_id) DO NOTHING
      `, [userId, categoryId]);

      console.log(`✅ User ${userId} subscribed to ${category}`);
    } catch (error) {
      console.error('Error adding user watch category:', error);
    }
  }

  // Remove category from user's watch list
  async removeUserWatchCategory(userId: string, category: string): Promise<void> {
    try {
      const categoryId = await this.getCategoryId(category);
      if (!categoryId) {
        console.error(`Category '${category}' not found`);
        return;
      }

      await pool.query(`
        DELETE FROM user_subscriptions
        WHERE user_id = $1 AND category_id = $2
      `, [userId, categoryId]);

      console.log(`✅ User ${userId} unsubscribed from ${category}`);
    } catch (error) {
      console.error('Error removing user watch category:', error);
    }
  }

  // Update last ads for a category
  async updateLastAds(category: string, ads: AdItem[]): Promise<void> {
    try {
      const categoryId = await this.getCategoryId(category);
      if (!categoryId) {
        console.error(`Category '${category}' not found`);
        return;
      }

      // Insert or update ads
      for (const ad of ads) {
        await pool.query(`
          INSERT INTO ads (id, category_id, title, price, location, link, image, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            price = EXCLUDED.price,
            location = EXCLUDED.location,
            link = EXCLUDED.link,
            image = EXCLUDED.image,
            updated_at = CURRENT_TIMESTAMP
        `, [ad.id, categoryId, ad.title, ad.price, ad.location, ad.link, ad.image, ad.createdAt]);
      }

      console.log(`✅ Updated ${ads.length} ads for category '${category}'`);
    } catch (error) {
      console.error('Error updating last ads:', error);
    }
  }

  // Get last ads for a category
  async getLastAds(category: string): Promise<AdItem[]> {
    try {
      const categoryId = await this.getCategoryId(category);
      if (!categoryId) {
        return [];
      }

      const result = await pool.query(`
        SELECT id, title, price, location, link, image, created_at as "createdAt"
        FROM ads
        WHERE category_id = $1
        ORDER BY scraped_at DESC
        LIMIT 100
      `, [categoryId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting last ads:', error);
      return [];
    }
  }

  // Get all users subscribed to a category
  async getUsersSubscribedToCategory(category: string): Promise<string[]> {
    try {
      const categoryId = await this.getCategoryId(category);
      if (!categoryId) {
        return [];
      }

      const result = await pool.query(`
        SELECT user_id
        FROM user_subscriptions
        WHERE category_id = $1
      `, [categoryId]);

      return result.rows.map(row => row.user_id.toString());
    } catch (error) {
      console.error('Error getting subscribed users:', error);
      return [];
    }
  }

  // Clear all subscriptions for a user
  async clearUserSubscriptions(userId: string): Promise<void> {
    try {
      await pool.query(`
        DELETE FROM user_subscriptions
        WHERE user_id = $1
      `, [userId]);

      console.log(`✅ Cleared all subscriptions for user ${userId}`);
    } catch (error) {
      console.error('Error clearing user subscriptions:', error);
    }
  }
}

export const storageService = new PostgresStorageService();
