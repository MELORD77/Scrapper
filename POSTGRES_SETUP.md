# PostgreSQL O'rnatish va Migratsiya Qo'llanmasi

## 📋 Talab qilingan narsalar

1. **PostgreSQL** o'rnatilgan bo'lishi kerak (localhost yoki remote server)
2. **Node.js 20+** va **npm**

---

## 🚀 1-Qadam: PostgreSQL Sozlash

### Windows uchun:

1. PostgreSQL yuklab oling: https://www.postgresql.org/download/windows/
2. O'rnatish jarayonida parolni eslang (keyinchalik kerak bo'ladi)
3. Port: `5432` (default)

### pgAdmin orqali database yaratish:

1. pgAdmin-ni oching
2. Servers → PostgreSQL → Databases → o'ng tugma → Create → Database
3. Database name: `olx_bot`
4. Save

### Yoki SQL orqali:

```sql
CREATE DATABASE olx_bot;
```

---

## ⚙️ 2-Qadam: .env Faylini Sozlash

`.env` faylida PostgreSQL sozlamalarini to'g'rilang:

```env
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=olx_bot
DB_USER=postgres
DB_PASSWORD=sizning_postgres_parolingiz
```

**MUHIM:** `DB_PASSWORD` ni o'z PostgreSQL parolingiz bilan almashtiring!

---

## 📦 3-Qadam: Ma'lumotlarni Migratsiya Qilish

Eski JSON faylidagi ma'lumotlarni PostgreSQL ga ko'chirish:

```bash
npm run migrate
```

Bu script quyidagilarni bajaradi:
- ✅ PostgreSQL bilan bog'lanadi
- ✅ Jadvallarni yaratadi (users, categories, ads, user_subscriptions)
- ✅ `watched_items.json` dan barcha ma'lumotlarni PostgreSQL ga ko'chiradi
- ✅ Migratsiya natijasini ko'rsatadi

**Kutilgan natija:**
```
🚀 Starting migration from JSON to PostgreSQL...
📡 Testing database connection...
✅ PostgreSQL connected successfully at ...
📋 Initializing database schema...
✅ Database initialized successfully
📂 Reading JSON file...
✅ Found 1 users in JSON file
👥 Migrating users and subscriptions...
✅ Migrated 1 users and 1 subscriptions
📰 Migrating ads...
  Processing kvartira: 800 ads...
✅ Migrated 800 ads
🔍 Verifying migration...
  Users in DB: 1
  Subscriptions in DB: 1
  Ads in DB: 800
✅ Migration completed successfully! 🎉
```

---

## 🎯 4-Qadam: Botni Ishga Tushirish

Migration muvaffaqiyatli tugagandan keyin, botni ishga tushiring:

```bash
npm start
```

**Kutilgan natija:**
```
🔌 Connecting to PostgreSQL...
✅ PostgreSQL connected successfully at ...
📋 Initializing database...
✅ Database initialized successfully
✅ Using PostgreSQL storage - no file loading needed
✅ Bot is running...
```

---

## 📊 PostgreSQL Strukturasi

### Jadvallar:

1. **users** - Telegram foydalanuvchilari
   - id (Telegram user ID)
   - username
   - first_name
   - created_at, updated_at

2. **categories** - E'lon kategoriyalari
   - id
   - name ('kvartira', 'macbook air', 'iphone')

3. **user_subscriptions** - Foydalanuvchi obunalari
   - id
   - user_id (foreign key → users)
   - category_id (foreign key → categories)

4. **ads** - OLX e'lonlari
   - id (OLX ad ID)
   - category_id
   - title, price, location, link, image
   - created_at (OLX vaqti)
   - scraped_at (bizning vaqtimiz)

---

## 🔍 Ma'lumotlarni Ko'rish

### pgAdmin orqali:

1. pgAdmin oching
2. Servers → PostgreSQL → Databases → olx_bot → Schemas → public → Tables
3. Har bir jadvalga o'ng tugma → View/Edit Data → All Rows

### SQL orqali:

```sql
-- Barcha foydalanuvchilar
SELECT * FROM users;

-- Barcha obunalar
SELECT u.id, u.username, c.name
FROM users u
JOIN user_subscriptions us ON u.id = us.user_id
JOIN categories c ON us.category_id = c.id;

-- Eng yangi e'lonlar
SELECT title, price, created_at
FROM ads
WHERE category_id = (SELECT id FROM categories WHERE name = 'kvartira')
ORDER BY scraped_at DESC
LIMIT 10;

-- Statistika
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM user_subscriptions) as total_subscriptions,
    (SELECT COUNT(*) FROM ads) as total_ads;
```

---

## 🆚 JSON vs PostgreSQL

### Eski usul (JSON):
- ❌ Katta fayllar (3000+ qator)
- ❌ Ko'p foydalanuvchilar uchun sekin
- ❌ Concurrent access yo'q
- ❌ Data integrity kafolatlanmagan

### Yangi usul (PostgreSQL):
- ✅ Tez va samarali
- ✅ Ko'p foydalanuvchilar uchun optimallashtirilgan
- ✅ ACID transactions
- ✅ Foreign keys va constraints
- ✅ Indexes (tez qidiruv)
- ✅ Backup va restore qulayligi

---

## 🔧 Troubleshooting

### Xato: "Failed to connect to PostgreSQL"
**Yechim:**
1. PostgreSQL serveri ishlab turibdimi? (Services → PostgreSQL)
2. `.env` faylidagi parol to'g'rimi?
3. Port 5432 ochiqmi?

### Xato: "Database olx_bot does not exist"
**Yechim:**
```sql
CREATE DATABASE olx_bot;
```

### Xato: "authentication failed for user postgres"
**Yechim:**
- `.env` faylidagi `DB_PASSWORD` ni to'g'rilang
- PostgreSQL parolini reset qiling (kerak bo'lsa)

### Eski JSON faylga qaytish kerakmi?
**Yechim:**
1. `src/index.ts` da import ni o'zgartiring:
   ```typescript
   import { storageService } from './services/storage'; // JSON version
   ```
2. Database importlarni o'chiring
3. Bot restart qiling

---

## 📝 Qo'shimcha Ma'lumotlar

### Backup olish:
```bash
pg_dump -U postgres olx_bot > backup.sql
```

### Backup restore qilish:
```bash
psql -U postgres olx_bot < backup.sql
```

### Database tozalash (barcha ma'lumotlarni o'chirish):
```sql
TRUNCATE users, categories, user_subscriptions, ads RESTART IDENTITY CASCADE;
```

---

## ✅ Tayyor!

Endi sizning OLX Bot PostgreSQL bilan ishlaydi! 🎉

**Savol-javoblar:**
- Telegram bot ishlashi o'zgaradimi? ❌ Yo'q, huddi avvalgidek ishlaydi
- Migration qaytadan ishlatishim kerakmi? ❌ Yo'q, faqat bir marta
- JSON fayl kerakmi? ❌ Yo'q, lekin backup sifatida saqlang

**Keyingi qadamlar:**
- Cron jobs ni yoqing (notifications uchun)
- Monitoring qo'shing
- Production serverga deploy qiling
