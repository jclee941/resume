const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '../../..');
const sourcePath = path.join(root, 'packages/data/resumes/master/resume_master.md');
const generatedPdfPath = path.join(root, 'packages/data/resumes/master/resume_final.pdf');
const publicPdfPath = path.join(root, 'apps/portfolio/assets/resume.pdf');

const HEADING = '풀스택 엔지니어';
const SUMMARY =
  '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 직접 설계하고 운영합니다. ' +
  '개인 프로젝트에서는 TypeScript·Cloudflare Workers·Python·PostgreSQL을 연결해 제품을 엔드투엔드로 구축했고, ' +
  '실무에서는 금융권 보안 인프라와 자동화·관측성을 담당했습니다. 풀스택·백엔드·플랫폼 엔지니어 포지션을 검토합니다.';
const CAPABILITY =
  '제품 UI·PWA · 백엔드·API · PostgreSQL·D1 데이터 모델 · 비동기 워크플로 · 엣지 배포·관측성 · 보안·신뢰성';
const PROTECTED_AUTOMATION = '\\mbox{자동화·관측성}';
const LOCKED_SUFFIX_SHA256 = 'd83f3e32f45f36480c207516ef93ea4bbfa2f7d4620c8c92d38070233acdc42f';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function lockedSuffix(source) {
  const marker = source.indexOf('## 연락처');
  if (marker < 0) throw new Error('public resume is missing the locked contact/career suffix');
  return source.slice(marker);
}

function normalizeExtractedText(text) {
  return text
    .split(String.fromCharCode(12))
    .join(' ')
    .replace(/・/g, '·')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactExtractedText(text) {
  return normalizeExtractedText(text).replace(/\s/g, '');
}

function assertApprovedSource(source) {
  const visibleSource = source.replace(PROTECTED_AUTOMATION, '자동화·관측성');
  expect(visibleSource.startsWith(`# 이재철\n\n${HEADING}\n\n${SUMMARY}\n\n**핵심 역량**: ${CAPABILITY}\n\n`)).toBe(true);
  expect(source).toContain(PROTECTED_AUTOMATION);
  expect(source).not.toMatch(/Senior\s+Full[- ]Stack/i);
  expect(source).not.toMatch(/(?:full[- ]stack|풀스택).{0,12}(?:\d+\s*(?:years?|년차|년)|senior)/i);
  expect(sha256(lockedSuffix(source))).toBe(LOCKED_SUFFIX_SHA256);
}

function extractPdfText(pdfPath) {
  return execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' });
}

describe('public resume PDF rebrand contract', () => {
  test('master source changes only the approved public positioning preamble', () => {
    assertApprovedSource(fs.readFileSync(sourcePath, 'utf8'));
  });

  test('pipeline PDFs are byte-identical and contain the approved positioning', () => {
    expect(fs.existsSync(generatedPdfPath)).toBe(true);
    const generatedPdf = fs.readFileSync(generatedPdfPath);
    const publicPdf = fs.readFileSync(publicPdfPath);
    expect(generatedPdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(generatedPdf.length).toBeGreaterThan(0);
    expect(sha256(generatedPdf)).toBe(sha256(publicPdf));

    const extractedText = extractPdfText(generatedPdfPath);
    const text = normalizeExtractedText(extractedText);
    const compactText = compactExtractedText(text);
    expect(text).toContain(HEADING);
    expect(compactText).toContain(compactExtractedText(SUMMARY));
    expect(compactText).toContain(compactExtractedText(`핵심 역량: ${CAPABILITY}`));
    expect(extractedText.split(/\r?\n/).some((line) => /자동화[·・]관측성/.test(line))).toBe(true);
    expect(text).not.toMatch(/Senior\s+Full[- ]Stack/i);
  });

  test('rejects forbidden seniority, career-period drift, and a stale asset fixture', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(() => assertApprovedSource(source.replace(HEADING, 'Senior Full-Stack Engineer'))).toThrow();
    expect(() => assertApprovedSource(source.replace('2025.03 ~ 2026.02', '2025.03 ~ 2026.03'))).toThrow();

    if (!fs.existsSync(generatedPdfPath)) return;
    const generatedPdf = fs.readFileSync(generatedPdfPath);
    const staleAsset = Buffer.from(generatedPdf);
    staleAsset[staleAsset.length - 1] ^= 1;
    expect(sha256(staleAsset)).not.toBe(sha256(generatedPdf));
  });
});
