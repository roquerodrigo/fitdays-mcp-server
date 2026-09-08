FROM --platform=$BUILDPLATFORM node:26-slim AS build

WORKDIR /build

COPY package.json package-lock.json tsconfig.json ./
COPY src ./src

RUN npm ci && mkdir pack && npm pack --pack-destination pack

FROM node:26-slim

ENV NODE_ENV=production

RUN --mount=type=bind,from=build,source=/build/pack,target=/pack \
    npm install -g --omit=dev /pack/*.tgz supergateway@3.4.3 \
    && npm cache clean --force

USER node

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD ["node", "-e", "require('http').get('http://127.0.0.1:8000/healthz', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"]

# The gateway must be stateful: the stateless mode spawns one server child per POST and only reaps
# it from `transport.onclose`, which never fires for a plain request/response exchange, so every tool
# call would leak a child. Stateful keeps one child per session and --sessionTimeout reaps the
# sessions whose client goes away without terminating the transport.
CMD ["supergateway", "--stdio", "fitdays-mcp-server", "--port", "8000", "--host", "0.0.0.0", "--cors", "--outputTransport", "streamableHttp", "--streamableHttpPath", "/mcp", "--healthEndpoint", "/healthz", "--stateful", "--sessionTimeout", "300000"]
