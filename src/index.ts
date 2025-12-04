import 'dotenv/config';
import { createBot } from './bot';
import { storageService } from './services/storagePostgres'; // PostgreSQL storage
import { testConnection, initializeDatabase, closePool } from './database/db';
import cron from 'node-cron';
import { checkNewAds } from './bot/handlers/notificationHandlers';
import { olxScraper } from './services/olxScraper';
import { Markup } from 'telegraf';

let bot: ReturnType<typeof createBot>;

async function startBot() {
  // Test PostgreSQL connection
  console.log('🔌 Connecting to PostgreSQL...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Failed to connect to PostgreSQL. Please check your .env configuration.');
    process.exit(1);
  }

  // Initialize database schema
  console.log('📋 Initializing database...');
  await initializeDatabase();

  // Load data (no-op for PostgreSQL, but keeps compatibility)
  await storageService.loadData();

  // Initialize bot
  bot = createBot();

  // Launch bot
  bot.launch()
    .then(() => console.log('✅ Bot is running...'))
    .catch(err => console.error('Error starting bot:', err));
  

    
  // Initial data collection
  try {
    // const data = await storageService.loadData();
    const initialKvartira = await olxScraper.scrapeOLX('kvartira');
    // const initialMacbook = await olxScraper.scrapeOLX('macbook air');
    // const initialIphone = await olxScraper.scrapeOLX('iphone');
    
    console.log(initialKvartira.length, 'kvartira');

    storageService.updateLastAds('kvartira', initialKvartira);
    // storageService.updateLastAds('macbook air', initialMacbook);
    // storageService.updateLastAds('iphone', initialIphone);
    
    await storageService.saveData();
    console.log('Initial data saved');
  } catch (error) {
    console.error('Error collecting initial data:', error);
  }
  
  // Setup cron jobs 
  // cron.schedule('* * * * *', async () => {
  //   console.log('Checking for new ads...');
  //   await checkNewAds('kvartira', bot);
  //   await new Promise(resolve => setTimeout(resolve, 10000));
    
  //   await checkNewAds('macbook air', bot);
  //   await new Promise(resolve => setTimeout(resolve, 10000));
    
  //   await checkNewAds('iphone', bot);
  // });
}
process.once('SIGINT', async () => {
  bot?.stop('SIGINT');
  await closePool();
});
process.once('SIGTERM', async () => {
  bot?.stop('SIGTERM');
  await closePool();
});



// Start the bot
startBot();