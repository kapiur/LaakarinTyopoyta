FROM node:18-alpine
# Устанавливаем необходимые системные библиотеки
RUN apk add --no-cache openssl

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем библиотеки
RUN npm install

# Копируем весь проект
COPY . .

# Генерируем клиент Prisma с учетом архитектуры
RUN npx prisma generate

# Собираем проект
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
