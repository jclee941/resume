import { JobKoreaCrawler } from '../../../platforms/jobkorea/jobkorea-crawler.js';
import { JOBKOREA_CATEGORIES } from '@resume/data/platforms/jobkorea-categories.js';
import { JumpitCrawler } from '../../../platforms/jumpit/jumpit-crawler.js';
import { LinkedInCrawler, LINKEDIN_FILTERS } from '../../../platforms/linkedin/linkedin-crawler.js';
import { ProgrammersCrawler } from '../../../platforms/programmers/programmers-crawler.js';
import { RallitCrawler } from '../../../platforms/rallit/rallit-crawler.js';
import { RememberCrawler } from '../../../platforms/remember/remember-crawler.js';
import { RocketPunchCrawler } from '../../../platforms/rocketpunch/rocketpunch-crawler.js';
import { SaraminCrawler, SARAMIN_CATEGORIES } from '../../../platforms/saramin/saramin-crawler.js';
import { WantedCrawler, WANTED_CATEGORIES } from '../../../platforms/wanted/wanted-crawler.js';

export const DEFAULT_CRAWLER_SOURCES = [
  'wanted',
  'jobkorea',
  'saramin',
  'linkedin',
  'remember',
  'rocketpunch',
  'programmers',
  'jumpit',
  'rallit',
];

export function createPlatformCrawlers(options = {}) {
  return {
    wanted: new WantedCrawler(options.wanted),
    jobkorea: new JobKoreaCrawler(options.jobkorea),
    saramin: new SaraminCrawler(options.saramin),
    linkedin: new LinkedInCrawler(options.linkedin),
    remember: new RememberCrawler(options.remember),
    rocketpunch: new RocketPunchCrawler(options.rocketpunch),
    programmers: new ProgrammersCrawler(options.programmers),
    jumpit: new JumpitCrawler(options.jumpit),
    rallit: new RallitCrawler(options.rallit),
  };
}

export {
  JobKoreaCrawler,
  JOBKOREA_CATEGORIES,
  JumpitCrawler,
  LinkedInCrawler,
  LINKEDIN_FILTERS,
  ProgrammersCrawler,
  RallitCrawler,
  RememberCrawler,
  RocketPunchCrawler,
  SaraminCrawler,
  SARAMIN_CATEGORIES,
  WantedCrawler,
  WANTED_CATEGORIES,
};
