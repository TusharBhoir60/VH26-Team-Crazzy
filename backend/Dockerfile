# Build Stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy built files from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 8080

# Set Node environment to production
ENV NODE_ENV=production

# Start the application using the compiled JavaScript
CMD ["node", "dist/server.js"]
