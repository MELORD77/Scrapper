"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupInlineHandlers = setupInlineHandlers;
const telegraf_1 = require("telegraf");
const keyboards_1 = require("../keyboards");
const olxScraper_1 = require("../../services/olxScraper");
const storage_1 = require("../../services/storage");
const sendItemMessage_1 = require("../../utils/sendItemMessage");
const userSearchResults = new Map();
function getPageItems(items, page, pageSize = 5) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
}
function setupInlineHandlers(bot) {
    bot.action(/^search_(.+)$/, async (ctx) => {
        const match = ctx.match;
        const category = match[1];
        await ctx.answerCbQuery();
        await ctx.reply(`🔍 *${category.toUpperCase()} qidiruvi*\n\nIltimos, maksimal narxni kiriting yoki "0" ni bosing.`, {
            parse_mode: 'Markdown',
            ...telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('Narxsiz', `do_search_${category}_0`)],
                [
                    telegraf_1.Markup.button.callback('3 mln gacha', `do_search_${category}_3000000`),
                    telegraf_1.Markup.button.callback('5 mln gacha', `do_search_${category}_5000000`)
                ],
                [
                    telegraf_1.Markup.button.callback('10 mln gacha', `do_search_${category}_10000000`),
                    telegraf_1.Markup.button.callback('20 mln gacha', `do_search_${category}_20000000`)
                ],
                [telegraf_1.Markup.button.callback('🔙 Orqaga', `back_to_category_${category}`)]
            ])
        });
    });
    bot.action(/^do_search_(.+)_(\d+)$/, async (ctx) => {
        const match = ctx.match;
        const category = match[1];
        const maxPrice = parseInt(match[2]);
        const userId = ctx.from.id.toString();
        await ctx.answerCbQuery();
        const loadingMsg = await ctx.reply(`🔍 "${category}" bo'yicha OLXdan e'lonlar qidirilmoqda... ${maxPrice > 0 ? `(💰 Maksimal narx: ${maxPrice.toLocaleString('ru-RU')} so'm)` : ''}`);
        try {
            const items = await olxScraper_1.olxScraper.scrapeOLX(category, maxPrice > 0 ? maxPrice : null);
            await ctx.deleteMessage(loadingMsg.message_id);
            if (items.length === 0) {
                return ctx.reply('Hech qanday natija topilmadi. Qidiruv so\'rovini o\'zgartirib ko\'ring.');
            }
            userSearchResults.set(userId, items);
            await ctx.reply(`✅ ${items.length} ta e'lon topildi. Eng yangilari:`);
            const pageItems = getPageItems(items, 1);
            for (const item of pageItems) {
                try {
                    await (0, sendItemMessage_1.sendItemMessage)(ctx, item);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (e) {
                    console.error('Xabar yuborishda xato:', e);
                }
            }
            if (getPageItems(items, 2).length > 0) {
                await ctx.reply('⬇️ Yana natijalarni ko‘rish uchun:', {
                    ...telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('➡️ Keyingisi', `next_${category}_2`)]
                    ])
                });
            }
            await ctx.reply('🔄 Boshqa amal tanlang:', {
                ...telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('📋 Ushbu kategoriyani kuzatish', `watch_${category}`)],
                    [telegraf_1.Markup.button.callback('🔙 Orqaga', `back_to_category_${category}`)]
                ])
            });
        }
        catch (error) {
            console.error('Xatolik:', error);
            await ctx.deleteMessage(loadingMsg.message_id);
            ctx.reply('⚠️ Xatolik yuz berdi: ' + (error instanceof Error ? error.message : 'Noma\'lum xatolik'));
        }
    });
    bot.action(/^next_(.+)_(\d+)$/, async (ctx) => {
        const category = ctx.match[1];
        const page = parseInt(ctx.match[2]);
        const userId = ctx.from.id.toString();
        await ctx.answerCbQuery();
        const items = userSearchResults.get(userId);
        if (!items) {
            return ctx.reply('❌ Qidiruv natijalari topilmadi. Iltimos, qaytadan urinib ko‘ring.');
        }
        const pageItems = getPageItems(items, page);
        if (pageItems.length === 0) {
            return ctx.reply('✅ Boshqa natijalar yo‘q.');
        }
        for (const item of pageItems) {
            try {
                await (0, sendItemMessage_1.sendItemMessage)(ctx, item);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (e) {
                console.error('Xabar yuborishda xato:', e);
            }
        }
        if (getPageItems(items, page + 1).length > 0) {
            await ctx.reply('⬇️ Yana natijalarni ko‘rish uchun:', {
                ...telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('➡️ Keyingisi', `next_${category}_${page + 1}`)]
                ])
            });
        }
        else {
            userSearchResults.delete(userId); // xotirani tozalash
        }
    });
    bot.action(/^watch_(.+)$/, async (ctx) => {
        const category = ctx.match[1];
        const userId = ctx.from.id.toString();
        storage_1.storageService.addUserWatchCategory(userId, category);
        await storage_1.storageService.saveData();
        await ctx.answerCbQuery(`✅ Siz ${category} kategoriyasiga obuna bo'ldingiz!`);
        await ctx.reply(`✅ *${category.toUpperCase()}* kategoriyasi kuzatuv ro'yxatiga qo'shildi!\n\nEndi yangi e'lonlar paydo bo'lganda avtomatik tarzda sizga xabar yuboriladi.`, {
            parse_mode: 'Markdown',
            ...telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('🔙 Orqaga', `back_to_category_${category}`)]
            ])
        });
    });
    bot.action(/^unwatch_(.+)$/, async (ctx) => {
        const category = ctx.match[1];
        const userId = ctx.from.id.toString();
        storage_1.storageService.removeUserWatchCategory(userId, category);
        await storage_1.storageService.saveData();
        await ctx.answerCbQuery(`❌ ${category} kategoriyasiga obuna bekor qilindi`);
        await ctx.reply(`❌ *${category.toUpperCase()}* kategoriyasiga obuna bekor qilindi.`, {
            parse_mode: 'Markdown',
            ...telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('🔙 Orqaga', `back_to_category_${category}`)]
            ])
        });
    });
    bot.action(/^back_to_category_(.+)$/, async (ctx) => {
        const category = ctx.match[1];
        await ctx.answerCbQuery();
        await ctx.reply(`🔄 *${category.toUpperCase()} bo'limi*\n\nUshbu bo'limda ${category} bo'yicha qidiruv va yangi e'lonlarni kuzatish mumkin.`, {
            parse_mode: 'Markdown',
            ...(0, keyboards_1.getCategoryMenu)(category)
        });
    });
    bot.action('back_to_main', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('🏠 Asosiy menu:', (0, keyboards_1.getMainMenu)());
    });
    bot.action('settings_notifications', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('⏱ *Xabarlar vaqti*\n\nYangi e\'lonlar haqidagi xabarlar har 30 daqiqada tekshiriladi.', {
            parse_mode: 'Markdown',
            ...telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('🔙 Orqaga', 'back_to_settings')]
            ])
        });
    });
    bot.action('settings_reset', async (ctx) => {
        const userId = ctx.from.id.toString();
        console.log(ctx.from.username);
        const userWatchList = storage_1.storageService.getUserWatchList(userId);
        if (userWatchList.length > 0) {
            userWatchList.forEach(category => {
                storage_1.storageService.removeUserWatchCategory(userId, category);
            });
            await storage_1.storageService.saveData();
            await ctx.answerCbQuery('✅ Barcha kuzatuvlar bekor qilindi');
            await ctx.reply('✅ *Barcha kuzatuvlar bekor qilindi*\n\nEndi sizga yangi e\'lonlar haqida xabarlar yuborilmaydi.', {
                parse_mode: 'Markdown',
                ...telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('🔙 Orqaga', 'back_to_settings')]
                ])
            });
        }
        else {
            await ctx.answerCbQuery('Siz hech qanday kategoriyaga obuna bo\'lmagansiz');
            await ctx.reply('ℹ️ *Siz hech qanday kategoriyaga obuna bo\'lmagansiz.*', {
                parse_mode: 'Markdown',
                ...telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('🔙 Orqaga', 'back_to_settings')]
                ])
            });
        }
    });
    bot.action('back_to_settings', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('⚙️ *Sozlamalar*\n\nQuyidagi amallarni bajarishingiz mumkin:', {
            parse_mode: 'Markdown',
            ...telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('🕒 Xabarlar vaqtini o\'zgartirish', 'settings_notifications')],
                [telegraf_1.Markup.button.callback('🔄 Barcha kuzatuvlarni bekor qilish', 'settings_reset')],
                [telegraf_1.Markup.button.callback('🔙 Orqaga', 'back_to_main')]
            ])
        });
    });
}
