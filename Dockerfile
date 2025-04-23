# 1. Rasm asosida boshlaymiz - Node.js rasm
FROM node:20-slim

# 2. Ishchi katalog yaratamiz
WORKDIR /app

# 3. package*.json fayllarni nusxalaymiz
COPY package*.json ./

# 4. Bog'liqliklarni o'rnatamiz
RUN npm install

# 5. Boshqa fayllarni konteynerga nusxalaymiz
COPY . .

# 6. TypeScript kodini build qilamiz
RUN npm run build

# 7. Port ochamiz (agar kerak bo‘lsa)
# EXPOSE 3000

# 8. Botni ishga tushiramiz
CMD ["node", "dist/index.js"]
