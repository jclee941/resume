/**
 * CI/CD Pipeline Integration Tests
 * Tests the integration between GitLab CI and n8n workflows
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

describe('CI/CD Pipeline Integration', () => {
  const gitlabDir = path.join(process.cwd(), '.gitlab', 'ci');
  const n8nWorkflowsDir = path.join(process.cwd(), 'infrastructure', 'n8n', 'workflows');

  describe('GitLab CI Configuration', () => {
    it('should have valid YAML syntax for all CI files', () => {
      const ciFiles = fs.readdirSync(gitlabDir).filter((f) => f.endsWith('.yml'));

      for (const file of ciFiles) {
        const content = fs.readFileSync(path.join(gitlabDir, file), 'utf8');
        expect(() => yaml.parse(content)).not.toThrow();
      }
    });

    it('should reference existing n8n workflows', () => {
      const n8nFiles = fs
        .readdirSync(n8nWorkflowsDir)
        .filter((f) => f.endsWith('.json') && f.startsWith('ci-'));

      const expectedWorkflows = [
        'ci-auto-issue-on-failure',
        'ci-auto-sync',
        'ci-elk-ingest',
        'ci-main-pipeline',
        'ci-notifications-unified',
        'ci-release',
        'ci-verify',
        'ci-wanted-resume-sync',
      ];

      for (const workflow of expectedWorkflows) {
        const exists = n8nFiles.some((f) => f.startsWith(workflow));
        expect(exists).toBe(true);
      }
    });
  });

  describe('n8n Workflow Webhook Endpoints', () => {
    const workflowFiles = fs
      .readdirSync(n8nWorkflowsDir)
      .filter((f) => f.endsWith('.json') && f.startsWith('ci-'));

    for (const file of workflowFiles) {
      test(`${file} should have valid webhook configuration`, () => {
        const content = fs.readFileSync(path.join(n8nWorkflowsDir, file), 'utf8');
        const workflow = JSON.parse(content);

        const webhookNodes = workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.webhook');

        if (webhookNodes.length > 0) {
          for (const node of webhookNodes) {
            expect(node.parameters?.path).toBeDefined();
            expect(['GET', 'POST']).toContain(node.parameters?.httpMethod);
          }
        }
      });
    }
  });

  describe('Secrets Integration', () => {
    it('should have Supabase Vault schema', () => {
      const vaultSchemaPath = path.join(
        process.cwd(),
        'infrastructure',
        'database',
        'migrations',
        '20260330_create_vault.sql'
      );
      expect(fs.existsSync(vaultSchemaPath)).toBe(true);

      const content = fs.readFileSync(vaultSchemaPath, 'utf8');
      expect(content).toContain('vault.secrets');
      expect(content).toContain('vault.access_log');
    });

    it('should have Edge Function source', () => {
      const edgeFunctionPath = path.join(
        process.cwd(),
        'supabase',
        'functions',
        'get-secret',
        'index.ts'
      );
      expect(fs.existsSync(edgeFunctionPath)).toBe(true);

      const content = fs.readFileSync(edgeFunctionPath, 'utf8');
      expect(content).toContain('get_secret');
      expect(content).toContain('get_secrets');
    });

    it('should have vault seed script', () => {
      const seedScriptPath = path.join(process.cwd(), 'tools', 'scripts', 'vault-seed.go');
      expect(fs.existsSync(seedScriptPath)).toBe(true);
    });
  });

  describe('Notification Integration', () => {
    it('should reference telegram-notifier sub-workflow', () => {
      const workflowFiles = fs
        .readdirSync(n8nWorkflowsDir)
        .filter((f) => f.endsWith('.json') && f.startsWith('ci-'));

      const TELEGRAM_WORKFLOW_ID = 'PV5yLgHNzNSlCmRT';

      for (const file of workflowFiles) {
        const content = fs.readFileSync(path.join(n8nWorkflowsDir, file), 'utf8');
        const workflow = JSON.parse(content);

        const hasExecuteWorkflow = workflow.nodes.some(
          (n) => n.type === 'n8n-nodes-base.executeWorkflow'
        );

        if (hasExecuteWorkflow) {
          const contentStr = JSON.stringify(workflow);
          const usesTelegram = contentStr.includes(TELEGRAM_WORKFLOW_ID);
          expect(usesTelegram).toBe(true);
        }
      }
    });
  });
});
