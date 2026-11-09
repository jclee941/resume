# 대시보드 및 관측 경로

> **경로 안내 (2026-11-09).** 예전 포트폴리오 생성기 기준의 상세 목록과
> 보안 상태 주장은 현재 상태를 보증하지 않습니다. 아래 링크는 현재 경로
> 소유자를 찾기 위한 안내이며, 실제 공개 상태는 배포 환경에서 별도로
> 확인해야 합니다.

## 포트폴리오 Worker

| 경로                                                           | 현재 소유자                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/health`, `/api/status`                                       | [Health 경로 생성기](../../apps/portfolio/lib/worker-routes/health-route.js)   |
| `/metrics`                                                     | [Metrics 경로 생성기](../../apps/portfolio/lib/worker-routes/metrics-route.js) |
| `/api/vitals`, `/api/analytics`, `/api/track`, `/api/cf/stats` | [관측 경로](../../apps/portfolio/lib/routes/observability.js)                  |
| `/api/metrics`                                                 | [Metrics API 경로](../../apps/portfolio/lib/routes/metrics.js)                 |

## 작업 대시보드

대시보드는 포트폴리오 Worker에 프로세스 내부로 연결됩니다. 공개 경로의
`/job` 접두사는 내부 라우팅 전에 제거됩니다.

- `/job/` 대시보드 UI와 HTTP 라우팅: [dashboard Worker entry](../../apps/job-dashboard/src/index.js)
- `/job/mcp` MCP transport: [MCP handler](../../apps/job-dashboard/src/mcp/handler.js)
- HTTP route registrations: [route owners](../../apps/job-dashboard/src/routes/index.js)

세부 API 계약은 [대시보드 API 참고 문서](../../apps/job-dashboard/API_REFERENCE.md)를
확인하고, 동작과 접근 정책은 연결된 현재 구현에서 검증하세요.
