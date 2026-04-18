# 프로필/이력서/자소서 고도화 마스터 플랜

> 목표: 자동지원 합격률 향상을 위한 전방위 프로필 고도화

## 현재 상태 요약

| 항목                    | 상태                                   | 평가             |
| ----------------------- | -------------------------------------- | ---------------- |
| resume_data.json (SSoT) | ✅ techStack/achievements 완비         | 기반 OK          |
| 포트폴리오 사이트       | ⚠️ 최신 데이터 미반영                  | sync 필요        |
| PDF 이력서              | ⚠️ 2025-03-02 생성, 구버전             | 재생성 필요      |
| 영문 이력서             | ⚠️ resume_data_en.json 존재하나 구버전 | 업데이트 필요    |
| 자소서 생성기           | ❌ fallback 템플릿 198자               | 대폭 개선 필요   |
| 자격증                  | ❌ CKA/AWS/CISSP 없음, CCNP/RHCSA 만료 | 취득 전략 필요   |
| OSS 기여                | ❌ 0건                                 | 기록 필요        |
| expertise 키워드        | ❌ 3개만                               | 확장 필요        |
| profileStatement        | ❌ 229자, generic                      | 성과 중심 재작성 |

---

## 실행 플랜 (Wave 기반)

### Wave 1: 즉시 실행 (의존성 없음, 병렬 가능)

#### T1. resume_data.json SSoT 보강

- **소요**: 1-2h
- **효과**: ★★★★★ (모든 하위 산출물에 전파)
- **작업**:
  - `expertise` 확장: `['Observability', '보안 인프라', '자동화']` → `['DevSecOps', 'SRE', 'SIEM/SOAR', 'Security Infrastructure', 'IaC/Automation', 'Observability', 'Cloud Security', 'Compliance(ISMS-P)']`
  - `profileStatement` 재작성 (500자+, 정량 성과 포함):
    - 금융위 본인가 심사 통과
    - FortiGate HA 99.99% 가용성
    - Splunk ES 32개 탐지 룰
    - 500대+ 서버 Ansible 자동화
    - 보안 이벤트 30초 알림 체계
  - `ossContributions` 채우기: 이 monorepo 자체가 OSS 프로젝트 (GitHub public). resume.jclee.me 포트폴리오, job-server 자동화 파이프라인 등 기록
  - `summary.coreCompetencies` 추가: DevSecOps 파이프라인, 금융 보안 아키텍처, IaC 기반 인프라 관리
- **검증**: `npm run sync:data` 통과 (schema validation)
- **스코어링 임팩트**: `security`(1.5x), `infrastructure`(1.3x), `finance`(1.3x) 키워드 강화

#### T2. 자소서 fallback 템플릿 대폭 개선

- **소요**: 2-3h
- **효과**: ★★★★★ (모든 자동지원에 즉시 반영)
- **작업**:
  - 현재: 198자 generic 템플릿 → 목표: 500-800자 직무 맞춤형
  - 직무별 템플릿 분기 (cover-letter-role-templates.js 신규):
    - `DevSecOps` 템플릿: SIEM 탐지 룰, 보안 자동화, ISMS-P 강조
    - `SRE` 템플릿: HA 설계, 모니터링, 장애 대응, 자동화 강조
    - `Cloud Security` 템플릿: AWS/Terraform, CloudTrail/GuardDuty, IaC 보안 강조
    - `보안 엔지니어` 템플릿: 방화벽 HA, 침해 대응, 보안 솔루션 운영 강조
  - 정량 성과 자동 삽입: resume_data.json의 achievements에서 매칭되는 항목 3-5개 선택
  - 포트폴리오 링크 자동 포함
- **검증**: 4개 직무 각각 테스트 생성 → 500자+ 확인

#### T10. 자격증 취득 로드맵

- **소요**: 30min (문서 작성)
- **효과**: ★★★ (중장기 경쟁력)
- **작업**: 단기(1-3개월)/중기(3-6개월) 취득 전략
  - **즉시 (1개월)**: AWS Solutions Architect Associate — 시장성 최고, 온라인 시험
  - **단기 (2-3개월)**: CKA (Certified Kubernetes Administrator) — DevOps/SRE 필수
  - **중기 (3-6개월)**: AWS Security Specialty — 클라우드 보안 차별화
  - **선택**: CISSP (경력 5년+ 필요, 보안 관리직 타겟 시)

---

### Wave 2: T1, T2 완료 후 (병렬 가능)

#### T3. 회사별/직무별 자소서 커스터마이징 전략

- **소요**: 1-2h
- **효과**: ★★★★
- **의존**: T2
- **작업**:
  - 자소서 생성 시 JD 키워드 자동 매칭 로직 개선
  - 회사 규모별 톤 조절 (스타트업 vs 대기업 vs 금융)
  - 필수 자격요건 대비 보유 스킬 매핑 테이블 자동 생성
  - "왜 이 회사인가" 섹션 자동 생성 (회사 도메인 매칭)

#### T4. platformVariants 최적화

- **소요**: 1h
- **효과**: ★★★★★ (Wanted 프로필에 직접 반영 — `syncAbout()` 경유)
- **의존**: T1
- **작업**:
  - Wanted headline: 스코어링 고가중치 키워드 포함 (`보안`, `DevSecOps`, `SRE`, `금융`, `AWS`)
  - Wanted about: 정량 성과 bullet point 형식, ATS 키워드 밀도 향상
  - JobKorea headline/about: 동일 최적화
  - **주의**: `wanted-sync-operations.js`가 `platformVariants.wanted.about`을 Wanted API로 직접 push하므로 변경 즉시 라이브 반영

#### T5. ossContributions 채우기

- **소요**: 30min
- **효과**: ★★★
- **의존**: T1
- **작업**:
  - GitHub public repos 목록화 (resume monorepo, 기타)
  - 각 프로젝트의 기술 스택, 스타 수, 기여 내용 기록
  - resume_data.json `ossContributions` 배열 채우기

#### T8. resume_data_en.json 업데이트

- **소요**: 1-2h
- **효과**: ★★★ (글로벌 기업 지원용)
- **의존**: T1
- **작업**:
  - T1에서 보강한 expertise, profileStatement, ossContributions를 EN 버전에 동기화
  - achievements 영문 번역 추가
  - resume_data_ja.json도 핵심 필드 동기화

---

### Wave 3: Wave 2 완료 후

#### T6. 전체 데이터 동기화 + 빌드 + 검증

- **소요**: 30min
- **효과**: ★★★★
- **의존**: T1, T4, T5, T8
- **작업**:
  ```bash
  npm run sync:data          # schema validation + experience calc + web data gen
  npm run build              # portfolio worker rebuild
  npm run typecheck          # TypeScript strict mode
  npm run test:jest           # unit tests
  npm run lint               # ESLint
  ```
- **검증**: 모든 명령어 exit 0

#### T7. PDF 이력서 재생성

- **소요**: 15min
- **효과**: ★★★★
- **의존**: T6
- **작업**:
  ```bash
  go run ./tools/scripts/build/pdf-generator.go master
  ```
- **산출물**: `resume_final.pdf` 최신 버전 (techStack + achievements + portfolio URL 반영)
- **검증**: PDF 열어서 내용 확인, 파일 크기 정상

---

### Wave 4: Wave 3 완료 후

#### T9. Claude API 연동 가이드

- **소요**: 30min (문서) + 5min (구현)
- **효과**: ★★★★★ (AI 맞춤형 자소서 → 합격률 극대화)
- **의존**: T2
- **작업**:
  - `.env`에 `ANTHROPIC_API_KEY` 설정 방법 문서화
  - cover-letter-generator.js가 API 키 있으면 자동으로 AI 모드 전환 (이미 구현됨)
  - 비용 추정: 자소서 1건당 ~$0.01 (Claude Haiku), 하루 100건 = ~$1

#### T11. 회사별 커스터마이징 전략 문서

- **소요**: 1h
- **효과**: ★★★
- **의존**: T3
- **작업**:
  - 금융권 (토스/카카오뱅크/케이뱅크): 금융위 심사, ISMS-P, 컴플라이언스 강조
  - 게임사 (크래프톤/넥슨): 클라우드 보안, DevSecOps, 대규모 인프라 강조
  - 커머스/플랫폼 (당근/배민/쿠팡): SRE, 가용성, 자동화, 모니터링 강조
  - 보안 전문 (안랩/로그프레소): SIEM/SOAR, 보안 관제, 탐지 룰 강조

---

## 커밋 전략

```
1. feat(data): enrich resume SSoT — expertise, profileStatement, ossContributions, platformVariants
   → T1 + T4 + T5 + T8

2. feat(cover-letter): role-specific templates with quantified achievements
   → T2 + T3

3. chore(portfolio): sync data and rebuild worker
   → T6

4. chore(pdf): regenerate resume PDF with enriched data
   → T7

5. docs: certification roadmap, Claude API guide, customization strategy
   → T9 + T10 + T11
```

---

## 우선순위 매트릭스

| 작업                | 효과  | 소요  | 우선순위 | 즉시 실행 가능 |
| ------------------- | ----- | ----- | -------- | -------------- |
| T1 SSoT 보강        | ★★★★★ | 1-2h  | **P0**   | ✅             |
| T2 자소서 템플릿    | ★★★★★ | 2-3h  | **P0**   | ✅             |
| T4 platformVariants | ★★★★★ | 1h    | **P1**   | T1 후          |
| T7 PDF 재생성       | ★★★★  | 15min | **P1**   | T6 후          |
| T9 Claude API       | ★★★★★ | 35min | **P1**   | T2 후          |
| T6 sync + build     | ★★★★  | 30min | **P1**   | T1+T4 후       |
| T8 EN 업데이트      | ★★★   | 1-2h  | **P2**   | T1 후          |
| T5 OSS 기여         | ★★★   | 30min | **P2**   | T1 후          |
| T3 직무별 자소서    | ★★★★  | 1-2h  | **P2**   | T2 후          |
| T10 자격증 로드맵   | ★★★   | 30min | **P2**   | ✅             |
| T11 회사별 전략     | ★★★   | 1h    | **P3**   | T3 후          |

**총 예상 소요: ~10-14h (2-3일)**

---

## 즉시 실행 가능한 Quick Wins

T1과 T2를 먼저 실행하면 다음 n8n 파이프라인 실행(9시/21시)부터 즉시 효과:

- 자소서 198자 → 500-800자 (2.5-4x 증가)
- expertise 3개 → 8개 (스코어링 매칭 향상)
- profileStatement 229자 → 500자+ (정량 성과 포함)
- 모든 Wanted/JobKorea 신규 지원에 즉시 반영
