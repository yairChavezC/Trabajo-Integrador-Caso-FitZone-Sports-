# Etapa 1: Build de la aplicación Vite/React
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite incrusta VITE_API_URL en el bundle al momento de compilar
ARG VITE_API_URL=http://localhost:3000/api/
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Etapa 2: Servidor web de producción
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]