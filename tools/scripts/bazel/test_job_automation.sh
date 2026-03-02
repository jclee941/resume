#!/bin/bash
# Test job automation
set -e
cd "$(dirname "$0")/../../../apps/job-server"
npm test
