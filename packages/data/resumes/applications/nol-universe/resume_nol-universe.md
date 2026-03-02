---
title: "이력서 - 이재철"
author: "이재철"
date: "2026-01"
geometry: margin=2cm
fontsize: 11pt
---

# 이재철 (Lee Jae Chul)

**클라우드 보안 아키텍트**

---

## 인적사항

| 항목      | 내용                                   |
| --------- | -------------------------------------- |
| 이름      | 이재철 (Lee Jae Chul)                  |
| 생년월일  | 1994.10.17                             |
| 이메일    | qws941@kakao.com                       |
| 연락처    | 010-5757-9592                          |
| 주소      | 경기도 시흥시 장현천로61, 307동 1301호 |
| GitHub    | github.com/qws941                      |
| 경력 기간 | 7년 10개월 (2017.02 ~ 현재)            |

---

## 기술 요약

### Security Architecture & Compliance

- **클라우드 보안**: AWS 보안 아키텍처 설계 (VPC 분리, Security Group, IAM 최소권한)
- **인프라 취약점**: CCE 취약점 점검 및 Ansible 기반 자동 교정
- **컴플라이언스**: 금융위원회 본인가 심사 대응 (보안 아키텍처 문서화)
- **방화벽 관리**: FortiGate, FortiManager API 기반 정책 자동화

### Kubernetes & Container Security

- **K8s 보안**: Pod Security Standards, Network Policy, RBAC 설계
- **컨테이너 런타임**: Docker, EKS 환경 보안 설정 및 운영
- **이미지 보안**: 컨테이너 이미지 스캐닝, 취약점 관리
- **마이크로세그멘테이션**: NSX-T 기반 네트워크 분리

### DevSecOps & CI/CD

- **파이프라인 보안**: GitLab CI/CD, GitHub Actions 보안 자동화
- **SAST/DAST**: SonarQube (정적 분석), OWASP ZAP (동적 분석), Trivy (컨테이너 스캔)
- **시크릿 관리**: gitleaks, 시크릿 스캐닝 파이프라인 통합
- **Shift-Left Security**: 빌드 시점 보안 검증 자동화
- **IaC 보안**: Terraform, Ansible 기반 보안 설정 코드화

### Monitoring & Incident Response

- **SIEM**: Splunk 기반 보안 로그 분석 및 이상 징후 탐지
- **모니터링**: Grafana, Prometheus, Loki 기반 보안 메트릭 시각화
- **알림 체계**: n8n 워크플로우 기반 실시간 알림 구성

---

## 경력사항

### (주)아이티센 CTS | 보안운영SM (Security Operation Manager)

**2025.03 ~ 현재 (10개월)**

**넥스트레이드 대체거래소 매매체결시스템 보안 운영**

- **주요 업무**:
  - 국내 최초 대체거래소(STO) 보안 운영 총괄
  - AWS 기반 클라우드 인프라 보안 아키텍처 관리
  - SIEM(Splunk) 기반 보안 로그 분석 및 실시간 모니터링
  - CCE 취약점 점검 수행 및 개선 조치 이행
  - Python 기반 보안 자동화 스크립트 개발

- **기술 스택**: AWS, Splunk, Python, Docker, Linux (CentOS 7/Rocky Linux 9)

- **성과**:
  - Splunk 기반 이상 징후 조기 탐지 체계 구축
  - 보안 점검 자동화로 CCE 미준수 항목 대응 시간 50% 단축

---

### (주)가온누리정보시스템 | 보안/인프라 엔지니어

**2024.03 ~ 2025.02 (1년)**

**넥스트레이드 대체거래소 매매체결시스템 구축**

- **주요 업무**:
  - 대체거래소 인프라 보안 아키텍처 설계 (100+ 서버 환경)
  - FortiManager API 기반 방화벽 정책 자동화 (Python SDK)
  - Ansible 플레이북 개발로 보안 설정 표준화 및 자동화
  - 금융위원회 본인가 심사 기술 대응 (보안 아키텍처 문서화)
  - CCE 취약점 점검 자동화 스크립트 개발

- **기술 스택**: Python, Ansible, FortiManager API, VMware, Linux

- **성과**:
  - FortiManager API 자동화로 방화벽 정책 배포 시간 70% 단축
  - Ansible 기반 CCE 점검 자동화로 수동 점검 대비 70% 시간 단축
  - 금융위 본인가 심사 통과 (보안 아키텍처 부분)

---

### (주)콴텍투자일임 | 인프라 보안 담당

**2022.08 ~ 2024.02 (1년 7개월)**

**AWS 클라우드 보안 관리 및 데이터센터 운영**

- **주요 업무**:
  - AWS 보안 아키텍처 설계 및 관리 (VPC, Security Group, IAM)
  - 온프레미스 데이터센터 보안 운영 (망분리 환경)
  - Python 기반 보안 점검 및 모니터링 자동화
  - 보안 정책 유지 및 컴플라이언스 대응

- **기술 스택**: AWS (EC2, VPC, IAM, S3), Python, Linux

- **성과**:
  - AWS 보안 그룹 정책 최적화로 불필요한 노출 80% 감소
  - Python 기반 보안 점검 자동화로 수동 작업 제거

---

### (주)펀엔씨 | 클라우드/컨테이너 엔지니어

**2022.05 ~ 2022.07 (3개월)**

**AWS 및 Kubernetes 보안 환경 구성**

- **주요 업무**:
  - AWS 보안 환경 구성 (VPC 분리, Network ACL, Security Group)
  - Kubernetes(K8s) 보안 환경 검토 및 POC (RBAC, Network Policy)
  - GitLab CI/CD 보안 파이프라인 구성 (시크릿 스캐닝)

- **기술 스택**: AWS, Kubernetes, Docker, GitLab CI/CD

- **성과**:
  - K8s 보안 기반 컨테이너 환경 POC 성공적 완료
  - CI/CD 파이프라인에 보안 검증 단계 통합

---

### (주)조인트리 | 시스템 엔지니어

**2021.09 ~ 2022.04 (8개월)**

**국민대학교 차세대 정보시스템 구축 프로젝트**

- **주요 업무**:
  - VMware NSX-T 기반 마이크로세그멘테이션 구현
  - 네트워크 가상화 보안 정책 설계 (분산 방화벽)
  - vSphere 가상화 인프라 보안 설정

- **기술 스택**: VMware NSX-T, vSphere, Linux

- **성과**:
  - NSX-T 분산 방화벽으로 워크로드 간 보안 정책 세분화
  - 마이크로세그멘테이션 적용으로 측면 이동 위협 차단

---

### (주)메타넷엠플랫폼 | 시스템 엔지니어

**2019.12 ~ 2021.08 (1년 9개월)**

**LG유플러스 콜센터 재택근무 보안 환경 구성**

- **주요 업무**:
  - Ansible 기반 VPN 서버 보안 자동화 (OpenVPN, Pritunl)
  - Python 스크립트로 사용자 인증서 배포 자동화
  - 재택근무 환경 보안 모니터링 및 접근 통제

- **기술 스택**: Ansible, Python, VPN (OpenVPN, Pritunl), Linux

- **성과**:
  - Ansible 자동화로 VPN 보안 설정 배포 시간 80% 단축
  - 1,000+ 사용자 인증서 관리 자동화

---

### (주)엠티데이타 | 시스템 운영

**2017.02 ~ 2018.10 (1년 9개월)**

**한국항공우주산업(KAI) 보안 인프라 운영**

- **주요 업무**:
  - 방위산업체 보안 환경 운영 (망분리, 접근통제)
  - FortiGate 방화벽 정책 관리 및 로그 분석
  - Shell 스크립트 기반 보안 로그 분석 자동화

- **기술 스택**: Linux, Shell Script, FortiGate 방화벽

- **성과**:
  - 보안 로그 분석 자동화로 이상 징후 조기 발견
  - 24/7 보안 운영 환경에서 99.9% 가용성 유지

---

## 프로젝트 경험 (개인)

### 홈랩 보안 모니터링 시스템 구축

**2024.06 ~ 현재**

- **목적**: 보안 메트릭 수집 및 시각화, 이상 징후 탐지
- **기술 스택**: Grafana, Prometheus, Loki, Traefik, Docker
- **내용**:
  - Prometheus 기반 보안 메트릭 수집 (인증 실패, 접근 로그)
  - Loki 중앙화 로그 수집으로 보안 이벤트 분석
  - Grafana 대시보드로 보안 현황 실시간 시각화

### DevSecOps 파이프라인 구축 (GitLab 셀프호스팅)

**2023.01 ~ 현재**

- **목적**: Shift-Left 보안, CI/CD 보안 자동화 학습
- **기술 스택**: GitLab EE, Docker, gitleaks, Trivy, CI/CD
- **내용**:
  - GitLab CI/CD에 gitleaks(시크릿 스캐닝) 통합
  - Trivy 컨테이너 이미지 취약점 스캔 자동화
  - 보안 검증 실패 시 배포 차단 정책 적용

### 이력서 사이트 (Zero Trust Architecture)

**2024.01 ~ 현재**

- **URL**: https://resume.jclee.me
- **기술 스택**: Cloudflare Workers, GitLab CI/CD, JavaScript
- **내용**:
  - CSP(Content Security Policy) SHA-256 해시 기반 보안 헤더 적용
  - Security Headers 최적화 (HSTS, X-Frame-Options, X-XSS-Protection)
  - Cloudflare WAF 통합으로 엣지 레벨 보안

---

## 자격증

| 자격증                                                    | 발급기관             | 취득일  |
| --------------------------------------------------------- | -------------------- | ------- |
| CCNP (Cisco Certified Network Professional)               | Cisco                | 2020.08 |
| RHCSA (Red Hat Certified System Administrator)            | Red Hat              | 2019.01 |
| CompTIA Linux+                                            | CompTIA              | 2019.02 |
| LPIC Level 1 (Linux Professional Institute Certification) | LPI                  | 2019.02 |
| 리눅스마스터 2급                                          | 한국정보통신진흥협회 | 2019.01 |

---

## 학력

**한양사이버대학교 컴퓨터공학과**  
재학중 (2024.03 ~ 현재)

---

## 기타

### 언어

- **한국어**: 원어민 (Native)
- **영어**: 기술 문서 독해 가능 (Technical Documentation)

### 보안 관심 분야

- CNAPP (Cloud-Native Application Protection Platform)
- Zero Trust Architecture
- Policy-as-Code (OPA/Rego)
- CSPM/CWPP

### GitHub

- **URL**: github.com/qws941
- **활동**: DevSecOps 파이프라인, 보안 자동화 스크립트, 인프라 코드

---

**이력서 작성일**: 2026년 1월
