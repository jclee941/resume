import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './constants.js';
import { log } from './utils.js';
import { buildJobKoreaFormData } from './jobkorea-sections.js';

const WRITE_URL = 'https://www.jobkorea.co.kr/User/Resume/Write?Input_Type_Code=3';

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
      return null;
    } catch (error) {
      log(`Failed to parse session file: ${error.message}`, 'error', 'jobkorea');
      return null;
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
      /\.Pos_Name$/,
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
      /Award\[.*\]\.Awd_Name$/,
      /Award\[.*\]\.Awd_Agency$/,
      /Award\[.*\]\.Awd_Year$/,
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
      /^Career\[(c\d+)\]\.(C_Name|C_Part|CSYM|CEYM|Pos_Name|M_MainFieldName)$/
    );
    if (match) {
      const map = {
        C_Name: 'company',
        C_Part: 'department',
        CSYM: 'start',
        CEYM: 'end',
        Pos_Name: 'role',
        M_MainFieldName: 'job category',
      };
      return `Career ${match[1]} ${map[match[2]] || match[2]}`;
    }

    match = name.match(/^UnivSchool\[(c\d+)\]\.(Schl_Name|Entc_YM|Grad_YM|Grad_Type_Code)$/);
    if (match) {
      const map = {
        Schl_Name: 'school',
        Entc_YM: 'start',
        Grad_YM: 'end',
        Grad_Type_Code: 'status',
      };
      return `School ${match[1]} ${map[match[2]] || match[2]}`;
    }

    match = name.match(/^UnivSchool\[(c\d+)\]\.UnivMajor\[0\]\.Major_Name$/);
    if (match) {
      return `School ${match[1]} major`;
    }

    match = name.match(/^License\[(c\d+)\]\.(Lc_Name|Lc_Pub|Lc_YYMM)$/);
    if (match) {
      const map = {
        Lc_Name: 'name',
        Lc_Pub: 'issuer',
        Lc_YYMM: 'date',
      };
      return `License ${match[1]} ${map[match[2]] || match[2]}`;
    }

    match = name.match(/^Award\[(c\d+)\]\.(Awd_Name|Awd_Agency|Awd_Year)$/);
    if (match) {
      const map = {
        Awd_Name: 'name',
        Awd_Agency: 'organization',
        Awd_Year: 'year',
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

      await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

      if (page.url().includes('/Login')) {
        log('Session expired - redirected to login page', 'error', 'jobkorea');
        return { success: false, changes: [], error: 'Session expired' };
      }

      await page.waitForFunction(() => typeof $ !== 'undefined' && $('#frm1').length > 0, {
        timeout: 15000,
      });

      const targetFields = buildJobKoreaFormData(ssot);

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
        const saveResult = await page.evaluate(async (patchFields) => {
          const baseFields = $('#frm1').serializeArray();

          const removePrefixes = ['Career[', 'UnivSchool[', 'License[', 'Award['];
          const removeExact = new Set([
            'Career.index',
            'UnivSchool.index',
            'License.index',
            'Award.index',
            'hdnIsCompleteSave',
          ]);
          const removeStartsWith = ['InputStat.', 'UserAddition.', 'HopeJob.', 'PIOfferAgree.'];

          const filtered = baseFields.filter((field) => {
            if (removeExact.has(field.name)) return false;
            if (removePrefixes.some((prefix) => field.name.startsWith(prefix))) return false;
            if (removeStartsWith.some((prefix) => field.name.startsWith(prefix))) return false;
            return true;
          });

          for (const patch of patchFields) {
            filtered.push({ name: patch.name, value: patch.value });
          }

          const completeIdx = filtered.findIndex((f) => f.name === 'hdnIsCompleteSave');
          if (completeIdx >= 0) {
            filtered[completeIdx].value = 'False';
          } else {
            filtered.push({ name: 'hdnIsCompleteSave', value: 'False' });
          }

          return await new Promise((resolve) => {
            $.post(`/User/Resume/Save?_=${Date.now()}`, filtered, (result) => {
              resolve(result?.saveResult || result);
            }).fail((xhr) => {
              resolve({ IsSuccess: false, error: xhr.statusText || 'POST failed' });
            });
          });
        }, targetFields);

        if (saveResult?.IsSuccess === false) {
          const errorMessage =
            saveResult?.ErrorMessage || saveResult?.error || 'Unknown save error';
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
      await browser.close();
    }
  }
}
