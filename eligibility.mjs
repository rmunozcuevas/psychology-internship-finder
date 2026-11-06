// Shared by the scraper and browser: uncertain eligibility is excluded.
export function opportunityKind(title, description, rules) {
  const matches = (key, text) => new RegExp(rules[key], 'i').test(text);
  const text = `${title} ${description}`;
  if (matches('excludedTitle', title) || matches('graduateOnly', text) || matches('experienced', text)) return null;
  if (matches('internship', title)) return 'internship';
  if (matches('degreeRequired', text)) return null;
  if (matches('entryTitle', title) && matches('entryEvidence', text)) return 'entry-level';
  return null;
}
