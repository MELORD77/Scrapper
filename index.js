require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Telegraf, Markup } = require('telegraf');
const cron = require('node-cron');
const fs = require('fs').promises;

// Anti-detection plugin
puppeteer.use(StealthPlugin());

// Telegram botni ishga tushirish
const bot = new Telegraf(process.env.BOT_TOKEN);

// Ma'lumotlar saqlanadigan fayl
const DATA_FILE = 'watched_items.json';

// Kuzatilayotgan e'lonlar va foydalanuvchilar ro'yxati
let watchList = {
  users: {},
  lastAds: {
    'kvartira': [],
    'macbook air': [],
    'iphone': []
  }
};



// Ma'lumotlar faylini yuklash
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    watchList = JSON.parse(data);
    console.log('Ma\'lumotlar fayli yuklandi');
  } catch (error) {
    console.log('Ma\'lumotlar fayli topilmadi, yangi fayl yaratiladi');
    // Yangi fayl yaratish
    await saveData();
  }
}

// Ma'lumotlarni saqlash
async function saveData() {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(watchList, null, 2), 'utf8');
    console.log('Ma\'lumotlar saqlandi');
  } catch (error) {
    console.error('Ma\'lumotlarni saqlashda xatolik:', error);
  }
}

// OLXdan ma'lumot olish funksiyasi
async function scrapeOLX(searchQuery, maxPrice = null) {
  console.log(`"${searchQuery}" uchun brauzer ochilmoqda...`);
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // User-agent sozlamalari
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  // OLX URL yasash
  let url = `https://www.olx.uz/list/q-${encodeURIComponent(searchQuery)}/`;
  if (maxPrice) {
    url += `?search[filter_float_price:to]=${maxPrice}`;
  }

  console.log("Sahifaga o'tilmoqda:", url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Cookie bildirishnomasini yopish (agar mavjud bo'lsa)
  try {
    await page.click('button[data-testid="accept-cookies-button"]', { timeout: 3000 });
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('Cookie tugmasi topilmadi');
  }
  // Sahifani pastga aylantirish
  await autoScroll(page);

  console.log("Ma'lumotlar yig'ilmoqda...");
  const items = await page.evaluate(() => {
    const results = [];
    const ads = document.querySelectorAll('[data-cy="l-card"]');
    
    ads.forEach(item => {

      
      const price = item.querySelector('[data-testid="ad-price"]')?.innerText.trim() || 'Narx ko\'rsatilmagan';
      const location = item.querySelector('[data-testid="location-date"]')?.innerText.trim() || 'Manzil ko\'rsatilmagan';
      const link = item.querySelector('a')?.href || '#';
      const title = link.split('/').pop().split('.')[0] || 'Noma\'lum';
      const image = item.querySelector('img')?.src || 'https://via.placeholder.com/150';
      const id = link.split('/').pop().split('.')[0] ;

      results.push({ id, title, price, location, link, image });
    });
    
    return results;
  });

  await browser.close();
  return items;
}

// Sahifani avtomatik aylantirish
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Asosiy menu keyboard yaratish
function getMainMenu() {
  return Markup.keyboard([
    ['🏠 Kvartiralar', '💻 MacBook Air'],
    ['📱 iPhone', '🔍 Qidiruv'],
    ['⚙️ Sozlamalar', '📊 Obunalar']
  ]).resize();
}

// Kategoriya menu keyboard yaratish
function getCategoryMenu(category) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔍 Qidirish', `search_${category}`)],
    [Markup.button.callback('📋 Yangi e\'lonlarni kuzatish', `watch_${category}`)],
    [Markup.button.callback('⏹ Kuzatishni to\'xtatish', `unwatch_${category}`)],
    [Markup.button.callback('🔙 Orqaga', 'back_to_main')]
  ]);
}

// Yangi e'lonlarni solishtirish
function findNewAds(category, newAds) {
  const oldAdIds = new Set(watchList.lastAds[category].map(ad => ad.id));
  return newAds.filter(ad => !oldAdIds.has(ad.id));
}

// Yangi e'lonlarni tekshirish va xabar yuborish
async function checkNewAds(category) {
  try {
    console.log(`${category} uchun yangi e'lonlar tekshirilmoqda...`);
    const ads = await scrapeOLX(category);
    
    // Yangi e'lonlarni aniqlash
    const newAds = findNewAds(category, ads);
    
    if (newAds.length > 0) {
      console.log(`${category} uchun ${newAds.length} ta yangi e'lon topildi`);
      
      // Kategoriyaga obuna bo'lgan foydalanuvchilarga xabar yuborish
      Object.entries(watchList.users).forEach(async ([userId, categories]) => {
        if (categories.includes(category)) {
          try {
            await bot.telegram.sendMessage(userId, `🔔 <b>${category.toUpperCase()}</b> bo'yicha ${newAds.length} ta yangi e'lon topildi!`, {parse_mode: 'HTML'});
            
            // Eng yangi 5 ta e'lonni yuborish
            for (const item of newAds.slice(0, 5)) {
              try {
                await bot.telegram.sendPhoto(
                  userId,
                  { url: item.image || "" },
                  {
                    caption: `📌 <b>${item.title}</b>\n💵 ${item.price}\n📍 ${item.location}\n🔗 <a href="${item.link}">OLXda ko'rish</a>`,
                    parse_mode: 'HTML',
                    reply_markup: Markup.inlineKeyboard([
                      [Markup.button.url('🔍 OLXda ko\'rish', item.link)]
                    ])
                  }
                );
                await new Promise(resolve => setTimeout(resolve, 1000));
              } catch (e) {
                console.error('Xabar yuborishda xato:', e);
              }
            }
          } catch (e) {
            console.error(`${userId} ga xabar yuborishda xato:`, e);
          }
        }
      });
      
      // So'nggi e'lonlar ro'yxatini yangilash
      watchList.lastAds[category] = ads.slice(0, 20); // Faqat so'nggi 20 tasini saqlash
      await saveData();
    } else {
      console.log(`${category} uchun yangi e'lonlar topilmadi`);
    }
  } catch (error) {
    console.error(`${category} uchun yangi e'lonlarni tekshirishda xato:`, error);
  }
}

// Bot /start komandasi
bot.command('start', async (ctx) => {
  await ctx.reply(
    `👋 Assalomu alaykum, ${ctx.message.from.first_name}!\n\nOLX scraper botga xush kelibsiz! Bu bot OLX.uz saytidagi e'lonlarni qidirish va yangi e'lonlar haqida xabar berish imkonini beradi.`,
    getMainMenu()
  );
});

// Asosiy menu tugmalari
bot.hears('🏠 Kvartiralar', async (ctx) => {
  await ctx.reply(
    '🏠 *Kvartiralar bo\'limi*\n\nUshbu bo\'limda kvartiralar bo\'yicha qidiruv va yangi e\'lonlarni kuzatish mumkin.',
    {
      parse_mode: 'Markdown',
      ...getCategoryMenu('kvartira')
    }
  );
});

bot.hears('💻 MacBook Air', async (ctx) => {
  await ctx.reply(
    '💻 *MacBook Air bo\'limi*\n\nUshbu bo\'limda MacBook Air bo\'yicha qidiruv va yangi e\'lonlarni kuzatish mumkin.',
    {
      parse_mode: 'Markdown',
      ...getCategoryMenu('macbook air')
    }
  );
});

bot.hears('📱 iPhone', async (ctx) => {
  await ctx.reply(
    '📱 *iPhone bo\'limi*\n\nUshbu bo\'limda iPhone bo\'yicha qidiruv va yangi e\'lonlarni kuzatish mumkin.',
    {
      parse_mode: 'Markdown',
      ...getCategoryMenu('iphone')
    }
  );
});

bot.hears('🔍 Qidiruv', async (ctx) => {
  await ctx.reply(
    '🔍 *Qidiruv*\n\nNarsa nomini va ixtiyoriy ravishda maksimal narxni kiriting.\n\nMisol: `/search iphone 13 5000000`',
    { parse_mode: 'Markdown' }
  );
});

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

bot.hears('📊 Obunalar', async (ctx) => {
  const userId = ctx.message.from.id.toString();
  const userWatchList = watchList.users[userId] || [];
  
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

// Inline button callback handler
bot.action(/^search_(.+)$/, async (ctx) => {
  const category = ctx.match[1];
  await ctx.answerCbQuery();
  
  await ctx.reply(
    `🔍 *${category.toUpperCase()} qidiruvi*\n\nIltimos, maksimal narxni kiriting yoki "0" ni bosing.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Narxsiz', `do_search_${category}_0`)],
        [
          Markup.button.callback('3 mln gacha', `do_search_${category}_3000000`),
          Markup.button.callback('5 mln gacha', `do_search_${category}_5000000`)
        ],
        [
          Markup.button.callback('10 mln gacha', `do_search_${category}_10000000`),
          Markup.button.callback('20 mln gacha', `do_search_${category}_20000000`)
        ],
        [Markup.button.callback('🔙 Orqaga', `back_to_category_${category}`)]
      ])
    }
  );
});

bot.action(/^do_search_(.+)_(\d+)$/, async (ctx) => {
  const category = ctx.match[1];
  const maxPrice = parseInt(ctx.match[2]);
  
  await ctx.answerCbQuery();
  const loadingMsg = await ctx.reply(`🔍 "${category}" bo'yicha OLXdan e'lonlar qidirilmoqda... ${maxPrice > 0 ? `(💰 Maksimal narx: ${maxPrice.toLocaleString('ru-RU')} so'm)` : ''}`);
  
  try {
    const items = await scrapeOLX(category, maxPrice > 0 ? maxPrice : null);
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
    if (items.length === 0) {
      return ctx.reply('Hech qanday natija topilmadi. Qidiruv so\'rovini o\'zgartirib ko\'ring.');
    }
    
    await ctx.reply(`✅ ${items.length} ta e'lon topildi. Eng yangilari:`);
    
    for (const item of items.slice(0, 7)) {
      try {
        await ctx.replyWithPhoto(
          { url: item.image },
          {
            caption: `📌 <b>${item.title}</b>\n💵 ${item.price}\n📍 ${item.location}\n🔗 <a href="${item.link}">OLXda ko'rish</a>`,
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.url('🔍 OLXda ko\'rish', item.link)]
            ])
          }
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.error('Xabar yuborishda xato:', e);
      }
    }
    
    await ctx.reply(
      '🔄 Boshqa amal tanlang:',
      {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📋 Ushbu kategoriyani kuzatish', `watch_${category}`)],
          [Markup.button.callback('🔙 Orqaga', `back_to_category_${category}`)]
        ])
      }
    );
  } catch (error) {
    console.error('Xatolik:', error);
    await ctx.deleteMessage(loadingMsg.message_id);
    ctx.reply('⚠️ Xatolik yuz berdi: ' + error.message);
  }
});

bot.action(/^watch_(.+)$/, async (ctx) => {
  const category = ctx.match[1];
  const userId = ctx.from.id.toString();
  
  // Foydalanuvchini ro'yxatga qo'shish
  if (!watchList.users[userId]) {
    watchList.users[userId] = [];
  }
  
  // Agar kategoriya allaqachon kuzatilmayotgan bo'lsa, qo'shish
  if (!watchList.users[userId].includes(category)) {
    watchList.users[userId].push(category);
    await saveData();
    
    await ctx.answerCbQuery(`✅ Siz ${category} kategoriyasiga obuna bo'ldingiz!`);
    await ctx.reply(
      `✅ *${category.toUpperCase()}* kategoriyasi kuzatuv ro'yxatiga qo'shildi!\n\nEndi yangi e'lonlar paydo bo'lganda avtomatik tarzda sizga xabar yuboriladi.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Orqaga', `back_to_category_${category}`)]
        ])
      }
    );
  } else {
    await ctx.answerCbQuery(`Siz allaqachon ${category} kategoriyasiga obuna bo'lgansiz!`);
    await ctx.reply(
      `ℹ️ Siz allaqachon *${category.toUpperCase()}* kategoriyasiga obuna bo'lgansiz.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Orqaga', `back_to_category_${category}`)]
        ])
      }
    );
  }
});

bot.action(/^unwatch_(.+)$/, async (ctx) => {
  const category = ctx.match[1];
  const userId = ctx.from.id.toString();
  
  if (watchList.users[userId] && watchList.users[userId].includes(category)) {
    watchList.users[userId] = watchList.users[userId].filter(cat => cat !== category);
    await saveData();
    
    await ctx.answerCbQuery(`❌ ${category} kategoriyasiga obuna bekor qilindi`);
    await ctx.reply(
      `❌ *${category.toUpperCase()}* kategoriyasiga obuna bekor qilindi.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Orqaga', `back_to_category_${category}`)]
        ])
      }
    );
  } else {
    await ctx.answerCbQuery(`Siz ${category} kategoriyasiga obuna bo'lmagansiz`);
    await ctx.reply(
      `ℹ️ Siz *${category.toUpperCase()}* kategoriyasiga obuna bo'lmagansiz.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Orqaga', `back_to_category_${category}`)]
        ])
      }
    );
  }
});

bot.action(/^back_to_category_(.+)$/, async (ctx) => {
  const category = ctx.match[1];
  await ctx.answerCbQuery();
  
  await ctx.reply(
    `🔄 *${category.toUpperCase()} bo'limi*\n\nUshbu bo'limda ${category} bo'yicha qidiruv va yangi e'lonlarni kuzatish mumkin.`,
    {
      parse_mode: 'Markdown',
      ...getCategoryMenu(category)
    }
  );
});

bot.action('back_to_main', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('🏠 Asosiy menu:', getMainMenu());
});

bot.action('settings_notifications', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '⏱ *Xabarlar vaqti*\n\nYangi e\'lonlar haqidagi xabarlar har 30 daqiqada tekshiriladi.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Orqaga', 'back_to_settings')]
      ])
    }
  );
});

bot.action('settings_reset', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (watchList.users[userId] && watchList.users[userId].length > 0) {
    watchList.users[userId] = [];
    await saveData();
    
    await ctx.answerCbQuery('✅ Barcha kuzatuvlar bekor qilindi');
    await ctx.reply(
      '✅ *Barcha kuzatuvlar bekor qilindi*\n\nEndi sizga yangi e\'lonlar haqida xabarlar yuborilmaydi.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Orqaga', 'back_to_settings')]
        ])
      }
    );
  } else {
    await ctx.answerCbQuery('Siz hech qanday kategoriyaga obuna bo\'lmagansiz');
    await ctx.reply(
      'ℹ️ *Siz hech qanday kategoriyaga obuna bo\'lmagansiz.*',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Orqaga', 'back_to_settings')]
        ])
      }
    );
  }
});

bot.action('back_to_settings', async (ctx) => {
  await ctx.answerCbQuery();
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

// Bot qidiruv komandasi
bot.command('search', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length === 0) {
    return ctx.reply('Iltimos, qidiruv so\'rovini kiriting. Misol: /search iphone 13 5000000');
  }

  const maxPrice = args.length > 1 && !isNaN(args[args.length - 1]) ? parseInt(args.pop()) : null;
  const searchQuery = args.join(' ');

  try {
    const loadingMsg = await ctx.reply(`🔍 "${searchQuery}" bo'yicha OLXdan e'lonlar qidirilmoqda... ${maxPrice ? `(💰 Maksimal narx: ${maxPrice.toLocaleString('ru-RU')} so'm)` : ''}`);
    
    const items = await scrapeOLX(searchQuery, maxPrice);
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
    if (items.length === 0) {
      return ctx.reply('Hech qanday natija topilmadi. Qidiruv so\'rovini o\'zgartirib ko\'ring.');
    }

    await ctx.reply(`✅ ${items.length} ta e'lon topildi. Eng yangilari:`);

    for (const item of items.slice(0, 7)) {
      try {
        await ctx.replyWithPhoto(
          { url: item.image },
          {
            caption: `📌 <b>${item.title}</b>\n💵 ${item.price}\n📍 ${item.location}\n🔗 <a href="${item.link}">OLXda ko'rish</a>`,
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.url('🔍 OLXda ko\'rish', item.link)]
            ])
          }
        );
        await new Promise(resolve => setTimeout(resolve, 1000)); // Spamdan qochish
      } catch (e) {
        console.error('Xabar yuborishda xato:', e);
      }
    }
  } catch (error) {
    console.error('Xatolik:', error);
    ctx.reply('⚠️ Xatolik yuz berdi: ' + error.message);
  }
});

// Cron job - har 30 daqiqada yangi e'lonlarni tekshirish
cron.schedule('* * * * *', async () => {
  console.log('Yangi e\'lonlar tekshirilmoqda...');
  
  // Barcha kategoriyalarni tekshirish
  await checkNewAds('kvartira');
  await new Promise(resolve => setTimeout(resolve, 10000)); // Serverga yuklama tushmasligi uchun kutish
  
  await checkNewAds('macbook air');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  await checkNewAds('iphone');
});

// Ma'lumotlarni yuklash va botni ishga tushirish
async function startBot() {
  await loadData();
  
  // Botni ishga tushirish
  bot.launch()
    .then(() => console.log('Bot ishga tushdi...'))
    .catch(err => console.error('Botni ishga tushirishda xato:', err));
  
  // Dastur ishga tushganda barcha kategoriyalar uchun dastlabki ma'lumotlarni olish
  try {
    console.log('Dastlabki ma\'lumotlar yig\'ilmoqda...');
    watchList.lastAds['kvartira'] = await scrapeOLX('kvartira');
    watchList.lastAds['macbook air'] = await scrapeOLX('macbook air');
    watchList.lastAds['iphone'] = await scrapeOLX('iphone');
    await saveData();
    console.log('Dastlabki ma\'lumotlar saqlandi');
  } catch (error) {
    console.error('Dastlabki ma\'lumotlarni yig\'ishda xatolik:', error);
  }
}

// To'xtatish signallarini qo'llash
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Botni ishga tushirish
startBot();