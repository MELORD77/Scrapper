"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupStartCommand = setupStartCommand;
const keyboards_1 = require("../keyboards");
function setupStartCommand(bot) {
    bot.command('start', async (ctx) => {
        await ctx.reply(`👋 Assalomu alaykum, ${ctx.message.from.first_name}!\n\nOLX scraper botga xush kelibsiz!`, (0, keyboards_1.getMainMenu)());
    });
}
