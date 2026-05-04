# Cloudflare Greenhouse 지원 가이드 — Job 7551847 (Seoul SE)

**대상**: Cloudflare Specialist Solutions Engineer, Cloudflare One (Seoul)
**Greenhouse URL**: https://boards.greenhouse.io/cloudflare/jobs/7551847
**작성일**: 2026-05-04

---

## 1. 지원 전 준비물 체크리스트

| 항목                                    | 파일                                        | 위치                                                  |
| --------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| 1-page PDF 이력서                       | `Jaecheol_Lee_Resume_Cloudflare_One_SE.pdf` | `applications/cloudflare-one-se-2026/`                |
| 영문 cover letter (PDF 또는 plain text) | (필요 시 본 가이드 내 텍스트)               | 본 가이드 §5                                          |
| LinkedIn URL                            | https://linkedin.com/in/[your-handle]       | 미리 업데이트 (linkedin-profile-optimization.md 참고) |
| 포트폴리오 URL                          | https://resume.jclee.me/en/                 | 라이브 검증됨                                         |
| GitHub URL                              | https://github.com/jclee941                 | 활성                                                  |
| Email                                   | qws941@kakao.com                            | SSoT 일치                                             |

---

## 2. Greenhouse 폼 필드 — 필드별 답변

### 2.1 Personal Information

| 필드                | 입력값                                            |
| ------------------- | ------------------------------------------------- |
| **First Name**      | `Jaecheol`                                        |
| **Last Name**       | `Lee`                                             |
| **Email**           | `qws941@kakao.com`                                |
| **Phone**           | (한국 휴대폰 번호, 국제 형식: `+82 10-XXXX-XXXX`) |
| **Location (City)** | `Seoul` (또는 "Locate me" 버튼 클릭)              |

### 2.2 Resume / Cover Letter Upload

| 필드                    | 답변                                                                              |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Resume/CV**           | 첨부: `Jaecheol_Lee_Resume_Cloudflare_One_SE.pdf`                                 |
| **Cover Letter** (선택) | 첨부 또는 텍스트 필드. **둘 다 가능하면 둘 다 사용** (PDF 첨부 + plain text 동시) |

### 2.3 Sponsorship & Authorization (Knockout 질문)

> **"Do you now or will you in the future require immigration sponsorship to work at Cloudflare in Seoul, South Korea?"**

**답변**: **`No`**

이유: 한국 국적자로 한국 거주 중. Cloudflare 측 비자 스폰서십 불필요.

> **"Are you authorized to work in South Korea?"** (있을 경우)

**답변**: **`Yes`** (한국 시민권자)

### 2.4 U.S. Export Control Acknowledgment

표시되면 체크박스에 동의 (`I acknowledge`). Cloudflare가 미국 회사이므로 표준 acknowledgment.

### 2.5 LinkedIn / Portfolio / Other Links

| 필드                          | 입력값                                               |
| ----------------------------- | ---------------------------------------------------- |
| **LinkedIn URL**              | `https://linkedin.com/in/jclee0109` (실제 핸들 확인) |
| **Personal Website**          | `https://resume.jclee.me/en/`                        |
| **GitHub** (별도 필드 있으면) | `https://github.com/jclee941`                        |

### 2.6 Source Question

> "How did you hear about this job?"

**추천 답변**:

- 특정 채용사이트에서 봤으면 그대로 (예: `LinkedIn`, `Cloudflare careers page`)
- 추천인이 있으면 `Referral - [이름]`이 통계상 가장 효과적

### 2.7 Compensation Expectation (있을 경우)

> "What are your salary expectations?"

**한국 직무 = KRW 기준**.

| 시나리오           | 답변                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| 숫자 필드 (금액만) | `130000000` (KRW 1.3억 base — 8년차 + Cloudflare APAC SE 표준 대역의 중간값) |
| 텍스트 필드        | `KRW 120,000,000 ~ 150,000,000 base, open to discussing total compensation`  |
| 최후 안전 답변     | `Open to discussing compensation based on the total package and role scope`  |

**참고 근거 (시장 조사)**:

- Seoul SE roles at foreign tech (8년차 senior): KRW 100M–180M base
- Cloudflare는 글로벌 표준 + APAC 가산 → 130M~160M base 예상
- Total comp (RSU 포함): 200M~250M 가능

**❌ 피할 것**: USD 단위 입력 (한국 로컬 채용에 부적합), 너무 낮은 floor (협상 약화), 너무 높은 ceiling (auto-screen-out)

### 2.8 EEOC Questions (선택)

미국 federal contractor가 아닌 경우 voluntary. 표시되어도 모두 "Decline to answer" 가능. 익명 집계라 본인 평가에 영향 없음.

---

## 3. "Why Cloudflare?" 텍스트 필드 답변 (500-1500자)

Greenhouse에 별도 "Why Cloudflare?" 필드가 있으면 다음 답변 사용:

```
I'm applying because the role I'd play on Cloudflare One in Seoul matches a translation gap I've been on the customer side of for eight years. Korean financial enterprises do not ask whether Zero Trust works — they ask how SWG, CASB, DLP, and ZTNA coexist with 전자금융감독규정 and the 망분리 mandate. I have answered that question from inside the regulated environment for eight years (FSC pre-licensing audit passed at Nextrade, FSS regulatory audits at Quantec FSDC), and I want to answer it from Cloudflare's side for the next chapter.

Cloudflare is also the first company where my homelab work is the day-job credential. resume.jclee.me runs on Cloudflare Workers in production — D1, KV, Workflows, Wrangler GitHub Actions CI/CD, build-time HTML injection, Accept-Language routing, CSP strict-dynamic, 9 JSON-LD blocks across three locales validated by Playwright E2E. I'd be demoing customer-facing technology I already operate.

What I bring beyond the JD: SIEM correlation rule design (Splunk ES, dest_port-based exfiltration, NSX-T DFW correlation), VPN/remote-access RCA experience (FortiGate SSL-VPN ↔ FortiClient profile collisions, tcpdump root-cause), and bilingual technical communication for the customer enablement layer Korean financial deals require.

I do not have AWS production experience yet — SAA-C03 is in prep with a Q3 2026 target. I'd be transparent about that ramp from day one.
```

**길이**: ~1,250자 (Greenhouse 1500자 한도 안전)
**키워드 매칭**: Zero Trust, SWG, CASB, DLP, ZTNA, FSC, FSS, Cloudflare Workers, D1, KV, SIEM, Splunk ES, FortiGate, NSX-T

---

## 4. Cover Letter (PDF 첨부용 — Greenhouse가 별도 필드 제공 시)

### 권장 형식

- PDF (text-based, scanned image 금지)
- 1 page, 250-400 words
- Same 폰트/포맷으로 이력서와 일관성 유지

### 본문 (이미 이전 message에서 제공한 영문 cover letter 사용)

```
Dear Cloudflare Hiring Team,

I am applying for the Specialist Solutions Engineer, Cloudflare One position
in Seoul. My motivation is concrete: the portfolio I would walk a customer
through on day one already runs on Cloudflare Workers — resume.jclee.me is
a production Worker with D1, KV, build-time HTML injection, locale-aware
routing with Accept-Language redirects, CSP strict-dynamic with auto-computed
nonces, and 9 JSON-LD blocks across three locales validated by E2E tests. I
built and operate it as a Worker, not as a static site behind Workers.

My day job for the last eight years has been Korean financial security
infrastructure. At Gaonnuri and ITCEN CTS for the Nextrade exchange, I
designed FortiGate HA in active-passive with five-tier network segmentation,
passed the FSC pre-licensing review, standardized firewall policy
distribution with Ansible Role, and now operate Splunk ES + n8n +
FortiManager JSON-RPC API for automated security-event detection and
response. Earlier at Jointree, I deployed NSX-T microsegmentation; at
Quantec FSDC, I responded to FSS regulatory audits.

This trajectory — closed-network OA → automation → SIEM → financial security
— is exactly the conversation Korean financial customers face when they
evaluate Cloudflare One. They do not ask whether Zero Trust works; they ask
how SWG, CASB, DLP, RBI, and Tunnels coexist with Korea's 전자금융감독규정
and 망분리 mandate. I have answered that question from inside the regulated
environment for eight years, and I want to answer it from Cloudflare's side
for the next chapter.

What I bring to the SE role:
- Korean financial regulatory fluency (FSC pre-licensing, FSS audit,
  electronic financial regulation)
- Hands-on with the Cloudflare developer platform (Workers, D1, KV,
  Workflows, Wrangler GitHub Actions deploys)
- Adjacent-stack literacy (SAML/OAuth, IdP federation, SIEM rule design,
  network segmentation, automation)
- Bilingual technical communication (Korean native, English working
  proficiency)

Status: Open to work, available immediately. I would welcome a conversation
about how my regulated-environment background can shorten the Cloudflare
One ramp for Korean financial-services customers.

Portfolio: https://resume.jclee.me
GitHub: https://github.com/jclee941

Sincerely,
Jaecheol Lee
```

---

## 5. 지원 후 액션 플랜

### Day 0 (지원 직후)

- [ ] LinkedIn 프로필 65분 최적화 (`linkedin-profile-optimization.md` 참고)
- [ ] Cloudflare Korea 직원 2-3명 LinkedIn Connection request

### Day 1-3

- [ ] Greenhouse 자동 회신 메일 도착 확인
- [ ] LinkedIn에 본인 게시 1건 (Cloudflare Workers 운영 후기 영문)

### Day 4-7

- [ ] LinkedIn에 한국어 게시 1건 (한국 금융권 Zero Trust 관점)
- [ ] Cloudflare Korea 직원 누적 응답 확인

### Day 7-14 (응답 없을 경우)

- [ ] LinkedIn DM polite ping 1회: "지원 후 1주, 검토 진행 상황 확인 요청"
- [ ] Cloudflare Korea SE/Sales 1명 referral 시도

### Day 14+ (1차 통과 시)

- [ ] Recruiter screen 통화 일정 조율
- [ ] 면접 Q&A 준비 (`interview-qa-10.md` + 이전 message 5개 = 총 15개 답변 점검)
- [ ] **Day-of**: resume.jclee.me 라이브 데모 + /health 응답 미리 캡처

---

## 6. 주의사항

### 절대 금지

- ❌ **Sponsorship = Yes** 답변 (한국 시민권자라면 No)
- ❌ **AWS production 경험 부풀리기** (정직하게 "in prep" 표기)
- ❌ **연봉 USD 단위 입력** (한국 local 채용)
- ❌ **이력서 scanned image PDF** (text-extractable PDF만)
- ❌ **이력서에 표/그래픽** (Greenhouse parser 호환성 떨어짐)
- ❌ **LinkedIn 미공개** (Greenhouse 이력서와 LinkedIn 비교 검증 시 불리)

### 정직 신호 강화

- ✅ **AWS 학습 중 명시** (target Q3 2026)
- ✅ **운영 경력만 8년, SE 직무 첫 도전** 명시
- ✅ **포트폴리오 = 라이브 데모** 강조 (resume.jclee.me)
- ✅ **시작 가능 일자**: "Available immediately" (현재 ITCEN CTS 계약 종료 상태)

---

## 7. 최종 점검 (Submit 직전)

- [ ] PDF 첨부: `Jaecheol_Lee_Resume_Cloudflare_One_SE.pdf` (104KB, 1page)
- [ ] Cover letter 첨부 또는 텍스트 필드 작성
- [ ] Sponsorship = No
- [ ] Export Control 체크
- [ ] LinkedIn URL 입력
- [ ] Portfolio URL 입력 (https://resume.jclee.me/en/)
- [ ] GitHub URL 입력
- [ ] Source question 답변
- [ ] Compensation 답변 (KRW 130M base, total open)
- [ ] "Why Cloudflare?" 답변 입력
- [ ] EEOC 결정 (skip 또는 voluntary 응답)

**제출 후**: Greenhouse 자동 회신 메일을 받으면 지원 완료.
