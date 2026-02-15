# 토스 Server Developer (Platform) 요구사항 분석 (2025.09.30)

## 📋 공식 채용공고 분석

**출처**: https://toss.im/career/job-detail?job_id=4071145003

---

## 🎯 핵심 역할 (Responsibilities)

### 1. 공통 서비스 제공
- **Distributed Locks**: 분산 환경에서의 동기화 메커니즘
- **Logging**: 통합 로깅 시스템 운영
- **Metrics**: 메트릭 수집 및 모니터링

### 2. 성능 개선
- **Profiling Tools**: 애플리케이션 성능 분석 도구 운영
- **Hardware Acceleration**: 하드웨어 가속 기술 활용

### 3. Gateway 운영
- **Authentication**: 인증 시스템 통합
- **Security Modules**: 보안 모듈 운영
- **Degrade Features**: 서비스 저하(Graceful Degradation) 기능

### 4. 정적/동적 분석
- **Pinpoint**: APM 도구를 통한 성능 추적
- **SonarQube**: 코드 품질 정적 분석

### 5. 안정적인 서비스 운영
- 토스 플랫폼 전체의 안정적인 서비스 운영 지원

---

## 🛠 필수 기술 스택

### Language & Build
```yaml
핵심:
  - Kotlin          ⚠️ 학습 필요
  - Java            ✅ 유사 경험 (Node.js, Python)
  - Gradle          ⚠️ 학습 필요 (Maven 경험 있음)
```

### Framework
```yaml
Spring 생태계:
  - Spring MVC      ⚠️ 학습 필요
  - Spring Webflux  ⚠️ 학습 필요 (Reactive Programming)
  - Spring Boot     ⚠️ 학습 필요
  - Spring Cloud Gateway  ⚠️ 학습 필요
  - JPA/Hibernate   ⚠️ 학습 필요

네트워크:
  - Netty           ⚠️ 학습 필요 (고성능 비동기 네트워크 프레임워크)
```

### Container & Orchestration
```yaml
필수:
  - Kubernetes      ✅ POC 경험 있음 (콴텍투자일임)
  - Istio           ⚠️ 학습 필요 (Service Mesh)
  - Docker          ✅ Production 5개 시스템 운영
```

### Database & Cache
```yaml
지원 경험:
  - MySQL           ⚠️ PostgreSQL 경험으로 대체 가능
  - MongoDB         ⚠️ 학습 필요 (NoSQL)
  - Redis           ✅ Redis 7 Production 운영
```

### Messaging & Observability
```yaml
강점 영역:
  - Kafka           ⚠️ 학습 필요 (메시징 시스템)
  - ELK Stack       ✅ Wazuh + Kibana 실무 경험
  - Prometheus      ✅ Production 운영
```

### CI/CD
```yaml
경험:
  - Jenkins         ⚠️ GitLab CI/CD, GitLab CI 경험
```

---

## 💪 현재 이력서 매칭도 분석

### 강점 영역 (90%+ 매칭)
| 요구사항 | 현재 경험 | 매칭도 |
|---------|----------|--------|
| **Monitoring & Logging** | Grafana/Prometheus/Loki/Tempo 통합 운영 | ⭐⭐⭐⭐⭐ (100%) |
| **ELK Stack** | Wazuh + Kibana 실무 경험 | ⭐⭐⭐⭐⭐ (100%) |
| **Redis** | Redis 7 Production 운영 | ⭐⭐⭐⭐⭐ (100%) |
| **Docker** | Production 5개 시스템 운영 | ⭐⭐⭐⭐⭐ (100%) |
| **Gateway 운영** | Cloudflare Workers, Traefik, HAProxy | ⭐⭐⭐⭐☆ (90%) |
| **Authentication** | IAM, VPN, NAC 통합 인증 경험 | ⭐⭐⭐⭐☆ (85%) |

### 준비 필요 영역 (40-70% 매칭)
| 요구사항 | 현재 상태 | 학습 우선순위 |
|---------|----------|--------------|
| **Kotlin** | 미경험 (Java 유사 언어) | 🔴 HIGH |
| **Spring Ecosystem** | 미경험 (Flask, Node.js 경험) | 🔴 HIGH |
| **Kubernetes + Istio** | Kubernetes POC 경험, Istio 미경험 | 🟡 MEDIUM |
| **Netty** | 미경험 (비동기 네트워크 프레임워크) | 🟡 MEDIUM |
| **Kafka** | 미경험 (메시징 시스템) | 🟡 MEDIUM |
| **MongoDB** | 미경험 (PostgreSQL 경험) | 🟢 LOW |
| **MySQL** | PostgreSQL 경험으로 대체 가능 | 🟢 LOW |

---

## 🎯 이력서 개선 전략

### 1. 강점 영역 부각 (즉시 적용 가능)
```markdown
✅ Monitoring & Observability
   - Grafana/Prometheus/Loki/Tempo Full-Stack Observability
   - ELK Stack (Wazuh + Kibana) 실무 운영
   - 24/7 실시간 모니터링 및 알림 시스템

✅ Container & Orchestration
   - Docker Production 환경 5개 시스템 운영
   - Kubernetes POC 경험 (PB 플랫폼)
   - Private Registry 운영

✅ API Gateway & Load Balancing
   - Cloudflare Workers Edge API
   - Traefik, HAProxy, F5 실무 경험
   - 전국 동시 접속 처리 아키텍처

✅ High Performance & Scalability
   - Redis 7 기반 초당 10만 이벤트 처리
   - 99.9% 가용성 달성
   - MTTR 70% 개선

✅ Security & Authentication
   - IAM, VPN, NAC 통합 인증
   - 15종 보안 솔루션 통합 운영
```

### 2. 부족 영역 학습 의지 표명
```markdown
⚠️ 학습 계획 명시:
   - Kotlin/Spring Boot: 공식 문서 및 Udemy 강의 (주 10시간)
   - Istio: Kubernetes 기반 Service Mesh 학습 (주 5시간)
   - Netty: 고성능 네트워크 프로그래밍 실습 (주 5시간)
   - Kafka: 메시징 시스템 아키텍처 이해 (주 3시간)
```

### 3. 유사 경험 강조
```markdown
✅ Backend Framework 경험:
   - Flask 3.0 (Python) → Spring Boot와 유사한 역할
   - Node.js → 비동기 프로그래밍 경험
   - RESTful API 설계 및 운영

✅ Database 경험:
   - PostgreSQL 15 → MySQL과 유사한 RDBMS
   - Redis 7 → In-Memory Database

✅ Reactive Programming 개념:
   - Node.js 비동기 처리
   - Cloudflare Workers Edge Computing
```

---

## 📝 자기소개서 개선 방향

### 현재 자기소개서 문제점
1. **"8년간"** → 실제 경력 7년으로 수정 완료 ✅
2. 토스 요구 기술(Kotlin, Spring, Istio) 언급 부재
3. 학습 의지 및 빠른 적응력 강조 부족

### 개선된 자기소개서 구조
```markdown
[1단락] 핵심 역량 요약
- Monitoring & Observability 전문성
- Container Orchestration 경험
- API Gateway 및 대용량 트래픽 처리

[2단락] 토스 요구사항 매칭
- 공통 서비스(Logging, Metrics) 구축 경험
- Gateway 운영(Authentication, Security)
- 성능 개선 및 안정성 확보 실적

[3단락] 부족 영역 학습 의지
- Kotlin/Spring Boot 학습 계획
- Istio Service Mesh 학습 진행 중
- 빠른 기술 습득 능력 증명 (사례)

[4단락] 토스 Platform 팀 기여 포인트
- 개발자 생산성 향상
- 플랫폼 안정성 강화
- 기술 문화 기여
```

---

## 🚀 즉시 적용 가능한 개선사항

### 1. 기술 스택 섹션 재구성
```markdown
✅ 토스 요구 기술 우선 배치:
   - Container: Docker ✅, Kubernetes (POC) ✅, Istio (학습 중) ⚠️
   - Monitoring: Prometheus ✅, ELK Stack ✅
   - Database: Redis ✅, PostgreSQL ✅, MySQL (학습 중) ⚠️
   - Messaging: Kafka (학습 중) ⚠️
```

### 2. 프로젝트 설명 강화
```markdown
✅ 대용량 트래픽 처리 강조:
   - "초당 10만 이벤트 처리 가능" → 토스의 대용량 트래픽 요구사항 매칭
   - "75,000% 확장 여유" → Scalability 입증

✅ Gateway 경험 부각:
   - Cloudflare Workers Edge API
   - Traefik Reverse Proxy
   - Authentication 통합
```

### 3. 성과 지표 정량화
```markdown
✅ 현재:
   - 99.9% 가용성 달성
   - MTTR 70% 개선
   - 장애율 35% 감소
   - 업무 시간 50~95% 단축

✅ 추가:
   - 동시 접속자 처리량 (명확한 수치)
   - API 응답 시간 (ms 단위)
   - Throughput (TPS, QPS)
```

---

## 📊 최종 매칭도 평가

### 종합 점수: **72/100** (보통 → 우수 목표)

| 카테고리 | 현재 점수 | 목표 점수 | 개선 방법 |
|---------|----------|----------|----------|
| Monitoring & Observability | 100/100 | 100/100 | ✅ 유지 |
| Container & Orchestration | 70/100 | 85/100 | Istio 학습, Kubernetes 경험 강화 |
| Backend Framework | 40/100 | 70/100 | Kotlin/Spring Boot 학습 시작 |
| Database & Cache | 80/100 | 90/100 | MySQL 학습, MongoDB 기초 |
| Messaging & Queue | 30/100 | 60/100 | Kafka 학습 및 POC |
| CI/CD | 70/100 | 80/100 | Jenkins 학습 |
| Gateway & Authentication | 85/100 | 90/100 | ✅ 유지 및 사례 보강 |

### 개선 후 예상 점수: **82/100** (우수)

---

## 🎯 1주일 내 실행 가능한 액션 아이템

### Day 1-2: 이력서 업데이트
- [x] 토스 요구사항 분석 완료
- [ ] 자기소개서 재작성 (토스 요구사항 반영)
- [ ] 기술 스택 섹션 재배치
- [ ] 프로젝트 설명 강화 (대용량 트래픽 강조)

### Day 3-4: 부족 기술 빠른 학습
- [ ] Kotlin 기초 (공식 문서 1-2시간)
- [ ] Spring Boot Quickstart (2-3시간)
- [ ] Istio 개념 이해 (공식 문서 1-2시간)

### Day 5-6: 증거 자료 준비
- [ ] Kubernetes 경험 구체화 (POC 상세 설명)
- [ ] 대용량 트래픽 처리 사례 정리
- [ ] Gateway 운영 사례 상세화

### Day 7: 최종 검토
- [ ] 이력서 전체 일관성 점검
- [ ] PDF 재생성
- [ ] 지원 서류 최종 제출

---

**작성일**: 2025-09-30
**분석 기준**: 토스 공식 채용공고 (job_id=4071145003)
**목표**: 매칭도 72% → 82% 향상