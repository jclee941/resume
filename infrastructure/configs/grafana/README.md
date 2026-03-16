# Grafana Configuration for Resume Portfolio

This directory contains Grafana dashboard and alert configurations for monitoring the resume portfolio application deployed on Cloudflare Workers.

## Files

- **resume-portfolio-dashboard.json** (Symlink)
  - Points to `../../monitoring/grafana-dashboard-resume-portfolio.json` (SSoT)
- **alert-rules.yaml** - Alert rules for critical conditions
- **README.md** - This file

## Dashboard Overview

The **Resume Portfolio - Production Overview** dashboard provides comprehensive monitoring with:

### Key Metrics Panels

1. **Health Check Status** (Stat Panel)
   - Shows UP/DOWN status with color coding
   - Query: `up{job="resume"}`
   - Green = UP, Red = DOWN

2. **Total Requests** (Stat Panel)
   - Total HTTP requests counter
   - Query: `http_requests_total{job="resume"}`

3. **Error Count** (Stat Panel)
   - Failed requests counter
   - Query: `http_requests_error{job="resume"}`
   - Threshold: 0 = green, ≥1 = red

4. **Average Response Time** (Stat Panel)
   - Average response time in seconds
   - Query: `http_response_time_seconds{job="resume"}`
   - Thresholds: <0.1s = green, 0.1-0.5s = yellow, >0.5s = red

5. **Request Rate & Error Rate** (Time Series)
   - Total, success, and error request rates
   - Queries:
     - Total: `sum(rate(http_requests_total{job="resume"}[1m]))`
     - Success: `sum(rate(http_requests_success{job="resume"}[1m]))`
     - Error: `sum(rate(http_requests_error{job="resume"}[1m]))`

6. **Request Latency Percentiles** (Time Series)
   - Average response time over time
   - Query: `http_response_time_seconds{job="resume"}`

7. **Web Vitals Received** (Stat Panel)
   - Count of Web Vitals data points received
   - Query: `web_vitals_received{job="resume"}`

8. **Application Logs** (Logs Panel)
   - Real-time Loki logs from the worker
   - Query: `{job="resume-worker"}`

### Annotations

- **Deployments** - Automatic annotations marking deployment events
  - Detected via metric changes
  - Blue markers on time series graphs

## Alert Rules

### 1. High Error Rate (CRITICAL)

**Condition**: Error rate >5% for 5 minutes

**Query**:

```promql
(sum(rate(http_requests_total{job="resume",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="resume"}[5m]))) > 0.05
```

**For**: 5 minutes
**Severity**: Critical

### 2. High p99 Latency (WARNING)

**Condition**: Average response time >500ms for 10 minutes

**Query**:

```promql
http_response_time_seconds{job="resume"} > 0.5
```

**For**: 10 minutes
**Severity**: Warning

### 3. Service Down (CRITICAL)

**Condition**: Health check failing for 1 minute

**Query**:

```promql
up{job="resume"} == 0
```

**For**: 1 minute
**Severity**: Critical

### 4. No Traffic (WARNING)

**Condition**: Zero requests for 15 minutes

**Query**:

```promql
rate(http_requests_total{job="resume"}[5m]) == 0
```

**For**: 15 minutes
**Severity**: Warning

## Prerequisites

1. **Grafana Access**
   - URL: https://grafana.jclee.me
   - Admin credentials required for importing dashboards and alert rules

2. **Data Sources**
   - **Prometheus**: Must be configured with job label `resume`
   - **Loki**: Must be configured with job label `resume-worker`

3. **Prometheus Metrics Endpoint**
   - Endpoint: https://resume.jclee.me/metrics
   - Must be scraped by Prometheus

4. **Telegram Bot Integration** (Optional for alerts)
   - Environment variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
   - Required for Telegram notifications
   - Get bot token from 1Password homelab vault


## Installation

### Method 1: Manual Import via Grafana UI

#### Dashboard Import

1. Open Grafana: https://grafana.jclee.me
2. Navigate to **Dashboards** → **Import**
3. Click **Upload JSON file**
4. Select `resume-portfolio-dashboard.json`
5. Configure:
   - **Prometheus Data Source**: Select your Prometheus instance
   - **Loki Data Source**: Select your Loki instance
6. Click **Import**

#### Alert Rules Import

1. Navigate to **Alerting** → **Alert rules**
2. Click **New alert rule** → **Import**
3. Upload `alert-rules.yaml`
4. Configure contact points:
   - Add Telegram Bot credentials to contact point settings
5. Save

### Method 2: Automated Import via API

```bash
#!/bin/bash
GRAFANA_URL="https://grafana.jclee.me"
GRAFANA_API_KEY="<your-api-key>"

# Import dashboard
curl -X POST "${GRAFANA_URL}/api/dashboards/db" \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @resume-portfolio-dashboard.json

# Import alert rules
curl -X POST "${GRAFANA_URL}/api/v1/provisioning/alert-rules" \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -H "Content-Type: application/yaml" \
  --data-binary @alert-rules.yaml
```

### Method 3: Grafana Provisioning (Recommended for Automation)

1. Copy files to Grafana provisioning directory on Synology NAS:

   ```bash
   # Dashboard provisioning
   cp resume-portfolio-dashboard.json /volume1/grafana/provisioning/dashboards/

   # Alert rules provisioning
   cp alert-rules.yaml /volume1/grafana/provisioning/alerting/
   ```

2. Create provisioning config (if not exists):

   ```yaml
   # /volume1/grafana/provisioning/dashboards/dashboards.yaml
   apiVersion: 1

   providers:
     - name: "Resume Portfolio"
       folder: "Production"
       type: file
       options:
         path: /var/lib/grafana/provisioning/dashboards
   ```

3. Restart Grafana:
   ```bash
   ssh admin@192.168.50.100
   docker restart grafana
   ```

## Verification

After importing, verify the setup:

### 1. Check Dashboard

```bash
# Open dashboard in browser
open https://grafana.jclee.me/d/resume-portfolio

# Verify metrics are populated (wait 30-60 seconds after deployment)
curl -s https://resume.jclee.me/metrics | grep -E "http_requests_total|http_response_time"
```

### 2. Check Alert Rules

```bash
# Verify alert rules are active
curl -s "${GRAFANA_URL}/api/v1/provisioning/alert-rules" \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" | jq '.[] | select(.title | contains("Resume"))'
```

### 3. Test Alerts

```bash
# Trigger test alert by temporarily stopping the service
# (only in staging/development environments)
docker stop resume-worker
sleep 70  # Wait for alert to fire (1m for condition + 10s group wait)

# Check Telegram for alert notification
# Restart service
docker start resume-worker
```

## Troubleshooting

### Dashboard shows "No data"

**Possible Causes**:

1. Prometheus not scraping `/metrics` endpoint
2. Metrics endpoint returning incorrect format
3. Job label mismatch

**Solutions**:

```bash
# 1. Verify metrics endpoint is accessible
curl -s https://resume.jclee.me/metrics

# 2. Check Prometheus targets
# Navigate to: https://grafana.jclee.me/explore (Internal: http://192.168.50.100:9090/targets)
# Verify job "resume" is UP

# 3. Check Prometheus query
# Navigate to: https://grafana.jclee.me/explore
# Query: up{job="resume"}
# Should return: 1

# 4. Verify job label in worker.js
grep -A 5 'http_requests_total' /home/jclee/dev/resume/apps/portfolio/worker.js
# Should contain: {job="resume"}
```

### Alerts not firing

**Possible Causes**:

1. Telegram Bot credentials not configured
2. Alert rule conditions not met
3. Alert rule paused

**Solutions**:

```bash
# 1. Verify Telegram Bot credentials
# curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
#   -H 'Content-Type: application/json' \
#   -d '{"chat_id": "$TELEGRAM_CHAT_ID", "text": "Test alert from Grafana"}'

  -H 'Content-Type: application/json' \
  -d '{"text":"Test alert from Grafana"}'

# 2. Check alert rule state in Grafana UI
# Navigate to: Alerting → Alert rules
# Verify rules are not paused

# 3. Check alert evaluation logs
# Grafana UI → Alerting → Alert rules → [Rule] → History
```

### Logs panel empty

**Possible Causes**:

1. Loki not receiving logs from promtail
2. Job label mismatch
3. Docker logs not flowing

**Solutions**:

```bash
# 1. Verify Docker logs exist
docker logs resume-worker --tail 10

# 2. Check promtail is running
docker ps | grep promtail

# 3. Query Loki directly
# Use Grafana Explore: https://grafana.jclee.me/explore
# Or internal curl:
curl -s "http://192.168.50.100:3100/loki/api/v1/query?query={job=\"resume-worker\"}&limit=10"

# 4. Restart promtail if needed
docker restart promtail
```

## Customization

### Adjust Alert Thresholds

Edit `alert-rules.yaml` and modify the threshold values:

```yaml
# High Error Rate: Change from 5% to 10%
- condition: C
  model:
    expression: A / B > 0.10 # Changed from 0.05

# High Latency: Change from 500ms to 1s
- condition: A
  model:
    expr: http_response_time_seconds{job="resume"} > 1.0 # Changed from 0.5
```

### Add New Panels

1. Open dashboard in edit mode
2. Click **Add** → **Visualization**
3. Configure query and visualization
4. Save dashboard
5. Export updated JSON to this directory

### Add Web Vitals Panels

Once Web Vitals data is flowing to `/api/vitals`, add custom panels:

```json
{
  "title": "Largest Contentful Paint (LCP)",
  "type": "stat",
  "targets": [
    {
      "expr": "avg(web_vitals_lcp{job=\"resume\"})"
    }
  ],
  "fieldConfig": {
    "thresholds": {
      "steps": [
        { "value": 0, "color": "green" },
        { "value": 2.5, "color": "yellow" },
        { "value": 4.0, "color": "red" }
      ]
    }
  }
}
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review dashboard for anomalies
2. **Monthly**: Review and adjust alert thresholds
3. **Quarterly**: Archive old deployment annotations
4. **Annually**: Review and update panel layouts

### Dashboard Updates

When updating the dashboard:

1. Make changes in Grafana UI
2. Export updated JSON:
   - Dashboard Settings → JSON Model → Copy
3. Save to `resume-portfolio-dashboard.json`
4. Commit to git:
   ```bash
   git add configs/grafana/resume-portfolio-dashboard.json
   git commit -m "docs: Update Grafana dashboard configuration"
   git push
   ```

## References

- [Grafana Dashboard Documentation](https://grafana.com/docs/grafana/latest/dashboards/)
- [Prometheus Query Language (PromQL)](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Alerting Documentation](https://grafana.com/docs/grafana/latest/alerting/)
- [POST_DEPLOYMENT_ANALYSIS.md](/home/jclee/app/resume/docs/analysis/POST_DEPLOYMENT_ANALYSIS_2025_10_17.md)

## Support

For issues or questions:

- Email: qws941@kakao.com
- GitHub Issues: https://github.com/qws941/resume/issues
- Grafana Dashboard: https://grafana.jclee.me/d/resume-portfolio
