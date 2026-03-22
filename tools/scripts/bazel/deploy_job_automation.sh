#!/bin/bash
set -euo pipefail

printf '%s\n' "Standalone job-worker deploy is deprecated."
printf '%s\n' "Production uses two workers (portfolio + job-dashboard) deployed via Cloudflare Workers Builds."
printf '%s\n' "Use git push to master. See ADR 0007 for architecture details."
exit 1
