# QUEUES KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Queue batch ingestion, priority sorting, Workflow dispatch, metrics, and notification dead letters.

Scope reason: existing distinct asynchronous-ingestion domain.

## WHERE TO LOOK

| Task                 | Location                                                  | Notes                                           |
| -------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Batch handling       | `queue-consumer.js`                                       | Consumer orchestration                          |
| Enqueue capability   | `queue-request.js`                                        | `QUEUE_NAME`, capability check, request parsing |
| Producer helper      | `queue-enqueuer.js`                                       | Queue send boundary                             |
| Message contract     | `queue-message-constants.js`                              | Types, priorities, retry delays                 |
| Processing           | `queue-message-processor.js`                              | Per-message results and retry decisions         |
| Workflow dispatch    | `queue-workflow-dispatcher.js`                            | Binding selection by message type               |
| Ordering and metrics | `queue-message-sorter.js`, `queue-metrics-recorder.js`    | Priority ordering and D1 metrics                |
| Notifications        | `notification-consumer.js`, `notification-dlq-handler.js` | Delivery and dead-letter persistence            |

## CONVENTIONS

- Sort batch messages by priority before dispatch.
- Add message types in the constants module, processor, dispatcher, and associated tests together.
- Preserve APPLY fields `candidates`, `platforms`, `searchCriteria`, and `triggerType` when forwarding to the application Workflow.
- Record handled failures in metrics as well as retry results.
- Dead-letter KV entries need expiry and diagnostic context without secrets.
- Notification consumers export Worker-style default objects; queue infrastructure uses named classes/helpers.
- Queue integration coverage is in `tests/unit/job-dashboard/`; this directory has no colocated tests.

## ANTI-PATTERNS

- Do not silently accept unknown message types.
- Do not dispatch before validating message shape and queue capability.
- Do not add unbounded retries or sleeps to consumers.
- Do not acknowledge a failure without preserving its observable outcome.

Parent: [../AGENTS.md](../AGENTS.md)
