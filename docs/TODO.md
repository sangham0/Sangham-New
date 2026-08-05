# Implementation Backlog - next passes (no founder decision required, or blocked on assets)

Items here can be worked without waiting for founder sign-off, unless noted as blocked.
Blocked items are included so they do not get forgotten. For decisions that must be resolved
before implementation begins, see `docs/DECISIONS.md`.

---

## A. Content engine

These items build the foundation for sustainable publishing. Work them in order; the
migration unlocks everything else in this group.

**A1. Migrate essays and practice guides to Astro content collections.**
The `src/content.config.ts` defines a content collection that is currently unused (only an
example.md exists). Migrating the TypeScript arrays in `src/data/essays.ts` and
`src/data/practice-guides.ts` into proper markdown files in `src/content/` would allow
non-technical publishing via markdown, enable frontmatter-driven metadata, and simplify the
dynamic route in `src/pages/wisdom/[id].astro`. When migrating, preserve the `notebook: true`
flag so the From the Contemplative Notebooks section keeps working.
_Rationale: removes the need to edit TypeScript to publish new essays or guides._
_Files: `src/data/essays.ts`, `src/data/practice-guides.ts`, `src/content.config.ts`,
`src/pages/wisdom/[id].astro`_

**A2. Consolidate the three standalone essay pages into the content collection.**
Once A1 is complete, migrate the three manually-maintained standalone pages
(`src/pages/wisdom/kings-and-queens.astro`, `authenticity-as-a-mask.astro`,
`the-art-of-becoming-invisible.astro`) into the collection as markdown files and delete the
standalone Astro files. Update any exclusion logic in `[id].astro` that currently guards
against collisions.
_Rationale: eliminates duplicate maintenance of essay formatting._
_Files: the three standalone pages above, `src/pages/wisdom/[id].astro`_

**A3. Write the first six SEO articles.**
Each article: 1,500-2,500 words, honest and non-alarmist in register, British spelling,
soft bridge to the relevant landing page at the close, 2 internal links to sibling articles.
Target queries and destination pages:

| # | Target query | Landing page |
| --- | --- | --- |
| 1 | "When meditation makes anxiety worse" | `/counselling-for-meditators` |
| 2 | "Coming home from retreat: why the weeks after are often harder" | `/counselling-for-meditators` |
| 3 | "Wellness counsellor vs psychologist in South Africa" | `/counselling` and `/online-counselling-south-africa` |
| 4 | "My teenage son won't talk to me" | `/mentoring-for-adolescents` |
| 5 | "Mentorship vs therapy for teenage boys" | `/mentoring-for-adolescents` |
| 6 | "Capable but directionless: the gap between knowing and doing in your twenties" | `/mentoring-for-young-men` |

_Rationale: the site has strong on-page SEO but almost no content depth; these articles
address high-intent queries that the service pages cannot rank for directly._
_Blocked on: A1 migration (so articles publish as content-collection markdown, not raw
Astro files)._

---

## B. Design consolidation

**B1. Migrate `/counselling` and `/about` toward the editorial register of `/counselling-for-meditators`.**
The meditators page uses a lighter, more spacious layout with clearly separated text sections.
The counselling and about pages are denser and use heavier photo-quote treatments. A pass to
align the visual rhythm would strengthen coherence across the site.
_Rationale: reduces the sense of a site that grew section by section._
_Files: `src/pages/counselling.astro`, `src/pages/about.astro`_

**B2. Flatten the About-page Swiper biography carousel.**
The biography section on `/about` is implemented as a Swiper carousel. Carousels are
difficult to read on desktop, where swiping is not natural. Replace with stacked sections
using the same content, no interaction required.
_Rationale: improves readability; removes carousel dependency from a text-heavy section._
_Files: `src/pages/about.astro`, possibly `src/components/`_

**B3. Reduce repeated full-bleed photo-quote sections.**
Several pages use full-bleed background-image sections with centred quote text. More than two
of these per page reduces their impact. Audit each page and reduce to a maximum of two, with
preference for cutting the vaguest.
_Rationale: scarcity increases impact; the pattern is over-used._
_Files: `src/pages/counselling.astro`, `src/pages/index.astro`, others_

**B4. Complete a systematic contrast pass** (partially progressed in June 2026: hero chips, fit-call links, footnotes and pricing notes raised; full sweep still pending).
The June 2026 pass fixed only the worst small-text offenders. A full audit is needed.
Minimum targets: approximately 55% opacity body text on dark backgrounds; approximately 60%
on light backgrounds. Search for `text-*\/[0-4]` Tailwind opacity classes on body-size text
and verify each in both light and dark context.
_Rationale: accessibility and readability; the current partial fix leaves inconsistencies._
_Files: all `src/pages/*.astro` and `src/components/`_

---

## C. Conversion

**C1. Add a "How starting works" three-step ladder block to `/counselling`.**
Proposed structure:
1. Free 15-minute fit call - no forms, no obligation.
2. Initial consultation - a full session (R850), not a screening call.
3. Five-session process - R3,400.
This makes the path explicit for visitors who want to know what happens before they commit.
_Rationale: the steps exist in prose across the page but are never laid out as a clear
sequence; a visual ladder reduces decision friction._
_Files: `src/pages/counselling.astro`_

**C2. Move the email capture below the FAQ.** **Done (June 2026).**
The "send me a plain-language overview" email-capture element currently competes with the
primary booking CTA inside the five-session offer block. Moving it below the FAQ serves
visitors who have read everything but are not yet ready to book.
_Files: `src/pages/counselling.astro`_

**C3. Add the outstanding testimonials once their approved wording arrives.**
The parent testimonial is live, and testimonial copy is now centralised in
`src/content/testimonials/` with a dedicated `/testimonials` page. Two reflections are
expected but not yet supplied: an adult counselling client, and Francis for the workshop
section. Adding each is one markdown file; follow `docs/testimonials.md`. Do not draft,
approximate, or placeholder-publish either of them.
_Blocked on: the people's own approved wording and permission._
_Files: `src/content/testimonials/`_

---

## D. Email and nurture

**D1. Choose an email service provider and set up the list.**
Suitable options in the Buttondown / MailerLite class: low volume, simple interface, good
plain-text support. Once chosen, import Formspree subscribers and configure a double-opt-in
confirmation.
_Rationale: the site currently collects emails via Formspree with no follow-up; the list is
not being used._

**D2. Write a four-email welcome sequence.**
Suggested arc:
1. Best essay (chosen by Michael) - establishes voice.
2. How the work works - a plain-language overview of the counselling process.
3. A practice guide - demonstrates practical value.
4. Fit-call invitation - the first direct ask, after three trust-building emails.
_Rationale: new subscribers have the highest engagement in the first week; a sequence
converts the list into a warm audience._
_Blocked on: D1._

---

## E. Distribution

**E1. Create a one-page referral PDF for professionals.**
Intended recipients: retreat centres, dharma teachers, school counsellors, Boys to Men
network contacts. The PDF should cover the meditators offer and the mentorship pages,
include UTM-tagged links to relevant landing pages, and be concise (one A4 page or folded
two-pager).
_Rationale: word-of-mouth referrals from aligned professionals are the most efficient
acquisition channel for this type of work._

**E2. Verify Google Search Console and submit the sitemap.**
Confirm that the property is verified, that the sitemap at `/sitemap-index.xml` has been
submitted, and that no index coverage errors exist for the primary service pages.
_Rationale: basic hygiene; without this, ranking data is unavailable._

**E3. Claim the Google Business Profile for the brand SERP.**
A verified Google Business Profile improves the brand SERP and adds a trust signal for
visitors researching "Sangham counselling" or Michael Kaplan directly.
_Rationale: low-effort trust signal; relevant for South African local and brand searches._

---

## F. Performance and hygiene

**F1. Trim Google Fonts weights.**
Currently 7 Cormorant weights and 4 Inter weights are loaded. Approximately half are used.
Audit which weights are actually applied in `src/styles/global.css` and the component files,
then remove unused font requests.
_Rationale: reduces render-blocking font load; straightforward performance win._
_Files: font import declarations (likely in `src/layouts/BaseLayout.astro` or
`src/styles/global.css`)_

**F2. Compress oversized source images.**
At least one source image in `src/assets/` is approximately 9.5MB; several others exceed
2MB. While `astro:assets` optimises these at build time, large source files slow the build
and are unnecessary.
Action: compress all source images above 1MB before committing; target under 500KB for
purely decorative images. Specific known issues:
- One file approximately 9.5MB (identify via `find src/assets -size +5M`)
- "misty forest.JPG" and "misty jungle.JPG" - file names contain spaces; rename to
  kebab-case to avoid shell and URL escaping issues.
_Files: `src/assets/`_

**F3. Remove verified-unused assets.**
Audit `src/assets/` for images that are not imported anywhere in `src/`. Remove confirmed
orphans to keep the repository lean.
_Files: `src/assets/`_

**F4. Add per-page OG images for key pages.**
The OG image script (`scripts/generate-og-images.mjs`) currently generates the two
mentoring-page images and recompresses the site-wide default. Consider adding distinct
images for `/counselling`, `/about`, `/practices`, and `/workshops`, which are the pages
most likely to be shared directly.
_Rationale: page-specific OG images improve social share appearance and click-through._
_Files: `scripts/generate-og-images.mjs`, `src/layouts/BaseLayout.astro`_

**F5. Update internal hrefs to trailing-slash form.**
`vercel.json` now enforces trailing slashes with 308 redirects; internal links like
`/counselling` still use the non-slash form and incur one cached redirect hop. A mechanical
sweep of href attributes would remove it. Low priority.

---

## G. QA and CI

**G1. Add a link checker to the PR workflow.**
A simple broken-link check (for example, using `lychee` or a Node-based checker) run on
pull requests would catch dead internal links before they reach production. This is
particularly relevant as the content grows.
_Rationale: low-effort guard against internal dead links as pages and essays are added._

**G2. Keep the existing Vercel build workflow green.**
The current build passes cleanly. Any new dependency or structural change should be tested
against `npm run build` before merging.
_Rationale: Astro static builds are fast; there is no reason to tolerate a broken build._
