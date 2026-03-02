# AI 기반 고급 매칭 시스템 설정 가이드

## 개요

통합 자동화 채용 지원 시스템에 OpenCode AI 기반 고급 매칭 기능을 추가하여 더욱 정확하고 지능적인 채용 매칭을 제공합니다.

## AI 기능 특징

### 🤖 OpenCode AI 기반 분석
- **자연어 처리**: 한국어 텍스트의 맥락 이해 및 분석
- **지능형 매칭**: 단순 키워드 매칭이 아닌 의미론적 매칭
- **예측 분석**: 합격 확률 예측 및 성공 요인 분석
- **개인화 조언**: 지원자 맞춤 커리어 조언 제공

### 🎯 고급 매칭 알고리즘
- **이력서 심층 분석**: 경력, 기술, 성격 특성 추출
- **채용 공고 이해**: 요구사항, 기업 문화, 근무 조건 분석
- **종합 매칭 점수**: 기술(40%) + 경력(25%) + 프로젝트(20%) + 문화(10%) + 근무조건(5%)
- **합격 확률 예측**: 머신러닝 기반 성공 확률 계산

## 환경 설정

### 1. OpenCode AI API 키 설정

#### Anthropic 계정 생성 및 API 키 발급
1. [Anthropic Console](https://console.anthropic.com/) 접속
2. 계정 생성 및 로그인
3. API Keys 메뉴에서 새 키 생성
4. 키 이름을 "Resume Auto Apply"로 설정
5. 생성된 API 키 복사

#### 환경 변수 설정
```bash
# ~/.bashrc 또는 ~/.zshrc에 추가
export ANTHROPIC_API_KEY="your_claude_api_key_here"
export CLAUDE_API_KEY="your_claude_api_key_here"  # 호환성을 위해 둘 다 설정

# 또는 .env 파일 생성 (apps/job-server/.env)
ANTHROPIC_API_KEY=your_claude_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
```

#### API 키 검증
```bash
# API 키 유효성 확인
curl -X POST https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "OpenCode-3-haiku-20240307",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 2. 시스템 요구사항

#### Node.js 버전
```bash
node --version  # 20.0.0 이상 권장
```

#### 의존성 설치
```bash
cd apps/job-server
npm install
```

#### 메모리 설정 (고성능 AI 처리용)
```bash
# package.json scripts에 추가
"ai-search": "node --max-old-space-size=4096 src/auto-apply/cli/index.js ai_search",
"ai-unified": "node --max-old-space-size=4096 src/auto-apply/cli/index.js ai_unified"
```

## AI 기능 사용법

### 1. AI 기반 채용공고 검색

#### 기본 AI 검색
```bash
# AI 기반 지능형 검색
node src/auto-apply/cli/index.js ai_search "DevSecOps" 10

# 더 자세한 분석을 위해 메모리 증가
npm run ai-search "보안 엔지니어" 5
```

#### AI 검색 결과 해석
```
🤖 AI 기반 검색: DevSecOps (최대 10개)

📊 기본 검색 완료: 64개 공고 발견
🧠 AI 기반 재매칭 시작...

🎯 AI 매칭 완료: 8개 고품질 매칭

--- AI 기반 추천 공고 ---
[92%] Senior DevSecOps Engineer 🤖 AI 매칭 (신뢰도: high)
   🏢 TechCorp | 📍 서울
   🔗 https://wanted.co.kr/wd/12345
   💡 기술 스택 일치도 높고, 리드 경험 요구사항에 부합
   📈 합격 확률: 78%
```

### 2. AI 기반 통합 시스템

#### AI 강화 자동 지원
```bash
# AI 기반 통합 워크플로우
node src/auto-apply/cli/index.js ai_unified --max=3

# 실제 지원 실행
node src/auto-apply/cli/index.js ai_unified --apply --max=5
```

#### AI 분석 결과
```
🚀 AI 기반 통합 시스템

🔧 AI 기반 시스템 구성:
   플랫폼: wanted, linkedin, jobkorea, saramin
   키워드: DevSecOps, 보안 엔지니어, Security Engineer
   AI 매칭: 활성화

📊 AI 강화 결과:
   검색: 107건
   AI 매칭: 12건
   지원: 3건

💡 AI 인사이트:
   • 현재 시장에서 DevOps와 보안의 결합이 강력한 트렌드
   • 스타트업보다는 대기업 포지션이 성공률 높음
   • 영어 요구사항이 있는 포지션이 경쟁력 높음
```

### 3. AI 기반 커리어 조언

#### 개인화된 조언 받기
```bash
# 특정 채용 공고에 대한 AI 조언
node src/auto-apply/cli/index.js advice "https://www.wanted.co.kr/wd/12345"
```

#### AI 조언 결과 예시
```
🤖 AI 기반 커리어 조언 생성 중...
채용 공고: https://www.wanted.co.kr/wd/12345

🎯 AI 커리어 조언 결과:

📊 적합도: 매우 높음 (92% 매칭)

📚 준비 필요 사항:
   • AWS DevOps Engineer 자격증 취득 권장
   • Kubernetes 실무 경험 더 강조
   • 영어 기술 문서 작성 능력 강화

🎤 면접 강조 포인트:
   • 보안 자동화 파이프라인 구축 경험 구체적으로 설명
   • 클라우드 네이티브 아키텍처 설계 사례 준비
   • 협업 툴 활용 경험 강조

💰 연봉 협상 전략: 현재 시장 가치 고려 시 20-30% 상향 협상 가능

🚀 커리어 발전 방향: DevSecOps 전문가로 포지셔닝 강화

📋 다음 단계:
   • 관련 자격증 취득
   • 오픈소스 보안 프로젝트 기여
   • 기술 블로그 운영 시작
```

## 고급 설정

### AI 모델 선택
```javascript
// apps/job-server/config/ai-config.json
{
  "OpenCode": {
    "model": "OpenCode-3-5-sonnet-20241022",
    "maxTokens": 4000,
    "temperature": 0.1
  },
  "matching": {
    "weights": {
      "skills": 0.4,
      "experience": 0.25,
      "projects": 0.2,
      "culture": 0.1,
      "workConditions": 0.05
    }
  }
}
```

### 캐싱 및 성능 최적화
```javascript
// AI 분석 결과 캐싱
const aiCache = new Map();

// 동일한 채용 공고 재분석 방지
if (aiCache.has(jobPosting.url)) {
  return aiCache.get(jobPosting.url);
}
```

### 배치 처리
```bash
# 여러 채용 공고 일괄 AI 분석
node src/auto-apply/cli/index.js ai_search "DevSecOps" 50

# 배치 모드에서 메모리 사용량 모니터링
htop  # 또는 top 명령어로 모니터링
```

## 문제 해결

### 일반적인 문제들

#### Q: OpenCode API 키 오류
```bash
# API 키 확인
echo $ANTHROPIC_API_KEY

# API 키 유효성 테스트
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     https://api.anthropic.com/v1/messages
```

#### Q: AI 분석이 너무 느림
```bash
# 메모리 증가
node --max-old-space-size=8192 src/auto-apply/cli/index.js ai_search "keyword" 5

# 분석 범위 축소
node src/auto-apply/cli/index.js ai_search "keyword" 3
```

#### Q: AI 분석 결과가 부정확함
```bash
# 기본 매칭으로 폴백
node src/auto-apply/cli/index.js search "keyword" 10

# AI 분석 로그 확인
DEBUG=ai* node src/auto-apply/cli/index.js ai_search "keyword" 5
```

#### Q: API 사용량 초과
```bash
# 사용량 확인
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     https://api.anthropic.com/v1/usage

# 일일 제한 확인 및 조정
# https://console.anthropic.com/ 에서 확인
```

### 성능 모니터링

#### API 사용량 추적
```bash
# 월별 사용량 스크립트
cat > check-api-usage.sh << 'EOF'
#!/bin/bash
echo "🔍 OpenCode API 사용량 확인"

# 현재 달의 사용량 조회
curl -s -H "x-api-key: $ANTHROPIC_API_KEY" \
     https://api.anthropic.com/v1/usage | jq '.usage.current_month'

echo "💡 사용량 최적화 팁:"
echo "  • 불필요한 재분석 방지"
echo "  • 캐싱 활용"
echo "  • 배치 처리 고려"
EOF

chmod +x check-api-usage.sh
./check-api-usage.sh
```

## 비용 및 사용량 관리

### OpenCode AI 비용 구조
- **OpenCode 3 Haiku**: $0.25/1K tokens (가장 저렴)
- **OpenCode 3 Sonnet**: $3.00/1K tokens (균형)
- **OpenCode 3 Opus**: $15.00/1K tokens (가장 강력)

### 비용 절감 전략
```bash
# 1. 모델 선택 최적화
export CLAUDE_MODEL="OpenCode-3-haiku-20240307"  # 저비용 모델

# 2. 캐싱 활용
# 동일한 분석 반복 방지

# 3. 배치 처리
# 여러 요청을 한 번에 처리

# 4. 선택적 AI 사용
# 중요 공고만 AI 분석
```

### 월별 비용 추정
```
일일 검색 20개 × AI 분석:
- Haiku: 약 $0.5/일 = $15/월
- Sonnet: 약 $6/일 = $180/월
- Opus: 약 $30/일 = $900/월
```

## 다음 단계

### 확장 가능성
1. **다국어 지원**: 영어, 일본어 채용 공고 분석
2. **산업별 특화**: 금융, 게임, 이커머스 등 분야별 모델
3. **실시간 학습**: 사용자 피드백 기반 모델 개선
4. **통합 API**: 외부 시스템과의 AI 매칭 API 제공

### 모니터링 및 개선
1. **A/B 테스트**: AI vs 기본 매칭 정확도 비교
2. **사용자 피드백**: AI 조언의 유용성 평가
3. **성능 메트릭**: 응답 시간, 정확도, 사용자 만족도 측정

---

## 🎉 AI 기반 고급 매칭 시스템 활성화 완료!

이제 시스템은 다음과 같은 AI 기능을 제공합니다:

- 🤖 **지능형 채용 매칭**: 단순 키워드가 아닌 의미 이해
- 🎯 **합격 확률 예측**: 데이터 기반 성공 예측
- 💡 **개인화 조언**: 맞춤형 커리어 전략
- 📈 **시장 인사이트**: 채용 트렌드 및 인사이트
- ⚡ **고성능 처리**: 최적화된 OpenCode AI 통합

**시스템 상태**: 🟢 **AI 고급 매칭 모드 활성화** 🚀