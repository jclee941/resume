#!/usr/bin/env node

import { searchJobs, aiSearchJobs } from './commands/search-commands.js';
import { runAutoApply, runUnifiedSystem, runAIUnifiedSystem } from './commands/apply-commands.js';
import {
  listApplications,
  showStats,
  showReport,
  updateStatus,
} from './commands/management-commands.js';
import { showAICareerAdvice } from './commands/advice-commands.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const commandArgs = args.slice(1);

  switch (command) {
    case 'search':
      await searchJobs(commandArgs);
      break;
    case 'ai_search':
      await aiSearchJobs(commandArgs);
      break;
    case 'apply':
      await runAutoApply(commandArgs);
      break;
    case 'unified':
      await runUnifiedSystem(commandArgs);
      break;
    case 'ai_unified':
      await runAIUnifiedSystem(commandArgs);
      break;
    case 'advice':
      await showAICareerAdvice(commandArgs);
      break;
    case 'list':
      await listApplications(commandArgs);
      break;
    case 'stats':
      await showStats(commandArgs);
      break;
    case 'report':
      await showReport(commandArgs);
      break;
    case 'update':
      await updateStatus(commandArgs);
      break;
    case 'help':
    default:
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

function getStatusEmoji(status) {
  const emojis = {
    pending: '⏳',
    applied: '📝',
    viewed: '👀',
    in_progress: '🔄',
    interview: '🎤',
    offer: '🎉',
    rejected: '❌',
    withdrawn: '🚫',
    expired: '⌛',
  };
  return emojis[status] || '❓';
}

void getStatusEmoji;

main().catch(console.error);
