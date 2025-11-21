FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files from project root
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./backend/

# Create uploads directory
RUN mkdir -p backend/uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["node", "backend/src/server.js"]
