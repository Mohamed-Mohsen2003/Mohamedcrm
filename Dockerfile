# syntax=docker/dockerfile:1.7
# Multi-stage build producing a small, non-root Next.js standalone image.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nexora && adduser -S nexora -G nexora
COPY --from=builder --chown=nexora:nexora /app/public ./public
COPY --from=builder --chown=nexora:nexora /app/.next/standalone ./
COPY --from=builder --chown=nexora:nexora /app/.next/static ./.next/static
COPY --from=builder --chown=nexora:nexora /app/drizzle ./drizzle
RUN mkdir -p .data && chown nexora:nexora .data
USER nexora
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
