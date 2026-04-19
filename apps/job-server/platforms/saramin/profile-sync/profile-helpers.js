export function normalizeDate(raw) {
  if (!raw) return null;

  const match = raw.match(/(\d{4})[.\-/년\s]*(\d{1,2})?[.\-/월\s]*(\d{1,2})?/);
  if (!match) return raw.trim();

  const year = match[1];
  const month = match[2] ? String(match[2]).padStart(2, '0') : null;
  const day = match[3] ? String(match[3]).padStart(2, '0') : null;

  if (year && month && day) return `${year}.${month}.${day}`;
  if (year && month) return `${year}.${month}`;
  return year;
}

export function parseProfileSections(snapshot) {
  const text = (snapshot?.fullText || '').replace(/\u00a0/g, ' ');
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const findByRegex = (regex) => {
    const target = lines.find((line) => regex.test(line));
    return target ? target.replace(regex, '').trim() : null;
  };

  const phoneRegex = /(01[0-9][-\s]?\d{3,4}[-\s]?\d{4})/;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

  const phoneMatch = text.match(phoneRegex);
  const emailMatch = text.match(emailRegex);
  const birthMatch = text.match(/(\d{4}[.\-/년\s]\d{1,2}[.\-/월\s]\d{1,2})/);
  const genderMatch = lines.find((line) => /남자|여자|남성|여성/.test(line));

  const personal = {
    name: snapshot?.name || findByRegex(/^이름\s*:?/),
    birthDate: normalizeDate(birthMatch?.[1] || null),
    gender: genderMatch || null,
    email: emailMatch?.[1] || null,
    phone: phoneMatch?.[1]?.replace(/\s/g, '') || null,
  };

  const education = {
    schoolType: findByRegex(/^(학력|학교\s*구분)\s*:?/),
    school: findByRegex(/^(학교명|학교)\s*:?/),
    major: findByRegex(/^(전공|전공명)\s*:?/),
    status: findByRegex(/^(졸업\s*상태|학적\s*상태|재학\s*여부)\s*:?/),
  };

  const careers = lines
    .filter((line) => /(주식회사|\(주\)|회사|근무|재직|퇴사)/.test(line))
    .slice(0, 10)
    .map((line) => ({
      company: line,
      role: null,
      period: null,
      employmentType: null,
    }));

  const certSkills = lines.filter((line) =>
    /(자격증|기사|기능사|CCNA|CCNP|CISSP|CISM|RHCSA|LPIC|AWS|리눅스)/i.test(line)
  );
  const technicalSkills = lines.filter((line) =>
    /(Python|Java|Node|Linux|AWS|Kubernetes|Docker|Terraform|Splunk|Forti)/i.test(line)
  );

  const desiredConditions = {
    jobType: findByRegex(/^(희망\s*직무|직무)\s*:?/),
    location: findByRegex(/^(희망\s*근무\s*지역|근무\s*지역|지역)\s*:?/),
    salary: findByRegex(/^(희망\s*연봉|연봉)\s*:?/),
  };

  const certifications = certSkills.map((name) => ({ name, issuer: null, date: null }));
  const skills = Array.from(new Set(technicalSkills)).map((name) => ({ name }));

  return {
    personal,
    education,
    careers,
    skills,
    certifications,
    desiredConditions,
    rawLines: lines,
  };
}

export function validateExtractedData(data) {
  const personalFields = [data.personal?.name, data.personal?.email, data.personal?.phone].filter(
    Boolean
  ).length;
  const contentSignals =
    personalFields +
    (data.careers?.length || 0) +
    (data.skills?.length || 0) +
    (data.certifications?.length || 0);

  return {
    valid: personalFields >= 1 && contentSignals >= 2,
    personalFields,
    contentSignals,
  };
}

export async function extractProfileSnapshot() {
  return this.page.evaluate(() => {
    const fullText = document.body?.innerText || '';
    const nameCandidate =
      document.querySelector('[class*="name"], .user_name, .txt_name, h1')?.textContent?.trim() ||
      null;

    return {
      url: window.location.href,
      title: document.title,
      fullText,
      name: nameCandidate,
    };
  });
}
