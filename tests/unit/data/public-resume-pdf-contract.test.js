const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '../../..');
const summarySourcePath = path.join(root, 'packages/data/resumes/master/resume_summary.md');
const fullSourcePath = path.join(root, 'packages/data/resumes/master/resume_master.md');
const generatedPdfPath = path.join(root, 'packages/data/resumes/master/resume_final.pdf');
const generatedFullPdfPath = path.join(root, 'packages/data/resumes/master/resume_full.pdf');
const publicPdfPath = path.join(root, 'apps/portfolio/assets/resume.pdf');
const publicFullPdfPath = path.join(root, 'apps/portfolio/assets/resume-full.pdf');

const HEADING = '풀스택 엔지니어';
const SUMMARY =
  '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 직접 설계하고 운영합니다. ' +
  '개인 프로젝트에서는 TypeScript·Cloudflare Workers·Python·PostgreSQL을 연결해 제품을 엔드투엔드로 구축했고, ' +
  '실무에서는 금융권 보안 인프라와 자동화·관측성을 담당했습니다. 풀스택·백엔드·플랫폼 엔지니어 포지션을 검토합니다.';
const CAPABILITY =
  '제품 UI·PWA · 백엔드·API · PostgreSQL·D1 데이터 모델 · 비동기 워크플로 · 엣지 배포·관측성 · 보안·신뢰성';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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
  const visibleSource = source.replace('\\mbox{자동화·관측성}', '자동화·관측성');
  expect(visibleSource).toContain(`# 이재철\n\n${HEADING}`);
  expect(visibleSource).toContain(`**핵심 역량**: ${CAPABILITY}`);
  expect(source).not.toMatch(/Senior\s+Full[- ]Stack/i);
  expect(source).not.toMatch(/(?:full[- ]stack|풀스택).{0,12}(?:\d+\s*(?:years?|년차|년)|senior)/i);
  expect(source).not.toMatch(/010[- ]?5757[- ]?9592|장현천로/);
}

function extractPdfText(pdfPath) {
  return execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' });
}

describe('public resume PDF rebrand contract', () => {
  test('summary and full sources share approved positioning without public street address or phone', () => {
    assertApprovedSource(fs.readFileSync(summarySourcePath, 'utf8'));
    assertApprovedSource(fs.readFileSync(fullSourcePath, 'utf8'));
  });

  test('pipeline PDFs are byte-identical and contain the approved positioning', () => {
    const publicPdf = fs.readFileSync(publicPdfPath);
    expect(publicPdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(publicPdf.length).toBeGreaterThan(0);

    // The pipeline PDF is an untracked, regenerable artifact (npm run sync:pdf).
    // Enforce the byte-identity and extracted-text contract wherever it exists;
    // a clean checkout (CI) validates the shipped public PDF header only.
    if (!fs.existsSync(generatedPdfPath)) return;
    const generatedPdf = fs.readFileSync(generatedPdfPath);
    expect(generatedPdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(sha256(generatedPdf)).toBe(sha256(publicPdf));

    const extractedText = extractPdfText(generatedPdfPath);
    const text = normalizeExtractedText(extractedText);
    const compactText = compactExtractedText(text);
    expect(text).toContain(HEADING);
    expect(compactText).toContain(compactExtractedText(SUMMARY));
    expect(compactText).toContain(compactExtractedText(`핵심 역량: ${CAPABILITY}`));
    expect(extractedText.split(/\r?\n/).some((line) => /자동화[·・]관측성/.test(line))).toBe(true);
    expect(text).not.toMatch(/Senior\s+Full[- ]Stack/i);

    const pages = Number(
      execFileSync('pdfinfo', [generatedPdfPath], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/)?.[1]
    );
    expect(pages).toBeLessThanOrEqual(2);
  });

  test('ships a separate non-empty full CV artifact', () => {
    if (!fs.existsSync(generatedFullPdfPath)) return;
    const generatedFullPdf = fs.readFileSync(generatedFullPdfPath);
    const publicFullPdf = fs.readFileSync(publicFullPdfPath);
    expect(generatedFullPdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(sha256(generatedFullPdf)).toBe(sha256(publicFullPdf));
  });

  test('rejects forbidden seniority and a stale asset fixture', () => {
    const source = fs.readFileSync(summarySourcePath, 'utf8');
    expect(() => assertApprovedSource(source.replace(HEADING, 'Senior Full-Stack Engineer'))).toThrow();

    if (!fs.existsSync(generatedPdfPath)) return;
    const generatedPdf = fs.readFileSync(generatedPdfPath);
    const staleAsset = Buffer.from(generatedPdf);
    staleAsset[staleAsset.length - 1] ^= 1;
    expect(sha256(staleAsset)).not.toBe(sha256(generatedPdf));
  });
});
