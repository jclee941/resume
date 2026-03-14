/**
 * Auto Applier - 자동 지원 봇
 * Stealth browser-based 자동 지원 시스템
 */

import {
  ApplicationManager,
  APPLICATION_STATUS,
} from './application-manager.js';
import { UnifiedJobCrawler } from '../crawlers/index.js';
import { withStealthBrowser, launchStealthBrowser } from '../crawlers/browser-utils.js';

export class AutoApplier {
  constructor(options = {}) {
    this.crawler = new UnifiedJobCrawler(options.crawler);
    this.appManager = new ApplicationManager();
    this.config = {
      maxDailyApplications: options.maxDailyApplications || 10,
      reviewThreshold: options.reviewThreshold || 60,
      autoApplyThreshold: options.autoApplyThreshold || 75,
      autoApply: options.autoApply !== undefined ? options.autoApply : false,
      dryRun: options.dryRun !== undefined ? options.dryRun : true,
      delayBetweenApps: options.delayBetweenApps || 5000,
      excludeCompanies: options.excludeCompanies || [],
      preferredCompanies: options.preferredCompanies || [],
      ...options,
    };
    this.browser = null;
    this.page = null;
  }

  /**
   * 브라우저 초기화 (Playwright)
   */
  async initBrowser() {
    const { browser, page } = await launchStealthBrowser();
    this.browser = browser;
    this.page = page;

    if (this.config.cookies) {
      await this.loadCookies(this.config.cookies);
    }

    return this;
  }


  /**
   * 쿠키 로드
   */
  async loadCookies(cookies) {
    if (typeof cookies === 'string') {
      // 쿠키 문자열 파싱
      const cookieList = cookies.split(';').map((c) => {
        const [name, value] = c.trim().split('=');
        return { name, value, domain: '.wanted.co.kr', path: '/' };
      });
      await this.page.context().addCookies(cookieList);
    } else if (Array.isArray(cookies)) {
      await this.page.context().addCookies(cookies);
    }
  }

  /**
   * 브라우저 종료
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * 자동 지원 실행
   */
  async run(options = {}) {
    const {
      keywords = ['시니어 엔지니어', '클라우드 엔지니어', 'SRE'],
      categories = [],
      experience = 8,
      location = 'seoul',
      maxApplications = this.config.maxDailyApplications,
    } = options;

    const results = {
      searched: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      failed: 0,
      applications: [],
    };

    try {
      // 1. 채용공고 검색
      console.log('🔍 Searching for jobs...');
      const searchResult = await this.crawler.searchWithMatching({
        keywords,
        categories,
        experience,
        location,
        minScore: this.config.minMatchScore,
        maxResults: maxApplications * 2,
        excludeCompanies: this.config.excludeCompanies,
      });

      if (!searchResult.success) {
        return { success: false, error: 'Search failed', results };
      }

      results.searched = searchResult.totalJobs;
      console.log(`📋 Found ${results.searched} matching jobs`);

      // 2. 지원 대상 필터링
      const candidates = searchResult.jobs
        .filter((job) => !this.appManager.isDuplicate(job.id))
        .filter((job) => job.matchPercentage >= this.config.minMatchScore)
        .slice(0, maxApplications);

      results.matched = candidates.length;
      console.log(`✅ ${results.matched} jobs ready for application`);

      // 3. 지원 실행
      if (this.config.autoApply && !this.config.dryRun) {
        await this.initBrowser();

        for (const job of candidates) {
          try {
            const appResult = await this.applyToJob(job);

            if (appResult.success) {
              results.applied++;
              results.applications.push(appResult.application);
            } else {
              results.failed++;
            }

            // 딜레이
            await this.sleep(this.config.delayBetweenApps);
          } catch (error) {
            console.error(
              `❌ Failed to apply to ${job.company}: ${error.message}`,
            );
            results.failed++;
          }
        }

        await this.closeBrowser();
      } else {
        // Dry run - 지원 대기 상태로만 등록
        for (const job of candidates) {
          const application = this.appManager.addApplication(job, {
            notes: this.config.dryRun ? 'Dry run - not actually applied' : '',
          });
          results.applications.push(application);
        }
        results.skipped = candidates.length;
      }

      return {
        success: true,
        results,
        resumeAnalysis: searchResult.resumeAnalysis,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        results,
      };
    }
  }

  /**
   * 개별 채용공고 지원
   */
  async applyToJob(job) {
    const source = job.source;

    // 소스별 지원 처리
    switch (source) {
      case 'wanted':
        return this.applyToWanted(job);
      case 'jobkorea':
        return this.applyToJobKorea(job);
      case 'saramin':
        return this.applyToSaramin(job);
      case 'linkedin':
        return this.applyToLinkedIn(job);
      default:
        return { success: false, error: `Unsupported source: ${source}` };
    }
  }

  /**
   * 원티드 지원
   */
  async applyToWanted(job) {
    try {
      // 채용공고 페이지 이동
      await this.page.goto(job.sourceUrl, { waitUntil: 'networkidle' });

      // 지원하기 버튼 클릭
      const applyButton = await this.page.$('button:has-text("지원하기")');
      if (!applyButton) {
        return { success: false, error: 'Apply button not found' };
      }

      await applyButton.click();
      await this.page.waitForTimeout(1000);

      // 이력서 선택 (첫 번째 이력서)
      const resumeOption = await this.page.$('.resume-item');
      if (resumeOption) {
        await resumeOption.click();
      }

      // 제출 버튼 클릭
      const submitButton = await this.page.$('button:has-text("제출")');
      if (submitButton) {
        await submitButton.click();
        await this.page.waitForTimeout(2000);
      }

      // 지원 완료 확인
      const successMessage = await this.page.$('text=지원이 완료되었습니다');

      if (successMessage) {
        const application = this.appManager.addApplication(job);
        this.appManager.updateStatus(
          application.id,
          APPLICATION_STATUS.APPLIED,
          'Auto-applied via bot',
        );

        return { success: true, application };
      }

      return { success: false, error: 'Application confirmation not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 잡코리아 지원
   */
  async applyToJobKorea(job) {
    try {
      await this.page.goto(job.sourceUrl, { waitUntil: 'networkidle' });

      // Click initial apply button
      const applyButton = await this.page.$(
        'a.btn_apply, button:has-text("입사지원")',
      );
      if (!applyButton) {
        return { success: false, error: 'Apply button not found' };
      }

      await applyButton.click();
      await this.page.waitForTimeout(3000);

      // Handle JobKorea application popup/modal
      // 1. Check if already applied
      const alreadyApplied = await this.page.$('text="이미 지원한"');
      if (alreadyApplied) {
        return { success: false, error: 'Already applied to this job' };
      }

      // 2. Select default resume if not selected
      const resumeSelect = await this.page.$(
        '.resume_select, .apply_resume_list',
      );
      if (resumeSelect) {
        // Assume first resume is the master one
        const firstResume = await this.page.$(
          '.resume_item:first-child, input[type="radio"]:first-child',
        );
        if (firstResume) await firstResume.click();
      }

      // 3. Final submission button
      const finalSubmit = await this.page.$(
        'button:has-text("지원하기"), #btnApplyDirect, .btn_apply_confirm',
      );

      if (finalSubmit) {
        await finalSubmit.click();
        await this.page.waitForTimeout(3000);
      }

      const application = this.appManager.addApplication(job);
      this.appManager.updateStatus(
        application.id,
        APPLICATION_STATUS.APPLIED,
        'Auto-applied via bot (JobKorea)',
      );

      return { success: true, application };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 사람인 지원
   */
  async applyToSaramin(job) {
    try {
      await this.page.goto(job.sourceUrl, { waitUntil: 'networkidle' });

      // Click initial apply button
      const applyButton = await this.page.$(
        'button.btn_apply, a:has-text("입사지원")',
      );
      if (!applyButton) {
        return { success: false, error: 'Apply button not found' };
      }

      await applyButton.click();
      await this.page.waitForTimeout(3000);

      // Handle Saramin application modal
      // 1. Check for 'Already Applied'
      const alreadyApplied = await this.page.$('text="이미 지원한"');
      if (alreadyApplied) {
        return { success: false, error: 'Already applied to this job' };
      }

      // 2. Click through agreement/resume selection if needed
      const confirmButton = await this.page.$(
        'button:has-text("확인"), button:has-text("지원하기"), .btn_apply_submit',
      );

      if (confirmButton) {
        await confirmButton.click();
        await this.page.waitForTimeout(3000);
      }

      const application = this.appManager.addApplication(job);
      this.appManager.updateStatus(
        application.id,
        APPLICATION_STATUS.APPLIED,
        'Auto-applied via bot (Saramin)',
      );

      return { success: true, application };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 링크드인 지원 (Easy Apply만)
   */
  async applyToLinkedIn(job) {
    try {
      await this.page.goto(job.sourceUrl, { waitUntil: 'networkidle' });

      // Easy Apply 버튼 확인
      const easyApplyButton = await this.page.$(
        'button:has-text("Easy Apply")',
      );
      if (!easyApplyButton) {
        // Easy Apply가 아니면 외부 지원으로 처리
        const application = this.appManager.addApplication(job, {
          notes: 'External application required',
        });
        return { success: true, application, external: true };
      }

      await easyApplyButton.click();
      await this.page.waitForTimeout(2000);

      // Navigate through multi-step application form
      let steps = 0;
      const MAX_STEPS = 10;

      while (steps < MAX_STEPS) {
        // Look for 'Next' or 'Review' buttons
        const nextButton = await this.page.$(
          'button:has-text("Next"), button:has-text("Review")',
        );

        if (nextButton) {
          await nextButton.click();
          await this.page.waitForTimeout(1500);
          steps++;
          continue;
        }

        // Look for 'Submit application' button
        const submitButton = await this.page.$(
          'button:has-text("Submit application")',
        );

        if (submitButton) {
          await submitButton.click();
          await this.page.waitForTimeout(3000);
          break;
        }

        // Exit loop if no actionable buttons found
        break;
      }

      const application = this.appManager.addApplication(job);
      this.appManager.updateStatus(
        application.id,
        APPLICATION_STATUS.APPLIED,
        'Auto-applied via LinkedIn Easy Apply',
      );

      return { success: true, application };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 지원 현황 조회
   */
  getApplications(filters = {}) {
    return this.appManager.listApplications(filters);
  }

  /**
   * 통계 조회
   */
  getStats() {
    return this.appManager.getStats();
  }

  /**
   * 일일 리포트
   */
  getDailyReport(date) {
    return this.appManager.generateDailyReport(date);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default AutoApplier;
