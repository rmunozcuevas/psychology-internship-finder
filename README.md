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

Employer board APIs do not provide a universal job search, so the directory grows as community members suggest employer board identifiers. Use the public GitHub Issues page to suggest a source or report a stale link. We only add publicly accessible employer career boards, and the live feed labels postings whose season is not stated. LinkedIn and Indeed are not scraped. Open source, report problems, or suggest a board at https://github.com/rmunozcuevas/psychology-internship-finder/issues. No account is needed to browse or save roles; saved roles stay in the user's browser.

## Resume privacy

The resume file is processed in the browser and is not sent to an application server. The prototype does not save the file. Skill matching is a transparent keyword heuristic, not an employment decision or guarantee of eligibility.

## Curated 2027 programs

The Summer 2027 program section links directly to official university or program pages and shows their published dates/application status. Check each source for eligibility, changes, and current availability before applying.
