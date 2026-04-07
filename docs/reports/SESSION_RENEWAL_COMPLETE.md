# ✅ n8n 자동 입사지원 + 세션 갱신 완료 보고서

**완료일**: 2026-04-06  
**상태**: 🚀 **전체 시스템 활성화 완료**

---

## 📋 완료된 작업

### 1. 자동 입사지원 워크플로우 (Auto-Apply)

- ✅ **워크플로우 ID**: `DRHg9pwanv4pHGxV`
- ✅ **스케줄**: 매일 오전 9:00 KST
- ✅ **상태**: ACTIVE
- ✅ **Telegram 알림**: 활성화

### 2. 세션 갱신 워크플로우 (Session Renewal)

- ✅ **워크플로우 ID**: `session-renewal-wanted`
- ✅ **스케줄**: 매일 오전 8:00 KST
- ✅ **상태**: ACTIVE
- ✅ **목적**: 자동 입사지원 전 세션 갱신

### 3. API 엔드포인트 추가

- ✅ **POST** `/api/auth/renew` - 세션 갱신 엔드포인트
- ✅ **POST** `/api/auth/set` - 세션 저장
- ✅ **GET** `/api/auth/status` - 세션 상태 확인

---

## ⏰ 전체 타임라인

```
08:00 AM KST ┌─────────────────────────────────────┐
             │  Session Renewal Workflow 실행      │
             │  - Chrome DevTools로 쿠키 추출      │
             │  - Wanted 세션 갱신                 │
             │  - Telegram 알림 (성공/실패)        │
             └─────────────────────────────────────┘
                              ↓
09:00 AM KST ┌─────────────────────────────────────┐
             │  Auto-Apply Workflow 실행           │
             │  - 채용공고 검색 (Wanted)           │
             │  - 매칭 점수 계산 (≥75% 자동지원)    │
             │  - 입사지원 실행                    │
             │  - Telegram 알림 (결과)             │
             └─────────────────────────────────────┘
```

---

## 🔔 알림 설정

### Telegram 알림 수신 내용:

**세션 갱신 성공**:

```
✅ Session Renewal Success

Platform: wanted
Status: success
Time: 08:00 AM KST
Message: Session renewed successfully
```

**세션 갱신 실패** (수동 개입 필요):

```
⚠️ Session Renewal Failed

Platform: wanted
Status: failed
Error: Chrome DevTools not available
Action: Manual login required
```

**입사지원 결과**:

```
✅ Auto-Apply Completed

Found: 21 jobs
Matched: 21
Applied: 3
Failed: 0
Skipped: 18

Duration: 2m 30s
```

---

## 🛠️ 생성된 파일들

| 파일                     | 위치                                                       | 용도            |
| ------------------------ | ---------------------------------------------------------- | --------------- |
| Auto-Apply Workflow      | `infrastructure/n8n/job-auto-apply-workflow.json`          | 메인 자동 지원  |
| Session Renewal Workflow | `infrastructure/n8n/session-renewal-workflow.json`         | 세션 갱신       |
| 배포 스크립트            | `infrastructure/n8n/deploy-session-renewal.sh`             | 워크플로우 배포 |
| 세션 갱신 스크립트       | `apps/job-server/scripts/renew-session.sh`                 | 로컬 세션 갱신  |
| API 라우트               | `apps/job-server/src/server/routes/auth.js`                | 인증 API        |
| Auth 서비스              | `apps/job-server/src/shared/services/auth/auth-service.js` | 비즈니스 로직   |

---

## 🔧 수동 개입 필요 시

### 세션 갱신 실패 시 (Chrome DevTools 없음):

1. **Chrome 실행** (원격 디버깅 포트 활성화):

```bash
# 로컬에서 실행
google-chrome --remote-debugging-port=9222 https://www.wanted.co.kr

# 로그인 후 브라우저 유지
```

2. **세션 수동 추출**:

```bash
cd /home/jclee/dev/resume/apps/job-server
node scripts/extract-cookies-cdp.js wanted
```

3. **또는 직접 쿠키 입력**:

```bash
node src/tools/auth.js set_cookies "YOUR_COOKIE_STRING_HERE"
```

---

## ✅ 검증 체크리스트

- [x] n8n 워크플로우 임포트 완료
- [x] n8n 워크플로우 활성화 완료
- [x] 환경변수 설정 완료 (JOB_SERVER_URL, JOB_SERVER_ADMIN_TOKEN)
- [x] API 엔드포인트 추가 완료
- [x] 세션 갱신 로직 구현 완료
- [x] Telegram 알림 통합 완료
- [x] 스케줄 설정 완료 (8:00 AM / 9:00 AM)

---

## 🎯 다음 단계

1. **오늘 밤**: Chrome DevTools 실행 (세션 갱신 자동화)
2. **내일 오전 8시**: 첫 세션 갱신 시도
3. **내일 오전 9시**: 첫 자동 입사지원 실행
4. **Telegram**: 알림 수신 확인

---

## 📊 모니터링

### n8n 대시보드:

- URL: https://n8n.jclee.me
- Workflows → `job-auto-apply` / `session-renewal-wanted`

### 로그 확인:

```bash
# n8n 로그
ssh root@192.168.50.110 'docker logs n8n --tail 100'

# 세션 상태 확인
cd apps/job-server && node -e "const {SessionManager} = require('./src/shared/services/session'); console.log(SessionManager.getStatus());"
```

---

## 🎉 완료!

**모든 자동화가 설정되었습니다!**

- 매일 오전 8시: 세션 자동 갱신 시도
- 매일 오전 9시: 자동 입사지원 실행
- Telegram: 실시간 알림 수신

**내일부터 완전 자동화됩니다!** 🚀
