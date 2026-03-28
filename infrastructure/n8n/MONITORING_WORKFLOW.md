# Resume Infrastructure Monitoring Workflow

n8n workflow for automated monitoring of resume portfolio infrastructure.

## Overview

This workflow provides continuous monitoring of the resume portfolio infrastructure. It performs health checks, validates metrics endpoints, and verifies SSH connectivity on an hourly basis.

**File**: `resume-monitoring-workflow.json`

## Architecture

Following the infrastructure pattern documented in the main README:

- n8n Docker container (192.168.50.110:5678) **cannot reach HTTPS directly**
- All HTTP checks run via **SSH to jclee-dev (192.168.50.200)**
- SSH credentials stored in n8n, outbound SSH allowed

## Features

- **Health Checks**: Tests portfolio site availability via SSH curl every hour
- **Metrics Validation**: Verifies Prometheus metrics endpoint via SSH
- **SSH Connectivity**: Validates SSH access to automation server
- **Aggregated Reporting**: Combines all test results with scoring
- **Telegram Notifications**: Alerts on pass/fail with detailed results

## Workflow Structure

### Triggers

| Trigger         | Schedule   | Purpose                             |
| --------------- | ---------- | ----------------------------------- |
| Manual Trigger  | On-demand  | Run monitoring manually for testing |
| Hourly Schedule | Every hour | Continuous monitoring               |

### Test Nodes

#### 1. Health Check via SSH

- **Type**: SSH node → jclee@192.168.50.200
- **Command**: `curl -s -w '\n%{http_code}' --max-time 10 https://resume.jclee.me/health`
- **Parse**: Extract HTTP status code and JSON body
- **Pass Criteria**: Status 200 + body.status === 'healthy'

#### 2. Metrics via SSH

- **Type**: SSH node → jclee@192.168.50.200
- **Command**: `curl -s -w '\n%{http_code}' --max-time 10 https://resume.jclee.me/metrics | head -20`
- **Parse**: Check for `http_requests_total` in output
- **Pass Criteria**: Status 200 + contains metrics data

#### 3. SSH Connectivity

- **Type**: SSH node → jclee@192.168.50.200
- **Command**: `echo 'SSH connectivity test'`
- **Pass Criteria**: Exit code 0, no error

### Flow

```
Trigger (Manual or Schedule)
    ├──→ [Test] Health Check via SSH ──→ [Parse] Health Result ──┐
    ├──→ [Test] Metrics via SSH ───────→ [Parse] Metrics Result ─┼→ [Monitor] Aggregate Results
    └──→ [Test] SSH Connectivity ──────→ [Parse] SSH Result ─────┘
                    ↓
         [Monitor] Format Report
                    ↓
         [Monitor] All Passed? (IF)
              ├── Yes → Telegram Success
              └── No  → Telegram Alert
```

## Scoring

- **Pass Threshold**: 80% (0.8)
- **Individual Tests**: Pass/Fail
- **Overall Score**: Percentage of passed tests

## Configuration

### Required Credentials

Configure these in n8n before activating:

| Credential                 | Type            | Purpose                           |
| -------------------------- | --------------- | --------------------------------- |
| `<SSH_CREDENTIAL_ID>`      | `sshPrivateKey` | SSH to jclee-dev (192.168.50.200) |
| `<TELEGRAM_CREDENTIAL_ID>` | `telegramApi`   | Notification delivery             |
| `<TELEGRAM_CHAT_ID>`       | String          | Target chat/channel               |

## Deployment

### Import to n8n

```bash
# Via API
curl -X POST https://n8n.jclee.me/api/v1/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @resume-monitoring-workflow.json
```

### Activate

1. Import workflow JSON to n8n
2. Configure SSH and Telegram credentials
3. Test with Manual Trigger
4. Activate workflow

## Notifications

### Success Message

```
✅ Resume Monitoring Passed

Score: 1.00 (3/3 tests)
Time(KST): 2026-03-28 10:30:00

All systems operational!
```

### Failure Message

```
⚠️ Resume Monitoring Failed

Score: 0.67 (2/3 tests)
Time(KST): 2026-03-28 10:30:00

Failed Tests:
• health
• ssh
```

## Integration with Main Workflow

This monitoring workflow complements the main `resume-unified-workflow.json`:

| Workflow                          | Purpose                   | Frequency        |
| --------------------------------- | ------------------------- | ---------------- |
| `resume-unified-workflow.json`    | Production automation     | Varies by module |
| `resume-monitoring-workflow.json` | Infrastructure monitoring | Hourly           |
| `resume-error-workflow.json`      | Error handling            | On failure       |

## Network Architecture

```
n8n Docker (192.168.50.110:5678)
    └── SSH ──→ jclee-dev (192.168.50.200)
                    └── curl ──→ https://resume.jclee.me
```

**Note**: Direct HTTPS from n8n container is blocked. All checks route through jclee-dev via SSH.

## Troubleshooting

### Tests Failing

1. **SSH Connection**: Verify SSH credential works for `jclee@192.168.50.200`
2. **Health Check**: On jclee-dev, run `curl https://resume.jclee.me/health`
3. **Metrics**: On jclee-dev, run `curl https://resume.jclee.me/metrics`

### No Telegram Notifications

- Verify Telegram credential configured
- Check `<TELEGRAM_CHAT_ID>` is correct
- Ensure bot has access to target chat

## Related Documentation

- [n8n README](./README.md) - Main n8n workflow documentation
- [Infrastructure Guide](../../docs/guides/INFRASTRUCTURE.md)
- [Monitoring Setup](../../docs/guides/MONITORING_SETUP.md)
