FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run check && npm test && npm run test:rooms && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
ENV HOST=0.0.0.0 PORT=8787 STATIC_DIR=/app/dist TRUST_PROXY=1
USER node
EXPOSE 8787
CMD ["node", "server/rooms.mjs"]
