/**
 * Mock Job Site Fixtures for E2E Testing
 *
 * Provides:
 * - Sample application data for auto-fill
 * - Mock file upload handling
 * - Stealth verification helpers
 */

const path = require('path');
const fs = require('fs');

// Sample resume content for file upload testing
const SAMPLE_RESUME_CONTENT = `
홍길동 (Hong Gil-dong)
Software Engineer

📧 hong.gildong@example.com | 📱 010-1234-5678

경력 (Experience)
===============
2022 - 현재: Senior Software Engineer @ Tech Corp
- Kubernetes 기반 클라우드 인프라 관리
- CI/CD 파이프라인 자동화 (GitHub Actions, ArgoCD)
- 보안 취약점 스캐닝 및 패치 관리

2020 - 2022: DevOps Engineer @ StartupXYZ
- AWS 기반 마이크로서비스 아키텍처 구축
- Terraform을 통한 인프라 코드화 (IaC)
- Prometheus + Grafana 모니터링 시스템 구축

학력 (Education)
===============
2016 - 2020: 컴퓨터공학 학사, 한국대학교
- GPA: 3.8/4.5
- 졸업논문: 클라우드 환경에서의 보안 정책 자동화

기술 스택 (Tech Stack)
====================
- Languages: JavaScript, Python, Go, Bash
- Cloud: AWS, GCP, Cloudflare
- Containers: Docker, Kubernetes, Helm
- CI/CD: GitHub Actions, Jenkins, ArgoCD
- Monitoring: Prometheus, Grafana, ELK Stack
- Security: Trivy, Snyk, OWASP ZAP

자격증 (Certifications)
=====================
- AWS Solutions Architect Professional (2023)
- CKA (Certified Kubernetes Administrator) (2023)
- OSCP (Offensive Security Certified Professional) (2022)
`;

/**
 * Sample application data for auto-fill testing
 */
const SAMPLE_APPLICATION_DATA = {
  personal: {
    name: '홍길동',
    email: 'hong.gildong@example.com',
    phone: '010-1234-5678',
  },
  education: {
    school: '한국대학교',
    major: '컴퓨터공학',
    degree: 'bachelor',
    graduationYear: '2020',
  },
  experience: {
    company: 'Tech Corp',
    position: 'Senior Software Engineer',
    years: '1-3',
    skills: 'Kubernetes, AWS, Python, Docker',
    description: '클라우드 인프라 관리 및 CI/CD 파이프라인 구축',
  },
  coverLetter: `안녕하세요,

8년 이상의 DevOps 및 보안 경험을 보유한 소프트웨어 엔지니어입니다.

주요 역량:
- Kubernetes 기반 클라우드 인프라 설계 및 관리
- CI/CD 파이프라인 자동화
- 보안 취약점 분석 및 대응

항상 학습하고 성장하는 자세로 항상 새로운 도전을 기다리고 있습니다.

감사합니다.
홍길동 드림`,
};

/**
 * Get sample resume file path (creates if not exists)
 * @returns {string} Path to sample resume file
 */
function getSampleResumePath() {
  const fixturesDir = path.join(__dirname);
  const resumePath = path.join(fixturesDir, 'sample-resume.txt');

  if (!fs.existsSync(resumePath)) {
    fs.writeFileSync(resumePath, SAMPLE_RESUME_CONTENT, 'utf8');
  }

  return resumePath;
}

/**
 * Generate random delay for human-like behavior
 * @param {number} minMs - Minimum delay in ms
 * @param {number} maxMs - Maximum delay in ms
 * @returns {number} Random delay
 */
function randomDelay(minMs = 100, maxMs = 500) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Verify user agent is from realistic browser pool
 * @param {string} userAgent - User agent string to verify
 * @returns {boolean} True if looks like real browser
 */
function isRealisticUserAgent(userAgent) {
  if (!userAgent) return false;

  const realisticPatterns = [
    /Mozilla\/5\.0.*Chrome\/\d+/,
    /Mozilla\/5\.0.*Firefox\/\d+/,
    /Mozilla\/5\.0.*Safari\/\d+/,
    /Mozilla\/5\.0.*AppleWebKit\/\d+.*Chrome\/\d+/,
  ];

  return realisticPatterns.some((pattern) => pattern.test(userAgent));
}

module.exports = {
  SAMPLE_APPLICATION_DATA,
  getSampleResumePath,
  randomDelay,
  isRealisticUserAgent,
};
