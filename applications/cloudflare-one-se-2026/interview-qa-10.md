# Cloudflare One Specialist SE — 추가 면접 Q&A 10개

이전 message 5개 + 이번 10개 = 총 15개. SE 직무 + Cloudflare One + 한국 시장 + 본인 trajectory 특수 질문 위주.

---

## Q6. "Cloudflare One은 SaaS 보안 게이트웨이입니다. 한국 금융 고객의 망분리 의무와 양립이 가능합니까?"

**답변 골격**:

> 가능하지만 단계 설계가 필요합니다. 전자금융감독규정 제29조 망분리 조항은 *내부망과 인터넷망의 물리적/논리적 분리*를 요구합니다. Cloudflare One은 이를 위반하지 않고 보완하는 방식으로 도입할 수 있습니다.
>
> 첫 단계는 **외부 트래픽** (인터넷 가는 트래픽)에만 Cloudflare Gateway/SWG를 적용하는 것입니다. 내부 시스템 간 통신은 기존 망분리 그대로 두고, 인터넷 카테고리 차단 + DLP + DNS-over-HTTPS만 Cloudflare에 위임합니다. 이건 망분리 위반이 아니라 *인터넷 게이트웨이의 보안 기능 강화*입니다.
>
> 두 번째 단계로 **Cloudflare Tunnel**을 외부 협력사 접속 채널로 도입합니다. 기존 SSL VPN을 즉시 폐기하지 않고 Tunnel을 병렬 운영하면서, FortiGate에 들어오는 외부 접속을 점진 마이그레이션할 수 있습니다.
>
> 세 번째 단계가 가장 어려운데, **내부망 ZTNA**입니다. 이 단계는 금감원과 사전 협의가 필요하고, "물리적 분리"는 유지하되 "논리적 통제 강화"로 해석하는 합의가 있어야 가능합니다. 제가 가온누리에서 FSC 본인가 심사 대응 시 비슷한 통제 항목을 다뤘기 때문에, 이 협의 자료 작성을 customer SE 입장에서 같이 만들 수 있습니다.

---

## Q7. "본인은 vendor SE 경험이 없습니다. Pre-sales 역량을 어떻게 빨리 따라잡을 계획입니까?"

> 정직하게 인정합니다. Pre-sales 직접 경험은 0이지만, 8년 동안 *고객 사이드*에서 vendor SE를 평가하고 PoC를 진행했습니다. 어떤 SE가 신뢰를 주고 어떤 SE가 PoC를 망치는지 양쪽을 다 봤습니다.
>
> 첫 90일 계획:
>
> - **Week 1-2**: Cloudflare One 전 제품 (Gateway, Access, Tunnel, Magic WAN, Browser Isolation, Email Security) hands-on lab — 각 제품을 제 Cloudflare 계정에서 직접 deploy
> - **Week 3-4**: 기존 한국 customer 사례 (LG, 삼성, 토스 등) 공개 자료 분석. 한국 시장에서 Cloudflare One이 풀어준 실제 문제 패턴 파악
> - **Week 5-8**: Senior SE shadow — discovery call 5건, technical deep-dive 5건, PoC 2건 옵저버로 참여
> - **Week 9-12**: 작은 customer (e.g., 핀테크 스타트업) 1-2개 직접 lead, senior SE backup 받으며 진행
>
> 이 기간 동안 vendor SE의 sales motion 부족분을 빨리 보완할 수 있고, 운영 사이드 8년 깊이는 Cloudflare 내부에서도 흔치 않은 자산이 됩니다.

---

## Q8. "한국 금융 고객이 Cloudflare One에 가장 많이 묻는 기술 질문 3가지는 무엇이라고 생각합니까?"

> 운영 사이드에서 직접 vendor에게 던졌던 질문들입니다:
>
> 1. **"한국 PoP는 어디 있고, latency는 얼마인가?"** — 거래소나 결제 시스템은 ms 단위 latency가 SLA에 들어갑니다. Cloudflare가 서울/부산에 PoP가 있는지, 한국 → Cloudflare → origin 왕복이 KT/SKT/LGU+ 망 안에서 끝나는지가 중요합니다.
> 2. **"한국 데이터 잔류(Data Residency)는 보장되는가?"** — 개인정보보호법 + 신용정보법은 일부 데이터의 한국 외 이전을 제한합니다. Cloudflare Worker D1, KV의 region 옵션, Logpush destination이 한국 내인지가 PoC 1주차에 반드시 묻는 질문입니다.
> 3. **"기존 SIEM(Splunk/ArcSight)에 어떻게 로그를 보낼 수 있는가?"** — 한국 금감원 감사는 SIEM 통합 로그를 요구합니다. Logpush → S3 / Splunk HEC / Datadog 모두 가능하지만, Splunk HEC + 한국 region S3 조합이 가장 흔합니다. 제가 이 정확한 통합을 직접 운영해봤기 때문에 PoC 단계에서 즉시 답할 수 있습니다.

---

## Q9. "본인은 ITCEN CTS에서 Splunk ES 운영 중입니다. 영업비밀이 아닌 범위에서 어떤 correlation rule을 작성해봤는지 한 가지 설명해주세요."

> 영업비밀에 저촉되지 않는 일반 패턴으로 설명드리겠습니다.
>
> 거래소 환경에서 **dest_port 기반 유출 탐지** 룰을 만들었습니다. 정상 거래 트래픽은 정해진 포트(예: 매매체결 시스템의 특정 TCP 범위)로만 흐르고, 그 외 포트로 outbound가 발생하면 위협 가능성이 있습니다.
>
> 룰 구조:
>
> - **Stream 1**: FortiGate session 로그에서 dest*port가 *정상 화이트리스트\_ 외인 outbound traffic 추출
> - **Stream 2**: 동일 src_ip가 짧은 시간(예: 5분) 안에 N개 이상 unique dest_port로 접속 (port scan 패턴)
> - **Sequential Scenario**: Stream 1 이벤트가 발생한 src_ip가 Stream 2 패턴도 만족하면 high-priority alert
>
> 이 alert은 알림 워크플로으로 흘러가서 FortiManager API로 자동으로 source IP를 임시 차단 정책에 추가하고, Slack에 분석 요청을 보냅니다.
>
> Cloudflare One에서는 동등 패턴을 Gateway HTTP 카테고리 로그 + Access deny 로그로 만들 수 있습니다. customer가 이미 Splunk를 쓰고 있다면 Logpush → Splunk HEC로 보내고 같은 correlation rule 모델을 그대로 옮길 수 있습니다.

---

## Q10. "Cloudflare One의 경쟁사(Zscaler, Netskope, Palo Alto Prisma)와 비교하여 한국 시장에서 어떻게 포지셔닝하시겠습니까?"

> 한국 시장 특수 요소 3가지로 비교합니다:
>
> 1. **한국 PoP 밀도**: Cloudflare는 서울 + 부산 PoP. Zscaler는 서울만. Netskope는 한국 PoP 제한적. 한국 origin → 한국 PoP는 Cloudflare가 latency 우위.
> 2. **개발자 친화도**: Cloudflare는 Workers + R2 + D1로 *플랫폼*까지 제공. Zscaler/Netskope는 보안 게이트웨이만. 한국 핀테크는 _Edge에서 보안 + 비즈니스 로직 동시_ 처리를 원하는 경우가 많아서 Cloudflare가 유리합니다.
> 3. **가격 모델**: Cloudflare One은 user-based + add-on. Zscaler는 user + bandwidth. 한국 대기업 IT 예산 구조에서는 *예측 가능한 user-based* 모델을 설명하기 쉽습니다.
>
> 다만 정직한 단점: Zscaler는 한국 시장 진입 더 빨라서 *brand recognition*에서 우위. 큰 금융사는 "이미 옆 회사도 Zscaler 씁니다"가 강력한 buyer signal입니다. 이 부분은 Cloudflare가 한국 reference customer 사례를 더 많이 만드는 게 답이고, SE로서 제가 reference를 만드는 데 직접 기여하고 싶습니다.

---

## Q11. "한국 customer가 PoC에서 Cloudflare One을 거부하는 가장 흔한 이유는 무엇이라고 생각합니까?"

> 운영 사이드에서 본 것 기준 3가지:
>
> 1. **금감원 감사 산출물 형식 미스매치** — Cloudflare 로그 포맷이 한국 금융 표준 산출물(예: ISMS-P 점검 항목 매핑)과 1:1 매핑이 안 되면 PoC가 멈춥니다. 해결: SE가 Logpush → 한국 SIEM(Splunk/ArcSight) → 산출물 변환기까지 thread 잡아주는 작업이 필요합니다.
> 2. **기존 FortiGate/F5 운영팀 저항** — 새로운 vendor 도입은 기존 운영팀의 _우리 팀이 사라지는 것 아닌가_ 우려를 불러일으킵니다. 해결: PoC 단계에서 *기존 팀이 Cloudflare 운영자가 된다*는 reskilling path를 명시. 제가 운영팀 관점에서 이 우려를 직접 안다는 게 강점입니다.
> 3. **국내 SI 파트너 부재** — 한국 enterprise 도입은 SI 통한 도입이 흔합니다. Cloudflare Korea가 LG CNS / SK C&C / 삼성SDS 같은 SI와 채널 파트너십을 강화해야 PoC가 deploy로 넘어갑니다. SE 직무에서 SI 파트너 enablement도 가능 영역입니다.

---

## Q12. "본인은 FortiGate operator입니다. Cloudflare가 FortiGate 고객을 빼앗아 가는 사례에서 SE로서 어떻게 윤리적 충돌을 다루겠습니까?"

> 윤리적 충돌은 없다고 봅니다. 8년 동안 vendor를 바꾼 적이 여러 번 있고, 매번 *고객 가치*가 더 큰 쪽으로 갔습니다. FortiGate를 쓰는 이유는 FortiGate라서가 아니라, 그 시점에 FortiGate가 가장 잘 풀어주는 문제가 있었기 때문입니다.
>
> Cloudflare One이 FortiGate보다 잘 푸는 영역(분산 사용자 기반 Zero Trust, SaaS-first 환경, edge에서 보안 + 비즈니스 로직 결합)이 명확하면 customer에게 솔직히 그 차이를 설명합니다. 반대로 Cloudflare One이 못 푸는 영역(예: NGFW deep packet inspection의 일부 use case, 특정 IPS 시그니처)이 있으면 그것도 솔직히 말합니다.
>
> SE의 신뢰 자산은 *vendor 영업이 아니라 customer 문제 해결*에서 나온다고 생각합니다. 운영 사이드에서 이 부분을 가장 많이 학습했습니다.

---

## Q13. "원격 근무 비율과 한국 office 출근 빈도는 어떻게 생각합니까?"

> Cloudflare가 hybrid 모델로 전환 중인 것 알고 있습니다. 한국 office는 어디인가요? (강남/판교/광화문 등 위치 확인)
>
> 저는 hybrid가 가장 적합합니다:
>
> - **주 2-3회 office**: customer 미팅, 동료 SE/Sales와 alignment, demo session 협업
> - **주 2-3회 remote**: deep-work (technical proposal 작성, lab build, document 정리)
> - **출장**: 한국 customer site 방문 (분기 5-10회 예상)
>
> 현재 ITCEN CTS도 hybrid이고 자체 운영 사이트(resume.jclee.me)는 100% remote work로 1년 이상 운영했기 때문에 두 모드 다 익숙합니다.

---

## Q14. "본인의 가장 큰 약점은 무엇이고, Cloudflare에서 어떻게 극복할 계획입니까?"

> 가장 큰 약점은 **AWS production 경험 0**입니다. 8년 운영 경험이 모두 on-prem (FortiGate, NSX-T) + Cloudflare Workers (홈랩 + production 1개)에 집중되어 있고, AWS는 SAA-C03 학습만 시작한 단계입니다.
>
> Cloudflare One customer는 hybrid (AWS/Azure/GCP + on-prem) 환경이 흔하고, 특히 한국 대기업은 AWS 비중이 높습니다. SE로서 AWS native 보안 컨트롤(Security Hub, GuardDuty, IAM, VPC Flow Logs)을 customer 언어로 매핑하지 못하면 한계가 있습니다.
>
> 첫 6개월 계획:
>
> - SAA-C03 + SCS-C03 (Security Specialty) 연속 취득
> - 매주 customer 미팅에서 AWS 환경 마주칠 때 senior SE에게 active learning
> - 분기마다 한 번씩 AWS native 보안 product 1개를 deep-dive 글로 정리, 팀 내 공유
>
> 1년 후에는 AWS 환경 customer를 senior SE backup 없이 lead할 수 있는 수준이 목표입니다.

---

## Q15. "10년 후 본인의 커리어 비전은?"

> 솔직히 말씀드리면, 10년이라는 timeframe보다 _3-5년 후_ 시각이 더 또렷합니다.
>
> 3-5년 비전: **한국 금융권 Zero Trust 도입의 1세대 구축 자문 엔지니어**가 되는 것입니다. 8년 운영 + Cloudflare One vendor SE 경험을 합쳐서, 한국 거래소/은행/증권사가 망분리에서 ZTNA로 점진 전환할 때 *기술 + 규제 + 정치*를 한 번에 통역할 수 있는 사람이 되고 싶습니다. 이런 통역자 역할은 vendor SE 안에 머물든, 한국 SI/컨설팅 회사로 옮기든, 자체 회사를 만들든 어디서나 가치가 있습니다.
>
> 10년 비전은 그 다음에 자연스럽게 결정될 것 같습니다. 다만 한 가지는 명확합니다: *반복 작업의 한계*라는 한 가지 문제 의식이 만든 trajectory를 계속 따라가고 싶고, 그 다음 단계에서는 AI 에이전트가 보안 운영의 1차 처리를 담당하는 패턴을 직접 만드는 일이 될 것 같습니다. resume.jclee.me에 이미 작은 prototype을 운영하고 있어서, 이 방향성은 추측이 아니라 검증 중인 가설입니다.

---

## 면접 전 마지막 점검 (Day-of)

- [ ] Cloudflare 최신 기술 블로그 5건 읽기 (특히 Cloudflare One product update)
- [ ] resume.jclee.me 라이브 페이지 + /health 응답 캡처 (대화 중 reference 가능)
- [ ] 본인 GitHub 최근 활동 그래프 (이번 세션 23+ PR) 가시화 — "최근 운영 자동화 스토리"
- [ ] 한국 office 위치 + 출퇴근 시간 답변 준비
- [ ] 연봉 기대치 — KRW 기준 (8년차 + Cloudflare 직급 = SR/Senior SE 대역)
- [ ] 시작 가능 일자 — "면접 후 2주 이내" (현재 ITCEN CTS 계약 종료 상태)

면접 진행 시 메모: **resume.jclee.me 라이브 데모를 1차 면접 마지막 5분에 자발적으로 보여주기 권장**. 이 단일 액션이 다른 후보와 가장 큰 차별점.
