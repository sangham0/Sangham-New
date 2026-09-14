# Organisational counselling pages

Two pages address organisations rather than individuals:

| Route | Audience | Source of truth |
| --- | --- | --- |
| `/counselling/community-organisations/` | NGOs, NPOs, clinics, shelters, recovery services, community programmes | `public/downloads/sangham-reflective-group-counselling-programme.pdf` |
| `/counselling/workplace-wellbeing/` | Employers funding counselling and workplace support for staff | `public/downloads/sangham-corporate-counselling-workplace-wellbeing.pdf` |

Each page links its own proposal as a download, so the PDF a visitor receives
is the same document the page was written from.

## Changing the corporate rates

The published rates on `/counselling/workplace-wellbeing/` are quoted from the
2026 partnership proposal. They live in the `fees` array at the top of
`src/pages/counselling/workplace-wellbeing.astro`, and again in that page's
`Service` JSON-LD `offers`. Both need updating together, along with the
proposal PDF itself.

`npm test` asserts every figure is still present in the built page, so a rate
that is edited in one place and forgotten in another fails the build check
rather than shipping quietly.

## The pro-bono pilot

The community page offers a limited number of complete programmes at no cost.
The limit is the point: it is a pilot, not an open-ended free service, and the
wording should stay qualified. `npm test` checks that the "limited number"
phrasing survives edits.

When the pilot closes, the section with `id="pro-bono"` and the hero note under
the call to action are the two places to revise, plus the "What does it cost?"
FAQ answer.

## Imagery

Both pages draw only on existing Sangham photography. No stock imagery was
added.

The community page uses two photographs of real Sangham group sessions in Cape
Town (`sangham-circle.jpg`, `workshop-capetown-circle.png`), captioned as
shared with the participants' permission. Nothing on the page depicts the
populations a host organisation serves, which is deliberate: participants in a
shelter, clinic or recovery programme are not a marketing asset, and a
photograph of them would be the wrong way to describe this work.

The landscape dividers reuse images already in `src/assets/`. The community
page's first divider (`golden-savanna.jpg`, in fact a Cape Town suburb at dusk)
was chosen because it shows the kind of setting these programmes actually run
in.

## Contact pathway

Neither page routes to the Cal.com fit-call calendar, which is the individual
counselling pathway. Both lead with a prefilled email to `michael@sangham.org`,
with WhatsApp as the second route. The primary action carries
`data-cta="organisation-enquiry"`, which `src/scripts/analytics.ts` pushes to
the dataLayer as `organisation_enquiry_click`.

`CtaPair` takes the label, target, analytics identifier and channel of its
primary action as props so these pages reuse it rather than duplicating the
layout. Its defaults are unchanged, so the fit-call pages are unaffected.
