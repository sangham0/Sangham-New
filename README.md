# Sangham.org

Sangham.org is the public platform of Michael Kaplan (Swami Ramarishi), an ASCHP-registered
Wellness Counsellor (Reg. No. 10559, South Africa). The site presents four offers: online
counselling for adults, counselling specifically for meditators and contemplative practitioners,
mentorship for young men aged 18-25, and parent-facing mentorship for adolescent boys aged 12-17.
It is a static site with no server-side logic; all dynamic behaviour (booking, forms, analytics)
is handled by third-party embeds.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Astro 6 (static output) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` (no PostCSS config) |
| Carousels | Swiper |
| OG image generation | Node script using `sharp` |
| Booking | Cal.com inline embed (event `sangham/fit`, free 15-minute fit call) |
| Contact forms | Formspree (`https://formspree.io/f/mojpzywj`) |
| Analytics | Google Tag Manager (GTM-M6SVCRV8) with Google Consent Mode v2 |
| Hosting | Vercel, project name `sangham-new` |
| Primary domain | `https://www.sangham.org` (apex redirects to www via `vercel.json`) |

---

## Commands

Run all commands from the project root.

```sh
npm install                        # install dependencies
npm run dev                        # local dev server at localhost:4321
npm run build                      # production build to ./dist/
npm run preview                    # preview the build locally
node scripts/generate-og-images.mjs  # regenerate social preview images (1200x630 JPEGs -> public/images/)
```

---

## Project structure

```
/
├── astro.config.mjs           # Astro config: site URL, Tailwind vite plugin, sitemap integration
├── vercel.json                # Apex-to-www redirect, legacy URL redirect, security headers
├── scripts/
│   └── generate-og-images.mjs  # sharp-based OG image generator
├── public/
│   └── images/                # OG images and other static assets served as-is
├── docs/
│   ├── DECISIONS.md           # Open founder decisions (not implemented)
│   ├── TODO.md                # Implementation backlog
│   └── counselling-for-meditators-copy.md  # Canonical copy doc for that page
└── src/
    ├── assets/                # Images processed via astro:assets (import + <Image />)
    ├── components/
    │   ├── Navigation.astro
    │   ├── Footer.astro
    │   ├── FAQ.astro
    │   ├── CalEmbed.astro
    │   ├── StickyConsultationCTA.astro
    │   ├── PageHeader.astro
    │   ├── ArticleBadge.astro
    │   └── CounsellingForMeditatorsPage.astro  # Full meditators page; rendered by two routes
    ├── data/
    │   ├── essays.ts          # Essay metadata + body as TypeScript arrays
    │   └── practice-guides.ts # Practice guide metadata + body as TypeScript arrays
    ├── layouts/
    │   └── BaseLayout.astro   # Meta tags, OG, JSON-LD, GTM snippet, consent layer
    ├── pages/
    │   ├── index.astro                         # Homepage
    │   ├── about.astro
    │   ├── counselling.astro                   # Main counselling offer
    │   ├── counselling-for-meditators.astro    # Thin wrapper; edit the component instead
    │   ├── online-counselling-south-africa.astro  # SEO landing page (hreflang pair with /counselling)
    │   ├── mentoring-for-adolescents.astro
    │   ├── mentoring-for-young-men.astro
    │   ├── practices.astro
    │   ├── workshops.astro
    │   ├── wisdom.astro                        # Wisdom/essay index
    │   ├── wisdom/
    │   │   ├── [id].astro                      # Dynamic route for essays + practice guides
    │   │   ├── kings-and-queens.astro          # Standalone essay (excluded from [id] route)
    │   │   ├── authenticity-as-a-mask.astro    # Standalone essay (excluded from [id] route)
    │   │   └── the-art-of-becoming-invisible.astro  # Standalone essay (excluded from [id] route)
    │   ├── contact.astro
    │   ├── scope.astro
    │   ├── privacy.astro
    │   ├── thank-you-consultation.astro        # Post-form confirmation (excluded from sitemap)
    │   └── c4m-2.astro                        # Ad campaign mirror of /counselling-for-meditators (excluded from sitemap)
    ├── content.config.ts      # Astro content collection definition (currently unused; only example.md)
    ├── scripts/
    │   └── analytics.ts       # dataLayer event helpers; `data-cta` attribute tracking; `fit_call_booked` event
    └── styles/
        └── global.css         # Tailwind v4 @theme design tokens (colours, fonts, spacing)
```

### BaseLayout note

Pass page titles **without** the `| Sangham` suffix. The layout appends it automatically.
For example: `title="Online Counselling"` renders as `Online Counselling | Sangham`.

---

## SEO notes

- **Sitemap** is configured in `astro.config.mjs` with priority tiers; utility and ad-campaign
  routes (`/c4m-2`, `/thank-you-consultation`) and the legacy adolescents URL are excluded or
  handled via redirect.
- **Canonical URLs** use trailing slashes throughout, matching the sitemap output.
- **hreflang** pair: `/counselling` and `/online-counselling-south-africa` reference each other
  as `en-ZA` and `en` alternates.
- **Redirects** live in `vercel.json`: apex domain redirects to www (permanent); the legacy
  `/counselling-for-adolescents-and-young-adults` URL redirects permanently to
  `/mentoring-for-young-men`; a temporary `/c4m` safety redirect points to `/c4m-2`.
- **JSON-LD**: `BaseLayout.astro` injects the site-wide Organization schema; pages pass
  additional schemas (Service, FAQPage, Article) via the `jsonLd` prop.

---

## Copy conventions

These apply to all site copy and AI-assisted edits. When in doubt, read an existing service page
before writing anything new.

- **British spelling** throughout (counselling, recognise, honour, practitioner, etc.).
- **No em-dashes** in body copy. Use a comma, a full stop, or a middle dot (·) instead.
- **Register:** calm, precise, non-salesy. Avoid hype words (transformative, journey,
  life-changing). The work is described plainly; the reader is treated as intelligent.
- **Scope and ethics honesty is a brand pillar.** Never weaken, soften, or elide disclaimers
  about what the work is not. This is non-negotiable.
- **Biography and credential claims** must already appear on the live site or be explicitly
  approved by Michael before being added anywhere.
- **Pricing** (do not change without instruction):
  - R850 per session (approximately $45-50 USD)
  - R3,400 for a five-session process
  - R600 parent consultation (approximately $35 USD)
- **Decorative images** use empty `alt=""` attributes.
- **Body text opacity** should not go below approximately 55% on dark backgrounds, or 60%
  on light backgrounds, to maintain readability.

---

## Deployment

- **Vercel project:** `sangham-new`
- **Production branch:** `main`
- **Primary domain:** `www.sangham.org`
- Pushing to `main` triggers an automatic Vercel deployment. No build command override is
  needed; Vercel detects Astro and runs `npm run build`.

---

## Further reading

- `docs/DECISIONS.md` - open founder decisions that have not been implemented; read before
  touching homepage hero, nav labels, pricing ladders, or testimonials.
- `docs/TODO.md` - implementation backlog for the next engineering passes.
- `docs/counselling-for-meditators-copy.md` - canonical copy document for the meditators
  landing page; use as the source of truth for that page's messaging.
