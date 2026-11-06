"""Keep the API and daily importer aligned with the website's undergraduate screen."""
import json
import re
from pathlib import Path
RULES = json.loads((Path(__file__).resolve().parent.parent / 'opportunity-rules.json').read_text())

def opportunity_kind(title, description):
    def matches(key, text):
        return re.search(RULES[key], text or '', re.I) is not None
    text = f'{title} {description}'
    if matches('excludedTitle', title) or matches('graduateOnly', text) or matches('experienced', text):
        return None
    if matches('internship', title):
        return 'internship'
    if matches('degreeRequired', text):
        return None
    if matches('entryTitle', title) and matches('entryEvidence', text):
        return 'entry-level'
    return None
