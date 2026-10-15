import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isNonItTitle, itTerms, needsDetail, relevanceScore } from '../filter.js';

describe('public-jobs filter', () => {
  it('finds IT and security terms in posting text', () => {
    assert.deepEqual(itTerms('행정직(7~8급) 전산관리 및 정보보안'), ['전산', '정보보안']);
    assert.deepEqual(itTerms('전문직행원(신입) IT 10명'), ['IT']);
    assert.deepEqual(itTerms('보안관제 시스템 운영'), ['보안관제', '시스템운영']);
  });

  it('ignores legal, consent and school wording that only looks like IT', () => {
    assert.deepEqual(itTerms('「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 위반자'), []);
    assert.deepEqual(itTerms('개인정보 수집·이용 동의서, 사이버대학 졸업자'), []);
    assert.deepEqual(itTerms('ITEM WAIT SPLIT'), []);
  });

  it('fetches details for IT or generic titles only', () => {
    assert.equal(needsDetail('2026년 하반기 직원 채용 공고'), true);
    assert.equal(needsDetail('정보보안 및 전산행정 채용'), true);
    assert.equal(needsDetail('기간제 간호사 채용 공고'), false);
    assert.equal(needsDetail('정규직 간호조무사 채용'), false);
  });

  it('treats a title as non-IT only when it names a non-IT job and no IT term', () => {
    assert.equal(isNonItTitle('[부산보훈병원] 정규직(방사선사, 전산, 간호조무사) 채용'), false);
    assert.equal(isNonItTitle('정수장 시설운영관리 단기계약근로자 채용'), true);
    assert.equal(isNonItTitle('양주수도지사 특수직(수탁운영_지방상수도 시설운영) 채용 공고'), true);
    assert.equal(isNonItTitle('2026년도 제2차 체험형 청년인턴 선발'), true);
    assert.equal(isNonItTitle('2026년 제2차 직원 채용'), false);
  });

  it('scores relevance only for IT postings', () => {
    assert.equal(relevanceScore({ terms: [], location: '서울' }), 0);
    assert.equal(relevanceScore({ terms: ['정보통신'], weak: true, location: '부산' }), 30);
    assert.equal(
      relevanceScore({
        terms: ['전산'],
        location: '서울',
        education: '학력무관',
        career: '신입+경력',
      }),
      100
    );
    assert.equal(
      relevanceScore({ terms: ['전산'], location: '부산', education: '대졸(4년)', career: '신입' }),
      50
    );
  });
});
