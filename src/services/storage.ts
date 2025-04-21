import { promises as fs } from 'fs';
import path from 'path';
import { WatchList, AdItem } from '../types/types';

const DATA_FILE = path.join(__dirname, '../../watched_items.json');

class StorageService {
  private watchList: WatchList = {
    users: {},
    lastAds: {
      'kvartira': [],
      'macbook air': [],
      'iphone': []
    }
  };

  async loadData(): Promise<void> {
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      this.watchList = JSON.parse(data);
      console.log('Data loaded successfully');
    } catch (error) {
      console.log('Data file not found, creating a new one');
      await this.saveData();
    }
  }

  async saveData(): Promise<void> {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(this.watchList, null, 2), 'utf8');
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  getWatchList(): WatchList {
    return this.watchList;
  }

  getUserWatchList(userId: string): string[] {
    return this.watchList.users[userId] || [];
  }

  addUserWatchCategory(userId: string, category: string): void {
    if (!this.watchList.users[userId]) {
      this.watchList.users[userId] = [];
    }
    if (!this.watchList.users[userId].includes(category)) {
      this.watchList.users[userId].push(category);
    }
  }

  removeUserWatchCategory(userId: string, category: string): void {
    if (this.watchList.users[userId]) {
      this.watchList.users[userId] = this.watchList.users[userId].filter(cat => cat !== category);
    }
  }

  updateLastAds(category: string, ads: AdItem[]): void {
console.log(`Updating last ads for category: ${category}`,ads.length);
    this.watchList.lastAds[category] = ads.slice(0, 20);
  }
}

export const storageService = new StorageService();