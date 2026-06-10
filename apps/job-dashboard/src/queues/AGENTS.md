# DASHBOARD QUEUES KNOWLEDGE BASE

**Generated:** 2026-06-10
**Commit:** `b74e95d1`
**Branch:** `master`

## OVERVIEW

Queue modules own Cloudflare Queue ingestion, message prioritization, workflow
dispatch, metrics, and notification dead-letter handling for dashboard
automation.

## STRUCTURE

```text
queues/
├── queue-consumer.js              # batch consumer orchestration
├── queue-enqueuer.js              # enqueue helpers
├── queue-message-processor.js     # per-message handling and retries
├── queue-workflow-dispatcher.js   # workflow dispatch by message type
├── queue-message-constants.js     # message types, priorities, retry delays
├── queue-message-sorter.js        # priority ordering
├── queue-metrics-recorder.js      # D1 metrics writes
├── notification-consumer.js       # notification queue consumer
└── notification-dlq-handler.js    # notification dead-letter persistence
```

## CONVENTIONS

- Message type constants are the contract; update processor, dispatcher, and
  tests together when adding a type.
- Keep retry behavior bounded and visible in result/metric output.
- Preserve priority sorting before dispatch so urgent automation tasks run
  first.
- Dead-letter records in KV must include TTL and enough context for diagnosis
  without storing secrets.

## ANTI-PATTERNS

- Do not dispatch unknown message types silently.
- Do not perform destructive work before validating the message shape.
- Do not add unbounded retry loops or sleeps in queue consumers.
- Do not bypass metrics recording for handled failures.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
