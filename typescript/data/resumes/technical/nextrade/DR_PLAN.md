# Disaster Recovery Plan (DR Plan)
## Nextrade Securities Exchange

**Document Classification**: Confidential
**Version**: 1.0
**Last Updated**: 2025-10-16
**Owner**: Information Security Team
**Approver**: CTO, CISO

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Scope & Objectives](#scope--objectives)
3. [Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)](#recovery-time-objectives-rto--recovery-point-objectives-rpo)
4. [Disaster Scenarios](#disaster-scenarios)
5. [Critical Systems Inventory](#critical-systems-inventory)
6. [Backup Strategy](#backup-strategy)
7. [Recovery Procedures](#recovery-procedures)
8. [Communication Plan](#communication-plan)
9. [Testing & Validation](#testing--validation)
10. [Appendix](#appendix)

---

## Executive Summary

This Disaster Recovery Plan outlines the procedures and processes to ensure business continuity for Nextrade Securities Exchange in the event of a disaster affecting IT infrastructure. The plan is designed to meet Financial Services Commission (FSC) requirements for securities exchanges and achieve the following objectives:

**Primary Goals**:
- **Trading Platform**: Resume operations within 4 hours (RTO: 4 hours, RPO: 15 minutes)
- **Customer Data**: Zero data loss for financial transactions (RPO: 0)
- **Regulatory Compliance**: Meet FSC business continuity requirements (99.95% availability)

**Disaster Recovery Sites**:
- **Primary Data Center**: Seoul, Korea (Main Operations)
- **DR Data Center**: Busan, Korea (250km separation)
- **Cloud DR**: AWS Seoul Region (Tertiary backup for critical databases)

**Annual Testing**: Quarterly DR drills mandatory per FSC regulations

---

## Scope & Objectives

### In-Scope Systems

1. **Critical (Tier 1)** - Must be recovered first
   - Trading matching engine
   - Order routing system
   - Market data feed
   - Customer database (PostgreSQL)
   - Core firewalls and network infrastructure

2. **Important (Tier 2)** - Recover within 8 hours
   - Web portal and API gateway
   - Risk management system
   - Settlement system
   - SIEM and security monitoring

3. **General (Tier 3)** - Recover within 24 hours
   - Email and collaboration tools
   - File servers
   - Internal applications
   - Development/test environments

### Out-of-Scope

- Third-party vendor systems (covered by vendor SLAs)
- Personal employee devices
- Guest networks

### Objectives

| Objective | Target | Current Performance |
|-----------|--------|---------------------|
| **RTO (Trading Platform)** | 4 hours | 2.5 hours (last drill) |
| **RPO (Trading Data)** | 15 minutes | 5 minutes (real-time replication) |
| **RTO (Web Portal)** | 8 hours | 6 hours (last drill) |
| **Annual Availability** | 99.95% | 99.98% (2025 YTD) |

---

## Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)

### Critical Systems (Tier 1)

| System | RTO | RPO | Backup Method | Recovery Method |
|--------|-----|-----|---------------|-----------------|
| Trading Matching Engine | 2 hours | 0 (real-time) | Active-active cluster | Automatic failover |
| Order Routing System | 2 hours | 0 (real-time) | Synchronous replication | Automatic failover |
| Market Data Feed | 1 hour | 0 (real-time) | Dual-feed from exchange | Switch to secondary feed |
| Customer Database | 4 hours | 15 minutes | WAL streaming + snapshot | Restore from DR replica |
| Core Firewalls | 1 hour | N/A | Config backup (hourly) | Deploy from backup config |

### Important Systems (Tier 2)

| System | RTO | RPO | Backup Method | Recovery Method |
|--------|-----|-----|---------------|-----------------|
| Web Portal | 8 hours | 1 hour | VM snapshot (hourly) | Restore from snapshot |
| API Gateway | 8 hours | 1 hour | VM snapshot (hourly) | Restore from snapshot |
| Risk Management System | 8 hours | 1 hour | Database replication | Restore from DR database |
| Settlement System | 12 hours | 4 hours | Daily backup | Restore from backup |
| SIEM (Splunk) | 24 hours | 4 hours | Index replication | Restore from DR indexer |

### General Systems (Tier 3)

| System | RTO | RPO | Backup Method | Recovery Method |
|--------|-----|-----|---------------|-----------------|
| Email (Exchange) | 24 hours | 24 hours | Daily backup | Restore from tape/cloud |
| File Servers | 24 hours | 24 hours | Daily backup | Restore from backup |
| Collaboration Tools | 48 hours | 24 hours | Daily backup | Restore from backup |
| Development Environments | 72 hours | 1 week | Weekly backup | Rebuild from template |

---

## Disaster Scenarios

### Scenario 1: Data Center Outage (Complete Facility Loss)

**Examples**:
- Fire, flood, earthquake
- Extended power outage (>12 hours)
- HVAC failure causing overheating
- Physical security breach requiring evacuation

**Impact**: Total loss of primary data center

**Recovery Strategy**:
1. Activate DR data center in Busan (automated failover for Tier 1 systems)
2. DNS cutover to DR site (TTL: 60 seconds)
3. Verify trading platform operational at DR site
4. Notify FSC and customers of DR activation
5. Estimated Total Recovery Time: **4 hours**

**Financial Impact**: ~$500K/hour downtime cost

---

### Scenario 2: Ransomware / Cyber Attack

**Examples**:
- Ransomware encryption of file servers
- Destructive malware (e.g., wiper attack)
- Compromised backups requiring restore from older backup

**Impact**: Data encryption or destruction, potentially including backups

**Recovery Strategy**:
1. Isolate affected systems (network segmentation)
2. Restore from immutable backups (air-gapped)
3. Verify backup integrity before restore
4. Rebuild systems from clean images
5. Estimated Total Recovery Time: **8-12 hours**

**Prevention**:
- Immutable backups (WORM storage)
- Air-gapped backup copy (offline tape)
- 3-2-1 backup rule (3 copies, 2 media types, 1 offsite)

---

### Scenario 3: Database Corruption

**Examples**:
- Software bug causing data corruption
- Storage hardware failure
- Human error (accidental deletion)

**Impact**: Data integrity compromise in production database

**Recovery Strategy**:
1. Identify corruption scope (affected tables/records)
2. Point-in-time recovery (PITR) from WAL logs
3. Validate data integrity after restore
4. Replay transactions from log files
5. Estimated Total Recovery Time: **2-6 hours**

**Prevention**:
- WAL archiving (continuous backup)
- Transaction log retention (30 days)
- Database checksum validation (daily)

---

### Scenario 4: Network Infrastructure Failure

**Examples**:
- Core switch failure
- Firewall cluster failure
- ISP outage (dual-provider)
- DDoS attack overwhelming capacity

**Impact**: Network connectivity loss, service unavailability

**Recovery Strategy**:
1. Activate redundant network paths (automatic)
2. Failover to secondary ISP (BGP reroute)
3. Enable DDoS mitigation service (scrubbing center)
4. Verify connectivity restoration
5. Estimated Total Recovery Time: **30 minutes - 2 hours**

**Prevention**:
- N+1 redundancy for all critical network components
- Dual ISP with BGP load balancing
- DDoS mitigation service on standby

---

### Scenario 5: Cloud Service Outage (AWS)

**Examples**:
- AWS region outage (Seoul)
- S3 service disruption
- Database service (RDS) failure

**Impact**: Cloud-hosted services unavailable

**Recovery Strategy**:
1. Activate multi-region deployment (Tokyo region)
2. Route traffic via Route 53 health checks
3. Verify data consistency across regions
4. Estimated Total Recovery Time: **2-4 hours**

**Prevention**:
- Multi-region deployment for critical services
- Regular cross-region replication testing
- Automated failover with Route 53

---

## Critical Systems Inventory

### Trading Platform Components

| Component | Hostname | IP Address | Location | Criticality | Dependencies |
|-----------|----------|------------|----------|-------------|--------------|
| Matching Engine (Primary) | trade-match-01 | 10.100.30.10 | Seoul DC | Tier 1 | Order Router, Market Data |
| Matching Engine (DR) | trade-match-dr-01 | 10.200.30.10 | Busan DC | Tier 1 | Order Router, Market Data |
| Order Router (Primary) | trade-router-01 | 10.100.30.20 | Seoul DC | Tier 1 | Database, Firewall |
| Order Router (DR) | trade-router-dr-01 | 10.200.30.20 | Busan DC | Tier 1 | Database, Firewall |
| Market Data Feed 1 | mktdata-feed-01 | 10.100.31.10 | Seoul DC | Tier 1 | Exchange Feed (KRX) |
| Market Data Feed 2 | mktdata-feed-02 | 10.100.31.11 | Seoul DC | Tier 1 | Exchange Feed (Backup) |

### Database Servers

| Database | Type | Primary | DR Replica | Backup Frequency | Retention |
|----------|------|---------|------------|------------------|-----------|
| Customer DB | PostgreSQL 15 | db-customer-01 | db-customer-dr-01 | Continuous (WAL streaming) | 30 days |
| Trading DB | PostgreSQL 15 | db-trading-01 | db-trading-dr-01 | Continuous (WAL streaming) | 90 days (regulatory) |
| Risk DB | MySQL 8.0 | db-risk-01 | db-risk-dr-01 | Hourly snapshot | 30 days |
| Analytics DB | PostgreSQL 15 | db-analytics-01 | N/A (not critical) | Daily | 7 days |

### Network Infrastructure

| Device | Model | Primary | DR | Config Backup | Replacement Time |
|--------|-------|---------|-----|---------------|------------------|
| Core Firewall | Fortigate 600F | fw-core-01 (HA1) | fw-core-dr-01 (HA1) | Hourly | 4 hours (vendor SLA) |
| Core Switch | Cisco 9500 | sw-core-01 | sw-core-dr-01 | Daily | 24 hours (cold spare on-site) |
| Load Balancer | F5 BIG-IP | lb-01 (HA) | lb-dr-01 (HA) | Hourly | 4 hours (vendor SLA) |

---

## Backup Strategy

### Backup Architecture

```
Production Systems (Seoul DC)
    ├─> Local Backups (On-site, Dell EMC Data Domain, Deduplication)
    ├─> DR Backups (Off-site, Busan DC, Dell EMC Data Domain)
    └─> Cloud Backups (AWS S3 Glacier, Immutable, 7-year retention)

Backup Schedule:
    ├─> Continuous: Database WAL logs, SIEM logs
    ├─> Hourly: VM snapshots (critical systems), firewall configs
    ├─> Daily: Full VM backups, file servers, email
    └─> Weekly: Full system images, tape archive
```

### Backup Types

#### 1. Database Backups (PostgreSQL)

**Method**: WAL (Write-Ahead Logging) Streaming + Daily Base Backups

```bash
# Continuous WAL archiving
archive_command = 'rsync -a %p barman@backup-server:/var/lib/barman/trading/incoming/%f'

# Daily base backup
barman backup trading-db --wait

# Retention policy
barman delete trading-db BEFORE 30d
```

**Recovery**:
```bash
# Point-in-time recovery (PITR)
barman recover trading-db latest /var/lib/postgresql/15/main --target-time "2025-10-16 14:30:00"

# Latest recovery
barman recover trading-db latest /var/lib/postgresql/15/main
```

#### 2. Virtual Machine Backups (Veeam)

**Schedule**:
- Tier 1 (Critical): Hourly snapshots, 24-hour retention
- Tier 2 (Important): Daily backups, 30-day retention
- Tier 3 (General): Weekly backups, 12-week retention

**Backup Job Example**:
```powershell
# Daily backup with application-aware processing
Add-VBRViJob -Name "Trading-Platform-Backup" `
  -Server "vcenter.nextrade.local" `
  -Entity "trade-match-01","trade-router-01" `
  -BackupRepository "Backup-Repository-DR" `
  -ScheduleEnabled:$true `
  -ScheduleType "Daily" `
  -ScheduleTime "02:00" `
  -RetentionPolicy "30 Days"
```

#### 3. Configuration Backups

**Automated Config Backup Script** (runs hourly):
```bash
#!/bin/bash
# /opt/scripts/config-backup.sh

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/backup/configs/$DATE"

# Firewall configs
ssh admin@fw-core-01 "execute backup config ftp config-$DATE.conf 192.168.100.10 backup password"

# Switch configs
ansible-playbook /opt/ansible/backup-switch-configs.yml

# Load balancer configs
f5-cli --host lb-01 config save /backup/$DATE/lb-config.ucs

# Git commit
cd /backup/configs && git add . && git commit -m "Auto backup $DATE" && git push
```

#### 4. Immutable Backups (Ransomware Protection)

**Implementation**:
- **WORM Storage**: Dell EMC Data Domain with retention lock (30 days)
- **Air-Gapped Tape**: LTO-9 tapes stored offsite (90 days retention)
- **Cloud Immutable**: AWS S3 Glacier with Object Lock (7 years for regulatory)

```bash
# Enable S3 Object Lock (prevents deletion/modification)
aws s3api put-object-lock-configuration --bucket nextrade-backup-immutable \
  --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":90}}}'
```

---

## Recovery Procedures

### Procedure 1: Full DR Site Activation

**Trigger**: Primary data center completely unavailable

**Estimated Time**: 4 hours (Tier 1 systems)

**Step-by-Step**:

#### Phase 1: Assessment & Decision (30 minutes)

```bash
# 1. Verify primary site unavailability
ping -c 10 fw-core-01.seoul.nextrade.local
ssh admin@fw-core-01.seoul.nextrade.local  # Should timeout

# 2. Check DR site readiness
ssh admin@fw-core-dr-01.busan.nextrade.local
curl -f http://trade-match-dr-01:8080/health  # Expect HTTP 200

# 3. Notify incident response team
python3 /opt/scripts/send-alert.py \
  --severity "P0" \
  --message "Primary DC unavailable - Activating DR site" \
  --recipients "ciso@nextrade.com,cto@nextrade.com,ops@nextrade.com"

# 4. Get executive approval for DR activation
# (Required per policy for P0 incidents)
```

#### Phase 2: Network Cutover (1 hour)

```bash
# 1. Update DNS to point to DR site
# Primary IP: 203.0.113.10 → DR IP: 203.0.113.20
ansible-playbook /opt/ansible/dns-cutover-dr.yml

# Verify DNS propagation (TTL: 60 seconds)
dig nextrade.com @8.8.8.8  # Should return DR IP

# 2. BGP route announcement (for dedicated circuits)
ssh bgp-router-dr-01
router bgp 65001
  network 203.0.113.0 mask 255.255.255.0
  neighbor 203.0.114.1 remote-as 65002

# 3. Firewall rule activation (allow inbound traffic to DR)
ssh admin@fw-core-dr-01
config firewall policy
  edit 1
    set srcintf "wan1"
    set dstintf "dmz"
    set srcaddr "all"
    set dstaddr "trading-platform-vip"
    set action accept
    set schedule "always"
  next
end

# 4. Load balancer VIP activation
ssh root@lb-dr-01
tmsh modify ltm virtual trading-vip enabled
tmsh modify ltm pool trading-pool members add { trade-match-dr-01:8080 trade-router-dr-01:8080 }
```

#### Phase 3: Database Promotion (1.5 hours)

```bash
# 1. Promote DR database to primary (PostgreSQL)
ssh postgres@db-customer-dr-01

# Stop replication
su - postgres
psql -c "SELECT pg_wal_replay_pause();"

# Promote to primary
pg_ctl promote -D /var/lib/postgresql/15/main

# Verify promotion
psql -c "SELECT pg_is_in_recovery();"  # Should return 'f' (false)

# 2. Update application connection strings
ansible-playbook /opt/ansible/update-db-connection-strings.yml \
  -e "db_host=db-customer-dr-01.busan.nextrade.local"

# 3. Verify database connectivity from application servers
psql -h db-customer-dr-01 -U tradeapp -d customerdb -c "SELECT 1;"

# 4. Run database integrity checks
psql -d customerdb -c "VACUUM ANALYZE;"
psql -d customerdb -c "SELECT pg_database_size('customerdb');"
```

#### Phase 4: Application Startup (1 hour)

```bash
# 1. Start trading platform components (in order)
ssh trade-match-dr-01
systemctl start matching-engine
systemctl status matching-engine  # Verify running

ssh trade-router-dr-01
systemctl start order-router
systemctl status order-router

# 2. Start typescript/portfolio-worker portal and API gateway
ansible-playbook /opt/ansible/start-typescript/portfolio-worker-tier.yml --limit "dr-site"

# 3. Verify application health
curl -f http://trade-match-dr-01:8080/health  # HTTP 200
curl -f http://trade-router-dr-01:8080/health  # HTTP 200
curl -f https://api.nextrade.com/v1/health  # HTTP 200 (via load balancer)

# 4. Run smoke tests
python3 /opt/tests/dr-smoke-tests.py --site dr --critical-only
```

#### Phase 5: Verification & Notification (30 minutes)

```bash
# 1. End-to-end trading test
curl -X POST https://api.nextrade.com/v1/orders \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"symbol":"AAPL","quantity":100,"side":"buy","type":"limit","price":150.00}'

# Expected: Order accepted, matching engine processes

# 2. Verify monitoring and logging
ssh splunk@siem-dr-01
/opt/splunk/bin/splunk search 'index=trading earliest=-5m | stats count'  # Should show recent events

# 3. Notify stakeholders
python3 /opt/scripts/send-dr-activation-notice.py \
  --status "OPERATIONAL" \
  --site "Busan DR Site" \
  --rto "4 hours" \
  --actual-time "$ACTUAL_RECOVERY_TIME"

# Recipients: Customers, FSC, internal teams

# 4. Update status page
curl -X POST https://status.nextrade.com/api/incidents \
  -d '{"status":"investigating","message":"Primary site unavailable. Trading operations transferred to DR site."}'
```

---

### Procedure 2: Database Restore (PITR)

**Trigger**: Database corruption or accidental deletion

**Estimated Time**: 2-6 hours (depending on database size)

**Step-by-Step**:

```bash
# 1. Stop application connections to database
ansible-playbook /opt/ansible/stop-application-tier.yml

# 2. Backup current (corrupted) database for forensics
pg_dump -h db-customer-01 -U postgres customerdb > /backup/forensics/customerdb-corrupted-$(date +%Y%m%d-%H%M%S).sql

# 3. Identify recovery point (time before corruption)
RECOVERY_TIME="2025-10-16 14:25:00"  # 5 minutes before corruption detected

# 4. Restore base backup
barman recover trading-db 20251016T020000 /var/lib/postgresql/15/main \
  --target-time "$RECOVERY_TIME" \
  --target-action promote

# 5. Start PostgreSQL and verify
systemctl start postgresql@15-main
psql -c "SELECT current_timestamp, pg_is_in_recovery();"

# 6. Run data integrity checks
psql -d customerdb <<EOF
-- Check row counts
SELECT 'customers' AS table, COUNT(*) FROM customers
UNION ALL
SELECT 'orders' AS table, COUNT(*) FROM orders
UNION ALL
SELECT 'transactions' AS table, COUNT(*) FROM transactions;

-- Verify recent transactions (before corruption)
SELECT * FROM transactions WHERE created_at > '$RECOVERY_TIME'::timestamp - interval '1 hour' ORDER BY created_at DESC LIMIT 100;
EOF

# 7. Replay any missing transactions (if available)
# (From application logs or transaction queue)
python3 /opt/scripts/replay-transactions.py \
  --from "$RECOVERY_TIME" \
  --to "$(date '+%Y-%m-%d %H:%M:%S')" \
  --source /var/log/trading-app/transaction-log.jsonl

# 8. Restart application tier
ansible-playbook /opt/ansible/start-application-tier.yml

# 9. Verify end-to-end functionality
python3 /opt/tests/smoke-tests.py --full-suite
```

---

### Procedure 3: VM Restore (Veeam)

**Trigger**: VM corruption, ransomware, or hardware failure

**Estimated Time**: 1-4 hours (depending on VM size)

```powershell
# 1. Identify restore point
Get-VBRBackup -Name "Trading-Platform-Backup" | Get-VBRRestorePoint | Select-Object VmName, CreationTime | Sort-Object CreationTime -Descending

# 2. Restore VM to DR host (or rebuild on primary if available)
Start-VBRRestoreVM -RestorePoint (Get-VBRRestorePoint -Name "trade-match-01" -Backup "Trading-Platform-Backup") `
  -Server "esxi-dr-01.busan.nextrade.local" `
  -Folder "Production" `
  -Reason "DR activation - primary site unavailable"

# 3. Power on restored VM
Get-VM -Name "trade-match-01" | Start-VM

# 4. Verify network connectivity and application health
Test-NetConnection -ComputerName "trade-match-01" -Port 8080
Invoke-WebRequest -Uri "http://trade-match-01:8080/health" -UseBasicParsing

# 5. If needed, restore application data from separate backup
# (Database, logs, config files)
```

---

## Communication Plan

### Internal Communication

**Incident Response Team** (activated immediately):
- Security Lead: Incident Commander
- IT Manager: Technical Lead
- Compliance Manager: Communication Lead
- Database Admin: Database Recovery
- Network Engineer: Network Recovery

**Contact Method**: Microsoft Teams War Room + Conference Bridge

**Communication Template**:
```
TO: Incident Response Team
SUBJECT: [DR ACTIVATION] Primary DC Unavailable - DR Site Activation in Progress

SITUATION:
- Primary data center in Seoul is completely unavailable
- Cause: [Fire / Flood / Power Outage / Cyber Attack / etc.]
- Impact: All production systems offline
- Customer Impact: Trading platform unavailable

ACTIONS TAKEN:
- [14:00] Primary site confirmed unavailable
- [14:05] Executive approval obtained for DR activation
- [14:10] DR site activation initiated
- [14:30] DNS cutover to DR site completed
- [15:00] Trading platform operational at DR site

STATUS:
- Network Cutover: [Complete / In Progress / Pending]
- Database Promotion: [Complete / In Progress / Pending]
- Application Startup: [Complete / In Progress / Pending]
- Estimated Completion: [HH:MM]

NEXT UPDATE: In 30 minutes
WAR ROOM: [Teams link]
```

---

### External Communication

#### To Customers

**Channel**: Email + Status Page (https://status.nextrade.com)

**Template** (Incident Detection):
```
Subject: [IMPORTANT] Trading Platform Maintenance - Service Disruption

Dear Valued Customer,

We are currently experiencing a service disruption affecting our trading platform due to [data center outage / technical issue]. Our disaster recovery procedures have been activated, and we are working to restore full service.

Current Status:
- Trading: Temporarily Unavailable
- Order Status Inquiry: Available
- Customer Support: Available (1588-XXXX)

Expected Resolution: [HH:MM KST]

We will provide updates every 30 minutes until service is restored.

We apologize for the inconvenience.

Nextrade Securities Exchange
Customer Support Team
```

**Template** (Service Restored):
```
Subject: [RESOLVED] Trading Platform Fully Restored

Dear Valued Customer,

We are pleased to inform you that our trading platform has been fully restored and is operating normally.

Incident Summary:
- Start Time: 2025-10-16 14:00 KST
- Resolution Time: 2025-10-16 18:00 KST
- Duration: 4 hours
- Cause: Primary data center outage
- Impact: Temporary service unavailability

Actions Taken:
- Disaster recovery site activated in Busan
- All systems verified and operational
- Data integrity confirmed (no data loss)

We sincerely apologize for the inconvenience and thank you for your patience.

If you have any questions, please contact our customer support at 1588-XXXX.

Nextrade Securities Exchange
Customer Support Team
```

---

#### To Financial Services Commission (FSC)

**Notification Requirement**: Within 1 hour for critical system outages

**Template**:
```
TO: Financial Services Commission (FSC)
      Electronic Financial Supervision Bureau
FROM: Nextrade Securities Exchange
       Chief Information Security Officer (CISO)

SUBJECT: Critical System Outage Notification

In accordance with Article 47 of the Financial Telecommunication Guidelines, we hereby notify FSC of a critical system outage:

1. INCIDENT DETAILS
   - Reporting Entity: Nextrade Securities Exchange (License No: XXXX)
   - Incident Type: Data Center Outage
   - Detection Time: 2025-10-16 14:00 KST
   - Notification Time: 2025-10-16 14:30 KST (within 30 minutes)

2. AFFECTED SYSTEMS
   - Trading Platform: Unavailable (14:00-18:00 KST)
   - Settlement System: Operational (DR site)
   - Customer Data: No impact (replicated to DR)

3. BUSINESS IMPACT
   - Trading Halt: 4 hours (14:00-18:00 KST)
   - Affected Customers: Approximately 50,000 active traders
   - Financial Impact: Estimated KRW 500M (lost trading fees)

4. ROOT CAUSE
   - Primary data center power failure (UPS exhaustion)
   - Backup generator failed to start
   - Total facility power loss

5. RESPONSE ACTIONS
   - [14:00] Incident detected, primary DC unresponsive
   - [14:05] Executive approval for DR activation
   - [14:10] DR site activation initiated
   - [14:30] DNS cutover to DR site
   - [15:30] Database promoted at DR site
   - [16:30] Trading platform operational at DR
   - [18:00] Full service restored, smoke tests passed

6. DATA PROTECTION
   - Customer Data Loss: None (real-time replication)
   - Transaction Data Loss: None (WAL streaming)
   - Data Integrity Verification: Passed

7. CUSTOMER NOTIFICATION
   - Notification Method: Email + SMS + Status Page
   - Notification Time: 2025-10-16 14:15 KST
   - Customers Notified: 100% (all active users)

8. PREVENTIVE MEASURES
   - Short-term: Replace failed backup generator (by 2025-10-18)
   - Long-term: Dual-generator configuration (by 2025-12-31)
   - Process Improvement: Monthly generator testing (new SOP)

9. NEXT STEPS
   - Submit detailed incident report within 7 days
   - Conduct root cause analysis (5 Whys)
   - Implement preventive measures
   - Update business continuity plan

CONTACT INFORMATION:
- Primary Contact: [CISO Name], CISO
- Phone: 02-XXXX-XXXX (Office), 010-XXXX-XXXX (Mobile)
- Email: ciso@nextrade.com
- 24/7 Hotline: 1588-XXXX

---
Nextrade Securities Exchange
Chief Information Security Officer
```

---

## Testing & Validation

### DR Testing Schedule

**Frequency**: Quarterly (FSC requirement)

**Test Types**:
1. **Tabletop Exercise** (Monthly)
   - Scenario walkthrough
   - Communication drill
   - Duration: 2 hours
   - Participants: DR team + executives

2. **Partial Failover Test** (Quarterly)
   - Non-critical systems only
   - Validate recovery procedures
   - Duration: 4 hours
   - Downtime: None (test environment)

3. **Full DR Drill** (Annually)
   - Complete DR site activation
   - All critical systems
   - Duration: 8 hours
   - Downtime: Scheduled maintenance window

### Last DR Test Results (2025-09-15)

**Test Type**: Full DR Drill
**Scenario**: Primary data center fire
**Objectives**:
- Activate DR site within 4 hours
- Zero data loss
- Successful customer notification

**Results**:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| RTO (Trading Platform) | 4 hours | 2.5 hours | ✅ PASS |
| RPO (Customer Data) | 15 minutes | 0 minutes (real-time replication) | ✅ PASS |
| Database Promotion Time | 1.5 hours | 1.2 hours | ✅ PASS |
| Network Cutover Time | 1 hour | 45 minutes | ✅ PASS |
| Application Startup Time | 1 hour | 30 minutes | ✅ PASS |
| End-to-End Trading Test | Success | Success | ✅ PASS |

**Issues Identified**:
1. ⚠️ DNS TTL too long (300 seconds) → Reduced to 60 seconds
2. ⚠️ Load balancer VIP manual activation → Automated with script
3. ⚠️ Customer notification delay (15 minutes) → Pre-drafted templates

**Action Items**:
- [x] Update DNS TTL to 60 seconds (Completed: 2025-09-20)
- [x] Automate load balancer VIP activation (Completed: 2025-09-25)
- [x] Pre-draft customer notification templates (Completed: 2025-09-18)

---

## Appendix

### A. Emergency Contacts

**Internal**:
- CISO: [Name], 010-XXXX-XXXX, ciso@nextrade.com
- CTO: [Name], 010-XXXX-XXXX, cto@nextrade.com
- Security Lead: Jaecheol Lee, 010-5757-9592, qws941@kakao.com
- Database Admin: [Name], 010-XXXX-XXXX
- Network Engineer: [Name], 010-XXXX-XXXX

**External**:
- FSC Hotline: 1332 (Financial Supervisory Service)
- Data Center (Seoul): 02-XXXX-XXXX (24/7 NOC)
- Data Center (Busan): 051-XXXX-XXXX (24/7 NOC)
- Veeam Support: +82-2-XXXX-XXXX (Premium Support)
- Dell EMC Support: 1588-XXXX (Enterprise Support)

### B. Vendor SLAs

| Vendor | Service | SLA | Contact |
|--------|---------|-----|---------|
| Dell EMC | Storage Hardware Replacement | 4 hours (on-site) | 1588-XXXX |
| Cisco | Network Equipment Replacement | 4 hours (on-site) | 1588-XXXX |
| Fortinet | Firewall Support | 1 hour (remote), 4 hours (on-site) | +82-2-XXXX-XXXX |
| Veeam | Backup Software Support | 1 hour (P1), 4 hours (P2) | +82-2-XXXX-XXXX |
| AWS | Cloud Infrastructure | 99.99% availability | aws.amazon.com/support |

### C. DR Site Inventory

**Busan DR Data Center**:
- Address: [Address]
- Facility: Tier III (99.982% availability)
- Power: 2N (dual-path), 500 kVA UPS, diesel generator
- Cooling: N+1 CRAC units
- Network: 10Gbps dual-carrier connectivity

**Equipment** (Pre-positioned):
- 10x Dell PowerEdge R750 (Application Servers)
- 5x Dell PowerEdge R7525 (Database Servers)
- 2x Fortigate 600F (Firewalls, HA pair)
- 2x Cisco Catalyst 9500 (Core Switches, StackWise Virtual)
- 10x Cisco Catalyst 9300 (Access Switches)
- 2x F5 BIG-IP i5800 (Load Balancers, HA pair)
- 1x Dell EMC Unity 600F (100TB All-Flash Storage)
- 1x Dell EMC Data Domain 9400 (500TB Backup Storage)

### D. Regulatory References

- **Financial Telecommunication Guidelines** (금융전산망 지침)
  - Article 47: Critical System Outage Notification (within 1 hour)
  - Article 52: Disaster Recovery Testing (annual)

- **Personal Information Protection Act (PIPA)**
  - Article 29: Data Backup and Recovery

- **ISMS-P (Personal Information Management System)**
  - Control 15: Business Continuity Management (15.1.1 - 15.1.4)

---

**Document Approval**:

- **Prepared By**: Jaecheol Lee, Information Security Lead
- **Reviewed By**: [CISO Name], Chief Information Security Officer
- **Approved By**: [CTO Name], Chief Technology Officer

**Approval Date**: 2025-10-16
**Next Review**: 2026-01-16 (Quarterly)
