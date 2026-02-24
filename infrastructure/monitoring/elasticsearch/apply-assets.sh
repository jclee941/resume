#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

: "${ELASTICSEARCH_URL:?ELASTICSEARCH_URL is required}"
: "${ELASTICSEARCH_API_KEY:?ELASTICSEARCH_API_KEY is required}"

PIPELINE_FILE="${ROOT_DIR}/pipeline.json"
PIPELINE_TMP="$(mktemp)"
cleanup() {
  rm -f "${PIPELINE_TMP}"
}
trap cleanup EXIT

node -e "const fs=require('fs'); const src=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); fs.writeFileSync(process.argv[2], JSON.stringify(src.elasticsearch_ingest_pipeline));" "${PIPELINE_FILE}" "${PIPELINE_TMP}"

echo "Applying resume Elasticsearch ingest pipeline..."
curl -fsS -X PUT "${ELASTICSEARCH_URL}/_ingest/pipeline/resume-logs-ingest" \
  -H "Authorization: ApiKey ${ELASTICSEARCH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"${PIPELINE_TMP}"

echo
echo "Applying resume Elasticsearch index template..."
curl -fsS -X PUT "${ELASTICSEARCH_URL}/_index_template/resume-logs-template" \
  -H "Authorization: ApiKey ${ELASTICSEARCH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"${ROOT_DIR}/index-template.json"

for index in \
  resume-logs-worker \
  resume-logs-worker-preview \
  resume-logs-job-worker \
  resume-logs-job-worker-staging
do
  echo
  echo "Ensuring index exists: ${index}"
  curl -fsS -X PUT "${ELASTICSEARCH_URL}/${index}" \
    -H "Authorization: ApiKey ${ELASTICSEARCH_API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"settings":{"index":{"number_of_shards":1,"number_of_replicas":0}}}' || true
done

echo
echo "Done."
