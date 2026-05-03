FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production
ENV LOG_ENABLED=false

# Start the server
CMD ["npm", "run", "start"]
