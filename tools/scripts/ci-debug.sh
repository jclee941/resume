#!/bin/bash
# CI/CD Diagnostic Script
# Run this on the GitLab server or a machine with access to GitLab

echo "=== CI/CD Diagnostic Report ==="
echo "Generated: $(date)"
echo ""

echo "1. Checking GitLab service status..."
curl -s http://192.168.50.215:8929/api/v4/version 2>/dev/null | jq -r '.version' || echo "❌ GitLab API not responding"
echo ""

echo "2. Checking for recent pipelines..."
curl -s "http://192.168.50.215:8929/api/v4/projects/1/pipelines?per_page=5" 2>/dev/null | jq -r '.[] | "Pipeline #\(.id): \(.status) (\(.ref))"' 2>/dev/null || echo "❌ Cannot fetch pipelines"
echo ""

echo "3. Checking GitLab Runner status..."
# If running in Docker
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -i runner || echo "❌ No runner containers found"
echo ""

echo "4. Latest commits on master..."
git log --oneline -5 origin/master 2>/dev/null || echo "❌ Cannot check git log"
echo ""

echo "5. CI/CD Configuration Validation..."
# Check if .gitlab-ci.yml exists and has valid syntax
if [ -f .gitlab-ci.yml ]; then
  echo "✓ .gitlab-ci.yml exists"
  # Basic syntax check - look for common issues
  if grep -q "^[[:space:]]*[a-z].*:" .gitlab-ci.yml; then
    echo "✓ YAML structure looks valid"
  fi
else
  echo "❌ .gitlab-ci.yml not found"
fi
echo ""

echo "6. Checking for CI/CD variables..."
echo "Note: Variables are set in GitLab UI at:"
echo "  http://192.168.50.215:8929/root/resume/-/settings/ci_cd"
echo ""

echo "=== End of Report ==="
