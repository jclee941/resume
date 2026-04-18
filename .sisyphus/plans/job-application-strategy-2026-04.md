# 직접 지원 채용 전략 가이드 (2026년 4월)

> 자동지원 불가 — 회사 자체 채용페이지 수동 지원용

## 1. 프로필 요약

| 항목         | 내용                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| 이름         | 이재철                                                                       |
| 경력         | 보안 인프라 9년                                                              |
| 포지셔닝     | DevSecOps / SRE                                                              |
| 핵심 기술    | FortiGate HA, Splunk ES, Ansible, Python, Terraform, AWS, Prometheus/Grafana |
| 도메인       | 금융(증권 매매체결시스템), 공공(항공우주), 교육                              |
| 컴플라이언스 | ISMS-P, 금융위 본인가 심사                                                   |
| 포트폴리오   | https://resume.jclee.me                                                      |
| GitHub       | https://github.com/jclee941                                                  |

---

## 2. 지원 대상 공고 (매칭도 순)

| 순위 | 기업           | 포지션                                   | 매칭 | 핵심 매칭 요소                          | 지원 URL                          |
| ---- | -------------- | ---------------------------------------- | ---- | --------------------------------------- | --------------------------------- |
| 1    | **카카오뱅크** | 정보보호 점검/모니터링 담당자            | 85%  | Splunk/SIEM, ISMS-P, 자동화, 금융       | kakaobank.recruiter.co.kr         |
| 2    | **LINE Pay**   | SRE (Korea Office)                       | 80%  | SRE 5년+, K8s, 모니터링, 금융/핀테크    | careers.linecorp.com/ko/jobs/2698 |
| 3    | **크래프톤**   | Senior Cloud Security Engineer           | 80%  | AWS/Azure, Terraform, DevSecOps, CSPM   | career.krafton.com                |
| 4    | **배달의민족** | 클라우드 보안 엔지니어                   | 75%  | 클라우드 보안 운영, FW/SG, 5년+         | career.woowahan.com               |
| 5    | **당근**       | Security Engineer (Detection & Response) | 70%  | 탐지/대응, 보안 인프라                  | about.daangn.com/jobs/            |
| 6    | **당근**       | Security Engineer (AI Security)          | 70%  | 보안 엔지니어링, 인프라 보안            | about.daangn.com/jobs/            |
| 7    | **LINE**       | Backend SW Engineer (Observability)      | 65%  | Prometheus/Grafana/Splunk/OTel          | careers.linecorp.com/ko/jobs/2267 |
| 8    | **넥슨**       | 플랫폼 시스템 엔지니어                   | 65%  | AWS EKS, Ansible, Terraform, Python     | career.nexon.com                  |
| 9    | **네이버**     | Security/Infra Engineering               | 60%  | 보안/인프라 카테고리 검색 필요          | recruit.navercorp.com             |
| 10   | **LINE**       | Backend Engineer (Developer Platform)    | 55%  | 자동화/Observability — Java/Spring 필요 | careers.linecorp.com/ko/jobs/2837 |
| 11   | **쏘카**       | 정보보호 담당자                          | 50%  | ISMS-P 매칭 — 10년+ 요구 (stretch)      | careers.socar.kr                  |
| 12   | **안랩**       | 네트워크 보안 엔지니어                   | 45%  | 방화벽/IPS — 벤더/프리세일즈 성격       | recruit.ahnlab.com                |

---

## 3. 공고별 준비물 체크리스트

| 기업             | 이력서       | 자기소개서 | 경력기술서      | 포트폴리오 | 특이사항                               |
| ---------------- | ------------ | ---------- | --------------- | ---------- | -------------------------------------- |
| 카카오뱅크       | 자사 양식    | 자사 양식  | -               | 선택       | 온라인 폼 입력                         |
| LINE Pay (#2698) | **영문 PDF** | -          | **영문 통합본** | -          | LINE Pay Thailand 포탈 경유, 영문 필수 |
| 크래프톤         | 자유양식     | 필수       | 필수            | 선택       | Workday 포탈                           |
| 배달의민족       | -            | -          | **PDF 필수**    | -          | 경력기술서 중심                        |
| 당근             | 자유양식     | -          | -               | 선택       | Greenhouse 포탈                        |
| LINE (#2267)     | 자유양식     | -          | 필수            | -          | LINE Careers 포탈                      |
| 넥슨             | 자사 양식    | 필수       | -               | -          | 자사 포탈                              |
| 네이버           | 자사 양식    | 필수       | -               | -          | 온라인 폼                              |
| LINE (#2837)     | 자유양식     | -          | 필수            | -          | LINE Careers 포탈                      |
| 쏘카             | 자유양식     | -          | -               | 선택       | 자사 포탈                              |
| 안랩             | 자사 양식    | 필수       | -               | -          | ahnlab.recruiter.co.kr                 |

### LINE Pay 영문 이력서 준비 가이드

LINE Pay SRE는 **영문 이력서 + 경력기술서 통합 PDF** 필수. 준비 순서:

1. `resume_data.json` 기반 영문 이력서 작성 (이름, 경력, 프로젝트, 기술스택)
2. 경력기술서: 각 프로젝트의 `achievements`를 영문으로 번역
3. 하나의 PDF로 합본 (5-7페이지)
4. LINE Pay Thailand 채용 포탈에서 제출

---

## 4. 공고별 자기소개서 핵심 어필 포인트

### 1순위: 카카오뱅크 (정보보호 점검/모니터링)

- **Splunk ES 32개 탐지 룰 설계/운영** → SIEM 시나리오 개발 역량
- **n8n + FortiManager API 보안 자동화** → 보안 모니터링 자동화 경험
- **ISMS-P 인증 대응 (넥스트레이드)** → 금융 컴플라이언스 직접 경험
- **금융위 본인가 심사 통과** → 금융권 보안 아키텍처 설계 검증
- **보안 이벤트 30초 내 알림** → 실시간 대응 체계 구축 실적

### 2순위: LINE Pay SRE

- **증권 매매체결시스템 보안운영 2년** → Mission-Critical 금융 인프라 경험
- **FortiGate HA 99.99% 설계** → 고가용성 시스템 아키텍처 역량
- **Prometheus/Grafana 관측성 플랫폼** → SRE 모니터링 핵심 역량
- **Ansible 500대+ 서버 자동화** → 대규모 인프라 자동화 경험
- **Python/Ansible 기반 운영 자동화** → 스크립팅 및 도구 개발 역량

### 3순위: 크래프톤 (Senior Cloud Security Engineer)

- **Terraform IaC (AWS VPC/SG 코드 관리)** → IaC 보안 점검 역량
- **AWS CloudTrail/GuardDuty 통합 분석** → 클라우드 보안 로그 분석
- **FortiGate HA + Ansible 정책 자동화** → 보안 아키텍처 설계 + 자동화
- **ISMS-P 인증 대응** → 컴플라이언스 기술 대응 경험
- **DevSecOps 파이프라인 구축** → CI/CD 보안 자동화 연계

### 4순위: 배달의민족 (클라우드 보안)

- **AWS IAM/VPC/WAF 보안 운영** → 클라우드 보안 서비스 실무
- **Terraform IaC 전환** → 인프라 보안 코드화 경험
- **Splunk ES SIEM 운영** → 보안 모니터링/로그 분석
- **ISMS-P 대응** → 금융/서비스 컴플라이언스

### 5-6순위: 당근 (Security Engineer)

- **SIEM 탐지 룰 설계** → Detection Engineering 역량
- **FortiManager API 방화벽 자동화** → 보안 인프라 자동화
- **보안 이벤트 실시간 대응 체계** → Incident Response 경험
- **n8n 워크플로우 보안 자동화** → 보안 운영 효율화

### 7순위: LINE Observability

- **Prometheus/Grafana 모니터링 구축** → Observability 핵심 기술
- **Splunk ES 32개 탐지 룰** → 대규모 로그 분석 역량
- **ELK 기반 로그 파이프라인** → Elasticsearch 운영 경험
- 주의: Java/Spring 개발 역량 강조 필요 (현 스킬셋에서 약점)

### 8순위: 넥슨 (플랫폼 시스템 엔지니어)

- **Ansible/Terraform IaC 자동화** → 인프라 프로비저닝 역량
- **AWS EKS/VPC 구축 운영** → 클라우드 인프라 경험
- **Python 스크립팅 자동화** → 도구 개발 역량

---

## 5. 예상 소요 시간

| 순위 | 기업/포지션        | 준비  | 제출  | 합계     | 비고                    |
| ---- | ------------------ | ----- | ----- | -------- | ----------------------- |
| 1    | 카카오뱅크         | 2h    | 45min | **2.5h** | 온라인 폼 + 맞춤 자소서 |
| 2    | LINE Pay SRE       | 3h    | 30min | **3.5h** | 영문 이력서 최초 작성   |
| 3    | 크래프톤           | 2h    | 30min | **2.5h** | 자소서 + 경력기술서     |
| 4    | 배달의민족         | 1.5h  | 30min | **2h**   | PDF 경력기술서          |
| 5    | 당근 (D&R)         | 1h    | 30min | **1.5h** | Greenhouse, 자유양식    |
| 6    | 당근 (AI Security) | 30min | 30min | **1h**   | 5번과 공유              |
| 7    | LINE Observability | 1h    | 30min | **1.5h** | LINE 포탈 재사용        |
| 8    | 넥슨               | 1.5h  | 30min | **2h**   | 자사 포탈               |
| 9    | 네이버             | 1.5h  | 45min | **2h**   | 온라인 폼               |
| 10   | LINE #2837         | 30min | 30min | **1h**   | LINE 포탈 재사용        |
| 11   | 쏘카               | 1h    | 30min | **1.5h** | 자유양식                |
| 12   | 안랩               | 1h    | 30min | **1.5h** | 자사 포탈               |
|      | **합계**           |       |       | **~22h** |                         |

---

## 6. 일별 지원 스케줄

### Day 0: 사전 준비 (필수)

- [ ] 한국어 PDF 이력서 최종본 준비 (포트폴리오 URL 포함)
- [ ] 한국어 경력기술서 PDF 준비 (프로젝트별 techStack + achievements)
- [ ] LINE Pay용 영문 이력서+경력기술서 통합 PDF 작성 (3h)
- [ ] 기본 자기소개서 템플릿 작성 (공통 부분)

### Day 1: 최우선 — 금융 보안 (2건, ~5h)

| 시간 | 지원 대상                                   | 작업                                                                                                          |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 오전 | **카카오뱅크** 정보보호 점검/모니터링       | kakaobank.recruiter.co.kr 접속 → 회원가입 → 자사 양식 작성 → Splunk/ISMS-P 강조 자소서 → 제출                 |
| 오후 | **크래프톤** Senior Cloud Security Engineer | career.krafton.com Workday 접속 → 자유양식 이력서 + 자소서 + 경력기술서 업로드 → AWS/Terraform/DevSecOps 강조 |

### Day 2: LINE 3개 포지션 일괄 (3건, ~6h)

| 시간  | 지원 대상                         | 작업                                                                   |
| ----- | --------------------------------- | ---------------------------------------------------------------------- |
| 오전  | **LINE Pay SRE** #2698            | LINE Pay Thailand 포탈 → 영문 PDF 이력서 업로드 → 인적사항 입력 → 제출 |
| 오후1 | **LINE Observability** #2267      | LINE Careers 포탈 → 한국어 이력서+경력기술서 → 제출                    |
| 오후2 | **LINE Developer Platform** #2837 | 같은 포탈 재사용 → 경력기술서 재활용 → 제출                            |

### Day 3: 보안 특화 (2건, ~3.5h)

| 시간 | 지원 대상                             | 작업                                                                |
| ---- | ------------------------------------- | ------------------------------------------------------------------- |
| 오전 | **배달의민족** 클라우드 보안 엔지니어 | career.woowahan.com → PDF 경력기술서 제출 → 클라우드 보안 운영 강조 |
| 오후 | **당근** Security Engineer (D&R)      | about.daangn.com Greenhouse → 자유양식 이력서 → SIEM/탐지/대응 강조 |

### Day 4: 추가 지원 (3건, ~4.5h)

| 시간  | 지원 대상                                | 작업                                                           |
| ----- | ---------------------------------------- | -------------------------------------------------------------- |
| 오전  | **당근** Security Engineer (AI Security) | Greenhouse 재사용 → Day 3 이력서 활용                          |
| 오후1 | **넥슨** 플랫폼 시스템 엔지니어          | career.nexon.com → 자사 양식 → Ansible/Terraform/AWS 강조      |
| 오후2 | **네이버** Security/Infra                | recruit.navercorp.com → 보안/인프라 공고 검색 → 해당 공고 지원 |

### Day 5: 하위 우선순위 (2건, ~3h)

| 시간 | 지원 대상                       | 작업                                                     |
| ---- | ------------------------------- | -------------------------------------------------------- |
| 오전 | **쏘카** 정보보호 담당자        | careers.socar.kr → ISMS-P/보안 운영 강조 (10년+ stretch) |
| 오후 | **안랩** 네트워크 보안 엔지니어 | recruit.ahnlab.com → 방화벽/IPS 운영 경험 강조           |

---

## 7. 수동 지원 단계별 가이드

### 카카오뱅크

1. https://kakaobank.recruiter.co.kr 접속
2. 회원가입 (이메일 인증)
3. 채용공고 → "정보보호" 검색 → 정규직 공고 선택
4. 온라인 양식 작성: 인적사항, 경력사항, 자기소개서
5. 포트폴리오 첨부: resume.jclee.me 링크 또는 PDF
6. 제출 확인

### LINE (3개 포지션 공통)

1. https://careers.linecorp.com 접속
2. 하단 "지원하기" 클릭 → LINE 계정 로그인
3. 인적사항 입력
4. PDF 이력서+경력기술서 첨부 (LINE Pay는 영문)
5. 제출 확인
6. **LINE Pay SRE**: "지원하기" → LINE Pay Thailand 포탈로 리다이렉트됨

### 크래프톤

1. https://career.krafton.com 접속
2. Workday 계정 생성
3. "Cloud Security" 검색 → 해당 공고 선택
4. 이력서(자유양식) + 자기소개서 + 경력기술서 PDF 업로드
5. 포트폴리오 첨부 (선택)
6. 제출 확인

### 배달의민족

1. https://career.woowahan.com 접속
2. "보안" 검색 → 클라우드 보안 엔지니어 선택
3. PDF 경력기술서 필수 첨부
4. 제출 확인

### 당근

1. https://about.daangn.com/jobs/ 접속
2. "Security" 검색
3. Greenhouse 폼 → 이름/이메일/이력서 업로드
4. 자유양식 이력서 PDF 첨부
5. 제출 확인

### 넥슨

1. https://career.nexon.com 접속
2. 회원가입
3. "인프라" 또는 "보안" 검색
4. 자사 양식 이력서 + 자기소개서 작성
5. 제출 확인

### 네이버

1. https://recruit.navercorp.com 접속
2. "보안" 또는 "SRE" 검색
3. 해당 공고 확인 → 지원
4. 온라인 양식 작성
5. 제출 확인

---

## 부록: 제외 사유

| 플랫폼/기업        | 사유                                                   |
| ------------------ | ------------------------------------------------------ |
| Wanted (48건)      | 자동지원 완료                                          |
| JobKorea (77건)    | 자동지원 완료                                          |
| 리멤버             | 수동 지원 완료                                         |
| Greeting HR        | 수동 지원 완료                                         |
| 토스               | 사용자 요청으로 제외                                   |
| 카카오             | 활성 공고 0건 (2026.04 기준)                           |
| 야놀자             | 보안/SRE/DevOps 관련 공고 없음                         |
| 카카오뱅크 #224253 | 채용연계형 인턴 (마감, 신입 대상) → 정규직 공고로 교체 |
