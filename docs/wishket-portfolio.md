# 위시캣 포트폴리오

## 파트너 소개

금융·공공 보안 인프라 엔지니어. 넥스트레이드에서 Splunk ES 탐지 체계와 FortiGate HA 아키텍처를 설계·운영했고,
Grafana·Prometheus·Loki 기반 Observability 플랫폼을 직접 구축 중. 보안 설계부터 자동화·관측성까지
end-to-end로 책임지는 시니어 역할에 집중합니다.

## 보유 기술

Splunk, FortiGate, FortiManager, FortiAnalyzer, Prometheus, Grafana, Loki, AWS,
Terraform, Docker, Kubernetes, Linux, Ansible, Python, automation, GitHub Actions,
GitLab CI/CD, PostgreSQL, Elasticsearch, Kibana, VMware NSX-T, VPN, NAC, Shell
Script

---

## 포트폴리오 항목

### ① 넥스트레이드 보안운영 자동화

- **프로젝트 분야**: 유지보수·운영
- **고객사**: 넥스트레이드 (via 아이티센 CTS)
- **기간**: 2025.03 ~ 2026.02
- **역할**: 1인 보안 자동화 담당
- **참여율**: 100%
- **관련 기술**: Splunk, FortiGate, FortiManager, automation, Python, Docker, Linux

**배경**
매매체결시스템 환경에서 보안 이벤트 대응과 방화벽 정책 조회가 수동 중심으로 운영되고 있었습니다.

**진행 과정**

1. Splunk ES 탐지 룰 설계·운영
2. 자동화 워크플로우 → Slack 실시간 알림 연동
3. FortiManager API 기반 정책 조회 Python 라이브러리 개발

**성과**

- 보안 이벤트 실시간 알림 체계 구축
- 방화벽 정책 조회를 API 자동화로 전환
- 불필요한 알림 대폭 감소

---

### ② 넥스트레이드 보안인프라 설계·구축

- **프로젝트 분야**: IT 서비스 구축
- **고객사**: 넥스트레이드 (via 가온누리정보시스템)
- **기간**: 2024.03 ~ 2025.02
- **역할**: 보안 아키텍처 설계 및 FortiGate HA 구축 담당
- **참여율**: 100%
- **관련 기술**: FortiGate, FortiManager, Ansible, Python, Linux, VMware

**배경**
금융위 본인가를 앞둔 신규 거래소 환경에서 보안 인프라를 짧은 일정 안에 설계·표준화해야 했습니다.

**진행 과정**

1. FGCP Active-Passive 기반 FortiGate HA 구조 설계
2. 망분리·L2/L3 네트워크·VPN/NAC 접근통제 아키텍처 수립
3. Ansible Role + FortiManager API로 초기 설정·정책 배포 표준화

**성과**

- 금융위 본인가 심사 통과
- FortiGate HA 고가용성 설계 완료
- Ansible 기반 설정·정책 배포 표준화

---

### ③ AI투자서비스 AWS 보안운영

- **프로젝트 분야**: 클라우드 도입
- **고객사**: 콴텍투자일임
- **기간**: 2022.08 ~ 2024.02
- **역할**: AWS 보안 운영 및 관측성 구축 담당
- **관련 기술**: AWS, Terraform, CloudTrail, GuardDuty, Prometheus, Grafana

**배경**
AI 자산운용 플랫폼의 AWS 보안 운영이 콘솔 중심으로 분산되어 있었고, 심사 대응을 위한 변경 이력 관리가 비효율적이었습니다.

**진행 과정**

1. Terraform으로 VPC·Subnet·Security Group 코드화
2. IAM·WAF 운영 기준 정비
3. CloudTrail·GuardDuty → CloudWatch 통합 + Prometheus/Grafana 대시보드 구축

**성과**

- VPC/Subnet/SG Terraform 코드화 완료
- CloudTrail + GuardDuty 통합 분석 체계 구축
- 로보어드바이저 테스트베드 심사 대응 기반 마련

---

### ④ 이커머스 클라우드 마이그레이션

- **프로젝트 분야**: 클라우드 도입
- **고객사**: 펀엔씨
- **기간**: 2022.05 ~ 2022.07
- **역할**: 클라우드 마이그레이션 및 CI/CD 보안 구축 담당
- **관련 기술**: AWS, Kubernetes, Docker, Helm, GitLab CI/CD

**배경**
이커머스 서비스를 온프레미스에서 AWS로 전환해야 했고, 컨테이너 보안 기준과 배포 검증 절차가 부재한 상태였습니다.

**진행 과정**

1. AWS VPC 기반 마이그레이션 구조 설계
2. EKS 클러스터 RBAC·Pod Security 기준 수립
3. Helm Chart 배포 자동화 + GitLab CI/CD 보안 스캔 파이프라인 구축

**성과**

- 온프레미스→AWS 클라우드 전환 완료
- EKS 컨테이너 보안 기준 수립
- CI/CD 파이프라인에 보안 스캔 단계 추가

---

### ⑤ 국민대 차세대 정보시스템 보안

- **프로젝트 분야**: IT 서비스 구축
- **고객사**: 국민대학교 (via 조인트리)
- **기간**: 2021.09 ~ 2022.04
- **역할**: NSX-T 마이크로세그멘테이션 및 통합 보안 정책 설계 담당
- **관련 기술**: VMware NSX-T, Firewall, NAC, DLP, Wazuh, Kibana

**배경**
대학 차세대 정보시스템 전환 과정에서 내부망 동서 트래픽 통제와 통합 보안 정책 일원화가 필요했습니다.

**진행 과정**

1. VMware NSX-T DFW 기반 마이크로세그멘테이션 설계
2. NAC·DLP·APT 연계 정책 체계 구축
3. Wazuh/Kibana 기반 보안 모니터링 구축

**성과**

- NSX-T 마이크로세그멘테이션 적용 완료
- NAC·DLP 통합 보안 정책 수립
- Wazuh 기반 보안 이벤트 모니터링 운영

---

### ⑥ 컨택센터 원격근무 인프라

- **프로젝트 분야**: IT 서비스 구축
- **고객사**: 메타넷엠플랫폼
- **기간**: 2020.08 ~ 2021.08
- **역할**: VPN/NAC 운영 자동화 및 스위치 점검 자동화 담당
- **관련 기술**: Ansible, Python, VPN, NAC, Zabbix, PRTG, Linux

**배경**
COVID-19로 대규모 재택근무 전환이 긴급 필요했고, VPN·NAC 예외 정책 처리와 스위치 점검이 수작업이어서 장애 문의가 누적됐습니다.

**진행 과정**

1. FortiGate SSL VPN + NAC 연동 구조 구축
2. Ansible로 NAC 예외 정책 배포 자동화
3. Python으로 Cisco 스위치 자동 점검 시스템 + VPN 세션 모니터링 대시보드 구축

**성과**

- VPN+NAC 연동 원격근무 인프라 구축
- Ansible 기반 NAC 정책 배포 자동화
- Python 스위치 자동 점검·VPN 모니터링 운영

---

### ⑦ KAI 폐쇄망 인프라 운영

- **프로젝트 분야**: 유지보수·운영
- **고객사**: 한국항공우주산업(KAI) (via 엠티데이타)
- **기간**: 2018.10 ~ 2019.10
- **역할**: 폐쇄망 서버 운영 및 보안 패치 체계 담당
- **관련 기술**: Linux, Windows Server, Shell Script, Firewall

**배경**
폐쇄망 제조 보안 환경에서 Linux 서버와 방화벽 정책을 운영해야 했고, 자산·패치·취약점 관리가 분리되어 있었습니다.

**진행 과정**

1. 시스템 로그 분석 기반 점검 체계 운영
2. 방화벽 정책 재설계 및 중복 룰 정리
3. 제조망-개발망 망분리 운영 + 월간 취약점 점검·패치 절차 정착

**성과**

- 방화벽 정책 최적화 (중복 룰 정리)
- 제조망-개발망 분리 운영 기간 내부정보 유출사고 없음
- Critical 취약점 조기 조치 체계 수립
