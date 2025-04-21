import { Telegraf } from 'telegraf';
import { Markup } from 'telegraf';
import { getCategoryMenu } from '../keyboards';
import { olxScraper } from '../../services/olxScraper';
import { storageService } from '../../services/storage';

export function setupCategoryHandlers(bot: Telegraf) {
  // Kvartiralar bo'limi
  bot.hears('🏠 Kvartiralar', async (ctx) => {
    await ctx.reply(
      '🏠 *Kvartiralar bo\'limi*\n\nUshbu bo\'limda kvartiralar bo\'yicha qidiruv va yangi e\'lonlarni kuzatish mumkin.',
      {
        parse_mode: 'Markdown',
        ...getCategoryMenu('kvartira')
      }
    );
  });

  // MacBook Air bo'limi
  bot.hears('💻 MacBook Air', async (ctx) => {
    await ctx.reply(
      '💻 *MacBook Air bo\'limi*\n\nUshbu bo\'limda MacBook Air bo\'yicha qidiruv va yangi e\'lonlarni kuzatish mumkin.',
      {
        parse_mode: 'Markdown',
        ...getCategoryMenu('macbook air')
      }
    );
  });

  // iPhone bo'limi
  bot.hears('📱 iPhone', async (ctx) => {
    await ctx.reply(
      '📱 *iPhone bo\'limi*\n\nUshbu bo\'limda iPhone bo\'yicha qidiruv va yangi e\'lonlarni kuzatish mumkin.',
      {
        parse_mode: 'Markdown',
        ...getCategoryMenu('iphone')
      }
    );
  });

  // Qidiruv bo'limi
  bot.hears('🔍 Qidiruv', async (ctx) => {
    await ctx.reply(
      '🔍 *Qidiruv*\n\nNarsa nomini va ixtiyoriy ravishda maksimal narxni kiriting.\n\nMisol: `/search iphone 13 5000000`',
      { parse_mode: 'Markdown' }
    );
  });

  // Sozlamalar bo'limi
  bot.hears('⚙️ Sozlamalar', async (ctx) => {
    await ctx.reply(
      '⚙️ *Sozlamalar*\n\nQuyidagi amallarni bajarishingiz mumkin:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🕒 Xabarlar vaqtini o\'zgartirish', 'settings_notifications')],
          [Markup.button.callback('🔄 Barcha kuzatuvlarni bekor qilish', 'settings_reset')],
          [Markup.button.callback('🔙 Orqaga', 'back_to_main')]
        ])
      }
    );
  });

  // Obunalar bo'limi
  bot.hears('📊 Obunalar', async (ctx) => {
    const userId = ctx.message.from.id.toString();
    const userWatchList = storageService.getUserWatchList(userId);
    
    let message = '📊 *Sizning obunalaringiz*\n\n';
    
    if (userWatchList.length === 0) {
      message += 'Siz hali hech qanday kategoriyaga obuna bo\'lmagansiz.';
    } else {
      message += userWatchList.map((category, index) => `${index + 1}. ${category}`).join('\n');
    }
    
    await ctx.reply(
      message,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Orqaga', 'back_to_main')]
        ])
      }
    );
  });
}