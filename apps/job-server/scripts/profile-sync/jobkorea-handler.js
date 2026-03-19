import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { CONFIG, PLATFORMS } from './constants.js';
import { log } from './utils.js';
import { buildJobKoreaFormData } from './jobkorea-sections.js';

/**
 * Build Edit URL for the user's existing resume.
 * Extracts rNo from PLATFORMS.jobkorea.profileUrl (View?rNo=XXXXX).
 * Throws if rNo cannot be determined — falling back to Write would create
 * a duplicate resume instead of editing the existing one.
 */
function getEditUrl() {
  const profileUrl = PLATFORMS.jobkorea?.profileUrl || '';
  const match = profileUrl.match(/[?&]rNo=(\d+)/i);
  if (!match) {
    throw new Error(
      `Cannot extract rNo from PLATFORMS.jobkorea.profileUrl ("${profileUrl}"). ` +
        'Set profileUrl to https://www.jobkorea.co.kr/User/Resume/View?rNo=XXXXX'
    );
  }
  return `https://www.jobkorea.co.kr/User/Resume/Edit?RNo=${match[1]}`;
}

export default class JobKoreaHandler {
  loadSession() {
    const sessionPath = path.join(CONFIG.SESSION_DIR, 'jobkorea-session.json');
    if (!fs.existsSync(sessionPath)) {
      return null;
    }

    try {
      const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      if (Array.isArray(session?.cookies) && session.cookies.length > 0) {
        return session.cookies;
      }
      if (Array.isArray(session) && session.length > 0) {
        return session;
      }
      // Fallback: parse cookieString into cookie objects for Playwright addCookies()
      if (session?.cookieString && typeof session.cookieString === 'string') {
        const parsed = session.cookieString
          .split(';')
          .map((p) => p.trim())
          .filter((p) => p && p.includes('='))
          .map((p) => {
            const [name, ...v] = p.split('=');
            return { name: name.trim(), value: v.join('=').trim(), domain: '.jobkorea.co.kr', path: '/', httpOnly: false, secure: true, sameSite: 'Lax' };
          });
        if (parsed.length > 0) return parsed;
      }
      return null;
    } catch (error) {
      log(`Failed to parse session file: ${error.message}`, 'error', 'jobkorea');
      return null;
    }
  }

  saveSession(cookies) {
    const sessionPath = path.join(CONFIG.SESSION_DIR, 'jobkorea-session.json');
    try {
      fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
      // Merge with existing session to preserve metadata (platform, expiresAt, etc.)
      // that auth-persistent.js --sync/--status depends on.
      // Normalize legacy array sessions (loadSession supports bare arrays) to objects.
      let session = {};
      try {
        const existing = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        session = Array.isArray(existing) ? {} : (existing && typeof existing === 'object' ? existing : {});
      } catch { /* no existing session */ }
      session.cookies = cookies;
      session.cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      session.cookieCount = cookies.length;
      session.extractedAt = new Date().toISOString();
      if (!session.platform) session.platform = 'jobkorea';
      if (!session.expiresAt) {
        session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }
      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
      log(`Session saved (${cookies.length} cookies)`, 'info', 'jobkorea');
    } catch (error) {
      log(`Failed to save session: ${error.message}`, 'error', 'jobkorea');
    }
  }

  computeChanges(currentFields, targetFields) {
    const currentByName = new Map();
    for (const field of currentFields || []) {
      if (!currentByName.has(field.name)) {
        currentByName.set(field.name, String(field.value ?? ''));
      }
    }

    const keyFieldPatterns = [
      /\.C_Name$/,
      /\.C_Part$/,
      /\.CSYM$/,
      /\.CEYM$/,
      /\.M_MainJob_Jikwi$/,
      /\.RetireSt$/,
      /\.M_MainField$/,
      /\.Prfm_Prt$/,
      /\.Schl_Name$/,
      /\.Entc_YM$/,
      /\.Grad_YM$/,
      /\.Major_Name$/,
      /\.Lc_Name$/,
      /\.Lc_Pub$/,
      /\.Lc_YYMM$/,
      /UserAddition\.Military_Stat$/,
      /UserAddition\.Military_Kind$/,
      /UserAddition\.Military_SYM$/,
      /UserAddition\.Military_EYM$/,
      /Award\[.*\]\.Award_Name$/,
      /Award\[.*\]\.Award_Inst_Name$/,
      /Award\[.*\]\.Award_Year$/,
      /HopeJob\./,
    ];

    const changes = [];
    for (const field of targetFields || []) {
      const isKeyField = keyFieldPatterns.some((pattern) => pattern.test(field.name));
      if (!isKeyField) {
        continue;
      }
      const from = currentByName.get(field.name) ?? '';
      const to = String(field.value ?? '');
      if (from !== to) {
        changes.push({
          field: this.describeField(field.name),
          from: from || '(empty)',
          to: to || '(empty)',
        });
      }
    }

    return changes;
  }

  describeField(name) {
    let match = name.match(
      /^Career\[([^\]]+)\]\.(C_Name|C_Part|CSYM|CEYM|M_MainJob_Jikwi|RetireSt|M_MainField|Prfm_Prt)$/
    );
    if (match) {
      const map = {
        C_Name: 'company',
        C_Part: 'department',
        CSYM: 'start',
        CEYM: 'end',
        M_MainJob_Jikwi: 'role',
        RetireSt: 'status',
        M_MainField: 'job code',
        Prfm_Prt: 'description',
      };
      return `Career ${match[1]} ${map[match[2]] || match[2]}`;
    }

    match = name.match(/^UnivSchool\[([^\]]+)\]\.(Schl_Name|Entc_YM|Grad_YM|Grad_Type_Code)$/);
    if (match) {
      const map = {
        Schl_Name: 'school',
        Entc_YM: 'start',
        Grad_YM: 'end',
        Grad_Type_Code: 'status',
      };
      return `School ${match[1]} ${map[match[2]] || match[2]}`;
    }

    match = name.match(/^UnivSchool\[([^\]]+)\]\.UnivMajor\[0\]\.Major_Name$/);
    if (match) {
      return `School ${match[1]} major`;
    }

    match = name.match(/^License\[([^\]]+)\]\.(Lc_Name|Lc_Pub|Lc_YYMM)$/);
    if (match) {
      const map = {
        Lc_Name: 'name',
        Lc_Pub: 'issuer',
        Lc_YYMM: 'date',
      };
      return `License ${match[1]} ${map[match[2]] || match[2]}`;
    }

    match = name.match(/^Award\[([^\]]+)\]\.(Award_Name|Award_Inst_Name|Award_Year)$/);
    if (match) {
      const map = {
        Award_Name: 'name',
        Award_Inst_Name: 'organization',
        Award_Year: 'year',
      };
      return `Award ${match[1]} ${map[match[2]] || match[2]}`;
    }

    if (name === 'UserAddition.Military_Stat') return 'Military status';
    if (name === 'UserAddition.Military_Kind') return 'Military kind';
    if (name === 'UserAddition.Military_SYM') return 'Military start';
    if (name === 'UserAddition.Military_EYM') return 'Military end';
    if (name === 'HopeJob.HJ_Name') return 'Hope job names';
    if (name === 'HopeJob.HJ_Name_Code') return 'Hope job codes';
    if (name === 'HopeJob.HJ_Code') return 'Hope job category';
    if (name === 'HopeJob.HJ_Local_Code') return 'Hope job location code';
    if (name === 'HopeJob.HJ_Local_Name') return 'Hope job location';

    return name;
  }

  /**
   * Read server-generated entry indices for a form section.
   * @param {import('playwright').Page} page
   * @param {string} prefix - Form field prefix (e.g. 'Career', 'License', 'UnivSchool')
   * @returns {Promise<string[]>} Array of index strings like ['c14', 'c844', '1_1773933194657']
   */
  async readSectionIndices(page, prefix) {
    return page.evaluate((pfx) => {
      const indices = [];
      const escaped = pfx.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      $('#frm1')
        .serializeArray()
        .forEach((f) => {
          const m = f.name.match(new RegExp(`^${escaped}\\[([^\\]]+)\\]\\.Index_Name$`));
          if (m && !indices.includes(m[1])) indices.push(m[1]);
        });
      return indices;
    }, prefix);
  }

  /**
   * Create entry slots in the JobKorea form by clicking "추가" buttons.
   * The server only accepts data for entries it generated — custom indices (c1-cN)
   * are silently dropped. This method creates the needed slots and reads back
   * the server-generated indices.
   *
   * @param {import('playwright').Page} page
   * @param {object} ssot - SSOT resume data
   * @returns {Promise<{career: string[], license: string[], award: string[], school: string}>}
   */
  async createEntrySlots(page, ssot) {
    const careers = Array.isArray(ssot?.careers) ? ssot.careers : [];
    const validCerts = (Array.isArray(ssot?.certifications) ? ssot.certifications : []).filter(
      (c) => c?.date
    );
    // Awards: fall back to achievements[] (string[]) if awards[] absent.
    let awardItems = Array.isArray(ssot?.awards) ? ssot.awards : [];
    if (awardItems.length === 0 && Array.isArray(ssot?.achievements)) {
      awardItems = ssot.achievements;
    }
    // The server only accepts data keyed to indices IT generated.
    // Existing entries (from previous saves) cannot be updated — only fresh "추가" entries persist.
    const sections = [
      { prefix: 'Career', needed: careers.length },
      { prefix: 'License', needed: validCerts.length },
      { prefix: 'Award', needed: awardItems.length },
    ];

    // Track existing indices per section BEFORE "추가" clicks.
    // Only "추가"-created entries persist via $.post — existing ones are silently dropped.
    const existingIndices = {};

    for (const { prefix, needed } of sections) {
      if (needed <= 0) continue;

      // Wait for section to have at least one entry after sidebar activation
      try {
        await page.waitForFunction(
          (pfx) => {
            return $('#frm1')
              .serializeArray()
              .some((f) => f.name.startsWith(`${pfx}[`));
          },
          prefix,
          { timeout: 5000 }
        );
      } catch {
        log(`Section ${prefix} not found in form after activation`, 'warn', 'jobkorea');
        continue;
      }

      // Record existing indices BEFORE any "추가" clicks
      existingIndices[prefix] = new Set(await this.readSectionIndices(page, prefix));

      // Click "추가" for the FULL needed count.
      // Existing entries can't be updated — we always create fresh ones.
      let addedCount = 0;

      while (addedCount < needed) {
        // Find and click the section's "\ucd94\uac00" button
        // Read count BEFORE clicking so we can detect the increment
        const prevTotal = (await this.readSectionIndices(page, prefix)).length;

        const clicked = await page.evaluate((pfx) => {
          const sectionLabels = { Career: '경력', License: '자격증', Award: '수상' };
          const label = sectionLabels[pfx];
          if (!label) return false;

          const heading = $('h2')
            .filter(function () {
              return $(this).text().includes(label);
            })
            .first();
          if (!heading.length) return false;

          let section = heading.parent();
          for (let i = 0; i < 5; i++) {
            if (!section.length || section.is('form, body')) break;
            const addBtn = section.find('button.buttonAddField').filter(function () {
              return $(this).text().includes('\ucd94\uac00');
            });
            if (addBtn.length > 0) {
              addBtn[0].click();
              return true;
            }
            section = section.parent();
          }
          return false;
        }, prefix);

        if (!clicked) {
          log(`"\ucd94\uac00" button not found for ${prefix}`, 'warn', 'jobkorea');
          break;
        }

        // Wait for entry count to increase
        try {
          await page.waitForFunction(
            ({ pfx, prev }) => {
              const seen = new Set();
              const escaped = pfx.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const re = new RegExp(`^${escaped}\\[([^\\]]+)\\]`);
              $('#frm1')
                .serializeArray()
                .forEach((f) => {
                  const m = f.name.match(re);
                  if (m) seen.add(m[1]);
                });
              return seen.size > prev;
            },
            { pfx: prefix, prev: prevTotal },
            { timeout: 5000 }
          );
        } catch {
          const newTotal = (await this.readSectionIndices(page, prefix)).length;
          if (newTotal <= prevTotal) {
            log(
              `Timeout: ${prefix} stuck at ${addedCount}/${needed} added entries`,
              'warn',
              'jobkorea'
            );
            break;
          }
        }

        addedCount++;
      }
    }

    // Read final indices for all sections
    const allCareerIndices = await this.readSectionIndices(page, 'Career');
    const allLicenseIndices = await this.readSectionIndices(page, 'License');
    const allAwardIndices = await this.readSectionIndices(page, 'Award');
    const schoolIndices = await this.readSectionIndices(page, 'UnivSchool');

    // Filter out existing entries — only "추가"-created entries persist.
    // Existing entries (from previous saves or templates) are silently dropped by the server.
    const filterExisting = (all, prefix) => {
      const existing = existingIndices[prefix];
      if (!existing || existing.size === 0) return all;
      return all.filter((idx) => !existing.has(idx));
    };

    return {
      career: filterExisting(allCareerIndices, 'Career'),
      license: filterExisting(allLicenseIndices, 'License'),
      award: filterExisting(allAwardIndices, 'Award'),
      school: schoolIndices[0] || 'c1',
    };
  }

  async sync(ssot) {
    log('Starting sync for JobKorea (via form POST)', 'info', 'jobkorea');

    const cookies = this.loadSession();
    if (!cookies) {
      log('No saved session - login to JobKorea first and save cookies', 'error', 'jobkorea');
      return { success: false, changes: [] };
    }

    const browser = await chromium.launch({ headless: CONFIG.HEADLESS });
    const UA_POOL = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ];
    const userAgent = UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
    const context = await browser.newContext({
      userAgent,
      viewport: { width: 1280, height: 800 },
    });

    try {
      await context.addCookies(cookies);
      const page = await context.newPage();

      const editUrl = getEditUrl();
      log(`Navigating to ${editUrl}`, 'info', 'jobkorea');
      await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      if (page.url().includes('/Login')) {
        log('Session expired - redirected to login page', 'error', 'jobkorea');
        return { success: false, changes: [], error: 'Session expired' };
      }

      await page.waitForFunction(() => typeof $ !== 'undefined' && $('#frm1').length > 0, {
        timeout: 15000,
      });

      // Step 1: Activate required sections via sidebar "필드추가" buttons.
      // This sets InputStat flags and creates one template entry per section.
      await page.evaluate(() => {
        const requiredSections = [
          'InputStat_CareerInputStat',
          'InputStat_LicenseInputStat',
          'InputStat_AwardInputStat',
        ];
        for (const syncId of requiredSections) {
          const btn = $(`button[data-sync_id="${syncId}"]`);
          if (btn.length && btn.text().trim() === '필드추가') {
            btn.click();
          }
        }
      });
      await page.waitForTimeout(1000);

      // Step 2: Create entry slots for each section. The server only accepts
      // data keyed to indices it generated — our old c1-cN were silently dropped.
      const sectionIndices = await this.createEntrySlots(page, ssot);
      log(
        `Entry slots — Career: ${sectionIndices.career.length} (${sectionIndices.career.join(',')}), ` +
          `License: ${sectionIndices.license.length} (${sectionIndices.license.join(',')}), ` +
          `Award: ${sectionIndices.award.length} (${sectionIndices.award.join(',')}), ` +
          `School: ${sectionIndices.school}`,
        'info',
        'jobkorea'
      );

      // Step 3: Build form data using server-generated indices
      const targetFields = buildJobKoreaFormData(ssot, sectionIndices);

      const currentFields = await page.evaluate(() => {
        return $('#frm1').serializeArray();
      });

      const changes = this.computeChanges(currentFields, targetFields);

      if (changes.length > 0) {
        log(`Found ${changes.length} field change(s)`, 'diff', 'jobkorea');
        for (const change of changes.slice(0, 20)) {
          log(`${change.field}: "${change.from}" -> "${change.to}"`, 'diff', 'jobkorea');
        }
        if (changes.length > 20) {
          log(`... and ${changes.length - 20} more`, 'diff', 'jobkorea');
        }
      } else {
        log('No changes detected', 'info', 'jobkorea');
      }

      if (CONFIG.APPLY && !CONFIG.DIFF_ONLY) {
        // Step 4: Remove old section entries from DOM before filling.
        // The server validates ALL Career/License/Award fields in the form,
        // not just those in Career.index. Stale entries cause validation errors.
        await page.evaluate(
          (indices) => {
            const sections = [
              { prefix: 'Career', keep: new Set(indices.career) },
              { prefix: 'License', keep: new Set(indices.license) },
              { prefix: 'Award', keep: new Set(indices.award) },
            ];
            for (const { prefix, keep } of sections) {
              document.querySelectorAll(`[name^="${prefix}["]`).forEach((el) => {
                const m = el.name.match(/\[([^\]]+)\]/);
                if (m && !keep.has(m[1])) el.remove();
              });
            }
          },
          {
            career: sectionIndices.career,
            license: sectionIndices.license,
            award: sectionIndices.award,
          }
        );

        // Step 5: Fill form fields in the DOM, then serialize and POST.
        // The save button triggers hdnIsCompleteSave=True which activates full validation.
        // By serializing the form ourselves with hdnIsCompleteSave=False, we bypass it.

        const fillStats = await page.evaluate((fields) => {
          const form = document.getElementById('frm1');
          let filled = 0;
          let created = 0;
          for (const { name, value } of fields) {
            const els = document.getElementsByName(name);
            if (els.length > 0) {
              els[0].value = String(value);
              els[0].dispatchEvent(new Event('change', { bubbles: true }));
              filled++;
            } else {
              // Create hidden input for metadata fields not in DOM
              const hidden = document.createElement('input');
              hidden.type = 'hidden';
              hidden.name = name;
              hidden.value = String(value);
              form.appendChild(hidden);
              created++;
            }
          }
          return { filled, created };
        }, targetFields);

        log(
          `Filled ${fillStats.filled} DOM fields (${fillStats.created} created)`,
          'info',
          'jobkorea'
        );

        // Set hdnIsCompleteSave = False to avoid full validation
        await page.evaluate(() => {
          const el = document.getElementsByName('hdnIsCompleteSave');
          if (el.length > 0) el[0].value = 'False';
        });

        // Step 5: Serialize the entire form (now with our values) and POST directly.
        // Using $.post instead of the save button avoids full-validation mode.
        const saveResult = await page.evaluate(async () => {
          const formData = $('#frm1').serializeArray();

          // Ensure hdnIsCompleteSave = False to skip full validation
          const completeIdx = formData.findIndex((f) => f.name === 'hdnIsCompleteSave');
          if (completeIdx >= 0) {
            formData[completeIdx].value = 'False';
          } else {
            formData.push({ name: 'hdnIsCompleteSave', value: 'False' });
          }

          return await new Promise((resolve) => {
            $.post(`/User/Resume/Save?_=${Date.now()}`, formData, (result) => {
              resolve(result?.saveResult || result);
            }).fail((xhr) => {
              resolve({ IsSuccess: false, error: xhr.statusText || 'POST failed' });
            });
          });
        });

        log(`Save response: ${JSON.stringify(saveResult).slice(0, 500)}`, 'info', 'jobkorea');

        if (saveResult?.IsSuccess === false) {
          const errorMessage =
            saveResult?.ErrorMessage ||
            saveResult?.FormError?.Message ||
            saveResult?.error ||
            'Unknown save error';
          log(`Save failed: ${errorMessage}`, 'error', 'jobkorea');
          return { success: false, changes, error: errorMessage };
        }

        log('Resume form save completed', 'success', 'jobkorea');
      }

      const dryRun = !CONFIG.APPLY || CONFIG.DIFF_ONLY;
      return { success: true, changes, dryRun };
    } catch (error) {
      log(`Sync failed: ${error.message}`, 'error', 'jobkorea');
      return { success: false, changes: [], error: error.message };
    } finally {
      try {
        const allCookies = await context.cookies();
        // Filter to jobkorea-relevant domains — matches auth-persistent.js:173 contract
        const updatedCookies = allCookies.filter((c) =>
          c.domain.includes('jobkorea.co.kr')
        );
        if (updatedCookies.length > 0) {
          this.saveSession(updatedCookies);
        }
      } catch {
        // Context may already be closed on error paths
      }
      await browser.close();
    }
  }
}
