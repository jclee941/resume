# Evolution API 설정 가이드 (n8n WhatsApp 연동)

## 개요

n8n 워크플로우에서 WhatsApp 메시지를 전송하기 위한 Evolution API 설정 가이드입니다.
기존 Slack 알림을 WhatsApp으로 대체합니다.

## 사전 요구사항

- Evolution API 서버 (자체 호스팅 또는 클라우드)
- WhatsApp 계정 및 연동된 인스턴스
- n8n 서버 (https://n8n.jclee.me)

## 1단계: Evolution API 서버 확인

Evolution API 서버가 실행 중인지 확인합니다:

```bash
curl -s https://your-evolution-api.example.com/instance/fetchInstances \
  -H "apikey: YOUR_API_KEY" | jq
```

## 2단계: WhatsApp 인스턴스 생성

인스턴스가 없는 경우 새로 생성합니다:

```bash
curl -X POST https://your-evolution-api.example.com/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_GLOBAL_API_KEY" \
  -d '{
    "instanceName": "resume-bot",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'
```

응답에서 QR 코드를 스캔하여 WhatsApp을 연결합니다.

## 3단계: n8n 환경변수 설정

n8n 서버에 다음 환경변수를 설정합니다:

| 변수명                      | 설명                     | 예시                         |
| --------------------------- | ------------------------ | ---------------------------- |
| `EVOLUTION_API_URL`         | Evolution API 기본 URL   | `https://evolution.jclee.me` |
| `EVOLUTION_API_KEY`         | API 인증 키              | `your-api-key-here`          |
| `EVOLUTION_INSTANCE_NAME`   | WhatsApp 인스턴스 이름   | `resume-bot`                 |
| `EVOLUTION_WHATSAPP_NUMBER` | 수신자 전화번호 (+ 없이) | `821012345678`               |

### Docker Compose 설정 예시

```yaml
# n8n docker-compose.yml
services:
  n8n:
    environment:
      - EVOLUTION_API_URL=https://evolution.jclee.me
      - EVOLUTION_API_KEY=your-api-key-here
      - EVOLUTION_INSTANCE_NAME=resume-bot
      - EVOLUTION_WHATSAPP_NUMBER=821012345678
```

### .env 파일 설정 예시

```env
EVOLUTION_API_URL=https://evolution.jclee.me
EVOLUTION_API_KEY=your-api-key-here
EVOLUTION_INSTANCE_NAME=resume-bot
EVOLUTION_WHATSAPP_NUMBER=821012345678
```

## 4단계: 연결 테스트

환경변수 설정 후 메시지 전송을 테스트합니다:

```bash
curl -X POST "$EVOLUTION_API_URL/message/sendText/$EVOLUTION_INSTANCE_NAME" \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -d "{
    \"number\": \"$EVOLUTION_WHATSAPP_NUMBER\",
    \"text\": \"✅ n8n Evolution API 연동 테스트 성공\"
  }"
```

### 성공 응답 예시

```json
{
  "key": {
    "id": "3EB0B430A2B7F1D3C700"
  }
}
```

`key.id`가 포함된 응답이 오면 설정이 정상입니다.

## 5단계: n8n 워크플로우 활성화

1. https://n8n.jclee.me 접속
2. `evolution-notifier` 워크플로우 확인 → Active 토글 ON
3. `hycu-lms-attendance` 워크플로우 확인 → Active 토글 ON
4. 테스트 실행으로 WhatsApp 메시지 수신 확인

## API 레퍼런스

### 메시지 전송 (sendText)

```
POST /message/sendText/{instanceName}
Header: apikey: {api_key}
Body: {
  "number": "821012345678",
  "text": "메시지 내용"
}
```

### 필수 필드

| 필드     | 타입   | 설명                                    |
| -------- | ------ | --------------------------------------- |
| `number` | string | 수신자 전화번호 (+ 없이, 국가번호 포함) |
| `text`   | string | 메시지 내용                             |

### 선택 필드

| 필드          | 타입    | 설명                 |
| ------------- | ------- | -------------------- |
| `delay`       | number  | 전송 지연 (ms)       |
| `linkPreview` | boolean | 링크 미리보기 활성화 |

## 문제 해결

### 메시지 전송 실패

1. **인스턴스 상태 확인**: `GET /instance/connectionState/{instanceName}`
2. **API 키 확인**: `apikey` 헤더가 올바른지 확인
3. **전화번호 형식**: `+` 없이 국가번호 포함 (예: `821012345678`)
4. **인스턴스 연결**: QR 코드 재스캔이 필요할 수 있음

### n8n 환경변수 미적용

1. n8n 서버 재시작: `docker compose restart n8n`
2. 환경변수 확인: n8n Settings → Variables에서 값 확인
3. 워크플로우에서 `$env.EVOLUTION_API_URL` 등 참조 확인

---

**최종 수정**: 2026-03-15
**대체 문서**: `SLACK_OAUTH2_SETUP.md` (더 이상 사용하지 않음)
