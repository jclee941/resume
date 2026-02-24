# ELK Log Pipeline for Resume Workers

This directory contains production ELK assets for Cloudflare Worker logs (`resume` + `job`) written to Elasticsearch and queried in Kibana/Grafana.

## Files

- `pipeline.json`: Elasticsearch ingest pipeline definition for `resume-logs-*` (also includes optional shipper example block).
- `index-template.json`: Elasticsearch index template with mappings for core log fields.
- `kibana-patterns.json`: Kibana index pattern export targeting `resume-logs-*`.

## Worker Log Shape

Expected log payload fields:

```json
{
  "@timestamp": "2026-02-15T12:00:00.000Z",
  "level": "info",
  "log": { "level": "info" },
  "message": "GET /healthz 200 18ms",
  "correlationId": "a97c0f3f4f8b4f61bde3cb7a67f48b31",
  "traceId": "a97c0f3f4f8b4f61bde3cb7a67f48b31",
  "traceparent": "00-a97c0f3f4f8b4f61bde3cb7a67f48b31-00f067aa0ba902b7-01",
  "tracestate": "vendor=value",
  "trace": { "id": "a97c0f3f4f8b4f61bde3cb7a67f48b31" },
  "service": { "name": "resume-worker" },
  "serviceName": "resume-worker",
  "route": "/healthz",
  "statusCode": 200,
  "duration": 18
}
```

## Setup

Quick apply helper:

```bash
chmod +x infrastructure/monitoring/elasticsearch/apply-assets.sh
ELASTICSEARCH_URL="https://your-es-endpoint" \
ELASTICSEARCH_API_KEY="your_api_key" \
  infrastructure/monitoring/elasticsearch/apply-assets.sh
```

1. **Create ingest pipeline in Elasticsearch**
   - Extract `elasticsearch_ingest_pipeline` from `pipeline.json` first.
   - Create with API:

   ```bash
   node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('pipeline.json','utf8'));fs.writeFileSync('ingest-pipeline.tmp.json', JSON.stringify(p.elasticsearch_ingest_pipeline));"
   curl -X PUT "$ELASTICSEARCH_URL/_ingest/pipeline/resume-logs-ingest" \
     -H "Authorization: ApiKey $ELASTICSEARCH_API_KEY" \
     -H "Content-Type: application/json" \
      -d @ingest-pipeline.tmp.json
   ```

2. **Create index template**

   ```bash
   curl -X PUT "$ELASTICSEARCH_URL/_index_template/resume-logs-template" \
     -H "Authorization: ApiKey $ELASTICSEARCH_API_KEY" \
     -H "Content-Type: application/json" \
     -d @index-template.json
   ```

3. **Ingestion mode**
   - Cloudflare Worker direct-write mode is primary (`/${index}/_doc`).
   - `index-template.json` sets `index.default_pipeline = resume-logs-ingest`, so direct writes are normalized.
   - Optional shipper mode (Filebeat/other) can still target pipeline `resume-logs-ingest`.

4. **Import Kibana index pattern**
   - Stack Management -> Saved Objects -> Import.
   - Import `kibana-patterns.json`.

## Cloudflare Worker Forwarding Notes

- Keep logs as JSON and avoid multiline blobs.
- Include a `correlationId` per request for cross-service tracing.
- Include W3C trace context fields (`traceId`, `traceparent`, `tracestate`) when available.
- Use async fire-and-forget log delivery to avoid request latency impact.
- Do not include secrets or user PII in log payloads.
- Active worker indices: `resume-logs-worker`, `resume-logs-worker-preview`, `resume-logs-job-worker`, `resume-logs-job-worker-staging`.
