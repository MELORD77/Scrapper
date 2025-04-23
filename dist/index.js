"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bot_1 = require("./bot");
const storage_1 = require("./services/storage");
const node_cron_1 = __importDefault(require("node-cron"));
const notificationHandlers_1 = require("./bot/handlers/notificationHandlers");
const olxScraper_1 = require("./services/olxScraper");
let bot;
async function startBot() {
    // Load data
    await storage_1.storageService.loadData();
    // Initialize bot
    bot = (0, bot_1.createBot)();
    // Launch bot
    bot.launch()
        .then(() => console.log('Bot is running...'))
        .catch(err => console.error('Error starting bot:', err));
    // Initial data collection
    try {
        console.log('Collecting initial data...');
        const initialKvartira = await olxScraper_1.olxScraper.scrapeOLX('kvartira');
        // const initialMacbook = await olxScraper.scrapeOLX('macbook air');
        // const initialIphone = await olxScraper.scrapeOLX('iphone');
        console.log(initialKvartira.length, 'kvartira e\'lonlari topildi');
        // storageService.updateLastAds('kvartira', initialKvartira);
        // storageService.updateLastAds('macbook air', initialMacbook);
        // storageService.updateLastAds('iphone', initialIphone);
        await storage_1.storageService.saveData();
        console.log('Initial data saved');
    }
    catch (error) {
        console.error('Error collecting initial data:', error);
    }
    // Setup cron jobs 
    node_cron_1.default.schedule('* * * * *', async () => {
        console.log('Checking for new ads...');
        await (0, notificationHandlers_1.checkNewAds)('kvartira', bot);
        await new Promise(resolve => setTimeout(resolve, 10000));
        // await checkNewAds('macbook air', bot);
        // await new Promise(resolve => setTimeout(resolve, 10000));
        // await checkNewAds('iphone', bot);
    });
}
process.once('SIGINT', () => bot?.stop('SIGINT'));
process.once('SIGTERM', () => bot?.stop('SIGTERM'));
// Start the bot
startBot();
