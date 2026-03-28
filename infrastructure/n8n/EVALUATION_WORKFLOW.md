# n8n Evaluation Workflow

## 개요

이 문서는 Resume 포트폴리오의 n8n 워크플로우 평가 및 디버깅을 위한 Evaluation Workflow를 설명합니다.

## Resume Evaluation Workflow

**파일**: `infrastructure/n8n/resume/resume-evaluation-workflow.json`

### 기능

이 워크플로우는 다음 검사를 수행합니다:

1. **Health Check** - `/health` 엔드포인트 확인
   - HTTP 200 응답 확인
   - `status: "healthy"` 확인

2. **Metrics Check** - `/metrics` 엔드포인트 확인
   - Prometheus 메트릭 존재 확인
   - `http_requests_total` 확인
   - `http_requests_error` 확인
   - `http_response_time_seconds` 확인

3. **평가 결과 집계**
   - 전체 검사 통과/실패 여부
   - 개별 검사 상세 결과
   - Telegram 알림 전송

### 사용 방법

#### 수동 실행

1. n8n 대시보드 접속: https://n8n.jclee.me
2. "Resume Workflow Evaluation" 워크플로우 선택
3. "Execute Workflow" 버튼 클릭

#### 자동화된 평가

GitLab CI/CD 파이프라인에서 자동으로 실행됩니다:

```yaml
evaluate:
  stage: evaluate
  script:
    - curl -X POST https://n8n.jclee.me/webhook/evaluation-trigger
```

### 평가 기준

| 검사 항목 | 통과 기준                  | 실패 시 조치       |
| --------- | -------------------------- | ------------------ |
| Health    | HTTP 200 + status: healthy | Telegram 실패 알림 |
| Metrics   | 모든 메트릭 존재           | Telegram 실패 알림 |

### 알림

- **성공 시**: Telegram 성공 메시지
- **실패 시**: Telegram 실패 메시지 (상세 정보 포함)

### 워크플로우 구조

```
[Manual Trigger]
    ↓
[Health Check] ───────┐
    ↓                 │
[Evaluate Health]     │
    ↓                 │
[Summary] ←───────────┤
    ↓                 │
[Metrics Check] ──────┤
    ↓                 │
[Evaluate Metrics] ───┘
    ↓
[All Passed?]
    ↓
[Telegram Success] / [Telegram Failure]
```

### 관련 파일

- 워크플로우 정의: `infrastructure/n8n/resume/resume-evaluation-workflow.json`
- 통합 워크플로우: `infrastructure/n8n/resume/resume-unified-workflow.json`
- 문서: `infrastructure/n8n/EVALUATION_WORKFLOW.md` (이 파일)

## 통합 평가

Resume Unified Workflow에 통합된 평가 기능:

### 평가 트리거

- **스케줄**: 매 5분마다 (Health Check)
- **수동**: n8n 대시보드에서 실행
- **웹훅**: GitLab/GitHub 이벤트

### 평가 결과 저장

모든 평가 결과는 다음 위치에 저장됩니다:

- **Grafana**: 평가 대시보드
- **Loki**: 평가 로그
- **Telegram**: 실시간 알림

## 문제 해결

### 평가 실패 시

1. Health Check 실패:

   ```bash
   curl https://resume.jclee.me/health
   ```

2. Metrics Check 실패:

   ```bash
   curl https://resume.jclee.me/metrics
   ```

3. 워크플로우 로그 확인:
   - n8n 대시보드 → Executions → 해당 실행 선택

### 디버깅

1. n8n에서 워크플로우 열기
2. 개별 노드 클릭 → "Execute Node"로 단계별 실행
3. 각 노드의 출력 데이터 확인

---

**생성일**: 2026-03-28
**워크플로우 ID**: 평가 워크플로우
**버전**: 1.0.0
