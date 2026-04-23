export function parseExperienceYears(value) {
  const text = String(value || '');
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*[-~]\s*(\d+(?:\.\d+)?)\s*년/);
  if (rangeMatch) {
    return {
      min: Number(rangeMatch[1]),
      max: Number(rangeMatch[2]),
      unrestricted: false,
    };
  }

  if (/경력\s*무관|무관/.test(text)) {
    return { min: 0, max: 99, unrestricted: true };
  }

  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*년\s*이상/);
  if (minMatch) {
    const min = Number(minMatch[1]);
    return { min, max: Math.max(min + 5, min), unrestricted: false };
  }

  const singleMatch = text.match(/(\d+(?:\.\d+)?)\s*년/);
  if (singleMatch) {
    const years = Number(singleMatch[1]);
    return { min: years, max: Math.max(years + 3, years), unrestricted: false };
  }

  return { min: 0, max: 99, unrestricted: true };
}

export function getResumeYears(resumeData) {
  const totalExperience = String(resumeData.summary?.totalExperience || '');
  const match = totalExperience.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return Number(match[1]);
  }

  const careerCount = Array.isArray(resumeData.careers) ? resumeData.careers.length : 0;
  return Math.max(careerCount, 0);
}

export function scoreExperienceLevel(jobText, resumeYears) {
  const parsed = parseExperienceYears(jobText);
  if (parsed.unrestricted) {
    return { score: 100, range: parsed };
  }

  if (resumeYears >= parsed.min && resumeYears <= parsed.max) {
    return { score: 100, range: parsed };
  }

  if (resumeYears > parsed.max) {
    return { score: 85, range: parsed };
  }

  const gap = parsed.min - resumeYears;
  if (gap <= 1) {
    return { score: 70, range: parsed };
  }
  if (gap <= 3) {
    return { score: 45, range: parsed };
  }
  return { score: 20, range: parsed };
}
