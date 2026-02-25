#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// CI server URL - defaults to GitHub, falls back to GitLab for legacy CI
const CI_SERVER_URL = process.env.CI_SERVER_URL || 'https://github.com/jclee-homelab/resume';
const PROJECT_ID = process.env.CI_PROJECT_ID;
const MR_IID = process.env.CI_MERGE_REQUEST_IID;
const CI_JOB_TOKEN = process.env.CI_JOB_TOKEN;
const OPENCODE_MODEL = process.env.OPENCODE_MODEL || 'opencode/gpt-5-nano';

const CONFIG = {
  maxDiffSize: 100000,
  opencodeBinary: '/usr/local/bin/opencode',
};

function getGitDiff() {
  const targetBranch = process.env.CI_MERGE_REQUEST_TARGET_BRANCH_SHA || 'origin/master';
  try {
    return execSync(`git diff ${targetBranch} HEAD`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    return execSync('git diff HEAD~1 HEAD', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
  }
}

async function fetchMRDetails() {
  const url = `${CI_SERVER_URL}/api/v4/projects/${PROJECT_ID}/merge_requests/${MR_IID}`;
  const headers = {
    'JOB-TOKEN': CI_JOB_TOKEN || '',
  };
  const response = await fetch(url, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch MR details: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function postMRComment(body) {
  const url = `${CI_SERVER_URL}/api/v4/projects/${PROJECT_ID}/merge_requests/${MR_IID}/notes`;
  const headers = {
    'JOB-TOKEN': CI_JOB_TOKEN || '',
    'Content-Type': 'application/json',
  };
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to post MR comment: ${response.status} ${text}`);
  }
  return response.json();
}

function formatDiffForReview(diffText) {
  if (diffText.length > CONFIG.maxDiffSize) {
    return `${diffText.slice(0, CONFIG.maxDiffSize)  }\n\n*[Diff truncated due to size]*\n`;
  }
  return diffText;
}

function callOpenCode(prompt) {
  const tmpFile = path.join(os.tmpdir(), `oracle-prompt-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  try {
    const result = execSync(
      `${CONFIG.opencodeBinary} run -m "${OPENCODE_MODEL}" "$(cat ${tmpFile})"`,
      {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000,
        env: {
          ...process.env,
          HOME: process.env.HOME || '/home/gitlab-runner',
        },
      }
    );
    return result.trim();
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {}
  }
}

function generateReview(mrDetails, formattedDiff) {
  const prompt = `You are Oracle, an expert code reviewer. Review this merge request:

**Title**: ${mrDetails.title}
**Description**: ${mrDetails.description || '(none)'}
**Branch**: ${mrDetails.source_branch} → ${mrDetails.target_branch}

## Changes
${formattedDiff}

Review with these priorities:
1. **Security**: API keys, injection vulnerabilities, auth issues
2. **Correctness**: Logic errors, edge cases, type safety
3. **Performance**: N+1 queries, memory leaks, inefficient algorithms
4. **Maintainability**: Code clarity, proper error handling

Use this format:

## Summary
[1-2 sentence overview]

## Issues Found
[List critical/major issues with file:line references]

## Suggestions
[Optional improvements, not blockers]

## Verdict
[APPROVE / REQUEST_CHANGES / COMMENT]

If the changes look good, say so briefly. Don't manufacture issues.`;

  return callOpenCode(prompt);
}

async function main() {
  const requiredEnvVars = ['CI_JOB_TOKEN', 'CI_PROJECT_ID', 'CI_MERGE_REQUEST_IID'];
  const missing = requiredEnvVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`Reviewing MR !${MR_IID} in project ${PROJECT_ID}...`);
  console.log(`Using model: ${OPENCODE_MODEL}`);
  console.log(`OpenCode binary: ${CONFIG.opencodeBinary}`);

  try {
    const mrDetails = await fetchMRDetails();
    const diffText = getGitDiff();

    console.log(`MR: ${mrDetails.title}`);
    console.log(`Diff size: ${diffText.length} bytes`);

    if (diffText.trim().length === 0) {
      console.log('No code changes to review.');
      return;
    }

    const formattedDiff = formatDiffForReview(diffText);
    console.log('Generating Oracle review via OpenCode CLI...');

    const review = generateReview(mrDetails, formattedDiff);

    const comment = `## :crystal_ball: Oracle Code Review

${review}

---
*Automated review by [Oracle](https://github.com/jclee-homelab/resume/blob/master/tools/scripts/utils/oracle-review.js) | ${OPENCODE_MODEL}*`;

    await postMRComment(comment);
    console.log('Review posted successfully.');
  } catch (error) {
    console.error('Oracle review failed:', error.message);

    try {
      await postMRComment(`## :warning: Oracle Review Failed

Unable to complete automated code review.

\`\`\`
${error.message}
\`\`\`

Please review manually or re-run the pipeline.`);
    } catch {}

    process.exit(1);
  }
}

main();
