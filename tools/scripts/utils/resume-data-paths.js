const path = require('path');

const SOURCE_PATH = path.join(
  __dirname,
  '../../../typescript/data/resumes/master/resume_data.json'
);
const SOURCE_EN_PATH = path.join(
  __dirname,
  '../../../typescript/data/resumes/master/resume_data_en.json'
);
const SOURCE_JA_PATH = path.join(
  __dirname,
  '../../../typescript/data/resumes/master/resume_data_ja.json'
);

const SCHEMA_PATH = path.join(
  __dirname,
  '../../../typescript/data/resumes/master/resume_schema.json'
);

const WEB_DATA_PATH = path.join(__dirname, '../../../typescript/portfolio-worker/data.json');
const WEB_DATA_EN_PATH = path.join(__dirname, '../../../typescript/portfolio-worker/data_en.json');
const WEB_DATA_JA_PATH = path.join(__dirname, '../../../typescript/portfolio-worker/data_ja.json');

const LANGUAGE_SOURCES = [
  { language: 'ko', sourcePath: SOURCE_PATH, webDataPath: WEB_DATA_PATH },
  { language: 'en', sourcePath: SOURCE_EN_PATH, webDataPath: WEB_DATA_EN_PATH },
  { language: 'ja', sourcePath: SOURCE_JA_PATH, webDataPath: WEB_DATA_JA_PATH },
];

module.exports = {
  SOURCE_PATH,
  SOURCE_EN_PATH,
  SOURCE_JA_PATH,
  SCHEMA_PATH,
  WEB_DATA_PATH,
  WEB_DATA_EN_PATH,
  WEB_DATA_JA_PATH,
  LANGUAGE_SOURCES,
};
