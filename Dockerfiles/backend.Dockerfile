# ------------------------------------------------------------
# BACKEND DOCKERFILE
# Multi-stage Dockerfile for Node.js backend application.
# First stage builds dependencies, second stage runs production.
# ------------------------------------------------------------

# ---------- STAGE 1: Builder ----------
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm ci

# Copy source code and build (if build script exists)
COPY . .
RUN npm run build || true    # || true prevents failure if build script doesn't exist

# ---------- STAGE 2: Runtime ----------
FROM node:18-alpine
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app ./

EXPOSE 5000

# Start backend server
CMD ["node", "src/server.js"]
