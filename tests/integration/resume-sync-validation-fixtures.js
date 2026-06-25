const VALID_RESUME_DATA = {
  personal: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '010-1234-5678',
  },
  education: {
    school: 'University of Example',
    major: 'Computer Science',
  },
  summary: {
    totalExperience: '5년',
    expertise: ['JavaScript', 'TypeScript', 'Node.js'],
  },
  current: {
    company: 'Example Corp',
    position: 'Senior Engineer',
  },
  careers: [
    {
      id: 'example-corp',
      company: 'Example Corp',
      period: '2022.01 ~ 현재',
      role: 'Senior Engineer',
    },
  ],
  skills: {
    languages: {
      title: 'Languages',
      icon: 'Code',
      items: [{ name: 'JavaScript', level: 'expert' }],
    },
  },
};

const INVALID_RESUME_MISSING_REQUIRED = {
  personal: { name: 'John Doe' },
  education: { school: 'University of Example' },
  summary: { totalExperience: '5년' },
  current: { company: 'Example Corp' },
  careers: [],
};

const INVALID_RESUME_WRONG_TYPES = {
  personal: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: 'invalid-format',
  },
  education: {
    school: 'University of Example',
    major: 'Computer Science',
  },
  summary: {
    totalExperience: '5년',
    expertise: 'not an array',
  },
  current: { company: 'Example Corp' },
  careers: 'not an array',
  skills: 'not an object',
};

const INVALID_RESUME_BAD_PHONE = {
  ...VALID_RESUME_DATA,
  personal: {
    ...VALID_RESUME_DATA.personal,
    phone: '123-456-789',
  },
};

const INVALID_RESUME_BAD_CAREER = {
  ...VALID_RESUME_DATA,
  careers: [
    {
      id: 'example-corp',
      company: 'Example Corp',
    },
  ],
};

module.exports = {
  INVALID_RESUME_BAD_CAREER,
  INVALID_RESUME_BAD_PHONE,
  INVALID_RESUME_MISSING_REQUIRED,
  INVALID_RESUME_WRONG_TYPES,
  VALID_RESUME_DATA,
};
