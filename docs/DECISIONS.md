# Founder Decisions Required - Sangham.org

These are judgement calls deliberately NOT made autonomously during the production pass of
June 2026. Each item has options and a recommendation; nothing here is implemented. Decisions
marked with a recommendation reflect the engineer's best read of the evidence, not a directive.
Michael has final authority on all of them.

---

## 1. Homepage hero positioning

**Context.** The current H1 reads "A place for careful, grounded inner work." with the
sub-line "If you understand what tends to go wrong but still find yourself caught in it, this
work is designed for that gap." (src/pages/index.astro, approximately lines 142-149). The
audit found it calm and well-written but too abstract: it does not name counselling, the
intended audience, or the first concrete step.

Note: the homepage `<title>` tag was updated to "Online Counselling and Contemplative Practice"
in this production pass. That can be reverted in one line if Michael disagrees with the
direction.

**Options.**

- **A. Pattern-recognition anchor.**
  H1: "Counselling for people who understand their patterns, and are still caught in them."
  Sub-line: "A structured process combining counselling, breathwork, and contemplative
  practice, conducted online."
  CTAs: "Book a Free Fit Call" / "Explore the Approach"
  (The H1 is adapted from copy that already exists on the ads landing page, so it is
  voice-consistent and already live in a different context.)

- **B. Keep "inner work", add grounding.**
  H1: "Careful, grounded inner work."
  Sub-line: "Online counselling, breathwork, and contemplative practice, integrated into one
  structured process."
  CTAs unchanged.
  (Lower disruption; still abstract.)

- **C. Audience-led router.**
  H1: "Where would you like to start?"
  Sub-line: A single short sentence establishing the practitioner, followed immediately by
  four audience-path cards (counselling, meditators, young men, adolescents/parents).
  (Highest clarity; changes the page layout significantly.)

**Recommendation:** Option A. It reuses proven voice from existing copy, names the work
plainly, and retains the calm register without a structural rebuild.

**What is needed from Michael:** Approval of the chosen H1 and sub-line, or a revised draft
in his own words.

**Files affected:** `src/pages/index.astro`

---

## 2. Wisdom library curation - the positioning conflict

**Context.** Service pages consistently position the work as "psychologically grounded, not
a guru-disciple relationship, no spiritual ideology imposed." Several older essays in
`src/data/essays.ts` were written in a traditional teacher voice and contain metaphysical
claims (sacred geometry, siddhis, guru devotion). Examples include "What is Meditation?",
"What is Hatha Yoga?", "On Living", "How We Love", "On Human Relationships", and
"Crazy Times". The contrast between these essays and the service-page positioning is noticeable
and could create trust friction for a new visitor reading across the site.

**Options.**

- **A. Reframe into a sub-section.** Group the older essays under a clearly labelled
  sub-section, for example "From the contemplative notebooks", with a short framing note.
  Draft framing note (2-3 sentences, honest, non-apologetic): "These pieces were written
  during years of traditional training and practice in India. They reflect the contemplative
  traditions in their own language - metaphysical claims, classical framing, and all.
  They sit alongside the counselling work without replacing or contradicting it; they are
  notes from a different mode of inquiry."

- **B. Revise the strongest essays into the current voice.** Retain the best material;
  rewrite metaphysical passages in grounded, observational language.

- **C. Unpublish the weakest.** "Crazy Times" in particular is the weakest fit with the
  current brand and would be the first candidate for removal.

**Recommendation:** A combined with C - reframe the group into "From the contemplative
notebooks" (option A) and simultaneously unpublish "Crazy Times" (option C).

**What is needed from Michael:** Approval of the framing note copy, and a decision on which
essays (if any) to unpublish.

**Files affected:** `src/data/essays.ts`, `src/pages/wisdom.astro`

---

## 3. Nav label "Wisdom"

**Context.** The main navigation currently includes a "Wisdom" label
(src/components/Navigation.astro, approximately line 10). The label carries a mild guru
register. The service pages and bio explicitly disclaim guru positioning. Several common
alternatives are more neutral and more descriptive.

**Options.**

- **A. Keep "Wisdom"** - familiar to the existing audience, no disruption.
- **B. Rename to "Writing"** - neutral, honest, accurate.
- **C. Rename to "Essays and Guides"** - most descriptive; slightly long for a nav item.

**Recommendation:** Option B, "Writing". It is honest about what the section contains,
avoids the register problem, and reads cleanly in the nav bar.

**What is needed from Michael:** A single yes/no on renaming to "Writing", or a preferred
alternative.

**Files affected:** `src/components/Navigation.astro`, `src/components/Footer.astro`,
`src/pages/wisdom.astro` (PageHeader and page title), and the BaseLayout breadcrumb trail
on individual essay pages.

---

## 4. Parent offer ladder on /mentoring-for-adolescents

**Context.** Every audience on the site can book a free 15-minute fit call before spending
money. The exception is parents enquiring about the adolescent mentorship: the first step
currently offered to them is a paid R600 45-minute parent consultation. This inconsistency
may create friction or appear less accessible than the other offers.

**Options.**

- **A. Keep R600 as the first step.** The paid entry acts as a filter, signalling that the
  work is substantive and attracting families who are genuinely committed.
- **B. Add a free 15-minute parent fit call as a lower rung,** keeping the R600 consultation
  as step two for those who want to go deeper after the initial conversation. Requires a new
  Cal.com event type to be created.
- **C. Make the R600 consultation free.** Lower barrier; changes the economics.

**Recommendation:** Option B - add the free fit-call rung, keep R600 as step two.

**What is needed from Michael:** Decision on which option, and if B, creation of a new
Cal.com event type for the parent fit call.

**Files affected:** `src/pages/mentoring-for-adolescents.astro`

---

## 5. Mentorship taxonomy naming

**Context.** The current naming is inconsistent across the site. The nav dropdown reads
"Mentoring for Teenagers"; the page title reads "Mentoring for Young Men Aged 12 to 17"; the
URL is `/mentoring-for-adolescents`. The sibling offer uses "Mentoring for Young Men" (18-25)
in both the nav and the page. This inconsistency creates confusion and risks mismatched
expectations.

**Proposed unified taxonomy (for discussion):**
- 12-17 age group: "Teen Mentorship (12-17)" everywhere
- 18-25 age group: "Mentoring for Young Men (18-25)" everywhere

**Every location that would need updating:**
- `src/components/Navigation.astro` - `counsellingSubItems` array (approximately lines 14-19)
- Page titles in `src/pages/mentoring-for-adolescents.astro` and
  `src/pages/mentoring-for-young-men.astro`
- The two-card split on `src/pages/counselling.astro`
- The audience router cards on `src/pages/index.astro`
- The contact-form enquiry options in `src/pages/contact.astro`

**Recommendation:** Agree on one label pair and update all locations in a single pass to
avoid further drift.

**What is needed from Michael:** Preferred label for the 12-17 group ("Teen Mentorship",
"Mentoring for Adolescents", "Mentoring for Teenagers", or another).

---

## 6. Testimonials and proof

**Context.** The site already carries strong testimonials (Bernard Altman's professional
reference, Jacob S., Vera, Ashraf), but they are character references rather than outcome
stories, and key voices are missing. This is the single highest-impact trust gap identified
in the audit. Three specific additions are needed: one parent testimonial for the adolescents
page, one adult counselling outcome testimonial for `/counselling`, and ideally one
practice-difficulty story for `/counselling-for-meditators`. The testimonial sections already
exist, so each new quote slots into a designed layout.

**Options.**

- **A. Reach out to past clients directly,** using the consent-request template below.
- **B. Wait until testimonials arise organically** from future clients.

**Recommendation:** Option A, starting with parents from the adolescent mentorship work as
they are likely the most willing to speak briefly and publicly.

**Consent-request email template** (for Michael to adapt and send):

> Subject: A small favour - a few words about our work together
>
> Hi [Name],
>
> I hope you are well. I am putting together a small section on the website where I hope to
> include a line or two from people who have worked with me, so that others can get a sense
> of what the process is actually like.
>
> If you felt the work was useful, I would be grateful if you would be willing to share a
> sentence or two - honestly and in your own words. There is no expectation at all, and no
> pressure.
>
> A few things worth knowing: I would show you exactly what would appear on the site before
> publishing anything. You can be fully anonymous (for example, I could attribute it simply
> as "Mother of a 15-year-old, Cape Town"). You can withdraw permission at any time.
>
> If you would rather not, please just ignore this message. I understand completely.
>
> With thanks,
> Michael

**What is needed from Michael:** Willingness to send the request, and final approval of any
testimonial copy before it is published.

**Files affected:** `src/pages/counselling.astro`, `src/pages/mentoring-for-adolescents.astro`,
`src/components/CounsellingForMeditatorsPage.astro`

---

## 7. Intro video

**Context.** No video currently exists on the site. A short, honest video on `/counselling`
and the adolescents page would address the single most common barrier for new clients: not
knowing who they are talking to. Phone with a window for natural light is sufficient.

**Recommended length:** 60-90 seconds.

**Script outline** (Michael to write in his own voice using this as a scaffold):

1. Greeting and who this is for (one or two sentences, direct).
2. What a first conversation is actually like (not a sales pitch; a plain description).
3. Scope honesty - one sentence on what this is and what it is not.
4. How to take the first step (mention the free fit call by name).

**Recommendation:** Record a single version for `/counselling` first. If it feels useful,
adapt a second version for the adolescents/parent audience.

**What is needed from Michael:** The recording itself.

**Files affected:** `src/pages/counselling.astro`, `src/pages/mentoring-for-adolescents.astro`

---

## 8. Canonical fact sheet - experience claims

**Context.** The site states Michael's experience differently in different places:
"more than twelve years" appears on the About page and the adolescents page; "10+ years"
appears on credibility strips on the meditators and young-men pages; "more than a decade"
and "more than eight years of contemplative practice" appear on the meditators page.
These variations are not necessarily errors, but they create an inconsistent impression.
They have deliberately NOT been harmonised autonomously because biography claims are
founder-owned.

**Template for Michael to fill in:**

| Claim | Canonical value | Pages where it currently appears |
| --- | --- | --- |
| Years in practice (counselling/wellness work) | ? | About, adolescents page, young-men page, meditators page |
| Years of contemplative practice | ? | Meditators page |
| Any other experience claims | ? | To be identified |

**Recommendation:** Agree on one number per claim and update all pages in a single pass.

**What is needed from Michael:** The canonical values.

**Files affected:** `src/pages/about.astro`, `src/pages/mentoring-for-adolescents.astro`,
`src/pages/mentoring-for-young-men.astro`, `src/components/CounsellingForMeditatorsPage.astro`

---

## 9. Workshops page honesty line

**Context.** If no public workshops are currently scheduled, the workshops page should say
so plainly. This cannot be added autonomously because only Michael knows the current state
of his calendar.

**Proposed copy (if no workshops are scheduled):**
"No public workshops are currently scheduled. Join the list to hear first."

**What is needed from Michael:** Confirmation of whether workshops are currently scheduled
or not.

**Files affected:** `src/pages/workshops.astro`

---

## 10. /c4m-2 route retirement

**Context.** `/c4m-2` is a thin wrapper that mirrors the content of
`/counselling-for-meditators` (both routes render the shared
`src/components/CounsellingForMeditatorsPage.astro`), created for a specific ad campaign.
It is excluded from the sitemap, its canonical tag points at the main page, and a `/c4m`
safety redirect exists in `vercel.json` pointing to `/c4m-2` in case the ads were set up
with the shorter URL. As an orphan route it adds low-level maintenance overhead.

**Options.**

- **A. Leave it in place** until the campaign definitively ends.
- **B. Confirm which URL the ads currently use,** and delete `/c4m-2` as soon as the
  campaign ends or if the ads are already pointing at the canonical URL.

**Recommendation:** Option B. Confirm the live ad URL now; schedule deletion for when the
campaign wraps.

**What is needed from Michael:** Confirmation of which URL is in active ad use.

**Files affected:** `src/pages/c4m-2.astro`

---

## 11. Counselling page email-capture placement

**Context.** The "send me a plain-language overview" email-capture element currently sits
inside the five-session offer block on `/counselling`, where it competes visually with the
primary booking CTA. The audit recommends moving it to below the FAQ section, where it can
serve visitors who have read everything but are not yet ready to book.

**Options.**

- **A. Move it below the FAQ** (audit recommendation; low risk).
- **B. Leave it in its current position.**

**Recommendation:** Option A, but flagged here rather than implemented because it is a
visible change to a primary conversion page.

**What is needed from Michael:** A yes or no.

**Files affected:** `src/pages/counselling.astro`

---

## 12. Homepage "Environment and Awareness" section

**Context.** The homepage contains a full-bleed photo-quote section titled "Environment and
Awareness" (src/pages/index.astro, approximately lines 445-481) that discusses the nervous
system, modern disconnection from natural environments, and sensory rhythms. The audit found
it the vaguest section on the page; its CTA points to `/workshops`, which may have no
scheduled dates (see item 9).

**Options.**

- **A. Cut the section entirely.** It is preserved in git history and can be restored.
- **B. Halve it** - keep the first paragraph and remove the CTA until workshops are scheduled.
- **C. Leave it.**

**Recommendation:** Option A. The section does not advance any conversion goal, and the
workshops CTA leads nowhere useful if the calendar is empty.

**What is needed from Michael:** Approval to remove (or a clear instruction to keep).

**Files affected:** `src/pages/index.astro`

---

## 13. Vercel trailing-slash enforcement

**Context.** Canonical URLs and hreflang tags now consistently use trailing slashes
throughout the site, matching Astro's default sitemap output. However, both `/page/` and
`/page` currently resolve to a 200 response on Vercel, meaning two URLs serve identical
content.

**Options.**

- **A. Add `"trailingSlash": true` to `vercel.json`** to issue 308 redirects from
  non-slash to slash URLs. This enforces a single canonical form and eliminates the
  duplication.
- **B. Leave as-is.** The risk is low; search engines generally resolve this correctly, and
  no redirect hop is introduced for inbound links that omit the slash.

**Recommendation:** Option A is technically correct but low priority. Defer until there is a
reason to touch `vercel.json` for another purpose.

**Files affected:** `vercel.json`

---

## 14. CTA label unification and meditators fit-call length

**Context.** Most pages now use "fit call" language for the free 15-minute introductory
booking. The meditators page deliberately uses "Book an Introductory Conversation" to match
that audience's register, and was left untouched in the June 2026 pass. The meditators page
also describes the introductory conversation as "unhurried", which may set an expectation
that 15 minutes does not fully meet.

**Options for the label:**

- **A. Keep audience-specific label** on the meditators page; standardise everywhere else.
- **B. Standardise the label across all pages.**

**Options for the slot length (meditators page only):**

- **A. Keep 15 minutes** - consistent with all other audiences.
- **B. Extend to 20 or 30 minutes** for the meditators audience, reflecting the "unhurried"
  language on the page. Requires a new Cal.com event type.

**Recommendation:** Keep the audience-specific CTA label (option A for labels); on the slot
length, Michael should decide based on how these calls actually run in practice.

**What is needed from Michael:** Confirmation on the slot length.

**Files affected:** `src/components/CounsellingForMeditatorsPage.astro`

---

## 15. USD display policy

**Context.** Pricing in South African Rand is shown across the site with USD approximations
for international visitors. The USD figure for R850 was previously inconsistent (some pages
showed $45, others $50). The June 2026 pass standardised it to "approximately $45-50 USD"
throughout.

**Options.**

- **A. Keep the range** ("approximately $45-50 USD") - honest about exchange-rate variation.
- **B. Fix a single USD figure and commit to reviewing it quarterly** - cleaner but requires
  maintenance.
- **C. Remove USD mentions except on pages explicitly targeting international visitors.**

**Recommendation:** Option A in the short term. Revisit if the Rand fluctuates significantly.

**What is needed from Michael:** Preference for A, B, or C; and if B, the chosen figure.

**Files affected:** `src/pages/counselling.astro`, `src/components/CounsellingForMeditatorsPage.astro`,
`src/pages/mentoring-for-young-men.astro`, possibly others.
