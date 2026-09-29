# 이재철

정보보안 엔지니어

금융권 보안 인프라 구축과 SIEM 탐지·알림 자동화를 맡아 왔습니다. FortiGate HA·망분리 환경에서 Splunk ES 탐지 룰, Slack/SMS 알림, FortiManager API 조회를 연결해 보안 이벤트의 탐지·분류·알림 흐름을 설계했습니다. 보안 인프라, 보안 자동화, SIEM 엔지니어링, 관측성 역할을 검토합니다.

**핵심 역량**: 금융권 보안 인프라 설계·구축 · 보안 장비·접근통제 운영 · Splunk SIEM 탐지·알림 자동화 · IaC 기반 관측성 · 금융감독원 감사 대응

**보안 장비 경험**: DLP·nDLP · APT · SWG · IPS · DDoS · DRM · SSL VPN · NAC · Active Directory

## 연락처

- 이메일: <qws941@kakao.com>
- 위치: 경기도 시흥시
- GitHub: <https://github.com/jclee941>
- LinkedIn: <https://linkedin.com/in/jclee0109>
- Portfolio: <https://resume.jclee.me>

## 대표 프로젝트

### SafetyWallet | TypeScript · Next.js · Cloudflare Workers

- 현장 작업자의 안전 매뉴얼, 교육 이수 내역, 비상 연락망을 조회하는 PWA와 Next.js 관리 화면을 만들었습니다(Hono API, Drizzle·D1).
- 교육 만료 알림은 Workers Queue로 분리하고, Service Worker 캐시로 오프라인 조회를, JWT·RBAC로 작업자·관리자 권한 분리를 구현했습니다.

### Resume Portfolio | JavaScript · Cloudflare Workers · Playwright

- 한국어·영어·일본어 이력서 데이터를 한 소스에서 동기화해 Cloudflare Workers 번들로 생성하는 빌드 파이프라인을 운영합니다.
- CSP nonce, 보안 헤더, 반응형·접근성 E2E 테스트, 배포 검증을 코드로 관리합니다.

### IP Blacklist Platform | Python · Flask · PostgreSQL

- AbuseIPDB, Emerging Threats, AlienVault OTX 위협 인텔리전스 피드를 소스 어댑터로 수집해 한곳에서 조회하는 도구를 만들었습니다.
- SQLAlchemy 모델로 IP 평판 필드를 정규화하고, 스키마 변경은 Alembic 마이그레이션으로 관리합니다.

## 경력

### ㈜아이티센 CTS | 보안 인프라 엔지니어

2025.03 ~ 2026.02 · 넥스트레이드 보안 운영 아키텍처 자동화

- Splunk ES, FortiGate/FortiManager, Webhook relay, Slack/SMS 알림을 연결한 탐지·분류·알림 흐름을 설계했습니다.
- FortiManager JSON-RPC API 기반 정책 조회와 Python·Docker 자동화 도구를 만들었습니다.
- 감사·DR·취약점 대응 자료를 운영 로그, 정책 조회 결과, 대시보드로 정리했습니다.

### ㈜가온누리정보시스템 | 보안 인프라 엔지니어

2024.03 ~ 2025.02 · 넥스트레이드 매매체결시스템 구축

- FortiGate HA와 외부·거래·내부·개발·관리망 다층 망분리를 구성하고 보안 솔루션을 연동했습니다.
- Python 기반 방화벽·NAC·DLP 정책 운영 스크립트와 DR 절차를 작성했습니다.
- 금융위 본인가 심사 보안 분야의 점검 내역과 대응 자료를 정리했습니다.

### ㈜콴텍투자일임 | 정보보안 담당자

2022.08 ~ 2024.03 · Quantec AI Trading Platform / FSDC

- 금융보안데이터센터 서버 인프라와 DLP 정책을 운영하고 Python 운영 스크립트를 개발했습니다.
- 금융감독원 정기 감사에 대응하고, DB 접근제어 쿼리 튜닝과 PB 플랫폼 POC 검증·런칭을 지원했습니다.

### 이전 경력

- ㈜조인트리, 네트워크 보안 엔지니어 (2021.09 ~ 2022.04): VMware NSX-T 마이크로세그멘테이션, NAC·DLP·APT 통합 운영
- ㈜메타넷엠플랫폼, 인프라 운영 엔지니어 (2020.08 ~ 2021.08): SSL VPN·NAC 통합, Ansible 정책 배포, Python 네트워크 점검
- ㈜엠티데이타, IT/OA 운영 엔지니어 (2018.10 ~ 2019.10): Linux·방화벽·IDS 운영, 제조망·개발망 분리

## 기술

- **제품·백엔드**: TypeScript, JavaScript, Next.js, Node.js, Python, Flask, REST API
- **데이터·비동기**: PostgreSQL, Cloudflare D1, Drizzle ORM, Redis, Workers Queue
- **플랫폼·배포**: Cloudflare Workers, Docker, Kubernetes, GitHub Actions, GitLab CI/CD
- **관측성·보안**: Grafana, Prometheus, Loki, Splunk ES, FortiGate, WAF, DLP·nDLP, APT, SWG, IPS, DDoS, DRM, SSL VPN, NAC, Active Directory, EDR
- **자동화·IaC**: Python, Shell, Ansible, Terraform

## 학력·자격·수상

- 한양사이버대학교 컴퓨터공학과 (4년제, 2024.03 ~ 2027.02 졸업예정)
- CompTIA Linux+, LPIC Level 1, 리눅스마스터 2급, 사무자동화산업기사
- CCNP, RHCSA (만료·갱신 예정), CKS 준비 중
- 수상: 2026 HYCU AI학습법 공모전 장려상, 2026 자율주행 포뮬러 경진대회 우수상 (한양사이버대학교)

상세 경력과 프로젝트는 <https://resume.jclee.me/resume-full.pdf>에서 확인할 수 있습니다.
