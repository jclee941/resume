# 다음 액션

## 프로필 sync

SSoT 문구를 플랫폼별 생성 데이터에 반영한다.

```bash
npm run sync:data
```

확인할 항목:
- Wanted와 JobKorea 헤드라인이 `profile-copy.md`와 같은가
- JobKorea 소개에 CCNP가 포함되어 있는가
- 공개 포트폴리오에 jclee-bot proof path가 보이는가
- 공개 프로젝트/인프라 카드에 `mcp`, `idle-outpost`, `account` 계열이 노출되지 않는가

플랫폼 프로필 동기화는 세션/로그인이 필요하므로, 세션이 준비된 상태에서만 실행한다.

## 잡코리아/사람인 검토 큐 제출

기존 문서: `applications/_auto-apply-runs/HOW-TO-SUBMIT.md`

원칙:
- 먼저 dry-run
- 세션 유효성 확인
- `--apply --max=N`으로 제한 제출
- 자소서 fallback 문구는 제출 전 직접 검토
- 민감 질문, 캡차, 2FA, 법적 동의 항목이 있으면 자동 제출 금지

## 오늘 바로 할 수 있는 지원 흐름

1. `profile-copy.md`의 Wanted/JobKorea 문구 반영
2. 보안/SRE/DevSecOps 키워드로 공고 검색
3. `application-scorecard.md` 기준 8점 이상만 선별
4. 선별 공고에 맞춰 `outreach-templates.md` 첫 문단의 `[공고 키워드]`만 교체
5. 지원 후 3영업일 내 팔로업

## 지원하면 좋은 검색어

- 보안 운영
- 보안 인프라
- 정보보안 엔지니어
- DevSecOps
- SRE
- Observability
- SIEM
- Splunk
- FortiGate
- 네트워크 보안
- 클라우드 보안
- 인프라 자동화
