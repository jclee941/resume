---
title: '자기소개서 - Cloudflare (Specialist Solutions Engineer, Cloudflare One)'
author: '이재철'
date: '2026-05'
---

# 자기소개서

## 지원 동기

한국 금융 고객에게 Zero Trust를 규제 언어로 설명할 수 있다는 점이 이 직무에 가장 잘 맞는다고 생각합니다. 저는 지난 8년간 한국 금융권 보안 인프라를 고객 사이드에서 설계하고 운영했습니다. 넥스트레이드 매매체결시스템에서 FortiGate HA로 5계층 망분리를 설계하고 FSC 본인가 심사를 통과시켰으며, Splunk ES와 n8n, FortiManager API로 보안 이벤트의 인지·분류·알림 흐름을 표준화했습니다. 이 과정에서 한국 금융 기업이 Zero Trust를 검토할 때 던지는 질문, 즉 "전자금융감독규정과 망분리 의무 안에서 이 아키텍처가 어떻게 작동하는가"에 답해야 했습니다. 이제는 Cloudflare의 입장에서 같은 질문에 답하고 싶습니다.

또한 제 포트폴리오 사이트 resume.jclee.me는 Cloudflare Workers에서 이력서 SSoT를 렌더링하며, GitHub Actions CI 검증과 Cloudflare Workers Builds 자동 배포, Loki 및 Workers Logs 기반 관측, Accept-Language 라우팅, CSP strict-dynamic까지 적용한 라이브 데모 자산입니다. 고객 기술 검토팀이 "직접 만져볼 수 있나요"라고 물을 때, 제가 직접 운영하는 엣지 인프라를 즉각적인 답변으로 보여줄 수 있습니다.

## 직무 역량

**금융권 규제 환경과 Zero Trust 아키텍처의 통역**

금융권 규제 환경에서 Zero Trust를 통역하는 역량은 규제 언어로 고객의 우려를 먼저 풀어내는 데서 출발합니다. 넥스트레이드 프로젝트에서 FSC 본인가 심사를 통과하며 금융위원회가 요구하는 망분리, 접근 제어, 감사 추적 기준을 직접 설계·문서화한 경험이 있습니다. FortiGate HA 환경에서 VPN, SSL-VPN, NAC, DLP를 통합 운영하면서 전자금융감독규정과 실제 보안 아키텍처가 만나는 지점을 다뤄왔습니다. 이 경험은 Cloudflare One을 평가하는 한국 금융 고객의 기술적 우려를 규제 언어로 먼저 풀어내는 데 직접 활용될 수 있습니다.

**Cloudflare 개발자 플랫폼 운영 경험**

Cloudflare One SE는 고객이 직접 만져볼 수 있는 엣지 인프라를 라이브 데모로 보여줄 수 있는 역량이 필요합니다. 저는 resume.jclee.me를 Cloudflare Workers로 빌드하고 운영하면서 이력서 SSoT 렌더링, GitHub Actions CI 검증, Cloudflare Workers Builds 기반 자동 배포, Loki 및 Workers Logs 관측, Accept-Language 헤더 기반 리다이렉트, CSP strict-dynamic with nonce까지 프로덕션 환경에서 다뤄왔습니다. build-time HTML injection으로 버전과 배포 타임스탬프를 주입하고, Accept-Language 라우팅으로 다국어 지원을 구현했으며, CSP strict-dynamic으로 보안 헤더를 관리했습니다. 고객 기술 검토팀이 "직접 만져볼 수 있나요"라고 물을 때, 제 포트폴리오가 즉각적인 답변이 됩니다.

**인접 스택에 대한 실무 이해**

기존 FortiGate·NAC·NSX-T 환경과 Cloudflare One이 공존하는 마이그레이션 시나리오를 그리려면 인접 스택에 대한 실무 이해가 필수입니다. 저는 FortiGate SSL-VPN 환경에서 엔드포인트 보호 에이전트와 VPN 클라이언트 프로파일 충돌을 tcpdump로 root cause 분석한 경험, NSX-T DFW 분산 방화벽으로 동서 트래픽 마이크로세그멘테이션을 구현한 경험, Splunk ES에서 dest_port 기준 탐지 룰을 설계·운영한 경험을 보유하고 있습니다. 이러한 인접 스택 지식은 고객이 기존 환경에서 Cloudflare One으로 점진 전환할 때 마이그레이션 시나리오를 함께 그리는 데 필수적입니다.

**자동화를 통한 운영 효율화**

반복 작업을 자동화해 운영팀이 Cloudflare를 자체적으로 운영할 수 있도록 만드는 역량은 SE의 핵심 운영 자산입니다. 메타넷엠플랫폼에서 Ansible로 서버 프로비저닝을 자동화했고, 아이티센 CTS에서 FortiManager JSON-RPC API로 방화벽 정책 조회를 자동화했습니다. n8n으로 Splunk Saved Search와 Slack, SMS를 연동하여 보안 이벤트가 발생부터 담당자 인지까지의 흐름을 표준화했습니다. SE로서 고객의 PoC 환경을 빠르게 구성하고, 반복적인 검증 절차를 자동화하며, 운영팀이 Cloudflare를 자체적으로 운영할 수 있도록 자동화 플레이북을 전달하는 역량은 운영 사이드 8년 경험에서 나온 자연스러운 연장선입니다.

## 협업 및 커뮤니케이션

보안 인프라를 고객 사이드에서 운영하며 가장 중요하게 배운 것은 "기술적 정확성만으로는 부족하다"는 점입니다. 넥스트레이드에서 개발팀, 인프라팀, 감사팀과 협업할 때, 보안 요건을 전달하는 것을 넘어 "이렇게 설계하면 규제도 통과하면서 원하시는 기능을 구현할 수 있습니다"라는 대안을 제시해야 실제로 변경이 일어났습니다.

Cloudflare One SE는 기술팀과 구매팀, 컴플라이언스팀 사이의 통역자 역할을 해야 합니다. 저는 금융감독원 감사 대응 경험으로 컴플라이언스팀의 언어를, Splunk ES 탐지 룰 설계 경험으로 보안운영팀의 언어를, Cloudflare Workers 운영 경험으로 개발팀의 언어를 각각 이해하고 있습니다. 한국어와 영어 모두 업무 가능한 언어 능력은 APAC 지역 고객과의 협업에서도 유효할 것입니다.

## 성장 의지

Cloudflare One 제품군(Gateway, Access, Tunnel, Magic WAN, Browser Isolation, Email Security)에 대한 hands-on 깊이를 지속적으로 확장하고 있습니다. 현재는 Cloudflare Access와 Zero Trust 정책을 개인 홈랩에 도입하며 학습 중이며, Logpush를 통한 Splunk HEC 통합 시나리오도 검증 중입니다.

AWS 프로덕션 경험은 아직 없어 SAA-C03 취득을 2026년 Q3 목표로 준비하고 있습니다. 다만 Cloudflare 플랫폼 운영 깊이와 금융 규제 컨텍스트가 이 직무의 핵심 요건과 직접 맞닿아 있다고 봅니다. SE라는 직무는 처음이지만, 8년간 고객 사이드에서 SE가 던진 질문을 받아온 경험이 오히려 고객의 입장을 이해하는 데 강점이 될 것입니다.

## 맺음말

Cloudflare One Specialist Solutions Engineer로서 한국 금융 기업의 Zero Trust 도입을 기술적 설계와 규제 컨텍스트를 함께 다루는 통역자 역할을 하고 싶습니다. 운영 사이드 8년의 현장 경험과 Cloudflare Workers 기반 엣지 인프라 운영 역량을 바탕으로, 고객이 Cloudflare One의 가치를 직접 확인할 수 있도록 연결하겠습니다.

감사합니다.

---

**이재철**  
<qws941@kakao.com> | 010-5757-9592
