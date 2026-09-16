# Development stage
FROM node:20-alpine AS development

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Generate prisma client
RUN npx prisma generate

CMD ["npm", "run", "start:dev"]

# Build stage
FROM node:20-alpine AS build

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

COPY package*.json ./
COPY --from=development /usr/src/app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

COPY package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma

CMD ["node", "dist/main.js"]
