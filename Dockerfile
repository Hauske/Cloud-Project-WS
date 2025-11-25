# Dockerfile para backend Node.js + Prisma
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --production
COPY . .

# Genera el cliente de Prisma si existe
RUN if [ -f ./prisma/schema.prisma ]; then npx prisma generate; fi

EXPOSE 3000
CMD ["node", "./node_modules/ts-node/dist/bin.js", "src/index.ts"]