const SECTION_HEADERS = {
  careers: /^(경력|경력사항|career|work experience)$/i,
  education: /^(학력|학력사항|education)$/i,
  skills: /^(스킬|기술|보유기술|skills|tech stack)$/i,
  certifications: /^(자격증|자격|certifications?|licenses?)$/i,
};

const NEXT_SECTION = /^(기본정보|인적사항|경력|경력사항|학력|학력사항|스킬|기술|보유기술|자격증|자격|career|work experience|education|skills|tech stack|certifications?|licenses?)$/i;

function decodeEntities(value = '') {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(html = '') {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function visibleTextLines(html = '') {
  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|td|th|h[1-6]|section|article|dl|dt|dd)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );

  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function matchAttrBlock(html, attrPattern) {
  const blockPattern = new RegExp(
    `<(?<tag>[a-z0-9]+)[^>]*(?:class|id|data-[^=]+)=["'][^"']*(?:${attrPattern})[^"']*["'][^>]*>(?<body>[\\s\\S]*?)<\\/\\k<tag>>`,
    'i'
  );
  return html.match(blockPattern)?.groups?.body || '';
}

function matchAttrText(html, attrPattern) {
  return stripTags(matchAttrBlock(html, attrPattern));
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
    if (match?.[0]) return match[0].trim();
  }
  return '';
}

function sectionLines(lines, headerPattern) {
  const start = lines.findIndex((line) => headerPattern.test(line));
  if (start === -1) return [];

  const result = [];
  for (const line of lines.slice(start + 1)) {
    if (NEXT_SECTION.test(line)) break;
    result.push(line);
  }
  return result;
}

function parseBasic(html, lines) {
  const allText = lines.join('\n');
  const semanticName = matchAttrText(html, '(?:user-)?name|resume-name|profile-name');
  const semanticHeadline = matchAttrText(
    html,
    'headline|summary|introduction|introduce|selfintro|resume-title'
  );

  const email = firstMatch(allText, [/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/]);
  const phone = firstMatch(allText, [/(01[016789][-\s.]?\d{3,4}[-\s.]?\d{4})/]);
  const labelName = firstMatch(allText, [/(?:이름|성명|Name)\s*[:：]?\s*([^\n]+)/i]);
  const headline =
    semanticHeadline ||
    firstMatch(allText, [/(?:자기소개|소개|headline|summary)\s*[:：]?\s*([^\n]+)/i]);

  const fallbackName = lines.find(
    (line) =>
      !NEXT_SECTION.test(line) &&
      !line.includes('@') &&
      !phone.includes(line) &&
      line.length >= 2 &&
      line.length <= 30
  );

  return {
    name: semanticName || labelName || fallbackName || '',
    email,
    phone,
    headline,
    introduction: headline,
  };
}

function groupSectionRows(html, attrPattern, fallbackLines) {
  const semanticBlock = matchAttrBlock(html, attrPattern);
  if (!semanticBlock) return fallbackLines.length ? [fallbackLines] : [];

  const rowPattern = /<(li|tr|article|section|div)[^>]*(?:class|data-[^=]+)=["'][^"']*(?:item|row|career|education|certificate|license)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  const rows = [];
  for (const match of semanticBlock.matchAll(rowPattern)) {
    const rowLines = visibleTextLines(match[2]);
    if (rowLines.length) rows.push(rowLines);
  }

  const blockLines = visibleTextLines(semanticBlock);
  return rows.length ? rows : blockLines.length ? [blockLines] : [];
}

function parseCareerRow(lines) {
  const joined = lines.join(' ');
  const period = firstMatch(joined, [/(\d{4}[.\-/년]\s*\d{0,2}.*?(?:현재|재직중|\d{4}[.\-/년]\s*\d{0,2}))/]);

  return {
    company:
      firstMatch(joined, [/(?:회사명|회사|company)\s*[:：]?\s*(.*?)(?=\s*(?:부서|직무|직책|담당업무|\d{4}|$))/i]) ||
      lines[0] ||
      '',
    department: firstMatch(joined, [/(?:부서|department)\s*[:：]?\s*(.*?)(?=\s*(?:직무|직책|담당업무|\d{4}|$))/i]),
    role:
      firstMatch(joined, [/(?:직무|직책|role|position)\s*[:：]?\s*(.*?)(?=\s*(?:부서|담당업무|\d{4}|$))/i]) ||
      lines[1] ||
      '',
    period,
    description:
      firstMatch(joined, [/(?:담당업무|업무|description)\s*[:：]?\s*(.+)$/i]) || lines.slice(2).join(' '),
  };
}

function parseCareers(html, lines) {
  const fallbackLines = sectionLines(lines, SECTION_HEADERS.careers);
  return groupSectionRows(html, 'career|work|experience', fallbackLines)
    .map(parseCareerRow)
    .filter((career) => career.company || career.role || career.description);
}

function parseEducation(html, lines) {
  const fallbackLines = sectionLines(lines, SECTION_HEADERS.education);
  const rows = groupSectionRows(html, 'education|school|univ|학력', fallbackLines);
  const row = rows[0] || [];
  const joined = row.join(' ');

  return {
    school:
      firstMatch(joined, [/(?:학교|school|university)\s*[:：]?\s*(.*?)(?=\s*(?:전공|졸업|재학|휴학|수료|중퇴|\d{4}|$))/i]) ||
      row[0] ||
      '',
    major: firstMatch(joined, [/(?:전공|major)\s*[:：]?\s*(.*?)(?=\s*(?:졸업|재학|휴학|수료|중퇴|\d{4}|$))/i]),
    status: firstMatch(joined, [/(졸업예정|졸업|재학|휴학|수료|중퇴|graduated|enrolled)/i]),
    period: firstMatch(joined, [/(\d{4}[.\-/년].*?(?:\d{4}[.\-/년]|현재|재학))/]),
  };
}

function parseSkills(html, lines) {
  const semantic = matchAttrText(html, 'skill|tech-stack|technology');
  const source = semantic || sectionLines(lines, SECTION_HEADERS.skills).join(', ');
  return [...new Set(source.split(/[,·•|/\n]+/).map((skill) => skill.trim()).filter(Boolean))];
}

function parseCertificationRow(lines) {
  const joined = lines.join(' ');
  return {
    name: firstMatch(joined, [/(?:자격증명|자격증|name)\s*[:：]?\s*([^\n|]+)/i]) || lines[0] || '',
    issuer: firstMatch(joined, [/(?:발행처|기관|issuer)\s*[:：]?\s*([^\n|]+)/i]) || lines[1] || '',
    date: firstMatch(joined, [/(\d{4}[.\-/년]\s*\d{0,2}(?:[.\-/월]\s*\d{0,2})?)/]),
  };
}

function parseCertifications(html, lines) {
  const fallbackLines = sectionLines(lines, SECTION_HEADERS.certifications);
  return groupSectionRows(html, 'cert|license|자격', fallbackLines)
    .map(parseCertificationRow)
    .filter((certification) => certification.name);
}

export function parseJobKoreaProfile(html = '', { sourceUrl = '', resumeNo = '' } = {}) {
  const lines = visibleTextLines(html);

  return {
    basic: parseBasic(html, lines),
    careers: parseCareers(html, lines),
    education: parseEducation(html, lines),
    skills: parseSkills(html, lines),
    certifications: parseCertifications(html, lines),
    meta: {
      sourceUrl,
      readAt: new Date().toISOString(),
      resumeNo: String(resumeNo || ''),
    },
  };
}
