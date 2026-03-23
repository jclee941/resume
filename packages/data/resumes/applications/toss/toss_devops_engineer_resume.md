# 이재철

DevOps Engineer

---

## 연락처

- Email: qws941@kakao.com
- Phone: 010-5757-9592
- GitHub: github.com/qws941
- Portfolio: resume.jclee.me
- Monitoring: grafana.jclee.me

---

## 지원 동기

9년간 금융·공공 분야에서 인프라 설계와 운영을 담당하며, 보안 인프라 구축부터 Observability 체계 수립, 운영 자동화까지 넓은 범위의 인프라 엔지니어링을 수행해왔습니다.

특히 넥스트레이드 대체거래소에서 금융 시스템의 고가용성 인프라를 설계하고, Splunk·Prometheus·Grafana 기반의 모니터링 체계를 구축하면서 **"장애를 빠르게 감지하고, 개발자가 직관적으로 원인을 파악할 수 있는 시스템"** 의 중요성을 깊이 체감했습니다.

토스증권의 DevOps&SRE팀이 추구하는 **개발자 경험 혁신**과 **Cloud Native 기반 대규모 시스템 고도화**라는 방향성에 공감하며, 금융 도메인에서 쌓은 인프라 운영 경험과 자동화 역량을 바탕으로 기여하고자 지원합니다.

---

## 핵심 역량

- **Observability 체계 구축**: Prometheus + Grafana + Loki + ELK 기반 메트릭·로그 통합 모니터링 플랫폼 설계 및 운영 (50+ 메트릭 엔드포인트, 12+ 대시보드)
- **컨테이너 오케스트레이션**: EKS 기반 Kubernetes 클러스터 구축, Helm Chart 배포 자동화, Docker 기반 서비스 운영 (홈랩 8 VM/CT)
- **네트워크 인프라 & 트러블슈팅**: L2~L7 네트워크 설계, 방화벽 HA 구성, VPN 대규모 인프라, NSX-T 마이크로세그멘테이션 — CCNP 보유
- **자동화 & 툴 개발**: Python/Ansible 기반 인프라 자동화, n8n 워크플로우 오케스트레이션 (15+ 워크플로우, 일 200+ 실행), FortiManager API 자동화 툴 개발
- **CI/CD 파이프라인**: GitLab CI/CD 파이프라인 구축, GitHub Actions Self-hosted Runner 운영, 컨테이너 이미지 빌드·배포 자동화
- **IaC & 클라우드**: Terraform 기반 AWS 인프라 코드화 (VPC/Subnet/SG), Cloudflare Workers Edge 배포

---

## 경력사항

### ㈜아이티센 CTS | 인프라 운영 엔지니어
2025.03 ~ 2026.02 (1년) | 넥스트레이드 대체거래소 운영SM

**인프라 규모**: 서버 150대, 단말 300대, 네트워크 장비 80대 / 일 10만+ 거래

- **Observability 플랫폼 구축**: Grafana + Prometheus + Loki 기반 시스템·컨테이너·로그 통합 모니터링 체계 구축, 장애 감지 시간 단축
- **실시간 알림 자동화**: n8n 워크플로우와 Splunk를 연동하여 이벤트 탐지 시 30초 내 Slack 알림 자동화 (32개 탐지 룰)
- **운영 자동화 툴 개발**: FortiManager API 기반 방화벽 정책 자동 조회 Python 라이브러리 개발, 수동 작업 대비 80% 시간 절감
- **인프라 안정성**: HA 구성 기반 99.99% 가용성 유지, 인시던트 평균 대응 시간 27분

기술: Splunk, Prometheus, Grafana, Loki, n8n, Python, Docker, Linux

---

### ㈜가온누리정보시스템 | 인프라 엔지니어
2024.03 ~ 2025.02 (1년) | 넥스트레이드 대체거래소 인프라 구축

**프로젝트 규모**: 서버 150대, 네트워크 장비 80대 신규 구축 / 금융위 본인가 심사 통과

- **고가용성 인프라 설계**: FGCP 기반 Active-Passive HA 클러스터 구성, 99.99% 가용성 목표 설계
- **IaC 기반 인프라 표준화**: Ansible Role 활용 장비 초기 설정 및 정책 배포 표준화, 수작업 설정 제거
- **네트워크 아키텍처 설계**: 망분리, L2/L3 네트워크 설계, VPN/NAC 접근제어 체계 구축
- **자동화 파이프라인**: FortiManager API 연동 정책 배포 자동화로 운영 효율성 제고

기술: Ansible, Python, FortiManager API, VMware, Linux

---

### ㈜콴텍투자일임 | 클라우드 인프라 엔지니어
2022.08 ~ 2024.02 (1년 7개월) | AI 주식투자 서비스

- **AWS 클라우드 인프라 운영**: VPC, Subnet, Security Group, IAM 기반 클라우드 인프라 관리
- **IaC 도입**: Terraform으로 AWS 인프라 전체를 코드 기반 관리로 전환 (VPC/Subnet/SG 코드화)
- **메트릭 모니터링 구축**: Prometheus + Grafana 기반 메트릭 대시보드 구축 및 운영
- **로그 통합 분석**: AWS CloudTrail + GuardDuty 로그를 CloudWatch로 통합, 이상 탐지 체계 구축

기술: AWS (EC2, VPC, IAM, S3, CloudTrail, GuardDuty), Terraform, Prometheus, Grafana

---

### ㈜펀엔씨 | DevOps 엔지니어
2022.05 ~ 2022.07 (3개월) | 이커머스 클라우드 마이그레이션

- **EKS 기반 컨테이너 오케스트레이션**: Kubernetes 클러스터 구축, RBAC 정책 및 Pod Security 설정
- **Helm Chart 배포 자동화**: 애플리케이션 패키징 및 배포 파이프라인 표준화
- **CI/CD 파이프라인 구축**: GitLab Runner 기반 컨테이너 이미지 빌드, 정적 분석, 배포 자동화
- **클라우드 마이그레이션**: 온프레미스 → AWS VPC 기반 클라우드 전환 설계 및 실행

기술: AWS (EKS, VPC, EC2), Kubernetes, Docker, Helm, GitLab CI/CD

---

### ㈜조인트리 | 네트워크 가상화 엔지니어
2021.09 ~ 2022.04 (8개월) | 국민대학교 차세대 정보시스템

- **SDN 기반 네트워크 가상화**: VMware NSX-T 분산 방화벽(DFW) 기반 마이크로세그멘테이션 구현
- **트래픽 제어 정책**: 가상 스위치(VDS) 레벨 네트워크 보안 정책 중앙 집중화
- **하이브리드 클라우드 전환**: 온프레미스 → 하이브리드 클라우드 전환을 위한 네트워크 아키텍처 설계

기술: VMware NSX-T, vSphere, vDS, Linux

---

### ㈜메타넷엠플랫폼 | 시스템 엔지니어
2019.12 ~ 2021.08 (1년 9개월) | 대규모 컨택센터 인프라

- **대규모 인프라 자동화**: Ansible + Python 연동으로 500대+ 서버 설정 동기화 자동화
- **VPN 인프라 설계·구축**: 코로나19 대응 대규모 재택근무 VPN 인프라 긴급 구축 및 안정 운영
- **모니터링 시스템 구축**: Zabbix/PRTG 기반 실시간 인프라 모니터링 및 VPN 세션 대시보드 구축
- **장애 대응 체계**: 비정상 접근 탐지 대시보드 구축, 장애 조치 프로세스 수립

기술: Ansible, Python, VPN, Zabbix, Linux

---

### ㈜엠티데이타 | 시스템 운영 엔지니어
2017.02 ~ 2018.10 (1년 9개월) | 한국항공우주산업(KAI)

- 폐쇄망 환경 서버 및 네트워크 인프라 정기 점검 및 유지보수
- 시스템 로그 분석 기반 하드웨어 장애 징후 선제적 파악
- 인프라 자산 관리 및 보안 패치 체계 운영

기술: Linux, Windows Server, Shell Script

---

## 개인 프로젝트 & 홈랩

### Observability Platform (2024.06 ~ 현재)
홈랩 인프라 전체를 대상으로 한 통합 모니터링 플랫폼 운영

- **Prometheus**: 50+ 메트릭 엔드포인트 수집, Blackbox Exporter 기반 외부 서비스 헬스체크
- **Grafana**: 12+ 대시보드 운영 (시스템, 컨테이너, 네트워크, 애플리케이션)
- **Loki**: 로그 집계 및 LogQL 기반 쿼리·알림
- **ELK Stack**: Elasticsearch + Kibana 기반 애플리케이션 로그 분석
- 데모: grafana.jclee.me

### 홈랩 인프라 (2024.01 ~ 현재)
Proxmox VE 기반 가상화 플랫폼에서 12개 서비스 운영

- **컨테이너 오케스트레이션**: Docker Compose 기반 멀티 서비스 운영 (8 VM/CT)
- **리버스 프록시**: Traefik 기반 인그레스, 자동 TLS 인증서 관리
- **시크릿 관리**: HashiCorp Vault 기반 PKI 및 시크릿 중앙 관리
- **IaC**: Terraform으로 DNS/Workers/Proxmox 인프라 코드 관리
- **CI/CD**: GitHub Actions Self-hosted Runner 운영, Cloudflare Workers Edge 배포
- **자동화**: n8n 워크플로우 오케스트레이션 (15+ 워크플로우, 일 200+ 실행, Slack/GitHub/Grafana 연동)
- **스토리지**: MinIO 오브젝트 스토리지, Supabase(PostgreSQL) BaaS

### 자율주행 시뮬레이션 (2025.11 ~ 2026.02)
한양사이버대학교 포뮬러 경진대회 — **우수상 수상**

- ROS + Docker + AirSim 기반 자율주행 시스템 구현
- Python 기반 LiDAR 콘 검출(Grid BFS) + Pure Pursuit 경로 추종 알고리즘

---

## 기술 스택

### Observability & Monitoring
Prometheus, Grafana, Loki, ELK Stack(Elasticsearch/Kibana), Splunk

### Container & Orchestration
Docker, Kubernetes(EKS), Helm, Docker Compose

### Cloud & Infrastructure
AWS (EC2, VPC, EKS, IAM, S3, CloudTrail, GuardDuty), Cloudflare Workers, Proxmox VE

### CI/CD & Automation
GitHub Actions (Self-hosted Runner), GitLab CI/CD, Ansible, Terraform, n8n

### Network & Security
FortiGate, NSX-T, VPN, NAC, Haproxy/Nginx/Traefik (Reverse Proxy)

### Programming & Scripting
Python, Shell, Node.js/TypeScript

### Secret Management & IaC
HashiCorp Vault, Terraform, Ansible

### Database
PostgreSQL (Supabase), MySQL, Redis

---

## 자격증

| 자격증 | 발급기관 | 취득일 |
|--------|----------|--------|
| CCNP | Cisco Systems | 2020.08 |
| RHCSA | Red Hat | 2019.01 |
| CompTIA Linux+ | CompTIA | 2019.02 |
| LPIC Level 1 | Linux Professional Institute | 2019.02 |
| 리눅스마스터 2급 | 한국정보통신진흥협회 | 2019.01 |

준비 중: AWS Solutions Architect, CISSP

---

## 학력

- 한양사이버대학교 컴퓨터공학과 (2024.03 ~ 재학중)

---

## 기타

- 한국어: 원어민
- 영어: 기술 문서 독해 및 업무 커뮤니케이션 가능
- 병역: 사회복무요원 (2014.12 ~ 2016.12)
