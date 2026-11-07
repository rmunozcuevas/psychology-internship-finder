"""Keep the API and daily importer aligned with the website's undergraduate screen."""
import json
import re
from pathlib import Path
RULES = json.loads((Path(__file__).resolve().parent.parent / 'opportunity-rules.json').read_text())

def opportunity_kind(title, description):
    def matches(key, text):
        return re.search(RULES[key], text or '', re.I) is not None
    text = f'{title} {description}'
    def context_of(match):
        before = re.split(r'[.;]\s|\n', text[:match.start()])[-1][-65:]
        after = re.split(r'[.;]\s|\n', text[match.end():])[0][:65]
        return before + match.group() + after
    restrictions = re.finditer(RULES['schoolRestriction'], text, re.I)
    if any(not re.search(r'UNC Charlotte|UNCC|University of North Carolina at Charlotte', m.group(), re.I) and not re.search(r'^must be enrolled at (?:an? |any )?(?:accredited |recognized )?(?:college|university)', m.group(), re.I) for m in restrictions):
        return None
    graduate_only = any(
        not (re.search(r'bachelor|undergraduate', context_of(m), re.I)
             and re.search(r'\bor\b|,', context_of(m), re.I))
        for m in re.finditer(RULES['graduateOnly'], text, re.I))
    def strict_requirement(key):
        return key in RULES and any(not re.search(r'preferred|not required|or equivalent|currently pursuing|working toward|in progress|by (?:the )?(?:start|time)|before (?:the )?(?:start|internship)', context_of(m), re.I) for m in re.finditer(RULES[key], text, re.I))
    if strict_requirement('completedDegreeOnly') or strict_requirement('professionalPlacementOnly'):
        return None
    if matches('pastSeason', title) or (matches('irrelevantTitle', title) and not matches('relevanceExceptionTitle', title)) or matches('excludedTitle', title) or graduate_only or matches('experienced', text):
        return None
    if matches('internship', title):
        return 'internship'
    if matches('degreeRequired', text):
        return None
    if matches('entryTitle', title) and matches('entryEvidence', text):
        return 'entry-level'
    return None


def career_path(title):
    for key, label in [('ioTitle', 'I/O psychology / workplace'), ('researchTitle', 'Research / human behavior'), ('clinicalTitle', 'Clinical / pre-therapy'), ('broaderTitle', 'Broader management / leadership')]:
        if re.search(RULES[key], title, re.I):
            return label
    return 'Related experience'
