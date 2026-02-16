# Dockerfile for Policy-Driven Data Governance Platform
# Node.js backend with OPA/Rego policy evaluation, data contracts, and audit trails

FROM node:18-alpine AS builder

WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ src/
COPY public/ public/
COPY opa-policies/ opa-policies/

# Production stage - lightweight runtime image
FROM node:18-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/generated && \
    chown -R appuser:appuser /app

# Copy from builder stage
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appuser /app/package.json ./
COPY --from=builder --chown=appuser:appuser /app/src ./src
COPY --from=builder --chown=appuser:appuser /app/public ./public
COPY --from=builder --chown=appuser:appuser /app/opa-policies ./opa-policies

# Create directories for generated content
RUN mkdir -p /app/generated /app/logs && chown -R appuser:appuser /app


# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "src/server.js"]
