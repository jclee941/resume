# 당근 면접 예상 질문 (경력 항목별)

당근 면접 패턴: **What 거의 안 묻고 How/Why 깊이 파고듬**, 이력서 기반 세세한 의사결정 재검토, 시스템 디자인 화이트보드.

---

## 1. 아이티센CTS (2025.03~최근) — Nextrade SOC 24/7 + Splunk SIEM + Claude AI

### 핵심 검증 질문
- "SOC 24/7 3교대를 운영하셨다고 했는데, 본인이 야간 당직일 때 P1 인시던트 떴습니다. 처음 30분 동안 정확히 무엇을 하시나요?"
- "Splunk 탐지룰을 고도화했다고 하셨는데, 가장 최근에 직접 만들거나 수정한 룰 1개를 화이트보드에 SPL로 써주실 수 있나요?"
- "탐지룰을 만들 때 정밀도(precision)와 재현율(recall) 중 어떤 것을 우선하시나요? 그 기준이 룰마다 다른가요?"
- "Claude AI로 위협정보를 자동화했다고 하셨는데, AI 응답을 그대로 신뢰하지 못하는 상황은 어떻게 처리하셨나요? hallucination 방어는요?"
- "월 6천건 이벤트라고 가정했을 때, 알림 피로도(alert fatigue) 문제는 어떻게 관리하셨나요?"

### How/Why 깊이 파기
- "왜 SIEM을 Splunk로 선택했나요? Elastic Stack이나 Wazuh는 검토했나요?"
- "탐지룰 300개 중 가장 많이 트리거된 룰은 무엇이었고, 그게 진짜 위협이었나요 아니면 오탐이었나요?"
- "MITRE ATT&CK과 매핑한 룰의 비율은 얼마나 됩니까? 매핑하지 못한 룰은 왜 그랬나요?"
- "Claude AI 자동화 도입 전과 후, 분석가 1명이 처리하는 알림 수가 어떻게 바뀌었나요?"

### 함정 질문 (의사결정 재검토)
- "지금 다시 Nextrade SOC를 처음부터 설계한다면, 가장 먼저 바꾸고 싶은 것은 무엇인가요?"
- "당근은 금융권보다 규제가 덜합니다. SOC 24/7 같은 비싼 체계가 정말 필요할까요? 다른 접근법이 있을까요?"

### 답변 준비 키워드
PICERL, Triage P0~P3, Sigma 룰, MITRE T1078/T1059.001, Splunk SPL, alert correlation, Claude prompt engineering, JSON schema validation, human-in-the-loop

---

## 2. 가온누리 (2024.03~2025.02) — Nextrade 구축 / 5계층 망분리 / Python 방화벽 자동화

### 핵심 검증 질문
- "5계층 망분리를 설계하셨다고 했는데, 각 계층의 이름과 통신 정책을 그려주실 수 있나요?"
- "방화벽 정책을 Python으로 자동화하셨는데, 잘못된 정책이 자동 배포되어 거래 시스템이 다운될 위험은 어떻게 방어하셨나요?"
- "방화벽 자동화 코드의 review 프로세스는 어땠나요? 누가 승인했고, 롤백 절차는 무엇이었나요?"
- "Air-Gap 망에서 패치는 어떻게 적용하셨나요? 패치 적용 후 검증은요?"

### How/Why 깊이 파기
- "왜 5계층이었나요? 3계층이나 7계층으로 갈 수도 있었을 텐데 5라는 숫자의 근거는 무엇입니까?"
- "FortiGate를 선택한 이유는 무엇인가요? 다른 벤더와 비교했나요?"
- "Python 자동화에 Ansible이나 Terraform이 아닌 Python을 쓴 이유는요?"
- "FSC 본인가 심사에서 가장 까다로웠던 보안 요구사항은 무엇이었나요?"

### 함정 질문
- "당근은 Air-Gap이 없는 환경입니다. 5계층 망분리 경험이 클라우드 네이티브 환경에서 어떤 가치가 있나요?"
- "Nextrade 구축 때 어떤 결정이 가장 후회되시나요? 다시 한다면 어떻게 하시겠습니까?"

### 답변 준비 키워드
Zero Trust, segmentation, micro-segmentation, AWS VPC + Security Group으로 매핑, IaC drift detection, change management, 정책 dry-run, blue-green policy rollout

---

## 3. 콴텍투자일임 (2022.08~2024.03) — AWS 금융 보안 (VPC/IAM/CloudTrail/GuardDuty)

### 핵심 검증 질문
- "GuardDuty가 의심스러운 IAM activity 알림을 띄웠습니다. 처음 무엇을 확인하시나요?"
- "CloudTrail 로그를 어디로 보내셨나요? S3? CloudWatch? 보존 기간은요? 무결성은 어떻게 보장하셨나요?"
- "IAM 정책 설계 시 least privilege를 어떻게 검증하셨나요? Access Analyzer 사용 경험 있나요?"
- "VPC 설계할 때 NAT Gateway, VPC Endpoint, Transit Gateway 중 어떤 것을 어떤 기준으로 선택하셨나요?"

### How/Why 깊이 파기
- "왜 GuardDuty였나요? AWS Security Hub나 third-party CSPM (Wiz, Prisma) 검토했나요?"
- "FSDC(금융보안데이터센터) 환경 특성상 AWS 사용이 제한적이었을 텐데, 어떤 워크로드만 AWS에 두셨나요?"
- "AWS 보안에서 가장 잘못 설계되어 있는 패턴 1개를 말한다면 무엇인가요?"

### 함정 질문
- "당근은 멀티 클라우드 환경입니다. AWS만 하셨는데 GCP나 Azure로 넘어가는 데 얼마나 걸릴까요?"
- "AWS GuardDuty 비용이 비싸다고 들었는데, ROI를 어떻게 계산해서 운영진을 설득하셨나요?"

### 답변 준비 키워드
IAM Access Analyzer, CloudTrail S3 + Object Lock, VPC Flow Logs → Athena 쿼리, GuardDuty findings → SNS → Slack, Service Control Policy(SCP), AWS Config rules, IMDSv2

---

## 4. 펀엔씨 (2022.05~07) — DevOps / K8s 사전검토

### 핵심 검증 질문
- "3개월 짧은 경력인데, 실제로 K8s를 어디까지 보셨나요? 사전검토만이라고 하셨는데 정확히 무엇을 검토하셨나요?"
- "K8s 보안 관점에서 가장 중요한 3가지를 꼽는다면? 그리고 그 우선순위 근거는요?"
- "Pod에 root 권한이 필요한 경우와 그 위험을 어떻게 다루시나요?"

### How/Why 깊이 파기
- "왜 펀엔씨에서 3개월 만에 나오셨나요?" (정직 답변 + 학습 가져온 것 강조)
- "K8s 마이그레이션 사전검토 결과 어떤 결론이 나왔나요? 마이그레이션을 하기로 했나요 안 했나요?"

### 함정 질문 (이력서 가벼움 검증)
- "이력서에 K8s 사전검토라고 쓰셨는데, 프로덕션 K8s 클러스터를 본인이 직접 운영해본 적이 있나요?"

### 답변 준비 키워드
RBAC, Pod Security Standards (Restricted/Baseline/Privileged), NetworkPolicy, OPA Gatekeeper, Falco, kube-bench, image scanning (Trivy), runtime security, secrets in etcd

---

## 5. 조인트리 (2021.09~2022.04) — NSX-T / NAC / DLP / APT 통합

### 핵심 검증 질문
- "NSX-T로 micro-segmentation을 구축하셨다면, 정책을 어떤 단위로 나누셨나요? VM 기준? 애플리케이션 기준? 태그 기준?"
- "NAC, DLP, APT 세 솔루션의 알림이 동시에 떠서 같은 단말을 가리킬 때, 우선순위와 통합 분석은 어떻게 하셨나요?"
- "DLP 오탐이 많이 나오셨다고 했는데, 가장 흔한 오탐 패턴 1가지와 그것을 줄인 방법을 설명해주세요."

### How/Why 깊이 파기
- "NSX-T가 아닌 물리 방화벽으로 했다면 어떤 차이가 있었을까요?"
- "APT 솔루션의 ML 모델 결과를 100% 신뢰할 수 있나요? 신뢰할 수 없다면 어떻게 보완하셨나요?"

### 함정 질문
- "조인트리에서 다룬 NSX-T, NAC, DLP, APT가 당근의 클라우드 네이티브 환경에서 그대로 쓸 수 있나요? 어떻게 변환되어야 하나요?"

### 답변 준비 키워드
distributed firewall, security tag, EDR vs APT 차이, UEBA, sandbox 분석, DLP context-aware policy, false positive tuning loop

---

## 공통 답변 템플릿 (모든 항목 적용 가능)

### "왜 그렇게 결정하셨나요?" 질문에는
1. 당시 제약조건 (예산/시간/팀 역량) 1줄
2. 검토한 대안 1-2개
3. 선택 근거 1줄
4. 사후 평가 (잘했다/지금이면 다르게) 1줄

### "지금 다시 한다면?" 질문에는
- 절대 "그대로 하겠다" 금지 → 무성찰 신호로 보임
- 구체적 개선점 1개 + 이유 + 학습한 점 형태로 답변

### "당근에 어떻게 적용하시겠어요?" 질문에는
1. 기존 경험의 본질 1줄 (예: "탐지·자동화·재발방지 사이클")
2. 당근 환경의 차이점 인정 1줄 (예: "규제 부담 적고 트래픽 패턴 다름")
3. 적용 방법 1줄 (예: "FDS 룰엔진+LLM 하이브리드에 금융권 이상거래 탐지 패턴 응용")

---

## 면접 직전 1시간 — 이 5개만 외우기

1. **자기소개 4문장** (이미 프롬프트에 고정됨)
2. **PICERL 6단계** 침해사고 대응 순서
3. **STEAMP 6단계** 시스템 디자인 순서
4. **MITRE ATT&CK TTP 3개** (T1078 Valid Accounts, T1059 Command Execution, T1538 Cloud Service Dashboard)
5. **당근 블로그 1개 인용 문장** (FDS 또는 IDP/DevSecOps)
6. **마지막 한마디** ("꼭 당근과 함께하고 싶습니다. 중고거래의 묘미는 숨겨진 보물을 발견하는 데 있다고 생각합니다…")

---

## 6. 개인 인프라 프로젝트 예상 질문 (강력한 무기)

당근 면접관은 본인이 직접 운영하는 인프라/프로젝트에 매우 큰 관심을 가집니다. 이력서에 적은 이상 반드시 깊이 파고듭니다.

### A. Proxmox 홈랩 (pve3, LXC 7개 + VM 3개)

| # | 질문 | 답변 방향 |
|---|---|---|
| P1 | "Proxmox 단일 노드인데 SPOF 아닌가요? 어떻게 대응하시나요?" | 솔직 인정 + Synology NAS 백업(vzdump zstd) + RTO 15분 + 향후 클러스터 확장 계획 |
| P2 | "1Password Connect로 시크릿 관리한다고 하셨는데, Connect 서버 자체가 침해되면?" | 네트워크 격리 + 1Password 마스터 키 분리 + Audit Log + 향후 Vault 검토 |
| P3 | "ELK Stack을 직접 운영하셨다면 인덱스 매핑 충돌 경험 있나요?" | Filebeat 8.12 + Logstash 파이프라인 + ILM 정책으로 logs-critical 90일 보관 |
| P4 | "Cloudflare Tunnel을 쓴 이유는? Tailscale이나 WireGuard 검토했나요?" | 공인 IP 불필요 + DDoS 보호 + Zero Trust Access 통합 |
| P5 | "Terraform으로 모든 걸 관리한다면 drift는 어떻게 감지하시나요?" | GitHub Actions 일 1회 drift detection + 자동 PR 생성 |

### B. IP Blacklist 플랫폼 (10,000+ IPs)

| # | 질문 | 답변 방향 |
|---|---|---|
| B1 | "REGTECH 위협정보를 자동 수집한다고 했는데, 인증/세션은 어떻게 처리하셨나요?" | Multi-phase auth + AES-256-GCM 자격증명 암호화 + 마스터 키 파일 분리 |
| B2 | "FortiGate에 Threat Feed API로 push하는 구조에서 잘못된 IP가 들어가면 어떻게 롤백하시나요?" | Whitelist 우선 검사 + dry-run 모드 + PostgreSQL NOTIFY 기반 트랜잭션 + Cloudflare WAF 분리 적용 |
| B3 | "10,000개 IP인데 Cloudflare WAF 한도가 500K입니다. 왜 더 안 늘리시나요?" | confidence_level 점수화로 노이즈 제거 + GeoIP 컨텍스트로 우선순위 + 운영 가시성 확보 우선 |
| B4 | "당근에 적용한다면 어뷰징 IP 차단에 쓸 수 있나요?" | 그대로 적용 가능 + 신고 기반 피드백 루프 추가 + 당근 FDS 룰엔진과 통합 가능 |
| B5 | "Flask + PostgreSQL + Redis + Next.js 풀스택을 혼자 다 하셨다면, 가장 어려웠던 의사결정은?" | DI를 ServiceFactory로 직접 구현(프레임워크 의존 최소화) + Air-Gap 배포 가능성 우선 설계 |

### C. Splunk SIEM (32개 탐지룰, 30초 내 알림)

| # | 질문 | 답변 방향 |
|---|---|---|
| S1 | "이벤트 발생 30초 내 알림이라고 하셨는데, 어떻게 측정하셨나요?" | FortiGate syslog timestamp vs Slack message timestamp 차이 + 샘플링 모니터링 |
| S2 | "초당 10만 이벤트 처리 검증은 어떻게 하셨나요?" | HEC 부하 테스트 (Splunk Enterprise validated) + 인덱서 자원 측정 |
| S3 | "32개 룰 중 가장 자랑스러운 룰 1개를 SPL로 써주세요." | 화이트보드에 직접 작성 가능 (예: brute force, lateral movement, data exfil 중 택1) |
| S4 | "Slack Block Kit으로 알림을 구조화한 이유는? 단순 텍스트와 비교해서?" | 운영자가 30초 내 판단 가능한 정보 우선순위 → 제목/맥락/확인포인트 분리 |
| S5 | "당근이 Splunk를 쓰지 않을 수도 있는데, 다른 SIEM으로 어떻게 이식하시겠어요?" | Sigma 룰 표준화 + KQL/Elasticsearch DSL 변환 가능 + MITRE ATT&CK 매핑 유지 |

### D. FortiNet API 라이브러리

| # | 질문 | 답변 방향 |
|---|---|---|
| F1 | "FortiManager + FortiAnalyzer 두 제품 API를 통합한 이유는?" | 운영자 질문 단위로 추상화 (정책 조회/라우트 관리/로그 통계) — 제품 경계 흡수 |
| F2 | "수동 대비 80% 시간 절감을 어떻게 측정하셨나요?" | 정책 조회 평균 작업 시간(분) 측정 + 반복 횟수 × 시간 절감 |
| F3 | "이 라이브러리를 오픈소스로 공개할 생각 있으신가요?" | 인증 정보 분리 + 추상화 인터페이스만 공개 가능 |

### E. 통합 질문 ("이 모든 걸 왜?")

| # | 질문 | 답변 방향 |
|---|---|---|
| E1 | "회사 일도 바쁘신데 왜 이렇게 많은 개인 프로젝트를 운영하시나요?" | 회사에선 못 쓰는 도구 학습(Cloudflare/n8n/Claude AI) + 실제 운영하면서 배운 것을 회사에 역수입 (Splunk-FortiNet 통합 패턴) |
| E2 | "blacklist + Splunk + FortiNet API가 하나의 보안 운영 체계처럼 보입니다. 의도하셨나요?" | 의도함. 위협정보 수집(Blacklist) → 탐지(Splunk) → 정책 자동화(FortiNet API) → 알림(Slack)이 하나의 D&R 사이클 |
| E3 | "당근 보안팀 합류하면 개인 프로젝트는 어떻게 하시나요?" | 보안 침해 위험 없는 범위에서만 운영 + 회사 시간 100% 집중 + 개인 프로젝트는 학습 도구로 유지 |
