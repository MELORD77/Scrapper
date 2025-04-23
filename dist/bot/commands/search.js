"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSearchCommand = setupSearchCommand;
const telegraf_1 = require("telegraf");
const olxScraper_1 = require("../../services/olxScraper");
function setupSearchCommand(bot) {
    bot.command('search', async (ctx) => {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            return ctx.reply('Iltimos, qidiruv so\'rovini kiriting. Misol: /search iphone 13 5000000');
        }
        const maxPrice = args.length > 1 && !isNaN(parseInt(args[args.length - 1])) ? parseInt(args.pop()) : null;
        const searchQuery = args.join(' ');
        try {
            const loadingMsg = await ctx.reply(`🔍 "${searchQuery}" bo'yicha OLXdan e'lonlar qidirilmoqda... ${maxPrice ? `(💰 Maksimal narx: ${maxPrice.toLocaleString('ru-RU')} so'm)` : ''}`);
            const items = await olxScraper_1.olxScraper.scrapeOLX(searchQuery, maxPrice);
            await ctx.deleteMessage(loadingMsg.message_id);
            if (items.length === 0) {
                return ctx.reply('Hech qanday natija topilmadi. Qidiruv so\'rovini o\'zgartirib ko\'ring.');
            }
            await ctx.reply(`✅ ${items.length} ta e'lon topildi. Eng yangilari:`);
            for (const item of items.slice(0, 7)) {
                try {
                    await ctx.replyWithPhoto({ url: item.image }, {
                        caption: `📌 <b>${item.title}</b>\n💵 ${item.price}\n📍 ${item.location}\n🔗 <a href="${item.link}">OLXda ko'rish</a>`,
                        parse_mode: 'HTML',
                        reply_markup: telegraf_1.Markup.inlineKeyboard([
                            [telegraf_1.Markup.button.url('🔍 OLXda ko\'rish', item.link)]
                        ]).reply_markup
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (e) {
                    console.error('Error sending message:', e);
                }
            }
        }
        catch (error) {
            console.error('Error:', error);
            ctx.reply('⚠️ Xatolik yuz berdi: ' + error.message);
        }
    });
}
