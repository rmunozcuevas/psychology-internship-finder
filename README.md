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
