export const mockTelegramResponse = {
  ok: true,
  result: {
    message_id: 123,
    from: {
      id: 123456789,
      is_bot: false,
      first_name: 'Test',
      last_name: 'User',
    },
    chat: {
      id: -1001234567890,
      title: 'Job Alerts',
      type: 'group',
    },
    date: 1709312400,
    text: '테스트 메시지',
  },
};

export const mockTelegramErrorResponse = {
  ok: false,
  error_code: 400,
  description: 'Bad Request: chat not found',
};

export const mockTelegramSendMessageResponse = {
  ok: true,
  result: {
    message_id: 456,
    date: 1709312500,
    text: '📨 지원 완료: DevOps Engineer @ Toss',
  },
};

export const mockWantedResponse = {
  success: true,
  data: {
    job: {
      id: 325174,
      title: 'DevOps Engineer',
      company: {
        id: 1234,
        name: 'Toss',
        logo_url: 'https://example.com/toss-logo.png',
      },
      location: '서울',
      job_type: 'Full-time',
      salary: '8,000만원 ~ 12,000만원',
      deadline: '2026-04-15',
      content: '<p>직무 내용...</p>',
      requirements: '<p>요구 사항...</p>',
      benefits: '<p>복리후생...</p>',
    },
  },
};

export const mockWantedSearchResponse = {
  success: true,
  data: {
    items: [
      {
        id: 325174,
        title: 'DevOps Engineer',
        company_name: 'Toss',
        location: '서울',
        salary: '8,000만원 ~ 12,000만원',
        updated_at: '2026-03-15T10:00:00Z',
      },
      {
        id: 310002,
        title: 'SRE',
        company_name: 'Kakao',
        location: '서울',
        salary: '면접 후 결정',
        updated_at: '2026-03-20T10:00:00Z',
      },
    ],
    total_count: 2,
    next_page: null,
  },
};

export const mockWantedAuthResponse = {
  success: true,
  data: {
    user: {
      id: 12345,
      name: '홍길동',
      email: 'hong@example.com',
    },
    expires_at: '2026-04-01T00:00:00Z',
  },
};

export const mockWantedErrorResponse = {
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: 'Invalid or expired session',
  },
};
