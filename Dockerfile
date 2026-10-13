FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
COPY server/package.json server/
COPY client/package.json client/
RUN bun install --frozen-lockfile

COPY . .

# Client API types are generated from the server handlers, not committed
RUN bun run gen

# Read by next.config.ts at build time to proxy /cqrs/* to the in-container API
ENV API_PROXY_URL=http://127.0.0.1:8000

# Empty API URL: the client calls same-origin /cqrs/*, which Next proxies
RUN cd client && NEXT_PUBLIC_API_URL="" bun --bun next build

ENV NODE_ENV=production \
    PORT=8000

EXPOSE 3000

CMD ["sh", "start.sh"]
