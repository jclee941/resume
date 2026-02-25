#!/bin/bash
set -euo pipefail

printf '%s\n' "Standalone job-worker deploy is deprecated."
printf '%s\n' "Production runtime uses single worker: resume."
printf '%s\n' "Use git push to master and Cloudflare Workers Builds."
exit 1
