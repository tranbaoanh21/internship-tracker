FROM node:26-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev --workspace backend

FROM node:26-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies /app/node_modules node_modules
COPY backend/package.json backend/package.json
COPY backend/src backend/src
COPY backend/scripts backend/scripts
COPY backend/openapi.json backend/openapi.json
COPY database database

RUN rm -rf \
      /usr/local/lib/node_modules/npm \
      /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/bin/corepack \
    && chown -R node:node /app

USER node
EXPOSE 3000

CMD ["node", "backend/scripts/start.js"]
