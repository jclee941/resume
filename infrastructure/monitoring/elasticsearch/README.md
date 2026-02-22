# ELK Log Pipeline for Resume Workers

This directory contains baseline configuration to forward structured JSON logs from Cloudflare Workers into Elasticsearch and query them in Kibana.

## Files

- `pipeline.json`: Filebeat + Elasticsearch ingest pipeline definition for `resume-logs-*`.
- `index-template.json`: Elasticsearch index template with mappings for core log fields.
- `kibana-patterns.json`: Kibana index pattern export targeting `resume-logs-*`.

## Worker Log Shape

Expected log payload fields:

```json
{
  "@timestamp": "2026-02-15T12:00:00.000Z",
  "level": "INFO",
  "message": "GET /healthz 200 18ms",
  "correlationId": "a97c0f3f4f8b4f61bde3cb7a67f48b31",
  "traceId": "a97c0f3f4f8b4f61bde3cb7a67f48b31",
  "traceparent": "00-a97c0f3f4f8b4f61bde3cb7a67f48b31-00f067aa0ba902b7-01",
  "tracestate": "vendor=value",
  "trace": { "id": "a97c0f3f4f8b4f61bde3cb7a67f48b31" },
  "service": "portfolio-worker",
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
   - Extract `elasticsearch_ingest_pipeline` from `pipeline.json`.
   - Create with API:

   ```bash
   curl -X PUT "$ELASTICSEARCH_URL/_ingest/pipeline/resume-logs-ingest" \
     -H "Authorization: ApiKey $ELASTICSEARCH_API_KEY" \
     -H "Content-Type: application/json" \
     -d @pipeline.json
   ```

2. **Create index template**

   ```bash
   curl -X PUT "$ELASTICSEARCH_URL/_index_template/resume-logs-template" \
     -H "Authorization: ApiKey $ELASTICSEARCH_API_KEY" \
     -H "Content-Type: application/json" \
     -d @index-template.json
   ```

3. **Configure Filebeat / log shipper**
   - Enable JSON parsing (`json.keys_under_root: true`).
   - Send to index `resume-logs-%{+yyyy.MM.dd}`.
   - Use ingest pipeline `resume-logs-ingest`.

4. **Import Kibana index pattern**
   - Stack Management -> Saved Objects -> Import.
   - Import `kibana-patterns.json`.

## Cloudflare Worker Forwarding Notes

- Keep logs as newline-delimited JSON.
- Include a `correlationId` per request for cross-service tracing.
- Include W3C trace context fields (`traceId`, `traceparent`, `tracestate`) when available.
- Use async fire-and-forget log delivery to avoid request latency impact.
- Do not include secrets or user PII in log payloads.
