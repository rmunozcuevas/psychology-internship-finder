# NinerPath student search roadmap

## Phase 1 — trust and clarity

- [x] Improve source verification and expired-listing detection.
  - The daily refresh now follows collection with bounded page checks for community candidates and stale records.
  - Matching structured JobPosting data, explicit closure messages, expired deadlines and HTTP 404/410 have distinct handling. HTTP 403/429, timeouts, generic redirects and CAPTCHA pages remain unknown.
  - Confirmed closures leave both feeds; a public archive retains minimal listing metadata for 90 days. Failed-source carryover is limited to seven days and cannot refresh its observation timestamp.
  - Cards distinguish a recent employer-feed observation, a matching posting page, a community candidate and a stale record. None establishes personal eligibility.
- [x] Expand undergraduate eligibility screening.
  - Required completed degrees, graduate/professional placements and additional school-only patterns are screened. Preferred qualifications, in-progress degrees and explicit future-start conditions are not treated as automatic exclusions.
  - Cards flag school year, GPA, credentials, credit/placement, and work-authorization conditions for review. The website and optional database importer share rule definitions.
- [x] Redesign listing cards for scanability.
  - Title, organization, provenance, student notes and dates come first, followed by a short description, skills, clear actions and expandable details. Mobile navigation gives direct access to preferences, applications and updates.

## Phase 2 — a useful student workspace

- [x] Add career-path preference onboarding.
  - Optional, non-blocking choices per subject; no account required. Preferences change recommendation order without hiding other paths.
- [x] Expand search and location filters.
  - Multi-term search includes location fields as well as titles, descriptions and skills. City/state variants (e.g. Seattle, WA / Seattle, Washington) match consistently. Both search inputs offer a major-city directory with actual feed counts and aliases such as NYC, LA, SF and D.C.; city-only queries match location, not incidental headquarters mentions. Neighboring cities are not silently included, and cities with no current listings show zero. A search summary links focused and broader results, shows removable active filters, and offers matching entry-level roles without losing the search. Other filters include quoted phrases, excluded words, US state, work setting, compensation, posting age and recent source observation. Focused and broader sections share advanced filters.
  - Unknown location/work-setting/pay/date values are not silently inferred. This is text-based location search, not a radius or commute calculation.
- [x] Add application tracker and CSV export.
  - Shared between psychology and sociology in the current browser. Track preparation, applications, interviews and outcomes, plus notes and a next-action date. Removal has an undo action.
  - Export all tracked rows, including notes, as CSV; formula-leading cells are escaped for spreadsheet safety. Resume text and the temporary application profile are excluded.

## Phase 3 — returning to a relevant search

- [x] Add deadline and new-listing alerts.
  - In-site inbox for new catalogue listings after the first-visit baseline and approaching application deadlines. New listings follow career/location/work-setting preferences. Deadline scope and reminder window are configurable; applied/terminal tracked roles do not receive application-deadline reminders.
  - Read state persists on this browser. The open page checks the feed periodically and when revisited. No email, background push, or notifications while the website is closed are implemented.
- [x] Add personalized relevance ranking.
  - Internships stay first; preferred paths, location, work setting, stated pay, Summer 2027 and listed resume skills improve ordering. Evidenced requirement gaps and stale sources reduce rank.
  - Reasons are visible on cards. Ranking does not determine eligibility or predict acceptance. Broader management opportunities remain separate.

## Storage and practical limits

Preferences, saved IDs, tracker entries and alert read state are stored in local browser storage. They do not synchronize between devices. Resume text/profile facts remain in memory until cleared or reloaded. No user data is uploaded by these features. In-site alerts require opening the site; daily source refreshes can be delayed or blocked. Source text and automated screening cannot guarantee completeness or a student's eligibility.

Run checks with `node --test tests/*`. The optional PostgreSQL backend preserves the snapshot's source observations and verification metadata when importing with `--from-feed`.
