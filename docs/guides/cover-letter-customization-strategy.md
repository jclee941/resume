# 회사별 자소서 커스터마이징 전략

## 직무별 강조 포인트

### DevSecOps (크래프톤, 스캐터랩)

- Terraform IaC 보안 점검 역량
- AWS CloudTrail/GuardDuty 통합 분석
- CI/CD 파이프라인 보안 자동화
- FortiGate HA + Ansible 정책 자동화
- **키워드**: DevSecOps, shift-left, IaC, CSPM, container security

### SRE (당근, LINE, 요기요, 토스증권)

- FortiGate HA 99.99% 가용성 설계
- Prometheus/Grafana 관측성 플랫폼 운영
- 보안 이벤트 30초 내 알림 체계
- 500대+ 서버 Ansible 자동화
- **키워드**: SRE, reliability, observability, incident response, automation

### 보안 엔지니어 (카카오뱅크, 두나무, 뱅크샐러드)

- Splunk ES 32개 SIEM 탐지 룰
- 금융위 본인가 심사 통과
- ISMS-P 인증 대응
- n8n 보안 운영 자동화
- **키워드**: SIEM, SOAR, 침해 대응, 보안 관제, ISMS-P

### Cloud Security (배달의민족, 티맵모빌리티)

- AWS VPC/SG/WAF 보안 운영
- Terraform IaC 전환
- CloudTrail+GuardDuty 통합 모니터링
- **키워드**: cloud security, AWS, IaC, 클라우드 보안

## 회사 규모별 톤 조절

### 대기업/금융 (카카오뱅크, 토스, LINE)

- 톤: 정중하고 체계적
- 강조: 컴플라이언스, 금융 규제, 대규모 인프라 경험
- 약화: 스타트업 문화, 빠른 실행

### 유니콘/스케일업 (당근, 크래프톤, 배민)

- 톤: 자신감 있고 성과 중심
- 강조: 자동화, 효율화, 정량 성과
- 약화: 보수적 접근, 절차 중심

### 보안 전문 기업 (로그프레소, 안랩)

- 톤: 기술 깊이 중심
- 강조: SIEM 탐지 룰 상세, 보안 장비 운영 노하우
- 약화: 클라우드/DevOps (보조 역량으로만)

## 자동화 적용

cover-letter-generator.js의 `detectRole()` 함수가 JD 포지션명에서 직무 자동 감지 → 해당 직무 템플릿 적용 → 매칭 성과 자동 삽입
