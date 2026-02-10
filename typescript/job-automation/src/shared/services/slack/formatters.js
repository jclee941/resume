const STATUS_EMOJI = {
  saved: '📌',
  applied: '✅',
  interview: '🎯',
  offer: '🎉',
  rejected: '❌',
  withdrawn: '🔙',
};

const STATUS_COLORS = {
  saved: '#6b7280',
  applied: '#3b82f6',
  interview: '#f59e0b',
  offer: '#10b981',
  rejected: '#ef4444',
  withdrawn: '#9ca3af',
};

export function formatHighMatchJob(job, matchScore) {
  const scoreColor = matchScore >= 85 ? '#10b981' : matchScore >= 70 ? '#f59e0b' : '#6b7280';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🎯 고매칭 채용공고 발견! (${matchScore}점)`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*회사*\n${job.company}` },
          { type: 'mrkdwn', text: `*포지션*\n${job.position}` },
          { type: 'mrkdwn', text: `*플랫폼*\n${job.source || 'unknown'}` },
          { type: 'mrkdwn', text: `*매칭점수*\n${matchScore}점` },
        ],
      },
      ...(job.matchReasons?.length
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*매칭 이유*\n${job.matchReasons
                  .slice(0, 3)
                  .map((r) => `• ${r}`)
                  .join('\n')}`,
              },
            },
          ]
        : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '🚀 지원하기', emoji: true },
            style: 'primary',
            action_id: 'apply_job',
            value: JSON.stringify({ jobId: job.id, source: job.source }),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '📌 저장', emoji: true },
            action_id: 'save_job',
            value: JSON.stringify({ jobId: job.id }),
          },
          ...(job.sourceUrl
            ? [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '🔗 공고 보기',
                    emoji: true,
                  },
                  url: job.sourceUrl,
                  action_id: 'view_job',
                },
              ]
            : []),
        ],
      },
    ],
    attachments: [{ color: scoreColor, blocks: [] }],
  };
}

export function formatStatusChange(application, oldStatus, newStatus, note) {
  const emoji = STATUS_EMOJI[newStatus] || '📋';
  const color = STATUS_COLORS[newStatus] || '#6b7280';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} 지원 상태 변경`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*회사*\n${application.company}` },
          { type: 'mrkdwn', text: `*포지션*\n${application.position}` },
          { type: 'mrkdwn', text: `*이전 상태*\n${oldStatus}` },
          { type: 'mrkdwn', text: `*현재 상태*\n${newStatus}` },
        ],
      },
      ...(note
        ? [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*메모*\n${note}` },
            },
          ]
        : []),
    ],
    attachments: [{ color, blocks: [] }],
  };
}

export function formatDailyReport(stats, date) {
  const dateStr = date || new Date().toISOString().split('T')[0];

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 일일 리포트 - ${dateStr}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*총 지원*\n${stats.totalApplications || 0}건`,
          },
          {
            type: 'mrkdwn',
            text: `*오늘 지원*\n${stats.todayApplications || 0}건`,
          },
          {
            type: 'mrkdwn',
            text: `*면접 진행*\n${stats.byStatus?.interview || 0}건`,
          },
          { type: 'mrkdwn', text: `*합격*\n${stats.byStatus?.offer || 0}건` },
        ],
      },
      ...(stats.recommendations?.length
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*추천사항*\n${stats.recommendations.map((r) => `• ${r.message}`).join('\n')}`,
              },
            },
          ]
        : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📋 대시보드 열기', emoji: true },
            url: 'https://resume.jclee.me/job',
            action_id: 'open_dashboard',
          },
        ],
      },
    ],
  };
}

export function formatSearchResults(jobs, query) {
  const topJobs = jobs.slice(0, 5);

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔍 검색 결과: "${query}"`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `총 *${jobs.length}*건의 채용공고를 찾았습니다.`,
        },
      },
      ...topJobs.map((job, i) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${i + 1}. ${job.company}* - ${job.position}\n점수: ${job.matchScore || 'N/A'}점 | ${job.source}`,
        },
        accessory: job.sourceUrl
          ? {
              type: 'button',
              text: { type: 'plain_text', text: '보기', emoji: true },
              url: job.sourceUrl,
              action_id: `view_job_${i}`,
            }
          : undefined,
      })),
      ...(jobs.length > 5
        ? [
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `...외 ${jobs.length - 5}건` }],
            },
          ]
        : []),
    ],
  };
}

export function formatAutoApplyResult(results, dryRun) {
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: dryRun ? '🧪 자동지원 테스트 완료' : '🚀 자동지원 완료',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*총 처리*\n${results.length}건` },
          { type: 'mrkdwn', text: `*성공*\n${successCount}건` },
          { type: 'mrkdwn', text: `*실패*\n${failCount}건` },
          {
            type: 'mrkdwn',
            text: `*모드*\n${dryRun ? '테스트' : '실제 지원'}`,
          },
        ],
      },
      ...results.slice(0, 3).map((r) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${r.success ? '✅' : '❌'} *${r.company}* - ${r.position}${r.error ? `\n> ${r.error}` : ''}`,
        },
      })),
      ...(results.length > 3
        ? [
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `...외 ${results.length - 3}건` }],
            },
          ]
        : []),
    ],
  };
}
