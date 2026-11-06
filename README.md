# Fieldnote — psychology student opportunities

A public, no-login directory for UNC Charlotte undergraduates and other psychology students. Browse internships, student research placements and adjacent experience, save roles in the current browser, and highlight skills from a resume processed on the device.

## What the counts mean

The November 6, 2026 snapshot contains **690 internship/student-placement candidates**:

- **233 focused opportunities:** clinical/community support, research, HR/I/O and related experience.
- **457 broader management internships:** displayed in their own section, with separate pagination.
- **246 explicitly mention Summer 2027** across both sections. Use the season filter for Summer, Spring or unspecified dates.

Of these, **141 came from employer feeds** and **549 came from a community index and require employer review**. A community summary can omit qualifications, school restrictions or a closure. Its provenance is visible on the card; it is not represented as employer-verified availability. Counts are generated from collected records and change as sources change. The separate entry-level count does not inflate the internship count.

The scan recorded **2,366 working employer sources** and **55 unavailable sources**. `source-health.json` contains individual results. The discovery pool contains 2,634 candidate board addresses; a configured address does not count as a successful source read.

## Browse and run locally

The public site is [on GitHub Pages](https://rmunozcuevas.github.io/psychology-internship-finder/). No account is needed to browse or save roles. Search titles, organizations, skills and locations; filter career path, season and opportunity type. Focused and broader sections use the same search/location/season criteria and have their own page controls.

There is no build step. Serve the repository over HTTP because the frontend uses JavaScript modules:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Resume matching accepts TXT, PDF and DOCX. PDF/DOCX parsers load from CDNs; TXT requires neither parser. The file stays in the browser. Skill overlap is a keyword heuristic, not a guarantee of eligibility.

## Daily refresh

“Refresh internship listings” runs every day at **10:17 UTC**: 5:17 a.m. Eastern standard time or 6:17 a.m. daylight time. GitHub can delay scheduled runs. It can also be started manually from Actions.

1. Run the source parsing, deduplication and eligibility checks.
2. Discover up to 2,700 supported employer boards from the public [job-board-directory](https://kalebconfer-sys.github.io/job-board-directory/), prioritizing health, human services, research, education and larger employers with HR/people functions.
3. Read employer APIs, retrieve full qualifications where needed, screen roles and deduplicate requisitions.
4. Supplement with U.S. [SearchTern-Listings](https://github.com/KSaifStack/SearchTern-Listings) candidates observed within 14 days, keeping the community label. Employer results take priority for duplicate requisitions.
5. Check the five Charlotte-area program watchlist pages separately; uncertain or paused program leads do not enter the internship count.
6. Commit the collected snapshot, discovery registry and source-health report. Successful completion triggers Pages publishing and the optional database import.

The workflow reports actual counts in its run summary. Overlapping refreshes queue. Discovery outages reuse the last candidate registry. Records belonging to temporarily failed sources may be retained for up to 30 days, preserving their original check date. The frontend flags a feed older than 36 hours as overdue.

## Sources and screening

- `employer-boards.json`: manually reviewed priority employer identifiers.
- `discovered-boards.json`: generated discovery candidates, parsed only for supported ATS hosts.
- `scripts/refresh-jobs.mjs`: Greenhouse, Lever, Ashby, Workday, SmartRecruiters and configured BambooHR collection.
- `scripts/relevance.mjs` and `opportunity-rules.json`: relevant functions, student/experience distinction, senior/graduate-only exclusions and school-access signals.
- `scripts/posting-key.mjs`: requisition keys for tracking/locale variants and supported ATS identifiers.
- `source-health.json`: successful, unavailable and partial reads, including scan counts.

The count does not require “psychology” in a title. Undergraduate research/student placements, human services, clinical support, consumer research and workplace/HR functions can qualify. General management belongs in the broader section. Unrelated AI, quantitative-finance or physical-science research is excluded from the focused research group. Specialized construction, investment or product-management roles require explicit all-major/psychology context to enter the broader group. Professional-degree-only titles and known graduate-only requirements are excluded. Technician positions remain experience roles.

Workday searches combine quoted `"intern"` and `internship` terms to avoid matches to internal medicine. Pagination preserves a first-page total when later pages incorrectly report zero, detects repeated pages, and reports budget-limited reads as partial. Searches have a two-minute source budget and 1,000-result limit per query; detail collection has a three-minute total source budget. These limits are coverage limits, not claims that every vacancy was read.

For an optional same-day expansion, `--extend` reuses successful source reads from a collection completed within six hours; reuse is recorded. Scheduled runs always perform fresh collection. Provider-specific collection can write isolated snapshots with `--providers=... --output-dir=...`; `scripts/merge-snapshots.mjs` combines completed snapshots, applies current rules, and preserves employer priority over community records.

## UNC Charlotte and local programs

Explicit restrictions to another institution are screened out of live postings where detected. University program cards are shown only when `program-eligibility.json` documents external-student access. Duke-only and UGA-only programs are excluded; Princeton SYNAPSE remains because it has a non-Princeton undergraduate track. Unverified program cards stay hidden. Class year, citizenship, work authorization, major, academic credit and other individual requirements still require checking.

`local-program-sources.json` tracks Psychology For All, MHA Central Carolinas, Charlotte Community Health Clinic and UNC Charlotte programs. `local-programs.json` contains daily page checks and current uncertainty/paused labels. These are program leads, not guaranteed open positions or vacancy counts.

## Optional PostgreSQL API

The default public site reads the collected JSON snapshot. To use FastAPI/PostgreSQL:

1. Deploy `render.yaml` to provision the API and database.
2. Add the Actions secret `DATABASE_URL` and repository variable `API_BASE` with the deployed API origin.
3. Run “Refresh psychology internship database” manually, then deploy Pages so it receives the API address.

After each successful listing refresh, the database workflow checks out the new snapshot and runs `python backend/scrape.py --from-feed`. This imports the same records rather than performing a second inconsistent crawl. Known closing dates are stored and expired rows are excluded from API responses. Community provenance survives database import. When no database secret is configured, the optional import is skipped and the public JSON site continues working. The frontend loads all API pages rather than silently stopping at the first 2,000 rows.

## Checks and contributions

```sh
node --test tests/*.test.*
python3 -m py_compile backend/*.py
```

Checks cover requisition deduplication, vendor-host validation, Workday pagination/closures, eligibility, community freshness, focused versus broader relevance, and frontend counts/filtering/pagination. See [CONTRIBUTING.md](CONTRIBUTING.md) to suggest an official source or report a false positive. Do not manually insert listings or count ordinary jobs as internships to meet an inventory target.
