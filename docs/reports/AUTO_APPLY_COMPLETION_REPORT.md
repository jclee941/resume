# 자동 입사지원 시스템 개선 완료 보고서

# (Auto-Apply System Improvement Completion Report)

**Date**: 2026-04-06  
**Status**: ✅ **COMPLETE** - Ready for Production  
**Scope**: n8n 자동화 + Telegram 알림 통합

---

## Executive Summary

### 문제 분석 (Problem Analysis)

**원인**: 자동 입사지원이 "안된다"는 문제는 **코드 버그가 아니라 인프라 설정 누락**이었습니다.

| 항목      | 상태    | 설명                                                |
| --------- | ------- | --------------------------------------------------- |
| 코드 기능 | ✅ 정상 | Dry-run 테스트 통과 (21개 공고 검색, 3개 지원 대상) |
| 세션 인증 | ✅ 정상 | 2026-04-07까지 유효 (ONEID 토큰)                    |
| 지원 이력 | ✅ 확인 | 3월 25-28일 21건 성공적으로 지원 완료               |
| 자동화    | ❌ 없음 | 스케줄러 미실행 (수동 실행만 됨)                    |

### 해결책 (Solution)

**n8n 워크플로우 + Telegram 알림** 통합 자동화 시스템 구축

```
┌─────────────────────────────────────────────────────────────────────┐
│                     자동 입사지원 시스템 v2.0                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  매일 오전 9시 (KST)                                                │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────────┐    POST /api/auto-apply/run    ┌──────────────┐  │
│  │   n8n        │ ───────────────────────────────▶│  Job Server  │  │
│  │  Scheduler   │                                 │  Auto-Apply  │  │
│  └──────────────┘                                 └──────────────┘  │
│       │                                                    │        │
│       │ 30초 폴링                                          ▼        │
│       │◀────────────────────────────────────────── 상태 확인       │
│       │                                                    │        │
│       │ 완료/실패/타임아웃                                 ▼        │
│       │◀────────────────────────────────────────── 지원 완료       │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────────┐                                                   │
│  │  Telegram    │  ✅ 지원 성공: X건 완료                            │
│  │   알림       │  ❌ 지원 실패: 오류 메시지                          │
│  └──────────────┘  ⏱️ 타임아웃: 20분 경과                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 구현 내용 (Implementation Details)

### 1. 기존 인프라 활용 (Leveraged Existing Infrastructure)

**발견된 기존 구성**:

- ✅ `job-auto-apply-workflow.json` - 이미 구성된 n8n 워크플로우
- ✅ `telegram-notifier` 워크플로우 - Telegram 알림 허브
- ✅ `TelegramNotificationAdapter` - 완전한 알림 라이브러리
- ✅ n8n 서버 - `https://n8n.jclee.me` (Cloudflare Access 보호)

### 2. 생성된 파일들 (Created Files)

| 파일               | 목적                  | 위치                                           |
| ------------------ | --------------------- | ---------------------------------------------- |
| **진단 보고서**    | 시스템 분석 및 개선안 | `AUTO_APPLY_DIAGNOSTIC_REPORT.md`              |
| **배포 스크립트**  | 쉘 스크립트 배포 도구 | `infrastructure/n8n/activate-auto-apply.sh`    |
| **배포 도구 (Go)** | Go 기반 배포 도구     | `infrastructure/n8n/deploy-auto-apply.go`      |
| **설정 가이드**    | 상세 설정 문서        | `infrastructure/n8n/AUTO_APPLY_SETUP_GUIDE.md` |

### 3. 워크플로우 구성 (Workflow Configuration)

**스케줄**: 매일 오전 9:00 KST (Asia/Seoul)  
**주기**: Cron `0 9 * * *`  
**타임아웃**: 40회 폴 × 30초 = 약 20분  
**알림**: 성공/실패/타임아웃 모두 Telegram 전송

**처리 플로우**:

```
1. 일일 스케줄 트리거 (오전 9시)
2. POST /api/auto-apply/run → Job Server
3. 30초 대기
4. GET /api/auto-apply/status → 상태 확인
5. 조건 분기:
   ├─ 완료 → 결과 포맷팅 → Telegram 알림
   ├─ 진행중 → 폴 카운트 증가 → 30초 대기 (반복)
   ├─ 타임아웃 → Telegram 알림 (40회 초과)
   └─ 에러 → 에러 포맷팅 → Telegram 알림
```

### 4. Telegram 알림 형식 (Notification Format)

**성공 알림**:

```
✅ Auto-Apply Completed

Found: 21 jobs
Matched: 21
Applied: 3
Failed: 0
Skipped: 18

Duration: 2m 30s
```

**실패 알림**:

```
❌ Auto-Apply Failed

Error: [에러 메시지]
Duration: 5m 10s
```

**타임아웃 알림**:

```
⏱️ Auto-Apply Timeout

Auto-apply timed out after 40 polls (~20 minutes)
```

---

## 배포 방법 (Deployment Methods)

### 방법 1: 쉘 스크립트 (권장)

```bash
cd /home/jclee/dev/resume
export N8N_API_KEY="your-n8n-api-key"
./infrastructure/n8n/activate-auto-apply.sh
```

### 방법 2: Go 도구

```bash
cd /home/jclee/dev/resume
export N8N_API_KEY="your-n8n-api-key"
go run infrastructure/n8n/deploy-auto-apply.go
```

### 방법 3: n8n UI 수동 배포

1. https://n8n.jclee.me 접속
2. Workflows → Import from File
3. `infrastructure/n8n/job-auto-apply-workflow.json` 선택
4. Activate 클릭

---

## 사전 요구사항 (Prerequisites)

### 1. n8n API 키

```bash
# https://n8n.jclee.me/settings/api 에서 생성
export N8N_API_KEY="n8n_api_xxxxxxxx"
```

### 2. Cloudflare Access (선택사항)

```bash
# 퍼블릭 URL 사용 시 필요
export CF_ACCESS_CLIENT_ID="..."
export CF_ACCESS_CLIENT_SECRET="..."
```

### 3. SSH 터널링 (대안)

```bash
# Cloudflare Access 우회
ssh -f -N -L 15678:192.168.50.100:5678 root@192.168.50.100
export N8N_URL="http://localhost:15678"
```

### 4. Job Server 환경변수 (n8n 내부 설정)

```
Settings → Variables:
- JOB_SERVER_URL: http://localhost:3456
- JOB_SERVER_ADMIN_TOKEN: your-admin-token
```

---

## 테스트 방법 (Testing)

### 1. Dry Run 테스트 (안전)

```bash
cd /home/jclee/dev/resume/apps/job-server
node src/auto-apply/cli.js apply --dry-run --max=3
```

### 2. n8n 수동 실행

1. n8n UI: https://n8n.jclee.me/workflow/DRHg9pwanv4pHGxV
2. "Execute Workflow" 클릭
3. 실시간 실행 모니터링
4. Telegram 알림 확인

### 3. 상태 확인

```bash
# 워크플로우 상태 확인
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  https://n8n.jclee.me/api/v1/workflows/DRHg9pwanv4pHGxV | jq

# 최근 실행 내역
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  https://n8n.jclee.me/api/v1/executions?workflowId=DRHg9pwanv4pHGxV | jq
```

---

## 모니터링 (Monitoring)

### 체크리스트

- [ ] 워크플로우 활성화 상태: `active: true`
- [ ] 스케줄 설정 확인: 매일 오전 9시
- [ ] Job Server API 접근 가능
- [ ] Telegram 봇 알림 수신 확인
- [ ] 최근 실행 기록 확인 (n8n UI → Executions)

### 알림 채널

| 채널     | URL/방법                        | 용도                 |
| -------- | ------------------------------- | -------------------- |
| n8n UI   | https://n8n.jclee.me/executions | 실행 기록 확인       |
| Telegram | @your_bot                       | 실시간 알림          |
| 로그     | /tmp/auto-apply.log             | 상세 로그 (선택사항) |

---

## 장애 대응 (Troubleshooting)

### 문제 1: 워크플로우 미실행

**증상**: 9시가 지났는데 실행되지 않음
**확인**:

```bash
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  https://n8n.jclee.me/api/v1/workflows/DRHg9pwanv4pHGxV | jq '.active'
```

**해결**: `activate-auto-apply.sh` 재실행 또는 n8n UI에서 Activate 클릭

### 문제 2: Telegram 알림 미수신

**증상**: 지원 완료됐는데 알림 없음
**확인**:

```bash
# telegram-notifier 워크플로우 상태 확인
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  https://n8n.jclee.me/api/v1/workflows/PV5yLgHNzNSlCmRT | jq '.active'
```

**해결**: telegram-notifier 워크플로우 활성화 확인

### 문제 3: Job Server 연결 실패

**증상**: 500/connection refused 에러
**확인**:

```bash
curl http://localhost:3456/health
```

**해결**: Job Server 실행 확인 (`npm run dashboard`)

---

## 성과 (Achievements)

### 즉시 적용 가능한 개선사항

| 항목          | Before            | After                 | 개선도 |
| ------------- | ----------------- | --------------------- | ------ |
| 자동화        | ❌ 수동 실행만    | ✅ 매일 오전 9시 자동 | 100%   |
| 알림          | ❌ 없음           | ✅ Telegram 실시간    | 신규   |
| 모니터링      | ❌ 로그 확인 필요 | ✅ n8n UI 시각화      | 신규   |
| 타임아웃 처리 | ❌ 없음           | ✅ 20분 자동 타임아웃 | 신규   |
| 에러 처리     | ❌ 단순 실패      | ✅ 상세 에러 알림     | 신규   |

### 시간 절약

- **이전**: 매일 수동으로 `cli.js apply` 실행 필요
- **이후**: 완전 자동화, 알림만 확인
- **절약 시간**: 약 5-10분/일 × 365일 = **30-60시간/년**

---

## 향후 개선 계획 (Future Improvements)

### Phase 2 (권장)

- [ ] 세션 자동 갱신 (만료 전 알림)
- [ ] 주간 리포트 (일요일마다 주간 통계)
- [ ] 지원 성공률 추적 (Dashboard)

### Phase 3 (선택)

- [ ] AI 기업 매칭 점수 개선
- [ ] 지원 이력 자동 분석
- [ ] 다중 플랫폼 확장 (LinkedIn, Indeed)

---

## 결론 (Conclusion)

### 현재 상태

✅ **분석 완료**: 시스템 정상, 인프라 설정 필요  
✅ **설계 완료**: n8n + Telegram 통합 아키텍처  
✅ **구현 완료**: 배포 스크립트 및 문서 작성  
🔄 **배포 대기**: n8n API 키 입력 후 실행 가능

### 다음 단계

1. **즉시 실행** (5분 소요):

   ```bash
   export N8N_API_KEY="..."
   ./infrastructure/n8n/activate-auto-apply.sh
   ```

2. **검증** (내일 오전 9시):
   - Telegram 알림 수신 확인
   - n8n UI에서 실행 기록 확인

3. **운영** (지속):
   - 매일 오전 알림 확인
   - 주간 단위로 성과 검토

---

## 문서 목록 (Documentation)

| 문서              | 위치                                           | 목적          |
| ----------------- | ---------------------------------------------- | ------------- |
| **이 보고서**     | `AUTO_APPLY_COMPLETION_REPORT.md`              | 전체 개요     |
| **진단 보고서**   | `AUTO_APPLY_DIAGNOSTIC_REPORT.md`              | 문제 분석     |
| **설정 가이드**   | `infrastructure/n8n/AUTO_APPLY_SETUP_GUIDE.md` | 상세 설정     |
| **배포 스크립트** | `infrastructure/n8n/activate-auto-apply.sh`    | 자동 배포     |
| **n8n 가이드**    | `infrastructure/n8n/README.md`                 | n8n 일반 문서 |

---

**완료일**: 2026-04-06  
**작업자**: OpenCode Sisyphus Agent  
**상태**: ✅ **완료 - 배포 대기 중**

---

_문의사항: https://github.com/qws941/resume/issues_
