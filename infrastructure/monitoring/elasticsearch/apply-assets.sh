#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

: "${ELASTICSEARCH_URL:?ELASTICSEARCH_URL is required}"
: "${ELASTICSEARCH_API_KEY:?ELASTICSEARCH_API_KEY is required}"

echo "Applying resume Elasticsearch ingest pipeline..."
curl -fsS -X PUT "${ELASTICSEARCH_URL}/_ingest/pipeline/resume-logs-ingest" \
  -H "Authorization: ApiKey ${ELASTICSEARCH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"${ROOT_DIR}/pipeline.json"

echo
echo "Applying resume Elasticsearch index template..."
curl -fsS -X PUT "${ELASTICSEARCH_URL}/_index_template/resume-logs-template" \
  -H "Authorization: ApiKey ${ELASTICSEARCH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"${ROOT_DIR}/index-template.json"

echo
echo "Ensuring preview index exists..."
curl -fsS -X PUT "${ELASTICSEARCH_URL}/resume-logs-worker-preview" \
  -H "Authorization: ApiKey ${ELASTICSEARCH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"settings":{"index":{"number_of_shards":1,"number_of_replicas":0}}}' || true

echo
echo "Done."
