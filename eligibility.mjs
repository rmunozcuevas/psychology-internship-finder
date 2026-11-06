// Shared by the scraper and browser: uncertain eligibility is excluded.
export function opportunityKind(title, description, rules) {
  const matches = (key, text) => new RegExp(rules[key], 'i').test(text);
  const text = `${title} ${description}`;
  const schoolRestrictions = [...text.matchAll(new RegExp(rules.schoolRestriction, 'gi'))];
  if (schoolRestrictions.some(m => !/UNC Charlotte|UNCC|University of North Carolina at Charlotte/i.test(m[0]) && !/^must be enrolled at (?:an? |any )?(?:accredited |recognized )?(?:college|university)/i.test(m[0]))) return null;
  const graduateOnly = [...text.matchAll(new RegExp(rules.graduateOnly, 'gi'))].some(m => {
    const qualification = text.slice(Math.max(0, m.index - 65), m.index + m[0].length);
    return !(/bachelor|undergraduate/i.test(qualification) && /\bor\b|,/i.test(qualification));
  });
  if (matches('pastSeason', title) || (matches('irrelevantTitle', title) && !matches('relevanceExceptionTitle', title)) || matches('excludedTitle', title) || graduateOnly || matches('experienced', text)) return null;
  if (matches('internship', title)) return 'internship';
  if (matches('degreeRequired', text)) return null;
  if (matches('entryTitle', title) && matches('entryEvidence', text)) return 'entry-level';
  return null;
}

export function careerPath(title, rules) {
  if(rules.careerPaths){for(const path of rules.careerPaths)if(new RegExp(path.pattern,'i').test(title))return path.label;return 'Related experience';}
  if (new RegExp(rules.ioTitle, 'i').test(title)) return 'I/O psychology / workplace';
  if (new RegExp(rules.researchTitle, 'i').test(title)) return 'Research / human behavior';
  if (new RegExp(rules.clinicalTitle, 'i').test(title)) return 'Clinical / pre-therapy';
  if (new RegExp(rules.broaderTitle, 'i').test(title)) return 'Broader management / leadership';
  return 'Related experience';
}
