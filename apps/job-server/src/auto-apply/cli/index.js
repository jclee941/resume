#!/usr/bin/env node
import { searchJobs, aiSearchJobs } from './handlers/search.js';
import { rankJobs } from './handlers/rank.js';
import { runAutoApply, runUnifiedSystem, runQueueAutoApply } from './handlers/apply.js';
import { runAIUnifiedSystem, showAICareerAdvice } from './handlers/ai-apply.js';
import { listApplications, showStats, showReport, updateStatus } from './handlers/management.js';

const COMMANDS = {
  search: { handler: searchJobs, desc: '채용공고 검색 (통합 시스템)' },
  ai_search: { handler: aiSearchJobs, desc: 'AI 기반 지능형 채용공고 검색' },
  rank: { handler: rankJobs, desc: '지원 할만한 공고 랭킹 (검색+스코어링, AI 불필요)' },
  apply: { handler: runAutoApply, desc: '자동 지원 실행 (통합 시스템)' },
  unified: { handler: runUnifiedSystem, desc: '통합 시스템 실행 (검색 + 지원)' },
  apply_queue: { handler: runQueueAutoApply, desc: '정제된 큐(submit-queue.json) 기반 지원' },
  ai_unified: { handler: runAIUnifiedSystem, desc: 'AI 기반 통합 시스템 실행' },
  advice: { handler: showAICareerAdvice, desc: 'AI 기반 커리어 조언' },
  list: { handler: listApplications, desc: '지원 현황 조회' },
  stats: { handler: showStats, desc: '통계 조회' },
  report: { handler: (args) => showReport(args[0]), desc: '일일 리포트' },
  update: { handler: updateStatus, desc: '지원 상태 업데이트' },
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const entry = COMMANDS[command];
  if (entry) {
    await entry.handler(args.slice(1));
  } else {
    showHelp();
  }
}

function showHelp() {
  console.log(`
🚀 Unified Auto Apply CLI - 통합 자동 지원 시스템

사용법: node cli.js <command> [options]

명령어:
  search [keyword] [limit]           채용공고 검색 (통합 시스템, 기본: 시니어 엔지니어, 20개)
  ai_search [keyword] [limit]        🤖 AI 기반 지능형 채용공고 검색 (Claude AI 활용)
  rank [keyword|all] [minScore]      🎯 지원 할만한 공고 랭킹 (DevSecOps/SRE 키워드, 로컬 스코어링, 기본 60%+)
  apply [--apply] [--max=N]          자동 지원 실행 (통합 시스템, 기본: dry-run, 최대 5개)
  unified [--apply] [--max=N]        통합 시스템 실행 (검색 + 지원, 기본: dry-run, 최대 3개)
  ai_unified [--apply] [--max=N]     🚀 AI 기반 통합 시스템 실행 (고급 매칭 + 예측)
  advice <job_url>                   💡 AI 기반 커리어 조언 (합격 전략 및 준비사항)
  list [--status=S] [--limit=N]      지원 현황 조회
  stats                              통계 조회
  report [date]                      일일 리포트
  update <id> <status>               지원 상태 업데이트
  help                               도움말

AI 기능:
  • Claude AI 기반 자연어 분석
  • 한국어 텍스트 이해 및 매칭
  • 합격 확률 예측
  • 개인화된 커리어 조언
  • 맥락 기반 키워드 추출

플랫폼 지원:
  • Wanted (wanted.kr)
  • JobKorea (jobkorea.co.kr)
  • Saramin (saramin.co.kr)
  • LinkedIn (linkedin.com)

예시:
  node cli.js search "DevSecOps" 30
  node cli.js ai_search "보안 엔지니어" 10
  node cli.js apply --apply --max=10
  node cli.js unified --apply --max=5
  node cli.js ai_unified --apply --max=3
  node cli.js advice "https://www.wanted.co.kr/wd/12345"
  node cli.js list --status=applied --limit=50
  node cli.js update abc123 interview_scheduled
`);
}

main().catch(console.error);
