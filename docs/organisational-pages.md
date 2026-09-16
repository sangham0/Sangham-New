# Organisational counselling pages

Two pages address organisations rather than individuals:

| Route | Audience | Source of truth |
| --- | --- | --- |
| `/counselling/community-organisations/` | NGOs, NPOs, clinics, shelters, recovery services, community programmes | `public/downloads/sangham-reflective-group-counselling-programme.pdf` |
| `/counselling/workplace-wellbeing/` | Employers funding counselling and workplace support for staff | `public/downloads/sangham-corporate-counselling-workplace-wellbeing.pdf` |

Neither page offers its proposal as a public download. The proposals are
follow-up material, sent directly after an enquiry or a first conversation, and
they live in `docs/proposals/` rather than under `public/`, so nothing serves
them. `npm test` asserts both that neither page links one and that neither is
present in the build.

The pages are written as first-contact landing pages: enough for an HR lead or
a programme manager to understand the service and judge fit, and not the whole
pitch. Detail that belongs in a proposal or an onboarding conversation, such as
the session-by-session curriculum or the agenda of a first call, was
deliberately taken off them.

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

### Section backgrounds

Both heroes, the dark anchor sections and the closing invitation carry a
landscape photograph under a heavy scrim, in the same idiom `/counselling/`
uses for its approach section: an absolutely positioned `<Image>`, then a scrim
`div`, then the content in a `relative z-10` container.

The scrims are tuned per photograph rather than set once. Dark sections sit at
`bg-cosmos/[0.89]` to `bg-cosmos/[0.90]`, the heroes at `bg-void/[0.90]` and
`bg-void/[0.91]`, and the two closing sections under a cream
`hsl(38 30% 84% / 0.93)`. One is deliberately heavier: `ancient-tree.jpg`
behind "How support works" is a bright photograph whose vertical trunks
competed with the numbered list rules, so it runs at `0.93`.

If you swap one of these photographs, check the result at the section rather
than trusting the number. A brighter or busier image needs a heavier scrim, and
the text on these blocks is the point.

Every section background is decorative: `alt=""` and `aria-hidden="true"`, so
none of them is announced to a screen reader.

## Contact pathway

Neither page routes to the Cal.com fit-call calendar, which is the individual
counselling pathway. Both lead with a prefilled email to `michael@sangham.org`,
with WhatsApp as the second route. The primary action carries
`data-cta="organisation-enquiry"`, which `src/scripts/analytics.ts` pushes to
the dataLayer as `organisation_enquiry_click`.

`CtaPair` takes the label, target, analytics identifier and channel of its
primary action as props so these pages reuse it rather than duplicating the
layout. Its defaults are unchanged, so the fit-call pages are unaffected.

## The enquiry form

`src/components/OrganisationEnquiryForm.astro` sits in the closing section of
both pages, alongside the email and WhatsApp routes rather than replacing them.
It reuses the contact page's infrastructure wholesale: the same Formspree
endpoint, the same `appendAttribution` helper, the same honeypot. There is no
new backend.

Two events come out of it, and the distinction matters:

- `organisation_enquiry_click` is intent. It fires when someone clicks an email
  or WhatsApp call to action. The form's submit button deliberately carries no
  `data-cta`, so a submission is not also counted as a click.
- `organisation_enquiry_submitted` fires only after Formspree returns a 2xx. A
  failure emits `organisation_enquiry_failure` instead and the form stays on
  screen with its values intact. `npm test` asserts that the success event
  cannot be reached before the response is checked.

Both events carry `service`, so `workplace-wellbeing` and `group-programme` are
separable in analytics, and the POST body carries the full first-touch
attribution set including UTMs and advertising click identifiers.

Both routes are also in the `SCROLL_PAGES` list in `src/scripts/analytics.ts`,
so 25/50/75/90 depth events fire on them as they do on the other major
counselling pages.
