# ==============================================================================
# A11y ICT Wizard - Development Dockerfile
# ==============================================================================
# This Dockerfile is optimized for local development with Docker Compose
# For production deployments, use the Azure-specific container configuration
# ==============================================================================

FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies
# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose application port (matches PORT in .env)
EXPOSE 3001

# Start the application
CMD ["node", "./bin/www"]
