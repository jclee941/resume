FROM mcr.microsoft.com/playwright:v1.58.2-noble

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3-pip \
        python3-venv \
        python-is-python3 \
        locales \
        tzdata \
        curl \
        ca-certificates \
    && locale-gen ko_KR.UTF-8 en_US.UTF-8 \
    && ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime \
    && echo Asia/Seoul > /etc/timezone \
    && python3 -m pip install --no-cache-dir --break-system-packages cloakbrowser \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NODE_ENV=production \
    CLOAK_BROWSER_HEADLESS=false \
    HOST=0.0.0.0 \
    DASHBOARD_PORT=3456 \
    STEALTH_BROWSER_ENDPOINT=http://stealth-browser:8080 \
    WANTED_PROFILE_DIR=/app/profiles/wanted \
    TZ=Asia/Seoul \
    LANG=ko_KR.UTF-8 \
    LANGUAGE=ko_KR:ko \
    LC_ALL=ko_KR.UTF-8

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/portfolio/package.json ./apps/portfolio/package.json
COPY apps/job-server/package.json ./apps/job-server/package.json
COPY apps/job-dashboard/package.json ./apps/job-dashboard/package.json
COPY packages/cli/package.json ./packages/cli/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/data/package.json ./packages/data/package.json
COPY packages/env/package.json ./packages/env/package.json
COPY packages/schemas/package.json ./packages/schemas/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/types/package.json ./packages/types/package.json

# npm still runs workspace `prepare` hooks under --ignore-scripts, and the
# @resume/schemas hook needs esbuild (a devDependency). The image ships the
# committed packages/schemas/dist/index.cjs instead.
RUN npm pkg delete scripts.prepare --workspace @resume/schemas \
  && npm ci --omit=dev --ignore-scripts --workspace @resume/shared --workspace @resume/job-automation

COPY apps/job-server ./apps/job-server
COPY packages/shared ./packages/shared
COPY packages/schemas ./packages/schemas
COPY packages/types ./packages/types
COPY packages/data ./packages/data
COPY packages/env ./packages/env

RUN mkdir -p /app/profiles/wanted /app/apps/job-server/.data

EXPOSE 3456

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -fsS http://localhost:3456/health || exit 1

CMD ["npm", "run", "server", "--workspace", "@resume/job-automation"]
