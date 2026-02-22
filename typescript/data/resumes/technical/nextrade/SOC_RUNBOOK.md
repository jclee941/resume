# Security Operations Center (SOC) Runbook
## Nextrade Securities Exchange

**Document Classification**: Internal Use
**Version**: 1.0
**Last Updated**: 2025-10-16
**Owner**: Security Operations Team
**Shift Coverage**: 24/7/365 (3 shifts × 2 analysts)

---

## Table of Contents

1. [SOC Overview](#soc-overview)
2. [Daily Operations](#daily-operations)
3. [Alert Triage Procedures](#alert-triage-procedures)
4. [Common Investigation Playbooks](#common-investigation-playbooks)
5. [Tool Reference Guide](#tool-reference-guide)
6. [Escalation Procedures](#escalation-procedures)
7. [Shift Handover](#shift-handover)

---

## SOC Overview

### Mission Statement

"Monitor, detect, analyze, and respond to security threats 24/7 to protect Nextrade's trading platform, customer data, and infrastructure from cyber attacks while maintaining 99.95% availability."

### Team Structure

**Shift Schedule** (8-hour shifts):
- **Day Shift**: 09:00-17:00 KST (2 analysts)
- **Swing Shift**: 17:00-01:00 KST (2 analysts)
- **Night Shift**: 01:00-09:00 KST (2 analysts)

**Roles**:
- **SOC Analyst L1**: Alert triage, initial investigation, escalation
- **SOC Analyst L2**: Deep investigation, threat hunting, playbook execution
- **Security Lead** (On-Call): Incident commander, executive escalation

### Key Performance Indicators (KPIs)

| Metric | Target | Current (2025 Q3) |
|--------|--------|-------------------|
| Mean Time To Detect (MTTD) | < 5 minutes | 3.2 minutes ✅ |
| Mean Time To Respond (MTTR) | < 30 minutes | 27 minutes ✅ |
| Alert Triage Time (P1) | < 15 minutes | 12 minutes ✅ |
| False Positive Rate | < 30% | 33% ⚠️ (improvement needed) |
| SLA Compliance (P1) | > 95% | 95% ✅ |
| Incident Escalation Accuracy | > 90% | 92% ✅ |

---

## Daily Operations

### Shift Start Checklist (First 15 minutes)

```bash
#!/bin/bash
# /opt/soc/scripts/shift-start-checklist.sh

echo "========== SOC Shift Start Checklist =========="
echo "Analyst: $(whoami)"
echo "Shift: $1"  # day, swing, night
echo "Date: $(date)"
echo "==============================================="

# 1. Review handover notes from previous shift
cat /var/log/soc/handover/$(date +%Y%m%d).md

# 2. Check all monitoring systems are operational
echo "[✓] Checking SIEM (Splunk)..."
curl -sf https://siem.nextrade.local:8089/services/server/info || echo "[✗] SIEM DOWN!"

echo "[✓] Checking EDR (CrowdStrike)..."
curl -sf https://api.crowdstrike.com/health || echo "[✗] EDR API DOWN!"

echo "[✓] Checking Firewall (Fortigate)..."
ssh admin@fw-core-01 "get system status" || echo "[✗] Firewall unreachable!"

echo "[✓] Checking NAC (Genian)..."
curl -sf https://nac.nextrade.local/api/health || echo "[✗] NAC DOWN!"

# 3. Review overnight alerts (if day shift)
if [ "$1" == "day" ]; then
  splunk search 'index=* earliest=-8h priority=high OR priority=critical | stats count by alert_name, priority | sort -count'
fi

# 4. Check open incidents
curl -sf https://servicenow.nextrade.local/api/now/table/incident?sysparm_query=state!=7 | jq '.result | length'

# 5. Review threat intelligence feed
curl -sf https://api.recordedfuture.com/v2/alerts?since=-24h | jq '.data | length'

echo "==============================================="
echo "Checklist Complete. Ready for shift."
```

**Run daily**:
```bash
/opt/soc/scripts/shift-start-checklist.sh day
```

---

### Hourly Tasks

**Every Hour on the Hour**:

1. **Check Alert Queue** (5 minutes)
   ```bash
   splunk search 'index=alerts status=new | stats count by severity' -maxout 100
   ```
   - Expected: < 50 new alerts per hour
   - Action: Triage all new alerts within 1 hour

2. **Verify Critical Services** (3 minutes)
   ```bash
   # Trading platform health
   curl -f http://trade-match-01:8080/health
   curl -f http://trade-router-01:8080/health

   # Database connectivity
   psql -h db-customer-01 -U monitor -c "SELECT 1;" > /dev/null && echo "DB OK"
   ```

3. **Review Firewall Blocks** (2 minutes)
   ```bash
   splunk search 'index=firewall action=denied earliest=-1h | stats count by src_ip | sort -count | head 20'
   ```
   - Expected: < 1000 blocks/hour
   - Action: Investigate if single IP > 100 blocks

---

### Daily Tasks

**Morning (09:00-10:00)**:

1. **Daily Security Metrics Report** (15 minutes)
   ```bash
   python3 /opt/soc/scripts/daily-metrics-report.py --date $(date +%Y-%m-%d)
   ```
   **Output**: `/var/log/soc/reports/daily-metrics-$(date +%Y%m%d).pdf`

   **Metrics Included**:
   - Total alerts (24 hours)
   - True positives vs. false positives
   - Top alert types
   - Incident response time (P0/P1/P2)
   - SLA compliance

   **Distribution**: Email to Security Lead + CISO

2. **Vulnerability Scan Review** (30 minutes)
   ```bash
   # Check for new critical/high vulnerabilities
   nessus-cli report --severity critical,high --discovered-since "-24h"
   ```

   **Action Items**:
   - Create ServiceNow tickets for Critical (P1, 7-day SLA)
   - Create ServiceNow tickets for High (P2, 14-day SLA)
   - Notify system owners

3. **Threat Intelligence Review** (15 minutes)
   ```bash
   # Check for new IOCs (Indicators of Compromise)
   curl -sf https://api.recordedfuture.com/v2/iocs?since=-24h | jq '.data[] | select(.risk_score > 80)'

   # Update firewall blocklist
   python3 /opt/soc/scripts/update-ioc-blocklist.py --source recorded-future
   ```

**Afternoon (14:00-15:00)**:

4. **Log Health Check** (20 minutes)
   ```bash
   # Verify all log sources are sending data
   splunk search 'index=* earliest=-1h | stats count by host, sourcetype | where count < 100'
   ```

   **Expected**: All critical systems logging (150+ hosts)

   **Action**: If host missing, investigate:
   ```bash
   # Check if host is online
   ping -c 5 $MISSING_HOST

   # Check log forwarder service
   ssh $MISSING_HOST "systemctl status splunk-forwarder"

   # Check network connectivity to SIEM
   ssh $MISSING_HOST "telnet siem.nextrade.local 9997"
   ```

5. **User Activity Anomaly Review** (30 minutes)
   ```bash
   # Check for unusual user behavior
   splunk search 'index=* earliest=-24h | stats count by user, action | where count > 1000 | sort -count'

   # Check for after-hours privileged access
   splunk search 'index=pam earliest=-24h date_hour>=19 OR date_hour<=7 | stats count by user, host'
   ```

**Evening (17:00-18:00)**:

6. **Prepare Handover Notes** (15 minutes)
   ```markdown
   # SOC Shift Handover - $(date +%Y-%m-%d) Day Shift

   ## Summary
   - Total Alerts: [X]
   - True Positives: [X]
   - False Positives: [X]
   - Open Incidents: [X]

   ## Ongoing Investigations
   1. [INC-XXXX] Brute force attack from IP X.X.X.X (assigned to: Analyst Name)
      - Status: Containment complete, monitoring for 24h
      - Next Action: Close ticket if no recurrence by $(date -d '+1 day' +%Y-%m-%d)

   2. [INC-YYYY] DLP violation by user@nextrade.com
      - Status: Investigation in progress
      - Next Action: Interview user tomorrow

   ## Issues/Concerns
   - SIEM ingestion delay (30 min) for firewall logs (opened ticket with vendor)
   - NAC quarantine VLAN full (95% capacity) - requested IP expansion

   ## Action Items for Next Shift
   - [ ] Follow up on [INC-XXXX] at 18:00
   - [ ] Review vulnerability scan results (scheduled at 19:00)
   ```

---

## Alert Triage Procedures

### Alert Prioritization Matrix

| Alert Source | Severity | Triage Time | Assignment |
|--------------|----------|-------------|------------|
| EDR (Malware Detected) | Critical | < 5 minutes | L2 (immediate) |
| SIEM (Correlation Rule) | High | < 15 minutes | L1 → L2 if confirmed |
| Firewall (IPS Block) | Medium | < 1 hour | L1 |
| DLP (Policy Violation) | Medium | < 1 hour | L1 |
| NAC (Non-Compliant Device) | Low | < 4 hours | L1 |

### Triage Workflow

```
New Alert
  ├─> [1] Acknowledge (update status to "In Progress")
  ├─> [2] Gather Context
  │     ├─> User information (who)
  │     ├─> Asset information (what)
  │     ├─> Time/Location (when/where)
  │     └─> Related alerts (correlation)
  ├─> [3] Initial Assessment
  │     ├─> True Positive → Escalate to L2
  │     ├─> False Positive → Document reason, close
  │     └─> Needs More Info → Investigate further
  └─> [4] Document & Update Ticket
```

### Step-by-Step Triage Example

**Alert**: "Malware detected on endpoint WIN-USER-123"

```bash
# Step 1: Acknowledge alert in SIEM
splunk alert ack --alert-id 12345

# Step 2: Gather context
# 2a. User information
ldapsearch -x -b "dc=nextrade,dc=com" "(sAMAccountName=jdoe)" mail manager department

# 2b. Asset information
curl -sf https://cmdb.nextrade.local/api/assets/WIN-USER-123 | jq '.owner, .location, .criticality'

# 2c. EDR telemetry
crowdstrike-cli get-detections --host WIN-USER-123 --limit 10

# 2d. Related alerts (last 24 hours)
splunk search 'index=* host=WIN-USER-123 earliest=-24h | stats count by alert_name'

# Step 3: Initial assessment
# Check malware file hash reputation
curl -sf https://www.virustotal.com/api/v3/files/$FILE_HASH | jq '.data.attributes.last_analysis_stats'

# Decision tree:
if [ $DETECTION_COUNT -gt 40 ]; then
  echo "TRUE POSITIVE: Confirmed malware (40+ AV detections)"
  VERDICT="true_positive"
  SEVERITY="high"
  ESCALATE="yes"
elif [ $DETECTION_COUNT -lt 5 ]; then
  echo "LIKELY FALSE POSITIVE: Low AV detections"
  VERDICT="false_positive"
  SEVERITY="low"
  ESCALATE="no"
else
  echo "NEEDS INVESTIGATION: Ambiguous (5-40 detections)"
  VERDICT="unknown"
  SEVERITY="medium"
  ESCALATE="yes"  # Escalate to L2 for deeper analysis
fi

# Step 4: Document in ServiceNow
curl -X POST https://servicenow.nextrade.local/api/now/table/incident \
  -d '{
    "short_description": "Malware detected on WIN-USER-123",
    "description": "EDR detected malware file: malware.exe (SHA256: abc123...)\nUser: jdoe@nextrade.com\nVerdict: '"$VERDICT"'\nVirustotal: '"$DETECTION_COUNT"' detections",
    "severity": "'"$SEVERITY"'",
    "assigned_to": "soc-l2-team",
    "category": "Security"
  }'
```

---

## Common Investigation Playbooks

### Playbook 1: Brute Force Attack Investigation

**Trigger**: Multiple failed login attempts (5+ in 10 minutes)

**Investigation Steps**:

```bash
# 1. Identify attack details
ATTACKED_USER="admin@nextrade.com"
START_TIME="2025-10-16 14:00:00"

# 2. Query failed logins
splunk search "index=windows_events EventCode=4625 user=$ATTACKED_USER earliest=\"$START_TIME\" | stats count by src_ip | sort -count"

# 3. Attacker IP analysis
ATTACKER_IP=$(splunk search "index=windows_events EventCode=4625 user=$ATTACKED_USER earliest=\"$START_TIME\" | head 1 | table src_ip" -output csv)

# GeoIP lookup
curl -sf "https://ipinfo.io/$ATTACKER_IP" | jq '.country, .city, .org'

# Threat intel check
curl -sf "https://api.abuseipdb.com/api/v2/check?ipAddress=$ATTACKER_IP" -H "Key: $ABUSEIPDB_API_KEY" | jq '.data.abuseConfidenceScore'

# 4. Check if attack succeeded
splunk search "index=windows_events EventCode=4624 user=$ATTACKED_USER src_ip=$ATTACKER_IP earliest=\"$START_TIME\""

# 5. Response actions
if [ $SUCCESSFUL_LOGIN ]; then
  # Account compromised - immediate response
  echo "CRITICAL: Account compromised!"

  # Disable account
  Disable-ADAccount -Identity "$ATTACKED_USER"

  # Force password reset
  Reset-ADAccountPassword -Identity "$ATTACKED_USER" -NewPassword (ConvertTo-SecureString "Temp123!" -AsPlainText -Force)

  # Terminate active sessions
  quser "$ATTACKED_USER" /server:DC-01 | awk '{print $3}' | xargs -I {} logoff {} /server:DC-01

  # Block attacker IP on firewall
  python3 /opt/soc/scripts/firewall-block-ip.py --ip $ATTACKER_IP --duration 24h --reason "brute-force-attack"

  # Escalate to Security Lead
  python3 /opt/soc/scripts/send-alert.py --severity P1 --message "Account compromised: $ATTACKED_USER from $ATTACKER_IP"
else
  # Attack failed - preventive response
  echo "Attack unsuccessful. Implementing preventive measures."

  # Temporary IP block (30 minutes)
  python3 /opt/soc/scripts/firewall-block-ip.py --ip $ATTACKER_IP --duration 30m --reason "failed-login-attempts"

  # Enable MFA for user (if not already enabled)
  Set-ADUser -Identity "$ATTACKED_USER" -Replace @{msDS-UserPasswordExpiry=(Get-Date).AddDays(-1)}  # Force password change at next login
fi

# 6. Documentation
cat > /var/log/soc/investigations/brute-force-$(date +%Y%m%d-%H%M%S).md <<EOF
# Brute Force Investigation

**Incident ID**: INC-$(date +%Y%m%d-%H%M%S)
**Analyst**: $(whoami)
**Time**: $(date)

## Summary
- Target User: $ATTACKED_USER
- Attacker IP: $ATTACKER_IP
- Failed Attempts: $(echo $FAILED_LOGIN_COUNT)
- Successful Login: $(echo $SUCCESSFUL_LOGIN)

## GeoIP
- Country: $(curl -s "https://ipinfo.io/$ATTACKER_IP" | jq -r '.country')
- City: $(curl -s "https://ipinfo.io/$ATTACKER_IP" | jq -r '.city')

## Response Actions
- [x] IP blocked on firewall
- [x] User account secured
- [x] Incident ticket created (INC-XXXX)
- [x] Security Lead notified

## Recommendations
- Implement account lockout policy (5 attempts in 10 min → 30 min lockout)
- Enable MFA for all privileged accounts
EOF
```

---

### Playbook 2: Phishing Email Investigation

**Trigger**: Email flagged by user or email gateway

```bash
# 1. Retrieve email from quarantine or user mailbox
EMAIL_ID="<message-id@sender.com>"

# Get email headers and body
proofpoint-cli get-email --message-id "$EMAIL_ID" -output /tmp/phishing-email.eml

# 2. Extract IOCs (Indicators of Compromise)
# Sender email
SENDER=$(grep "From:" /tmp/phishing-email.eml | awk '{print $2}')

# URLs
grep -oP 'https?://[^\s]+' /tmp/phishing-email.eml > /tmp/phishing-urls.txt

# Attachments (file hashes)
munpack /tmp/phishing-email.eml -C /tmp/attachments/
find /tmp/attachments/ -type f -exec sha256sum {} \; > /tmp/attachment-hashes.txt

# 3. Analyze URLs (VirusTotal, URLhaus)
while read URL; do
  echo "Checking: $URL"
  curl -sf "https://www.virustotal.com/api/v3/urls/$(echo -n $URL | base64 -w0)" \
    -H "x-apikey: $VT_API_KEY" | jq '.data.attributes.last_analysis_stats'
done < /tmp/phishing-urls.txt

# 4. Analyze attachments (VirusTotal, Sandbox)
while read HASH; do
  echo "Checking hash: $HASH"
  curl -sf "https://www.virustotal.com/api/v3/files/$HASH" \
    -H "x-apikey: $VT_API_KEY" | jq '.data.attributes.last_analysis_stats'
done < /tmp/attachment-hashes.txt

# 5. Check if other users received same email
proofpoint-cli search --sender "$SENDER" --days 7 | jq '.recipients[]'

# 6. Check if any user clicked the link or opened attachment
splunk search "index=proxy earliest=-7d url IN ($(cat /tmp/phishing-urls.txt)) | stats count by user"
splunk search "index=dlp earliest=-7d file_hash IN ($(cat /tmp/attachment-hashes.txt)) | stats count by user"

# 7. Response actions
# 7a. Delete email from all user mailboxes
proofpoint-cli delete-email --message-id "$EMAIL_ID" --all-recipients

# 7b. Block sender on email gateway
proofpoint-cli block-sender --email "$SENDER" --reason "phishing"

# 7c. Block URLs on typescript/portfolio-worker proxy
while read URL; do
  zscaler-cli block-url --url "$URL" --category "phishing" --duration "permanent"
done < /tmp/phishing-urls.txt

# 7d. Block file hashes on EDR
while read HASH; do
  crowdstrike-cli block-hash --sha256 "$HASH" --description "phishing-attachment"
done < /tmp/attachment-hashes.txt

# 7e. Send awareness email to all users
cat > /tmp/phishing-awareness-email.html <<EOF
<html>
<body>
<h2>Security Alert: Phishing Email Detected</h2>
<p>A phishing email was detected and removed from your inbox:</p>
<ul>
  <li><strong>Subject:</strong> $(grep "Subject:" /tmp/phishing-email.eml | cut -d: -f2-)</li>
  <li><strong>Sender:</strong> $SENDER</li>
</ul>
<p><strong>Action Required:</strong> If you clicked any links or opened attachments, please contact IT Security immediately at security@nextrade.com or 1588-XXXX.</p>
<p>Thank you,<br>IT Security Team</p>
</body>
</html>
EOF

python3 /opt/soc/scripts/send-bulk-email.py \
  --recipients all-users@nextrade.com \
  --subject "[SECURITY ALERT] Phishing Email Detected" \
  --body-html /tmp/phishing-awareness-email.html
```

---

### Playbook 3: Suspicious Outbound Traffic Investigation

**Trigger**: Large data transfer to unknown external IP

```bash
# 1. Identify traffic details
SUSPICIOUS_IP="203.0.113.50"
INTERNAL_HOST="10.0.20.45"
START_TIME="2025-10-16 14:00:00"

# 2. Query firewall logs
splunk search "index=firewall src_ip=$INTERNAL_HOST dst_ip=$SUSPICIOUS_IP earliest=\"$START_TIME\" | stats sum(bytes_out) as total_bytes, count by dst_port"

# 3. Identify internal host and user
# Get hostname from IP
nslookup $INTERNAL_HOST

# Get logged-in user
psexec \\$INTERNAL_HOST query user

# 4. Analyze destination IP
# GeoIP
curl -sf "https://ipinfo.io/$SUSPICIOUS_IP" | jq '.country, .city, .org'

# Threat intel
curl -sf "https://api.abuseipdb.com/api/v2/check?ipAddress=$SUSPICIOUS_IP" -H "Key: $ABUSEIPDB_API_KEY"

# Reverse DNS
dig -x $SUSPICIOUS_IP

# 5. Check for data exfiltration indicators
# Large file transfers
splunk search "index=dlp src_host=$INTERNAL_HOST earliest=\"$START_TIME\" | stats sum(file_size) as total_size by user, file_name"

# Unusual protocols (e.g., DNS tunneling, ICMP exfiltration)
splunk search "index=firewall src_ip=$INTERNAL_HOST protocol!=TCP AND protocol!=UDP earliest=\"$START_TIME\""

# 6. EDR investigation (process tree, network connections)
crowdstrike-cli get-process-tree --host $INTERNAL_HOST --start-time "$START_TIME"
crowdstrike-cli get-network-connections --host $INTERNAL_HOST --start-time "$START_TIME" | grep $SUSPICIOUS_IP

# 7. Response actions
if [ $MALICIOUS_CONFIRMED ]; then
  # Immediate containment
  echo "CRITICAL: Data exfiltration confirmed!"

  # Isolate endpoint from network
  crowdstrike-cli contain --host $INTERNAL_HOST
  ansible-playbook /opt/ansible/quarantine-endpoint.yml -e "hostname=$INTERNAL_HOST"

  # Block destination IP on firewall
  python3 /opt/soc/scripts/firewall-block-ip.py --ip $SUSPICIOUS_IP --duration permanent --reason "data-exfiltration"

  # Disable user account
  COMPROMISED_USER=$(psexec \\$INTERNAL_HOST query user | awk 'NR==2{print $1}')
  Disable-ADAccount -Identity "$COMPROMISED_USER"

  # Collect forensics
  ansible-playbook /opt/ansible/collect-memory-dump.yml -e "target_host=$INTERNAL_HOST"
  veeam-cli snapshot create --vm $INTERNAL_HOST --retention 90d --immutable true

  # Escalate to Security Lead (P0)
  python3 /opt/soc/scripts/send-alert.py --severity P0 --message "Data exfiltration detected: $INTERNAL_HOST → $SUSPICIOUS_IP"
fi
```

---

## Tool Reference Guide

### SIEM (Splunk) Quick Reference

**Common Searches**:

```spl
# Failed logins (last 1 hour)
index=windows_events EventCode=4625 earliest=-1h | stats count by user, src_ip | sort -count

# Firewall blocks by country
index=firewall action=denied | iplocation src_ip | stats count by Country | sort -count

# Top talkers (network bandwidth)
index=firewall | stats sum(bytes_out) as total_bytes by src_ip | sort -total_bytes | head 20

# Malware detections
index=edr event_type=detection | stats count by malware_family, host | sort -count

# Privileged access audit
index=pam earliest=-24h | stats count by user, host, command | where command IN ("sudo su", "rm -rf", "drop database")

# DLP violations
index=dlp severity=high earliest=-7d | stats count by user, policy | sort -count

# Anomaly detection (unusual login times)
index=windows_events EventCode=4624 | eval hour=strftime(_time, "%H") | where hour < 6 OR hour > 20 | stats count by user, hour

# Data exfiltration (large file transfers)
index=dlp action=block earliest=-24h | stats sum(file_size) as total_mb by user | eval total_mb=total_mb/1024/1024 | where total_mb > 100 | sort -total_mb
```

**Alert Management**:
```bash
# List all active alerts
splunk search 'index=alerts status=active | stats count by alert_name, severity'

# Acknowledge alert
splunk alert ack --alert-id 12345 --comment "Investigating..."

# Close alert
splunk alert close --alert-id 12345 --resolution "false_positive" --comment "Known safe activity"
```

---

### EDR (CrowdStrike) Quick Reference

**Common CLI Commands**:

```bash
# Get detections for specific host
crowdstrike-cli get-detections --host WIN-USER-123 --limit 10

# Get process tree
crowdstrike-cli get-process-tree --host WIN-USER-123 --process-id 1234

# Network connections
crowdstrike-cli get-network-connections --host WIN-USER-123 --start-time "2025-10-16 14:00:00"

# Contain/isolate endpoint
crowdstrike-cli contain --host WIN-USER-123

# Release from containment
crowdstrike-cli lift-containment --host WIN-USER-123

# Run custom script
crowdstrike-cli run-script --host WIN-USER-123 --script-name "collect-evidence.ps1"

# Download suspicious file
crowdstrike-cli download-file --host WIN-USER-123 --file-path "C:\Temp\malware.exe" --output /tmp/evidence/

# Block file hash
crowdstrike-cli block-hash --sha256 abc123... --description "confirmed-malware"
```

---

### Firewall (Fortigate) Quick Reference

**Common CLI Commands**:

```bash
# Show current firewall policy
ssh admin@fw-core-01 "show firewall policy"

# Show blocked IPs (last 100)
ssh admin@fw-core-01 "execute log filter category traffic; execute log filter field action deny; execute log display"

# Block IP address
ssh admin@fw-core-01 "config firewall address
  edit blacklist-203.0.113.50
    set type iprange
    set start-ip 203.0.113.50
    set end-ip 203.0.113.50
  next
end

config firewall policy
  edit 1
    set srcaddr blacklist-203.0.113.50
    set action deny
  next
end"

# Show current sessions
ssh admin@fw-core-01 "get system session list"

# Show top talkers
ssh admin@fw-core-01 "diagnose sys top-summary"

# View IPS alerts
ssh admin@fw-core-01 "execute log filter category ips; execute log display"
```

---

## Escalation Procedures

### When to Escalate

**Immediate Escalation to Security Lead** (Phone call):
- P0/P1 incidents (malware outbreak, data breach, system outage)
- Regulatory reportable events (FSC notification required)
- Executive account compromise
- Trading platform security event
- Media/PR involving security

**Escalation to Security Lead** (Email/Chat):
- P2 incidents requiring decision (e.g., block entire country, take system offline)
- Pattern of related incidents (potential campaign)
- Unclear severity (need guidance)
- Resource request (vendor support, budget approval)

**Escalation to CISO** (via Security Lead):
- Confirmed data breach (customer PII/financial data)
- Ransomware encryption
- Nation-state APT activity
- Regulatory investigation/audit
- Legal holds or law enforcement requests

### Escalation Template

**Subject**: [P0/P1/P2] [Brief Description] - Immediate Attention Required

**Body**:
```
CLASSIFICATION: CONFIDENTIAL
INCIDENT ID: INC-20251016-001
SEVERITY: P1 (High)
STATUS: Investigation in Progress

SUMMARY:
[1-2 sentences describing the incident]

TIMELINE:
14:00 - Initial detection (EDR alert)
14:05 - Triage completed, confirmed true positive
14:10 - Endpoint isolated from network
14:15 - Security Lead notified (escalation)

BUSINESS IMPACT:
- Affected Systems: [List]
- Customer Impact: [Yes/No, number]
- Data at Risk: [PII / Financial / None]
- Service Availability: [Normal / Degraded / Down]

ACTIONS TAKEN:
1. [Action 1]
2. [Action 2]
3. [Action 3]

REQUESTED DECISION/SUPPORT:
- [Specific request, e.g., "Approve blocking all traffic from China?"]

ANALYST: [Your Name]
CONTACT: [Your Phone]
WAR ROOM: [Teams link if active]
```

---

## Shift Handover

### Handover Template

**File**: `/var/log/soc/handover/$(date +%Y%m%d)-swing.md`

```markdown
# SOC Shift Handover - 2025-10-16 Swing Shift (17:00-01:00)

## Summary
- **Total Alerts**: 150
- **True Positives**: 5 (3.3%)
- **False Positives**: 145 (96.7%)
- **Open Incidents**: 3
- **Escalations**: 1 (P1)

## Ongoing Incidents

### INC-20251016-001 (P1) - Brute Force Attack
- **Status**: Contained
- **Assigned To**: SOC L2 Analyst (Jane Doe)
- **Description**: Brute force attack against admin@nextrade.com from 203.0.113.50 (Russia). 47 failed attempts, no successful login.
- **Actions Taken**:
  - [x] Blocked attacker IP on firewall (permanent)
  - [x] Forced password reset for admin@nextrade.com
  - [x] Enabled MFA
  - [ ] Monitor for 24h (until 2025-10-17 17:00)
- **Next Action**: Close ticket if no further activity by 2025-10-17 17:00

### INC-20251016-002 (P2) - DLP Violation
- **Status**: Investigation in Progress
- **Assigned To**: SOC L1 Analyst (John Smith)
- **Description**: Employee jsmith@nextrade.com attempted to email customer database export (5,000 records) to personal Gmail account. DLP blocked.
- **Actions Taken**:
  - [x] Blocked email
  - [x] Notified manager (approval pending for user interview)
  - [ ] User interview scheduled for 2025-10-17 09:00
- **Next Action**: Conduct interview with HR present

### INC-20251016-003 (P3) - NAC Quarantine
- **Status**: Remediation in Progress
- **Assigned To**: SOC L1 Analyst (Mike Lee)
- **Description**: 5 endpoints quarantined due to outdated Windows patches.
- **Actions Taken**:
  - [x] Notified users via email
  - [x] Sent patch instructions
  - [ ] Waiting for users to apply patches (24h window)
- **Next Action**: Re-scan endpoints at 2025-10-17 09:00

## Notable Events

1. **SIEM Ingestion Delay** (18:30-19:00)
   - Firewall logs delayed by 30 minutes
   - Cause: Network congestion
   - Resolution: Temporary, resolved by 19:00
   - Ticket: CHG-20251016-010 (opened with network team)

2. **High Alert Volume** (20:00-21:00)
   - 80 firewall IPS alerts in 1 hour (usual: 20-30/hour)
   - Cause: Port scan from 203.0.113.100
   - Resolution: IP blocked, scan stopped
   - No impact to business

3. **Vulnerability Scanner Failure** (22:00)
   - Nessus scan failed to start (scheduled daily at 22:00)
   - Cause: License expiration warning (valid for 30 more days)
   - Resolution: Notified procurement team, manual scan initiated
   - Ticket: INC-20251016-999

## System Health

| System | Status | Notes |
|--------|--------|-------|
| SIEM (Splunk) | ✅ OK | Indexing rate: 10GB/day |
| EDR (CrowdStrike) | ✅ OK | 300/300 endpoints reporting |
| Firewall (Fortigate) | ✅ OK | CPU: 45%, Memory: 62% |
| NAC (Genian) | ⚠️ WARNING | Quarantine VLAN 95% full (IP expansion requested) |
| DLP (Symantec) | ✅ OK | No issues |
| Backup (Veeam) | ✅ OK | Last backup: 2025-10-16 02:00 (success) |

## Action Items for Night Shift

- [ ] Monitor [INC-20251016-001] for recurrence (brute force attack)
- [ ] Follow up with network team on SIEM ingestion delay (ticket CHG-20251016-010)
- [ ] Review vulnerability scan results (manual scan started at 23:00, ETA 03:00)
- [ ] Check NAC quarantine VLAN capacity (currently 95%, expansion pending)

## Questions/Concerns

- NAC quarantine VLAN running out of IPs. Expansion request submitted but not yet approved. May need escalation if more endpoints need quarantine.
- Procurement team not responding to Nessus license renewal request (sent 2025-10-15). License expires 2025-11-16.

---
**Prepared By**: Jane Doe (Swing Shift SOC Analyst)
**Time**: 2025-10-16 00:45 KST
**Next Shift**: Night Shift (Mike Lee, Sarah Kim)
```

---

**Document Approval**:

- **Prepared By**: Jaecheol Lee, Security Lead
- **Reviewed By**: [CISO Name], Chief Information Security Officer
- **Approved By**: [Security Manager Name]

**Approval Date**: 2025-10-16
**Next Review**: 2026-01-16 (Quarterly)
