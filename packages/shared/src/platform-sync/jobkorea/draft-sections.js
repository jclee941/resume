import { normalizeCompanyName, normalizeEducationStatus } from '@resume/shared/normalize';
import { formatYYYY_MM, parsePeriod } from '../date-formatters.js';

/** @typedef {Record<string, unknown>} Row */
/** @param {unknown} value @returns {value is Row} */
function record(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
/** @param {unknown} v */
function text(v) {
  return typeof v === 'string' ? v.trim() : '';
}
/** @param {unknown} value */
function name(value) {
  return record(value) ? text(value.name ?? value.customName) : '';
}
/** @param {unknown} value @returns {Row[]} */
function rows(value) {
  if (!Array.isArray(value) || !value.every(record))
    throw new Error('Incomplete JobKorea section rows');
  return value;
}
/** @param {unknown} value */
function month(value) {
  const str = text(value);
  return /^\d{4}-\d{2}/.test(str) ? str.slice(0, 7) : formatYYYY_MM(str);
}
/** Match by identity, not ordinal; repeated employment is distinguished by start month.
 * @param {Row[]} live @param {Row[]} source @param {(r: Row) => string} key
 * @param {(r: Row) => string} sourceKey @param {(s: Row, r: Row) => Row} overlay */
function mergeRows(live, source, key, sourceKey, overlay) {
  const seen = new Set();
  return source.map((s) => {
    const id = sourceKey(s);
    const matches = live.filter((r) => key(r) === id);
    if (!id || matches.length > 1 || seen.has(id))
      throw new Error('Missing or ambiguous JobKorea row identity');
    seen.add(id);
    return overlay(s, matches[0] ?? {});
  });
}

/** Convert display selections to write selections; display names/categories aren't writable IDs.
 * @param {unknown} v @returns {unknown} */
function writeValue(v) {
  if (Array.isArray(v)) return v.map(writeValue);
  if (!record(v)) return v;
  if ('selectionType' in v) return v.code ? { code: v.code } : { customName: v.name };
  return Object.fromEntries(Object.entries(v).map(([k, value]) => [k, writeValue(value)]));
}
/** @param {string} n @param {unknown} old */
function selection(n, old) {
  return name(old) === n ? old : { customName: n };
}
/** @param {unknown} v @param {string} fallback */
function status(v, fallback) {
  /** @type {Record<string,string>} */
  const codes = {
    졸업: 'GRADUATED',
    졸업예정: 'EXPECTED_GRADUATION',
    재학중: 'ATTENDING',
    중퇴: 'DROPPED_OUT',
    수료: 'COMPLETED',
    휴학: 'ON_LEAVE',
  };
  return codes[normalizeEducationStatus(text(v))] ?? fallback;
}

/**
 * @param {Row} ssot SSoT JSON; absent sections are not deletion instructions.
 * @param {Row} content Full editor response. Build every replacement before sending the first.
 */
export function planJobKoreaSections(ssot, content) {
  if (!record(content.general)) throw new Error('Incomplete JobKorea general section');
  const general = content.general;
  /** @type {Array<{section:string, fields:string[], payload:Row}>} */
  const changes = [];
  /** @param {string} section @param {Row} prior @param {Row} next */
  function plan(section, prior, next) {
    const fields = Object.keys(next).filter(
      (k) => JSON.stringify(prior[k]) !== JSON.stringify(next[k])
    );
    if (fields.length)
      changes.push({
        section,
        fields,
        payload: Object.fromEntries(Object.entries(next).map(([k, v]) => [k, writeValue(v)])),
      });
  }
  const variant =
    record(ssot.platformVariants) && record(ssot.platformVariants.jobkorea)
      ? ssot.platformVariants.jobkorea
      : {};
  const careers = rows(ssot.careers ?? []);
  if (careers.length) {
    const before = {
      careerStatus: general.careerStatus,
      careerDescription: general.careerDescription,
      careerDescriptionVisible: general.careerDescriptionVisible,
      careers: rows(content.careers),
    };
    const mapped = mergeRows(
      before.careers,
      careers,
      (r) => `${normalizeCompanyName(text(r.companyName))}|${month(r.startedOn)}`,
      (s) =>
        `${normalizeCompanyName(text(s.company))}|${month(parsePeriod(text(s.period)).startsAt)}`,
      (s, r) => {
        const period = parsePeriod(text(s.period)),
          company = normalizeCompanyName(text(s.company));
        if (!company || !period.startsAt || (!period.isCurrent && !period.endsAt))
          throw new Error('Incomplete JobKorea career');
        const rank = text(s.rank);
        return {
          ...r,
          companyName: company,
          startedOn: month(period.startsAt),
          endedOn: period.isCurrent ? null : month(period.endsAt),
          isCurrent: period.isCurrent,
          ...(s.department ? { departmentName: s.department } : {}),
          ...(s.myRole || s.project || s.role
            ? { workDetails: text(s.myRole || s.project || s.role).slice(0, 500) }
            : {}),
          ...(rank ? { positionGrade: selection(rank, r.positionGrade) } : {}),
        };
      }
    );
    const summary =
      record(ssot.careerSummary) && record(ssot.careerSummary.ko) ? ssot.careerSummary.ko : {};
    const description = Array.isArray(summary.paragraphs)
      ? [summary.headline, ...summary.paragraphs, summary.closing]
          .filter(Boolean)
          .join('\n\n')
          .slice(0, 2000)
      : '';
    plan('career', before, {
      ...before,
      careers: mapped,
      ...(description ? { careerDescription: description, careerDescriptionVisible: true } : {}),
    });
  }
  const certs = rows(ssot.certifications ?? []).filter((c) => c.date);
  const awards = rows(ssot.awards ?? []);
  if (certs.length || awards.length) {
    const before = {
      certificateDescription: general.certificateDescription,
      certificates: rows(content.certificates),
      awards: rows(content.awards),
      languages: rows(content.languages),
      languageTests: rows(content.languageTests),
      trainings: rows(content.trainings),
    };
    plan('abilities', before, {
      ...before,
      certificates: certs.length
        ? mergeRows(
            before.certificates,
            certs,
            (r) => name(r.certificate),
            (s) => text(s.name),
            (s, r) => ({
              ...r,
              certificate: selection(text(s.name), r.certificate),
              issuer: s.issuer ?? r.issuer,
              issuedAt: month(s.date),
            })
          )
        : before.certificates,
      awards: awards.length
        ? mergeRows(
            before.awards,
            awards,
            (r) => text(r.name),
            (s) => text(s.name),
            (s, r) => ({
              ...r,
              name: s.name,
              institution: s.organization ?? r.institution,
              year: String(s.year ?? r.year ?? ''),
            })
          )
        : before.awards,
    });
  }
  if (record(ssot.education) || record(ssot.highSchool)) {
    const edu = record(ssot.education) ? ssot.education : {};
    const live = rows(content.educations);
    if (!record(content.educationSummary)) throw new Error('Incomplete JobKorea education summary');
    const next = [...live];
    const high = edu.highSchool
      ? { school: edu.highSchool, endDate: edu.highSchoolGraduation, status: '졸업' }
      : ssot.highSchool;
    for (const [school, highSchool] of [
      [edu, false],
      [high, true],
    ]) {
      if (!record(school) || !text(school.school)) continue;
      const schoolName = text(school.school);
      const candidates = live.filter(
        (r) => name(r.school) === schoolName && (r.schoolType === 'HIGH_SCHOOL') === highSchool
      );
      if (candidates.length > 1) throw new Error('Ambiguous JobKorea school');
      const old = candidates[0] ?? {};
      /** @type {Row} */
      const updated = {
        ...old,
        school: selection(schoolName, old.school),
        academicStatus: status(school.status, text(old.academicStatus)),
        schoolType: old.schoolType ?? (highSchool ? 'HIGH_SCHOOL' : 'UNIVERSITY'),
        ...(highSchool
          ? { graduationYear: String(school.endDate ?? old.graduationYear ?? '').slice(0, 4) }
          : {
              ...(school.startDate ? { startedOn: month(school.startDate) } : {}),
              ...(school.endDate ? { endedOn: month(school.endDate) } : {}),
            }),
      };
      if (!highSchool && school.major) {
        const majors = rows(old.majors ?? []),
          primary = majors.findIndex((m) => m.type === 'MAJOR');
        const idx = primary >= 0 ? primary : 0;
        const item = majors[idx] ?? { type: 'MAJOR' };
        const updatedMajors = majors.slice();
        updatedMajors[idx] = { ...item, major: selection(text(school.major), item.major) };
        updated.majors = updatedMajors;
      }
      if (candidates.length) next[live.indexOf(old)] = updated;
      else next.push(updated);
    }
    plan(
      'education',
      { educationSummary: content.educationSummary, educations: live },
      { educationSummary: content.educationSummary, educations: next }
    );
  }
  const cover = record(ssot.coverLetter) && record(ssot.coverLetter.ko) ? ssot.coverLetter.ko : {};
  const intro =
    text(variant.about) ||
    (Array.isArray(cover.paragraphs)
      ? [...cover.paragraphs, cover.closing].filter(Boolean).join('\n\n')
      : '');
  if (intro) {
    const live = rows(content.selfIntroductions);
    plan(
      'self-introduction',
      { selfIntroductions: live },
      {
        selfIntroductions: [
          {
            ...live[0],
            title: text(variant.headline || cover.headline || live[0]?.title).slice(0, 50),
            description: intro.slice(0, 2000),
          },
          ...live.slice(1),
        ],
      }
    );
  }
  plan('title', { title: general.title }, { title: text(variant.headline) || '정보보안 엔지니어' });
  return changes;
}
