"""Public U.S. internship postings, with full qualification sections."""
from concurrent.futures import ThreadPoolExecutor
import re
import requests
from eligibility import RULES


def collect_smartrecruiters(entry):
    company = entry['id']
    base = f'https://api.smartrecruiters.com/v1/companies/{company}/postings'
    candidates = []
    pattern = '|'.join(RULES[key] for key in ('clinicalTitle', 'ioTitle', 'researchTitle'))
    for offset in range(0, 5000, 100):
        response = requests.get(base, params={'q':'intern','country':'us','limit':100,'offset':offset}, timeout=35)
        response.raise_for_status()
        data = response.json()
        page = data.get('content', [])
        candidates.extend(row for row in page if re.search(pattern, row['name'], re.I))
        if len(page) < 100 or offset + len(page) >= data.get('totalFound', 0):
            break
    def detail(row):
        try:
            response = requests.get(f"{base}/{row['id']}", timeout=35)
            response.raise_for_status()
            data = response.json()
            sections = data.get('jobAd', {}).get('sections', {})
            location = data.get('location', {})
            return {'title':data['name'], 'company':data.get('company', {}).get('name', entry['employer']),
                    'location':', '.join(str(location.get(k,'')) for k in ('city','region','country') if location.get(k)),
                    'url':data.get('applyUrl') or f"https://jobs.smartrecruiters.com/{company}/{row['id']}",
                    'description':' '.join(s.get('title','')+' '+s.get('text','') for s in sections.values())}, None
        except Exception as exc:
            return None, f"SmartRecruiters {company} {row['name']}: {exc}"
    jobs, errors = [], []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for job, error in pool.map(detail, candidates):
            if job: jobs.append(job)
            if error: errors.append(error)
    return jobs, errors
