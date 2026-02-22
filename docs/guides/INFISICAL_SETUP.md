# Infisical 시크릿 관리 설정 가이드

**작성일**: 2025-12-22  
**목적**: 하드코딩된 API 키/토큰을 Infisical로 안전하게 관리

---

## 📋 마이그레이션 대상 시크릿

| 시크릿 이름             | 현재 위치       | 상태                 |
| ----------------------- | --------------- | -------------------- |
| `CLOUDFLARE_API_TOKEN`  | `.dev.vars`     | ⚠️ 폐기 필요         |
| `CLOUDFLARE_ACCOUNT_ID` | `.dev.vars`     | 🔄 마이그레이션      |
| `GRAFANA_API_KEY`       | `opencode.json` | ✅ 환경변수로 변경됨 |
| `SARAMIN_API_KEY`       | `~/.env`        | 🔄 마이그레이션      |

---

## 🚀 설정 단계

### 1. Infisical 로그인

```bash
# 브라우저 기반 로그인
infisical login

# 또는 서비스 토큰 사용 (CI/CD용)
export INFISICAL_TOKEN="your-service-token"
```

### 2. 프로젝트 초기화

```bash
cd /home/jclee/dev/resume

# 프로젝트 연결 (대화형)
infisical init

# 또는 직접 설정
# .infisical.json의 workspaceId를 Infisical 대시보드에서 복사
```

### 3. 시크릿 등록

```bash
# 개별 등록
infisical secrets set CLOUDFLARE_ACCOUNT_ID="a8d9c67f586acdd15eebcc65ca3aa5bb" --env=prod
infisical secrets set GRAFANA_API_KEY="새로운_API_키" --env=prod

# 또는 파일에서 일괄 등록
infisical secrets set --env=prod < secrets.env
```

### 4. 시크릿 조회

```bash
# 모든 시크릿 조회
infisical secrets --env=prod

# 특정 시크릿 조회
infisical secrets get CLOUDFLARE_ACCOUNT_ID --env=prod
```

### 5. 환경 변수로 주입

```bash
# 명령어 실행 시 자동 주입
infisical run --env=prod -- npm run deploy

# 또는 .env 파일 생성
infisical secrets generate-example-env --env=prod > .env.infisical
```

---

## 🔧 프로젝트 설정

### opencode.json 수정

```json
{
  "mcpServers": {
    "grafana": {
      "environment": {
        "GRAFANA_URL": "http://localhost:3000",
        "GRAFANA_API_KEY": "{env:GRAFANA_API_KEY}"
      }
    }
  }
}
```

### GitHub Actions 연동

```yaml
# .github/workflows/ci.yml
variables:
  INFISICAL_TOKEN: $INFISICAL_SERVICE_TOKEN

deploy:
  script:
    - infisical run --env=prod -- npm run deploy
```

### wrangler.toml 수정

```toml
# Cloudflare Workers 배포 시
[vars]
# 민감하지 않은 변수만 여기에

# 민감한 변수는 Cloudflare 대시보드 또는 wrangler secret으로 관리
# wrangler secret put CLOUDFLARE_API_TOKEN
```

---

## 🔐 보안 체크리스트

- [ ] 기존 Cloudflare API Token 폐기 (Cloudflare 대시보드)
- [ ] 기존 Grafana API Key 폐기 (Grafana 대시보드)
- [ ] 새 토큰 생성 및 Infisical에 등록
- [ ] `.dev.vars` 파일 삭제 또는 비우기
- [ ] Git 히스토리에서 시크릿 제거 (필요시)
- [ ] CI/CD 파이프라인에 Infisical 연동

---

## 📝 Git 히스토리 정리 (선택사항)

시크릿이 Git 히스토리에 남아있다면:

```bash
# BFG Repo-Cleaner 사용
bfg --delete-files .dev.vars
bfg --replace-text passwords.txt

# 또는 git filter-branch
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .dev.vars' \
  --prune-empty --tag-name-filter cat -- --all

# 강제 푸시 (주의!)
git push origin --force --all
```

---

## 🔗 참고 자료

- [Infisical 공식 문서](https://infisical.com/docs)
- [Cloudflare API Token 관리](https://dash.cloudflare.com/profile/api-tokens)
- [Grafana API Key 관리](https://grafana.com/docs/grafana/latest/administration/api-keys/)
