# SSoT 추적성 매트릭스 — 위시캣 포트폴리오

모든 포트폴리오 주장 → `resume_data.json` 필드 1:1 매핑.

**SSoT**: `packages/data/resumes/master/resume_data.json`
**갱신일**: 2026-03-23

---

## 위시캣 폼 메타데이터 (SSoT 비대상)

다음 항목들은 위시캣 프로필 플랫폼 UI 입력 필드로, SSoT 데이터 주장이 아닌 플랫폼 양식 값입니다:

| 필드 | 설명 |
|------|------|
| 참여율 | 위시캣 포트폴리오 폼의 필수 입력 필드 |
| 업무 범위 | 위시캣 포트폴리오 폼의 카테고리 선택 필드 |
| 역할 | 위시캣 포트폴리오 폼의 역할 입력 필드 |
| 카테고리 | 위시캣 포트폴리오 폼의 분류 선택 필드 |
| 프로젝트 분야 | 위시캣 포트폴리오 폼의 분야 선택 필드 |

---

## observability-portfolio.md ✅

| 포트폴리오 주장 | SSoT 경로 | SSoT 값 |
|----------------|-----------|---------|
| 50+ 메트릭 엔드포인트 수집 | `personalProjects[0].metrics.targets` | `"50+ metrics endpoints"` |
| 12+ Grafana 대시보드 | `personalProjects[0].metrics.dashboards` | `"12+"` |
| 3개 데이터소스 통합 | `personalProjects[0].metrics.datasources` | `"Prometheus, Loki, Elasticsearch"` |
| 99.5% 인프라 가용률 | `personalProjects[0].metrics.uptime` | `"99.5%"` |
| Prometheus, Loki, Grafana, Blackbox Exporter, Docker | `personalProjects[0].technologies` | `["Grafana","Prometheus","Loki","Blackbox Exporter","Docker"]` |
| 홈랩 인프라 모니터링 | `personalProjects[0].description` | `"홈랩 인프라 모니터링..."` |
| 데모 URL | `personalProjects[0].demoUrl` | `"https://grafana.jclee.me/..."` |

R5 수정: `(인프라 헬스, 서비스 상태)` 대시보드 설명 제거, `외부 엔드포인트 가용성 감시` → `Blackbox Exporter 기반 모니터링`

---

## security-alert-portfolio.md ✅

| 포트폴리오 주장 | SSoT 경로 | SSoT 값 |
|----------------|-----------|---------|
| 32개 탐지 룰 | `personalProjects[3].metrics.detectionRules` | `"32개"` |
| Slack Block Kit 알림 | `personalProjects[3].metrics.alertChannels` | `"Slack Block Kit"` |
| FortiGate syslog → Splunk | `personalProjects[3].metrics.sources` | `"FortiGate syslog → Splunk"` |
| 30초 이내 알림 | `personalProjects[3].metrics.responseTime` | `"이벤트 발생 후 30초 이내 알림"` |
| Splunk, Python, Slack | `personalProjects[3].technologies` | `["Splunk","Python","Slack"]` |
| GitHub URL | `personalProjects[3].githubUrl` | `"https://github.com/jclee941/splunk"` |

R5 수정: `Splunk Enterprise Security` → `Splunk`, SPL 행 제거, `Alert Action → 변환` → `Python 기반 알림 자동화`

---

## fortinet-api-portfolio.md ✅

| 포트폴리오 주장 | SSoT 경로 | SSoT 값 |
|----------------|-----------|---------|
| FortiManager, FortiAnalyzer REST API | `personalProjects[2].metrics.endpoints` | `"FortiManager, FortiAnalyzer REST API"` |
| 정책 조회, 라우트 관리, 로그 통계 | `personalProjects[2].metrics.features` | `"정책 조회, 라우트 관리, 로그 통계"` |
| 수동 대비 80% 시간 절감 | `personalProjects[2].metrics.automation` | `"수동 작업 대비 80% 시간 절감"` |
| Python, FortiManager, FortiAnalyzer | `personalProjects[2].technologies` | `["Python","FortiManager","FortiAnalyzer"]` |
| GitHub URL | `personalProjects[2].githubUrl` | `"https://github.com/jclee941/splunk"` |

R5 수정: `JSON-RPC over HTTPS` 행 제거, features를 SSoT 원문으로 축소

---

## n8n-portfolio.md ✅

| 포트폴리오 주장 | SSoT 경로 | SSoT 값 |
|----------------|-----------|---------|
| 15+ 워크플로우 | `personalProjects[1].metrics.workflows` | `"15+"` |
| 일 200+ 실행 | `personalProjects[1].metrics.executions` | `"일 200+ 실행"` |
| Slack, GitHub, Cloudflare, Grafana | `personalProjects[1].metrics.integrations` | `"Slack, GitHub, Cloudflare, Grafana"` |
| n8n, PostgreSQL, Docker | `personalProjects[1].technologies` | `["n8n","PostgreSQL","Docker"]` |
| 알림, 배포, 데이터 수집 자동화 | `personalProjects[1].description` | `"알림, 배포, 데이터 수집 워크플로우 자동화."` |

R5 수정: `self-hosted` 제거, `Code nodes` 행 제거, 연동 상세 5줄→1줄 축소, `재시도 로직` 제거

---

## nextrade-portfolio.md ✅

| 포트폴리오 주장 | SSoT 경로 | SSoT 값 |
|----------------|-----------|---------|
| 2024.03 ~ 2026.02 | `experiences[0].period` | `"2024.03 ~ 2026.02"` |
| 보안 인프라 설계/구축/운영 | `experiences[0].title` + `responsibilities[]` | `"보안 인프라 설계"` → `"보안운영 SM"` |
| FortiGate HA 구성 | `experiences[0].responsibilities` | `"FGCP Active-Passive HA 기반 보안 아키텍처 구축"` |
| Ansible 정책 배포 | `experiences[0].responsibilities` | `"Ansible Role 기반 방화벽 초기 설정 및 정책 배포 표준화"` |
| 금융위 본인가 | `experiences[0].responsibilities` | `"금융위원회 본인가 심사 기술 대응 및 보안 아키텍처 수립"` |
| Splunk ES 보안 운영 | `experiences[0].responsibilities` | `"Splunk ES 및 FortiGate API를 활용한 보안 운영 자동화"` |
| 32개 탐지 룰 | `personalProjects[3].metrics.detectionRules` | `"32개"` |
| 30초 내 알림 | `personalProjects[3].metrics.responseTime` | `"이벤트 발생 후 30초 이내 알림"` |
| FortiManager API | `experiences[0].responsibilities` | `"FortiManager API를 이용한 방화벽 정책 자동 조회 툴 개발"` |

R5 수정: `(JSON-RPC)` 제거

---

## blacklist-portfolio.md ✅

| 포트폴리오 주장 | SSoT 경로 | SSoT 값 |
|----------------|-----------|---------||
| 3+ threat intelligence feeds | `personalProjects[4].metrics.feeds` | `"3+ threat intelligence feeds"` |
| Flask REST API + Next.js Dashboard | `personalProjects[4].metrics.stack` | `"Flask REST API + Next.js Dashboard"` |
| PostgreSQL GeoIP enrichment | `personalProjects[4].metrics.storage` | `"PostgreSQL with GeoIP enrichment"` |
| Flask, Next.js, PostgreSQL | `personalProjects[4].technologies` | `["Flask","Next.js","PostgreSQL"]` |
| GitHub URL | `personalProjects[4].githubUrl` | `"https://github.com/jclee941/blacklist"` |

R6 수정: 면책 표기 제거, SSoT 미등록 기술 행 전체 제거 (Redis, Docker, Portainer, Claude AI, GitLab CI/CD, Nginx, Cloudflare), `(TypeScript)` 제거, `금융` 접두사 제거, `파이프라인 구축` → `자동 수집`

---

## safework-portfolio.md ❌ (SSoT 미등록)

이 프로젝트는 `resume_data.json`의 `personalProjects[]` 또는 `projects[]`에 존재하지 않음.

**조치**: 파일 상단에 SSoT 미등록 면책 표시 추가 완료.
**후속**: SafeWork 프로젝트 데이터를 `resume_data.json`에 등재한 뒤 전체 검증 수행.

---

## profile-intro.md ✅

| 포트폴리오 주장 | SSoT 경로 | SSoT 값 |
|----------------|-----------|---------|
| 9년차 | `experiences[]` 총 기간 계산 | 2017 ~ 2026 = 9년 |
| 넥스트레이드 본인가 | `experiences[0].responsibilities` | `"금융위원회 본인가 심사 기술 대응"` |
| FortiGate/FortiManager HA | `experiences[0].responsibilities` | `"FGCP Active-Passive HA"` |
| 금융위원회 본인가 심사 기술 대응 | `experiences[0].responsibilities` | `"금융위원회 본인가 심사 기술 대응 및 보안 아키텍처 수립"` |
| Grafana + Prometheus + Loki | `personalProjects[0].technologies` | `["Grafana","Prometheus","Loki"]` |
| 12+ 대시보드, 50+ 메트릭 | `personalProjects[0].metrics` | `dashboards: "12+"`, `targets: "50+ metrics endpoints"` |
| Splunk ES | `experiences[0].responsibilities` | `"Splunk ES 및 FortiGate API를 활용"` |
| 15+ 워크플로우, 일 200+ 실행 | `personalProjects[1].metrics` | `workflows: "15+"`, `executions: "일 200+ 실행"` |
| FortiNet API 기능 | `personalProjects[2].metrics.features` | `"정책 조회, 라우트 관리, 로그 통계"` |
| CompTIA Linux+, LPIC-1, RHCSA 등 | `certifications[]` | 5개 자격증 배열 |
| 선호 프로젝트 | 위시캣 프로필 UI 입력 | SSoT 비대상 (HTML 주석 표기) |

R5 수정: `차세대 증권거래소` 제거, `ISMS-P` 제거, `리포트 자동화` → SSoT features 원문, `SOAR/AWS/IaC` 괄호 제거, 선호 프로젝트 SSoT 비대상 주석 추가
R6 수정: `VPN 인프라 설계` 제거 → `망 분리 및 접근통제 정책 설계` (VPN은 메타넷 경력이며 해당 섹션 문맥과 불일치)
