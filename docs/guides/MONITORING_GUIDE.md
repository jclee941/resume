# Deployment Monitoring Guide

## Overview

The resume portfolio includes tmux-based deployment monitoring for real-time visibility into the deployment process.

## Quick Start

### Option 1: Deploy with Monitoring

```bash
# Start deployment in monitored tmux session
./tools/scripts/deployment/deploy-with-monitoring.sh
```

This will:

1. Create tmux session `resume-deploy`
2. Build worker.js
3. Run tests
4. Deploy to Cloudflare
5. Verify deployment

### Option 2: Monitor Existing Deployment

```bash
# Monitor running deployment
./tools/scripts/monitoring/monitor-deployment.sh
```

Choose from 4 monitoring modes:

1. **Attach to session** (interactive)
2. **Stream output** (2-second refresh)
3. **Get status snapshot**
4. **Search logs for errors**

## Monitoring Modes

### 1. Interactive Mode (Attach)

```bash
./tools/scripts/monitoring/monitor-deployment.sh
# Choose: 1

# Inside tmux session:
# - Ctrl+B, D to detach
# - Ctrl+B, [ to scroll (q to exit scroll mode)
```

**Use case**: Full interactive control, run commands manually

### 2. Stream Mode

```bash
./tools/scripts/monitoring/monitor-deployment.sh
# Choose: 2

# Output updates every 2 seconds
# Ctrl+C to stop streaming
```

**Use case**: Real-time monitoring without interaction

### 3. Snapshot Mode

```bash
./tools/scripts/monitoring/monitor-deployment.sh
# Choose: 3

# Shows last 50 lines of session
```

**Use case**: Quick status check

### 4. Error Search

```bash
./tools/scripts/monitoring/monitor-deployment.sh
# Choose: 4

# Searches for:
# - Errors (error, failed, fatal)
# - Warnings (warning, warn)
```

**Use case**: Troubleshooting failed deployments

## Manual tmux Commands

### Create Session

```bash
tmux new-session -s resume-deploy
```

### List Sessions

```bash
tmux list-sessions
```

### Attach to Session

```bash
tmux attach -t resume-deploy
```

### Capture Session Output

```bash
# Last 30 lines
tmux capture-pane -t resume-deploy -p -S -30

# All scrollback
tmux capture-pane -t resume-deploy -p -S -
```

### Kill Session

```bash
tmux kill-session -t resume-deploy
```

## Session Configuration

The deployment session uses:

- **Session name**: `resume-deploy`
- **Window name**: `main`
- **Scrollback limit**: 50,000 lines
- **Working directory**: `/home/jclee/dev/resume`

## Deployment Steps

The monitoring script tracks these steps:

```
[1/4] Building worker.js
  ├─ npm run build
  └─ Checks for "generated successfully"

[2/4] Running tests
  ├─ npm test
  └─ Checks for "Tests:.*passed"

[3/4] Deploying to Cloudflare
  ├─ npx wrangler deploy --config apps/portfolio/wrangler.toml --env production
  └─ Checks for "Published|Deployed|Success"

[4/4] Verifying deployment
  ├─ curl -I https://resume.jclee.me
  └─ Checks for "HTTP.*200"
```

## Output Examples

### Success

```
🚀 Starting Resume Portfolio Deployment
📺 Creating tmux session: resume-deploy
✅ Tmux session created

[1/4] Building worker.js...
✅ Build completed

[2/4] Running tests...
✅ Tests passed

[3/4] Deploying to Cloudflare Workers...
✅ Deployment completed

[4/4] Verifying deployment...
✅ Deployment verified (HTTP 200)

🎉 Deployment process completed!
```

### Failure

```
[3/4] Deploying to Cloudflare Workers...
❌ Deployment may have failed, check session

📺 View session:
   tmux attach -t resume-deploy
```

## Integration with CI/CD

### Local Development

Use tmux monitoring for:

- Testing deployment workflow locally
- Debugging deployment issues
- Monitoring resource usage

### GitHub Actions

GitHub Actions provides its own logging. Tmux monitoring is for:

- **Local deployments**
- **Development workflow**
- **Debugging before pushing**

## Troubleshooting

### Session not found

```bash
# Check if tmux is installed
which tmux

# Check running sessions
tmux list-sessions

# Restart deployment
./tools/scripts/deployment/deploy-with-monitoring.sh
```

### Permission denied

```bash
# Make scripts executable
chmod +x tools/scripts/*.sh
```

### Session hangs

```bash
# Force kill session
tmux kill-session -t resume-deploy

# Or kill all tmux sessions
tmux kill-server
```

## Best Practices

1. **Kill old sessions** before starting new deployments
2. **Use stream mode** for hands-off monitoring
3. **Check error search** if deployment fails
4. **Keep scrollback reasonable** (50K lines max)
5. **Detach instead of killing** to preserve logs

## Advanced Usage

### Custom Deployment Commands

```bash
# Create session
tmux new-session -d -s custom-deploy

# Run commands
tmux send-keys -t custom-deploy "npm run lint" C-m
tmux send-keys -t custom-deploy "npm run build" C-m
tmux send-keys -t custom-deploy "npm run deploy" C-m

# Monitor
tmux attach -t custom-deploy
```

### Export Session Logs

```bash
# Capture full session to file
tmux capture-pane -t resume-deploy -p -S - > deployment.log

# View in less
less deployment.log
```

## References

- [tmux Manual](https://man.openbsd.org/tmux.1)
- [tmux Cheat Sheet](https://tmuxcheatsheet.com/)
- [MCP tmux Server](https://github.com/modelcontextprotocol/servers)
