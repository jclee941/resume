const path = require('path');

const SOURCE_PATH = path.join(
  __dirname,
  '../../../typescript/data/resumes/master/resume_data.json'
);

const SCHEMA_PATH = path.join(
  __dirname,
  '../../../typescript/data/resumes/master/resume_schema.json'
);

const WEB_DATA_PATH = path.join(__dirname, '../../../typescript/portfolio-worker/data.json');

module.exports = {
  SOURCE_PATH,
  SCHEMA_PATH,
  WEB_DATA_PATH,
};
