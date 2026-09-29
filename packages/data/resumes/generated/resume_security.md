<!-- Generated from master resume -->
<!-- Variant: security -->
<!-- Generated: 2026-09-29T07:16:20.522Z -->
<!-- Description: Security and compliance focus -->
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

- Splunk ES Saved Search로 탐지한 보안 이벤트가 Webhook relay → Slack/SMS 알림 → FortiManager JSON-RPC API 조회로 이어지는 흐름 설계
- FortiGate 이벤트와 정책 조회 결과를 Splunk로 모으고 Python·Docker 기반 state tracker로 이벤트 상태 추적
- LLM을 활용한 위협 정보 수집·분류 보조와 오탐 검토 절차 정리
- DR 사이트 점검과 주기적 DR 테스트
- 취약점 스캔 결과 정리와 심각도 기준 패치 적용
- 개발팀·거래팀·운영팀과 보안 요구사항 협의
- 인시던트 발생 시 탐지 근거·정책 조회·알림 이력을 연결한 원인 분석

- 탐지 룰, 알림 조건, 방화벽 정책 조회 결과를 변경 이력과 함께 기록해 감사 대응 자료로 활용
- 금융감독원 감사 자료 준비와 대응
- Splunk·Fortinet 연동 환경의 방화벽 정책 조회·배포 스크립트 작성
- Grafana 대시보드로 시스템·컨테이너·로그 지표를 한 화면에서 확인
- SIEM 탐지 룰 검토와 조건 조정으로 오탐 정리
- 취약점 SLA 기준에 따른 패치 일정 관리
- DR 복구 절차 스크립트화와 주기적 훈련

---

### ㈜가온누리정보시스템 | 보안 인프라 엔지니어

- FortiGate FGCP active-passive HA 구성과 다층 망분리(외부·거래·내부·개발·관리망), Air-Gap 설정
- 시스템·네트워크·엔드포인트 보안 솔루션 설치와 연동
- Python 기반 방화벽·NAC·DLP 정책 운영 스크립트 작성
- Ansible Role·FortiManager 기준의 방화벽 정책·장비 설정 변경 절차 문서화
- 금융위 본인가 심사 대응 자료 준비와 보안 체크리스트 이행
- DR 사이트 구성

- FortiGate HA로 방화벽 단일 장애점 제거
- 금융위 본인가 심사 보안 분야 질의 대응과 자료 정리
- EPP/DLP 설정 조정으로 단말 보안 에이전트 정책 정비
- NAC 정책 배포 스크립트 작성
- DR 복구 절차 스크립트화

---

### ㈜콴텍투자일임 | 정보보안 담당자

- 금융보안데이터센터(FSDC) AI 트레이딩 플랫폼 서버 인프라 운영
- Python 운영 스크립트 개발
- 금융감독원 정기 감사 대응과 DLP 정책 운영
- PostgreSQL 접근제어 쿼리 튜닝
- PB 플랫폼 POC 검증과 시스템 런칭 지원
- 백업·데이터 보호 정책 관리

---

### ㈜조인트리 | 네트워크 보안 엔지니어

- UTM과 VMware NSX-T 마이크로세그멘테이션(DFW) 기반 네트워크 세분화
- NAC·DLP·APT 보안 솔루션 통합 운영
- Wazuh 등 오픈소스 기반 보안 모니터링 구성

- 서버 간 동서 트래픽 정책을 워크로드 단위로 세분화
- NAC·DLP·Wazuh 연동으로 호스트 수준 보안 이벤트 수집
- DLP 룰 재설계로 오탐 정리
- 이중화 구성과 장애 대응 기준 정비

---

### ㈜메타넷엠플랫폼 | 인프라 운영 엔지니어

- 재택근무 전환을 위한 원격 접속 환경(SSL VPN·NAC) 구축
- Ansible 기반 NAC 정책 배포
- Python 기반 네트워크 스위치 점검 스크립트 개발
- 신규 단말 등록과 현장 점검 절차 운영

- FortiGate SSL-VPN 환경의 백신-VPN 프로파일 충돌을 tcpdump로 원인 분석하고 FortiClient 프로파일 분리로 해결
- NAC 예외 요청·단말 등록·현장 점검 절차를 Ansible 플레이북과 운영 체크리스트로 표준화
- FortiGate 로그 기반 VPN 세션 모니터링 대시보드 구성
- 신규 사이트 네트워크 구성

---

### ㈜엠티데이타 | IT/OA 운영 엔지니어

- 폐쇄망 Linux 서버 운영과 WSUS 기반 보안 패치
- 방화벽·IDS 정책 관리와 로그 분석
- DB 접근제어 솔루션 초기 구성

- firewall-cmd 파싱으로 미사용 중복 방화벽 규칙 정리
- 제조망-개발망 물리적 분리 환경 운영
- 정기 취약점 점검 절차 정리

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

| Certified Kubernetes Security Specialist (CKS) | CNCF                         | 2026 예정 | 진행 중          |