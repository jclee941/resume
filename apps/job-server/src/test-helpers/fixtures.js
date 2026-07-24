import {
  mockJobs,
  mockJobsHighScore,
  mockJobsMediumScore,
  mockJobsLowScore,
  mockJobsWanted,
  mockJobsJobKorea,
  mockJobsSaramin,
} from './job-fixtures.js';
import { mockResumeData } from './resume-fixtures.js';
import { createMockApplication, mockApplications } from './application-fixtures.js';
import { mockCoverLetter, mockCoverLetters } from './cover-letter-fixtures.js';
import {
  mockTelegramResponse,
  mockTelegramErrorResponse,
  mockTelegramSendMessageResponse,
  mockWantedResponse,
  mockWantedSearchResponse,
  mockWantedAuthResponse,
  mockWantedErrorResponse,
} from './api-fixtures.js';
import { mockTimelineEvents } from './timeline-fixtures.js';

export {
  mockJobs,
  mockJobsHighScore,
  mockJobsMediumScore,
  mockJobsLowScore,
  mockJobsWanted,
  mockJobsJobKorea,
  mockJobsSaramin,
  mockResumeData,
  mockApplications,
  createMockApplication,
  mockCoverLetter,
  mockCoverLetters,
  mockTelegramResponse,
  mockTelegramErrorResponse,
  mockTelegramSendMessageResponse,
  mockWantedResponse,
  mockWantedSearchResponse,
  mockWantedAuthResponse,
  mockWantedErrorResponse,
  mockTimelineEvents,
};

export default {
  mockJobs,
  mockResumeData,
  mockApplications,
  mockCoverLetter,
  mockTelegramResponse,
  mockWantedResponse,
  createMockApplication,
};
