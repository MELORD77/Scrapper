import 'dotenv/config';
import { createBot } from './bot';
import { storageService } from './services/storage';
import cron from 'node-cron';
import { checkNewAds } from './bot/handlers/notificationHandlers';
import { olxScraper } from './services/olxScraper';

let bot: ReturnType<typeof createBot>;

async function startBot() {
  // Load data
  await storageService.loadData();
  
  // Initialize bot
  bot = createBot();
  
  // Launch bot
  bot.launch()
    .then(() => console.log('Bot is running...'))
    .catch(err => console.error('Error starting bot:', err));
  
  // Initial data collection
  try {
    console.log('Collecting initial data...');
    const initialKvartira = await olxScraper.scrapeOLX('kvartira');
    // const initialMacbook = await olxScraper.scrapeOLX('macbook air');
    // const initialIphone = await olxScraper.scrapeOLX('iphone');

    console.log(initialKvartira.length, 'kvartira e\'lonlari topildi');
    
    // storageService.updateLastAds('kvartira', initialKvartira);
    // storageService.updateLastAds('macbook air', initialMacbook);
    // storageService.updateLastAds('iphone', initialIphone);
    
    await storageService.saveData();
    console.log('Initial data saved');
  } catch (error) {
    console.error('Error collecting initial data:', error);
  }
  
  // Setup cron jobs 
  cron.schedule('* * * * *', async () => {
    console.log('Checking for new ads...');
    await checkNewAds('kvartira', bot);
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