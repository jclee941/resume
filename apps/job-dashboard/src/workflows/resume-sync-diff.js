const DEFAULT_COMPARE_SECTIONS = [
  'careers',
  'educations',
  'skills',
  'activities',
  'language_certs',
];

export function calculateDiff(master, platform, sections = []) {
  const diff = {
    additions: [],
    updates: [],
    deletions: [],
  };

  const sectionsToCompare = sections.length > 0 ? sections : DEFAULT_COMPARE_SECTIONS;

  for (const section of sectionsToCompare) {
    const masterItems = master[section] || [];
    const platformItems = platform[section] || [];

    for (const masterItem of masterItems) {
      const key = getItemKey(section, masterItem);
      const platformItem = platformItems.find((p) => getItemKey(section, p) === key);

      if (!platformItem) {
        diff.additions.push({ section, item: masterItem });
      } else if (!itemsEqual(masterItem, platformItem)) {
        diff.updates.push({ section, item: masterItem, existing: platformItem });
      }
    }

    for (const platformItem of platformItems) {
      const key = getItemKey(section, platformItem);
      const masterItem = masterItems.find((m) => getItemKey(section, m) === key);

      if (!masterItem) {
        diff.deletions.push({ section, item: platformItem });
      }
    }
  }

  return diff;
}

export function getItemKey(section, item) {
  switch (section) {
    case 'careers':
      return `${item.company_name || item.company}:${item.title}`;
    case 'educations':
      return `${item.school_name}:${item.major}`;
    case 'skills':
      return item.text || item.name;
    default:
      return item.id || JSON.stringify(item);
  }
}

export function itemsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
