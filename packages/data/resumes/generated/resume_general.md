<!-- Generated from master resume -->
<!-- Variant: general -->
<!-- Generated: 2026-09-29T07:16:20.519Z -->
<!-- Description: General purpose resume for all industries -->
<!--
  NOTICE (repo hygiene, 2026-07-22): This file is HAND-WRITTEN, not generated.
  The canonical single source of truth is
  packages/data/resumes/master/resume_data.json (+ resume_data_en.json /
  resume_data_ja.json), per ADR 0003 (docs/adr/0003-single-source-of-truth.md).
  This markdown file is a derived/secondary document maintained in parallel —
  it is NOT synced from the JSON and can drift out of contradiction with it.
  It is read directly by:
    - tools/scripts/build/pdf-generator (catalog.go "full" variant) to
      produce resume_full.pdf
    - tools/scripts/build/generate-resume-variants.js to derive
      resume_general.md / resume_technical.md / resume_security.md /
      resume_short.md
    - apps/job-server AI job-matching, ranking, auto-apply, and resume
      optimization tooling (via getResumeMasterMarkdownPath() /
      config.paths.resume) as the resume text fed to AI prompts
  When editing career facts (roles, dates, employers), verify they match
  resume_data.json — do not let this copy become the source of truth.
-->

# 이재철

정보보안 엔지니어

금융권 보안 인프라 구축과 SIEM 탐지·알림 자동화를 맡아 온 보안 엔지니어입니다. KAI 폐쇄망 OA 운영으로 시작해 FSDC에서 금감원 감사에 대응했고, 넥스트레이드에서는 구축 단계의 금융위 본인가 대응부터 자동화 단계까지 연속으로 수행했습니다. FortiGate HA·망분리 환경에서 Splunk ES 탐지 룰, Slack/SMS 알림, FortiManager API 조회를 연결해 장비 콘솔을 오가며 확인하던 절차를 줄였습니다. 보안 인프라, 보안 자동화, SIEM 엔지니어링, 관측성 역할을 찾고 있습니다.

**핵심 역량**: 금융권 보안 인프라 설계·구축 · 보안 장비·접근통제 운영 · Splunk SIEM 탐지·알림 자동화 · IaC 기반 관측성 · 금융감독원 감사 대응

---

## 연락처

- 전화: 010-5757-9592
- 이메일: <qws941@kakao.com>
- 주소: 대한민국
- GitHub: github.com/jclee941
- LinkedIn: linkedin.com/in/jclee0109

---

## 학력

- 한양사이버대학교 컴퓨터공학과 (4년제, 2024.03 ~ 2027.02 졸업예정)
- 용남고등학교 졸업

---

## 경력 요약

총 경력: 2018.10 ~ 2026.02

### 보유 기술

- **보안**: FortiGate 방화벽, DDoS, IPS, WAF, SWG, NAC, DLP·nDLP, DRM, SSL VPN, APT, Active Directory, EDR, Splunk ES
- **인프라**: Linux, Docker, Kubernetes, VMware vSphere·NSX-T, Proxmox VE, Cloudflare Workers
- **운영 스크립트·IaC**: Python, Bash, Ansible, Terraform
- **관측성**: Grafana, Prometheus, Loki, Elasticsearch/Kibana
- **CI/CD**: GitHub Actions, GitLab CI/CD, Docker Compose
- **LLM**: LLM PR 리뷰 검증(jclee-bot), MCP 서버

### 금융 보안 경험

- **금융감독원 감사 대응**: FSDC 정기·수시 감사 대응 자료와 운영 기록 정리
- **금융위 본인가 대응**: 넥스트레이드(다자간매매체결회사) 본인가 심사 보안 분야 대응
- **망분리**: 외부·거래·내부·개발·관리망 다층 망분리와 Air-Gap 구성
- **재해복구**: DR 사이트 점검·운영과 주기적 DR 테스트

---

## 경력사항

### ㈜아이티센 CTS | 보안 인프라 엔지니어

2025.03 ~ 2026.02 | 넥스트레이드 보안 운영 아키텍처 자동화 (정보보안팀 자동화 셀, 프리랜서)

주요 업무

- Splunk ES Saved Search로 탐지한 보안 이벤트가 Webhook relay → Slack/SMS 알림 → FortiManager JSON-RPC API 조회로 이어지는 흐름 설계
- FortiGate 이벤트와 정책 조회 결과를 Splunk로 모으고 Python·Docker 기반 state tracker로 이벤트 상태 추적
- LLM을 활용한 위협 정보 수집·분류 보조와 오탐 검토 절차 정리
- DR 사이트 점검과 주기적 DR 테스트
- 취약점 스캔 결과 정리와 심각도 기준 패치 적용
- 개발팀·거래팀·운영팀과 보안 요구사항 협의
- 인시던트 발생 시 탐지 근거·정책 조회·알림 이력을 연결한 원인 분석

주요 성과

- 탐지 룰, 알림 조건, 방화벽 정책 조회 결과를 변경 이력과 함께 기록해 감사 대응 자료로 활용
- 금융감독원 감사 자료 준비와 대응
- Splunk·Fortinet 연동 환경의 방화벽 정책 조회·배포 스크립트 작성
- Grafana 대시보드로 시스템·컨테이너·로그 지표를 한 화면에서 확인
- SIEM 탐지 룰 검토와 조건 조정으로 오탐 정리
- 취약점 SLA 기준에 따른 패치 일정 관리
- DR 복구 절차 스크립트화와 주기적 훈련

---

### ㈜가온누리정보시스템 | 보안 인프라 엔지니어

2024.03 ~ 2025.02 | 넥스트레이드 매매체결시스템 구축 (보안 구축 셀, 프리랜서)

주요 업무

- FortiGate FGCP active-passive HA 구성과 다층 망분리(외부·거래·내부·개발·관리망), Air-Gap 설정
- 시스템·네트워크·엔드포인트 보안 솔루션 설치와 연동
- Python 기반 방화벽·NAC·DLP 정책 운영 스크립트 작성
- Ansible Role·FortiManager 기준의 방화벽 정책·장비 설정 변경 절차 문서화
- 금융위 본인가 심사 대응 자료 준비와 보안 체크리스트 이행
- DR 사이트 구성

주요 성과

- FortiGate HA로 방화벽 단일 장애점 제거
- 금융위 본인가 심사 보안 분야 질의 대응과 자료 정리
- EPP/DLP 설정 조정으로 단말 보안 에이전트 정책 정비
- NAC 정책 배포 스크립트 작성
- DR 복구 절차 스크립트화

---

### ㈜콴텍투자일임 | 정보보안 담당자

2022.08 ~ 2024.03 | Quantec AI Trading Platform / FSDC 운영 (정규직)

주요 업무

- 금융보안데이터센터(FSDC) AI 트레이딩 플랫폼 서버 인프라 운영
- Python 운영 스크립트 개발
- 금융감독원 정기 감사 대응과 DLP 정책 운영
- PostgreSQL 접근제어 쿼리 튜닝
- PB 플랫폼 POC 검증과 시스템 런칭 지원
- 백업·데이터 보호 정책 관리

---

### ㈜조인트리 | 네트워크 보안 엔지니어

2021.09 ~ 2022.04 | 국민대학교 차세대 정보시스템 (정규직 파견)

주요 업무

- UTM과 VMware NSX-T 마이크로세그멘테이션(DFW) 기반 네트워크 세분화
- NAC·DLP·APT 보안 솔루션 통합 운영
- Wazuh 등 오픈소스 기반 보안 모니터링 구성

주요 성과

- 서버 간 동서 트래픽 정책을 워크로드 단위로 세분화
- NAC·DLP·Wazuh 연동으로 호스트 수준 보안 이벤트 수집
- DLP 룰 재설계로 오탐 정리
- 이중화 구성과 장애 대응 기준 정비

---

### ㈜메타넷엠플랫폼 | 인프라 운영 엔지니어

2020.08 ~ 2021.08 | 컨택센터 인프라 (SI+SM)

주요 업무

- 재택근무 전환을 위한 원격 접속 환경(SSL VPN·NAC) 구축
- Ansible 기반 NAC 정책 배포
- Python 기반 네트워크 스위치 점검 스크립트 개발
- 신규 단말 등록과 현장 점검 절차 운영

주요 성과

- FortiGate SSL-VPN 환경의 백신-VPN 프로파일 충돌을 tcpdump로 원인 분석하고 FortiClient 프로파일 분리로 해결
- NAC 예외 요청·단말 등록·현장 점검 절차를 Ansible 플레이북과 운영 체크리스트로 표준화
- FortiGate 로그 기반 VPN 세션 모니터링 대시보드 구성
- 신규 사이트 네트워크 구성

---

### ㈜엠티데이타 | IT/OA 운영 엔지니어

2018.10 ~ 2019.10 | 한국항공우주산업(KAI) (정규직 파견)

주요 업무

- 폐쇄망 Linux 서버 운영과 WSUS 기반 보안 패치
- 방화벽·IDS 정책 관리와 로그 분석
- DB 접근제어 솔루션 초기 구성

주요 성과

- firewall-cmd 파싱으로 미사용 중복 방화벽 규칙 정리
- 제조망-개발망 물리적 분리 환경 운영
- 정기 취약점 점검 절차 정리

---

## 주요 프로젝트

### 넥스트레이드 매매체결시스템 보안 트랙 (2024.03 ~ 2026.02)

가온누리정보시스템 구축 단계 → 아이티센 CTS 자동화 단계, 동일 고객사 연속 수행

- **구축 단계 (2024.03 ~ 2025.02)**: FortiGate HA, 다층 망분리, 엔드포인트 보안, 보안 솔루션 연동, 금융위 본인가 심사 보안 분야 대응
- **자동화 단계 (2025.03 ~ 2026.02)**: Splunk ES 탐지 → Webhook relay → Slack/SMS 알림 → FortiManager API 조회 흐름, LLM 보조 오탐 검토, DR 테스트

### 개인 프로젝트

#### jclee-bot GitHub App | Python · GitHub App · CLIProxyAPI · ELK

- CLIProxyAPI를 거친 LLM PR 리뷰와 시크릿 스캔·actionlint·문서 정책 검사 결과를 Check Run으로 함께 게시합니다.
- 리뷰 코멘트는 한국어를 우선으로 작성하고, 실행 로그는 ELK로 수집합니다.

#### PlayMCP 도구 서버 | TypeScript · Bun · MCP SDK · Kakao Cloud

- meetup-coordinator와 nunchi-translator를 PlayMCP 호환 MCP 서버로 구현해 Kakao Cloud에 배포했습니다.
- 각 도구는 inputSchema·outputSchema로 입력과 출력을 검증하고, 요청을 stateless로 처리합니다.

#### Security Alert System | Splunk · Python · Slack

- FortiGate 보안 이벤트를 Splunk Saved Search와 Webhook으로 Slack에 알립니다.
- CSV 기반 state tracker가 상태가 바뀔 때만 알림을 보내 중복 알림을 막고, FortiGate LogID를 severity/category로 매핑해 이벤트를 분류합니다.

#### IP Blacklist Platform | Python · Flask · PostgreSQL

- AbuseIPDB, Emerging Threats, AlienVault OTX 위협 인텔리전스 피드를 소스 어댑터로 수집해 한곳에서 조회합니다.
- SQLAlchemy 모델로 IP 평판 필드를 정규화하고, 스키마 변경은 Alembic 마이그레이션으로 관리합니다.

#### Observability Platform | Grafana · Prometheus · Loki · Proxmox VE

- NVMe 스토리지 기반 Proxmox VE 홈랩의 메트릭은 Prometheus node_exporter로, 로그는 Loki Promtail로 수집합니다.
- Grafana 대시보드 정의를 코드로 관리하고, Grafana Explore에서 메트릭과 로그를 한 화면에서 조회합니다.

#### Terraform Homelab IaC | Terraform · Proxmox VE · Cloudflare · k3s

- Proxmox VM/LXC, Cloudflare DNS·Workers·WAF, k3s bootstrap 리소스를 Terraform module로 관리합니다.
- PR마다 plan 결과를 검증한 뒤 적용해 인프라 변경 이력을 Git에 남깁니다.

#### Resume Portfolio | Cloudflare Workers · JavaScript · Playwright

- 한국어·영어·일본어 이력서 데이터(SSoT)로 포트폴리오 사이트를 생성해 Cloudflare Workers에 배포합니다.
- CSP nonce와 보안 헤더, 반응형·접근성 E2E 테스트, 배포 검증을 코드로 관리합니다.

#### SafetyWallet | TypeScript · Next.js · Cloudflare Workers · D1

- 현장 작업자의 안전 매뉴얼, 교육 이수 내역, 비상 연락망을 조회하는 PWA와 Next.js 관리 화면입니다.
- Workers Queue로 교육 만료 알림을 분리하고, Service Worker 캐시로 오프라인 조회를, JWT·RBAC로 작업자·관리자 권한 분리를 구현했습니다.

#### HYCU FSDS 자율주행 | Python · ROS2 · Docker · AirSim

- 한양사이버대학교 2026 자율주행 포뮬러 경진대회에서 우수상을 받았습니다.
- FSDS에서 콘을 인지하고 차량을 주행 제어하는 ROS2 인지·제어 노드를 Docker로 패키징해 AirSim 시뮬레이션에서 검증했습니다.

#### 그 밖의 프로젝트

- **Idle Outpost 모바일 분석**: JADX로 Android 클라이언트의 UI와 보상 처리 흐름을 추적하고, mitmproxy 캡처 분석 코드로 엔드포인트·인증 헤더·요청 및 응답 JSON 필드 정리
- **AI 콘텐츠 자동화 파이프라인**: Python worker와 n8n workflow로 스크립트 생성·TTS·영상 생성·업로드 단계를 분리하고, 작업 상태를 Supabase에 저장
- **Bug Bounty Recon Toolkit**: Subfinder·httpx·Nuclei를 Go 파이프라인과 Makefile CLI로 묶어 cron으로 주기 실행
- **Firewall Policy Automation**: 방화벽 정책 요청서와 대역표 대조를 Excel VBA 도구로 자동화
- **tmux Productivity Suite**: 터미널 세션과 프로젝트별 레이아웃을 tmux와 Bun/TypeScript TUI로 관리

---

## 기술 스택

### 보안 솔루션

- 네트워크 보안: FortiGate, FortiManager, FortiAnalyzer, DDoS, IPS/IDS, WAF, SWG
- 엔드포인트: NAC, DLP·nDLP, DRM, EDR/EPP, APT
- 접근제어: 서버/DB 접근제어, Active Directory, SSL VPN, SSL 복호화
- 탐지·분석: Splunk ES, Wazuh, MITRE ATT&CK

### 인프라 및 가상화

- 가상화: VMware vSphere, NSX-T, Proxmox VE
- 컨테이너: Docker, Kubernetes, Helm, k3s
- Edge: Cloudflare Workers, Cloudflare WAF

### 운영 스크립트 및 개발

- 언어: Python, Bash, Go, Node.js, TypeScript, JavaScript
- IaC: Ansible, Terraform
- CI/CD: GitHub Actions, GitLab CI/CD
- 관측성: Grafana, Prometheus, Loki, OpenTelemetry, Elasticsearch/Kibana
- 데이터베이스: PostgreSQL, MySQL, Redis

---

## 자격증

| 자격증명                                       | 발급기관                     | 취득      | 상태             |
| ---------------------------------------------- | ---------------------------- | --------- | ---------------- |
| CCNP                                           | Cisco Systems                | 2020.08   | 만료 (갱신 예정) |
| RHCSA                                          | Red Hat                      | 2019.01   | 만료 (갱신 예정) |
| CompTIA Linux+                                 | CompTIA                      | 2019.02   | 유효             |
| LPIC Level 1                                   | Linux Professional Institute | 2019.02   | 유효             |
| 리눅스마스터 2급                               | 한국정보통신진흥협회         | 2019.01   | 유효             |
| 사무자동화산업기사                             | 한국산업인력공단             | 2019.12   | 유효             |
| Certified Kubernetes Security Specialist (CKS) | CNCF                         | 2026 예정 | 진행 중          |

---

## 수상

| 수상명                               | 수여기관         |
| ------------------------------------ | ---------------- |
| 2026 HYCU AI학습법 공모전 장려상     | 한양사이버대학교 |
| 2026 자율주행 포뮬러 경진대회 우수상 | 한양사이버대학교 |