# SSoT 추적성 매트릭스 — 위시캣 포트폴리오

모든 포트폴리오 주장 → `resume_data.json` 필드 1:1 매핑.

**SSoT**: `packages/data/resumes/master/resume_data.json`
**갱신일**: 2026-03-23

---

## 위시캣 폼 메타데이터 (SSoT 비대상)

다음 항목들은 위시캣 프로필 플랫폼 UI 입력 필드로, SSoT 데이터 주장이 아닌 플랫폼 양식 값입니다:

| 필드          | 설명                                      |
| ------------- | ----------------------------------------- |
| 참여율        | 위시캣 포트폴리오 폼의 필수 입력 필드     |
| 업무 범위     | 위시캣 포트폴리오 폼의 카테고리 선택 필드 |
| 역할          | 위시캣 포트폴리오 폼의 역할 입력 필드     |
| 카테고리      | 위시캣 포트폴리오 폼의 분류 선택 필드     |
| 프로젝트 분야 | 위시캣 포트폴리오 폼의 분야 선택 필드     |

---

## observability-portfolio.md ✅

| 포트폴리오 주장                                      | SSoT 경로                                 | SSoT 값                                                        |
| ---------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| 다수 메트릭 엔드포인트 수집                           | `personalProjects[name="Observability Platform"].description`     | `"Prometheus node_exporter로 Proxmox VM/CT 메트릭을 수집"`      |
| Grafana-as-code 대시보드                              | `personalProjects[name="Observability Platform"].description`  | `"Grafana 대시보드 정의를 코드로 관리"`                          |
| 여러 데이터소스 통합                                  | `personalProjects[name="Observability Platform"].technologies` | `["Grafana","Prometheus","Loki","Blackbox Exporter","Docker"]` |
| Blackbox Exporter 기반 모니터링                        | `personalProjects[name="Observability Platform"].technologies`      | `["...","Blackbox Exporter","..."]`                            |
| Prometheus, Loki, Grafana, Blackbox Exporter, Docker | `personalProjects[name="Observability Platform"].technologies`        | `["Grafana","Prometheus","Loki","Blackbox Exporter","Docker"]` |
| 홈랩 인프라 모니터링                                 | `personalProjects[name="Observability Platform"].description`         | `"홈랩 인프라 모니터링..."`                                    |
| 데모 URL                                             | `personalProjects[name="Observability Platform"].demoUrl`             | `"https://grafana.jclee.me/..."`                               |

R5 수정: `(인프라 헬스, 서비스 상태)` 대시보드 설명 제거, `외부 엔드포인트 가용성 감시` → `Blackbox Exporter 기반
모니터링`

---

## security-alert-portfolio.md ✅

| 포트폴리오 주장           | SSoT 경로                                    | SSoT 값                                |
| ------------------------- | -------------------------------------------- | -------------------------------------- |
| Splunk Saved Search 연동  | `personalProjects[name="Security Alert System"].description` | `"Splunk Saved Search와 Webhook을 연동"`      |
| Slack 알림 연동           | `personalProjects[name="Security Alert System"].technologies`  | `["Splunk","Python","Slack"]`         |
| FortiGate syslog → Splunk | `personalProjects[name="Security Alert System"].description`            | `"FortiGate 보안 이벤트가 장비 syslog와 Splunk에 분산"` |
| 중복 알림 억제       | `personalProjects[name="Security Alert System"].description`   | `"상태 전이 시에만 알림이 발송되도록 중복 알림을 억제"` |
| Splunk, Python, Slack     | `personalProjects[name="Security Alert System"].technologies`           | `["Splunk","Python","Slack"]`          |
| GitHub URL                | `personalProjects[name="Security Alert System"].githubUrl`              | `"https://github.com/jclee941/splunk"` |

R5 수정: `Splunk Enterprise Security` → `Splunk`, SPL 행 제거, `Alert Action → 변환` →
`Python 기반 알림 자동화`

---

## fortinet-api-portfolio.md ✅

| 포트폴리오 주장                      | SSoT 경로                                | SSoT 값                                     |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------- |
| FortiManager API 활용                | `careers[0].description`  | `"FortiManager JSON-RPC API를 활용한 방화벽 정책 자동 조회"`    |
| 방화벽 정책 자동 조회                | `careers[0].description`   | `"콘솔 수동 조작을 제거하고 접근 제어 일관성을 확보"`       |
| 콘솔 수동 조작 제거              | `careers[0].description` | `"콘솔 수동 조작을 제거"`            |
| Python, Splunk, Slack                | `personalProjects[name="Security Alert System"].technologies`       | `["Splunk","Python","Slack"]` |
| GitHub URL                           | `personalProjects[name="Security Alert System"].githubUrl`          | `"https://github.com/jclee941/splunk"`      |

R7 수정: FortiNet API 주장을 실제 SSoT 필드(careers[0].description, Security Alert technologies)로 재매핑

---

## nextrade-portfolio.md ✅

| 포트폴리오 주장            | SSoT 경로                                     | SSoT 값                                                     |
| -------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| 2024.03 ~ 2026.02          | `experiences[0].period`                       | `"2024.03 ~ 2026.02"`                                       |
| 보안 인프라 설계/구축/운영 | `experiences[0].title` + `responsibilities[]` | `"보안 인프라 설계"` → `"보안운영 SM"`                      |
| FortiGate HA 구성          | `experiences[0].responsibilities`             | `"FGCP Active-Passive HA 기반 보안 아키텍처 구축"`          |
| Ansible 정책 배포          | `experiences[0].responsibilities`             | `"Ansible Role 기반 방화벽 초기 설정 및 정책 배포 표준화"`  |
| 금융위 본인가              | `experiences[0].responsibilities`             | `"금융위원회 본인가 심사 기술 대응 및 보안 아키텍처 수립"`  |
| Splunk ES 보안 운영        | `experiences[0].responsibilities`             | `"Splunk ES 및 FortiGate API를 활용한 보안 운영 자동화"`    |
| Splunk Saved Search 알림   | `personalProjects[name="Security Alert System"].description`  | `"Splunk Saved Search와 Webhook을 연동"`                            |
| 중복 알림 억제          | `personalProjects[name="Security Alert System"].description`    | `"중복 알림을 억제"`                           |
| FortiManager API           | `experiences[0].responsibilities`             | `"FortiManager API를 이용한 방화벽 정책 자동 조회 툴 개발"` |

R5 수정: `(JSON-RPC)` 제거

---

## blacklist-portfolio.md ✅

| 포트폴리오 주장                    | SSoT 경로                             | SSoT 값                                   |
| ---------------------------------- | ------------------------------------- | ----------------------------------------- |
| multiple threat intelligence feeds       | `personalProjects[name="IP Blacklist Platform"].description`   | `"AbuseIPDB, Emerging Threats, AlienVault OTX feed"`          |
| Flask REST API + Next.js Dashboard | `personalProjects[name="IP Blacklist Platform"].technologies`   | `["Flask","Next.js","PostgreSQL"]`    |
| PostgreSQL 저장                    | `personalProjects[name="IP Blacklist Platform"].technologies` | `["Flask","Next.js","PostgreSQL"]`      |
| Flask, Next.js, PostgreSQL         | `personalProjects[name="IP Blacklist Platform"].technologies`    | `["Flask","Next.js","PostgreSQL"]`        |
| GitHub URL                         | `personalProjects[name="IP Blacklist Platform"].githubUrl`       | `"https://github.com/jclee941/blacklist"` |

R6 수정: 면책 표기 제거, SSoT 미등록 기술 행 전체 제거 (Redis, Docker, Portainer, Claude AI,
GitLab CI/CD, Nginx, Cloudflare), `(TypeScript)` 제거, `금융` 접두사 제거, `파이프라인 구축` →
`자동 수집`

---

## safework-portfolio.md ❌ (SSoT 미등록)

이 프로젝트는 `resume_data.json`의 `personalProjects[]` 또는 `projects[]`에 존재하지 않음.

**조치**: 파일 상단에 SSoT 미등록 면책 표시 추가 완료.
**후속**: SafeWork 프로젝트 데이터를 `resume_data.json`에 등재한 뒤 전체 검증 수행.

---

## profile-intro.md ✅

| 포트폴리오 주장                  | SSoT 경로                              | SSoT 값                                                    |
| -------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| 8년차 + Linux 재무장 1년         | `experiences[]` 총 기간 계산           | 실 근무 합계 약 8년 + 2018.11~2019.11 reskilling           |
| 넥스트레이드 본인가              | `experiences[0].responsibilities`      | `"금융위원회 본인가 심사 기술 대응"`                       |
| FortiGate/FortiManager HA        | `experiences[0].responsibilities`      | `"FGCP Active-Passive HA"`                                 |
| 금융위원회 본인가 심사 기술 대응 | `experiences[0].responsibilities`      | `"금융위원회 본인가 심사 기술 대응 및 보안 아키텍처 수립"` |
| Grafana + Prometheus + Loki      | `personalProjects[name="Observability Platform"].technologies`     | `["Grafana","Prometheus","Loki"]`                          |
| Grafana-as-code 대시보드         | `personalProjects[name="Observability Platform"].description`          | `"Grafana 대시보드 정의를 코드로 관리"`    |
| Splunk ES                        | `experiences[0].responsibilities`      | `"Splunk ES 및 FortiGate API를 활용"`                      |
| FortiManager API 활용             | `careers[0].description`                | `"FortiManager JSON-RPC API를 활용한 방화벽 정책 자동 조회"`                      |
| CompTIA Linux+, LPIC-1, RHCSA 등 | `certifications[]`                     | 자격증 배열                                            |
| 선호 프로젝트                    | 위시캣 프로필 UI 입력                  | SSoT 비대상 (HTML 주석 표기)                               |

R5 수정: `차세대 증권거래소` 제거, `리포트 자동화` → SSoT features 원문, `SOAR/AWS/IaC` 괄호 제거, 선호
프로젝트 SSoT 비대상 주석 추가
R6 수정: `VPN 인프라 설계` 제거 → `망 분리 및 접근통제 정책 설계` (VPN은 메타넷 경력이며 해당 섹션 문맥과 불일치)
