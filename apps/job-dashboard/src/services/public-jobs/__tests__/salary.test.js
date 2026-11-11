import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractSalary } from '../salary.js';

describe('disclosed salary extraction', () => {
  for (const [text, expected] of [
    ['연봉: 5천만원 이상 근무시간: 주 40시간', '연봉: 5천만원 이상'],
    ['Salary: KRW 80,000,000 per year', 'Salary: KRW 80,000,000 per year'],
    ['Base pay: $70,000–$90,000 per year', 'Base pay: $70,000–$90,000 per year'],
    ['급여: 회사 내규에 따름 | 담당업무: 방화벽 운영', '급여: 회사 내규에 따름'],
    ['담당업무: 장비 보수 및 유지관리', null],
    ['지원 시 희망 연봉 기재', null],
  ]) {
    it(`preserves explicit pay and rejects unrelated text: ${text}`, () => {
      assert.equal(extractSalary(text), expected);
    });
  }
});
