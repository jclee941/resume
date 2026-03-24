# 기존 Slack Credential 사용하기

현재 등록된 Slack credential을 OAuth2 워크플로우에 적용하는 방법입니다.

## Step 1: n8n에서 Credential ID 확인

1. **n8n UI 접속**: https://n8n.jclee.me
2. **Settings (⚙️) → Credentials** 메뉴 클릭
3. Slack 관련 credential 찾기:
   - `Slack OAuth2 API` 또는
   - `Slack API` 또는
   - 다른 Slack credential 이름
4. Credential을 클릭하여 열기
5. **브라우저 주소창에서 ID 확인**:
   ```
   https://n8n.jclee.me/credentials/{CREDENTIAL_ID}
   예: https://n8n.jclee.me/credentials/3
   ```

## Step 2: 워크플로우 업데이트 (방법 A - UI에서 직접)

1. **워크플로우 열기**: https://n8n.jclee.me/workflow/yCWYRtQsXNIsENi1
2. **"Send Slack Alert (OAuth2)" 노드** 클릭
3. **Credentials** 드롭다운에서 기존 credential 선택
4. **Save** 클릭
5. **Active** 토글 ON

## Step 2: 워크플로우 업데이트 (방법 B - JSON 수정 후 재배포)

워크플로우 JSON 파일을 수정하여 배포:

```bash
cd ~/dev/resume

# 1. OAuth2 워크플로우 파일 편집
vim infrastructure/n8n/resume-healthcheck-oauth2.json

# 2. Slack 노드의 credentials 섹션 찾기 (line 123-128)
# "credentials": {
#   "slackOAuth2Api": {
#     "id": "YOUR_CREDENTIAL_ID",  ← 여기 수정
#     "name": "YOUR_CREDENTIAL_NAME"  ← 여기 수정
#   }
# }

# 3. 저장 후 재배포
cat infrastructure/n8n/resume-healthcheck-oauth2.json | \
  jq 'del(.id, .versionId, .meta, .tags, .pinData)' > /tmp/workflow-oauth2-clean.json

# 4. 기존 워크플로우 업데이트 (PUT)
curl -s -X PUT \
  "https://n8n.jclee.me/api/v1/workflows/yCWYRtQsXNIsENi1" \
  -H 'X-N8N-API-KEY: YOUR_N8N_API_KEY' \
  -H 'Content-Type: application/json' \
  -d @/tmp/workflow-oauth2-clean.json | jq .
```

## Step 3: 워크플로우 활성화

API로는 활성화할 수 없으므로 UI에서:

1. https://n8n.jclee.me/workflow/yCWYRtQsXNIsENi1
2. 우측 상단 **Active** 토글 ON

## Step 4: 테스트

```bash
# 수동 실행 (Execute Workflow 버튼)
# 또는 5분 대기 후 자동 실행 확인

# Slack 채널에서 알림 확인
```

## 현재 등록 가능한 Slack Credential 타입

n8n에서 지원하는 Slack credential 타입:

1. **Slack OAuth2 API** (권장 - OAuth2 기반)
   - Type: `slackOAuth2Api`
   - 자동 토큰 갱신
   - 가장 안전한 방법

2. **Slack API** (Bot Token)
   - Type: `slackApi`
   - Bot User OAuth Token 직접 입력
   - 단순하지만 수동 토큰 관리 필요

3. **Incoming Webhook**
   - Type: `slackWebhookApi`
   - Webhook URL만 필요
   - 가장 간단하지만 제한적

## 권장 사항

- **OAuth2 기반 credential 사용 권장** (`slackOAuth2Api`)
- 기존에 등록된 credential이 없다면: [SLACK_OAUTH2_SETUP.md](SLACK_OAUTH2_SETUP.md) 참조
- Credential 타입이 워크플로우와 일치해야 함:
  - 현재 워크플로우는 `slackOAuth2Api` 타입 사용
  - 다른 타입 credential을 사용하려면 워크플로우 노드 타입도 변경 필요

## Troubleshooting

### "Credential not found" 오류

- Credential ID가 올바른지 확인
- Credential이 동일한 n8n 인스턴스에 등록되어 있는지 확인

### "Invalid credentials" 오류

- Credential 타입이 `slackOAuth2Api`인지 확인
- Credential이 올바르게 설정되었는지 재확인 (Settings → Credentials → Test)

### "Channel not found" 오류

- Slack bot이 해당 채널에 초대되었는지 확인
- 채널 이름에 `#` 포함 확인 (예: `#monitoring`)
