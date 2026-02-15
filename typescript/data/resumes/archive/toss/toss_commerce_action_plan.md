# 토스 커머스 지원 액션 플랜

**목표**: Server Developer (Platform) 합격
**작성일**: 2025년 9월 30일

---

## 🚨 즉시 조치 필요 (지원 전 - D-Day)

### 1. ❌ 프로덕션 시스템 2개 복구

#### 문제 상황
- **blacklist.jclee.me**: 404 에러
- **fortinet.jclee.me**: 연결 실패

#### 해결 방법

**Option A: 서비스 재시작 (권장)**
```bash
# 1. Docker 컨테이너 상태 확인
docker ps -a | grep -E "blacklist|fortinet"

# 2. 중단된 컨테이너 재시작
docker restart blacklist-container-name
docker restart fortinet-container-name

# 3. 로그 확인
docker logs blacklist-container-name --tail 50
docker logs fortinet-container-name --tail 50

# 4. 접근 테스트
curl -I https://blacklist.jclee.me
curl -I https://fortinet.jclee.me
```

**Option B: 이력서에서 링크 제거 (빠른 해결)**
```markdown
# 수정 전
🔗 Live Demo: https://blacklist.jclee.me

# 수정 후
🔗 Demo: Private Access (프로덕션 운영 중, 보안상 공개 제한)
```

**예상 소요 시간**: 30분

---

### 2. ✅ 이력서 최종 검토

#### 체크 항목

**A. 링크 동작 확인**
```bash
# 자동 확인 스크립트
curl -I https://qws941.github.io/resume/
curl -I https://github.com/qws941
curl -I https://splunk.jclee.me
curl -I https://safework.jclee.me
curl -I https://grafana.jclee.me
```

**B. 오타 및 맞춤법 검사**
- [ ] 연락처 정보 정확성 (이메일, 전화번호)
- [ ] 회사명 정확한 표기 (㈜아이티센 CTS 등)
- [ ] 숫자 표기 일관성 (99.9% vs 99.90%)
- [ ] 기간 계산 정확성 (8년 7개월)

**C. PDF 변환 (필요 시)**
```bash
# Markdown → PDF 변환 도구 사용
# 옵션 1: Pandoc
pandoc 토스커머스_Server_Developer_Platform_이재철.md -o 이재철_이력서.pdf

# 옵션 2: 온라인 변환기 사용
# https://www.markdowntopdf.com/
```

**예상 소요 시간**: 20분

---

### 3. 📝 온라인 지원서 작성

#### 토스 채용 페이지 접속
https://toss.im/career/jobs

#### 작성 양식 (예상)

**1) 지원 포지션 선택**
```
Server Developer (Platform) - 토스 커머스
```

**2) 기본 정보 입력**
```
이름: 이재철
이메일: qws941@kakao.com
전화번호: 010-5757-9592
포트폴리오: https://qws941.github.io/resume/
GitHub: https://github.com/qws941
```

**3) 자기소개서 (500자)**
```
[company-specific/토스커머스_제출용_이력서.pdf.md 파일의
"자기소개서 (500자 기준)" 섹션 복사]

안녕하세요, Server Developer (Platform) 포지션에 지원하는 이재철입니다.

8년간 금융·제조·교육 산업에서 대규모 인프라 운영, 플랫폼 안정화,
자동화 시스템을 구축했습니다.

[핵심 역량]
• 대용량 처리: 초당 10만 이벤트 처리 아키텍처 설계
• Monitoring: Grafana/Prometheus/Loki 통합, MTTR 70% 개선
• 고가용성: 99.9% 가용성 달성, 자동 롤백 시스템 구현
• 자동화: 업무 시간 50~95% 단축, 장애율 35% 감소

현재 5개 프로덕션 시스템을 운영하며 실전 경험을 축적했습니다.
토스 커머스 Platform 팀에서 개발자 생산성 향상과
플랫폼 안정성 강화에 기여하고 싶습니다.

포트폴리오: https://qws941.github.io/resume/
```

**4) 지원 동기 (700자)**
```
[company-specific/토스커머스_제출용_이력서.pdf.md 파일의
"지원 동기 (700자 기준)" 섹션 복사]
```

**5) 경력 사항**
```
[company-specific/토스커머스_Server_Developer_Platform_이재철.md 파일의
"경력사항" 섹션 참고하여 입력]

최신 경력부터:
1. ㈜아이티센 CTS (2025.03 ~ 현재, 7개월)
2. ㈜가온누리정보시스템 (2024.03 ~ 2025.02, 11개월)
3. ㈜콴텍투자일임 (2022.08 ~ 2024.03, 1년 7개월)
...
```

**6) 기술 스택**
```
우선순위 순서:
1. Docker, Kubernetes, Portainer API
2. Grafana, Prometheus, Loki, Tempo
3. Python, Shell, Ansible, Terraform
4. Cloudflare Workers, Traefik, HAProxy
5. PostgreSQL 15, Redis 7
6. AWS (VPC, IAM, EC2, S3)
7. Node.js, Flask, JavaScript/TypeScript
```

**7) 첨부 파일**
- [ ] 이력서 PDF 또는 Markdown 파일 첨부

**예상 소요 시간**: 40분

---

## 📅 지원 후 일정 (D+1 ~ D+7)

### Day 1-2: 면접 준비 강화

#### 1. 면접 질문 답변 암기 (3회 반복)

**방법**:
```
1회차: 답변 전체 읽기 (company-specific/토스커머스_지원질문_답변.md)
2회차: 키워드만 보고 말로 설명
3회차: 거울 보고 실전처럼 연습
```

**핵심 5개 질문 우선 암기**:
1. 자기소개 (1분)
2. 왜 토스 커머스에 지원하셨나요?
3. 가장 자랑스러운 프로젝트는?
4. 대규모 장애 대응 경험
5. 마지막으로 하고 싶은 말

**예상 소요 시간**: 매일 1시간, 총 2시간

---

#### 2. STAR 기법 연습

**STAR 구조**:
- **S (Situation)**: 상황 설명
- **T (Task)**: 해결해야 할 과제
- **A (Action)**: 내가 취한 행동
- **R (Result)**: 결과 및 성과

**연습 예시**:
```
Q. 가장 자랑스러운 프로젝트는?

S: 금융보안원 IP 블랙리스트를 매일 수동으로 1시간씩 수집하던 작업
T: 자동화로 시간 단축 + 오류 제거가 목표
A: Python + Flask + PostgreSQL로 자동 수집 시스템 구축
   AI 기반 CI/CD 파이프라인 통합
   Portainer API로 무중단 배포 구현
R: 95% 시간 단축 (1시간 → 3분)
   99.9% 가용성 달성
   MTTR 70% 개선
```

**예상 소요 시간**: 1시간

---

### Day 3-4: 토스 리서치

#### 1. 토스 문화/가치관 학습

**방법**:
```bash
# 토스 공식 블로그
https://toss.im/career/article

# 토스 테크 블로그
https://toss.tech/

# 토스 채용 인터뷰
YouTube에서 "토스 개발자 인터뷰" 검색
```

**학습 목표**:
- [ ] 토스의 핵심 가치 3가지 이해
- [ ] Platform 팀 업무 방식 파악
- [ ] 토스 개발 문화 (코드 리뷰, 협업 등)

**예상 소요 시간**: 2시간

---

#### 2. 최신 토스 커머스 뉴스 확인

**검색 키워드**:
```
"토스 커머스" + "2025"
"토스 쇼핑" + "최근"
"토스 페이먼츠" + "뉴스"
```

**확인 사항**:
- [ ] 최근 서비스 런칭 소식
- [ ] 기술 스택 변경 사항
- [ ] 채용 관련 이벤트

**예상 소요 시간**: 1시간

---

### Day 5-7: 기술 학습 (Istio)

#### Istio 기초 학습

**목표**: 면접 시 "Istio 학습 중"이라고 자신 있게 말할 수 있는 수준

**학습 자료**:
```
1. 공식 문서
   https://istio.io/latest/docs/

2. YouTube 튜토리얼
   "Istio Tutorial for Beginners"

3. Hands-on Lab
   https://www.katacoda.com/courses/istio
```

**학습 계획**:
```
Day 5: Istio 개념 이해 (Service Mesh란?)
Day 6: Istio 아키텍처 (Control Plane, Data Plane)
Day 7: 간단한 실습 (Local Minikube + Istio 설치)
```

**예상 소요 시간**: 매일 1시간, 총 3시간

---

## 📞 면접 연락 후 (D+7 ~ 면접일)

### 1. 모의 면접 (셀프)

**방법**:
1. 스마트폰으로 자신을 녹화
2. 15개 질문 전체 답변
3. 재생하며 개선점 파악

**체크 포인트**:
- [ ] 눈 맞춤 (카메라 응시)
- [ ] 말 속도 (너무 빠르지 않게)
- [ ] 구체적 수치 언급 (99.9%, 70%, 95%)
- [ ] 자신감 있는 태도

**예상 소요 시간**: 2시간

---

### 2. 기술 질문 대비

**예상 기술 질문**:
```
Q1. Kubernetes와 Docker의 차이는?
Q2. Prometheus와 Grafana의 역할 차이는?
Q3. Blue-Green vs Canary 배포 전략?
Q4. MTTR을 70% 개선한 구체적 방법?
Q5. 99.9% 가용성을 어떻게 달성했나?
```

**준비 방법**:
각 질문에 대해 **3분 이내 답변** 준비
실무 경험 기반 구체적 예시 포함

**예상 소요 시간**: 2시간

---

### 3. 역질문 준비

**좋은 역질문 예시**:
```
1. "Platform 팀이 현재 가장 집중하고 있는 기술적 과제는 무엇인가요?"

2. "합류 후 첫 3개월 동안 어떤 프로젝트에 참여하게 되나요?"

3. "Platform 팀의 온콜(On-call) 운영 방식이 궁금합니다."

4. "토스 커머스의 트래픽 규모와 성장 속도가 궁합니다."

5. "Platform 팀에서 사용하는 기술 스택 중 특별히 중요한 것이 있나요?"
```

**준비 개수**: 5개 이상

**예상 소요 시간**: 30분

---

## 📋 체크리스트 요약

### ✅ 지원 전 (즉시)
- [ ] blacklist.jclee.me, fortinet.jclee.me 서비스 복구
- [ ] 이력서 링크 동작 확인
- [ ] 오타 및 맞춤법 최종 검사
- [ ] PDF 변환 (필요 시)
- [ ] 토스 채용 페이지 온라인 지원
- [ ] 이력서 파일 첨부

### ✅ 지원 후 (D+1 ~ D+7)
- [ ] 면접 질문 답변 3회 반복 암기
- [ ] STAR 기법 연습
- [ ] 토스 문화/가치관 학습 (2시간)
- [ ] 토스 커머스 최신 뉴스 확인
- [ ] Istio 기초 학습 (3일, 각 1시간)

### ✅ 면접 연락 후
- [ ] 모의 면접 셀프 녹화 (2시간)
- [ ] 기술 질문 대비 답변 준비
- [ ] 역질문 5개 이상 준비
- [ ] 면접 당일 준비물 확인

---

## 💡 우선순위 정리

### 🚨 High Priority (즉시)
1. **프로덕션 시스템 복구** (30분)
2. **온라인 지원서 제출** (40분)

### ⚠️ Medium Priority (D+1 ~ D+3)
3. **면접 질문 암기** (2시간)
4. **토스 리서치** (3시간)

### 📚 Low Priority (D+4 ~ D+7)
5. **Istio 학습** (3시간)
6. **모의 면접** (면접 연락 후)

---

## 📞 문의/지원

**토스 채용 페이지**: https://toss.im/career/jobs

**긴급 연락처**:
- 이메일: qws941@kakao.com
- 전화: 010-5757-9592

---

**작성일**: 2025년 9월 30일
**최종 업데이트**: 2025년 9월 30일 18:00

**행운을 빕니다! 🍀**