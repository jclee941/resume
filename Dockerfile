# Multi-stage build for the monorepo job-server runtime.
# Stages:
#   deps    — install all workspace deps using the root lockfile
#   runtime — minimal image with prod node_modules + job-server source + its
#             internal workspace dependencies (@resume/{shared,schemas,types,
#             data,env})

FROM node:22-alpine AS deps

WORKDIR /app

# Workspace metadata must be copied before `npm ci` so that npm can resolve
# the workspace graph from the root lockfile.
COPY package.json package-lock.json ./
COPY apps/portfolio/package.json apps/portfolio/package.json
COPY apps/job-server/package.json apps/job-server/package.json
COPY apps/job-dashboard/package.json apps/job-dashboard/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/data/package.json packages/data/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/types/package.json packages/types/package.json

RUN npm ci --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Workspace source — only what job-server needs at runtime.
COPY packages/shared packages/shared
COPY packages/schemas packages/schemas
COPY packages/types packages/types
COPY packages/data packages/data
COPY packages/env packages/env
COPY apps/job-server apps/job-server

WORKDIR /app/apps/job-server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server/index.js"]
