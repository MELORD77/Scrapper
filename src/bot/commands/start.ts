import { Telegraf } from 'telegraf';
import { getMainMenu } from '../keyboards';

export function setupStartCommand(bot: Telegraf) {
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `👋 Assalomu alaykum, ${ctx.message.from.first_name}!\n\nOLX scraper botga xush kelibsiz!`,
      getMainMenu()
    );
  });
}