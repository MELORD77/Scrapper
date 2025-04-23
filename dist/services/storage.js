"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const DATA_FILE = path_1.default.join(__dirname, '../../watched_items.json');
class StorageService {
    constructor() {
        this.watchList = {
            users: {},
            lastAds: {
                'kvartira': [],
                'macbook air': [],
                'iphone': []
            }
        };
    }
    async loadData() {
        try {
            const data = await fs_1.promises.readFile(DATA_FILE, 'utf8');
            this.watchList = JSON.parse(data);
            console.log('Data loaded successfully');
        }
        catch (error) {
            console.log('Data file not found, creating a new one');
            await this.saveData();
        }
    }
    async saveData() {
        try {
            await fs_1.promises.writeFile(DATA_FILE, JSON.stringify(this.watchList, null, 2), 'utf8');
            console.log('Data saved successfully');
        }
        catch (error) {
            console.error('Error saving data:', error);
        }
    }
    getWatchList() {
        return this.watchList;
    }
    getUserWatchList(userId) {
        return this.watchList.users[userId] || [];
    }
    addUserWatchCategory(userId, category) {
        if (!this.watchList.users[userId]) {
            this.watchList.users[userId] = [];
        }
        if (!this.watchList.users[userId].includes(category)) {
            this.watchList.users[userId].push(category);
        }
    }
    removeUserWatchCategory(userId, category) {
        if (this.watchList.users[userId]) {
            this.watchList.users[userId] = this.watchList.users[userId].filter(cat => cat !== category);
        }
    }
    updateLastAds(category, ads) {
        console.log(`Updating last ads for category: ${category}`, ads.length);
        this.watchList.lastAds[category] = ads.slice(0, 20);
    }
}
exports.storageService = new StorageService();
