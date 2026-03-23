FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
RUN npm install --workspace=apps/web --workspace=packages/shared
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build --workspace=packages/shared
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build --workspace=apps/web

FROM node:20-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED 1
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
