# Stage 1: Build Next.js
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p /app/public

# Stage 2: Production
FROM node:20-slim
WORKDIR /app

# Install Python for the backend
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy built Next.js app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/tailwind.config.ts ./
COPY --from=builder /app/postcss.config.js ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public

# Copy backend
COPY backend/ ./backend/
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r backend/requirements.txt

# Copy startup script
COPY scripts/start-cloud-run.sh ./start.sh
RUN chmod +x start.sh

# Cloud Run sets PORT env var (default 8080)
ENV NODE_ENV=production
EXPOSE 8080

CMD ["./start.sh"]
