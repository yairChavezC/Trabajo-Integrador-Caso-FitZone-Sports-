FROM node:24-alpine

WORKDIR /app

# Instalar dependencias de producción usando el lockfile
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar código fuente y documentación OpenAPI
COPY src ./src
COPY swagger.json ./swagger.json

EXPOSE 3000

CMD ["node", "src/index.js"]