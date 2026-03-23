# 위시캣 프로필 갭 분석 보고서

**분석일**: 2026-03-23
**SSoT 기준**: `packages/data/resumes/master/resume_data.json`
**참조**: 위시캣 공식 프로필 가이드 (wishket.com/news-center/detail/253, /238)

---

## 1. 위시캣 프로필 구조 분석

위시캣 프리랜서 프로필은 4개 핵심 섹션 + 메타 필드로 구성됨.

| # | 섹션 | 중요도 | 비고 |
|---|------|--------|------|
| 1 | 자기소개 | 높음 | 첫인상, 핵심 역량 요약 |
| 2 | 포트폴리오 | **최고** | 프로필 채택률 60% 향상 (위시캣 공식) |
| 3 | 보유 기술 | 중간 | 기술명 + 숙련도 레벨 |
| 4 | 경력·학력·자격증 | 중간 | 기본 이력 정보 |
| - | 메타 필드 | 낮음 | 파트너 형태, 직종, 단가, 프로필 사진 등 |

---

## 2. SSoT 데이터 현황

| 항목 | SSoT 상태 | 비고 |
|------|-----------|------|
| 경력 (experiences) | ✅ 5개 이력 보유 | 2017~2026, 금융·공공 중심 |
| 프로젝트 (personalProjects) | ✅ 7개 프로젝트 | Observability, n8n, FortiNet API, Security Alert, Blacklist, HYCU FSDS, Resume Portfolio |
| 기술 (skills) | ✅ 9개 카테고리 | Security, Network, OS, Cloud, Monitoring, Automation, Frontend, DevOps, Database |
| 자격증 (certifications) | ✅ 5개 | CompTIA Linux+, LPIC-1, RHCSA 등 |
| 학력 (education) | ✅ 2개 | 한양사이버대 + 한국호텔관광전문학교 |
| current (현재 상태) | `null` | 넥스트레이드 계약 2026.02 종료 |

---

## 3. 갭 분석 매트릭스

| # | 위시캣 항목 | SSoT 매핑 | 갭 상태 | 우선순위 |
|---|-----------|-----------|---------|---------|
| 1 | 자기소개 | 없음 (SSoT에 소개문 없음) | **신규 작성 필요** | P0 |
| 2 | 포트폴리오 (3개 이상 권장) | personalProjects[0-4] | **5건 작성 가능** | P0 |
| 3 | 보유 기술 + 숙련도 | skills[] | ✅ 매핑 가능 | P1 |
| 4 | 경력 사항 | experiences[] | ✅ 직접 입력 | P1 |
| 5 | 학력 | education[] | ✅ 직접 입력 | P2 |
| 6 | 자격증 | certifications[] | ✅ 직접 입력 | P2 |
| 7 | 프로필 사진 | 없음 | **사용자 제공 필요** | P1 |
| 8 | 파트너 형태 | 없음 | **사용자 입력 필요** | P2 |
| 9 | 직종 | 없음 | **사용자 입력 필요** | P2 |
| 10 | 희망 단가 | 없음 | **사용자 입력 필요** | P2 |
| 11 | 포트폴리오 스크린샷 | 없음 | **사용자 제공 필요** | P1 |
| 12 | 엔터프라이즈 프로젝트 케이스 | experiences[] (Nextrade) | **공개 안전 범위 작성** | P0 |

---

## 4. 실행 계획

### P0 — 즉시 실행 (자동화 가능)

- [x] `profile-intro.md` — 자기소개 작성 (SSoT 기반)
- [x] `observability-portfolio.md` — Observability 플랫폼 포트폴리오
- [x] `security-alert-portfolio.md` — 보안 알림 시스템 포트폴리오
- [x] `fortinet-api-portfolio.md` — FortiNet API 클라이언트 포트폴리오
- [x] `n8n-portfolio.md` — n8n 자동화 포트폴리오
- [x] `nextrade-portfolio.md` — 넥스트레이드 엔터프라이즈 케이스

### P1 — 사용자 입력 필요

- [ ] 포트폴리오 스크린샷 첨부 (각 프로젝트별 대시보드/결과물 캡처)
- [ ] 프로필 사진 등록
- [ ] 보유 기술 숙련도 레벨 설정 (위시캣 UI에서 직접 입력)

### P2 — 프로필 메타 필드

- [ ] 파트너 형태 선택 (개인/팀/법인)
- [ ] 직종 선택
- [ ] 희망 단가 설정
- [ ] 선호 프로젝트 형태 설정
- [ ] 가능 시작일 설정

### P3 — 추가 개선

- [ ] SafeWork 프로젝트를 `resume_data.json`에 등재 후 포트폴리오 검증
- [ ] 기존 blacklist-portfolio.md 기술 스택을 SSoT에 반영 (Redis, Docker, CI/CD 등)

---

## 5. SSoT 정합성 정책

모든 포트폴리오 파일의 정량적 주장은 반드시 `resume_data.json`의 해당 필드로 추적 가능해야 함.

- **허용**: SSoT `metrics` 필드에 명시된 수치/기능 인용
- **허용**: SSoT `description` 필드의 내용 풀어쓰기
- **허용**: SSoT `technologies` 배열에 있는 기술 언급
- **금지**: SSoT에 없는 정량적 성과 (%, 시간 단축, 가용성 수치 등)
- **금지**: SSoT에 없는 구현 세부사항 (오탐 필터링, CLI 인터페이스 등)
- **금지**: SSoT에 없는 운영 상태 주장 ("실제 활용 중", "일상 업무" 등)

추적 불가 주장이 사실인 경우: 먼저 `resume_data.json`에 해당 데이터를 추가한 뒤, 포트폴리오에 반영.

---

## 6. 파일 목록

| 파일 | 상태 | SSoT 검증 |
|------|------|-----------|
| `profile-intro.md` | ✅ 완료 | ✅ 검증됨 |
| `observability-portfolio.md` | ✅ 완료 | ✅ 검증됨 |
| `security-alert-portfolio.md` | ✅ 완료 | ✅ 검증됨 |
| `fortinet-api-portfolio.md` | ✅ 완료 | ✅ 검증됨 |
| `n8n-portfolio.md` | ✅ 완료 | ✅ 검증됨 |
| `nextrade-portfolio.md` | ✅ 완료 | ✅ 검증됨 |
| `blacklist-portfolio.md` | ⚠️ 기존 파일 | ✅ 주요 성과 SSoT 정렬 완료 |
| `safework-portfolio.md` | ⚠️ 기존 파일 | ❌ SSoT 미등록 (면책 표시 추가) |
