FROM node:22-alpine AS builder

WORKDIR /app/job-server

COPY apps/job-server/package*.json ./
RUN npm ci

COPY apps/job-server/ ./
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app/job-server
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/job-server/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/job-server/ ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server/index.js"]
