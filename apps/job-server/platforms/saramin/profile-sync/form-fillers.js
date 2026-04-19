export async function fillPersonalInfo(personal) {
  const nameInput = await this.page.$(
    'input[name="name"], input[id*="name"], input[placeholder*="이름"]'
  );
  if (nameInput) {
    await nameInput.fill(personal.name);
  }

  const emailInput = await this.page.$(
    'input[name="email"], input[type="email"], input[placeholder*="이메일"]'
  );
  if (emailInput) {
    await emailInput.fill(personal.email);
  }

  const phoneInput = await this.page.$(
    'input[name="phone"], input[name="mobile"], input[placeholder*="핸드폰"]'
  );
  if (phoneInput) {
    await phoneInput.fill(personal.phone);
  }
}

export async function fillCareers(careers) {
  const careerSection = await this.page.$('[class*="career"], [id*="career"], [class*="경력"]');
  if (!careerSection) return;

  for (const career of careers.slice(0, 5)) {
    const addBtn = await this.page.$(
      'button:has-text("추가"), a:has-text("경력 추가"), button[class*="add"]'
    );
    if (addBtn) {
      await addBtn.click();
      await this.page.waitForTimeout(500);
    }

    const companyInputs = await this.page.$$(
      'input[name*="company"], input[placeholder*="회사"], input[placeholder*="기업명"]'
    );
    const lastCompany = companyInputs[companyInputs.length - 1];
    if (lastCompany) {
      await lastCompany.fill(career.company);
    }

    const positionInputs = await this.page.$$(
      'input[name*="position"], input[placeholder*="직책"], input[placeholder*="직급"]'
    );
    const lastPosition = positionInputs[positionInputs.length - 1];
    if (lastPosition) {
      await lastPosition.fill(career.role);
    }
  }
}

export async function fillEducation(education) {
  const schoolInput = await this.page.$(
    'input[name*="school"], input[placeholder*="학교"], input[placeholder*="학교명"]'
  );
  if (schoolInput) {
    await schoolInput.fill(education.school);
  }

  const majorInput = await this.page.$(
    'input[name*="major"], input[placeholder*="전공"], input[placeholder*="전공명"]'
  );
  if (majorInput) {
    await majorInput.fill(education.major);
  }
}

export async function fillCertifications(certifications) {
  for (const cert of certifications.slice(0, 6)) {
    const addBtn = await this.page.$(
      'button:has-text("추가"), a:has-text("자격증"), button[class*="add"]'
    );
    if (addBtn) {
      await addBtn.click();
      await this.page.waitForTimeout(300);
    }

    const certInputs = await this.page.$$(
      'input[name*="cert"], input[placeholder*="자격증"], input[placeholder*="자격증명"]'
    );
    const lastCert = certInputs[certInputs.length - 1];
    if (lastCert) {
      await lastCert.fill(cert.name);
    }
  }
}

export async function saveResume() {
  const saveBtn = await this.page.$(
    'button:has-text("저장"), button[type="submit"], button[class*="save"]'
  );
  if (saveBtn) {
    await saveBtn.click();
    await this.page.waitForTimeout(2000);
  }
}
