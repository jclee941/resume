import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { readPlatformSession } from '../../services/platform-session.js';
import { submitToAtsDryRunOnly } from './application-platform-catalog.js';
import { submitWithBrowserRendering } from './browser-rendering-submit.js';

export async function submitApplication(
  ctx,
  { platform, jobId, sourceUrl, resume, coverLetter, job }
) {
  const submitters = {
    wanted: () => submitToWanted(ctx, jobId, resume, coverLetter),
    linkedin: () => submitToLinkedIn(ctx, jobId, resume, coverLetter),
    remember: () => submitToRemember(ctx, jobId, resume, coverLetter),
    jobkorea: () => submitToJobKorea(ctx, jobId, resume, coverLetter, { sourceUrl, job }),
    saramin: () => submitToSaramin(ctx, jobId, resume, coverLetter, { sourceUrl, job }),
    greenhouse: () => submitToAtsDryRunOnly('greenhouse'),
    lever: () => submitToAtsDryRunOnly('lever'),
    ashby: () => submitToAtsDryRunOnly('ashby'),
  };
  const submitter = submitters[platform];
  if (!submitter) {
    return { success: false, error: `Unknown platform: ${platform}` };
  }
  try {
    return await submitter();
  } catch (error) {
    return { success: false, error: error.message };
  }
}
export async function submitToWanted(ctx, jobId, resume, coverLetter) {
  const session = await readPlatformSession(ctx.env, 'wanted');
  if (!session) return { success: false, error: 'No Wanted session' };
  const response = await fetch(
    `https://www.wanted.co.kr/api/v4/jobs/${jobId.replace('wanted-', '')}/apply`,
    {
      method: 'POST',
      headers: {
        Cookie: session,
        'Content-Type': 'application/json',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      body: JSON.stringify({ resume_id: resume?.id, cover_letter: coverLetter }),
    }
  );
  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Wanted API error: ${response.status} - ${error}` };
  }
  return { success: true, platformResponse: await response.json() };
}
export async function submitToLinkedIn(_ctx, _jobId, _resume, _coverLetter) {
  return browserAutomationRequired('linkedin', 'LinkedIn Easy Apply');
}
export async function submitToRemember(_ctx, _jobId, _resume, _coverLetter) {
  return browserAutomationRequired('remember', 'Remember application');
}
export async function submitToJobKorea(ctx, jobId, resume, coverLetter, options = {}) {
  return submitWithBrowserRendering(ctx, {
    platform: 'jobkorea',
    jobId,
    sourceUrl: options.sourceUrl,
    resume,
    coverLetter,
    job: options.job,
  });
}
export async function submitToSaramin(ctx, jobId, resume, coverLetter, options = {}) {
  return submitWithBrowserRendering(ctx, {
    platform: 'saramin',
    jobId,
    sourceUrl: options.sourceUrl,
    resume,
    coverLetter,
    job: options.job,
  });
}
function browserAutomationRequired(platform, label) {
  return {
    success: false,
    error: `${label} requires browser automation. Cloudflare native workflow recorded a handoff instead of retrying local CLI submission.`,
    platform,
    requiresJobServer: true,
    requiresBrowserAutomation: true,
  };
}
