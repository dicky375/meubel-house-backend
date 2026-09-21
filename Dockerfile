# ─── Stage 1: Build ───────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

# Copy source and build
COPY src ./src
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# ─── Stage 2: Runtime ─────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy knexfile (needed for runtime migrations)
COPY --from=builder --chown=nodejs:nodejs /app/src/config ./dist/config
COPY --from=builder --chown=nodejs:nodejs /app/src/migrations ./dist/migrations
COPY --from=builder --chown=nodejs:nodejs /app/src/seeds ./dist/seeds

# Switch to non-root user
USER nodejs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/server.js"]
