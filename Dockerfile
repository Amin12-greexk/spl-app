FROM node:20-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN npm ci


FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

ARG SANITY_PROJECT_ID
ARG SANITY_DATASET
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_FIREBASE_VAPID_KEY
ARG ENABLE_AUTO_OVERTIME
ARG ENABLE_MANUAL_OVERTIME

ENV NODE_ENV=production \
  DATABASE_URL=postgresql://build:build@localhost:5432/builddb?schema=public \
  NEXTAUTH_URL=http://localhost:3000 \
  NEXTAUTH_SECRET=build-only-secret-change-at-runtime \
  MOBILE_JWT_SECRET=build-only-secret-change-at-runtime \
  CRON_SECRET=build-only-secret-change-at-runtime \
  SANITY_PROJECT_ID=$SANITY_PROJECT_ID \
  SANITY_DATASET=$SANITY_DATASET \
  FIREBASE_ADMIN_PROJECT_ID=build-placeholder \
  FIREBASE_ADMIN_PRIVATE_KEY=build-placeholder \
  FIREBASE_ADMIN_CLIENT_EMAIL=build@example.com \
  NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID \
  NEXT_PUBLIC_FIREBASE_VAPID_KEY=$NEXT_PUBLIC_FIREBASE_VAPID_KEY \
  ENABLE_AUTO_OVERTIME=$ENABLE_AUTO_OVERTIME \
  ENABLE_MANUAL_OVERTIME=$ENABLE_MANUAL_OVERTIME

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


FROM node:20-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "server.js"]