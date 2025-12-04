# Multi-stage build for optimized production image

# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Stage 2: Dependencies
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 3: Development dependencies (for building)
FROM base AS dev-dependencies
COPY package*.json ./
RUN npm ci

# Stage 4: Build (if needed)
FROM dev-dependencies AS build
COPY . .
# Si tuvieras un proceso de build, iría aquí
# RUN npm run build

# Stage 5: Production
FROM base AS production

# Crear usuario no-root para mayor seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar dependencias de producción
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar código fuente
COPY --chown=nodejs:nodejs . .

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Cambiar a usuario no-root
USER nodejs

# Comando de inicio
CMD ["node", "src/index.js"]
