// Shared by the scraper and browser: known exclusions are removed; uncertainty stays visible.
export function opportunityKind(title, description, rules) {
  const matches = (key, text) => new RegExp(rules[key], 'i').test(text);
  const text = `${title} ${description}`;
  const contextOf = m => text.slice(0,m.index).split(/[.;]\s|\n/).pop().slice(-65)+m[0]+text.slice(m.index+m[0].length).split(/[.;]\s|\n/)[0].slice(0,65);
  const schoolRestrictions = [...text.matchAll(new RegExp(rules.schoolRestriction, 'gi'))];
  if (schoolRestrictions.some(m => !/UNC Charlotte|UNCC|University of North Carolina at Charlotte/i.test(m[0]) && !/^must be enrolled at (?:an? |any )?(?:accredited |recognized )?(?:college|university)/i.test(m[0]))) return null;
  const graduateOnly = [...text.matchAll(new RegExp(rules.graduateOnly, 'gi'))].some(m => {
    const qualification = contextOf(m);
    return !(/bachelor|undergraduate/i.test(qualification) && /\bor\b|,/i.test(qualification));
  });
  const strictRequirement = key => rules[key] && [...text.matchAll(new RegExp(rules[key], 'gi'))].some(m => {
    const context=contextOf(m);
    return !/preferred|not required|or equivalent|currently pursuing|working toward|in progress|by (?:the )?(?:start|time)|before (?:the )?(?:start|internship)/i.test(context);
  });
  if(strictRequirement('completedDegreeOnly')||strictRequirement('professionalPlacementOnly'))return null;
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
