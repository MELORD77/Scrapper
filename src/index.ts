import 'dotenv/config';
import { createBot } from './bot';
import { storageService } from './services/storage';
import cron from 'node-cron';
import { checkNewAds } from './bot/handlers/notificationHandlers';
import { olxScraper } from './services/olxScraper';
import { Markup } from 'telegraf';
import data from '../watched_items.json';
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
  
bot.hears("hi", async (ctx) => {
    await ctx.reply(
      `👋 Assalomu alaykum, ${ctx.message.from.first_name}!\n\nOLX scraper botga xush kelibsiz! Bu bot OLX.uz saytidagi e'lonlarni qidirish va yangi e'lonlar haqida xabar berish imkonini beradi.`      
    );
  });  

  bot.hears('iPhone1', async (ctx) => {
    await ctx.reply(
      '📱 *iPhone bo\'limi*\n\nUshbu bo\'limda iPhone bo\'yicha qidiruv va yangi e\'lonlarni kuzatish mumkin.',
      {
        parse_mode: 'Markdown',
      }
    );
  })
    
  // Initial data collection
  try {
    // const data = await storageService.loadData();
    console.log('Collecting initial data...' + data);
    const initialKvartira = await olxScraper.scrapeOLX('kvartira');
    const initialMacbook = await olxScraper.scrapeOLX('macbook air');
    const initialIphone = await olxScraper.scrapeOLX('iphone');
    

    storageService.updateLastAds('kvartira', initialKvartira);
    storageService.updateLastAds('macbook air', initialMacbook);
    storageService.updateLastAds('iphone', initialIphone);
    
    await storageService.saveData();
    await checkNewAds('kvartira', bot);
    console.log('Initial data saved');
  } catch (error) {
    console.error('Error collecting initial data:', error);
  }
  
  // Setup cron jobs 
  cron.schedule('* * * * *', async () => {
    console.log('Checking for new ads...');
    await checkNewAds('kvartira', bot);
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await checkNewAds('macbook air', bot);
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await checkNewAds('iphone', bot);
  });
}
process.once('SIGINT', () => bot?.stop('SIGINT'));
process.once('SIGTERM', () => bot?.stop('SIGTERM'));
console.log("start bot");


// Start the bot
startBot();