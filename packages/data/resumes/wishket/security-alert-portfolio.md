# Security Alert System — 위시캣 포트폴리오

## 기본 정보

| 항목 | 내용 |
|------|------|
| **포트폴리오명** | 보안 알림 자동화 시스템 |
| **업무 범위** | 개발 / 운영 |
| **카테고리** | 보안 |
| **프로젝트 분야** | 보안 자동화 |
| **참여 기간** | 2025.01 ~ 현재 |
| **참여율** | 100% |
| **역할** | Security Engineer |

---

## 기술스택

| 레이어 | 기술 |
|--------|------|
| **SIEM** | Splunk |
| **Source** | FortiGate syslog |
| **Automation** | Python |
| **Notification** | Slack Block Kit |

---

## 프로젝트 개요

FortiGate 보안 이벤트를 Splunk에서 실시간 탐지하고 Slack으로 즉시 알림하는 자동화 시스템.

- 32개 탐지 룰 설계 및 운영
- FortiGate syslog → Splunk 수집 파이프라인 구성
- Python 기반 Slack Block Kit 알림 자동화
- 이벤트 발생 후 30초 이내 알림 도달

---

## 주요 성과

- 32개 보안 탐지 룰 운영
- 이벤트 발생 → 알림 30초 이내 달성
- Slack Block Kit 기반 구조화된 알림 포맷

---

## 링크

- https://github.com/qws941/splunk
