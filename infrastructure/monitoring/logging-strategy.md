# Logging Strategy

## Current State

Elasticsearch is not part of the stack. The Worker logs through the canonical
`@resume/shared/logger` with two transports:

| Backend                    | Transport                                      | Use Cases                                                  | Status                             |
| -------------------------- | ---------------------------------------------- | ---------------------------------------------------------- | ---------------------------------- |
| **Workers Logs (console)** | `createConsoleTransport()` (default transport) | Request logs, warnings, debug output emitted by the Worker | **Default** — no configuration     |
| **Loki**                   | `createLokiTransport()` (opt-in)               | Optional push to Grafana Loki when `LOKI_API_KEY` is set   | Opt-in, silent no-op without a key |

## Console Transport Contract

- `INFO` writes one JSON line through `console.log`, `WARN` through
  `console.warn`, `DEBUG` through `console.debug`.
- Each line is `{ level, service, message, ...labels }`; labels carry request
  context and `traceId` when a `traceparent` header was present.
- `ERROR` and `FATAL` write nothing from the transport: `Logger.error` and
  `Logger.fatal` already call `console.error`, so the transport would only
  duplicate the line.
- Cloudflare Workers Logs persists console output, so no outbound HTTP call is
  made per log event.

## Roles

| Backend          | Responsibility                                            |
| ---------------- | --------------------------------------------------------- |
| **Workers Logs** | Application logs: requests, warnings, errors, debug lines |
| **Loki**         | Optional infrastructure/ops logs pushed via the transport |
| **Prometheus**   | Metrics and alert rules (see `configs/grafana`)           |

## Success Criteria

- [x] Each application log event goes to exactly one sink by default
- [x] Grafana alert rules only query Prometheus
- [x] No Elasticsearch datasource, secret, or pipeline remains in the repo
