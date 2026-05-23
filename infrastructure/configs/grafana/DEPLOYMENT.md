# Grafana Monitoring Stack — Deployment Guide

Quick reference for deploying the Grafana + Prometheus + Loki + Alertmanager + Jaeger stack to the Docker host.

## Target

- **Host**: `192.168.50.215`
- **Legacy**: `192.168.50.100` (LXC 104) — retained for reference only
- **Domain**: `grafana.jclee.me`
- **Remote path**: `/opt/monitoring/`

---

## Prerequisites

On the **target Docker host** (`192.168.50.215`):

1. Docker Engine installed and running
2. Docker Compose plugin installed (`docker compose`)
3. SSH access enabled for key-based authentication
4. The deploying user has passwordless `sudo` (or runs as root)

On the **local machine** running the script:

1. Go toolchain (to run the script)
2. `scp` and `ssh` binaries available
3. SSH private key authorized on the target host (`~/.ssh/id_rsa` by default)

---

## One-Command Deployment

From the repository root:

```bash
go run ./tools/scripts/deploy-monitoring.go
```

### Custom target / SSH key

```bash
go run ./tools/scripts/deploy-monitoring.go \
  -host 192.168.50.215 \
  -user root \
  -ssh-key ~/.ssh/id_rsa
```

### Dry run (preview without making changes)

```bash
go run ./tools/scripts/deploy-monitoring.go -dry-run
```

---

## What the Script Does

1. Creates the remote directory structure under `/opt/monitoring/`
2. Copies `docker-compose.monitoring.yml` (rewritten as `docker-compose.yml` with adjusted volume paths)
3. Copies all configuration files:
   - `grafana.ini`
   - `provisioning/datasources/datasources.yml`
   - `resume-portfolio-dashboard.json`
   - `prometheus.yml`, `blackbox.yml`, `rules/resume-portfolio.yml`
   - `alertmanager.yml`
4. Runs `docker compose up -d` on the remote host
5. Verifies that all expected containers are running
6. Prints service URLs

---

## Manual Deployment (Fallback)

If the Go script cannot be used, deploy manually:

### 1. Prepare the remote host

```bash
ssh -i ~/.ssh/id_rsa root@192.168.50.215
mkdir -p /opt/monitoring/configs/{grafana/provisioning/datasources,prometheus/rules,alertmanager}
```

### 2. Copy the compose file and configs

From the repo root on your local machine:

```bash
# Compose file (adjust volume paths from ../configs/ to ./configs/)
scp -i ~/.ssh/id_rsa infrastructure/docker/docker-compose.monitoring.yml \
  root@192.168.50.215:/opt/monitoring/docker-compose.yml

# Grafana configs
scp -i ~/.ssh/id_rsa infrastructure/configs/grafana/grafana.ini \
  root@192.168.50.215:/opt/monitoring/configs/grafana/
scp -i ~/.ssh/id_rsa infrastructure/configs/grafana/provisioning/datasources/datasources.yml \
  root@192.168.50.215:/opt/monitoring/configs/grafana/provisioning/datasources/
scp -i ~/.ssh/id_rsa infrastructure/configs/grafana/resume-portfolio-dashboard.json \
  root@192.168.50.215:/opt/monitoring/configs/grafana/

# Prometheus configs
scp -i ~/.ssh/id_rsa infrastructure/configs/prometheus/prometheus.yml \
  root@192.168.50.215:/opt/monitoring/configs/prometheus/
scp -i ~/.ssh/id_rsa infrastructure/configs/prometheus/blackbox.yml \
  root@192.168.50.215:/opt/monitoring/configs/prometheus/
scp -i ~/.ssh/id_rsa infrastructure/configs/prometheus/rules/resume-portfolio.yml \
  root@192.168.50.215:/opt/monitoring/configs/prometheus/rules/

# Alertmanager config
scp -i ~/.ssh/id_rsa infrastructure/configs/alertmanager/alertmanager.yml \
  root@192.168.50.215:/opt/monitoring/configs/alertmanager/
```

### 3. Update compose volume paths

On the remote host, edit `/opt/monitoring/docker-compose.yml` so volume mounts use `./configs/` instead of `../configs/`.

### 4. Start the stack

```bash
ssh -i ~/.ssh/id_rsa root@192.168.50.215 \
  'cd /opt/monitoring && docker compose up -d'
```

---

## Verification Commands

Check container status:

```bash
ssh -i ~/.ssh/id_rsa root@192.168.50.215 \
  'cd /opt/monitoring && docker compose ps'
```

View logs for a specific service:

```bash
ssh -i ~/.ssh/id_rsa root@192.168.50.215 \
  'cd /opt/monitoring && docker compose logs -f grafana'
```

Health check endpoints:

| Service       | URL                                |
| ------------- | ---------------------------------- |
| Grafana       | https://grafana.jclee.me           |
| Prometheus    | http://192.168.50.215:9090         |
| Alertmanager  | http://192.168.50.215:9093         |
| Jaeger        | http://192.168.50.215:16686        |

---

## Rollback Procedure

To stop and remove the stack without deleting volumes:

```bash
ssh -i ~/.ssh/id_rsa root@192.168.50.215 \
  'cd /opt/monitoring && docker compose down'
```

To stop, remove containers, **and delete all data volumes**:

```bash
ssh -i ~/.ssh/id_rsa root@192.168.50.215 \
  'cd /opt/monitoring && docker compose down -v'
```

> **Warning**: `down -v` removes named volumes (`grafana-data`, `prometheus-data`, `loki-data`, `alertmanager-data`, `jaeger-data`). Dashboards and metrics will be lost.

To restore from the legacy LXC deployment, copy configs back from `192.168.50.100` and start the stack there.
