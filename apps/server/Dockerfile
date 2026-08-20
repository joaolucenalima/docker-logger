FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile && bun run --cwd apps/server build
EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/server", "start"]
