# ------------------------------------------------------------
# BACKEND DOCKERFILE
# Multi-stage Dockerfile for Node.js backend application
# ------------------------------------------------------------

# ---------- STAGE 1: Builder ----------
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .
RUN npm run build || true


# ---------- STAGE 2: Runtime ----------
FROM node:18-alpine
WORKDIR /app

# Copy built app and node_modules from builder
COPY --from=builder /app ./

EXPOSE 5000

# Start backend server
CMD ["node", "src/server.js"]
