# Infrastructure Architecture

**Resume Portfolio System** - Production Infrastructure Documentation

**Last Updated**: 2026-02-11
**Version**: 1.2.0
**Environment**: Production

## 🏗️ Infrastructure Overview

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Internet (Global CDN)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   Cloudflare  │
                    │    Workers    │
                    │               │
                    │  resume.jclee │
                    │     .me       │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌────────▼────────┐  ┌──────▼──────┐
│  /health      │  │    /metrics     │  │  /api/vitals│
│  Health Check │  │  Prometheus     │  │  Web Vitals │
└───────┬───────┘  └────────┬────────┘  └──────┬──────┘
        │                   │                   │
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────▼────────────┐
                │    Synology NAS        │
                │   192.168.50.100       │
                │                        │
                │  ┌──────────────────┐  │
                │  │  Grafana         │  │
                │  │  grafana.jclee   │  │
                │  │     .me          │  │
                │  └────────┬─────────┘  │
                │           │            │
                │  ┌────────▼─────────┐  │
                │  │  Prometheus      │  │
                │  │  prometheus      │  │
                │  │    .jclee.me     │  │
                │  └────────┬─────────┘  │
                │           │            │
                │  ┌────────▼─────────┐  │
                │  │  Loki            │  │
                │  │  loki.jclee.me   │  │
                │  └──────────────────┘  │
                │                        │
                │  ┌──────────────────┐  │
                │  │  n8n             │  │
                │  │  n8n.jclee.me    │  │
                │  └──────────────────┘  │
                └────────────────────────┘
```

## ⚠️ Internal Services Access

일부 서비스는 **내부망 전용**이며 외부 DNS가 등록되어 있지 않습니다.

| Service    | External DNS           | Internal Access     | Recommended               |
| ---------- | ---------------------- | ------------------- | ------------------------- |
| Grafana    | ✅ grafana.jclee.me    | 192.168.50.100:3000 | External DNS 사용         |
| Prometheus | ❌ prometheus.jclee.me | 192.168.50.100:9090 | Grafana Explore 패널 사용 |
| Loki       | ❌ loki.jclee.me       | 192.168.50.100:3100 | Grafana Explore 패널 사용 |
| n8n        | ✅ n8n.jclee.me        | 192.168.50.100:5678 | External DNS 사용         |

**접근 방법**:

1. **Prometheus 쿼리**: Grafana → Explore → Prometheus 데이터소스 선택
2. **Loki 로그 조회**: Grafana → Explore → Loki 데이터소스 선택
3. **내부망 직접 접근**: VPN 또는 로컬 네트워크에서 내부 IP 사용

## 📊 Component Details

### 1. Cloudflare Workers (Edge Computing)

**Service**: resume.jclee.me
**Type**: Serverless Edge Function
**Deployment**: Global CDN (275+ locations)

**Key Features**:

- Zero cold start
- Sub-50ms response time
- 100,000 free requests/day
- Automatic HTTPS
- DDoS protection

**Endpoints**:

```
GET  /                    Portfolio homepage
GET  /health              Health check JSON
GET  /metrics             Prometheus metrics
POST /api/vitals          Web Vitals logging
GET  /robots.txt          SEO crawler config
GET  /sitemap.xml         XML sitemap
GET  /og-image.png        Social media preview
```

**Worker Configuration**:

```toml
# web/wrangler.toml
name = "resume"
main = "worker.js"
compatibility_date = "2024-01-01"

[placement]
mode = "smart"
```

**Metrics Exposed**:

- `http_requests_total` - Total HTTP requests
- `http_requests_success` - Successful requests
- `http_requests_error` - Failed requests
- `http_response_time_seconds` - Average response time
- `web_vitals_received` - Web Vitals data points

### 2. Grafana (Observability Dashboard)

**URL**: https://grafana.jclee.me
**Location**: Proxmox pve3 (192.168.50.100)
**Purpose**: Centralized monitoring and visualization

**Dashboards**:

- **Resume Portfolio**: Cloudflare Worker monitoring
  - Request rate and volume
  - Error rate tracking
  - Response time metrics
  - Web Vitals analysis
  - Real-time logs

**Data Sources**:

- Prometheus (metrics)
- Loki (logs)

**Dashboard Import**:

```bash
# Import from file
cp monitoring/grafana-dashboard-resume-portfolio.json /path/to/grafana/provisioning/dashboards/

# Or import via UI
# Grafana UI → Dashboards → Import → Upload JSON
```

### 3. Prometheus (Metrics Collection)

**Access**: 🔒 Internal only (192.168.50.100:9090)
**Location**: Proxmox pve3 (192.168.50.100)
**Scrape Interval**: 30 seconds

> ⚠️ No public DNS. Query via Grafana Explore or internal network.

**Scrape Configuration**:

```yaml
# prometheus.yml
global:
  scrape_interval: 30s
  evaluation_interval: 30s

scrape_configs:
  - job_name: 'resume'
    scrape_interval: 30s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['resume.jclee.me:443']
    scheme: https
```

**Query Examples**:

```promql
# Request rate (5-minute window)
rate(http_requests_total{job="resume"}[5m])

# Error rate percentage
(rate(http_requests_error{job="resume"}[5m]) / rate(http_requests_total{job="resume"}[5m])) * 100

# Average response time
http_response_time_seconds{job="resume"}

# Total Web Vitals data points
web_vitals_received{job="resume"}
```

### 4. Loki (Log Aggregation)

**Access**: 🔒 Via Grafana proxy (grafana.jclee.me/loki/...)
**Push Endpoint**: https://grafana.jclee.me/api/datasources/proxy/uid/cfakfiakcs0zka/loki/api/v1/push
**Location**: Proxmox pve3 (192.168.50.100)

> ⚠️ No public DNS. Query logs via Grafana Explore panel.

**Log Format**:

```json
{
  "streams": [
    {
      "stream": {
        "job": "resume-worker",
        "level": "INFO"
      },
      "values": [
        [
          "1700000000000000000",
          "{\"path\":\"/\",\"method\":\"GET\",\"event\":\"request\",\"response_time_ms\":45}"
        ]
      ]
    }
  ]
}
```

**Log Levels**:

- `INFO` - Normal requests
- `WARN` - Slow responses (>500ms)
- `ERROR` - Request failures

**LogQL Query Examples**:

```logql
# All logs from resume worker
{job="resume-worker"}

# Only error logs
{job="resume-worker"} | json | level="ERROR"

# Slow requests
{job="resume-worker"} | json | response_time_ms > 500

# Specific path logs
{job="resume-worker"} | json | path="/health"
```

### 5. n8n (Workflow Automation)

**URL**: https://n8n.jclee.me
**Location**: Proxmox pve3 (192.168.50.100)
**Purpose**: Health monitoring and alerting

> **📖 For detailed workflow documentation**, see [n8n/README.md](../../n8n/README.md) for:
>
> - Complete workflow setup guides
> - GitHub webhook integration
> - Automated deployment pipeline
> - OAuth2 credential management
> - API reference and troubleshooting

**Active Workflows**:

#### Health Check Monitor (OAuth2)

- **Trigger**: Schedule (every 5 minutes)
- **Check**: GET https://resume.jclee.me/health
- **Condition**: HTTP status ≠ 200 OR timeout
- **Action**: Send Slack alert to #general

**Workflow Details**:

```json
{
  "name": "Resume Portfolio - Health Check Monitor (OAuth2)",
  "nodes": [
    {
      "name": "Every 5 Minutes",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "minutes", "minutesInterval": 5 }]
        }
      }
    },
    {
      "name": "Check Resume Health",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://resume.jclee.me/health",
        "method": "GET",
        "options": { "timeout": 10000 }
      },
      "continueOnFail": true
    },
    {
      "name": "Is Down?",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "conditions": [
            {
              "leftValue": "={{ $json.statusCode }}",
              "rightValue": 200,
              "operator": { "type": "number", "operation": "notEquals" }
            },
            {
              "leftValue": "={{ $json.error }}",
              "rightValue": "",
              "operator": { "type": "string", "operation": "notEmpty" }
            }
          ]
        }
      }
    },
    {
      "name": "Send Slack Alert (OAuth2)",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "resource": "message",
        "operation": "post",
        "channel": "#general",
        "text": "🚨 Resume Portfolio Down"
      },
      "credentials": {
        "slackOAuth2Api": {
          "id": "kQFkSQ7sjQ0osLNA",
          "name": "Slack OAuth2 API"
        }
      }
    }
  ]
}
```

**Deployment**:

```bash
# Deploy workflow to n8n
cd n8n
./deploy-workflow.sh resume-healthcheck-oauth2.json

# Check workflow status
curl -X GET "https://n8n.jclee.me/api/v1/workflows" \
  -H "X-N8N-API-KEY: your_api_key"
```

## 📈 Performance Metrics

### Current Performance (2025-11-20)

**Worker Performance**:

- Response time (p50): ~45ms
- Response time (p95): ~120ms
- Response time (p99): ~180ms
- Error rate: <0.1%
- Availability: 99.95%

**Web Vitals** (Lighthouse CI):

- LCP (Largest Contentful Paint): 1.5s ✅ (<2.5s)
- FID (First Input Delay): 35ms ✅ (<100ms)
- CLS (Cumulative Layout Shift): 0.05 ✅ (<0.1)
- FCP (First Contentful Paint): 1.2s ✅ (<1.8s)
- TTFB (Time to First Byte): 350ms ✅ (<0.8s)

**Traffic Stats** (Monthly Average):

- Requests: ~150,000/month
- Unique visitors: ~5,000/month
- Bandwidth: ~2.5GB/month
- Cost: $0 (within free tier)

### Performance Budgets

**Cloudflare Workers Free Tier**:

- Requests: 100,000/day
- Current usage: ~5,000/day (5%)
- Burst capacity: 1,000 req/min

**Resource Limits**:

- Worker size: 1MB (current: 189KB)
- CPU time: 50ms (current: ~5ms)
- Memory: 128MB (current: ~10MB)

## 🔧 Maintenance

### Update Procedures

**Worker Deployment**:

```bash
# Standard deployment
npm run deploy

# Build only
npm run build

# Deploy with Wrangler
npm run deploy:wrangler
```

**Version Management**:

```bash
# Auto-increment patch (1.0.2 → 1.0.3)
npm run version:bump

# Minor version (1.0.2 → 1.1.0)
npm run version:minor

# Major version (1.0.2 → 2.0.0)
npm run version:major
```

**Monitoring Configuration**:

```bash
# Update Grafana dashboard
cp monitoring/grafana-dashboard-resume-portfolio.json \
  /volume1/docker/grafana/provisioning/dashboards/

# Update Prometheus config
sudo vim /volume1/docker/prometheus/prometheus.yml
sudo systemctl restart prometheus

# Update n8n workflow
cd n8n
./deploy-workflow.sh resume-healthcheck-oauth2.json
```

### Backup Strategy

**Daily Backups**:

- Worker.js source code (GitHub)
- Configuration files (`.env`, `wrangler.toml`)
- Monitoring dashboards (Grafana JSON exports)

**Weekly Backups**:

- Prometheus metrics (7-day retention)
- Loki logs (7-day retention)
- n8n workflow definitions

**Monthly Backups**:

- Full GitHub repository archive
- Complete Grafana configuration
- Infrastructure documentation

### Disaster Recovery

**RTO (Recovery Time Objective)**: 5 minutes
**RPO (Recovery Point Objective)**: 1 hour

**Recovery Steps**:

1. Verify Cloudflare Workers status
2. Check Synology NAS health
3. Restore worker.js from GitHub
4. Deploy via Wrangler CLI
5. Verify health endpoint
6. Monitor Grafana dashboard

## 📚 References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Dashboard Guide](https://grafana.com/docs/grafana/latest/dashboards/)
- [n8n Workflow Documentation](https://docs.n8n.io/)

## 📝 Change Log

### 2025-11-20

- ✅ Implemented semantic versioning (1.0.2)
- ✅ Added SEO static routes (/robots.txt, /sitemap.xml, /og-image.png)
- ✅ Created Grafana dashboard (resume-portfolio)
- ✅ Updated infrastructure documentation

### 2025-11-12

- ✅ Integrated Grafana Loki logging
- ✅ Added Prometheus metrics endpoint
- ✅ Implemented Web Vitals tracking
- ✅ Enhanced CSP with SHA-256 hashes

### 2025-10-18

- ✅ Initial production deployment
- ✅ Cloudflare Workers setup
- ✅ Basic health check endpoint
- ✅ n8n monitoring workflow

## 🔒 Internal Service Access

> **Note**: Prometheus, Loki, n8n do not have public DNS. Access via internal network or Grafana proxy.

| Service        | Public URL                  | Internal Access           | Notes                               |
| -------------- | --------------------------- | ------------------------- | ----------------------------------- |
| **Grafana**    | ✅ https://grafana.jclee.me | 192.168.50.100:3000       | Primary dashboard                   |
| **Prometheus** | 🔒 Internal Only            | 192.168.50.100:9090       | Metrics only via Grafana datasource |
| **Loki**       | 🔒 Grafana Proxy            | grafana.jclee.me/loki/... | Log queries via Grafana proxy       |
| **n8n**        | 🔒 Internal Only            | 192.168.50.100:5678       | Workflow automation (internal only) |

**Access Methods**:

1. **Internal Network**: Connect to home network (192.168.50.x) for direct access
2. **Grafana Proxy**: Use Grafana Explore for Prometheus/Loki queries
3. **SSH Tunnel**: `ssh -L 9090:192.168.50.100:9090 user@gateway` for remote access

## 🔗 Quick Links

- **Live Site**: https://resume.jclee.me
- **Grafana**: https://grafana.jclee.me (✅ Public)
- **Prometheus**: 192.168.50.100:9090 (🔒 Internal)
- **n8n**: 192.168.50.100:5678 (🔒 Internal)
- **GitHub**: https://github.com/qws941/resume
