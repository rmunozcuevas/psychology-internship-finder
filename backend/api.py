import os
from eligibility import opportunity_kind
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
import psycopg

DATABASE_URL = os.environ.get("DATABASE_URL")

def connect():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

def initialize():
    with connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS internships (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, company TEXT NOT NULL,
          location TEXT NOT NULL DEFAULT '', url TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
          type TEXT NOT NULL, season TEXT NOT NULL DEFAULT 'Season not specified',
          skills JSONB NOT NULL DEFAULT '[]', source TEXT NOT NULL,
          first_seen TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
        )""")

@asynccontextmanager
async def lifespan(app):
    if DATABASE_URL:
        initialize()
    yield

app = FastAPI(title="Psychology Internship Finder API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

@app.get("/health")
def health():
    if not DATABASE_URL:
        return {"ok": False, "database": "not configured"}
    with connect() as conn:
        count = conn.execute("SELECT count(*) AS n FROM internships").fetchone()["n"]
    return {"ok": True, "count": count}

@app.get("/opportunities")
def opportunities(limit: int = Query(1000, ge=1, le=2000), offset: int = Query(0, ge=0)):
    with connect() as conn:
        refreshed = conn.execute("SELECT max(last_seen) AS at FROM internships").fetchone()["at"]
        rows = conn.execute("""SELECT id,title,company AS org,location,url,description,type,season,skills,source,last_seen AS last_seen_at
          FROM internships""").fetchall()
    roles = []
    for row in rows:
        kind = opportunity_kind(row['title'], row['description'])
        if kind:
            roles.append({**row, 'opportunityKind': kind})
    roles.sort(key=lambda r: (r['opportunityKind'] != 'internship', r['season'] != 'Summer 2027', r['type'] != 'psychology', r['title']))
    return {"total": len(roles), "updatedAt": refreshed.isoformat() if refreshed else None, "roles": roles[offset:offset+limit]}
