FROM node:20-alpine AS builder

WORKDIR /app/typescript/job-automation

COPY typescript/job-automation/package*.json ./
RUN npm ci

COPY typescript/job-automation/ ./
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app/typescript/job-automation
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/typescript/job-automation/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/typescript/job-automation/ ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server/index.js"]
