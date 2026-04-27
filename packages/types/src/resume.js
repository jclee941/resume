/**
 * @typedef {Object} Resume
 * @property {ResumeProfile} profile
 * @property {ResumeCareer[]} careers
 * @property {ResumeProject[]} projects
 * @property {ResumeSkill[]} skills
 * @property {ResumeCertification[]} [certifications]
 * @property {ResumeEducation[]} [educations]
 */

/**
 * @typedef {Object} ResumeProfile
 * @property {string} name
 * @property {string} email
 * @property {string} [phone]
 * @property {string} [headline]
 * @property {string} [summary]
 */

/**
 * @typedef {Object} ResumeCareer
 * @property {string} company
 * @property {string} position
 * @property {string} startDate
 * @property {string} [endDate]
 * @property {string} [description]
 */

/**
 * @typedef {Object} ResumeProject
 * @property {string} name
 * @property {string} [role]
 * @property {string} startDate
 * @property {string} [endDate]
 * @property {string[]} [techStack]
 * @property {string} description
 */

/**
 * @typedef {Object} ResumeSkill
 * @property {string} name
 * @property {1|2|3|4|5} [level]
 */

/**
 * @typedef {Object} ResumeCertification
 * @property {string} name
 * @property {string} issuer
 * @property {string} issueDate
 * @property {string} [expiryDate]
 */

/**
 * @typedef {Object} ResumeEducation
 * @property {string} institution
 * @property {string} degree
 * @property {string} startDate
 * @property {string} [endDate]
 */
