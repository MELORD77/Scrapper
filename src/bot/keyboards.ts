import { Markup } from 'telegraf';

export function getMainMenu() {
  return Markup.keyboard([
    ['🏠 Kvartiralar', '💻 MacBook Air'],
    ['📱 iPhone', '🔍 Qidiruv'],
    ['⚙️ Sozlamalar', '📊 Obunalar']
  ]).resize();
}

export function getCategoryMenu(category: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔍 Qidirish', `search_${category}`)],
    [Markup.button.callback('📋 Yangi e\'lonlarni kuzatish', `watch_${category}`)],
    [Markup.button.callback('⏹ Kuzatishni to\'xtatish', `unwatch_${category}`)],
    [Markup.button.callback('🔙 Orqaga', 'back_to_main')]
  ]);
}

// Add more keyboard helpers as needed...