import { Telegraf } from 'telegraf';
import { setupStartCommand } from './commands/start';
import { setupSearchCommand } from './commands/search';
import { setupCategoryHandlers } from './handlers/categoryHandlers';
import { setupInlineHandlers } from './handlers/inlineHandlers';

export function createBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN!);

  // Setup commands
  setupStartCommand(bot);
  setupSearchCommand(bot);

  // Setup handlers
  setupCategoryHandlers(bot);
  setupInlineHandlers(bot);

  return bot;
}