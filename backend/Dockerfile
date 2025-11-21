FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY ../package*.json ./

# Install production dependencies only
# Note: We exclude better-sqlite3 since we'll use MySQL in production
RUN npm ci --only=production

# Copy backend source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["node", "src/server.js"]
