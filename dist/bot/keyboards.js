"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMainMenu = getMainMenu;
exports.getCategoryMenu = getCategoryMenu;
const telegraf_1 = require("telegraf");
function getMainMenu() {
    return telegraf_1.Markup.keyboard([
        ['🏠 Kvartiralar', '💻 MacBook Air'],
        ['📱 iPhone', '🔍 Qidiruv'],
        ['⚙️ Sozlamalar', '📊 Obunalar']
    ]).resize();
}
function getCategoryMenu(category) {
    return telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback('🔍 Qidirish', `search_${category}`)],
        [telegraf_1.Markup.button.callback('📋 Yangi e\'lonlarni kuzatish', `watch_${category}`)],
        [telegraf_1.Markup.button.callback('⏹ Kuzatishni to\'xtatish', `unwatch_${category}`)],
        [telegraf_1.Markup.button.callback('🔙 Orqaga', 'back_to_main')]
    ]);
}
// Add more keyboard helpers as needed...
