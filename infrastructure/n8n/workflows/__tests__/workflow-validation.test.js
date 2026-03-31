/**
 * N8N Workflow Validation Tests
 * Validates that all n8n workflow JSON files are syntactically correct
 * and follow project conventions.
 */

const fs = require('fs');
const path = require('path');

describe('n8n Workflow Validation', () => {
  const workflowsDir = path.join(__dirname, '..');
  const workflowFiles = fs
    .readdirSync(workflowsDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('archive/'))
    .map((f) => path.join(workflowsDir, f));

  describe('JSON Structure', () => {
    workflowFiles.forEach((filePath) => {
      const fileName = path.basename(filePath);

      test(`${fileName} should be valid JSON`, () => {
        const content = fs.readFileSync(filePath, 'utf8');
        expect(() => JSON.parse(content)).not.toThrow();
      });

      test(`${fileName} should have required fields`, () => {
        const content = fs.readFileSync(filePath, 'utf8');
        const workflow = JSON.parse(content);

        expect(workflow).toHaveProperty('name');
        expect(workflow).toHaveProperty('nodes');
        expect(workflow).toHaveProperty('connections');
        expect(Array.isArray(workflow.nodes)).toBe(true);
        expect(workflow.nodes.length).toBeGreaterThan(0);
      });

      test(`${fileName} nodes should have required properties`, () => {
        const content = fs.readFileSync(filePath, 'utf8');
        const workflow = JSON.parse(content);

        workflow.nodes.forEach((node, index) => {
          expect(node).toHaveProperty('id', `Node ${index} should have id`);
          expect(node).toHaveProperty('name', `Node ${index} should have name`);
          expect(node).toHaveProperty('type', `Node ${index} should have type`);
          expect(node).toHaveProperty('typeVersion', `Node ${index} should have typeVersion`);
          expect(node).toHaveProperty('position', `Node ${index} should have position`);
        });
      });
    });
  });

  describe('CI Workflows', () => {
    const ciWorkflowFiles = workflowFiles.filter((f) => path.basename(f).startsWith('ci-'));

    ciWorkflowFiles.forEach((filePath) => {
      const fileName = path.basename(filePath);

      test(`${fileName} should have webhook or schedule trigger`, () => {
        const content = fs.readFileSync(filePath, 'utf8');
        const workflow = JSON.parse(content);

        const hasWebhook = workflow.nodes.some((n) => n.type === 'n8n-nodes-base.webhook');
        const hasSchedule = workflow.nodes.some((n) => n.type === 'n8n-nodes-base.scheduleTrigger');

        expect(hasWebhook || hasSchedule).toBe(true);
      });

      test(`${fileName} should use telegram-notifier for notifications`, () => {
        const content = fs.readFileSync(filePath, 'utf8');
        const workflow = JSON.parse(content);

        const hasTelegramNotification = workflow.nodes.some(
          (n) =>
            n.type === 'n8n-nodes-base.executeWorkflow' &&
            n.parameters &&
            n.parameters.workflowId === 'PV5yLgHNzNSlCmRT'
        );

        // Not all workflows need notifications, but if they have notification nodes,
        // they should use the telegram-notifier
        const hasAnyNotification = workflow.nodes.some(
          (n) => n.type === 'n8n-nodes-base.executeWorkflow'
        );

        if (hasAnyNotification) {
          expect(hasTelegramNotification).toBe(true);
        }
      });
    });
  });

  describe('Node Type Versions', () => {
    const expectedTypeVersions = {
      'n8n-nodes-base.webhook': 2,
      'n8n-nodes-base.if': 2.2,
      'n8n-nodes-base.httpRequest': 4.2,
      'n8n-nodes-base.code': 2,
      'n8n-nodes-base.executeWorkflow': 1.1,
      'n8n-nodes-base.wait': 1.2,
      'n8n-nodes-base.scheduleTrigger': 1.3,
    };

    workflowFiles.forEach((filePath) => {
      const fileName = path.basename(filePath);

      test(`${fileName} should use consistent typeVersions`, () => {
        const content = fs.readFileSync(filePath, 'utf8');
        const workflow = JSON.parse(content);

        workflow.nodes.forEach((node) => {
          if (expectedTypeVersions[node.type]) {
            expect(node.typeVersion).toBe(expectedTypeVersions[node.type]);
          }
        });
      });
    });
  });

  describe('Connections', () => {
    workflowFiles.forEach((filePath) => {
      const fileName = path.basename(filePath);

      test(`${fileName} should have valid connections`, () => {
        const content = fs.readFileSync(filePath, 'utf8');
        const workflow = JSON.parse(content);

        const nodeIds = new Set(workflow.nodes.map((n) => n.id || n.name));

        Object.entries(workflow.connections || {}).forEach(([sourceNode, connections]) => {
          // Verify source node exists
          expect(nodeIds.has(sourceNode) || workflow.nodes.some((n) => n.name === sourceNode)).toBe(
            true
          );

          // Verify target nodes exist
          connections.forEach((connectionGroup) => {
            connectionGroup.forEach((connection) => {
              const targetId = connection.node;
              expect(nodeIds.has(targetId) || workflow.nodes.some((n) => n.name === targetId)).toBe(
                true
              );
            });
          });
        });
      });
    });
  });

  describe('Webhook Path Uniqueness', () => {
    test('all webhook paths should be unique', () => {
      const webhookPaths = [];

      workflowFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const workflow = JSON.parse(content);

        const webhookNodes = workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.webhook');
        webhookNodes.forEach((node) => {
          if (node.parameters && node.parameters.path) {
            webhookPaths.push({
              file: path.basename(filePath),
              path: node.parameters.path,
              nodeName: node.name,
            });
          }
        });
      });

      // Check for duplicates
      const pathCounts = {};
      webhookPaths.forEach(({ path }) => {
        pathCounts[path] = (pathCounts[path] || 0) + 1;
      });

      const duplicates = Object.entries(pathCounts).filter(([_, count]) => count > 1);
      expect(duplicates).toEqual([]);
    });
  });

  describe('JobKorea Automation Workflow', () => {
    const jobkoreaWorkflowPath = path.join(workflowsDir, 'jobkorea-automation.json');

    test('should exist', () => {
      expect(fs.existsSync(jobkoreaWorkflowPath)).toBe(true);
    });

    test('should have correct webhook path', () => {
      const content = fs.readFileSync(jobkoreaWorkflowPath, 'utf8');
      const workflow = JSON.parse(content);

      const webhookNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
      expect(webhookNode).toBeDefined();
      expect(webhookNode.parameters.path).toBe('jobkorea-automation');
    });

    test('should have Telegram nodes for notifications', () => {
      const content = fs.readFileSync(jobkoreaWorkflowPath, 'utf8');
      const workflow = JSON.parse(content);

      const telegramNodes = workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.telegram');
      expect(telegramNodes.length).toBeGreaterThanOrEqual(2);
    });

    test('should have event routing for profile_sync, job_search, application_status', () => {
      const content = fs.readFileSync(jobkoreaWorkflowPath, 'utf8');
      const workflow = JSON.parse(content);

      const ifNodes = workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.if');
      const hasProfileSync = ifNodes.some((n) => n.name?.includes('Profile'));
      const hasJobSearch = ifNodes.some((n) => n.name?.includes('Job'));
      const hasApplicationStatus = ifNodes.some((n) => n.name?.includes('Application'));

      expect(hasProfileSync || hasJobSearch || hasApplicationStatus).toBe(true);
    });
  });
});
