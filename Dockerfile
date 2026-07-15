# Stage 1: Build
FROM oven/bun:1.1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Stage 2: Runner
FROM oven/bun:1.1-slim
WORKDIR /app

# Copy the built output
COPY --from=builder /app/.output /app/.output

# Expose port and configure environment
EXPOSE 8080
ENV PORT=8080

CMD ["bun", ".output/server/index.mjs"]
