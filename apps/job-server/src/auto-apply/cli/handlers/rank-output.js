import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getResumeBasePath } from '../../../shared/utils/paths.js';
import { REVIEW_THRESHOLD } from './rank-core.js';

function printEnrichmentStats(stats) {
  if (!stats) return;
  console.log('🔎 본문 보강 커버리지 (플랫폼별):');
  for (const [source, s] of Object.entries(stats)) {
    console.log(
      `   ${source}: 성공 ${s.success}, 빈본문 ${s.empty}, 실패 ${s.failed}, 생략(이미보유) ${s.skipped}`
    );
  }
  const anyGap = Object.values(stats).some((s) => s.empty + s.failed > 0);
  if (anyGap) {
    console.log(
      '   ⚠️  본문 보강 실패/빈 공고는 점수가 낮게 측정될 수 있음 (특히 jobkorea/saramin은 상세 미수집).'
    );
  }
}

export function printReport(report) {
  console.log(
    `\n📋 스코어링 완료: ${report.totalScored}개 공고 (키워드: ${report.keywords.join(', ')})`
  );
  printEnrichmentStats(report.enrichmentStats);
  const isStrict = report.minScore >= REVIEW_THRESHOLD;
  const label = isStrict ? '지원 할만한 공고' : '후보 공고(경계선 포함, 추가검토 필요)';
  console.log(`\n🎯 ${label} (>=${report.minScore}%): ${report.worthApplying.length}개\n`);
  const emoji = { auto: '🟢', review: '🟡', borderline: '⚪' };
  for (const [index, job] of report.worthApplying.entries()) {
    const tierLabel =
      job.tier === 'auto'
        ? '자동지원 후보'
        : job.tier === 'review'
          ? '검토 후 지원'
          : '경계선(추가검토)';
    console.log(
      `${index + 1}. [${job.matchPercentage}%] ${emoji[job.tier] || '⚪'} ${tierLabel} — ${job.position}`
    );
    console.log(`   🏢 ${job.company} | 📍 ${job.location || 'N/A'} | (${job.source})`);
    console.log(`   🔗 ${job.sourceUrl}`);
    if (job.skillMatches.length) {
      console.log(`   🧩 매칭 스킬: ${[...new Set(job.skillMatches)].slice(0, 8).join(', ')}`);
    }
    if (job.bonusPoints.length) {
      console.log(`   ⭐ ${job.bonusPoints.join(', ')}`);
    }
    console.log('');
  }
}

export function printNextAction(report, queuePath, queueCount) {
  const autoCount = report.worthApplying.filter((j) => j.tier === 'auto').length;
  const reviewCount = report.worthApplying.filter((j) => j.tier === 'review').length;
  console.log('\nℹ️  이 명령은 공고를 랭킹만 합니다 — 자동 제출(지원)은 실행하지 않음.');
  console.log(`   자동지원 후보 ${autoCount}개 / 검토 후 지원 ${reviewCount}개.`);
  if (queueCount > 0) {
    console.log(
      `   이 랭킹의 auto 후보 ${queueCount}개로 제출 큐를 생성했습니다. 검토 후 그 큐만 지원하려면:`
    );
    console.log(
      `   node apps/job-server/src/auto-apply/cli/index.js apply_queue --queue=${queuePath} --apply --max=5`
    );
    console.log('   (주의: 유효한 세션/로그인 필요. apply_queue는 랭킹된 공고만 제출합니다.)');
  } else {
    console.log('   auto 등급 후보가 없어 제출 큐는 생성하지 않았습니다. URL을 수동 검토하세요.');
  }
}

export function writeReport(report) {
  const date = report.generatedAt.slice(0, 10);
  const dir = resolve(getResumeBasePath(), 'applications/_auto-apply-runs');
  mkdirSync(dir, { recursive: true });
  const outPath = resolve(dir, `${date}-ranked.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  return outPath;
}

export function writeSubmitQueue(queue, generatedAt) {
  const date = generatedAt.slice(0, 10);
  const dir = resolve(getResumeBasePath(), 'applications/_auto-apply-runs');
  mkdirSync(dir, { recursive: true });
  const outPath = resolve(dir, `${date}-rank-queue.json`);
  writeFileSync(outPath, `${JSON.stringify(queue, null, 2)}\n`, 'utf-8');
  return outPath;
}
