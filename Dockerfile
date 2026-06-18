# syntax=docker/dockerfile:1

FROM node:22-slim

# System deps: mdbtools (reads Access .mdb/.accdb) + sqlite3 CLI (writes output).
RUN apt-get update \
    && apt-get install -y --no-install-recommends mdbtools sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm via corepack.
RUN corepack enable

WORKDIR /app

# Install deps first for layer caching.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# App source.
COPY server.js ./
COPY public ./public

ENV PORT=5014
ENV NODE_ENV=production
EXPOSE 5014

CMD ["node", "server.js"]
