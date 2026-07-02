# 채용 성공 마스터플랜

작성일: 2026-07-02

## 목표

공개 포트폴리오, 플랫폼 프로필, 지원 운영 패킷을 하나의 흐름으로 맞춘다. 채용 담당자가 `resume.jclee.me`에서 역할 적합성을 빠르게 확인하고, 지원 전에는 `applications/job-search-2026-07/` 패킷으로 맞지 않는 공고를 걸러낸다.

## 시장 판단

2026년 채용 시장은 보안 인력의 단순 충원보다 검증 가능한 운영 역량을 더 강하게 본다. SANS/GIAC는 AI, 규제, 스킬 갭이 사이버보안 역할을 재정의한다고 설명하고, ISC2는 AI, 클라우드, 리스크, 앱 보안, GRC 역량 수요를 강조한다. Robert Half와 CIO도 Cybersecurity Engineer, DevOps Engineer, Network/Cloud Engineer를 계속 수요가 높은 역할로 분류한다.

따라서 포지셔닝은 넓은 개발자가 아니라 다음 문장으로 고정한다.

> 금융권 보안 인프라와 SIEM 운영을 실제 운영 절차, 증적, 관측성으로 연결하는 보안/SRE 엔지니어.

## 타깃 역할

우선순위 1:
- Security Operations / SOC Automation
- 보안 인프라 엔지니어
- DevSecOps 엔지니어
- Observability / SRE 엔지니어

우선순위 2:
- 클라우드 보안 엔지니어
- 플랫폼 엔지니어
- 네트워크/클라우드 엔지니어
- 보안 비중이 높은 Solutions Engineer

지원 제외:
- 보안·인프라 접점이 약한 순수 CRUD 백엔드
- 순수 프론트엔드
- 국적, 근무허가, 법적 동의, 민감 정보를 자동 답변해야 하는 ATS
- 공개 포트폴리오 프로젝트로 `mcp`, `idle-outpost`, `account` 계열을 요구하는 흐름

## 공개 포트폴리오 Proof Path

채용 담당자가 보게 할 첫 경로:
- Security Ops: Security Alert System, Splunk, FortiManager API, 감사 대응
- SRE / Observability: Observability Platform, Grafana, Prometheus, Loki, ELK
- DevSecOps / IaC: Terraform Homelab IaC, Cloudflare Workers, GitHub Actions
- Response Workflow: jclee-bot GitHub App, secret scan, actionlint, 한국어 우선 리뷰 흐름

운영 원칙:
- 프로젝트는 문제, 조치, 검토 가능한 근거 순서로 설명한다.
- 성과 수치가 검증되지 않으면 쓰지 않는다.
- `jclee-bot`은 공개 proof path에 포함한다.
- `mcp-server-hub`, `idle-outpost`, `account` 계열은 공개 프로젝트·인프라 카드에서 제외한다.

## 플랫폼 프로필

Wanted와 JobKorea의 첫 문단은 같은 포지셔닝을 공유한다. JobKorea에는 CCNP를 누락하지 않는다.

필수 키워드:
- FortiGate, FortiManager, FortiAnalyzer
- Splunk ES, SIEM, Webhook, Slack/SMS 알림
- Python, Ansible, Terraform, Linux
- Grafana, Prometheus, Loki, Elasticsearch/Kibana
- CCNP

## 지원 운영 루프

매주 반복:
1. `npm run sync:data`로 SSoT와 포트폴리오 데이터를 맞춘다.
2. Wanted/JobKorea 프로필 문구를 `applications/job-search-2026-07/profile-copy.md` 기준으로 비교한다.
3. `application-scorecard.md`에서 8점 이상만 맞춤 지원한다.
4. 민감 질문, 캡차, 2FA, 법적 동의가 나오면 자동화를 멈추고 수동 검토한다.
5. dry-run 결과가 zero-submit임을 확인한 뒤 검토 큐만 사용한다.
6. 지원 후 3영업일 내 짧게 팔로업한다.
7. 회신이 온 공고의 키워드만 다음 주 검색어에 남긴다.

## 검증 게이트

커밋 전:
- `node --test tools/scripts/utils/__tests__/resume-web-data-projects.test.js`
- `npm run sync:data`
- `npm run build`
- `npm run lint`
- `npm run typecheck`

배포 전:
- 공개 데이터와 JSON-LD에 제외 프로젝트 ID가 없는지 확인한다.
- `foreign-apply:dry-run`은 제출 없이 검토 큐만 만드는지 확인한다.
- Cloudflare 배포는 Workers Builds 경로를 우선한다. 로컬 Wrangler는 dry-run 검증에만 사용한다.

## 참고 자료

- SANS/GIAC 2026 Cybersecurity Workforce Research Report: https://www.sans.org/white-papers/2026-cybersecurity-workforce-research-report
- GIAC workforce reports overview: https://www.giac.org/reports
- ISC2, Aligning Skills, People and Hiring in Cybersecurity: https://www.isc2.org/Insights/2026/04/aligning-skills-people-and-hiring-in-cybersecurity
- Robert Half, 2026 Technology job market: https://www.roberthalf.com/us/en/insights/research/data-reveals-which-technology-roles-are-in-highest-demand
- CIO, The 10 most in-demand tech jobs for 2026: https://www.cio.com/article/230935/hiring-the-most-in-demand-tech-jobs-for-2021.html
