import json, os, re, hashlib, html
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup
from api import connect, initialize
from eligibility import opportunity_kind, RULES

TERMS = re.compile(r"intern|internship|summer student|research assistant|co-?op|fellow|lab assistant|survey research|behavior(?:al)?(?: health)? technician|psychiatric aide|case management assistant|crisis support|youth mentor|after.school|special education aide|registered behavior technician|\bRBT\b|recruiting coordinator|employee engagement|market research assistant|people operations|talent acquisition", re.I)
PSYCH = re.compile(r"psycholog|behavioral health|mental health|neuropsych|counseling|human behavior|child development|behavior(?:al)?(?: health)? technician|registered behavior technician|\bRBT\b", re.I)
ADJ = re.compile(r"research|lab assistant|survey|consumer insights|ux research|user research|people analytics|human resources|\bHR\b|recruiting|employee engagement|people operations|talent acquisition|clinical|health outcomes|community|social impact|human factors|public health|youth mentor|special education|\bRBT\b|market research", re.I)
SOURCES = [
 ("SearchTern community listings", "https://raw.githubusercontent.com/KSaifStack/SearchTern-Listings/main/pages/searchtern.json", "json"),
 ("SimplifyJobs Summer 2027", "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README.md", "md"),
 ("SimplifyJobs off season", "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README-Off-Season.md", "md"),
 ("vanshb03 Summer 2027", "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/README.md", "md"),
 ("vanshb03 off season", "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/OFFSEASON_README.md", "md"),
]

def clean(s): return re.sub(r"\s+", " ", html.unescape(BeautifulSoup(str(s or ""), "html.parser").get_text(" ", strip=True))).strip()
def normalize(row, source):
    title=clean(row.get("role") or row.get("title") or row.get("name")); desc=clean(row.get("description")); text=f"{title} {desc}"
    if not title or not TERMS.search(title) or not opportunity_kind(title, desc): return None
    if re.search(r"talent community|expression of interest|\bopportunities\s*$", title, re.I): return None
    if re.search(r"senior|director|manager|licensed|postdoctoral|postdoc|professor|faculty|phd candidate",title,re.I): return None
    if not (re.search(RULES["clinicalTitle"]+"|"+RULES["ioTitle"],title,re.I) or PSYCH.search(title) or ADJ.search(title) or PSYCH.search(desc) or ADJ.search(desc)): return None
    url=str(row.get("link") or row.get("url") or "").strip()
    if not url.startswith("http"): return None
    company=clean(row.get("company") or row.get("org") or "Employer")
    location=clean(row.get("location")); typ="psychology" if (PSYCH.search(title) or re.search(RULES["clinicalTitle"],title,re.I)) else "adjacent"
    season="Summer 2027" if re.search(r"summer\s*2027|2027\s+summer",text,re.I) else "Spring 2027" if re.search(r"spring\s*2027",text,re.I) else "Season not specified"
    skills=[k for k,p in [("Research methods",r"research|study|participant"),("Data analysis",r"data|statistics|excel|spss"),("Child development",r"child|youth|pediatric|development"),("Communication",r"communication|interpersonal"),("Survey design",r"survey|questionnaire|qualtrics"),("Outreach",r"outreach|community"),("Writing",r"writing|written|editing")] if re.search(p,text,re.I)]
    return {"id":hashlib.sha256((url.split("?")[0]).encode()).hexdigest(),"title":title,"company":company,"location":location,"url":url,"description":desc[:4000],"type":typ,"season":season,"skills":skills,"source":source}

def employer_jobs(board):
    kind, entry = board
    slug = entry["id"]
    urls = {
        "greenhouse": f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true",
        "lever": f"https://api.lever.co/v0/postings/{slug}?mode=json",
        "ashby": f"https://api.ashbyhq.com/posting-api/job-board/{slug}",
    }
    try:
        res = requests.get(urls[kind], timeout=35)
        res.raise_for_status()
        data = res.json()
        rows = data if kind == "lever" else data.get("jobs", [])
        jobs = []
        for row in rows:
            location = row.get("location", "")
            if isinstance(location, dict): location = location.get("name", "")
            description = row.get("content") or row.get("descriptionPlain") or row.get("descriptionHtml") or row.get("description", "")
            description += " ".join(str(section.get("content", "")) for section in row.get("lists", []))
            item = normalize({"title": row.get("title") or row.get("text"),
                "company": entry["employer"],
                "location": row.get("categories", {}).get("location", location),
                "url": row.get("absolute_url") or row.get("hostedUrl") or row.get("jobUrl"),
                "description": description}, kind.title())
            if item: jobs.append(item)
        return jobs, None
    except Exception as exc:
        return [], f"{kind} {slug}: {exc}"

def scrape():
    collected=[]; errors=[]
    registry = json.loads((Path(__file__).resolve().parent.parent / "employer-boards.json").read_text())
    boards = [(kind, board) for kind in ("greenhouse", "lever", "ashby") for board in registry.get(kind, [])]
    with ThreadPoolExecutor(max_workers=6) as pool:
        for jobs, error in pool.map(employer_jobs, boards):
            collected.extend(jobs)
            if error: errors.append(error)
    for name,url,kind in SOURCES:
        try:
            res=requests.get(url,timeout=35);res.raise_for_status()
            if kind=="json":
                data=res.json()
                if isinstance(data,dict): data=data.get("jobs",data.get("listings",[]))
                for row in data:
                    item=normalize(row,name)
                    if item: collected.append(item)
            else:
                soup=BeautifulSoup(res.text,"html.parser")
                for table in soup.select("table"):
                    for tr in table.select("tr"):
                        cells=tr.find_all(["td","th"])
                        if len(cells)<4: continue
                        a=next((c.find("a",href=True) for c in reversed(cells) if c.find("a",href=True)),None)
                        row={"company":cells[0].get_text(" ",strip=True),"role":cells[1].get_text(" ",strip=True),"location":cells[2].get_text(" ",strip=True),"link":a["href"] if a else ""}
                        item=normalize(row,name)
                        if item: collected.append(item)
        except Exception as e: errors.append(f"{name}: {e}")
    dedup={x["id"]:x for x in collected}; jobs=list(dedup.values())
    if not jobs: raise RuntimeError(f"No matching jobs collected; refusing to wipe database. Source errors: {errors}")
    initialize()
    with connect() as conn:
        for j in jobs:
            conn.execute("""INSERT INTO internships(id,title,company,location,url,description,type,season,skills,source,last_seen)
              VALUES(%(id)s,%(title)s,%(company)s,%(location)s,%(url)s,%(description)s,%(type)s,%(season)s,%(skills)s,%(source)s,now())
              ON CONFLICT(id) DO UPDATE SET title=excluded.title,company=excluded.company,location=excluded.location,url=excluded.url,description=excluded.description,type=excluded.type,season=excluded.season,skills=excluded.skills,source=excluded.source,last_seen=now()""",{**j,"skills":json.dumps(j["skills"])})
        # Expire records unseen for 30 days so temporary source outages don't delete the catalog.
        conn.execute("DELETE FROM internships WHERE last_seen < now() - interval '30 days'")
    print(f"Upserted {len(jobs)} relevant jobs. Source errors: {len(errors)}")
    for error in errors: print(error)
if __name__=="__main__": scrape()
