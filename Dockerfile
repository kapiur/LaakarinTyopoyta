FROM node:18-alpine
WORKDIR /app

# Сначала копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем все библиотеки
RUN npm install

# Копируем всё остальное (включая папку prisma со схемой)
COPY . .

# Генерируем клиент Prisma
RUN npx prisma generate

# Собираем проект
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
