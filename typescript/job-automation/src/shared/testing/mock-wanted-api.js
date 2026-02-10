export class MockWantedAPI {
  constructor(config = {}) {
    this.token = config.token || 'mock_token';
    this.cookies = config.cookies || 'mock_cookies';
  }

  async getProfile() {
    return {
      id: 12345,
      name: 'Mock User',
      email: 'mock@example.com',
      headline: 'Mock Developer',
      experiences: [
        {
          id: 1,
          company_name: 'Mock Corp',
          position: 'Developer',
          is_current: true,
        },
      ],
      skills: [{ id: 101, name: 'JavaScript' }],
    };
  }

  async getResumeList() {
    return {
      data: [
        {
          id: 'AwcICwcLBAFIAgcDCwUAB01F',
          title: 'Mock Resume 1',
          is_default: true,
        },
      ],
    };
  }

  async getResumeDetail(resumeId) {
    return {
      resume: {
        id: resumeId,
        title: 'Mock Resume 1',
        lang: 'ko',
        is_complete: true,
      },
      careers: [
        {
          id: 10,
          company: { name: 'Mock Company' },
          job_role: 'Backend Developer',
          employment_type: 'FULL_TIME',
          start_time: '2020-01-01',
          end_time: null,
          served: true,
          projects: [],
        },
      ],
      educations: [],
      skills: [],
      activities: [],
      languageCerts: [],
    };
  }

  async updateResumeCareer(_resumeId, careerId, data) {
    return { id: careerId, ...data };
  }

  async addResumeCareer(_resumeId, data) {
    return { id: 999, ...data };
  }

  async deleteResumeCareer(_resumeId, _careerId) {
    return true;
  }

  async saveResume() {
    return true;
  }
  async addCareerProject() {
    return { id: 888 };
  }
  async deleteCareerProject() {
    return true;
  }
  async updateResumeEducation() {
    return {};
  }
  async addResumeEducation() {
    return {};
  }
  async deleteResumeEducation() {
    return true;
  }
  async addResumeSkill() {
    return {};
  }
  async deleteResumeSkill() {
    return true;
  }
  async updateResumeActivity() {
    return {};
  }
  async addResumeActivity() {
    return {};
  }
  async deleteResumeActivity() {
    return true;
  }
  async updateResumeLanguageCert() {
    return {};
  }
  async addResumeLanguageCert() {
    return {};
  }
  async deleteResumeLanguageCert() {
    return true;
  }
}

export default MockWantedAPI;
