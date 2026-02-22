# Web Library Modules

이 디렉토리는 Resume Worker 생성에 사용되는 모듈화된 유틸리티 함수들을 포함합니다.

## 📁 모듈 구조

```
typescript/portfolio-worker/lib/
├── cache-headers.js    # 캐시 헤더 설정
├── cards.js            # Resume/Project 카드 HTML 생성
├── compression.js      # HTML/데이터 압축 유틸리티
├── config.js           # 설정 상수 및 템플릿 캐시
├── env.js              # 환경 변수 검증
├── templates.js        # HTML 템플릿 유틸리티
├── utils.js            # 파일 읽기, 해시 생성 등
└── validators.js       # data.json 스키마 검증
```

## 🔧 주요 모듈

### cache-headers.js

리소스 타입별 최적화된 캐시 헤더 제공

```javascript
const { getCacheHeaders } = require('./lib/cache-headers');

const headers = getCacheHeaders('/og-image.webp');
// { 'Cache-Control': 'public, max-age=31536000, immutable' }
```

**캐시 전략**:
- **Static** (이미지, 폰트): 1년 캐시, immutable
- **HTML**: 1시간 캐시, must-revalidate
- **API**: 캐시 없음
- **Service Worker**: 항상 최신
- **Documents** (PDF, DOCX): 1일 캐시

---

### cards.js

Resume 및 Project 카드 HTML 생성 (캐싱 지원)

```javascript
const { generateResumeCards, generateProjectCards } = require('./lib/cards');

const resumeHtml = generateResumeCards(data.resume, dataHash);
const projectHtml = generateProjectCards(data.projects, dataHash);
```

**특징**:
- 템플릿 캐싱으로 성능 최적화
- 접근성 속성 자동 추가 (ARIA)
- Highlighted 카드 지원

---

### compression.js

HTML 및 Base64 데이터 압축

```javascript
const { aggressiveMinify, chunkBase64 } = require('./lib/compression');

const compressed = aggressiveMinify(html);
const chunks = chunkBase64(base64String, 1000);
```

---

### config.js

전역 설정 상수 및 템플릿 캐시

```javascript
const { CONFIG, TEMPLATE_CACHE } = require('./lib/config');

console.log(CONFIG.LINK_LABELS.COMPLETE_PDF); // "Complete PDF"
```

**포함 내용**:
- URL 프리픽스
- 링크 타입/라벨
- 카드 클래스명
- 이스케이프 패턴
- 템플릿 캐시

---

### env.js

환경 변수 검증 및 기본값 제공

```javascript
const { validateEnv, getEnv } = require('./lib/env');

validateEnv(); // NODE_ENV 필수
const env = getEnv(); // { NODE_ENV, DEBUG, VERBOSE, DEPLOYED_AT }
```

---

### templates.js

HTML 템플릿 유틸리티 (링크 생성, CSP 해시 추출)

```javascript
const { generateLink, extractInlineHashes } = require('./lib/templates');

const link = generateLink({
  url: 'https://example.com',
  text: 'Example',
  className: 'link-primary',
  ariaLabel: 'Open example',
  isExternal: true
});

const { scriptHashes, styleHashes } = extractInlineHashes(html);
```

---

### utils.js

파일 읽기, 해시 생성 등 범용 유틸리티

```javascript
const { safeReadFile, generateHash, calculateDataHash } = require('./lib/utils');

const content = safeReadFile('data.json', 'utf-8');
const sha256 = generateHash(content);
const md5 = calculateDataHash(data);
```

---

### validators.js

data.json 스키마 검증

```javascript
const { validateData } = require('./lib/validators');

validateData(projectData); // Throws on validation error
```

**검증 항목**:
- resumeDownload 필수 필드
- resume 배열 구조
- projects 배열 구조
- 필수 URL 존재 여부

---

## 🧪 테스트

모든 모듈은 100% 테스트 커버리지를 유지합니다.

```bash
npm test                    # 전체 테스트
npm run test:coverage       # 커버리지 리포트
npm test -- lib/cards       # 특정 모듈 테스트
```

---

## 📊 성능 최적화

### 템플릿 캐싱

`TEMPLATE_CACHE`는 data.json 해시를 기반으로 생성된 HTML을 캐싱합니다.

```javascript
// 첫 번째 호출: HTML 생성
const html1 = generateResumeCards(data, hash);

// 두 번째 호출 (같은 hash): 캐시 사용
const html2 = generateResumeCards(data, hash);
```

**효과**: 빌드 시간 30% 단축

---

### 압축 최적화

`aggressiveMinify()`는 html-minifier-terser보다 더 공격적으로 압축합니다.

```javascript
const before = html.length; // 100KB
const after = aggressiveMinify(html).length; // 70KB
// 30% 감소
```

---

## 🔒 보안

### CSP 해시 자동 생성

`extractInlineHashes()`는 인라인 스크립트/스타일의 SHA-256 해시를 자동 생성합니다.

```javascript
const { scriptHashes, styleHashes } = extractInlineHashes(html);
// scriptHashes: ["'sha256-abc123...'", "'sha256-def456...'"]
```

---

### 안전한 파일 읽기

`safeReadFile()`은 상세한 에러 메시지를 제공합니다.

```javascript
try {
  const content = safeReadFile('missing.json');
} catch (err) {
  // Error: Failed to read missing.json: ENOENT: no such file or directory
}
```

---

## 📝 사용 예시

### generate-worker.js에서의 사용

```javascript
const { validateData } = require('./lib/validators');
const { generateResumeCards, generateProjectCards } = require('./lib/cards');
const { calculateDataHash } = require('./lib/utils');
const { getCacheHeaders } = require('./lib/cache-headers');

// 1. 데이터 검증
validateData(projectData);

// 2. 해시 계산
const dataHash = calculateDataHash(projectData);

// 3. HTML 생성 (캐싱)
const resumeHtml = generateResumeCards(projectData.resume, dataHash);
const projectHtml = generateProjectCards(projectData.projects, dataHash);

// 4. 캐시 헤더 적용
const headers = {
  ...SECURITY_HEADERS,
  ...getCacheHeaders(url.pathname)
};
```

---

## 🚀 향후 계획

- [ ] TypeScript 마이그레이션
- [ ] Brotli 압축 지원
- [ ] 이미지 최적화 자동화
- [ ] 성능 벤치마크 추가

---

**Last Updated**: 2025-12-21  
**Maintainer**: Jaecheol Lee <qws941@kakao.com>
