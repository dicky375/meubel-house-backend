# ─── Stage 1: Build ─────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev for TypeScript compilation)
RUN npm ci

# Copy source code
COPY src ./src
COPY .knexrc.json ./

# Build TypeScript → JavaScript
RUN npm run build

# ─── Stage 2: Production ────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Copy knex configuration and migrations (needed for startup)
COPY --from=builder /app/src/config ./dist/config
COPY --from=builder /app/src/migrations ./dist/migrations
COPY --from=builder /app/src/seeds ./dist/seeds

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port (Render uses PORT env var)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the app
CMD ["node", "dist/server.js"]