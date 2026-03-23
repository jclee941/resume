---
geometry: "top=1.0cm, bottom=1.0cm, left=1.6cm, right=1.6cm"
fontsize: 9pt
mainfont: "NanumSquare"
sansfont: "NanumBarunGothic"
monofont: "NanumGothicCoding"
linestretch: 1.15
pagestyle: empty
header-includes:
  - \usepackage{titlesec}
  - \usepackage{enumitem}
  - \usepackage{xcolor}
  - \usepackage{hyperref}
  - \usepackage{tabularx}
  - \usepackage{colortbl}
  - \usepackage{array}
  - \definecolor{accent}{RGB}{0, 104, 255}
  - \definecolor{heading}{RGB}{30, 30, 30}
  - \definecolor{body}{RGB}{50, 50, 50}
  - \definecolor{sub}{RGB}{100, 100, 100}
  - \definecolor{muted}{RGB}{155, 155, 155}
  - \definecolor{rulec}{RGB}{215, 215, 215}
  - \definecolor{rowalt}{RGB}{247, 248, 252}
  - \color{body}
  - \titleformat{\section}{\small\bfseries\color{accent}\MakeUppercase}{}{0em}{\vspace{0.05em}}
  - \titleformat{\subsection}{\small\bfseries\color{heading}}{}{0em}{}
  - \titlespacing*{\section}{0pt}{0.65em}{0.15em}
  - \titlespacing*{\subsection}{0pt}{0.4em}{0.06em}
  - \setlist[itemize]{nosep, leftmargin=1.2em, topsep=0.06em, itemsep=0.03em, parsep=0em}
  - \hypersetup{colorlinks=true, linkcolor=accent, urlcolor=accent}
  - \setlength{\parskip}{0.12em}
  - \setlength{\parindent}{0em}
  - \newcommand{\accentrule}{\noindent\textcolor{accent}{\rule{\linewidth}{0.6pt}}}
  - \newcommand{\lightrule}{\vspace{0.06em}\noindent\textcolor{rulec}{\rule{\linewidth}{0.3pt}}\vspace{0.06em}}
  - \renewcommand{\arraystretch}{1.2}
---

\begin{center}
{\huge\bfseries\color{heading} 이재철}
\end{center}

\vspace{-0.5em}

\begin{center}
{\normalsize\color{accent}\textbf{DevOps Engineer}}
\end{center}

\vspace{-0.35em}

\begin{center}
{\scriptsize\color{muted} qws941@kakao.com\enspace\textbar\enspace 010-5757-9592\enspace\textbar\enspace \href{https://github.com/qws941}{github.com/qws941}\enspace\textbar\enspace \href{https://resume.jclee.me}{resume.jclee.me}\enspace\textbar\enspace \href{https://grafana.jclee.me/public-dashboards/2e98809632c841439635ffe2f8dc249b}{grafana.jclee.me}}
\end{center}

\vspace{0.1em}
\accentrule
\vspace{0.1em}

9년간 금융·공공 분야에서 인프라 설계·운영을 담당하며, Observability 체계 수립과 운영 자동화를 수행해왔습니다. 넥스트레이드 대체거래소에서 고가용성 인프라를 설계하고 Splunk·Prometheus·Grafana 기반 모니터링 체계를 구축한 경험을 바탕으로, 토스증권 DevOps&SRE팀이 추구하는 **개발자 경험 혁신**과 **Cloud Native 기반 시스템 고도화**에 기여하고자 지원합니다.

# 핵심 역량

\accentrule

- **Observability** — Prometheus, Grafana, Loki, ELK 기반 메트릭·로그 통합 모니터링 플랫폼 구축 및 운영
- **컨테이너 오케스트레이션** — EKS 기반 Kubernetes 클러스터 구축, Helm Chart 배포 자동화
- **네트워크 & 트러블슈팅** — L2~L7 네트워크 설계, 방화벽 HA, VPN 인프라, NSX-T 마이크로세그멘테이션 (CCNP)
- **자동화 & 툴 개발** — Python/Ansible 인프라 자동화, n8n 워크플로우 오케스트레이션, API 자동화 툴 개발
- **CI/CD** — GitLab CI/CD, GitHub Actions Self-hosted Runner, 컨테이너 빌드·배포 파이프라인
- **IaC & 클라우드** — Terraform 기반 AWS 인프라 코드 관리, Cloudflare Workers Edge 배포

# 경력사항

\accentrule

## ㈜아이티센 CTS | 보안운영SM | 2025.03 ~ 2026.02 (1년)

넥스트레이드 대체거래소 운영SM

- **보안 모니터링 체계 운영**: Splunk 기반 보안 로그 분석 고도화 및 실시간 위협 모니터링 운영
- **실시간 알림 자동화**: n8n + Splunk 연동 이벤트 탐지 시 Slack 알림 파이프라인 구축
- **운영 자동화 툴 개발**: FortiManager API 기반 방화벽 정책 조회 Python 라이브러리 개발
- **인프라 안정성**: HA 구성 기반 고가용성 유지 및 장애 대응 체계 운영

*기술: Splunk, FortiGate, n8n, Python, Docker, Linux*

\lightrule

## ㈜가온누리정보시스템 | 보안구축담당 | 2024.03 ~ 2025.02 (1년)

넥스트레이드 대체거래소 인프라 구축 — 금융위 본인가 심사 통과

- **고가용성 인프라 설계**: FGCP 기반 Active-Passive HA 클러스터 구성
- **IaC 기반 표준화**: Ansible Role 활용 장비 초기 설정 및 정책 배포 표준화
- **네트워크 아키텍처**: 망분리, L2/L3 네트워크 설계, VPN/NAC 접근제어 체계 구축
- **자동화**: FortiManager API 연동 정책 배포 자동화

*기술: Ansible, Python, FortiManager API, VMware, Linux*

\lightrule

## ㈜콴텍투자일임 | 정보보호팀 | 2022.08 ~ 2024.02 (1년 7개월)

AI 자산운용 플랫폼 클라우드 인프라 운영

- **AWS 인프라 관리**: VPC, Security Group, IAM 기반 클라우드 인프라 운영
- **IaC 도입**: Terraform으로 AWS 인프라를 코드 기반 관리로 전환
- **메트릭 모니터링**: Prometheus + Grafana 기반 대시보드 구축 및 운영
- **로그 통합 분석**: CloudTrail + GuardDuty 로그를 CloudWatch로 통합

*기술: AWS, Terraform, Prometheus, Grafana, CloudTrail*

\lightrule

## ㈜펀엔씨 | 인프라 담당 | 2022.05 ~ 2022.07 (3개월)

이커머스 클라우드 마이그레이션

- **EKS 컨테이너 오케스트레이션**: Kubernetes 클러스터 구축, RBAC 및 Pod Security 설정
- **Helm Chart 배포 자동화**: 애플리케이션 패키징 및 배포 파이프라인 표준화
- **CI/CD 파이프라인**: GitLab Runner 기반 컨테이너 이미지 빌드 및 배포 자동화
- **클라우드 전환**: 온프레미스에서 AWS VPC 기반 클라우드로 마이그레이션

*기술: AWS (EKS), Kubernetes, Docker, Helm, GitLab CI/CD*

\lightrule

## ㈜조인트리 | 시스템 엔지니어 | 2021.09 ~ 2022.04 (8개월)

국민대학교 차세대 정보시스템

- **SDN 네트워크 가상화**: VMware NSX-T 분산 방화벽(DFW) 기반 마이크로세그멘테이션 구현
- **보안 정책 중앙화**: 가상 스위치(VDS) 레벨 네트워크 보안 정책 중앙 관리
- **네트워크 아키텍처**: 하이브리드 클라우드 전환을 위한 네트워크 설계 지원

*기술: VMware NSX-T, vSphere, DFW, Linux*

\lightrule

## ㈜메타넷엠플랫폼 | 시스템 엔지니어 | 2019.12 ~ 2021.08 (1년 9개월)

대규모 컨택센터 인프라

- **VPN 인프라 구축**: 코로나19 대응 대규모 재택근무 VPN 인프라 긴급 구축 및 운영
- **인프라 자동화**: Ansible + Python 연동 서버 프로비저닝 및 설정 동기화 자동화
- **모니터링 시스템**: Zabbix/PRTG 기반 실시간 인프라 모니터링 및 VPN 세션 대시보드 구축

*기술: Ansible, Python, VPN, Zabbix, Linux*

\lightrule

## ㈜엠티데이타 | IT지원/OA운영 | 2017.02 ~ 2018.10 (1년 9개월)

한국항공우주산업(KAI)

- **폐쇄망 인프라 운영**: 서버 및 클라이언트 인프라 정기 점검 및 유지보수
- **자산 관리**: 내부 보안 규정에 따른 인프라 자산 관리 및 보안 패치 적용
- **장애 대응**: 시스템 로그 분석 기반 하드웨어 장애 징후 선제 파악

*기술: Linux, Windows Server, Shell Script*

# 개인 프로젝트 & 홈랩

\accentrule

## Observability Platform (2024.06 ~ 현재) — \href{https://grafana.jclee.me/public-dashboards/2e98809632c841439635ffe2f8dc249b}{grafana.jclee.me}

홈랩 인프라 통합 모니터링 플랫폼

- Prometheus 메트릭 수집, Blackbox Exporter 헬스체크, Grafana 대시보드 운영
- Loki 로그 집계 및 LogQL 쿼리·알림, ELK Stack 애플리케이션 로그 분석

## 홈랩 인프라 (2024.01 ~ 현재) — Proxmox VE 기반 가상화 플랫폼

- Docker 멀티 서비스, Traefik 리버스 프록시, **HashiCorp Vault** 시크릿 관리
- **Terraform** IaC (DNS/Workers/Proxmox), **GitHub Actions** Self-hosted Runner
- **n8n** 워크플로우 자동화 (Slack, GitHub, Cloudflare, Grafana 연동)

## HYCU FSDS 자율주행 (2025.11 ~ 2026.02) — 한양사이버대학교 포뮬러 경진대회 우수상

- ROS + Docker + AirSim 기반 자율주행 시스템 — Python LiDAR 콘 검출 및 경로 추종 알고리즘 구현

\newpage

# 기술 스택

\accentrule

| 영역 | 기술 |
|:---|:---|
| **Observability** | Prometheus, Grafana, Loki, ELK Stack (Elasticsearch/Kibana), Splunk |
| **Container** | Docker, Kubernetes (EKS), Helm, Docker Compose |
| **Cloud** | AWS (EC2, VPC, EKS, IAM, S3, CloudTrail), Cloudflare Workers, Proxmox VE |
| **CI/CD** | GitHub Actions (Self-hosted Runner), GitLab CI/CD, Ansible, Terraform, n8n |
| **Network** | FortiGate, NSX-T, VPN, NAC, Traefik/Nginx |
| **Language** | Python, Shell, Node.js/TypeScript |
| **Secret/IaC** | HashiCorp Vault, Terraform |
| **Database** | PostgreSQL, MySQL, Redis |

# 자격증

\accentrule

| 자격증 | 발급기관 | 취득년도 |
|:---|:---|:---|
| **CCNP** | Cisco Systems | 2020 |
| **RHCSA** | Red Hat | 2019 |
| **CompTIA Linux+** | CompTIA | 2019 |
| **LPIC-1** | Linux Professional Institute | 2019 |
| **리눅스마스터 2급** | 한국정보통신진흥협회 | 2019 |
| **사무자동화산업기사** | 한국산업인력공단 | 2014 |



# 학력

\accentrule

한양사이버대학교 컴퓨터공학과 (2024.03 ~ 재학중)

\vfill

\begin{center}
\textcolor{rulec}{\rule{0.25\linewidth}{0.3pt}}
\end{center}

\vspace{-0.4em}

\begin{center}
{\scriptsize\color{muted} 한국어: 원어민\enspace\textbar\enspace 영어: 기술 문서 독해 및 업무 커뮤니케이션\enspace\textbar\enspace 병역: 사회복무요원 (2014.12 \textasciitilde{} 2016.12)}
\end{center}
