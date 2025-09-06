# Multi-stage Dockerfile for Next.js (Node 20 + npm)
# 1) deps: install all deps for build (uses npm ci when package-lock.json is present)
# 2) builder: build the Next.js app
# 3) prod-deps: install only production deps
# 4) runner: run the built app with a minimal image

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
# Improve compatibility for some native/optional deps
RUN apk add --no-cache libc6-compat

# Only copy lockfiles and manifest for better layer caching
COPY package.json package-lock.json ./
# Install full deps for building
RUN npm ci

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Re-use installed deps from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the source
COPY . .
# Build the app
RUN npm run build

# ---------- prod-deps ----------
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install only production deps to keep runtime image small
RUN npm ci --omit=dev

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Bind to all interfaces in Docker and set default port
ENV HOST=0.0.0.0
ENV PORT=3000

# Create non-root user and group; use the pre-existing node user for simplicity
USER node

# Copy required runtime artifacts
COPY --chown=node:node --from=builder /app/.next ./.next
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/next.config.mjs ./next.config.mjs
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules

EXPOSE 3000
# Use explicit host + port to ensure accessibility from the host
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]

