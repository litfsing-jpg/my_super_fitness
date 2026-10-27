FROM node:22.23.1-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --chown=node:node server ./server
COPY --chown=node:node client ./client
COPY --chown=node:node assets ./assets
COPY --chown=node:node brand.config.json ./
RUN mkdir -p content/live content/media && chown -R node:node content
USER node
EXPOSE 4210
CMD ["node","server/start.mjs"]
