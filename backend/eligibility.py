"""Keep the API and daily importer aligned with the website's undergraduate screen."""
import json
import re
from pathlib import Path
RULES = json.loads((Path(__file__).resolve().parent.parent / 'opportunity-rules.json').read_text())

def opportunity_kind(title, description):
    def matches(key, text):
        return re.search(RULES[key], text or '', re.I) is not None
    text = f'{title} {description}'
    graduate_only = any(
        not (re.search(r'bachelor|undergraduate', text[max(0, m.start()-65):m.end()], re.I)
             and re.search(r'\bor\b|,', text[max(0, m.start()-65):m.end()], re.I))
        for m in re.finditer(RULES['graduateOnly'], text, re.I))
    if matches('excludedTitle', title) or graduate_only or matches('experienced', text):
        return None
    if matches('internship', title):
        return 'internship'
    if matches('degreeRequired', text):
        return None
    if matches('entryTitle', title) and matches('entryEvidence', text):
        return 'entry-level'
    return None
