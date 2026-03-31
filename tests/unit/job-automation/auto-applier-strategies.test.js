/**
 * AutoApplier Strategy Tests
 * Updated for extracted strategy modules
 */
const fs = require('fs');
const path = require('path');

describe('AutoApplier strategy methods', () => {
  describe('Strategy Exports', () => {
    test('wanted-strategy.js exists and exports applyToWanted', () => {
      const strategyPath = path.join(__dirname, '../../../apps/job-server/src/auto-apply/strategies/wanted-strategy.js');
      expect(fs.existsSync(strategyPath)).toBe(true);
      const content = fs.readFileSync(strategyPath, 'utf8');
      expect(content).toContain('export async function applyToWanted');
    });

    test('jobkorea-strategy.js exists and exports applyToJobKorea', () => {
      const strategyPath = path.join(__dirname, '../../../apps/job-server/src/auto-apply/strategies/jobkorea-strategy.js');
      expect(fs.existsSync(strategyPath)).toBe(true);
      const content = fs.readFileSync(strategyPath, 'utf8');
      expect(content).toContain('export async function applyToJobKorea');
    });

    test('saramin-strategy.js exists and exports applyToSaramin', () => {
      const strategyPath = path.join(__dirname, '../../../apps/job-server/src/auto-apply/strategies/saramin-strategy.js');
      expect(fs.existsSync(strategyPath)).toBe(true);
      const content = fs.readFileSync(strategyPath, 'utf8');
      expect(content).toContain('export async function applyToSaramin');
    });

    test('linkedin-strategy.js exists and exports applyToLinkedIn', () => {
      const strategyPath = path.join(__dirname, '../../../apps/job-server/src/auto-apply/strategies/linkedin-strategy.js');
      expect(fs.existsSync(strategyPath)).toBe(true);
      const content = fs.readFileSync(strategyPath, 'utf8');
      expect(content).toContain('export async function applyToLinkedIn');
    });
  });

  describe('Platform Labels', () => {
    test('all strategies use correct platform labels', () => {
      const strategiesDir = path.join(__dirname, '../../../apps/job-server/src/auto-apply/strategies');
      
      // Check jobkorea strategy uses 'jobkorea' platform
      const jobkoreaContent = fs.readFileSync(path.join(strategiesDir, 'jobkorea-strategy.js'), 'utf8');
      expect(jobkoreaContent).toContain("'jobkorea'");
      // Should NOT have 'wanted' in notifyApplyFailed calls
      const jobkoreaFailedCalls = jobkoreaContent.match(/notifyApplyFailed[\s\S]*?'wanted'/g);
      expect(jobkoreaFailedCalls).toBeNull();
      
      // Check saramin strategy uses 'saramin' platform
      const saraminContent = fs.readFileSync(path.join(strategiesDir, 'saramin-strategy.js'), 'utf8');
      expect(saraminContent).toContain("'saramin'");
      const saraminFailedCalls = saraminContent.match(/notifyApplyFailed[\s\S]*?'wanted'/g);
      expect(saraminFailedCalls).toBeNull();
      
      // Check linkedin strategy uses 'linkedin' platform
      const linkedinContent = fs.readFileSync(path.join(strategiesDir, 'linkedin-strategy.js'), 'utf8');
      expect(linkedinContent).toContain("'linkedin'");
      const linkedinFailedCalls = linkedinContent.match(/notifyApplyFailed[\s\S]*?'wanted'/g);
      expect(linkedinFailedCalls).toBeNull();
      
      // Check wanted strategy (should use 'wanted')
      const wantedContent = fs.readFileSync(path.join(strategiesDir, 'wanted-strategy.js'), 'utf8');
      expect(wantedContent).toContain("'wanted'");
    });

    test('jobkorea strategy uses correct n8n notification platform', () => {
      const strategiesDir = path.join(__dirname, '../../../apps/job-server/src/auto-apply/strategies');
      const content = fs.readFileSync(path.join(strategiesDir, 'jobkorea-strategy.js'), 'utf8');
      
      // Find notifyApplyFailed calls
      const notifyCalls = content.match(/notifyApplyFailed\([^)]+\)/g);
      expect(notifyCalls).toBeTruthy();
      
      // Each call should end with 'jobkorea'
      notifyCalls.forEach(call => {
        expect(call).toContain("'jobkorea'");
      });
    });

    test('saramin strategy uses correct n8n notification platform', () => {
      const strategiesDir = path.join(__dirname, '../../../apps/job-server/src/auto-apply/strategies');
      const content = fs.readFileSync(path.join(strategiesDir, 'saramin-strategy.js'), 'utf8');
      
      const notifyCalls = content.match(/notifyApplyFailed\([^)]+\)/g);
      expect(notifyCalls).toBeTruthy();
      
      notifyCalls.forEach(call => {
        expect(call).toContain("'saramin'");
      });
    });

    test('linkedin strategy uses correct n8n notification platform', () => {
      const strategiesDir = path.join(__dirname, '../../../apps/job-server/src/auto-apply/strategies');
      const content = fs.readFileSync(path.join(strategiesDir, 'linkedin-strategy.js'), 'utf8');
      
      const notifyCalls = content.match(/notifyApplyFailed\([^)]+\)/g);
      expect(notifyCalls).toBeTruthy();
      
      notifyCalls.forEach(call => {
        expect(call).toContain("'linkedin'");
      });
    });
  });

  describe('Strategy Barrel Export', () => {
    test('strategies/index.js exports all strategies', () => {
      const indexPath = path.join(__dirname, '../../../apps/job-server/src/auto-apply/strategies/index.js');
      expect(fs.existsSync(indexPath)).toBe(true);
      
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('applyToWanted');
      expect(content).toContain('applyToJobKorea');
      expect(content).toContain('applyToSaramin');
      expect(content).toContain('applyToLinkedIn');
    });
  });
});
