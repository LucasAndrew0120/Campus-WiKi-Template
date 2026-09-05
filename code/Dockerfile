FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends libexpat1 libnspr4 libnss3 \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data/xlsx-cache \
  && chown node:node /data/xlsx-cache

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY document-urls.mjs qutwiki-sync.mjs server.mjs xlsx-sync.mjs ./

ENV NODE_ENV=production \
  HOME=/tmp \
  CACHE_DIR=/data/xlsx-cache

USER node
EXPOSE 3456
CMD ["node", "server.mjs"]
