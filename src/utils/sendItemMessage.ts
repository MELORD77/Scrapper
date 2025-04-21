import { Context } from 'telegraf';
import { Markup } from 'telegraf';

export async function sendItemMessage(ctx: Context, item: any) {
  const isImageValid = item.image && /\.(jpg|jpeg|png|webp)$/i.test(item.image);

  const caption = `📌 <b>${item.title}</b>\n💵 ${item.price}\n📍 ${item.location}\n🔗 <a href="${item.link}">OLXda ko'rish</a>`;
  const markup = Markup.inlineKeyboard([
    [Markup.button.url('🔍 OLXda ko\'rish', item.link)]
  ]);

  try {
    if (isImageValid) {
      await ctx.replyWithPhoto(
        { url: item.image },
        {
          caption,
          parse_mode: 'HTML',
          reply_markup: markup.reply_markup
        }
      );
    } else {
      await ctx.replyWithHTML(caption, markup);
    }
  } catch (err) {
    console.error('sendItemMessage xatoligi:', err);
    await ctx.replyWithHTML(caption, markup); // fallback matnli xabar
  }

  await new Promise(resolve => setTimeout(resolve, 1000)); // delay to avoid flood
}
