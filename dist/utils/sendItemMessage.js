"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendItemMessage = sendItemMessage;
const telegraf_1 = require("telegraf");
async function sendItemMessage(ctx, item) {
    const isImageValid = item.image && /\.(jpg|jpeg|png|webp)$/i.test(item.image);
    const caption = `📌 <b>${item.title}</b>\n💵 ${item.price}\n📍 ${item.location}\n🔗 <a href="${item.link}">OLXda ko'rish</a>`;
    const markup = telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.url('🔍 OLXda ko\'rish', item.link)]
    ]);
    try {
        if (isImageValid) {
            await ctx.replyWithPhoto({ url: item.image }, {
                caption,
                parse_mode: 'HTML',
                reply_markup: markup.reply_markup
            });
        }
        else {
            await ctx.replyWithHTML(caption, markup);
        }
    }
    catch (err) {
        console.error('sendItemMessage xatoligi:', err);
        await ctx.replyWithHTML(caption, markup); // fallback matnli xabar
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // delay to avoid flood
}
