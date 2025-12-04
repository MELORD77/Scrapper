import { Telegraf } from 'telegraf';
import { Markup } from 'telegraf';
import { olxScraper } from '../../services/olxScraper';
import { storageService } from '../../services/storage';
import { AdItem } from '../../types/types';

export async function checkNewAds(category: string, bot: Telegraf) {
  try {
    console.log(`${category} uchun yangi e'lonlar tekshirilmoqda...`);
    const ads = await olxScraper.scrapeOLX(category);
    

    const newAds = findNewAds(category, ads);
    
    if (newAds.length > 0) {


      const users = storageService.getWatchList().users;
      for (const [userId, categories] of Object.entries(users)) {
        if (categories.includes(category)) {
          try {
            await bot.telegram.sendMessage(
              userId, 
              `🔔 <b>${category.toUpperCase()}</b> bo'yicha ${newAds.length} ta yangi e'lon topildi!`, 
              { parse_mode: 'HTML' }
            );
            
      
            for (const item of newAds.slice(0, 15)) {
              try {
                await bot.telegram.sendPhoto(
                  userId,
                  { url: item.image || '' },
                  {
                    caption: `📌 <b>${item.title}</b>\n💵 ${item.price}\n📍 ${item.location}\n🔗 <a href="${item.link}">OLXda ko'rish</a>`,
                    parse_mode: 'HTML',
                    reply_markup: Markup.inlineKeyboard([
                      [Markup.button.url('🔍 OLXda ko\'rish', item.link)]
                    ]).reply_markup
                  }
                );
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (e) {
                console.error(`${userId} ga xabar yuborishda xato:`, e);
              }
            }
          } catch (e) {
            console.error(`${userId} ga xabar yuborishda xato:`, e);
          }
        }
      }
      
      storageService.updateLastAds(category, ads.slice(0, 20));
      await storageService.saveData();
    } else {
      console.log(`${category} uchun yangi e'lonlar topilmadi`);
    }
  } catch (error) {
    console.error(`${category} uchun yangi e'lonlarni tekshirishda xato:`, error);
  }
}

function findNewAds(category: string, newAds: AdItem[]): AdItem[] {
  const watchList = storageService.getWatchList();
  const oldAdIds = new Set(watchList.lastAds[category].map(ad => ad.id));
  return newAds.filter(ad => !oldAdIds.has(ad.id));
}