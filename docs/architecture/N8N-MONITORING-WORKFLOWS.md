# n8n Monitoring Workflows for resume.jclee.me

## 📊 Current Status (2025-11-18 23:25 KST)

**Live Site**: https://resume.jclee.me
**Status**: ✅ Healthy (HTTP 200)
**Deployment**: 2025-11-18 08:40:43 UTC
**Uptime**: 14h 45m (53,071 seconds)
**n8n Server**: https://n8n.jclee.me (✅ Healthy)

**Current Metrics**:
- Requests Total: 1
- Requests Success: 0
- Requests Error: 0
- Web Vitals Received: 0
- Response Time: 0.00s

**Gap Analysis**: Very low traffic metrics indicate monitoring automation opportunity.

---

## 🎯 Recommended n8n Workflows

### Workflow 1: Site Health Monitor (Priority 1)

**Purpose**: Monitor resume.jclee.me health endpoint every 5 minutes and alert on failures.

**n8n Template Reference**: [Health Check Websites with Google Sheets & Telegram Alerts](https://n8n.io/workflows/3352) (ID: 3352)

**Nodes**:
1. **Schedule Trigger** (Every 5 minutes)
2. **HTTP Request** → `GET https://resume.jclee.me/health`
3. **IF** (Check `status !== "healthy"`)
4. **Slack** (Send alert to `#infra-alerts`)
5. **Google Sheets** (Log downtime event)

**Configuration**:
```javascript
// HTTP Request Node
{
  "method": "GET",
  "url": "https://resume.jclee.me/health",
  "options": {
    "timeout": 10000,
    "retry": {
      "maxTries": 3
    }
  }
}

// IF Node Condition
{{ $json.status !== "healthy" || $json.uptime_seconds < 60 }}

// Slack Message
⚠️ **Resume Site Health Alert**
Status: {{ $json.status || "DOWN" }}
Deployed: {{ $json.deployed_at }}
Uptime: {{ $json.uptime_seconds }}s
Metrics:
- Total Requests: {{ $json.metrics.requests_total }}
- Success: {{ $json.metrics.requests_success }}
- Errors: {{ $json.metrics.requests_error }}

🔗 https://resume.jclee.me/health
```

**Expected Output** (Google Sheets):
| Timestamp | Status | Uptime (s) | Requests Total | Errors | Alert Sent |
|-----------|--------|------------|----------------|--------|------------|
| 2025-11-18 23:25 | healthy | 53071 | 1 | 0 | No |
| 2025-11-18 23:30 | DOWN | 0 | 0 | 0 | Yes |

---

### Workflow 2: GitHub Deployment Webhook (Priority 2)

**Purpose**: Receive GitHub Actions deployment notifications and broadcast to Slack/Loki.

**n8n Template Reference**: Custom webhook processing based on [Building Your First WhatsApp Chatbot](https://n8n.io/workflows/2465) pattern

**Nodes**:
1. **Webhook** (POST /resume-deploy)
2. **Set** (Extract deployment data)
3. **HTTP Request** (Fetch GitHub Actions run details)
4. **Slack** (Send deployment notification)
5. **HTTP Request** (Send logs to Loki)

**Configuration**:
```javascript
// Webhook Node
{
  "path": "resume-deploy",
  "httpMethod": "POST",
  "responseMode": "onReceived"
}

// Set Node (Extract Data)
{
  "commit_sha": "{{ $json.head_commit.id }}",
  "commit_message": "{{ $json.head_commit.message }}",
  "author": "{{ $json.head_commit.author.name }}",
  "deployed_at": "{{ $now.toISO() }}",
  "workflow_run_id": "{{ $json.workflow_run.id }}"
}

// Slack Notification
🚀 **Resume Site Deployed**
Commit: `{{ $json.commit_sha.substring(0,7) }}`
Message: {{ $json.commit_message }}
Author: {{ $json.author }}
Time: {{ $json.deployed_at }}

🔗 https://github.com/qws941/resume/actions/runs/{{ $json.workflow_run_id }}
🌐 https://resume.jclee.me
```

**GitHub Actions Integration** (`.github/workflows/deploy.yml/deploy.yml`):
```yaml
- name: Notify n8n
  if: always()
  run: |
    curl -X POST https://n8n.jclee.me/webhook/resume-deploy \
      -H "Content-Type: application/json" \
      -d '{
        "status": "${{ job.status }}",
        "commit_sha": "${{ github.sha }}",
        "commit_message": "${{ github.event.head_commit.message }}",
        "deployed_at": "${{ env.DEPLOYED_AT }}"
      }'
```

---

### Workflow 3: Web Vitals Analytics (Priority 3)

**Purpose**: Collect `/api/vitals` POST data and analyze performance trends.

**n8n Template Reference**: [Daily Personalized Air & Pollen Health Alerts](https://n8n.io/workflows/3699) pattern (data aggregation)

**Nodes**:
1. **Webhook** (POST /api/vitals-proxy)
2. **Code** (Parse Web Vitals JSON)
3. **IF** (Check if LCP > 2.5s || CLS > 0.1)
4. **Slack** (Performance warning)
5. **HTTP Request** (Forward to Loki)
6. **Google Sheets** (Daily aggregation)

**Configuration**:
```javascript
// Code Node (Parse Web Vitals)
const vitals = $input.first().json;
return [{
  json: {
    lcp: vitals.lcp || 0,
    fid: vitals.fid || 0,
    cls: vitals.cls || 0,
    fcp: vitals.fcp || 0,
    ttfb: vitals.ttfb || 0,
    timestamp: $now.toISO(),
    user_agent: vitals.userAgent || "unknown",
    is_slow: vitals.lcp > 2500 || vitals.cls > 0.1 || vitals.fid > 100
  }
}];

// IF Condition (Performance Alert)
{{ $json.is_slow === true }}

// Slack Alert
⚠️ **Web Vitals Performance Warning**
LCP: {{ $json.lcp }}ms (target: <2500ms)
FID: {{ $json.fid }}ms (target: <100ms)
CLS: {{ $json.cls }} (target: <0.1)
FCP: {{ $json.fcp }}ms
TTFB: {{ $json.ttfb }}ms

User Agent: {{ $json.user_agent }}
Time: {{ $json.timestamp }}
```

**Frontend Integration** (`typescript/portfolio-worker/index.html`):
```javascript
// Add to existing Web Vitals script
fetch('/api/vitals', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({lcp, fid, cls, fcp, ttfb, userAgent: navigator.userAgent})
});

// Also send to n8n for analytics
fetch('https://n8n.jclee.me/webhook/vitals-proxy', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({lcp, fid, cls, fcp, ttfb, userAgent: navigator.userAgent})
}).catch(() => {}); // Fail silently
```

---

### Workflow 4: Daily Performance Report (Priority 4)

**Purpose**: Aggregate 24h metrics and send summary email.

**n8n Template Reference**: [Monitor Server Uptime & Get Email Alerts](https://n8n.io/workflows/3880) pattern

**Nodes**:
1. **Schedule Trigger** (Daily at 09:00 KST)
2. **HTTP Request** (Fetch Prometheus metrics)
3. **Google Sheets** (Query last 24h vitals)
4. **Code** (Calculate averages)
5. **Gmail** (Send daily report)

**Configuration**:
```javascript
// Schedule Trigger
{
  "rule": {
    "interval": [{
      "field": "cronExpression",
      "expression": "0 9 * * *"
    }]
  }
}

// HTTP Request (Prometheus)
{
  "method": "GET",
  "url": "https://resume.jclee.me/metrics"
}

// Code Node (Calculate Stats)
const metrics = $input.first().json;
const lines = metrics.split('\n');
const stats = {};

lines.forEach(line => {
  if (line.startsWith('http_requests_total')) {
    stats.requests_total = parseInt(line.split(' ')[1]);
  }
  if (line.startsWith('http_requests_success')) {
    stats.requests_success = parseInt(line.split(' ')[1]);
  }
  if (line.startsWith('http_requests_error')) {
    stats.requests_error = parseInt(line.split(' ')[1]);
  }
});

return [{json: {
  date: $now.format('yyyy-MM-dd'),
  ...stats,
  success_rate: ((stats.requests_success / stats.requests_total) * 100).toFixed(2) + '%'
}}];

// Gmail HTML Template
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #7c3aed; color: white; }
</style></head>
<body>
  <h2>📊 Resume Site Daily Report ({{ $json.date }})</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Requests</td><td>{{ $json.requests_total }}</td></tr>
    <tr><td>Successful</td><td>{{ $json.requests_success }}</td></tr>
    <tr><td>Errors</td><td>{{ $json.requests_error }}</td></tr>
    <tr><td>Success Rate</td><td>{{ $json.success_rate }}</td></tr>
  </table>
  <p>🔗 <a href="https://resume.jclee.me">Visit Site</a> |
     <a href="https://grafana.jclee.me/d/resume">Grafana Dashboard</a></p>
</body>
</html>
```

---

## 🔧 Available n8n Nodes for Resume Monitoring

### Core Nodes Used
1. **HTTP Request** (`nodes-base.httpRequest`) - API calls to `/health`, `/metrics`, `/api/vitals`
2. **Slack** (`nodes-base.slack`) - Alert notifications
3. **Google Sheets** (`nodes-base.googleSheets`) - Data logging and aggregation
4. **Schedule Trigger** (`nodes-base.scheduleTrigger`) - Cron-based automation
5. **Webhook** (`nodes-base.webhook`) - Receive GitHub Actions events
6. **Gmail** (`nodes-base.gmail`) - Daily reports
7. **Code** (`nodes-base.code`) - Custom JavaScript for data processing
8. **IF** (`nodes-base.if`) - Conditional branching

### Integration Pattern
```
External Event (GitHub/Browser)
  ↓
Webhook (n8n)
  ↓
Data Processing (Code Node)
  ↓
Conditional Logic (IF Node)
  ↓
[Branch 1: Alert] → Slack
  ↓
[Branch 2: Logging] → Google Sheets
  ↓
[Branch 3: Observability] → Loki
```

---

## 🚀 Implementation Roadmap

### Phase 1: Basic Monitoring (Week 1)
- [ ] Create Workflow 1 (Site Health Monitor)
- [ ] Set up Google Sheets for downtime logs
- [ ] Configure Slack webhook for `#infra-alerts`
- [ ] Test with manual site downtime

**Success Criteria**: Receive Slack alert within 5 minutes of site down.

### Phase 2: Deployment Integration (Week 2)
- [ ] Create Workflow 2 (GitHub Deployment Webhook)
- [ ] Update `.github/workflows/deploy.yml/deploy.yml` with n8n webhook
- [ ] Add deployment notifications to Slack `#deployments`
- [ ] Forward deployment logs to Loki

**Success Criteria**: Slack notification on every GitHub Actions deployment.

### Phase 3: Performance Analytics (Week 3)
- [ ] Create Workflow 3 (Web Vitals Analytics)
- [ ] Update `typescript/portfolio-worker/index.html` to POST vitals to n8n
- [ ] Set up Google Sheets for daily vitals aggregation
- [ ] Configure performance alerts (LCP > 2.5s)

**Success Criteria**: Receive performance alert when LCP exceeds 2.5s.

### Phase 4: Reporting Automation (Week 4)
- [ ] Create Workflow 4 (Daily Performance Report)
- [ ] Design HTML email template
- [ ] Schedule daily reports at 09:00 KST
- [ ] Create Grafana dashboard using n8n logs

**Success Criteria**: Daily email with 24h metrics summary.

---

## 📈 Expected Outcomes

**Before Automation**:
- ❌ Manual health checks via `curl`
- ❌ No deployment notifications
- ❌ Zero Web Vitals collection
- ❌ No performance trend analysis

**After Automation**:
- ✅ Automated 5-minute health checks
- ✅ Real-time deployment notifications
- ✅ Web Vitals collection and alerting
- ✅ Daily performance trend reports
- ✅ Centralized observability in Grafana

**Projected Metrics** (After 1 month):
- Health checks: ~8,640 (5-min intervals × 30 days)
- Web Vitals samples: ~500+ (depends on traffic)
- Downtime alerts: <5 (target: 99.9% uptime)
- Performance alerts: <10 (target: 95% good vitals)

---

## 🔗 Resources

**n8n Templates Used**:
1. [Health Check with Google Sheets & Telegram](https://n8n.io/workflows/3352)
2. [Multiple Websites Monitoring](https://n8n.io/workflows/4833)
3. [Server Uptime Monitoring](https://n8n.io/workflows/3880)

**n8n Server**: https://n8n.jclee.me
**Documentation**: `~/apps/resume/docs/`
**Grafana Dashboard**: https://grafana.jclee.me/d/resume (to be created)

**Node Documentation**:
```bash
# Search available nodes
mcp__n8n-mcp__search_nodes({ query: "http request" })
mcp__n8n-mcp__search_nodes({ query: "slack" })
mcp__n8n-mcp__search_nodes({ query: "webhook" })

# Get node details
mcp__n8n-mcp__get_node_info({ nodeType: "nodes-base.httpRequest" })
mcp__n8n-mcp__get_node_info({ nodeType: "nodes-base.slack" })
```

---

**Last Updated**: 2025-11-18 23:25 KST
**Next Steps**: Implement Phase 1 (Site Health Monitor)
