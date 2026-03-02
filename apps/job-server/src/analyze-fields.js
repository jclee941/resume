/**
 * Analyze all controllable fields in Wanted Resume API
 */

import { SessionManager } from './tools/auth.js';

const RESUME_ID = 'AwcICwcLBAFIAgcDCwUAB01F';

async function analyzeFields() {
  const api = await SessionManager.getAPI();
  if (!api) {
    console.error('No session. Run wanted_auth first.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('WANTED RESUME FIELD ANALYSIS');
  console.log('='.repeat(60));

  // 1. Get resume detail
  const data = await api.getResumeDetail(RESUME_ID);

  // 1. Resume metadata
  console.log('\n1. RESUME METADATA:');
  console.log('   Keys:', Object.keys(data.resume || {}));
  if (data.resume) {
    console.log('   - key:', data.resume.key);
    console.log('   - title:', data.resume.title);
    console.log('   - lang:', data.resume.lang);
    console.log('   - is_complete:', data.resume.is_complete);
  }

  // 2. Careers structure
  console.log('\n2. CAREERS:');
  console.log('   Count:', data.careers?.length || 0);
  if (data.careers?.[0]) {
    const c = data.careers[0];
    console.log('   Keys:', Object.keys(c));
    console.log('\n   Sample career:');
    console.log('   - id:', c.id);
    console.log('   - title:', c.title);
    console.log('   - company:', JSON.stringify(c.company));
    console.log('   - employment_type:', c.employment_type);
    console.log('   - start_time:', c.start_time);
    console.log('   - end_time:', c.end_time);
    console.log('   - served:', c.served);
    console.log('   - order:', c.order);
    console.log('   - total_period:', c.total_period);
    console.log('   - is_certificated:', c.is_certificated);

    if (c.projects?.[0]) {
      console.log('\n   Project keys:', Object.keys(c.projects[0]));
      console.log('   Sample project:');
      console.log('   - id:', c.projects[0].id);
      console.log('   - title:', c.projects[0].title);
      console.log(
        '   - description:',
        `${c.projects[0].description?.substring(0, 100)  }...`,
      );
      console.log('   - order:', c.projects[0].order);
      console.log('   - start_time:', c.projects[0].start_time);
      console.log('   - end_time:', c.projects[0].end_time);
    }
  }

  // 3. Educations structure
  console.log('\n3. EDUCATIONS:');
  console.log('   Count:', data.educations?.length || 0);
  if (data.educations?.[0]) {
    const e = data.educations[0];
    console.log('   Keys:', Object.keys(e));
    console.log('\n   Sample education:');
    Object.entries(e).forEach(([k, v]) => {
      console.log(`   - ${k}:`, typeof v === 'object' ? JSON.stringify(v) : v);
    });
  }

  // 4. Skills structure
  console.log('\n4. SKILLS:');
  console.log('   Count:', data.skills?.length || 0);
  if (data.skills?.[0]) {
    console.log('   Keys:', Object.keys(data.skills[0]));
    console.log('   First 5 skills:');
    data.skills.slice(0, 5).forEach((s) => {
      console.log(`   - ${s.name} (id: ${s.id})`);
    });
  }

  // 5. Other fields
  console.log('\n5. OTHER FIELDS:');
  const otherKeys = Object.keys(data).filter(
    (k) => !['resume', 'careers', 'educations', 'skills'].includes(k),
  );
  console.log('   Keys:', otherKeys);

  otherKeys.forEach((key) => {
    const val = data[key];
    if (Array.isArray(val)) {
      console.log(`   - ${key}: Array(${val.length})`);
      if (val.length > 0 && typeof val[0] === 'object') {
        console.log('     First item keys:', Object.keys(val[0]));
      }
    } else if (typeof val === 'object' && val !== null) {
      console.log(`   - ${key}: Object`, Object.keys(val));
    } else {
      console.log(`   - ${key}:`, val);
    }
  });

  // 6. Test API endpoints
  console.log(`\n${  '='.repeat(60)}`);
  console.log('API ENDPOINT AVAILABILITY TEST');
  console.log('='.repeat(60));

  const endpoints = [
    {
      name: 'Career PATCH',
      path: `/resumes/v2/${RESUME_ID}/careers/${data.careers?.[0]?.id}`,
      method: 'PATCH',
    },
    {
      name: 'Career POST',
      path: `/resumes/v2/${RESUME_ID}/careers`,
      method: 'POST',
    },
    {
      name: 'Career DELETE',
      path: `/resumes/v2/${RESUME_ID}/careers/{id}`,
      method: 'DELETE',
    },
    {
      name: 'Education PATCH',
      path: `/resumes/v2/${RESUME_ID}/educations/{id}`,
      method: 'PATCH',
    },
    {
      name: 'Education POST',
      path: `/resumes/v2/${RESUME_ID}/educations`,
      method: 'POST',
    },
    {
      name: 'Skill PATCH',
      path: `/resumes/v2/${RESUME_ID}/skills`,
      method: 'PATCH',
    },
    { name: 'Resume PUT', path: `/resumes/v1/${RESUME_ID}`, method: 'PUT' },
    { name: 'PDF PUT', path: `/resumes/v1/${RESUME_ID}/pdf`, method: 'PUT' },
  ];

  console.log('\nKnown Chaos API endpoints:');
  endpoints.forEach((ep) => {
    console.log(`   ${ep.method.padEnd(6)} ${ep.path}`);
  });

  console.log(`\n${  '='.repeat(60)}`);
}

analyzeFields().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
