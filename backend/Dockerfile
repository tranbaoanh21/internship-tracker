FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev --workspace backend

COPY backend/src backend/src
COPY backend/scripts backend/scripts
COPY backend/openapi.json backend/openapi.json
COPY database database

RUN chown -R node:node /app
USER node
EXPOSE 3000

CMD ["node", "backend/scripts/start.js"]
