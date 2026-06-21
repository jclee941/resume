import assert from 'node:assert/strict';
import { CoverLetterService } from '../cover-letter-service.js';

const service = new CoverLetterService();

const packet = await service.selectEnglishApplicationPacket();

assert.equal(packet.language, 'en');
assert.equal(packet.packetId, 'foreign-company/security-sre');
assert.equal(packet.metadata.name, 'Foreign Company Security/SRE Application Packet');
assert.ok(packet.resume.summary.profile.includes('Security-focused infrastructure engineer'));
assert.ok(packet.coverLetter.includes('Dear Hiring Team,'));
assert.equal(packet.validation.noQuantifiedClaims, true);

await assert.rejects(
  () =>
    new CoverLetterService({
      packetData: { packet: { language: 'en' }, summary: {}, personal: {} },
    }).selectEnglishApplicationPacket(),
  /missing required packet fields/
);

await assert.rejects(
  () =>
    new CoverLetterService({
      packetData: buildPacketData({
        summary: {
          headline: 'Security engineer',
          profile: 'Reduced incident handling time by 80% through automation.',
        },
      }),
    }).selectEnglishApplicationPacket(),
  /quantified performance claim/
);

for (const targetRole of [
  'Security Engineer reduced alerts 80%',
  'Security Engineer reduced alerts eighty percent',
  'Security Engineer managed 20 servers',
  'Security Engineer improved signal ratio 3:1',
]) {
  let emittedCoverLetter = '';
  await assert.rejects(async () => {
    const rejectedPacket = await new CoverLetterService({
      packetData: buildPacketData({ packet: { targetRoles: [targetRole] } }),
    }).selectEnglishApplicationPacket();
    emittedCoverLetter = rejectedPacket.coverLetter;
  }, /quantified performance claim/);
  assert.equal(emittedCoverLetter, '');
}

for (const targetRoles of [
  [{ name: 'Security Engineer reduced alerts eighty percent' }],
  [{ name: 'Security Engineer reduced alerts 80%' }],
  [80],
]) {
  let emittedCoverLetter = '';
  await assert.rejects(async () => {
    const rejectedPacket = await new CoverLetterService({
      packetData: buildPacketData({ packet: { targetRoles } }),
    }).selectEnglishApplicationPacket();
    emittedCoverLetter = rejectedPacket.coverLetter;
  }, /targetRoles.*non-empty string array/);
  assert.equal(emittedCoverLetter, '');
}

for (const projects of [[null], ['manual workflow automation']]) {
  let emittedCoverLetter = '';
  await assert.rejects(async () => {
    const rejectedPacket = await new CoverLetterService({
      packetData: buildPacketData({ projects }),
    }).selectEnglishApplicationPacket();
    emittedCoverLetter = rejectedPacket.coverLetter;
  }, /projects\.0 must be an object/);
  assert.equal(emittedCoverLetter, '');
}

console.log('T10-PASS english no-quantified-claims');

function buildPacketData(overrides = {}) {
  return {
    packet: {
      name: 'Foreign Company Security/SRE Application Packet',
      language: 'en',
      audience: 'Foreign companies',
      targetRoles: ['Security Engineer'],
      sourcePolicy: 'Hand-crafted application variant independent from master resume parity',
      ...(overrides.packet ?? {}),
    },
    personal: {
      name: 'Tester',
      email: 'tester@example.com',
      phone: '010-0000-0000',
      ...(overrides.personal ?? {}),
    },
    summary: {
      headline: 'Security engineer',
      profile: 'Security engineer focused on automation and runbooks.',
      roleFit: ['Security engineering for regulated infrastructure'],
      ...(overrides.summary ?? {}),
    },
    careers: overrides.careers ?? [],
    projects: overrides.projects ?? [],
    skills: overrides.skills ?? { security: ['Splunk ES'] },
    certifications: overrides.certifications ?? [],
  };
}
