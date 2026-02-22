# Resume Portfolio - Infrastructure Configuration

**Last Updated**: 2025-11-26
**Project**: Resume Portfolio (https://resume.jclee.me)
**Repository**: https://github.com/qws941/resume

---

## Overview

This directory contains all infrastructure configurations, monitoring dashboards, alert rules, and automation workflows for the Resume Portfolio application.

**Infrastructure Stack**:

- **Application**: Cloudflare Workers (serverless, global CDN)
- **Monitoring**: Grafana + Prometheus + Loki (hosted on Proxmox pve3 (192.168.50.100))
- **Automation**: n8n workflows (health checks, deployments)
- **CI/CD**: GitHub Actions + GitHub Actions

---

## Directory Structure

```
infrastructure/
├── README.md                          # This file
├── configs/                           # Configuration files
│   └── grafana/
│       ├── README.md                  # Grafana configuration guide
│       ├── alert-rules.yaml           # 4 alert rules (error rate, latency, downtime, traffic)
│       └── resume-portfolio-dashboard.json → ../../monitoring/... (symlink)
├── monitoring/                        # Monitoring assets (primary)
│   ├── README.md                      # Comprehensive monitoring guide
│   └── grafana-dashboard-resume-portfolio.json  # Main dashboard (8 panels)
├── n8n/                              # n8n workflow definitions
│   ├── resume-healthcheck-workflow.json
│   ├── resume-healthcheck-oauth2.json
│   └── workflows/
│       ├── resume-auto-deploy.json
│       └── resume-deploy-optimized.json
└── workflows/                         # Additional automation workflows
    ├── configured/
    │   ├── 01-site-health-monitor.json
    │   └── 02-github-deployment-webhook.json
    ├── config.template.json
    └── config.example.json
```

---

## Quick Reference

### Monitoring URLs

| Service        | URL                              | Access      | Purpose                 |
| -------------- | -------------------------------- | ----------- | ----------------------- |
| **Grafana**    | https://grafana.jclee.me         | ✅ Public   | Dashboard visualization |
| **Prometheus** | 192.168.50.100:9090              | 🔒 Internal | Metrics storage         |
| **Loki**       | grafana.jclee.me/loki/...        | 🔒 Proxy    | Log aggregation         |
| **n8n**        | 192.168.50.100:5678              | 🔒 Internal | Workflow automation     |
| **GitHub**     | https://github.com/qws941/resume | ✅ Public   | Source repository       |

> ⚠️ **Internal Services**: Prometheus, Loki, n8n are internal-only (no public DNS).
> Access via internal IP or Grafana proxy. See [Access Guide](#internal-service-access) below.

### Application Endpoints

| Endpoint                           | Purpose            | Format |
| ---------------------------------- | ------------------ | ------ |
| https://resume.jclee.me            | Portfolio homepage | HTML   |
| https://resume.jclee.me/health     | Health check       | JSON   |
| https://resume.jclee.me/metrics    | Prometheus metrics | Text   |
| https://resume.jclee.me/api/vitals | Web Vitals logging | JSON   |

### Key Commands

```bash
# Check service health
curl -s https://resume.jclee.me/health | jq

# Check metrics
curl -s https://resume.jclee.me/metrics | head -20

# Deploy dashboard (API method)
curl -X POST https://grafana.jclee.me/api/dashboards/db \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @infrastructure/monitoring/grafana-dashboard-resume-portfolio.json

# Run tests
cd /home/jclee/dev/resume
npm run build && npm test && npm run test:e2e

# Deploy application
npm run deploy  # Cloudflare Workers via API
# OR: git push origin master  # Auto-deploys via CI/CD
```

---

## Components

### 1. Monitoring (Grafana Dashboard)

**Primary File**: `monitoring/grafana-dashboard-resume-portfolio.json`

**Dashboard UID**: `resume-portfolio`
**Panels**: 8 total

- Health Check Status (up/down indicator)
- Total Requests (counter)
- Error Count (with thresholds)
- Avg Response Time (latency tracking)
- Web Vitals Data Points (performance monitoring)
- Request Rate & Error Rate (1m rolling window)
- Response Time History (timeseries)
- Resume Worker Logs (Loki integration)

**Metrics Tracked**:

- `up{job="resume"}` - Service health (1=UP, 0=DOWN)
- `http_requests_total{job="resume"}` - Total requests
- `http_requests_success{job="resume"}` - Successful requests
- `http_requests_error{job="resume"}` - Failed requests
- `http_response_time_seconds{job="resume"}` - Response time
- `web_vitals_received{job="resume"}` - Web Vitals data points

**Documentation**: See `monitoring/README.md` for complete details.

### 2. Alert Rules

**File**: `configs/grafana/alert-rules.yaml`

**Configured Alerts** (4 rules):

| Alert           | Condition            | Severity | Duration   |
| --------------- | -------------------- | -------- | ---------- |
| High Error Rate | Error rate > 5%      | Critical | 5 minutes  |
| High Latency    | Response time > 0.5s | Warning  | 10 minutes |
| Service Down    | Health check fails   | Critical | 1 minute   |
| No Traffic      | Zero requests        | Warning  | 15 minutes |

**Alert Routing**:

- **Receiver**: Slack webhook
- **Group By**: alertname, severity
- **Repeat Interval**: 4 hours

### 3. n8n Workflows

**Directory**: `n8n/workflows/`

**Available Workflows**:

| Workflow                           | Purpose                     | Trigger          |
| ---------------------------------- | --------------------------- | ---------------- |
| `resume-healthcheck-workflow.json` | Basic health monitoring     | Schedule (5 min) |
| `resume-healthcheck-oauth2.json`   | OAuth2-enabled health check | Schedule (5 min) |
| `resume-auto-deploy.json`          | Automated deployment        | Webhook          |
| `resume-deploy-optimized.json`     | Optimized deployment flow   | Webhook          |

**Monitoring Workflow Features**:

- Health endpoint check every 5 minutes
- Metrics validation (Prometheus format)
- Slack notifications on failures
- Retry logic (3 attempts)

### 4. Additional Workflows

**Directory**: `workflows/configured/`

| Workflow                            | Purpose                         |
| ----------------------------------- | ------------------------------- |
| `01-site-health-monitor.json`       | Comprehensive site monitoring   |
| `02-github-deployment-webhook.json` | GitHub deployment notifications |

---

## Deployment Guide

### Deploy Monitoring Dashboard

**⚠️ CRITICAL**: Never use SSH to deploy to NAS. Use API or Grafana UI.

**Method 1: Grafana API (Recommended)**

```bash
# Set API key
export GRAFANA_API_KEY='your-api-key'

# Deploy dashboard
curl -X POST https://grafana.jclee.me/api/dashboards/db \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @infrastructure/monitoring/grafana-dashboard-resume-portfolio.json

# Verify
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  https://grafana.jclee.me/api/dashboards/uid/resume-portfolio | jq '.meta.version'
```

**Method 2: Grafana UI**

1. Open https://grafana.jclee.me
2. Go to **Dashboards** → **Import**
3. Upload `monitoring/grafana-dashboard-resume-portfolio.json`
4. Select datasources: Prometheus (`prometheus`), Loki (`loki`)
5. Click **Import**

### Deploy Alert Rules

```bash
# Alert rules are managed via Grafana provisioning
# Copy alert-rules.yaml to Grafana provisioning directory on NAS
# OR: Import via Grafana UI → Alerting → Alert rules → Import

# Verify alerts
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  https://grafana.jclee.me/api/ruler/grafana/api/v1/rules | jq
```

### Deploy n8n Workflows

1. Open https://n8n.jclee.me
2. Go to **Workflows** → **Import from File**
3. Select workflow JSON file
4. Configure credentials (if required)
5. Activate workflow

---

## Internal Service Access

> ⚠️ **Prometheus, Loki, n8n** do not have public DNS.
> Access via internal network (192.168.50.x) or Grafana proxy.

| Service        | Public Access       | Internal Access           | Notes               |
| -------------- | ------------------- | ------------------------- | ------------------- |
| **Grafana**    | ✅ grafana.jclee.me | 192.168.50.100:3000       | All dashboards      |
| **Prometheus** | 🔒 Internal Only    | 192.168.50.100:9090       | Use Grafana Explore |
| **Loki**       | 🔒 Grafana Proxy    | grafana.jclee.me/loki/... | Grafana proxy       |
| **n8n**        | 🔒 Internal Only    | 192.168.50.100:5678       | Workflow editor     |

**Access Methods**:

```bash
# Option 1: Internal Network (connect to 192.168.50.x subnet)
curl http://192.168.50.100:9090/api/v1/query?query=up

# Option 2: Grafana Explore (for Prometheus/Loki queries)
# Open: https://grafana.jclee.me → Explore → Select datasource

# Option 3: SSH Tunnel (for remote access)
ssh -L 9090:192.168.50.100:9090 -L 5678:192.168.50.100:5678 user@gateway
# Then access: http://localhost:9090 (Prometheus), http://localhost:5678 (n8n)
```

---

## Monitoring Best Practices

### Performance Targets

| Metric                  | Target     | Warning | Critical       |
| ----------------------- | ---------- | ------- | -------------- |
| **Uptime**              | 99.9%      | <99.5%  | <99%           |
| **Response Time (Avg)** | <100ms     | >100ms  | >500ms         |
| **Error Rate**          | <0.1%      | >1%     | >5%            |
| **Request Rate**        | Consistent | -       | Zero for 15min |

### Dashboard Usage

**Regular Monitoring**:

- Dashboard auto-refreshes every 30 seconds
- Monitor Health Check Status panel (top-left)
- Check Error Count and Response Time
- Review logs panel for anomalies

**Incident Response**:

1. Check **Health Check Status** (RED = DOWN)
2. Review **Error Count** and **Request Rate & Error Rate**
3. Check **Resume Worker Logs** for error details
4. Verify deployment annotations for recent changes

**Post-Deployment**:

1. Watch for deployment annotation on graphs
2. Monitor Response Time for spikes
3. Check Error Rate for increases
4. Verify Request Rate remains consistent

---

## Troubleshooting

### Dashboard Issues

**Dashboard not loading?**

```bash
# Check Grafana service
curl -I https://grafana.jclee.me

# Check datasources
# Go to: Grafana UI → Connections → Data sources
# Verify: Prometheus (prometheus), Loki (loki)
```

**Metrics missing?**

```bash
# Verify metrics endpoint
curl https://resume.jclee.me/metrics

# Check Prometheus scrape config (on NAS)
# Verify job "resume" is configured

# Check worker deployment
curl https://resume.jclee.me/health | jq
```

**Logs not showing?**

```bash
# Check Loki datasource
# Grafana UI → Connections → Data sources → Loki

# Verify log labels
# Query: {job="resume-worker"}

# Check Cloudflare Workers log forwarding
```

### Application Issues

**Site down?**

```bash
# Check health
curl https://resume.jclee.me/health

# Check Cloudflare Workers status
# https://www.cloudflarestatus.com/

# Check deployment
curl -I https://resume.jclee.me
```

**High error rate?**

```bash
# Check metrics
curl https://resume.jclee.me/metrics | grep error

# Check recent deployments
# Grafana dashboard → Deployment annotations

# Review logs
# Grafana dashboard → Resume Worker Logs panel
```

---

## File Changelog

### 2026-01-24 (Current)

**Changes**:

- ✅ Unified dashboard files (monitoring/ is primary, configs/grafana/ is symlink)
- ✅ Added Health Check Status panel to dashboard
- ✅ Enhanced dashboard with deployment annotations
- ✅ Created comprehensive README for monitoring/
- ✅ Verified alert-rules.yaml (4 rules, production-ready)
- ✅ Reviewed n8n workflows (4 workflows, active)
- ✅ Updated infrastructure README (this file)
- ✅ Clarified internal-only service access

**File Structure**:

- `monitoring/grafana-dashboard-resume-portfolio.json` - Primary source (v3)
- `configs/grafana/resume-portfolio-dashboard.json` - Symlink to monitoring/

### Previous Versions

- **2025-11-26**: Initial consolidation
- **2025-11-23**: Initial GitHub Actions pipeline integration
- **2025-11-20**: Added n8n health check workflows
- **2025-11-19**: Created workflow configurations

---

## Related Documentation

- **Main Documentation**: `../OpenCode.md` (project overview, commands, architecture)
- **Monitoring Guide**: `monitoring/README.md` (comprehensive monitoring documentation)
- **Grafana Config**: `configs/grafana/README.md` (alert rules, dashboard deployment)
- **Testing Guide**: `../docs/guides/TESTING_GUIDE.md`
- **Infrastructure Guide**: `../docs/guides/INFRASTRUCTURE.md`

---

## Support

For issues or questions:

1. **Check Service Health**:
   - Health: `curl https://resume.jclee.me/health | jq`
   - Metrics: `curl https://resume.jclee.me/metrics`
   - Dashboard: https://grafana.jclee.me

2. **Review Documentation**:
   - This file: `infrastructure/README.md`
   - Monitoring: `infrastructure/monitoring/README.md`
   - Project: `OpenCode.md`

3. **Contact**:
   - Email: qws941@kakao.com
   - GitHub Issues: https://github.com/qws941/resume/issues

---

**Last Updated**: 2026-01-24
**Infrastructure Version**: 2.1.0
**Monitoring Stack**: Grafana 10.0.0 + Prometheus + Loki
**Status**: ✅ Production-ready
