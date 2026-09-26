/**
 * @typedef {Object} ProfileSyncSelectors
 * @property {string} [name]
 * @property {string} [headline]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [skills]
 * @property {string} [nameInput]
 * @property {string} [emailInput]
 * @property {string} [phoneInput]
 * @property {string} [companyInput]
 * @property {string} [titleInput]
 * @property {string} [schoolInput]
 * @property {string} [majorInput]
 * @property {string} [certInput]
 */

/**
 * @typedef {Object} BrowserProfileSyncContext
 * @property {import('playwright').Page} page
 * @property {ProfileSyncSelectors} selectors
 * @property {Record<string, string>} urls
 * @property {(selectors: Array<string | undefined | null>) => Promise<void>} waitForAnyConfiguredSelector
 * @property {() => Promise<void>} waitForConfiguredProfileSelectors
 * @property {() => Promise<void>} waitForConfiguredEditSelectors
 */

/**
 * @this {BrowserProfileSyncContext}
 * @param {Array<string | undefined | null>} selectors
 */
export async function waitForAnyConfiguredSelector(selectors) {
  const candidates = selectors.filter(
    /** @type {(selector: string | undefined | null) => selector is string} */ (
      (selector) => typeof selector === 'string' && selector.length > 0
    )
  );
  if (candidates.length === 0) return;
  await this.page.waitForFunction(
    /** @type {(selectorList: string[]) => boolean} */ (
      (selectorList) => selectorList.some((selector) => document.querySelector(selector))
    ),
    candidates,
    { timeout: 10000 }
  );
}

/**
 * @this {BrowserProfileSyncContext}
 */
export async function waitForConfiguredProfileSelectors() {
  await this.waitForAnyConfiguredSelector([
    this.selectors.name,
    this.selectors.headline,
    this.selectors.email,
    this.selectors.phone,
    this.selectors.skills,
  ]);
}

/**
 * @this {BrowserProfileSyncContext}
 */
export async function waitForConfiguredEditSelectors() {
  await this.waitForAnyConfiguredSelector([
    this.selectors.nameInput,
    this.selectors.emailInput,
    this.selectors.phoneInput,
  ]);
}

/**
 * @this {BrowserProfileSyncContext}
 * @param {{ name?: string, email?: string, phone?: string }} personal
 */
export async function fillPersonalInfo(personal) {
  if (!this.urls.edit) return;
  await this.page.goto(this.urls.edit, { waitUntil: 'domcontentloaded' });
  const s = this.selectors;
  await this.waitForConfiguredEditSelectors();
  if (s.nameInput && personal.name) {
    const el = await this.page.$(s.nameInput);
    if (el) await el.fill(personal.name);
  }
  if (s.emailInput && personal.email) {
    const el = await this.page.$(s.emailInput);
    if (el) await el.fill(personal.email);
  }
  if (s.phoneInput && personal.phone) {
    const el = await this.page.$(s.phoneInput);
    if (el) await el.fill(personal.phone);
  }
}

/**
 * @this {BrowserProfileSyncContext}
 * @param {Array<{ company: string, role: string }> | unknown} careers
 */
export async function fillCareers(careers) {
  if (!Array.isArray(careers)) return;
  for (const career of careers.slice(0, 5)) {
    const addBtn = await this.page.$(
      'button:has-text("추가"), a:has-text("경력 추가"), button[class*="add"]'
    );
    if (addBtn) {
      await addBtn.click();
      await this.page.waitForTimeout(500);
    }
    const companyInputs = await this.page.$$(
      this.selectors.companyInput || 'input[name*="company"], input[placeholder*="회사"]'
    );
    const lastCompany = companyInputs[companyInputs.length - 1];
    if (lastCompany) await lastCompany.fill(career.company);

    const titleInputs = await this.page.$$(
      this.selectors.titleInput || 'input[name*="title"], input[placeholder*="직책"]'
    );
    const lastTitle = titleInputs[titleInputs.length - 1];
    if (lastTitle) await lastTitle.fill(career.role);
  }
}

/**
 * @this {BrowserProfileSyncContext}
 * @param {{ school: string, major: string, status?: string } | null | undefined} education
 */
export async function fillEducation(education) {
  if (!education) return;
  const schoolInput = await this.page.$(
    this.selectors.schoolInput || 'input[name*="school"], input[placeholder*="학교"]'
  );
  if (schoolInput) await schoolInput.fill(education.school);

  const majorInput = await this.page.$(
    this.selectors.majorInput || 'input[name*="major"], input[placeholder*="전공"]'
  );
  if (majorInput) await majorInput.fill(education.major);

  if (education.status) {
    const statusSelect = await this.page.$('select[name*="status"], select[name*="graduation"]');
    if (statusSelect) {
      await statusSelect.selectOption({ label: education.status });
    }
  }
}

/**
 * @this {BrowserProfileSyncContext}
 * @param {Array<{ name: string, issuer?: string, date?: string }> | unknown} certifications
 */
export async function fillCertifications(certifications) {
  if (!Array.isArray(certifications)) return;
  for (const cert of certifications.slice(0, 6)) {
    const addBtn = await this.page.$(
      'button:has-text("추가"), a:has-text("자격증"), button[class*="add"]'
    );
    if (addBtn) {
      await addBtn.click();
      await this.page.waitForTimeout(300);
    }
    const certInputs = await this.page.$$(
      this.selectors.certInput || 'input[name*="cert"], input[placeholder*="자격증"]'
    );
    const lastCert = certInputs[certInputs.length - 1];
    if (lastCert) await lastCert.fill(cert.name);

    if (cert.issuer) {
      const issuerInputs = await this.page.$$(
        'input[name*="issuer"], input[placeholder*="발급기관"]'
      );
      const lastIssuer = issuerInputs[issuerInputs.length - 1];
      if (lastIssuer) await lastIssuer.fill(cert.issuer);
    }
    if (cert.date) {
      const dateInputs = await this.page.$$(
        'input[name*="date"], input[placeholder*="취득일"], input[type="date"]'
      );
      const lastDate = dateInputs[dateInputs.length - 1];
      if (lastDate) await lastDate.fill(cert.date);
    }
  }
}

/**
 * @this {BrowserProfileSyncContext}
 */
export async function saveProfile() {
  const saveBtn = await this.page.$(
    'button:has-text("저장"), button[type="submit"], button[class*="save"]'
  );
  if (saveBtn) {
    await saveBtn.click();
    await this.page.waitForTimeout(2000);
  }
}
