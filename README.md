# Fieldnote — Psychology internship finder

A responsive Summer 2027 internship discovery prototype for psychology students.

## Run it

Open `index.html` in a browser. No build step is required.

## What’s included

- Psychology roles sort ahead of adjacent people, research, and community roles.
- Search by role, organization, skill, and location; filter by focus area, remote/hybrid, and paid status.
- Save roles and expand descriptions.
- Add a resume in PDF, DOCX, or TXT format. Skill matching is done in the browser and matching skill tags are highlighted. PDF and DOCX reading use browser libraries loaded from CDNs; TXT works without them.
- Responsive layout, keyboard shortcut (⌘/Ctrl+K), visible focus, and reduced-motion support.

## Live listing refresh

The browser UI reads `opportunities.json`; sample listings remain as a fallback until the file has live results. `scripts/refresh-jobs.mjs` imports Summer 2027 roles from employer-published Greenhouse, Lever, and Ashby job boards. The GitHub Actions workflow is scheduled daily at 10:17 UTC and can also be run manually. It updates the feed and commits it to the repository. Once configured, the UI shows the feed refresh time and links each role to its employer posting.

To configure, add these Actions repository variables as comma-separated employer board identifiers (not URLs):

- `GREENHOUSE_BOARDS`: public Greenhouse board tokens.
- `LEVER_SITES`: public Lever site names.
- `ASHBY_BOARDS`: public Ashby board names.

Starter employer identifiers are listed in [`employer-boards.json`](employer-boards.json) and are preconfigured as workflow defaults. They are discovery sources, not a promise of a relevant Summer 2027 opening. Add or remove source identifiers in GitHub Actions repository variables as the curated set grows.

The refresh script only queries these documented public endpoints. It does not log into or scrape LinkedIn or Indeed. LinkedIn prohibits crawlers and scraping in its User Agreement ([section 8.2](https://www.linkedin.com/legal/user-agreement)); Indeed's current Site Rules prohibit automated data mining/scraping without written permission ([Indeed Terms](https://www.indeed.com/legal?hl=en_US#site-rules)). Roles link to employer career pages, where the applicant can confirm requirements and apply. If formal LinkedIn or Indeed API/publisher access is granted, a separately authorized adapter can be added.

Board IDs must be configured to produce useful volume; the current source list is empty because identifiers vary by employer. The date filter is intentionally conservative and includes only listings whose title/description mentions summer, months, or 2027. Employers often omit season dates, so broader Summer 2027 coverage requires curated employer board lists and/or explicit seasonal feeds. The importer retains previous results during a refresh, deduplicates by posting URL, and records source and refresh metadata.

## Resume privacy

The resume file is processed in the browser and is not sent to an application server. The prototype does not save the file. Skill matching is a transparent keyword heuristic, not an employment decision or guarantee of eligibility.
