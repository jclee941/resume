import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BARREL_URL = new URL('../index.js', import.meta.url);

describe('matching barrel', () => {
  let mod;
  it('loads without error', async () => {
    mod = await import(BARREL_URL);
  });
  it('exports loadResume', () => {
    assert.equal(typeof mod.loadResume, 'function');
  });
  it('exports extractSkills', () => {
    assert.equal(typeof mod.extractSkills, 'function');
  });
  it('exports extractExperience', () => {
    assert.equal(typeof mod.extractExperience, 'function');
  });
  it('exports calculateMatchScore', () => {
    assert.equal(typeof mod.calculateMatchScore, 'function');
  });
  it('exports filterAndRankJobs', () => {
    assert.equal(typeof mod.filterAndRankJobs, 'function');
  });
  it('exports prioritizeApplications', () => {
    assert.equal(typeof mod.prioritizeApplications, 'function');
  });
  it('exports JobMatcher', () => {
    assert.equal(typeof mod.JobMatcher, 'object');
  });
  it('exports calculateAIMatch', () => {
    assert.equal(typeof mod.calculateAIMatch, 'function');
  });
  it('exports extractKeywordsWithAI', () => {
    assert.equal(typeof mod.extractKeywordsWithAI, 'function');
  });
  it('exports getCareerAdvice', () => {
    assert.equal(typeof mod.getCareerAdvice, 'function');
  });
  it('exports getAICareerAdvice', () => {
    assert.equal(typeof mod.getAICareerAdvice, 'function');
  });
  it('exports matchJobsWithAI', () => {
    assert.equal(typeof mod.matchJobsWithAI, 'function');
  });
  it('exports analyzeResume', () => {
    assert.equal(typeof mod.analyzeResume, 'function');
  });
  it('exports analyzeJobPosting', () => {
    assert.equal(typeof mod.analyzeJobPosting, 'function');
  });
  it('exports analyzeWithClaude', () => {
    assert.equal(typeof mod.analyzeWithClaude, 'function');
  });
});
