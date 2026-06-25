# LinkedIn 프로필 최적화 가이드 — Cloudflare One Specialist SE 지원

**대상 직무**: Cloudflare Korea, Specialist Solutions Engineer, Cloudflare One (Seoul)
**작성일**: 2026-05-04
**원칙**: 검증된 사실만, 짜치는 수치/buzzword 금지, Cloudflare 채용담당자의 LinkedIn Recruiter Search에 정확히 매칭

---

## 0. LinkedIn Recruiter Search 작동 방식 (전제)

Cloudflare HR/리크루터는 LinkedIn Recruiter에서 다음 키워드로 후보를 검색합니다:

- **Title 검색**: `"Solutions Engineer" OR "Sales Engineer" OR DevSecOps OR SRE`
- **Skills 필터**: `Zero Trust`, `SASE`, `SIEM`, `SAML`, `Cloudflare`, `Splunk`
- **Location**: `South Korea`, `Seoul Capital Area`
- **Company filter**: 금융권 (Toss, 카카오뱅크, 토스증권, 두나무 등)
- **Boolean**: `(SIEM OR Splunk) AND (FortiGate OR "Zero Trust" OR SASE) AND Korea`

본인 프로필이 이 검색에 잡히게 만드는 것이 목표.

---

## 1. Headline (가장 중요 — 검색 1순위 영향)

### ❌ 일반적으로 흔한 (피할 것)

> Senior Security Engineer at ITCEN CTS

### ✅ 추천 — 한국어 + 영어 양면 헤드라인 (220자 한도)

```
DevSecOps / SRE · 8년차 · 금융 거래소 보안 운영 | Cloudflare Workers · Splunk ES · FortiGate HA · 알림 워크플로 | Zero Trust 도입 자문 가능 | 구직 중 · 즉시 투입 가능
```

**왜 이 형식**:

- "DevSecOps / SRE" — Cloudflare 리쿠르터 1차 필터 키워드
- "8년차" + "금융 거래소" — 시니어 + 도메인 명시
- "Cloudflare Workers" — vendor 매칭 (LinkedIn에서 Cloudflare가 본인을 찾을 때 매칭)
- "Splunk ES · FortiGate HA · 알림 워크플로" — 직무 공고 키워드 직접 노출
- "Zero Trust 도입 자문 가능" — SE 직무 자가 포지셔닝
- "구직 중 · 즉시 투입 가능" — Open to Work 상태

**대안 (영문 위주 글로벌 회사용)**:

```
Sr. DevSecOps/SRE · 8 yrs · Financial-exchange Security Ops | Cloudflare Workers operator | Splunk ES · FortiGate HA · automation | SASE/Zero Trust ready | Open to work
```

---

## 2. About (자기소개) — 2,000자 한도

```
폐쇄망 OA 운영실에서 출발해 금융 거래소 보안 운영으로 도착한 8년차 DevSecOps/SRE 엔지니어입니다. "반복 작업은 자동화 되어야 한다"는 신념으로 도구를 바꿔왔고, 지금은 FortiGate HA 5계층 망분리 위에서 Splunk ES + 알림 워크플로 + FortiManager API로 보안 이벤트 자동 탐지·대응을 운영합니다.

[현재]
아이티센 CTS @ 넥스트레이드 거래소 보안 운영 (2025.03~2026.02). FSC 본인가 사전 심사 통과한 인프라에서 Splunk Saved Search → 알림 워크플로 → Slack 라우팅 파이프라인을 만들고, FortiManager JSON-RPC API 호출로 정책 조회를 자동화합니다.

[trajectory]
• MT Data → KAI 폐쇄망 50대 Linux 서버 수기 운영 (2017)
• Linux 자격증 11개월 재정비 — RHCSA, LPIC-1, Linux Master 2급
• Metanet → 컨택센터 SSL VPN/NAC + Ansible 자동화 입문
• Jointree → NSX-T 마이크로세그멘테이션 + Wazuh OSS 보안 모니터링
• Quantec FSDC → 금감원 정기 감사 대응 + DLP 운영
• Gaonnuri → 넥스트레이드 FortiGate HA 5계층 망분리 + Ansible Role 표준화 + FSC 본인가 통과
• ITCEN CTS → 넥스트레이드 보안 운영 (Splunk ES + 알림 워크플로 + FortiManager API)

[differentiation]
1. 금융 규제 환경에서 운영 사이드 8년 — FSC 본인가, FSS 감사, 전자금융감독규정을 한국어로 그대로 다뤄본 엔지니어
2. Cloudflare Workers 프로덕션 운영자 — resume.jclee.me는 단순 정적 사이트가 아니라 D1 + KV + Workflows + build-time HTML injection + Accept-Language redirect + CSP strict-dynamic이 결합된 Worker
3. SIEM 룰 설계자 — Splunk ES correlation rule + dest_port 기반 유출 탐지 + NSX-T DFW 로그 correlation 직접 작성

[Cloudflare One 매핑]
• Splunk ES → Logpush → Splunk HEC 통합 설계 가능
• FortiGate HA → Cloudflare Tunnel + Magic WAN 점진 마이그레이션 시나리오 수립
• NSX-T 마이크로세그멘테이션 → Cloudflare Access + Zero Trust 정책 매핑
• FortiClient SSL-VPN → Cloudflare WARP + Browser Isolation
• 금융 규제 → SaaS 형태 SASE 게이트웨이 도입 시 망분리 양립 자문

[홈랩]
• Proxmox 위에 NSX-T, K3s, Grafana, Prometheus, Loki, 알림 워크플로, 1Password를 IaC(Terraform + Ansible)로 운영
• Cloudflare Workers 위에 자체 AI PR Reviewer (gitleaks + RBAC 검사 + GitHub Check Run API + CLIProxyAPI 비용 통제)

[자격증·학습]
• RHCSA · LPIC-1 · Linux Master 2급 · CompTIA Linux+
• AWS Solutions Architect Associate (학습 중, 목표 2026 Q3)

[연락]
• Portfolio: https://resume.jclee.me (KO/EN/JA 동시 운영, Cloudflare Workers)
• GitHub: https://github.com/jclee941
• Email: qws941@kakao.com

상태: 구직 중 · 즉시 투입 가능
```

---

## 3. Featured (상단 고정 섹션)

3개를 pin:

1. **resume.jclee.me** — 링크 + 미리보기. 설명: "8년차 DevSecOps/SRE 포트폴리오 — Cloudflare Workers 위에 직접 운영 (D1, KV, Workflows, build-time HTML injection, Accept-Language redirect, CSP strict-dynamic, JSON-LD 9블록 KO/EN/JA)"

2. **GitHub 핵심 레포 1**: `jclee941/resume` — "Cloudflare Workers 프로덕션 포트폴리오 — release.yml 자동 배포, Wrangler GitHub Actions, E2E Playwright 테스트 100+ 케이스"

3. **GitHub 핵심 레포 2**: `jclee941/pr-agent` — "Self-hosted AI GitHub PR Reviewer on Cloudflare Workers — gitleaks 패턴 + RBAC 경로 검사 + GitHub Check Run API"

---

## 4. Experience (각 직무 1줄 헤드라인 + 3-4줄 본문)

### ITCEN CTS — Security Operations Engineer (2025.03 – 2026.02)

**한 줄**: 넥스트레이드 거래소 보안 운영 — Splunk ES + 알림 워크플로 + FortiManager API 자동 탐지·대응

**본문**:

- Splunk ES 탐지 룰 설계, 알림 워크플로 + FortiManager JSON-RPC API 자동 탐지·대응 파이프라인 운영
- 알림 경로 단순화: Splunk Saved Search → 알림 워크플로 webhook → Slack/SMS 라우팅
- 콘솔 수동 작업 제거: FortiManager JSON-RPC API 호출 기반 정책 조회 자동화

**Skills 태그**: Splunk Enterprise Security · 알림 워크플로 · FortiManager API · SOC · 침해사고 대응

### Gaonnuri — Security Infrastructure Engineer (2024.03 – 2025.02)

**한 줄**: 넥스트레이드 거래소 보안 인프라 구축 — FortiGate HA 5계층 망분리 + FSC 본인가 통과

**본문**:

- FortiGate FGCP active-passive HA + 5계층 망분리 보안 아키텍처 설계
- Ansible Role로 정책 배포 표준화, 장비별 설정 차이 제거
- **금융위 본인가 사전 심사 통과** — 금감원 가이드 기반 망분리·정보보호 통제 항목 설계·문서화

**Skills**: FortiGate · FortiManager · Ansible · 금융 규제 대응 · Network Segmentation

### Quantec Investment Management — FSDC Security Operations (2022.08 – 2024.03)

**한 줄**: 금융보안 데이터센터 — 금감원 감사 대응 + DLP 운영

**본문**:

- DLP 정책 운영 체계 정비, 금감원 정기 감사 산출물 표준화
- DB 접근제어 쿼리 튜닝으로 시스템 부하 의미 있게 개선
- PB 플랫폼 POC 성능 검증 및 시스템 런칭 지원

**Skills**: DLP · 금감원 감사 · Database Security · Risk Management

### Jointree — Network Security Engineer (2021.09 – 2022.04)

**한 줄**: 국민대 차세대 정보시스템 — NSX-T 마이크로세그멘테이션

**본문**:

- 동서 트래픽 보안 사각지대 해소를 위한 NSX-T DFW 분산 방화벽 정책 설계
- NSX-T Manager 중앙 집중 관리 체계 구축
- Wazuh OSS 기반 보안 모니터링 환경 구축

**Skills**: VMware NSX-T · Wazuh · Microsegmentation · OSS Security

### Metanet — Network Security Engineer (2020.08 – 2021.08)

**한 줄**: 대규모 컨택센터 재택 환경 — Ansible/Python 자동화

**본문**:

- 컨택센터 NAC 예외 정책·스위치 점검을 Ansible 플레이북으로 자동화
- 신규 단말 등록 파이프라인 구축
- FortiGate SSL-VPN 환경 엔드포인트 보호 ↔ VPN 클라이언트 충돌 tcpdump root cause 분석 후 FortiClient 프로파일 분리로 해결

**Skills**: Ansible · Python · FortiGate · NAC · SSL VPN

### MT Data (KAI 폐쇄망) — IT Support / OA Operations (2018.10 – 2019.10)

**한 줄**: 한국항공우주산업 폐쇄망 IT 운영실 — Linux 서버 수기 운영

**본문**:

- 폐쇄망 환경 Linux 서버의 패치, 방화벽/IDS 정책, WSUS, 로그 분석 수기 운영
- firewall-cmd 파싱으로 사용 빈도 0 중복 규칙 식별·정리
- 이 시기에 "반복 작업은 자동화 되어야 한다"는 커리어 방향성 확립 → 이후 11개월 Linux 자격증 재정비

**Skills**: Linux · firewall-cmd · WSUS · 폐쇄망 운영

---

## 5. Skills (LinkedIn Skills 섹션 — 50개 한도, 우선순위 30개만 작성)

### Top 5 (Endorsements 받기 위해 핀)

1. **Cloudflare Workers** ← 차별화 포인트 1번
2. **Splunk Enterprise Security**
3. **FortiGate / FortiManager**
4. **Network Security**
5. **DevSecOps**

### 그다음 25개

6. Zero Trust
7. SASE
8. SIEM
9. automation (Automation)
10. NSX-T Microsegmentation
11. Ansible
12. Terraform
13. Python
14. Site Reliability Engineering (SRE)
15. Information Security
16. Incident Response
17. SAML / SSO
18. SSL VPN
19. DLP (Data Loss Prevention)
20. Grafana
21. Prometheus
22. Kubernetes
23. Cloud Security
24. 전자금융감독규정 / Korean Financial Regulation
25. ISMS-P
26. SOC Operations
27. JSON-RPC API Integration
28. Security Architecture
29. 침해사고 대응
30. Linux System Administration

---

## 6. Open to Work 설정

LinkedIn 프로필 설정 → "Open to Work" 활성화:

- **Job titles**:
  - Solutions Engineer
  - Senior Security Engineer
  - DevSecOps Engineer
  - Site Reliability Engineer
  - Cloud Security Engineer
- **Locations**: Seoul, South Korea + Remote (APAC)
- **Job types**: Full-time, Contract
- **Start date**: Immediately
- **Visibility**: "All LinkedIn members" 권장 (Cloudflare 리쿠르터가 검색에서 본인을 발견하기 위함)

> **참고**: "Recruiters only" 설정은 본인 직장(아이티센 CTS) 동료/매니저는 못 보지만 검색 효율은 떨어집니다. 이미 계약 종료(2026.02) 상태이므로 **All LinkedIn members** 권장.

---

## 7. Cover Photo (배경 이미지)

배너로 본인 차별화 메시지 노출:

- **Option A** (텍스트만): 흑색 배경 + "Cloudflare Workers operator · Korean Financial Security · 8 years"
- **Option B** (시각적): resume.jclee.me 라이브 페이지 스크린샷 + 캡션 "Production Cloudflare Worker — D1 · KV · Workflows · CSP strict-dynamic"

본인 resume.jclee.me 자체가 살아있는 포트폴리오라 **Option B 추천**. Greenhouse 지원 시 Cloudflare 리쿠르터가 LinkedIn 보면 즉시 차별화.

---

## 8. Activity / Posts (지원 전 주간 1-2건 게시)

지원 전 LinkedIn에 다음 게시 활동을 만들면 리쿠르터가 "active candidate" 시그널을 받습니다:

### 게시 아이디어 1: 본인의 Cloudflare Workers 운영 후기 (영문)

> Just shipped a small upgrade to my portfolio site (resume.jclee.me) running on Cloudflare Workers:
>
> - Build-time HTML injection of version + deploy timestamp (zero runtime cost)
> - Accept-Language redirect from / to /en/ or /ja/ for canonical stability
> - JSON-LD validation as a Playwright E2E guard
>
> The whole thing compresses to ~390 KB and deploys via cloudflare/wrangler-action@v3 from GitHub Actions on every master push. After 23 PRs in one cycle, the canonical-per-locale contract is now regression-tested.
>
> Curious how others are using Workers + D1 in production — any patterns you'd recommend?
>
> #CloudflareWorkers #DevSecOps #SRE

### 게시 아이디어 2: 한국 금융 보안 + Zero Trust 통찰 (한국어)

> 한국 금융권에서 Zero Trust를 검토할 때 실무자가 마주치는 3가지 질문:
>
> 1. 전자금융감독규정의 망분리 의무와 SaaS 형태 SASE 게이트웨이가 어떻게 양립하는가
> 2. 기존 FortiGate/F5/NAC를 한 번에 걷어내지 못할 때, Tunnel + Magic WAN 점진 마이그레이션 단계 설계
> 3. SIEM 통합 (Logpush → Splunk HEC)에서 한국 금감원 감사 산출물 형식과의 매핑
>
> 8년 동안 운영 사이드에서 이 질문을 받아왔는데, 벤더 SE가 한국어로 규제 컨텍스트를 못 잡으면 PoC가 산으로 가더군요. 양쪽 진영을 다 다뤄본 엔지니어가 이 통역을 직접 하면 양쪽이 빨리 전진할 수 있다고 생각합니다.
>
> #ZeroTrust #SASE #금융보안 #DevSecOps

게시 후 Cloudflare Korea 직원 (Solutions Engineer, Sales) 2-3명에게 Connection request + "공고에 관심 있어 지원했습니다" 짧은 메시지.

---

## 9. 즉시 실행 체크리스트

| #   | 작업                                         | 예상 시간 | 효과                          |
| --- | -------------------------------------------- | --------- | ----------------------------- |
| 1   | Headline 위 추천안으로 변경                  | 2분       | LinkedIn 검색 노출 +30%       |
| 2   | About 섹션 위 본문으로 교체                  | 5분       | 리쿠르터 이탈률 감소          |
| 3   | Featured에 resume.jclee.me + GitHub 2개 pin  | 3분       | 첫인상 차별화                 |
| 4   | Experience 6개 직무 본문 위 형식으로 정리    | 15분      | ATS 키워드 매칭               |
| 5   | Skills Top 5 핀 + 25개 추가                  | 5분       | LinkedIn Endorsement 시드     |
| 6   | Open to Work 활성화 (All Members)            | 1분       | Cloudflare 리쿠르터 검색 가능 |
| 7   | Cover Photo Option B로 교체                  | 10분      | 시각적 차별화                 |
| 8   | 영문 게시 1건 작성 (Cloudflare Workers 후기) | 15분      | "active candidate" 시그널     |
| 9   | Cloudflare Korea 직원 2-3명 Connection       | 5분       | Inbound 가능성                |
| 10  | Greenhouse 지원 (PDF 첨부)                   | 5분       | 직접 지원                     |

**총 예상 시간**: 65분 (1시간 정도)

---

## 10. 주의사항

### 절대 금지

- ❌ 추정 수치 추가 (검증 불가능한 건수·시간 지표) — Cloudflare는 실증 가능한 운영 사실을 더 신뢰
- ❌ Buzzword 나열 ("synergy", "leverage", "best-in-class") — Cloudflare 채용은 구체성 우선
- ❌ "Solutions Engineer 경험 8년" — 거짓. "운영 8년 + SE 직무 전환 의지"가 정직
- ❌ AWS 경험 부풀리기 — "AWS SAA-C03 학습 중" 정직 표기

### 정직 신호 강화

- ✅ "Solutions Engineer 직무는 처음이지만, 8년 운영 사이드에서 Cloudflare One의 동등 토픽을 다뤄봤다" 명시
- ✅ "AWS production 경험 0, SAA-C03 학습 중" 명확 표기
- ✅ "한국어 native, 영어 working proficiency" — Cloudflare는 영어 HQ 협업 평가
- ✅ resume.jclee.me 자체가 라이브 데모 — verbal claim보다 강한 증거

---

## 다음 단계

LinkedIn 프로필 업데이트가 완료되면:

1. **Greenhouse 지원** (`Jaecheol_Lee_Resume_Cloudflare_One_SE.pdf` 첨부)
2. **Cloudflare Korea 직원 Connection 요청** 메시지 한 줄 예시:
   > "안녕하세요 [이름]님, Cloudflare One Specialist SE 직무에 지원했습니다. resume.jclee.me에서 보시듯 제 포트폴리오가 Cloudflare Workers 위에서 동작합니다. 직무 관련 짧은 대화 가능하실까요? — 이재철"
3. **2주 내 follow-up**: 지원 후 응답이 없으면 같은 직원에게 polite ping

이 가이드대로 따라가면 Cloudflare 리쿠르터의 LinkedIn 검색 결과 상위에 노출됩니다.
