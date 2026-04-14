# N8N + Telegram 통합 가이드

## 개요

모든 입사지원 자동화 알림을 n8n을 통해 처리하고, n8n의 텔레그램 노드를 사용하여 알림을 전송합니다.

**아키텍처:**

```
GitHub Actions / Auto-Apply ──webhook──> n8n ──Telegram Node──> Telegram
                                    │
                                    └── Credentials (n8n에서 관리)
```

## n8n 워크플로우 설정

### 1. 워크플로우 임포트

1. n8n 웹 인터페이스 접속: `https://n8n.jclee.me`
2. **Workflows** → **Import from File**
3. 파일 선택: `infrastructure/n8n/workflows/job-automation-webhook.json`
4. **Import** 클릭

### 2. 텔레그램 크리덴셜 설정

1. **Settings** → **Credentials** → **New**
2. **Credential Type**: `Telegram Bot`
3. **Bot Token**: @BotFather에서 생성한 봇 토큰 입력
4. **Chat ID**: 알림을 받을 채팅방 ID
   - 개인 채팅: @userinfobot에서 사용자 ID 확인
   - 그룹: 그룹에 봇 추가 후 `/start`, 웹훅으로 chat_id 확인

### 3. 웹훅 URL 설정

워크플로우의 **Webhook** 노드에서:

- **HTTP Method**: POST
- **Path**: `job-automation` (또는 원하는 경로)
- **Response Mode**: Response Node

생성된 웹훅 URL을 복사하여 GitHub Actions secrets에 설정:

```
N8N_WEBHOOK_URL=https://n8n.jclee.me/webhook/job-automation
```

### 4. 워크플로우 활성화

1. **Save** 클릭
2. **Active** 토글 ON

## 이벤트 타입

n8n 웹훅은 다음 이벤트를 처리합니다:

| 이벤트          | 설명          | 텔레그램 메시지       |
| --------------- | ------------- | --------------------- |
| `apply_success` | 입사지원 성공 | 🎉 입사지원 완료      |
| `apply_failed`  | 입사지원 실패 | ⚠️ 입사지원 실패      |
| `resume_sync`   | 이력서 동기화 | 📝 이력서 동기화 완료 |

## 테스트

### 1. n8n 웹훅 테스트

```bash
curl -X POST https://n8n.jclee.me/webhook/job-automation \
  -H "Content-Type: application/json" \
  -d '{
    "event": "apply_success",
    "company": "테스트회사",
    "title": "DevOps Engineer",
    "url": "https://www.wanted.co.kr/wd/12345",
    "platform": "wanted",
    "timestamp": "2024-01-01T12:00:00Z"
  }'
```

### 2. GitHub Actions 테스트

수동 파이프라인 실행:

```bash
# GitHub Actions에서 워크플로우 실행
# 또는
# Auto-apply 실행
node apps/job-server/scripts/auto-all.js --apply
```

## 문제 해결

### 텔레그램 메시지가 오지 않음

1. **n8n 로그 확인**: Executions → 해당 실행 클릭 → 로그 확인
2. **크리덴셜 확인**: Telegram Bot Token, Chat ID 정확한지 확인
3. **봇 권한 확인**: 텔레그램 그룹에 봇이 추가되었는지 확인

### 웹훅이 도착하지 않음

1. **GitHub Actions 로그**: 워크플로우 로그에서 "n8n webhook sent" 확인
2. **n8n 웹훅 URL**: 정확한지 확인 (trailing slash 주의)
3. **방화벽**: n8n 서버가 외부에서 접근 가능한지 확인

## 파일 구조

```
apps/job-server/src/shared/services/n8n/index.js  # n8n 서비스
.github/workflows/n8n-notifications.yml             # GitHub Actions 워크플로우
infrastructure/n8n/workflows/job-automation-webhook.json  # n8n 워크플로우
```

## 참고

- n8n 크리덴셜은 n8n 내에서만 관리됨 (GitHub Actions secrets에 저장하지 않음)
- 모든 알림은 n8n을 통과함 (직접 Telegram API 호출 없음)
- 웹훅 실패핫더라도 입사지원 프로세스는 계속 진행됨 (non-blocking)
