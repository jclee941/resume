# Resume Portfolio - Monitoring Configuration

**Last Updated**: 2025-11-26
**Status**: ✅ Production-ready

---

## Overview

This directory contains production monitoring configurations for the Resume Portfolio (https://resume.jclee.me).

**Monitoring Stack**:
- **Grafana**: Dashboard visualization (https://grafana.jclee.me)
- **Prometheus**: Metrics collection and storage
- **Loki**: Log aggregation from Cloudflare Workers
- **n8n**: Automated health checks and alerting

---

## Directory Structure

```
infrastructure/monitoring/
├── README.md                                    # This file
├── grafana-dashboard-resume-portfolio.json      # Main Grafana dashboard (8 panels)
└── (linked from configs/grafana/)               # Symlink for backward compatibility
```

---

## Dashboard Details

**Dashboard**: `grafana-dashboard-resume-portfolio.json`

**UID**: `resume-portfolio`
**Title**: Resume Portfolio - Production Monitoring
**Schema Version**: 38 (Grafana 10.0.0)
**Refresh Interval**: 30 seconds
**Time Range**: Last 6 hours

### Panels (8 total)

**Row 1 - Key Metrics** (4 stat panels):
1. **Health Check Status** (id:1)
   - Query: `up{job="resume"}`
   - Visualization: Stat with background color (RED/GREEN)
   - Mapping: 0=DOWN (red), 1=UP (green)

2. **Total Requests** (id:2)
   - Query: `http_requests_total{job="resume"}`
   - Visualization: Stat with area graph
   - Unit: short (count)

3. **Error Count** (id:3)
   - Query: `http_requests_error{job="resume"}`
   - Visualization: Stat with area graph
   - Thresholds: 0 (green), 1 (yellow), 10 (red)

4. **Avg Response Time** (id:4)
   - Query: `http_response_time_seconds{job="resume"}`
   - Visualization: Stat with area graph
   - Unit: seconds (3 decimals)
   - Thresholds: <0.1s (green), 0.1-0.5s (yellow), >0.5s (red)

**Row 2 - Additional Metrics**:
5. **Web Vitals Data Points** (id:5)
   - Query: `web_vitals_received{job="resume"}`
   - Visualization: Stat (count of Web Vitals reports)
   - Location: Bottom left (small panel)

**Row 3 - Time Series Graphs** (2 panels):
6. **Request Rate & Error Rate (1m)** (id:6)
   - Queries:
     - Total Request Rate: `sum(rate(http_requests_total{job="resume"}[1m]))`
     - Success Rate: `sum(rate(http_requests_success{job="resume"}[1m]))`
     - Error Rate: `sum(rate(http_requests_error{job="resume"}[1m]))`
   - Visualization: Timeseries with smooth interpolation
   - Unit: reqps (requests per second)
   - Legend: Table with mean, last, max

7. **Response Time History** (id:7)
   - Query: `http_response_time_seconds{job="resume"}`
   - Visualization: Timeseries
   - Unit: seconds (3 decimals)
   - Legend: Table with mean, last, max, min
   - Thresholds: <0.1s (green), 0.1-0.5s (yellow), >0.5s (red)

**Row 4 - Logs**:
8. **Resume Worker Logs** (id:8)
   - Datasource: Loki
   - Query: `{job="resume-worker"}`
   - Visualization: Logs panel (full width)
   - Sort: Descending (newest first)
   - Features: Log details, time display

### Annotations

**Deployment Detection**: Automatically detects deployments via Prometheus query
- Query: `changes(http_requests_total{job="resume"}[5m]) > 0`
- Interval: 60s
- Color: Cyan (#00D3FF)

---

## Metrics Reference

All metrics are exposed at `https://resume.jclee.me/metrics` in Prometheus format.

### Available Metrics

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `up` | Gauge | Service health status (1=UP, 0=DOWN) | job=resume |
| `http_requests_total` | Counter | Total HTTP requests received | job=resume |
| `http_requests_success` | Counter | Successful HTTP requests (2xx) | job=resume |
| `http_requests_error` | Counter | Failed HTTP requests (4xx, 5xx) | job=resume |
| `http_response_time_seconds` | Gauge | Average response time in seconds | job=resume |
| `web_vitals_received` | Counter | Web Vitals data points received | job=resume |

### Query Examples

```promql
# Error rate percentage (last 5 minutes)
(rate(http_requests_error{job="resume"}[5m]) / rate(http_requests_total{job="resume"}[5m])) * 100

# Success rate (last 1 minute)
sum(rate(http_requests_success{job="resume"}[1m]))

# Average response time over time
http_response_time_seconds{job="resume"}

# Detect new deployments
changes(http_requests_total{job="resume"}[5m]) > 0
```

---

## Alert Rules

Alert rules are defined in `../configs/grafana/alert-rules.yaml`.

### Configured Alerts (4 rules)

1. **High Error Rate** (uid: `resume_high_error_rate`)
   - Condition: Error rate > 5% for 5 minutes
   - Severity: Critical
   - Query: `(5xx requests / total requests) > 0.05`

2. **High Latency** (uid: `resume_high_latency`)
   - Condition: Response time > 0.5s for 10 minutes
   - Severity: Warning
   - Query: `http_response_time_seconds{job="resume"} > 0.5`

3. **Service Down** (uid: `resume_service_down`)
   - Condition: Health check fails for 1 minute
   - Severity: Critical
   - Query: `up{job="resume"} == 0`

4. **No Traffic** (uid: `resume_zero_requests`)
   - Condition: Zero requests for 15 minutes
   - Severity: Warning
   - Query: `rate(http_requests_total{job="resume"}[5m]) == 0`

### Alert Routing

**Contact Point**: Resume Portfolio Alerts
**Receiver Type**: Telegram (@qws941_bot)
**Repeat Interval**: 4 hours
**Group By**: alertname, severity

---

## Deployment

**⚠️ IMPORTANT**: Never use SSH to deploy dashboards directly to NAS.

### Deploy Dashboard to Grafana

```bash
# Method 1: Using Grafana API (recommended)
curl -X POST https://grafana.jclee.me/api/dashboards/db \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @infrastructure/monitoring/grafana-dashboard-resume-portfolio.json

# Method 2: Using deploy-generic.sh (if available)
~/.OpenCode/scripts/deploy-generic.sh grafana deploy \
  --config infrastructure/monitoring/grafana-dashboard-resume-portfolio.json

# Method 3: Import via Grafana UI
# 1. Open https://grafana.jclee.me
# 2. Go to Dashboards → Import
# 3. Upload JSON file or paste content
# 4. Select datasources: Prometheus (prometheus), Loki (loki)
# 5. Click Import
```

### Verify Deployment

```bash
# Check dashboard exists
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  https://grafana.jclee.me/api/dashboards/uid/resume-portfolio | jq '.meta.version'

# Check metrics endpoint
curl -s https://resume.jclee.me/metrics | head -20

# Check health endpoint
curl -s https://resume.jclee.me/health | jq
```

---

## Monitoring Best Practices

### Dashboard Usage

1. **First Time Setup**: Import dashboard → Configure datasources → Test panels
2. **Regular Monitoring**: Check dashboard every 30s (auto-refresh)
3. **Incident Response**: Use logs panel to investigate errors
4. **Post-Deployment**: Watch deployment annotations for traffic changes

### Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Uptime | 99.9% | <99.5% | <99% |
| Response Time (Avg) | <100ms | >100ms | >500ms |
| Error Rate | <0.1% | >1% | >5% |
| Request Rate | Consistent | - | Zero for 15min |

### Troubleshooting

**Dashboard not loading?**
- Check Grafana service: `curl -I https://grafana.jclee.me`
- Check Prometheus datasource: Grafana UI → Connections → Data sources
- Check Loki datasource: Grafana UI → Connections → Data sources

**Metrics missing?**
- Verify endpoint: `curl https://resume.jclee.me/metrics`
- Check Prometheus scrape config (on NAS)
- Check worker deployment: `curl https://resume.jclee.me/health`

**Logs not showing?**
- Check Loki datasource connection
- Verify log labels: `{job="resume-worker"}`
- Check Cloudflare Workers log forwarding

---

## Related Files

- **Alert Rules**: `infrastructure/configs/grafana/alert-rules.yaml`
- **n8n Health Checks**: `infrastructure/n8n/resume-healthcheck-workflow.json`
- **Deployment Workflows**: `infrastructure/workflows/configured/`
- **Project Documentation**: `OpenCode.md`, `README.md`

---

## Changelog

### 2025-11-26
- ✅ Unified dashboard from 2 duplicate files into single source
- ✅ Added Health Check Status panel (id:1)
- ✅ Added Deployment annotations
- ✅ Combined Request Rate & Error Rate into single panel
- ✅ Updated dashboard title to "Production Monitoring"
- ✅ Improved panel layout (8 panels, optimized grid)
- ✅ Created symlink from configs/grafana/ for backward compatibility
- ✅ Updated version to 2
- ✅ Added comprehensive README documentation

### Previous Versions
- **v1**: Initial dashboard with 7 panels (2025-11-20)
- **v0**: Legacy dashboard in configs/grafana/ (deprecated)

---

## Support

For issues or questions:
- Check logs: `curl https://resume.jclee.me/metrics`
- Check health: `curl https://resume.jclee.me/health | jq`
- Infrastructure status: `https://grafana.jclee.me`
- Project repository: `https://github.com/jclee941/resume/apps/resume`
