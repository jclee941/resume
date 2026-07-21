/**
 * @typedef {Object} Resume
 * @property {ResumePersonal} personal
 * @property {ResumeEducation} education
 * @property {ResumeCareer[]} careers
 * @property {ResumeProject[]} projects
 * @property {Object<string, ResumeSkillCategory>} skills
 * @property {ResumeCertification[]} [certifications]
 */

/**
 * @typedef {Object} ResumePersonal
 * @property {string} name
 * @property {string} email
 * @property {string} [phone]
 * @property {string} [github]
 * @property {string} [portfolio]
 */

/**
 * @typedef {Object} ResumeEducation
 * @property {string} school
 * @property {string} major
 * @property {string} [status]
 */

/**
 * @typedef {Object} ResumeCareer
 * @property {string} id
 * @property {string} company
 * @property {string} period
 * @property {string} role
 * @property {string} [myRole]
 * @property {string} [description]
 */

/**
 * @typedef {Object} ResumeProject
 * @property {string} id
 * @property {string} name
 * @property {string} [role]
 * @property {string} [period]
 * @property {string[]} [technologies]
 * @property {string} description
 */

/**
 * @typedef {Object} ResumeSkillCategory
 * @property {string} [title]
 * @property {string} [icon]
 * @property {ResumeSkill[]} [items]
 */

/**
 * @typedef {Object} ResumeSkill
 * @property {string} name
 * @property {string} [level]
 */

/**
 * @typedef {Object} ResumeCertification
 * @property {string} id
 * @property {string} name
 * @property {string} issuer
 * @property {string|null} [date]
 * @property {string|null} [expirationDate]
 * @property {string} [status]
 */
