# Dockerfile para backend Node.js + Prisma
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install
COPY . .

RUN npm run build
# Genera el cliente de Prisma si existe
RUN if [ -f ./prisma/schema.prisma ]; then npx prisma generate; fi

EXPOSE 3000
CMD ["npm", "start"]
