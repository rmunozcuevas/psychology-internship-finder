# Fieldnote — Psychology internship finder

A public, no-login internship and experience directory for psychology students and anyone exploring related work. The live site is hosted on GitHub Pages and is free to browse.

## Run it

Open `index.html` in a browser. No build step is required.

## What’s included

- Psychology roles sort ahead of adjacent people, research, and community roles.
- Search by role, organization, skill, and location; filter by focus area, remote/hybrid, and paid status.
- Save roles privately in the current browser and expand descriptions.
- Browse a curated, directly linked list of verified Summer 2027 psychology and neuroscience programs.
- Add a resume in PDF, DOCX, or TXT format. Skill matching is done in the browser and matching skill tags are highlighted. PDF and DOCX reading use browser libraries loaded from CDNs; TXT works without them.
- Responsive layout, keyboard shortcut (⌘/Ctrl+K), visible focus, and reduced-motion support.

## Live listing refresh

The browser UI reads `opportunities.json`. `scripts/refresh-jobs.mjs` imports relevant internships and research roles from employer-published Greenhouse, Lever, and Ashby job boards. Listings that explicitly identify Summer 2027 are labeled as such; other current roles are clearly labeled “Season not specified.” The GitHub Actions workflow refreshes the feed daily at 10:17 UTC and can also be run manually. Each role links to its employer posting.

To configure, add these Actions repository variables as comma-separated employer board identifiers (not URLs):

- `GREENHOUSE_BOARDS`: public Greenhouse board tokens.
- `LEVER_SITES`: public Lever site names.
- `ASHBY_BOARDS`: public Ashby board names.

Starter employer identifiers are listed in [`employer-boards.json`](employer-boards.json) and are preconfigured as workflow defaults. They are discovery sources, not a promise of a relevant Summer 2027 opening. Add or remove source identifiers in GitHub Actions repository variables as the curated set grows.

The refresh script only queries these documented public endpoints. It does not log into or scrape LinkedIn or Indeed. LinkedIn prohibits crawlers and scraping in its User Agreement ([section 8.2](https://www.linkedin.com/legal/user-agreement)); Indeed's current Site Rules prohibit automated data mining/scraping without written permission ([Indeed Terms](https://www.indeed.com/legal?hl=en_US#site-rules)). Roles link to employer career pages, where the applicant can confirm requirements and apply. If formal LinkedIn or Indeed API/publisher access is granted, a separately authorized adapter can be added.

## Database-backed feed (optional hosted setup)

The app includes a public FastAPI read API and PostgreSQL scraper. It imports the public SearchTern community JSON feed plus psychology-filtered Summer 2027/off-season internship markdown tables, deduplicates by posting URL, upserts into PostgreSQL, and only removes rows unseen for 30 days. The browser only calls `GET /opportunities`; no account is needed.

To activate it:

1. Deploy [`render.yaml`](render.yaml) from the public repository to provision the API and Postgres database on Render.
2. In GitHub repository Settings → Secrets and variables → Actions, add secret `DATABASE_URL` using the database connection string from Render.
3. Add repository variable `API_BASE` with the deployed API origin, for example `https://your-api-name.onrender.com` (no trailing slash).
4. Run “Refresh psychology internship database” once in GitHub Actions. It also runs daily at 10:17 UTC. Then the normal Pages deployment picks up `API_BASE` and reads the database-backed feed.

Without `DATABASE_URL` and `API_BASE`, the app continues to use the checked-in JSON feed. Render free services may sleep during inactivity; the first API request can be slower while the service wakes.

Employer board APIs do not provide a universal job search, so the directory grows as community members suggest employer board identifiers. Use the public GitHub Issues page to suggest a source or report a stale link. We only add publicly accessible employer career boards, and the live feed labels postings whose season is not stated. LinkedIn and Indeed are not scraped. Open source, report problems, or suggest a board at https://github.com/rmunozcuevas/psychology-internship-finder/issues. No account is needed to browse or save roles; saved roles stay in the user's browser.

## Resume privacy

The resume file is processed in the browser and is not sent to an application server. The prototype does not save the file. Skill matching is a transparent keyword heuristic, not an employment decision or guarantee of eligibility.

## Curated 2027 programs

The Summer 2027 program section links directly to official university or program pages and shows their published dates/application status. Check each source for eligibility, changes, and current availability before applying.


### Expanded employer coverage

`employer-boards.json` is the shared registry for the website refresh and PostgreSQL scraper. Both fetch current Greenhouse, Lever and Ashby postings; individual listings are never hand-entered. Repository board variables extend the registry instead of replacing it. Add an employer's public board identifier and name to the appropriate array to expand coverage.

The November 5 expansion adds 14 working boards (24 total), including Cortica, Centria Autism, The Behavior Exchange, Adams Clinical, Acorn Health, Charlie Health, American Institutes for Research, Irvine Clinical Research, Lyra Health and Precision Medicine Group. Notion, Ramp and Duolingo provide potential adjacent HR or research experience. Sources may have no matching roles on a given day.

The first expanded refresh fetched 1,244 matching postings, including 19 internship titles and two explicit Summer 2027 listings. Most results are ongoing behavioral technician positions, often one opening per location. They are useful experience opportunities but are not confirmed undergraduate internships or confirmed summer positions. Check qualifications, required credentials and availability on the employer page.

The daily feed workflow runs at 10:17 UTC. A successful refresh triggers Pages deployment through `workflow_run` because commits made by the Actions token do not trigger another push workflow. Website records unseen for 30 days expire; source failures are included in the feed's `errors` array. Database records also expire after 30 days. Publishing still depends on GitHub Pages accepting deployments; database updates require `DATABASE_URL`.


### Undergraduate focus

The default view shows internships and student placements. The opportunity selector offers entry-level experience separately, or both with internships first. Recommended order favors explicit Summer 2027 dates, then psychology within each opportunity type. Automated screening excludes senior titles, graduate-only requirements and explicitly required multi-year experience. Non-internship roles need a relevant assistant/technician/aide title plus entry-level, training, high-school or undergraduate eligibility evidence; explicit required completed bachelor's degrees are excluded. These text signals are a screening aid, not a guarantee of eligibility. Rules live in `opportunity-rules.json` and are used by both scrapers and the API. Counts will decrease when unsuitable or uncertain roles are removed.


### Career path coverage (November 6)

Employer sources now include Eliot Community Human Services for bachelor's-level clinical placements, Busara for behavioral research (international), and dedicated HR/talent internship boards including RF-SMART, Arc Boat Company, National Life Group, Stratolaunch, Trove Brands and Astera Labs Early Career. Live APIs supply the actual listings. Each card labels its clinical/pre-therapy, I/O/workplace, research/human-behavior or related-experience pathway; the career-path selector narrows the live results. I/O roles remain adjacent rather than being relabeled as clinical psychology. Location, eligibility and season must be checked per posting. A board name mentioning 2027 does not by itself confirm the role's season.


### UNC Charlotte school eligibility

Live postings are screened for explicit restrictions to another institution. This text screen cannot guarantee that an unmentioned school restriction does not exist. Program cards use `program-eligibility.json`: only programs with verified external-student access are shown, and duplicate URLs are removed. Duke-only and UGA-only programs are excluded. Princeton SYNAPSE remains because its visiting-student route explicitly accepts non-Princeton undergraduates. School access does not establish citizenship, class-year, major, academic-credit, travel or other individual eligibility; cards show the known conditions and source links. Unverified programs are hidden until reviewed.


### Full internship coverage and local monitoring

The registry includes nonprofit/community-services employers, research employers and corporate HR/people teams. Workday imports search all public internship pages and retrieve full descriptions, open/application state and closing dates before applying the undergraduate and school-access screens. Some Workday boards return `total: 0` after page one; pagination retains the first positive total instead of stopping early. SmartRecruiters imports U.S. internship results and retrieves each matching posting's full qualification sections and application link. These providers are connected to both daily import paths.

`local-program-sources.json` tracks Charlotte-area programs separately. The daily website refresh checks each page and writes `local-programs.json`, shown as a local watchlist. Paused applications and unconfirmed Summer 2027 openings are not added to the active internship count. Local eligibility notes distinguish undergraduate support/advocacy opportunities from graduate clinical supervision. These pages are monitored for status, not represented as a guaranteed number of vacancies.

The employer feed contains explicit Summer 2027, other 2027 seasons and season-unspecified opportunities. Past-year seasonal titles are excluded. A larger catalogue does not imply all internships fit Summer 2027. Locations and remaining qualifications must be checked on each employer posting.


The November 6 expanded refresh returned 59 screened internship/student placements across 74 employer boards: 13 explicitly Summer 2027, 14 Spring 2027 and 32 season-unspecified. These figures are a refresh snapshot, not fixed targets. Use the Season filter to narrow the results. The five Charlotte program watchlist pages are excluded from those counts. Known Workday closing dates are stored in PostgreSQL and excluded from API results after expiry.


The primary internship statistic counts all screened student placements across clinical support, human services, research, HR/I/O and other relevant functions. It does not require “psychology” in the job title. Clinical/pre-therapy and other psychology pathways are filters, not separate definitions of whether a role counts as an internship. Technician jobs remain entry-level rather than being relabeled as internships.
