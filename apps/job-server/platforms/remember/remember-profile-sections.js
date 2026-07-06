export async function updateRememberHeadline(page, sourceData) {
  const editBtn = await page.$('button:has-text("수정"), [class*="edit"]');
  if (editBtn) {
    await editBtn.click();
    await page.waitForTimeout(500);
  }

  const headline = `${sourceData.current?.position || sourceData.careers?.[0]?.role || ''} | ${sourceData.summary.totalExperience}`;
  const headlineInput = await page.$('input[name*="headline"], textarea[name*="intro"]');
  if (headlineInput) {
    await headlineInput.fill(headline);
  }

  const saveBtn = await page.$('button:has-text("저장"), button[type="submit"]');
  if (saveBtn) {
    await saveBtn.click();
    await page.waitForTimeout(1000);
  }
}

export async function updateRememberCareers(page, careers) {
  const careerSection = await page.$('[class*="career"], [data-section="career"]');
  if (!careerSection) return;

  for (const career of careers.slice(0, 5)) {
    const addBtn = await page.$('button:has-text("경력 추가")');
    if (addBtn) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }

    const companyInput = await page.$('input[name*="company"]:last-of-type');
    if (companyInput) {
      await companyInput.fill(career.company);
    }

    const titleInput = await page.$('input[name*="title"]:last-of-type');
    if (titleInput) {
      await titleInput.fill(career.role);
    }

    const periodInput = await page.$('input[name*="period"]:last-of-type');
    if (periodInput) {
      await periodInput.fill(career.period);
    }
  }
}

export async function updateRememberEducation(page, education) {
  const eduSection = await page.$('[class*="education"], [data-section="education"]');
  if (!eduSection) return;

  const editBtn = await eduSection.$('button:has-text("수정"), button[class*="edit"]');
  if (editBtn) {
    await editBtn.click();
    await page.waitForTimeout(500);
  }

  const schoolInput = await page.$('input[name*="school"], input[placeholder*="학교"]');
  if (schoolInput) {
    await schoolInput.fill(education.school);
  }

  const majorInput = await page.$('input[name*="major"], input[placeholder*="전공"]');
  if (majorInput) {
    await majorInput.fill(education.major);
  }

  const saveBtn = await eduSection.$('button:has-text("저장"), button[type="submit"]');
  if (saveBtn) {
    await saveBtn.click();
    await page.waitForTimeout(1000);
  }
}

export async function updateRememberCertifications(page, certifications) {
  const certSection = await page.$('[class*="certification"], [data-section="certification"]');
  if (!certSection) return;

  for (const cert of certifications.slice(0, 6)) {
    const addBtn = await certSection.$('button:has-text("추가"), button[class*="add"]');
    if (addBtn) {
      await addBtn.click();
      await page.waitForTimeout(300);
    }

    const certInputs = await page.$$('input[name*="cert"], input[placeholder*="자격증"]');
    const lastCert = certInputs[certInputs.length - 1];
    if (lastCert) {
      await lastCert.fill(cert.name);
    }

    if (cert.issuer) {
      const issuerInputs = await page.$$('input[name*="issuer"], input[placeholder*="발급기관"]');
      const lastIssuer = issuerInputs[issuerInputs.length - 1];
      if (lastIssuer) {
        await lastIssuer.fill(cert.issuer);
      }
    }

    if (cert.date) {
      const dateInputs = await page.$$(
        'input[name*="date"], input[placeholder*="취득일"], input[type="date"]'
      );
      const lastDate = dateInputs[dateInputs.length - 1];
      if (lastDate) {
        await lastDate.fill(cert.date);
      }
    }

    const saveBtn = await certSection.$('button:has-text("저장"), button[type="submit"]');
    if (saveBtn) {
      await saveBtn.click();
      await page.waitForTimeout(500);
    }
  }
}

export async function updateRememberSkills(page, skills) {
  const skillSection = await page.$('[class*="skill"], [data-section="skill"]');
  if (!skillSection) return;

  for (const skill of skills) {
    const skillInput = await page.$('input[name*="skill"], input[placeholder*="스킬"]');
    if (skillInput) {
      await skillInput.fill(skill);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }
  }
}
