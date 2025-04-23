"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkNewAds = checkNewAds;
const telegraf_1 = require("telegraf");
const olxScraper_1 = require("../../services/olxScraper");
const storage_1 = require("../../services/storage");
async function checkNewAds(category, bot) {
    try {
        console.log(`${category} uchun yangi e'lonlar tekshirilmoqda...`);
        const ads = await olxScraper_1.olxScraper.scrapeOLX(category);
        const newAds = findNewAds(category, ads);
        if (newAds.length > 0) {
            console.log(`${category} uchun ${newAds.length} ta yangi e'lon topildi`);
            // Kategoriyaga obuna bo'lgan foydalanuvchilarga xabar yuborish
            const users = storage_1.storageService.getWatchList().users;
            for (const [userId, categories] of Object.entries(users)) {
                if (categories.includes(category)) {
                    try {
                        await bot.telegram.sendMessage(userId, `🔔 <b>${category.toUpperCase()}</b> bo'yicha ${newAds.length} ta yangi e'lon topildi!`, { parse_mode: 'HTML' });
                        for (const item of newAds.slice(0, 5)) {
                            try {
                                await bot.telegram.sendPhoto(userId, { url: item.image || '' }, {
                                    caption: `📌 <b>${item.title}</b>\n💵 ${item.price}\n📍 ${item.location}\n🔗 <a href="${item.link}">OLXda ko'rish</a>`,
                                    parse_mode: 'HTML',
                                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                                        [telegraf_1.Markup.button.url('🔍 OLXda ko\'rish', item.link)]
                                    ]).reply_markup
                                });
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                            catch (e) {
                                console.error(`${userId} ga xabar yuborishda xato:`, e);
                            }
                        }
                    }
                    catch (e) {
                        console.error(`${userId} ga xabar yuborishda xato:`, e);
                    }
                }
            }
            // So'nggi e'lonlar ro'yxatini yangilash
            storage_1.storageService.updateLastAds(category, ads.slice(0, 20));
            await storage_1.storageService.saveData();
        }
        else {
            console.log(`${category} uchun yangi e'lonlar topilmadi`);
        }
    }
    catch (error) {
        console.error(`${category} uchun yangi e'lonlarni tekshirishda xato:`, error);
    }
}
function findNewAds(category, newAds) {
    const watchList = storage_1.storageService.getWatchList();
    const oldAdIds = new Set(watchList.lastAds[category].map(ad => ad.id));
    return newAds.filter(ad => !oldAdIds.has(ad.id));
}
