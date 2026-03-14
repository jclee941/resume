/**
 * Auto Applier - 자동 지원 봇
 * Stealth browser-based 자동 지원 시스템
 */

import { ApplicationManager, APPLICATION_STATUS } from './application-manager.js';
import { UnifiedJobCrawler } from '../crawlers/index.js';
import { withStealthBrowser, launchStealthBrowser } from '../crawlers/browser-utils.js';
import { SessionManager } from '../shared/services/session/index.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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
   * Puppeteer-compatible text selector helper.
   * Uses page.evaluate to find elements by text content (no $x / XPath needed).
   * @param {string} tag - HTML tag name (e.g. 'button', 'a', '*')
   * @param {string} text - Text to search for (substring match)
   * @param {string} [cssAlternative] - Optional CSS selector to try first
   * @returns {Promise<ElementHandle|null>}
   */
  async findByText(tag, text, cssAlternative = null) {
    // Try CSS selector first if provided
    if (cssAlternative) {
      const el = await this.page.$(cssAlternative);
      if (el) return el;
    }
    // Use evaluate to find by text content (Puppeteer-compatible)
    const handle = await this.page.evaluateHandle(
      (tagName, searchText) => {
        const elements = document.querySelectorAll(tagName);
        for (const el of elements) {
          if (el.textContent && el.textContent.includes(searchText)) {
            return el;
          }
        }
        return null;
      },
      tag,
      text
    );
    const element = handle.asElement();
    if (!element) {
      await handle.dispose();
      return null;
    }
    return element;
  }

  /**
   * Find element containing text (any tag).
   * @param {string} text - Text to search for
   * @returns {Promise<ElementHandle|null>}
   */
  async findElementWithText(text) {
    return this.findByText('*', text);
  }

  /**
   * 브라우저 초기화 (rebrowser-puppeteer)
   * Loads platform cookies from SessionManager automatically.
   */
  async initBrowser() {
    const { browser, page } = await launchStealthBrowser();
    this.browser = browser;
    this.page = page;

    // Load cookies from config if explicitly provided
    if (this.config.cookies) {
      await this.loadCookies(this.config.cookies);
    }

    // Auto-load platform cookies from SessionManager
    const platformDomains = {
      wanted: '.wanted.co.kr',
      jobkorea: '.jobkorea.co.kr',
      saramin: '.saramin.co.kr',
    };

    for (const [platform, domain] of Object.entries(platformDomains)) {
      try {
        let session = SessionManager.load(platform);

        // Fallback: check legacy per-platform session files
        if (!session?.cookies) {
          const legacyFile = join(homedir(), '.opencode', 'data', `${platform}-session.json`);
          if (existsSync(legacyFile)) {
            try {
              const legacyData = JSON.parse(readFileSync(legacyFile, 'utf-8'));
              if (legacyData?.cookies) {
                session = legacyData;
                console.log(`📂 ${platform}: loaded from legacy session file`);
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }

        if (session?.cookies) {
          if (typeof session.cookies === 'string') {
            await this.loadCookies(session.cookies, domain);
            console.log(`✅ ${platform} session cookies loaded`);
          } else if (Array.isArray(session.cookies)) {
            await this.loadCookies(session.cookies);
            console.log(
              `✅ ${platform} session cookies loaded (${session.cookies.length} cookies)`
            );
          }
        } else {
          console.log(`⚠️ ${platform}: no valid session found`);
        }
      } catch (e) {
        console.log(`⚠️ ${platform}: failed to load cookies - ${e.message}`);
      }
    }

    return this;
  }

  /**
   * 쿠키 로드 (rebrowser-puppeteer compatible)
   * @param {string|Array} cookies - Cookie string or array of cookie objects
   * @param {string} [domain] - Default domain for string cookies
   */
  async loadCookies(cookies, domain = '.wanted.co.kr') {
    if (typeof cookies === 'string') {
      // 쿠키 문자열 파싱
      const cookieList = cookies
        .split(';')
        .map((c) => {
          const [name, ...rest] = c.trim().split('=');
          return { name: name.trim(), value: rest.join('='), domain, path: '/' };
        })
        .filter((c) => c.name);
      await this.page.setCookie(...cookieList);
    } else if (Array.isArray(cookies)) {
      await this.page.setCookie(...cookies);
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
        try {
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
              console.error(`❌ Failed to apply to ${job.company}: ${error.message}`);
              results.failed++;
            }
          }
        } finally {
          await this.closeBrowser();
        }
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
      await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 2000));

      const loginLink =
        (await this.findByText('a', '로그인')) ||
        (await this.findByText('a', 'Sign in')) ||
        (await this.findByText('button', '로그인')) ||
        (await this.findByText('button', 'Sign in'));
      if (loginLink) {
        return { success: false, error: 'Not logged in to Wanted' };
      }

      // Try multiple selectors
      const applyButton =
        (await this.findByText('button', '지원하기')) ||
        (await this.findByText('a', '지원하기')) ||
        (await this.findByText('button', 'Apply'));
      if (!applyButton) {
        try {
          await this.page.screenshot({ path: `/tmp/wanted-debug-${Date.now()}.png` });
        } catch {}
        return { success: false, error: 'Apply button not found' };
      }

      await applyButton.click();
      await new Promise((r) => setTimeout(r, 1000));

      // 이력서 선택 (첫 번째 이력서)
      const resumeOption = await this.page.$('.resume-item');
      if (resumeOption) {
        await resumeOption.click();
      }

      // 제출 버튼 클릭
      const submitButton = await this.findByText('button', '제출');
      if (submitButton) {
        await submitButton.click();
        await new Promise((r) => setTimeout(r, 2000));
      }

      // 지원 완료 확인 (XPath text match)
      const successMessage = await this.findElementWithText('지원이 완료되었습니다');

      if (successMessage) {
        const application = this.appManager.addApplication(job);
        this.appManager.updateStatus(
          application.id,
          APPLICATION_STATUS.APPLIED,
          'Auto-applied via bot'
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
      await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 2000)); // wait for JS rendering

      // Debug: log page title and URL
      const pageTitle = await this.page.title();
      console.log(`  📄 JobKorea page: ${pageTitle} — ${job.sourceUrl}`);

      // Verify login state — if '로그인' text visible, cookies aren't working
      const loginLink = await this.findByText('a', '로그인');
      if (loginLink) {
        console.log('  ⚠️ JobKorea: NOT logged in despite cookies — trying cookie refresh...');
        // Navigate to homepage first to establish cookie session, then retry
        await this.page.goto('https://www.jobkorea.co.kr', { waitUntil: 'domcontentloaded' });
        await new Promise((r) => setTimeout(r, 2000));
        const stillLoggedOut = await this.findByText('a', '로그인');
        if (stillLoggedOut) {
          console.log('  ❌ JobKorea: Login failed — cookies may be expired');
          return { success: false, error: 'Not logged in — session cookies expired or invalid' };
        }
        // Re-navigate to job page after establishing session
        await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
        await new Promise((r) => setTimeout(r, 2000));
      }

      // Try multiple selectors for apply button (JobKorea uses '즉시 지원' not '입사지원')
      const applyButton =
        (await this.findByText('button', '즉시 지원')) ||
        (await this.findByText('a', '즉시 지원')) ||
        (await this.findByText('button', '즉시지원')) ||
        (await this.findByText('a', '즉시지원')) ||
        (await this.findByText('button', '잡코리아 즉시지원')) ||
        (await this.findByText('a', '잡코리아 즉시지원')) ||
        (await this.findByText('button', '입사지원')) ||
        (await this.findByText('a', '입사지원')) ||
        (await this.findByText('button', '지원하기')) ||
        (await this.findByText('a', '지원하기')) ||
        (await this.page.$('[class*="contained-primary"]')) ||
        (await this.page.$('[class*="btn_apply"]')) ||
        (await this.page.$('[class*="apply"]'));
      if (!applyButton) {
        // Screenshot for debugging
        try {
          await this.page.screenshot({ path: `/tmp/jobkorea-debug-${Date.now()}.png` });
        } catch {}
        return { success: false, error: 'Apply button not found' };
      }
      await applyButton.click();
      await new Promise((r) => setTimeout(r, 3000));

      // Handle JobKorea application popup/modal
      // 1. Check if already applied
      const alreadyApplied = await this.findElementWithText('이미 지원한');
      if (alreadyApplied) {
        return { success: false, error: 'Already applied to this job' };
      }

      // 2. Select default resume if not selected
      const resumeSelect =
        (await this.page.$('.resume_select')) || (await this.page.$('.apply_resume_list'));
      if (resumeSelect) {
        const firstResume =
          (await this.page.$('.resume_item:first-child')) ||
          (await this.page.$('input[type="radio"]:first-child'));
        if (firstResume) await firstResume.click();
      }

      // 3. Final submission button (try CSS IDs first, then text match)
      const finalSubmit =
        (await this.findByText('button', '지원하기', '#btnApplyDirect')) ||
        (await this.page.$('.btn_apply_confirm'));

      if (finalSubmit) {
        await finalSubmit.click();
        await new Promise((r) => setTimeout(r, 3000));
      }

      const successMessage =
        (await this.findElementWithText('지원이 완료')) ||
        (await this.findElementWithText('지원 완료')) ||
        (await this.findElementWithText('지원하였습니다'));

      const errorMessage =
        (await this.findElementWithText('오류')) ||
        (await this.findElementWithText('실패')) ||
        (await this.findElementWithText('지원할 수 없습니다'));

      if (errorMessage) {
        return { success: false, error: 'Application error detected on page' };
      }
      if (!successMessage) {
        return { success: false, error: 'JobKorea application confirmation not found — no success signal detected' };
      }

      const application = this.appManager.addApplication(job);
      this.appManager.updateStatus(
        application.id,
        APPLICATION_STATUS.APPLIED,
        'Auto-applied via bot (JobKorea)'
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
      await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 2000));

      const loginLink =
        (await this.findByText('a', '로그인')) ||
        (await this.findByText('a', 'Sign in')) ||
        (await this.findByText('button', '로그인')) ||
        (await this.findByText('button', 'Sign in'));
      if (loginLink) {
        return { success: false, error: 'Not logged in to Saramin' };
      }

      // Try multiple selectors
      const applyButton =
        (await this.findByText('a', '입사지원', 'button.btn_apply')) ||
        (await this.findByText('button', '입사지원')) ||
        (await this.findByText('a', '지원하기')) ||
        (await this.findByText('button', '지원하기')) ||
        (await this.page.$('.btn_apply')) ||
        (await this.page.$('[class*="apply"]'));
      if (!applyButton) {
        try {
          await this.page.screenshot({ path: `/tmp/saramin-debug-${Date.now()}.png` });
        } catch {}
        return { success: false, error: 'Apply button not found' };
      }

      await applyButton.click();
      await new Promise((r) => setTimeout(r, 3000));

      // Handle Saramin application modal
      // 1. Check for 'Already Applied'
      const alreadyApplied = await this.findElementWithText('이미 지원한');
      if (alreadyApplied) {
        return { success: false, error: 'Already applied to this job' };
      }

      // 2. Click through agreement/resume selection if needed
      const confirmButton =
        (await this.findByText('button', '확인', '.btn_apply_submit')) ||
        (await this.findByText('button', '지원하기'));

      if (confirmButton) {
        await confirmButton.click();
        await new Promise((r) => setTimeout(r, 3000));
      }

      const successMessage =
        (await this.findElementWithText('지원이 완료')) ||
        (await this.findElementWithText('지원 완료')) ||
        (await this.findElementWithText('지원하였습니다'));

      const errorMessage =
        (await this.findElementWithText('오류')) ||
        (await this.findElementWithText('실패')) ||
        (await this.findElementWithText('지원할 수 없습니다'));

      if (errorMessage) {
        return { success: false, error: 'Application error detected on page' };
      }
      if (!successMessage) {
        return { success: false, error: 'Saramin application confirmation not found — no success signal detected' };
      }

      const application = this.appManager.addApplication(job);
      this.appManager.updateStatus(
        application.id,
        APPLICATION_STATUS.APPLIED,
        'Auto-applied via bot (Saramin)'
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
      await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });

      // Easy Apply 버튼 확인
      const easyApplyButton = await this.findByText('button', 'Easy Apply');
      if (!easyApplyButton) {
        // Easy Apply가 아니면 외부 지원으로 처리
        const application = this.appManager.addApplication(job, {
          notes: 'External application required',
        });
        return { success: true, application, external: true };
      }

      await easyApplyButton.click();
      await new Promise((r) => setTimeout(r, 2000));

      // Navigate through multi-step application form
      let steps = 0;
      const MAX_STEPS = 10;

      while (steps < MAX_STEPS) {
        // Look for 'Next' or 'Review' buttons
        const nextButton =
          (await this.findByText('button', 'Next')) || (await this.findByText('button', 'Review'));

        if (nextButton) {
          await nextButton.click();
          await new Promise((r) => setTimeout(r, 1500));
          steps++;
          continue;
        }

        // Look for 'Submit application' button
        const submitButton = await this.findByText('button', 'Submit application');

        if (submitButton) {
          await submitButton.click();
          await new Promise((r) => setTimeout(r, 3000));
          break;
        }

        // Exit loop if no actionable buttons found
        break;
      }

      const successMessage =
        (await this.findElementWithText('application was sent')) ||
        (await this.findElementWithText('Application submitted')) ||
        (await this.findElementWithText('Your application was sent')) ||
        (await this.findElementWithText('Application sent'));

      if (!successMessage) {
        return { success: false, error: 'Application confirmation not found' };
      }

      const application = this.appManager.addApplication(job);
      this.appManager.updateStatus(
        application.id,
        APPLICATION_STATUS.APPLIED,
        'Auto-applied via LinkedIn Easy Apply'
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
