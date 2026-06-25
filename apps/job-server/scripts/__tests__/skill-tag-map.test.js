import { describe, it } from 'node:test';
import assert from 'node:assert';

const { getTagTypeId } = await import('../skill-tag-map.js');

describe('skill-tag-map', () => {
  describe('getTagTypeId — previously null skills now resolve', () => {
    const previouslyNull = [
      'Loki',
      'Splunk',
      'GitHub Actions',
      'Ansible',
      'automation',
      'FortiGate',
      'FortiManager',
    ];

    for (const skill of previouslyNull) {
      it(`"${skill}" resolves to non-null tagTypeId`, () => {
        const tagId = getTagTypeId(skill);
        assert.notStrictEqual(tagId, null, `"${skill}" should not resolve to null`);
        assert.strictEqual(typeof tagId, 'number', `"${skill}" tagTypeId should be a number`);
      });
    }
  });

  describe('getTagTypeId — compound aliases no longer broken', () => {
    it('"Splunk ES" resolves to non-null (was routing to undefined Splunk key)', () => {
      const tagId = getTagTypeId('Splunk ES');
      assert.notStrictEqual(tagId, null, '"Splunk ES" should not resolve to null');
    });

    it('"FortiGate HA" resolves to non-null (was routing to undefined FortiGate key)', () => {
      const tagId = getTagTypeId('FortiGate HA');
      assert.notStrictEqual(tagId, null, '"FortiGate HA" should not resolve to null');
    });

    it('"FortiAnalyzer" resolves to non-null (was routing to undefined FortiManager key)', () => {
      const tagId = getTagTypeId('FortiAnalyzer');
      assert.notStrictEqual(tagId, null, '"FortiAnalyzer" should not resolve to null');
    });
  });

  describe('getTagTypeId — no regression on existing direct/aliased skills', () => {
    // Representative regression checks: direct keys + aliased skills that were already working
    const checks = [
      // Direct keys
      { skill: 'AWS', expected: 1698 },
      { skill: 'Prometheus', expected: 10497 },
      { skill: 'GitLab', expected: 1413 },
      { skill: 'DevOps', expected: 1952 },
      { skill: '인프라', expected: 1676 },
      { skill: 'Terraform', expected: 10498 },
      { skill: 'Grafana', expected: 10496 },
      // Existing aliases that already worked
      { skill: 'AWS EC2', expected: 1698 }, // -> AWS
      { skill: 'GitLab CI/CD', expected: 1413 }, // -> GitLab
      { skill: 'Docker Compose', expected: 2217 }, // -> Docker
      { skill: 'EC2', expected: 1698 }, // -> AWS
      { skill: 'EKS', expected: 1698 }, // -> AWS
      // Case-insensitive
      { skill: 'aws', expected: 1698 },
      { skill: 'prometheus', expected: 10497 },
    ];

    for (const { skill, expected } of checks) {
      it(`"${skill}" resolves to ${expected}`, () => {
        const tagId = getTagTypeId(skill);
        assert.strictEqual(tagId, expected, `"${skill}" expected ${expected}, got ${tagId}`);
      });
    }
  });

  describe('getTagTypeId — null for completely unknown skills', () => {
    const unknown = ['NotARealSkill', 'foobar', 'Unknown Tool 999'];
    for (const skill of unknown) {
      it(`"${skill}" returns null`, () => {
        assert.strictEqual(getTagTypeId(skill), null);
      });
    }
  });
});
