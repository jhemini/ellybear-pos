# ─── Development ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn db:generate
EXPOSE 4000
CMD ["yarn", "dev"]

# ─── Build ────────────────────────────────────────────────────────────────────
FROM development AS builder
RUN yarn build

# ─── Production ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN yarn db:generate
EXPOSE 4000
CMD ["node", "dist/main"]
