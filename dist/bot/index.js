"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBot = createBot;
const telegraf_1 = require("telegraf");
const start_1 = require("./commands/start");
const search_1 = require("./commands/search");
const categoryHandlers_1 = require("./handlers/categoryHandlers");
const inlineHandlers_1 = require("./handlers/inlineHandlers");
function createBot() {
    const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
    // Setup commands
    (0, start_1.setupStartCommand)(bot);
    (0, search_1.setupSearchCommand)(bot);
    // Setup handlers
    (0, categoryHandlers_1.setupCategoryHandlers)(bot);
    (0, inlineHandlers_1.setupInlineHandlers)(bot);
    return bot;
}
