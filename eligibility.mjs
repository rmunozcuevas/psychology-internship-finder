// Shared by the scraper and browser: uncertain eligibility is excluded.
export function opportunityKind(title, description, rules) {
  const matches = (key, text) => new RegExp(rules[key], 'i').test(text);
  const text = `${title} ${description}`;
  const graduateOnly = [...text.matchAll(new RegExp(rules.graduateOnly, 'gi'))].some(m => {
    const qualification = text.slice(Math.max(0, m.index - 65), m.index + m[0].length);
    return !(/bachelor|undergraduate/i.test(qualification) && /\bor\b|,/i.test(qualification));
  });
  if (matches('excludedTitle', title) || graduateOnly || matches('experienced', text)) return null;
  if (matches('internship', title)) return 'internship';
  if (matches('degreeRequired', text)) return null;
  if (matches('entryTitle', title) && matches('entryEvidence', text)) return 'entry-level';
  return null;
}
