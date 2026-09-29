import { escapeHtml } from '../services/notifications/formatters.js';

const STATUS_EMOJI = {
  pending: '⏳',
  saved: '💾',
  applied: '📝',
  viewed: '👀',
  in_progress: '🔄',
  interview: '💼',
  offer: '🎉',
  rejected: '❌',
  withdrawn: '↩️',
  expired: '⌛',
};

/**
 * @param {string} trend
 * @returns {string}
 */
function getTrendEmoji(trend) {
  if (trend === 'up') return '📈';
  if (trend === 'down') return '📉';
  return '➡️';
}

/**
 * @typedef {{ count: number | string; rate: number | string }} PlatformStats
 */

/**
 * @param {Record<string, PlatformStats>} platforms
 * @returns {string}
 */
function formatPlatformBreakdown(platforms) {
  return Object.entries(platforms)
    .map(([name, stats]) => `• ${name}: ${stats.count}건 (성공률 ${stats.rate}%)`)
    .join('\n');
}

/**
 * @typedef {{
 *   type: string;
 *   date: string;
 *   applications: {
 *     total: number;
 *     pending: number;
 *     saved: number;
 *     applied: number;
 *     viewed: number;
 *     in_progress: number;
 *     interview: number;
 *     offer: number;
 *     rejected: number;
 *     withdrawn: number;
 *     expired: number;
 *   };
 *   platforms: Record<string, PlatformStats>;
 *   searches: {
 *     totalJobs: number;
 *     avgScore: number;
 *     maxScore: number;
 *   };
 *   trends: {
 *     trend: string;
 *     change: number;
 *   };
 * }} DailyReport
 */

/**
 * @param {DailyReport} report
 */
export function generateReportContent(report) {
  const { type, applications, platforms, searches, trends } = report;
  const periodLabel = type === 'weekly' ? '주간' : '일간';
  const trendEmoji = getTrendEmoji(trends.trend);
  const platformBreakdown = formatPlatformBreakdown(platforms);

  return {
    title: `${periodLabel} 채용 리포트`,
    date: report.date,
    summary: {
      total: applications.total,
      trend: `${trendEmoji} ${trends.change > 0 ? '+' : ''}${trends.change}%`,
    },
    sections: [
      {
        title: '지원 현황',
        content: `${STATUS_EMOJI.pending} 대기: ${applications.pending}건
${STATUS_EMOJI.saved} 저장: ${applications.saved}건
${STATUS_EMOJI.applied} 지원: ${applications.applied}건
${STATUS_EMOJI.viewed} 열람: ${applications.viewed}건
${STATUS_EMOJI.in_progress} 진행중: ${applications.in_progress}건
${STATUS_EMOJI.interview} 면접: ${applications.interview}건
${STATUS_EMOJI.offer} 합격: ${applications.offer}건
${STATUS_EMOJI.rejected} 불합격: ${applications.rejected}건
${STATUS_EMOJI.withdrawn} 철회: ${applications.withdrawn}건
${STATUS_EMOJI.expired} 만료: ${applications.expired}건`,
      },
      {
        title: '플랫폼별 현황',
        content: platformBreakdown || '데이터 없음',
      },
      {
        title: '채용공고 검색',
        content: `• 총 검색: ${searches.totalJobs}건
• 평균 매칭: ${searches.avgScore}%
• 최고 매칭: ${searches.maxScore}%`,
      },
    ],
  };
}

/**
 * Telegram HTML body for a generated report: the headline numbers, then each section.
 * @param {ReturnType<typeof generateReportContent>} content
 * @returns {string}
 */
export function formatReportMessage(content) {
  const sections = content.sections.map(
    (section) => `<b>${escapeHtml(section.title)}</b>\n${escapeHtml(section.content)}`
  );
  return [
    `📊 <b>${escapeHtml(content.title)}</b> (${escapeHtml(content.date)})`,
    `총 ${content.summary.total}건 ${escapeHtml(content.summary.trend)}`,
    ...sections,
  ].join('\n\n');
}
