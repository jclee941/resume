export const API_CONTRACTS = {
  health: {
    path: '/api/health',
    method: 'GET',
    auth: false,
    response: {
      status: 'string',
      timestamp: 'string',
      version: 'string',
    },
  },

  status: {
    path: '/api/status',
    method: 'GET',
    auth: false,
    response: {
      aiStatus: 'string',
      crawlerStatus: 'string',
      dbStatus: 'string',
      automationStatus: 'string',
    },
  },

  stats: {
    path: '/api/stats',
    method: 'GET',
    auth: true,
    response: {
      total: 'number',
      byStatus: 'object',
      byPlatform: 'object',
      recent: 'array',
    },
  },

  applications: {
    list: {
      path: '/api/applications',
      method: 'GET',
      auth: true,
      query: {
        status: 'string?',
        platform: 'string?',
        limit: 'number?',
        offset: 'number?',
      },
      response: {
        applications: 'array',
        total: 'number',
      },
    },
    create: {
      path: '/api/applications',
      method: 'POST',
      auth: true,
      body: {
        company: 'string',
        position: 'string',
        platform: 'string',
        status: 'string?',
        url: 'string?',
      },
      response: {
        id: 'string',
        success: 'boolean',
      },
    },
    update: {
      path: '/api/applications/:id',
      method: 'PUT',
      auth: true,
      body: {
        status: 'string?',
        notes: 'string?',
      },
      response: {
        success: 'boolean',
      },
    },
    delete: {
      path: '/api/applications/:id',
      method: 'DELETE',
      auth: true,
      response: {
        success: 'boolean',
      },
    },
  },

  auth: {
    status: {
      path: '/api/auth/status',
      method: 'GET',
      auth: false,
      response: {
        authenticated: 'boolean',
        platforms: 'object',
      },
    },
    google: {
      path: '/api/auth/google',
      method: 'POST',
      auth: false,
      body: {
        credential: 'string',
      },
      response: {
        success: 'boolean',
      },
    },
    set: {
      path: '/api/auth/set',
      method: 'POST',
      auth: true,
      body: {
        platform: 'string',
        cookies: 'string',
      },
      response: {
        success: 'boolean',
      },
    },
    logout: {
      path: '/api/auth/:platform',
      method: 'DELETE',
      auth: true,
      response: {
        success: 'boolean',
      },
    },
  },

  ai: {
    match: {
      path: '/api/ai/match',
      method: 'POST',
      auth: true,
      body: {
        jobTitle: 'string',
        company: 'string',
        jobDescription: 'string',
      },
      response: {
        success: 'boolean',
        match: 'object',
      },
    },
    runSystem: {
      path: '/api/ai/run-system',
      method: 'POST',
      auth: true,
      body: {
        keywords: 'array',
        maxApplications: 'number',
        dryRun: 'boolean',
        platforms: 'array',
      },
      response: {
        success: 'boolean',
      },
    },
  },

  cf: {
    stats: {
      path: '/api/cf/stats',
      method: 'GET',
      auth: true,
      response: {
        stats: 'array',
      },
    },
  },

  profile: {
    unified: {
      path: '/api/profile/unified',
      method: 'GET',
      auth: true,
      response: {
        success: 'boolean',
        profile: 'object',
      },
    },
  },

  slack: {
    notify: {
      path: '/api/slack/notify',
      method: 'POST',
      auth: true,
      body: {
        message: 'string',
        channel: 'string?',
      },
      response: {
        success: 'boolean',
      },
    },
  },
};

export const COMMON_STATUSES = {
  APPLICATION: ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'],
  PLATFORM: ['wanted', 'jobkorea', 'saramin', 'linkedin', 'remember', 'manual'],
};

export function validateResponse(contract, response) {
  const errors = [];
  for (const [key, _type] of Object.entries(contract.response)) {
    if (!(key in response)) {
      errors.push(`Missing field: ${key}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
