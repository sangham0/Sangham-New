# Google Ads Pilot — As-Built Record

**Built:** 24 August 2026, via the AdKit MCP against Google Ads account `8863324078`
("Sangham Counselling").
**Source of truth for intent:** the 2026 Google Ads Campaign Playbook and the Editor
Build Workbook.
**Current state:** everything built, **all four campaigns paused**. Nothing can spend
until a campaign is switched on.

---

## 1. What exists in the account now

### Campaigns

| Campaign | ID | Daily budget | Max CPC | Geo | Status |
|---|---|---|---|---|---|
| `ZA \| Search \| Adult Counselling \| Leads` | `24167884764` | €2.67 | €2.40 | South Africa | Paused |
| `ZA \| Search \| Teen Boys \| Parent Leads` | `24167884539` | €1.07 | €1.87 | South Africa | Paused |
| `ZA \| Search \| Young Men 18-25 \| Leads` | `24178659550` | €0.71 | €1.60 | South Africa | Paused |
| `INT \| Search \| Meditation Integration \| Leads` | `24178659577` | €1.78 | €2.40 | UK, AU, CA | Paused |

Shared across all four: Search network only, **Search Partners off**, **Display
Network off**, Maximize Clicks (`target_spend`) with a CPC ceiling, **Presence**
location targeting, no audiences of any kind, end date **2026-09-30**.

### Ad groups

| Ad group | ID | Campaign |
|---|---|---|
| Online Counsellor | `200262663740` | Adult |
| Specialist Wellness | `203119773561` | Adult |
| Teen Counselling | `198238421694` | Teen Boys |
| Mentor For Son | `205165199168` | Teen Boys |
| Young Men Mentoring | `199831381095` | Young Men |
| Spiritual Emergence | `199040240586` | International |
| Kundalini Integration | `199831381895` | International |

### Keywords, negatives, ads, assets

- **58 keywords**, every one exact or phrase. No broad match anywhere.
- **Shared negative list** `Sangham - Shared Mismatch` (ID `12205881133`), 59 phrase
  negatives, attached to all four campaigns.
- **38 campaign-level negatives** on top of the shared list.
- **7 responsive search ads**, 15 headlines and 4 descriptions each, all within
  Google's character limits, no pinning, no keyword insertion.
- **4 sitelinks** and **6 callouts**, attached per the workbook's scope rules
  (Parent Consultation on the teen campaign only; Free 15-Min Fit Call on every
  campaign *except* teen).

### Conversion actions created

None of these existed before. All are **web** conversions counted **once**, 30-day
click window, and **none will record anything until the GTM tags are built**.

| Name | ID | Category | Role |
|---|---|---|---|
| `fit_call_booked` | `7731686855` | Book appointment | **Primary** |
| `parental_consultation_booked` | `7731686633` | Book appointment | **Primary** |
| `written_enquiry_success` | `7731687359` | Submit lead form | **Primary** |
| `cal_booking_initiated` | `7731917254` | Begin checkout | Secondary |
| `fit_call_cta_click` | `7731910719` | Default | Secondary |
| `parent_consultation_cta_click` | `7731917485` | Default | Secondary |

Campaign optimisation is bound to **exact conversion IDs**, not goal categories, so
the pre-existing `Suggested Goal` and `Lead form - Submit` conversions cannot leak
into bidding:

- Adult / Young Men / International → `fit_call_booked` + `written_enquiry_success`
- Teen Boys → `parental_consultation_booked` + `written_enquiry_success`

### Landing pages

| Campaign | Final URL |
|---|---|
| Adult | `https://www.sangham.org/online-counselling-south-africa/` (existing) |
| Teen Boys | `https://www.sangham.org/online-support-teenage-boys-south-africa/` (**new**) |
| Young Men | `https://www.sangham.org/online-counselling-young-men-south-africa/` (**new**) |
| International | `https://www.sangham.org/meditation-integration-support/` (**new**) |

---

## 2. Deviations from the workbook, and why

| # | Workbook says | Built as | Reason |
|---|---|---|---|
| 1 | Budgets in ZAR (R3,500 total) | EUR (€187 total) | **The Ads account is denominated in EUR, not ZAR.** Converted at the playbook's own rate, 1 EUR = R18.7236. The rand amounts are unchanged in substance. |
| 2 | 30-day *total* campaign budget | Daily budget + end date 2026-09-30 | AdKit exposes only daily budgets. Daily × the date window reproduces the cap, and an end date fails safe: the campaign stops rather than running on unnoticed. **Reset this date to launch day + 30 when you enable.** |
| 3 | `{_campaign}` custom parameter in the URL suffix | Literal values (`za_adult_counselling`, etc.) | Identical result in the analytics, one fewer moving part. Suffixes are otherwise verbatim from the workbook. |
| 4 | Teen final URL `/mentoring-for-adolescents/` | `/online-support-teenage-boys-south-africa/` | The playbook's own Prompt B asks for exactly this shorter parent-facing page, and its landing-page audit flags the adolescent page as "Ready, but long". The workbook predates the page existing. |
| 5 | Young-men final URL `/mentoring-for-young-men/` | `/online-counselling-young-men-south-africa/` | Prompt D asks for a first-fold rewrite of the existing page. Instruction was to change nothing already live, so the improvement ships as a separate ad-only page and the original is untouched. |
| 6 | Final URLs on `sangham.org` | `www.sangham.org` | `vercel.json` 308-redirects apex to www. Pointing at www removes a redirect hop on every paid click. |
| 7 | Keywords and ads imported `Paused` | Imported **enabled** | That status is an Editor-import artifact. The campaign pause is the real safety gate, and this way going live is one switch per campaign rather than 65 individual toggles. |

---

## 3. Things that could not be set through the API

Four items, all quick in the Google Ads UI.

1. **Teen campaign age exclusion.** The playbook asks for ages 25–64, 65+ and Unknown
   included and **18–24 excluded**, as a parent-intent filter. AdKit exposes no
   demographic criteria for Search ad groups. Set manually on both teen ad groups.
2. **CPC ceiling verification.** The ceilings were set through a raw-field override
   that the API accepted but does not read back in AdKit's normalised view. Confirm
   the four values in the UI before enabling: €2.40 / €1.87 / €1.60 / €2.40.
3. **Auto-apply recommendations.** Must be disabled manually — especially the
   automatic broad-match, bidding and network suggestions. Google will otherwise
   quietly undo several of the pilot's core constraints.
4. **Account time zone and currency.** The account is **EUR**. The playbook assumed
   ZAR and a Johannesburg time zone. Currency and time zone cannot be changed on an
   existing serving account, so either accept EUR reporting (fine — this record and
   the ads are consistent in EUR) or create a fresh ZAR/Johannesburg account and
   rebuild. **Do not** start spending and then decide to migrate.

---

## 4. Keywords held for policy review

Google flagged four keywords under `HEALTH_IN_PERSONALIZED_ADS` — its "Health in
personalized advertising" policy, which restricts audience targeting built on
sensitive health information:

- `teenager counselling near me` (exact and phrase)
- `counseling for meditators` (exact and phrase)

All four were **exemptible**, and an exemption was requested and accepted, so they are
live in the account. The exemption is factually correct: the pilot uses no audiences,
no Customer Match, no remarketing and no lookalikes of any kind — targeting is
keywords and location only, exactly as the playbook requires. If Google reverses the
exemption later, remove the four keywords rather than appealing repeatedly.

---

## 5. Before you enable anything

The conversion actions exist but **fire nothing**. The GTM work is the gate.

### Tracking (blocking)

- [ ] In GTM, confirm one Google tag and one Conversion Linker fire on all pages,
      respecting the existing Consent Mode configuration.
- [ ] Build a Google Ads Conversion Tracking tag for each of the three primary
      actions, using its Conversion ID and Label from the Ads UI and a Custom Event
      trigger matching the site's dataLayer event name exactly:
      `fit_call_booked`, `parental_consultation_booked`, `written_enquiry_success`.
- [ ] Add the three secondary tags as observation only. **Do not** let click events
      into any campaign's bidding goal.
- [ ] In GTM Preview, complete a **real** fit-call booking, parent-consultation
      booking and written enquiry. Confirm one — and only one — conversion tag fires
      per success.
- [ ] Publish the container, then confirm receipt in Google Ads conversion
      diagnostics.

### Account settings (blocking)

- [ ] Enable auto-tagging.
- [ ] Disable auto-apply recommendations.
- [ ] Set the teen age exclusion (18–24).
- [ ] Verify the four CPC ceilings.
- [ ] Reset each campaign's end date to launch day + 30.
- [ ] Complete billing and advertiser verification if not already done.

### Final check (blocking)

- [ ] Every final URL opens, loads the right page, and preserves query parameters.
- [ ] Ad Preview and Diagnosis shows the ads eligible. Do **not** search Google
      manually — it distorts data and creates impressions.
- [ ] Confirm no ad copy says psychologist, psychotherapy, clinical therapy, treatment
      or cure.

Only then: enable **the adult campaign alone**. Leave the other three paused for the
first week. It is the only campaign with a non-zero click forecast, and running it
alone makes the first week's data readable.

---

## 6. What success looks like

From the playbook, unchanged:

- **Lead CPA ceiling: R400** (= R1,000 client CAC × 40% assumed lead-to-client rate).
- **First-month target: 2+ qualified leads and 1+ new client.** Not 20 clients.
- **Pause a campaign** at R1,000 spend with no qualified lead, or 50 clicks with no
  primary lead.
- **Scale** only after 10+ verified primary conversions, and then by no more than 20%
  at a time.
- **Stop for capacity** once the new-client places are filled.

Judge on qualified-lead CPA and client CAC reconciled against Cal.com and Formspree.
Not on clicks, not on CTR, and not on Ad Strength.
