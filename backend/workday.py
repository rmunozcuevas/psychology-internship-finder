"""Read public Workday employer listings and verify each candidate's full posting."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import re
import requests
from eligibility import RULES, opportunity_kind


def collect_workday(entry):
    host, tenant, site = entry['id'].split('|')
    if not host.endswith('.myworkdayjobs.com'):
        raise ValueError('Invalid Workday host')
    base = f'https://{host}/wday/cxs/{tenant}/{site}'
    postings = []
    total = None
    for offset in range(0, 5000, 20):
        response = requests.post(base + '/jobs', json={'limit':20, 'offset':offset, 'searchText':'intern'}, timeout=35)
        response.raise_for_status()
        data = response.json()
        if total is None and data.get('total', 0) > 0:
            total = data['total']
        page = data.get('jobPostings', [])
        postings.extend(page)
        if not page or (total is not None and offset + len(page) >= total) or len(page) < 20:
            break
    pattern = '|'.join(RULES[key] for key in ('clinicalTitle', 'ioTitle', 'researchTitle'))
    candidates = [row for row in postings if re.search(pattern, row['title'], re.I)]
    def detail(row):
        try:
            response = requests.get(base + row['externalPath'], timeout=35)
            response.raise_for_status()
            info = response.json().get('jobPostingInfo', {})
            if not info or info.get('canApply') is False or info.get('posted') is False:
                return None, None
            if info.get('endDate') and info['endDate'] < datetime.now(timezone.utc).date().isoformat():
                return None, None
            return {'title':info['title'], 'description':info.get('jobDescription', ''),
                    'deadline':info.get('endDate'), 'company':entry['employer'], 'location':info.get('location', ''),
                    'url':info.get('externalUrl', f'https://{host}/en-US/{site}'+row['externalPath'])}, None
        except Exception as exc:
            return None, f"Workday {row['title']}: {exc}"
    jobs, errors = [], []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for job, error in pool.map(detail, candidates):
            if job: jobs.append(job)
            if error: errors.append(error)
    return jobs, errors
