# Session Broker Deployment Checklist

## Pre-Deployment Requirements

### 1. Environment Variables Required

Create `.env` file in project root:

```bash
# Required for Session Broker
SESSION_ENCRYPTION_KEY=                    # Generate: openssl rand -hex 32
WANTED_EMAIL=your-email@example.com
WANTED_PASSWORD=your-wanted-password
JOB_SERVER_URL=http://localhost:3456
JOB_SERVER_ADMIN_TOKEN=                    # Generate: openssl rand -hex 32

# Optional - For Telegram Notifications
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Optional - For n8n Webhook
N8N_WEBHOOK_URL=https://n8n.jclee.me/webhook/session-broker
```

### 2. Generate Encryption Keys

```bash
# Generate 64-character hex key (32 bytes)
export SESSION_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Generate admin token
export JOB_SERVER_ADMIN_TOKEN=$(openssl rand -hex 32)
```

### 3. Verify Docker & Docker Compose

```bash
docker --version
docker compose version
```

### 4. Deployment Steps

```bash
# 1. Navigate to docker directory
cd infrastructure/docker

# 2. Create environment file
cat > .env << EOF
SESSION_ENCRYPTION_KEY=${SESSION_ENCRYPTION_KEY}
WANTED_EMAIL=${WANTED_EMAIL}
WANTED_PASSWORD=${WANTED_PASSWORD}
JOB_SERVER_URL=http://localhost:3456
JOB_SERVER_ADMIN_TOKEN=${JOB_SERVER_ADMIN_TOKEN}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-}
EOF

# 3. Build and start containers
docker compose -f docker-compose.session-broker.yml up -d --build

# 4. Wait for health checks
echo "Waiting for services to be healthy..."
sleep 30

# 5. Verify deployment
curl -s http://localhost:3456/api/session/health | jq

# 6. Run E2E verification
cd ../../apps/job-server/src/session-broker/scripts
go run . --verify-e2e
```

### 5. Post-Deployment Verification

Check all services are running:

```bash
# Check containers
docker ps | grep session-broker

# Check health
curl http://localhost:3456/api/session/health

# Check logs
docker logs session-broker --tail 50
docker logs session-broker-stealth-browser --tail 50

# Test session status
curl -H "Authorization: Bearer ${JOB_SERVER_ADMIN_TOKEN}" \
  http://localhost:3456/api/session/wanted/status
```

### 6. n8n Workflow Configuration

Import updated workflows:

1. Open https://n8n.jclee.me
2. Import `infrastructure/n8n/session-renewal-workflow.json`
3. Import `infrastructure/n8n/job-auto-apply-workflow.json`
4. Set environment variables in n8n:
   - `JOB_SERVER_URL`
   - `JOB_SERVER_ADMIN_TOKEN`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

### 7. Monitoring Setup

Add to Grafana dashboard:

- Session Broker health endpoint
- Session renewal success/failure rates
- Stealth browser availability

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs session-broker

# Check environment variables
docker exec session-broker env | grep -E "(SESSION_|WANTED_|JOB_SERVER)"

# Restart services
docker compose -f docker-compose.session-broker.yml restart
```

### Session Renewal Fails

```bash
# Check stealth browser health
curl http://localhost:8080/health

# Check Wanted credentials
docker exec session-broker node -e "console.log(process.env.WANTED_EMAIL)"

# Manually test login flow
cd apps/job-server/src/session-broker/scripts
go run setup-server.go
```

### API Authentication Errors

```bash
# Verify token
curl -H "Authorization: Bearer ${JOB_SERVER_ADMIN_TOKEN}" \
  http://localhost:3456/api/session/health

# Check token in container
docker exec session-broker node -e "console.log(process.env.JOB_SERVER_ADMIN_TOKEN ? 'Set' : 'Missing')"
```

## Rollback Procedure

If deployment fails:

```bash
# Stop containers
docker compose -f docker-compose.session-broker.yml down

# Remove volumes (WARNING: Deletes persistent data)
docker compose -f docker-compose.session-broker.yml down -v

# Check old workflow still works
# Revert to previous n8n workflow version
```

## Security Notes

- Never commit `.env` file to git
- Rotate encryption keys every 90 days
- Use 1Password for credential storage
- Monitor access logs for unauthorized API calls
- Session data encrypted at rest with AES-256-GCM

---

**Last Updated**: 2026-04-07
**Status**: Ready for deployment
