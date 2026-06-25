# 강남언니 보안 엔지니어 면접 준비 자료

## 1. 회사 정보

- 힐링페이퍼(강남언니), 미용의료 플랫폼
- 700만+ 글로벌 유저 (한국/일본/태국)
- 2023 흑자 전환, 시리즈 C ($30M)
- Tech: Kotlin, Spring Boot, MongoDB, AWS, Kubernetes
- 보안 스쿼드 = "Security Partner" 컨셉

## 2. 채용 프로세스

서류 → 코드 리뷰 테스트 → 직무 인터뷰(온라인) → 협업 인터뷰(오프라인) → 바레이저 인터뷰(오프라인) → 평판조회 → 최종합격

코드 리뷰 테스트:

- 개인 리포에서 3일간 코드 리뷰
- 프로젝트 800줄, PR 추가 240줄 (테스트 115줄)
- 1시간 내 완성 가능
- ChatGPT 사용 금지

## 3. JD-이력서 매칭 분석

### 강점

1. 보안 이벤트/위협 탐지 로직 설계 및 대응 프로세스 운영 — Splunk ES 32개 탐지 룰
2. AI와 자동화 — 알림 워크플로 + FortiManager API, Ansible, Python
3. AWS 클라우드 보안 — Terraform IaC, CloudTrail+GuardDuty
4. DevSecOps 확장 기반 — IaC/자동화/관측성
5. 보안 아키텍처 설계 — FortiGate HA → 금융위 본인가

### 약점/갭 + 보완 전략

1. AppSec (Burp Suite/ZAP/모의해킹) 약함 → "확장 중인 영역"으로 포지셔닝
2. SAST/DAST/SCA CI/CD 연동 경험 부족 → 프로세스 자동화 역량으로 전환
3. OAuth/OIDC 실무 약함 → 개념 정리 + 접근통제 관점 연결
4. Kotlin/Spring Boot 제품보안 경험 없음 → 보안 원칙은 스택 무관

## 4. 예상 질문 + 모범 답변 (20개)

### A. 직무 기술 질문 (9개)

Q1. OWASP Top 10 중 실제 서비스에서 가장 우선순위 높게 보는 항목은?
"환경마다 다르지만, 서비스 운영 관점에서는 저는 우선 인증/인가 깨짐, 취약한 접근통제, 그리고 보안 설정 오류를 먼저 봅니다. 실제로 대규모
사고는 화려한 취약점보다 권한 검증 누락이나 잘못 열린 내부 기능에서 많이 나오거든요. 강남언니처럼 웹·모바일·API가 같이 있는 서비스라면,
프론트보다는 결국 API 레벨에서 권한 검증이 제대로 되는지부터 확인할 것 같습니다."

Q2. Burp Suite나 ZAP으로 웹 취약점 진단할 때 어떤 흐름으로 접근하나요?
"저는 먼저 기능을 막 돌려보기보다 인증 흐름, 권한 경계, 입력 지점, 외부 연동 지점을 먼저 정리합니다. 그다음 프록시로 요청/응답을 보면서
파라미터 변조, 권한 우회, 서버측 검증 누락 여부를 확인하고요. 취약점이 보여도 거기서 끝내지 않고, 실제 영향 범위가 어디까지인지랑 재현
가능한 최소 시나리오까지 정리해서 개발팀이 바로 수정할 수 있게 전달하는 편입니다."

Q3. DevSecOps 파이프라인을 설계한다면 SAST/DAST/SCA를 어떻게 넣겠어요?
"무조건 많이 붙이기보다 개발 흐름을 안 깨는 게 중요하다고 봅니다. 제 기준으로는 PR 단계에서는 SAST/SCA 위주로 빠르게, 배포 전이나
주기 배치에서는 DAST와 좀 더 무거운 스캔을 돌리는 식으로 나눕니다. 그리고 가장 중요한 건 결과를 쌓아두는 게 아니라, severity
기준·예외 처리 기준·수정 SLA까지 같이 운영해야 실제로 돌아갑니다."

Q4. Threat Modeling은 어떻게 하시나요?
"저는 복잡하게 시작하지 않고 보통 자산, 진입점, 신뢰 경계, 권한 흐름, 외부 연동부터 그립니다. 그다음 STRIDE 같은 프레임을 참고해서
스푸핑, 권한 상승, 정보 노출 같은 위협을 붙여보고요. 중요한 건 완벽한 문서를 만드는 게 아니라, 설계 초기에 '여기 인증이 빠질 수
있겠다', '여기 내부 API가 외부 노출되면 위험하겠다' 같은 위험 지점을 빠르게 드러내는 거라고 생각합니다."

Q5. OAuth 2.0과 OIDC 차이를 설명해 주세요.
"OAuth 2.0은 기본적으로 권한 위임 프레임워크고, OIDC는 그 위에 인증 레이어가 추가된 거라고 이해하고 있습니다. 그래서
OAuth만으로는 '이 사용자가 누구인지'를 표준적으로 보장하기 어렵고, OIDC에서는 ID Token 같은 개념을 통해 사용자 인증 정보를
다루죠. 실서비스에서는 둘을 섞어 쓰는 경우가 많아서, 토큰 종류별 역할이랑 검증 위치를 명확히 보는 게 중요하다고 생각합니다."

Q6. 인증/인가 구조를 개선할 때 가장 먼저 보는 건 뭔가요?
"저는 UI보다 백엔드 권한 검증 위치를 먼저 봅니다. 프론트에서 버튼을 숨겼다고 권한 통제가 된 건 아니니까요. 사용자 역할, 리소스 소유권,
관리자 기능, 내부 운영 도구 접근 같은 걸 구분해서, 요청이 들어왔을 때 서버에서 일관되게 검증되는지 확인합니다. 그리고 로그에도 누가 어떤
권한으로 어떤 작업을 했는지 남아야 사후 추적이 가능합니다."

Q7. AWS에서 보안 아키텍처를 설계할 때 기본 원칙은?
"기본은 최소 권한, 네트워크 분리, 추적 가능성 확보입니다. IAM은 역할 기반으로 최소 권한을 유지하고, VPC/서브넷/보안그룹은 서비스
경계에 맞게 나누고요. CloudTrail, GuardDuty, 애플리케이션 로그를 연결해서 나중에 무슨 일이 있었는지 복원 가능한 상태를
만드는 걸 중요하게 봅니다."

Q8. SIEM 탐지 룰을 만들 때 가장 중요하게 보는 건?
"탐지 정확도도 중요하지만, 저는 운영 가능성을 더 중요하게 봅니다. 룰이 너무 예민하면 오탐이 많아서 결국 아무도 안 보게 되거든요. 그래서
실제 자산 중요도, 정상 행위 패턴, 대응 가능한 수준을 같이 보고, 룰을 만든 뒤에도 튜닝하면서 '정말 대응해야 하는 알림'으로 만드는 데
시간을 많이 씁니다."

Q9. 보안 자동화에서 가장 효과 좋았던 방식은?
"제가 효과를 크게 본 건 조회/점검/표준화 영역 자동화였습니다. 예를 들어 방화벽 정책 조회나 장비 설정 표준화처럼 반복 작업이 많은 부분은
자동화 효과가 바로 나왔고, 사람 실수도 줄었습니다."

### B. 경험/행동 질문 (7개)

Q10. 보안 사고나 이상 징후 대응 경험을 말씀해 주세요.
"직접 대형 침해사고를 총괄한 경험보다, 이상 징후를 빠르게 식별하고 대응 흐름을 정리한 경험이 더 많습니다. Splunk ES 룰 운영할 때도
중요한 건 알림을 띄우는 게 아니라, 어떤 로그를 근거로 어떤 우선순위로 볼지 기준을 만드는 거였어요."

Q11. 개발팀과 보안팀 관점이 충돌했을 때 어떻게 풀었나요?
"'안 된다'부터 말하면 거의 안 풀리더라고요. 그래서 저는 먼저 왜 이게 위험한지 설명하되, 동시에 대안 1개는 꼭 같이 가져가는 편입니다."

Q12. 보안과 속도 사이에서 트레이드오프를 어떻게 판단하나요?
"저는 보안을 다 넣는 쪽보다 리스크가 큰 구간부터 우선순위를 매기는 쪽입니다. 결제, 개인정보, 관리자 기능, 인증 흐름은 강하게 가져가고,
상대적으로 영향이 작은 영역은 점진적으로 보완합니다."

Q13. 가장 어려웠던 보안 과제는?
"넥스트레이드에서 금융위 본인가 심사 대응이 가장 압박이 컸습니다. 기술적으로도 중요했지만, 단순히 장비가 동작하는 수준이 아니라 '왜 이
구조가 안전한지'를 설명 가능한 상태여야 했거든요."

Q14. 자동화로 가장 크게 효율화한 사례는?
"알림 워크플로와 FortiManager API를 이용해서 방화벽 정책 조회를 자동화했던 경험이 기억에 남습니다."

Q15. 실수했거나 아쉬웠던 경험도 있나요?
"초기에는 탐지 룰을 만들 때 '많이 잡는 것'에 조금 치우쳤던 적이 있습니다. 실제 운영에서는 오탐이 많아지면 대응 피로도가 커지더라고요."

Q16. 새로운 도메인에 들어갈 때 적응은 어떻게?
"저는 먼저 기술 스택보다 비즈니스에서 진짜 위험한 자산이 뭔지부터 파악합니다."

### C. 강남언니 특화 질문 (4개)

Q17. 왜 강남언니에 지원했나요?
"저는 보안을 마지막 게이트로 세우는 사람보다는, 서비스 설계와 배포 흐름 안으로 들어가서 더 앞단에서 기여하는 역할에 끌립니다. 강남언니는
Security Partner처럼 제품팀과 같이 움직이는 방향이 분명해서 제 다음 단계와 잘 맞는다고 봤습니다."

Q18. 글로벌 서비스에서 보안상 특히 중요한 건?
"국가가 늘어나면 단순히 트래픽만 커지는 게 아니라 권한 체계, 개인정보 처리, 운영자 접근, 서드파티 연동이 훨씬 복잡해집니다."

Q19. 미용의료 플랫폼에서 개인정보 보호는?
"미용의료 도메인은 예약 정보, 상담 내용, 시술 관련 데이터처럼 민감도가 더 높게 느껴질 수 있는 정보가 많다고 생각합니다. 단순 암호화만이
아니라 접근 권한 최소화, 조회 사유가 남는 로그, 운영자 접근 통제, 데이터 마스킹까지 같이 봐야 합니다."

Q20. 어떤 Security Partner가 될 수 있다고 보나요?
"저는 보안을 마지막 게이트로 세우는 사람보다는, 초기에 같이 보고 나중에 운영 부담까지 줄이는 쪽에 강점이 있습니다."

## 5. 코드 리뷰 테스트 대비

### 보안 관점 체크리스트

1. 입력값 흐름 추적 (untrusted input → sink)
2. 인증/인가 분리 확인
3. 비밀정보 하드코딩
4. 외부 요청 처리 (SSRF)
5. DB 접근 (SQL Injection)
6. 파일 처리 (Path Traversal)
7. 에러/로그/감사 추적

### 주요 취약점 패턴 10개

1. SQL Injection
2. XSS
3. SSRF
4. IDOR/BOLA
5. 인증/인가 우회
6. 하드코딩 시크릿
7. 안전하지 않은 역직렬화
8. 파일 업로드 취약점
9. Race Condition
10. 민감정보 로그 노출

### 코드 리뷰 답변 프레임

1. 문제 지점
2. 왜 위험한지
3. 영향 범위
4. 수정 방향
5. 재발 방지

### Python 보안 코드 리뷰 체크리스트

- SQLAlchemy raw SQL 문자열 결합
- eval/exec/unsafe deserialization
- yaml.load safe loader
- auth decorator 누락
- request data validation
- 파일 경로 검증
- subprocess shell=True
- 민감정보 로그
- JWT alg/exp/aud 검증
- secrets 하드코딩

### Go 보안 코드 리뷰 체크리스트

- fmt.Sprintf SQL
- 인증 미들웨어 누락 라우트
- JSON 바인딩 후 검증 미적용
- 사용자 입력 URL outbound
- http.Client timeout 없음
- TLS InsecureSkipVerify
- goroutine race condition
- 에러 응답 내부 정보 노출
- context 없는 외부 호출
- RBAC/ownership check 누락

## 6. 역질문 (5개)

1. Security Partner가 설계 단계부터 참여하는지, 리뷰어에 가까운지?
2. 코드 리뷰 테스트 이후 직무 인터뷰 평가 기준은?
3. 현재 보안 조직에서 가장 우선순위 높은 문제는?
4. 글로벌 서비스 간 보안 요구사항 차이와 대응 방식은?
5. 입사 후 3~6개월 내 좋은 평가받는 사람의 특징은?

## 7. STAR 프레임워크 (3개)

### STAR 1: FortiGate HA → 금융위 본인가

- S: 금융위 본인가 심사 앞둔 상황
- T: HA 보안 구조 설계 + 심사 대응
- A: FGCP Active-Passive 설계, 장애 시나리오 문서화
- R: 본인가 심사 통과, 보안 운영 기준 명확화

### STAR 2: Splunk ES 탐지 룰

- S: 이벤트 많지만 노이즈 섞임
- T: 실제 대응 가능한 탐지 체계 구축
- A: 32개 룰 설계, 오탐/정탐 튜닝
- R: 대응 피로도 감소, 탐지 품질 향상

### STAR 3: 알림 워크플로 + FortiManager API 자동화

- S: 반복적 방화벽 정책 조회 수작업
- T: 자동화로 시간/정확도 개선
- A: 자동화 워크플로우 + API 연동
- R: 반복 업무 시간 감소, 분석 업무 집중 가능

## 8. 면접 직전 압축 메모

### 남겨야 할 인상 3개

1. 설계와 자동화까지 연결한 보안 엔지니어
2. 탐지/대응 체계를 실제로 굴려본 사람
3. 개발팀과 같이 일할 Security Partner

### 약점 질문 핵심 문장

"제 경험이 네트워크/클라우드/탐지 중심으로 더 두껍긴 합니다. 다만 보안 원칙을 설계와 운영에 녹여온 경험이 많아서, 제품보안과 Secure
SDLC 쪽으로 확장하는 속도는 빠르다고 생각합니다."

### 피해야 할 답변 톤

- "그건 해본 적 없어서 잘 모르겠습니다."
- "보안상 안 됩니다."
- "저는 원래 인프라 쪽이라 앱은 개발팀이 봐야 한다고 생각합니다."

### 추천 답변 톤

- "직접 깊게 운영한 영역은 아니지만, 원리와 위험 포인트는 이렇게 이해하고 있습니다."
- "보안 요구를 그대로 던지기보다, 개발 흐름 안에서 적용 가능한 방식으로 바꾸는 편입니다."

## 9. 강남언니 기술 블로그 핵심 정리 (면접에서 언급하면 가산점)

| 블로그 글                         | 핵심                | 면접 연결 포인트                                                    |
| --------------------------------- | ------------------- | ------------------------------------------------------------------- |
| 시간여행이 가능한 시스템 아키텍처 | Event Sourcing, DDD | "이벤트 소싱 기반이면 감사 로그와 보안 추적이 자연스럽게 가능"      |
| 테스트 안정감을 N배로 확보        | Test Double 전략    | "보안 테스트도 같은 원칙 - 외부 의존은 mock, 핵심 로직은 실제 객체" |
| GitOps 구조 진화 - 멀티리전       | ArgoCD, Kustomize   | "배포 파이프라인에 보안 검사를 넣을 때 GitOps 구조 이해가 중요"     |
| Self-contained Service            | 서비스 장애 격리    | "보안 관점에서도 blast radius를 줄이는 설계와 일맥상통"             |
| 코드 리뷰 테스트 도입             | 채용 방식 혁신      | 코드 리뷰 테스트에 대한 이해도 보여줄 수 있음                       |

## 10. 회사 핵심 가치 (협업 인터뷰 대비)

- 극도의 투명함: 결과 + 의도와 맥락 + 과정까지 공유
- 극도의 솔직함: 솔직함 없는 투명함은 공허
- 극도의 협업: 도구를 넘어 함께 달성하고자 하는 것
- 높은 기준: 좋은 것도 더 좋게
- 틀릴 수도 있다고 생각: 겸손
- 소신있게 반대하고 헌신: 의견 차이에도 전력

---

Write this ENTIRE document to
/home/jclee/dev/resume/docs/interview-prep-gangnamunni-security.md

IMPORTANT:

- Write ALL content above, not a summary
- All answers in Korean, conversational tone (구어체)
- Do NOT shorten or truncate any section
- Include every single Q&A (all 20)
- Include every checklist item
- The file should be 800+ lines
<!-- OMO_INTERNAL_INITIATOR -->

---

## 부록: JD 기반 실전 예상질문 + 사례

## A. 취약점 진단 시나리오

### Q1. "우리 서비스에 SSRF 취약점이 발견됐습니다. 어떻게 대응하시겠습니까?"

**답변 구조:**
**1단계: 영향 범위 파악**

- 해당 기능 사용처 식별 (webhook URL, 이미지 리사이징, PDF 생성 등)
- 내부 네트워크 접근 가능 여부 확인 (metadata endpoint 169.254.169.254)

**2단계: 즉각 대응**

- Critical이면 Feature Flag로 기능 비활성화
- AWS 환경: IAM role 권한 확인, metadata endpoint 차단 확인

**3단계: 수정**

- 허용 목록(whitelist) 기반 URL 검증
- Protocol 제한: https만, 내부 IP 대역 차단
- 요청 타임아웃 + 응답 크기 제한

**4단계: 재발 방지**

- CI/CD에 DAST/SAST 통합
- 코드 리뷰 체크리스트 적용

**강남언니 연결:** "미용 플랫폼에서 후기 이미지 URL을 외부에서 가져오는 기능이 있다면, AWS 환경에서 컨테이너의 IAM role
권한을 최소화하고 metadata endpoint 접근을 네트워크 레벨에서 차단하는 것이 중요합니다."

### Q2. "API에서 IDOR가 발견됐을 때, 수정 방향과 재발 방지는?"

**답변:**

- 서비스 레이어에서 리소스 소유권 검증 중앙화
- Spring Security @PreAuthorize로 메서드 레벨 접근 통제
- Integration test로 IDOR 케이스 자동화
- API Gateway 레벨 authorization policy enforcement

**코드 예시 (Kotlin):**

```kotlin
@PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
@GetMapping("/users/{userId}")
fun getUser(@PathVariable userId: Long): User
```

### Q3. "JWT 토큰이 탈취됐을 때 대응 절차는?"

**답변:**

1. 토큰 무효화: Redis에 탈취 토큰 jti 등록 → 만료 전까지 거부
2. 해당 계정 세션 일괄 종료 + 강제 비밀번호 변경
3. 토큰 사용 기간 API 로그 분석
4. Refresh token rotation, 만료 시간 단축 (15분)

## B. DevSecOps 파이프라인 설계 시나리오

### Q4. "CI/CD에 보안 검사를 넣으라면 어떻게 설계?"

**Multi-Stage Pipeline:**

```text
[Commit] SAST + Secrets scanning + Dependency check
[Build]  SCA (Snyk/Dependabot) + License compliance
[Container] Image scanning (Trivy) + Base image verification
[Pre-Deploy] DAST (ZAP) + IaC scanning (Checkov)
[Deploy] Policy Gate (OPA/Gatekeeper) + Artifact signing
[Post-Deploy] Runtime protection + CSPM
```

**핵심:** "Critical 발견 시 자동 차단, False Positive 튜닝은 개발팀과 협력, 빌드 시간은 병렬 실행으로 최적화"

### Q5. "SAST 도구 False Positive가 너무 많으면?"

**답변:**

1. 정량 분석: 실제 취약점 비율 계산
2. Rule별 제외 설정 (annotate-based)
3. 커스텀 룰 작성으로 노이즈 제거
4. 도구 비교 (SonarQube vs Semgrep vs CodeQL)
5. "Kotlin/Spring Boot 환경이라면, Spring MVC security 룰과 Kotlin null-safety 관련 룰을
   커스터마이징해서 노이즈를 줄일 수 있습니다."

### Q6. "Kubernetes 환경에서 컨테이너 보안은?"

**Defense-in-Depth:**

- 클러스터: CIS Benchmark, RBAC 최소권한, etcd 암호화, Network Policy
- 컨테이너: Pod Security Standards (runAsNonRoot, readOnlyRootFilesystem, drop ALL
  capabilities)
- 이미지: distroless 베이스, Trivy 스캔, Cosign 서명
- 런타임: Falco 이상행위 탐지

## C. 실제 보안 사고 대응 시나리오

### Q7. "Log4Shell(CVE-2021-44228) 발표 시 72시간 대응?"

**답변:**

- T+0~4: SCA로 취약 Log4j 식별, Public-facing → Internal → Legacy 우선순위화
- T+4~24: 2.17.1 이상 업그레이드, 패치 불가 시 formatMsgNoLookups=true + WAF 시그니처 차단
- T+24~72: DNS query 로그에서 JNDI 패턴 탐색, 외부 비정상 요청 확인, Lessons Learned 문서화

### Q8. "개발자가 실수로 S3 버킷을 public으로 설정해 고객 데이터 유출?"

**답변:**

1. 즉시 Block All Public Access
2. CloudTrail에서 외부 접근 IP 추출
3. 유출 데이터 유형 분류 (PII, 민감의료정보)
4. 개인정보보호위원회 72시간 내 신고
5. 재발 방지: SCP로 계정 레벨 public access 차단, Config Rule 모니터링

### Q9. "OAuth refresh token이 유출됐다면?"

**답변:**

1. 모든 활성 토큰 즉시 REVOKE
2. 제3자 통합 자격증 변경
3. 토큰 사용 기간 API 로그 분석
4. Refresh token 수명 단축 (90일→24시간), Token rotation 적용

## D. 강남언니 도메인 특화 시나리오

### Q10. "미용의료 플랫폼에서 환자 민감정보 보호 아키텍처는?"

**답변:**

- 데이터 분류: Level 1 (일반 PII) → Level 2 (의료 관련) → Level 3 (시술 사진, 진단명)
- Level 3: RBAC + MFA + Row-Level Security + 감사 로깅
- 암호화: at-rest AES-256, in-transit TLS 1.3
- 감사: 누가/언제/어떤 데이터 접근했는지 기록, 최소 3년 보관

### Q11. "글로벌 서비스(한국/일본/태국)에서 데이터 레지던시 설계?"

**답변:**

- 국가별 데이터 저장 리전 분리 (AWS ap-northeast-1 JP, ap-southeast-1 TH)
- API Gateway에서 jurisdiction 판정 → 데이터 로케이션 라우팅
- GDPR/개인정보보호법 동시 만족: 동의 획득/철회 메커니즘, 삭제권 지원
- Cross-border 전송 시 Standard Contractual Clauses 적용

### Q12. "Spring Boot Actuator가 Kubernetes에서 외부 노출될 위험과 대응?"

**답변:**

- Network Policy로 actuator endpoints 내부 모니터링 네임스페이스에서만 접근 허용
- management.endpoints.web.exposure.include: health,info만 노출
- show-details: when_authorized로 인증된 요청만 상세 정보
- 별도 관리 포트 분리 (management.server.port)

## E. 보안 코드 리뷰 실전 예제

### 예제 1: SQL Injection (Java/Kotlin)

**취약 코드:**

```java
@Query("SELECT u FROM User u WHERE u.email = '" + email + "'")
User findByEmail(String email);
```

**리뷰 코멘트:** "사용자 입력이 JPQL 쿼리에 직접 들어가서 SQL Injection 가능. @Param 파라미터 바인딩 사용 필요."

**수정:**

```java
@Query("SELECT u FROM User u WHERE u.email = :email")
User findByEmail(@Param("email") String email);
```

### 예제 2: SSRF (Spring Boot)

**취약 코드:**

```java
@GetMapping("/view-image")
public byte[] getImage(@RequestParam String url) {
    return restTemplate.getForObject(url, byte[].class);
}
```

**리뷰 코멘트:** "사용자 URL이 검증 없이 RestTemplate에 전달. 169.254.169.254로 AWS 크레덴셜 탈취 가능.
HTTPS + 도메인 allowlist 적용 필요."

### 예제 3: IDOR (Kotlin)

**취약 코드:**

```kotlin
@GetMapping("/appointments/{id}")
fun getAppointment(@PathVariable id: Long) = appointmentService.findById(id)
```

**리뷰 코멘트:** "인증된 사용자가 다른 환자의 예약 정보에 접근 가능. 소유권 검증 필요."

**수정:**

```kotlin
@GetMapping("/appointments/{id}")
fun getAppointment(@PathVariable id: Long, @AuthenticationPrincipal user: User): Appointment {
    val appointment = appointmentService.findById(id)
    require(appointment.patientId == user.id || user.hasRole("ADMIN"))
    return appointment
}
```

### 예제 4: Pickle Deserialization RCE (Python)

**취약 코드:**

```python
obj = pickle.loads(request.data)  # RCE!
```

**리뷰 코멘트:** "pickle.loads()에 사용자 데이터 전달 시 임의 코드 실행 가능. JSON으로 교체."

### 예제 5: CORS Origin Reflection

**취약 코드:**

```javascript
res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

**리뷰 코멘트:** "임의 Origin 반영으로 공격자 사이트에서 인증된 API 응답 탈취 가능. 도메인 allowlist 적용."

### 예제 6: Terraform S3 Public

**취약 코드:**

```hcl
resource "aws_s3_bucket" "user_data" {
  bucket = "my-app-user-data"
  acl    = "public-read"
}
```

**리뷰 코멘트:** "S3 버킷 public 노출. acl=private + aws_s3_bucket_public_access_block 4개
설정 모두 true로."

### 예제 7: K8s RBAC 과잉 권한

**취약 코드:**

```yaml
subjects:
  - kind: ServiceAccount
    name: default
roleRef:
  kind: ClusterRole
  name: cluster-admin
```

**리뷰 코멘트:** "default SA에 cluster-admin 부여. 팟 하나 탈취되면 클러스터
전체 장악. 네임스페이스 스코프 Role + 최소 권한."

## F. 한국 테크기업 실제 면접 기출 (출처별)

### 잡플래닛/블로터

- TCP와 UDP 차이를 보안 관점에서 설명
- IDS와 IPS 차이
- CSRF와 XSS 차이, 각 종류
- OWASP Top 10 상위 5개 설명
- 블라인드 SQL 인젝션 설명
- 서버 취약점 점검 시 가장 먼저 할 일
- 개보법/신용법/망법 아는 바

### 안랩

- 방화벽 동작 원리 (관리자 측면)
- TCP 3-Way Handshake 깊이 추궁
- Suricata vs Snort 차이
- 파일리스(Fileless) 공격 대응

### 쿠팡

- 시스템 설계 + 라이브코딩 + 도메인 + 컬쳐핏 (각 1시간, 총 4시간)
- "보안 속도와 기능 개발 속도의 트레이드오프 관리?"
- OAuth/OIDC/SAML/JWT 심층 지식

### 공통 행동 질문

- "가장 어려웠던 기술적 문제는?"
- "보안 취약점 발견 시 개발팀이 무시하려 할 때?"
- "보안팀이 병목이라는 불만 해결법?"
- "보안 교육/Training 진행 경험?"

## G. 참고 리소스

| 자료                          | URL                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| 코드 리뷰 챌린지 (FAANG Prep) | <https://github.com/dub-flow/secure-code-review-challenges>                            |
| 정보보안 면접 질문 50개       | <https://lheunx.tistory.com/entry/정보보안면접질문-50개>                               |
| IT 보안 면접 Top 10           | <https://www.it-server-room.com/it-보안-면접-인터뷰-예상-질문/>                        |
| Threat Modeling 55문제        | <https://www.practical-devsecops.com/threat-modeling-interview-questions-and-answers/> |
| AppSec 101문제                | <https://www.adaface.com/blog/application-security-engineer-interview-questions/>      |
| Amazon Security Engineer Prep | <https://amazon.jobs/content/en/how-we-hire/security-engineer-interview-prep>          |
