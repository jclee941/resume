# CI/CD 빠른 진단 가이드

## ⚠️ 핵심 문제: GitLab Runner가 실행 중이 아님

### 즉시 확인 필요:

```bash
# GitLab 서버에 SSH 접속
ssh root@192.168.50.215

# Runner 상태 확인
docker ps | grep runner

# 실행 중이 아니면 시작
docker start gitlab-runner
```

### 또는 GitLab UI에서 확인:

```
http://192.168.50.215:8929/root/resume/-/pipelines
```

**Pipeline #363** 이상이 있는지 확인. 없으면 "Run pipeline" 버튼 클릭

---

## 📊 현재 상황

| 항목          | 상태         | 비고                         |
| ------------- | ------------ | ---------------------------- |
| 최신 커밋     | ✅ Push 완료 | 414ec60 (wrangler.jsonc fix) |
| 프로덕션 배포 | ❌ 오래됨    | 2026-04-04 (3일 전)          |
| 파이프라인    | ❌ 미실행    | #362 이후 없음               |
| GitLab Runner | ⚠️ 확인 필요 | SSH로 확인 필요              |

---

## ✅ 해결된 문제

**wrangler.jsonc JSON corruption** - ✅ 수정 완료

- `apps/job-dashboard/wrangler.jsonc` 깨진 JSON 구조 수정
- Commit: `414ec60`

---

## 🎯 다음 단계

1. **GitLab 서버 SSH 접속** → Runner 확인/시작
2. **GitLab UI에서 파이프라인 확인** → #363+ 있는지
3. **없으면 수동 실행** → "Run pipeline" 클릭
4. **배포 확인** → curl https://resume.jclee.me/health

---

## 📁 상세 문서

- `CICD_DEBUG_FINAL.md` - 전체 진단 보고서
- `CICD_DEBUG_REPORT.md` - 트러블슈팅 가이드
- `tools/scripts/ci-debug.sh` - 자동 진단 스크립트
