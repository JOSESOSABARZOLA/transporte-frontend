# Frontend Dockerfile - Multi-stage build: Node (build) + Nginx (runtime)
# Stage 1: Build React application with Vite

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# URL base de la API en tiempo de construccion. Vacia por defecto: dentro de Docker
# el nginx de esta misma imagen hace de proxy y el httpClient agrega /api/v1.
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build React application with Vite
RUN npm run build

# Stage 2: Serve with Nginx
#
# IMAGEN NO PRIVILEGIADA. Es el caso 5 de M-30, y en la imagen oficial de nginx no se
# cumplia: el proceso maestro corre como root y solo los trabajadores bajan a `nginx`.
# Comprobado sobre el contenedor en marcha con `docker exec transporte-front id` -> uid=0.
#
# `nginxinc/nginx-unprivileged` es la misma nginx mantenida por el mismo equipo, con el
# maestro como uid 101. Funciona sin cambios porque el puerto es 5180: por encima de 1024,
# que es lo unico que exigiria privilegios.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled React app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 5180

# Comprobacion de salud.
# Se usa 127.0.0.1 y NO localhost: dentro de la imagen alpine, localhost resuelve a ::1
# y nginx solo escucha en IPv4 (listen 5180). Con localhost la comprobacion falla
# siempre con "Connection refused" aunque el servicio responda correctamente.
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:5180/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
