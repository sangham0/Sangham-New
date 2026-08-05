# Testimonials

Every reflection published on the site lives in `src/content/testimonials/`, one markdown
file per person. Nothing is hardcoded into a page any more. Adding a file publishes the
person on `/testimonials`; service pages pull the same wording by id, so a page can no
longer carry a private, drifting copy of someone's words.

The schema lives in `src/content.config.ts`. The read helpers live in
`src/data/testimonials.ts`.

---

## Adding a new testimonial

1. **Get written permission first.** No file is created before the person has seen the
   exact wording that will appear and agreed to it. Leave `permission: pending` until you
   have that, and nothing renders.

2. **Create `src/content/testimonials/<id>.md`.** The filename is the internal id and is
   how pages refer to the person. Use a lowercase, hyphenated name (`francis.md`,
   `counselling-client-india.md`).

3. **Put the full approved text in the markdown body.** Verbatim. This is the canonical
   record, and it is what the featured story and the full-letter view render.

4. **Fill in the frontmatter.** Fields are documented in `src/content.config.ts`; the ones
   that decide where a person appears are:

   | Field | What it does |
   | --- | --- |
   | `category` | Which section of `/testimonials` they land in. One of `individual-work`, `workshops`, `community`, `professional-reference`. |
   | `excerpt` | Array of paragraphs. This is what service-page cards render, so keep it to the part of the reflection that suits the page it will appear on. |
   | `cardQuote` | One condensed paragraph, for compact three-up grids. |
   | `pullQuote` | One passage, for inline editorial pull-quotes. |
   | `featured` | Opens `/testimonials` as a long-form story rather than a card. Only one person should carry this. |
   | `permission` | `granted` publishes. `pending` withholds from the build entirely. |
   | `order` | Sort position inside the category. Lower first. |

5. **Add the portrait** to `src/assets/` and reference it relatively
   (`../../assets/name-portrait.jpg`). Set `portraitPosition` to a CSS `object-position`
   value that keeps the face well placed in a tall crop. Check it at 320px wide, not just
   on desktop.

6. **Run `npm run build && npm test`.** The QA script checks internal links and rejects em
   dashes across `src/` and `docs/`.

That is all. `/testimonials` picks the person up automatically.

---

## The two testimonials that are expected but not yet supplied

Two people may send material. **Neither exists in the repository, and neither should be
invented, drafted, or approximated in the meantime.** No placeholder card, no "coming
soon" line, no representative quote.

### Adult counselling client

A woman in India who has worked with Michael through counselling. When her approved
wording and her decision about naming arrive:

- Create `src/content/testimonials/<id>.md`.
- Set `category: individual-work`. She will appear alongside Jacob and the anonymous
  parent, under the heading "Individual work and mentorship".
- If she prefers not to be named, set `anonymous: true`, omit `portrait`, and keep `name`
  and `attribution` at a level that cannot identify her. She then renders in the centred,
  portrait-free layout the anonymous parent uses, and is excluded from the page's
  schema.org markup automatically.
- Do not publish her age, her city, or the fact that she lives in India unless that
  appears in the attribution she herself approved.

### Francis

A woman who participated in a workshop. When her approved wording arrives:

- Create `src/content/testimonials/francis.md`.
- Set `category: workshops`. She will appear alongside Vera under "Workshops and group
  experiences".
- Do not publish her age or nationality unless her approved attribution includes them.

---

## Rules that are not negotiable

**Voices stay distinct.** Do not edit reflections into a house style. They were written by
different people and should still sound like it. Light correction of grammar, spelling, or
punctuation is fine. Rewriting into marketing copy is not.

**Claims stay where the writer left them.** Never sharpen a statement, never generalise one
person's experience into an outcome others can expect, and never add language about
healing, safety, efficacy, or clinical benefit that the writer did not use.

**Anonymity is permanent.** The parent testimonial stays anonymous. Do not add a name, a
portrait, the son's name or age, a school, or a location, in the content file or in
anything that renders from it.

**Internal fields never reach the page.** `sourceNote` and `sensitivityNote` are editorial
notes for whoever maintains this content. Nothing renders them, and nothing should. Do not
put a client's private details in them either; keep them to provenance and handling.

**Medical framing.** Saffron's reflection describes her father, who lives with Parkinson's
disease. It publishes only with its `contextNote`, which states plainly that the workshops
are not medical treatment and that nothing in her account is a claim about what meditation
does to Parkinson's. Her `excerpt` fields deliberately carry only the group-process and
yoga paragraphs, so that a page reusing them cannot reproduce the medical material without
the framing. If a future reflection touches health, do the same: keep the clinical material
on `/testimonials` behind a `contextNote`, and let the excerpt carry the rest.

**No invented proof.** No star ratings, no aggregate scores, no counts of clients served,
no outcome statistics. The schema.org markup emitted from `src/data/testimonials.ts`
carries no `reviewRating` and no `aggregateRating`, and it should stay that way.

---

## Where each current reflection came from

| Id | Source of the canonical wording |
| --- | --- |
| `saffron` | Written testimonial supplied August 2026. Verbatim. |
| `bernard-altman` | Full reference letter supplied August 2026. Verbatim. Earlier on-site versions were excerpts of it. |
| `antony-s` | Recovered from git history. Live from commit `57300ba` until `1b29f6e` replaced the slot. |
| `jacob-s` | The fuller of the two versions that were live, from `/counselling` and `/mentoring-for-young-men`. |
| `parent-mentoring` | `/mentoring-for-adolescents` testimonial carousel. |
| `vera` | `/counselling-for-meditators` reflections grid. |
| `ashraf-vahed` | `/counselling-for-meditators` reflections grid. |

---

## Pages that read from this collection

| Page | Reads |
| --- | --- |
| `/testimonials` | All of them. Adding a file changes this page with no code edit. |
| `/counselling` | `bernard-altman`, `jacob-s` |
| `/counselling-for-meditators` | `vera`, `ashraf-vahed`, `bernard-altman` |
| `/mentoring-for-young-men` | `jacob-s`, `bernard-altman` |
| `/mentoring-for-adolescents` | `jacob-s`, `parent-mentoring`, `bernard-altman` |
| `/about` | `bernard-altman` |
| `/workshops` | `saffron`, `vera` |

`getPublishedTestimonial(id)` throws at build time if an id is unknown or the person has
not granted permission. A quote can therefore never disappear from a page silently, and a
withheld testimonial can never leak early.
