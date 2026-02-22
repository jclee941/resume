# Monitoring Setup Guide

Complete guide for setting up monitoring infrastructure for Resume Portfolio

**Target Environment**: Proxmox pve3 (192.168.50.100)
**Services**: Prometheus, Grafana, Loki, n8n
**Last Updated**: 2025-11-20

## 📋 Prerequisites

- Synology NAS with Docker support
- Docker and Docker Compose installed
- Domain name configured (jclee.me)
- SSL certificates (Let's Encrypt)
- Network access to ports: 9090 (Prometheus), 3000 (Grafana), 3100 (Loki), 5678 (n8n)

## 1. Prometheus Setup

### Directory Structure

```bash
/volume1/docker/prometheus/
├── prometheus.yml          # Main configuration
├── alerts.yml             # Alert rules
├── data/                  # Time-series database
└── docker-compose.yml     # Docker setup
```

### Configuration File

**File**: `/volume1/docker/prometheus/prometheus.yml`

```yaml
# Prometheus Configuration for Resume Portfolio Monitoring
global:
  scrape_interval: 30s
  evaluation_interval: 30s
  external_labels:
    cluster: 'home-lab'
    environment: 'production'

# Alertmanager configuration (optional)
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - 'alertmanager:9093'

# Load alert rules
rule_files:
  - '/etc/prometheus/alerts.yml'

# Scrape configurations
scrape_configs:
  # Resume Portfolio Worker
  - job_name: 'resume'
    scrape_interval: 30s
    scrape_timeout: 10s
    metrics_path: '/metrics'
    scheme: https
    static_configs:
      - targets:
          - 'resume.jclee.me:443'
        labels:
          service: 'resume-portfolio'
          environment: 'production'
          platform: 'cloudflare-workers'

  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets:
          - 'localhost:9090'

  # Node Exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets:
          - 'node-exporter:9100'
        labels:
          instance: 'synology-nas'

  # Add more services as needed
  # - job_name: 'grafana'
  #   static_configs:
  #     - targets:
  #         - 'grafana:3000'
```

### Alert Rules

**File**: `/volume1/docker/prometheus/alerts.yml`

```yaml
groups:
  - name: resume_alerts
    interval: 1m
    rules:
      # High error rate alert
      - alert: HighErrorRate
        expr: |
          (
            rate(http_requests_error{job="resume"}[5m]) /
            rate(http_requests_total{job="resume"}[5m])
          ) * 100 > 5
        for: 5m
        labels:
          severity: warning
          service: resume-portfolio
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanize }}% (threshold: 5%)"

      # Service down alert
      - alert: ServiceDown
        expr: up{job="resume"} == 0
        for: 2m
        labels:
          severity: critical
          service: resume-portfolio
        annotations:
          summary: "Resume portfolio is down"
          description: "The resume portfolio service has been down for more than 2 minutes"

      # Slow response time alert
      - alert: SlowResponseTime
        expr: http_response_time_seconds{job="resume"} > 0.5
        for: 5m
        labels:
          severity: warning
          service: resume-portfolio
        annotations:
          summary: "Slow response time detected"
          description: "Average response time is {{ $value }}s (threshold: 0.5s)"

      # Low request rate (possible issue)
      - alert: LowRequestRate
        expr: rate(http_requests_total{job="resume"}[10m]) < 0.01
        for: 10m
        labels:
          severity: info
          service: resume-portfolio
        annotations:
          summary: "Unusually low request rate"
          description: "Request rate is {{ $value | humanize }} req/s"
```

### Docker Compose

**File**: `/volume1/docker/prometheus/docker-compose.yml`

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    user: root
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./alerts.yml:/etc/prometheus/alerts.yml:ro
      - ./data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--typescript/portfolio-worker.console.libraries=/usr/share/prometheus/console_libraries'
      - '--typescript/portfolio-worker.console.templates=/usr/share/prometheus/consoles'
      - '--typescript/portfolio-worker.enable-lifecycle'
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
```

### Deployment

```bash
# Create directories
mkdir -p /volume1/docker/prometheus/data
chmod 777 /volume1/docker/prometheus/data

# Start Prometheus
cd /volume1/docker/prometheus
docker-compose up -d

# Check logs
docker logs -f prometheus

# Verify metrics
curl http://localhost:9090/api/v1/targets
```

### Verification

```bash
# Check if Prometheus is scraping resume metrics
curl -s "http://localhost:9090/api/v1/query?query=up{job=\"resume\"}" | jq '.'

# Expected output:
# {
#   "status": "success",
#   "data": {
#     "resultType": "vector",
#     "result": [
#       {
#         "metric": {
#           "job": "resume",
#           "instance": "resume.jclee.me:443"
#         },
#         "value": [1700000000, "1"]
#       }
#     ]
#   }
# }
```

## 2. Grafana Setup

### Directory Structure

```bash
/volume1/docker/grafana/
├── grafana.ini            # Main configuration
├── provisioning/
│   ├── datasources/
│   │   └── datasources.yml
│   └── dashboards/
│       ├── dashboards.yml
│       └── resume-portfolio.json
└── data/                  # Grafana database
```

### Configuration File

**File**: `/volume1/docker/grafana/grafana.ini`

```ini
[server]
protocol = http
http_addr = 0.0.0.0
http_port = 3000
domain = grafana.jclee.me
root_url = https://grafana.jclee.me

[security]
admin_user = admin
admin_password = CHANGE_ME_SECURE_PASSWORD
secret_key = CHANGE_ME_SECRET_KEY

[auth]
disable_login_form = false
disable_signout_menu = false

[auth.anonymous]
enabled = false

[users]
allow_sign_up = false
allow_org_create = false

[dashboards]
default_home_dashboard_path = /var/lib/grafana/dashboards/resume-portfolio.json
```

### Data Source Provisioning

**File**: `/volume1/docker/grafana/provisioning/datasources/datasources.yml`

```yaml
apiVersion: 1

datasources:
  # Prometheus data source
  - name: Prometheus
    type: prometheus
    uid: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: 30s
      queryTimeout: 60s
      httpMethod: POST

  # Loki data source
  - name: Loki
    type: loki
    uid: loki
    access: proxy
    url: http://loki:3100
    editable: false
    jsonData:
      maxLines: 1000
      timeout: 60s
```

### Dashboard Provisioning

**File**: `/volume1/docker/grafana/provisioning/dashboards/dashboards.yml`

```yaml
apiVersion: 1

providers:
  - name: 'Resume Portfolio'
    orgId: 1
    folder: 'Resume'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

**Copy Dashboard**:
```bash
cp /home/jclee/dev/resume/monitoring/grafana-dashboard-resume-portfolio.json \
   /volume1/docker/grafana/provisioning/dashboards/
```

### Docker Compose

**File**: `/volume1/docker/grafana/docker-compose.yml`

```yaml
version: '3.8'

services:
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    user: root
    ports:
      - "3000:3000"
    volumes:
      - ./grafana.ini:/etc/grafana/grafana.ini:ro
      - ./provisioning:/etc/grafana/provisioning:ro
      - ./data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=CHANGE_ME
      - GF_INSTALL_PLUGINS=
    networks:
      - monitoring

networks:
  monitoring:
    external: true
```

### Deployment

```bash
# Create directories
mkdir -p /volume1/docker/grafana/{data,provisioning/{datasources,dashboards}}
chmod 777 /volume1/docker/grafana/data

# Start Grafana
cd /volume1/docker/grafana
docker-compose up -d

# Check logs
docker logs -f grafana

# Access UI
# https://grafana.jclee.me
# Default login: admin / (password from grafana.ini)
```

## 3. Loki Setup

### Directory Structure

```bash
/volume1/docker/loki/
├── loki-config.yml        # Main configuration
└── data/                  # Log storage
```

### Configuration File

**File**: `/volume1/docker/loki/loki-config.yml`

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: info

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2023-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

compactor:
  working_directory: /loki/compactor
  shared_store: filesystem
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150

limits_config:
  retention_period: 168h  # 7 days
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 4
  ingestion_burst_size_mb: 6

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 168h
```

### Docker Compose

**File**: `/volume1/docker/loki/docker-compose.yml`

```yaml
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    container_name: loki
    restart: unless-stopped
    user: root
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml:ro
      - ./data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - monitoring

networks:
  monitoring:
    external: true
```

### Deployment

```bash
# Create directories
mkdir -p /volume1/docker/loki/data
chmod 777 /volume1/docker/loki/data

# Start Loki
cd /volume1/docker/loki
docker-compose up -d

# Check logs
docker logs -f loki

# Verify
curl http://localhost:3100/ready
# Expected: ready
```

### Testing Log Push

```bash
# Test log ingestion
curl -X POST "http://localhost:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [
      {
        "stream": {
          "job": "test",
          "level": "info"
        },
        "values": [
          ["'$(date +%s)000000000'", "test log message"]
        ]
      }
    ]
  }'

# Query logs
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="test"}' \
  --data-urlencode 'limit=10'
```

## 4. n8n Workflow Deployment

### Prerequisites

```bash
# Set n8n API key
export N8N_API_KEY="your_n8n_api_key"
export N8N_URL="https://n8n.jclee.me"
```

### Deploy Health Check Workflow

```bash
# Navigate to n8n directory
cd /home/jclee/dev/resume/n8n

# Deploy workflow
./deploy-workflow.sh resume-healthcheck-oauth2.json

# Expected output:
# ✓ Reading workflow file...
# ✓ Validating JSON...
# ✓ Uploading to n8n...
# ✅ Workflow deployed successfully!
#    Workflow ID: 123
#    Name: Resume Portfolio - Health Check Monitor (OAuth2)
```

### Configure Slack OAuth2

Follow steps in `/home/jclee/dev/resume/n8n/SLACK_OAUTH2_SETUP.md`:

1. Create Slack App
2. Enable OAuth & Permissions
3. Add OAuth scopes: `chat:write`, `chat:write.public`
4. Install app to workspace
5. Copy OAuth token
6. Add credential to n8n

### Activate Workflow

```bash
# Via n8n API
curl -X PATCH "https://n8n.jclee.me/api/v1/workflows/123" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'

# Or via UI
# n8n UI → Workflows → Resume Portfolio Health Check → Activate
```

## 5. Reverse Proxy (Nginx)

### Configuration

**File**: `/etc/nginx/sites-available/monitoring`

```nginx
# Grafana
server {
    listen 443 ssl http2;
    server_name grafana.jclee.me;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Prometheus
server {
    listen 443 ssl http2;
    server_name prometheus.jclee.me;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Optional: Basic auth
    auth_basic "Prometheus";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://localhost:9090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Loki (optional, for external access)
server {
    listen 443 ssl http2;
    server_name loki.jclee.me;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# n8n
server {
    listen 443 ssl http2;
    server_name n8n.jclee.me;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Enable and Test

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/monitoring /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Verify SSL
curl -I https://grafana.jclee.me
curl -I https://prometheus.jclee.me
curl -I https://n8n.jclee.me
```

## 6. Verification

### Check All Services

```bash
# Prometheus
curl -s http://localhost:9090/-/healthy
# Expected: Prometheus is Healthy.

# Grafana
curl -s http://localhost:3000/api/health | jq '.'
# Expected: {"commit":"...","database":"ok","version":"..."}

# Loki
curl -s http://localhost:3100/ready
# Expected: ready

# n8n
curl -s https://n8n.jclee.me/healthz
# Expected: {"status":"ok"}
```

### Test End-to-End

```bash
# 1. Check Cloudflare Worker metrics
curl -s https://resume.jclee.me/metrics | head -20

# 2. Verify Prometheus is scraping
curl -s "http://localhost:9090/api/v1/query?query=up{job=\"resume\"}"

# 3. Check Grafana dashboard
# Open: https://grafana.jclee.me
# Navigate to: Dashboards → Resume Portfolio

# 4. Test n8n workflow
# Temporarily break resume.jclee.me and check Slack for alert
```

## 7. Maintenance

### Daily Tasks

- Check Grafana dashboard for anomalies
- Review Slack alerts from n8n
- Monitor disk space on Synology NAS

### Weekly Tasks

- Review Prometheus alerts
- Check Loki log retention
- Verify backup jobs

### Monthly Tasks

- Update Docker images
- Review and optimize alert rules
- Audit access logs
- Export Grafana dashboards (backup)

### Update Docker Images

```bash
# Stop services
cd /volume1/docker/prometheus && docker-compose down
cd /volume1/docker/grafana && docker-compose down
cd /volume1/docker/loki && docker-compose down

# Pull latest images
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest
docker pull grafana/loki:latest

# Start services
cd /volume1/docker/prometheus && docker-compose up -d
cd /volume1/docker/grafana && docker-compose up -d
cd /volume1/docker/loki && docker-compose up -d

# Verify
docker ps | grep -E 'prometheus|grafana|loki'
```

## 8. Troubleshooting

### Prometheus Not Scraping

```bash
# Check Prometheus logs
docker logs prometheus | grep -i error

# Verify target status
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets'

# Test manual scrape
curl -s https://resume.jclee.me/metrics
```

### Grafana Dashboard Not Loading

```bash
# Check Grafana logs
docker logs grafana | tail -50

# Verify data source
curl -u admin:password http://localhost:3000/api/datasources

# Test Prometheus query from Grafana
curl -u admin:password "http://localhost:3000/api/datasources/proxy/1/api/v1/query?query=up"
```

### Loki Not Receiving Logs

```bash
# Check Loki logs
docker logs loki | grep -i error

# Verify Loki is ready
curl http://localhost:3100/ready

# Test log push manually
curl -X POST "http://localhost:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{"streams":[{"stream":{"job":"test"},"values":[["'$(date +%s)000000000'","test"]]}]}'

# Query recent logs
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="test"}' \
  --data-urlencode 'limit=10' | jq '.'
```

### n8n Workflow Not Running

```bash
# Check n8n logs
docker logs n8n | tail -50

# List workflows
curl -X GET "https://n8n.jclee.me/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"

# Check workflow status
curl -X GET "https://n8n.jclee.me/api/v1/workflows/123" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.active'

# Test workflow manually
curl -X POST "https://n8n.jclee.me/api/v1/workflows/123/execute" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

## 📚 References

- [Prometheus Configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Grafana Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/)
- [Loki Configuration](https://grafana.com/docs/loki/latest/configuration/)
- [n8n API Documentation](https://docs.n8n.io/api/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/typescript/portfolio-worker-server/reverse-proxy/)

## 📝 Next Steps

1. Set up Alertmanager for advanced alerting
2. Configure Slack/email notifications
3. Add more services to monitoring
4. Implement log aggregation rules
5. Create custom Grafana dashboards
6. Set up automated backups
7. Configure high availability (optional)
