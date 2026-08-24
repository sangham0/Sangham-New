# Reddit Ads Strategy — Sangham

**Written:** 24 August 2026
**Status:** build spec, not yet live. Blocked on two AdKit account toggles (see [Blockers](#blockers)).
**Companion to:** the 2026 Google Ads Campaign Playbook and Editor Build Workbook.

---

## 1. Why Reddit, and why it is a different problem to Google

The Google research reached a hard conclusion: South African paid search demand for
online counselling is roughly **27 forecastable clicks a month**. That is a *demand*
ceiling, not a budget ceiling. No amount of money buys a 28th click that nobody
searched for. Google Search therefore tops out at roughly one new client a month, and
the four-campaign pilot is correctly sized at R3,500 to prove or disprove exactly that.

Reddit is the opposite shape of problem. There is no shortage of the right people —
the English-speaking contemplative-practice communities run to hundreds of thousands
of active members, and the general self-understanding communities run to millions.
What is missing is *intent*. Nobody on r/Meditation is searching for a counsellor at
the moment the ad appears. So:

| | Google Search | Reddit |
|---|---|---|
| Constraint | Demand (too few searches) | Intent (wrong moment) |
| Traffic available | ~27 clicks/month, SA | Hundreds to thousands/month |
| Cost per click | R15–60 | R9–22 (est.) |
| Landing-page lead rate | 5–12% | 1.0–2.5% |
| Fixable by spending more | **No** | Yes, if the funnel works |
| Risk | Wasting a small budget | Wasting a larger budget slowly |

The strategic point: **Reddit is the only channel available to Sangham where the
15–20 client target is arithmetically reachable at all.** It is also the channel where
the economics are unproven. That combination argues for a real but disciplined test,
not a cautious one and not an open-ended one.

## 2. The international pricing advantage

This deserves its own section because it is the single strongest asset in the Reddit
case, and it is currently invisible in the marketing.

A Sangham session is **R850**. At the rates used in the playbook that is roughly
**$46 / £34 / €45 / A$70 / C$65**.

Typical local private rates for comparable non-clinical counselling or reflective
practitioner work:

| Market | Typical local rate | Sangham, converted |
|---|---|---|
| United Kingdom | £50–80 | ~£34 |
| Australia | A$120–200 | ~A$70 |
| Canada | C$120–180 | ~C$65 |
| United States | $100–200 | ~$46 |

Sangham is **40–70% below local market** in every English-speaking country, while
offering something most local practitioners cannot: a counsellor with eight-plus years
of serious contemplative practice who can discuss a difficult meditation experience
without either pathologising it or mystifying it.

This is not a discount to apologise for. It is a structural advantage created by
earning in rand and working online. Reddit is the cheapest place to put that in front
of the people it is relevant to, because Google charges £5–15 a click for anything
adjacent to therapy in those markets, and Reddit charges under a dollar.

**Caveat that must be respected:** the offer is non-clinical wellness counselling under
South African ASCHP registration. It is not licensed clinical practice in any of those
countries, and the landing pages say so explicitly. Advertising a *non-clinical*
service internationally is ordinary; advertising it as therapy would not be. Before
scaling international spend, confirm this reading with your own professional body and,
if you want belt and braces, an hour of legal advice. Nothing in this plan asks you to
claim licensure anywhere.

## 3. Honest funnel arithmetic

Three unknowns drive everything. Only the first is well established.

| Variable | Pessimistic | Midpoint | Optimistic | Confidence |
|---|---|---|---|---|
| CPC, niche subreddit targeting | $1.20 | $0.90 | $0.60 | Good — benchmark-backed |
| Landing page → fit call booked | 1.0% | 1.7% | 2.5% | Weak — must be measured |
| Fit call → paying client | 30% | 35% | 40% | Weak — Sangham's own 40% is a search-lead assumption |

Per **$1,000** (≈ R16,000) of Reddit spend:

| | Pessimistic | Midpoint | Optimistic |
|---|---|---|---|
| Clicks | 833 | 1,111 | 1,667 |
| Fit calls booked | 8 | 19 | 42 |
| New clients | 2.5 | 6.6 | 17 |
| **Client CAC** | **R6,400** | **R2,400** | **R960** |

The playbook's client CAC ceiling is **R1,000**. Only the optimistic column clears it.
The midpoint is 2.4× over.

That is not an argument against testing. It is an argument for what the test must be
designed to answer, and in what order:

1. **What is the real CPC?** Answerable with ~$150 of spend. Cheap, fast, decisive.
2. **What is the real landing-page lead rate?** Needs 400–800 clicks to be more than
   noise. This is the variable that decides everything, and it is the one nobody can
   guess.
3. **What is the real close rate on a Reddit lead?** Cannot be answered inside one
   month. Needs ~10 leads to even estimate.

A test that answers (1) and gives a first read on (2) costs roughly **$350–400
(≈ R6,000 / €330)** over three to four weeks. That is the recommended commitment —
and it is a **separate decision from the R3,500 Google authorisation**, not a
reallocation of it.

## 4. What Reddit cannot do at this budget

Stated plainly so it is not discovered expensively later.

- **Do not use the Conversions objective.** Reddit's conversion optimiser needs roughly
  50 conversion events to exit its learning phase. At any plausible Sangham cost per
  lead that is thousands of dollars of spend before the algorithm is even useful. The
  campaign would spend its entire budget learning and never optimise. **Use the Traffic
  objective with CPC bidding**, and treat the landing page and the fit call as the
  conversion mechanism rather than the ad platform.
- **Do not expect the algorithm to find the audience.** At $5–10/day there is not
  enough signal. The targeting has to be right by hand, from the first day.
- **Do not run Awareness/CPM.** It buys impressions, which Sangham cannot bank.
- **Do not judge on CTR.** Reddit CTRs are low and non-click conversions are common.
  Judge on cost per fit call booked, measured at Cal.com, not in Ads Manager.

## 5. Campaign structure

Three campaigns. Total **$18/day ≈ $540/month ≈ R8,650/month**. Run for three to four
weeks, then decide.

### R1 — Meditation Integration · Core Communities

The sharpest intent match available anywhere. These are people who have had the
experience the service exists for.

| Setting | Value |
|---|---|
| Objective | Traffic |
| Bidding | Manual CPC, cap $1.20, lowest-cost strategy for the first 7–14 days |
| Geo | United States, Canada, United Kingdom, Australia, Ireland, New Zealand |
| Targeting | Communities (see list below) |
| Devices | All |
| Landing page | `/counselling-for-meditators/` |
| Daily budget | $8 |
| UTM | `utm_source=reddit&utm_medium=cpc&utm_campaign=reddit_meditation_core&utm_content={{CREATIVE_NAME}}&ref=reddit_ads` |

**Communities — target:**
`r/Meditation` · `r/streamentry` · `r/Kundalini` · `r/spiritualawakening` ·
`r/awakened` · `r/nondualism` · `r/Vipassana` · `r/Mindfulness` · `r/Buddhism` ·
`r/Zen` · `r/yoga` · `r/energy_work`

Start with **five**: `r/streamentry`, `r/Kundalini`, `r/spiritualawakening`,
`r/Meditation`, `r/nondualism`. Reddit's guidance and every practitioner benchmark
agrees that three to five tightly relevant communities beat a wide list at low budget.
`r/streamentry` and `r/Kundalini` are the highest-intent of the set: they are where
people go specifically when practice has become difficult. Widen only if delivery runs
thin.

**Landing page choice matters here.** Send this campaign to
`/counselling-for-meditators/`, not to the new `/meditation-integration-support/` page.
Reddit traffic is cold, sceptical and reading-tolerant; the long first-person essay
page is the right register and does the persuading. The short ad-facing page is built
for search intent, where the visitor already knows what they want.

### R2 — Contemplative Interest + Keyword · Broad

Wider reach, lower intent, lower bid. Kept in its own campaign so its performance
cannot be confused with R1's.

| Setting | Value |
|---|---|
| Objective | Traffic |
| Bidding | Manual CPC, cap $0.70 |
| Geo | Same six countries as R1 |
| Targeting | Interests: Spirituality, Meditation, Yoga, Religion & Spirituality. Plus Reddit keyword targeting on the terms below. Kept as a **separate ad group** from interests. |
| Landing page | `/meditation-integration-support/` |
| Daily budget | $5 |
| UTM | `utm_source=reddit&utm_medium=cpc&utm_campaign=reddit_meditation_broad&utm_content={{CREATIVE_NAME}}&ref=reddit_ads` |

**Keywords:** spiritual emergence · spiritual awakening · kundalini awakening ·
dark night of the soul · meditation retreat aftermath · depersonalisation meditation ·
ego death integration · awakening integration · jhana · dukkha nanas

### R3 — South Africa · Adult Counselling

Cheap, and it tests the home market where Sangham's credibility signals are strongest:
ASCHP registration, rand pricing, EFT payment, local context.

| Setting | Value |
|---|---|
| Objective | Traffic |
| Bidding | Manual CPC, cap $0.50 |
| Geo | South Africa |
| Targeting | Communities: `r/southafrica`, `r/capetown`, `r/johannesburg`, `r/askSouthAfrica`, `r/PersonalFinanceZA`, `r/PretoriaZA` |
| Landing page | `/online-counselling-south-africa/` |
| Daily budget | $5 |
| UTM | `utm_source=reddit&utm_medium=cpc&utm_campaign=reddit_za_adult&utm_content={{CREATIVE_NAME}}&ref=reddit_ads` |

South African Reddit is small. Expect low volume and treat a null result as
informative rather than as failure. The value is that it is nearly free to find out.

### R4 — Young Men · Direction and Follow-Through (phase two only)

**Do not launch this yet.** Launch only if R1 or R2 produces a landing-page lead rate
at or above 1.5%.

This is where Reddit's actual volume lives, and where the demographic match is
strongest — Reddit skews heavily male 18–34, which is precisely the young-men offer's
audience. Communities: `r/selfimprovement`, `r/getdisciplined`,
`r/DecidingToBeBetter`, `r/socialskills`, `r/Mindfulness`. Landing page:
`/online-counselling-young-men-south-africa/`, or a new international variant if the
South African framing proves to be a drag.

The reason it is phase two rather than phase one: it is a crowded, heavily-marketed
space full of coaching offers, so it will be judged sceptically, and it is the campaign
most likely to attract the wrong kind of lead. Prove the funnel on the niche where
Sangham is genuinely differentiated first.

## 6. Communities that must NOT be targeted

Two categories, for two different reasons.

**Policy and scope risk — drug adjacency.** Exactly the same reasoning that keeps
psychedelic terms out of the Google account:
`r/Psychonaut` · `r/microdosing` · `r/Drugs` · `r/Ayahuasca` · `r/shrooms` ·
`r/PsychedelicTherapy` · `r/RationalPsychonaut`

**Ethical and policy risk — acute clinical need.** These are communities of people in
distress who need clinical or crisis care, which is explicitly outside Sangham's
scope. Advertising a paid non-clinical service into them would be wrong regardless of
whether Reddit permits it:
`r/depression` · `r/anxiety` · `r/SuicideWatch` · `r/BPD` · `r/mentalhealth` ·
`r/CPTSD` · `r/ptsd`

## 7. Creative direction

Reddit punishes advertising that looks like advertising, and rewards the opposite more
than any other platform. Concretely:

- **Write in first person, as Michael.** Not "Sangham offers…". "I'm a counsellor who
  spent eight years in practice before…".
- **Lead with the problem, not the service.** The headline should read like a post
  title someone would upvote, not a value proposition.
- **No serene stock photography.** No lotus positions, no sunsets over water, no
  soft-focus hands. Reddit reads these as scam signals. Use Michael's actual portrait,
  or plain text-forward creative on a flat background.
- **Name the limitation in the ad.** "This isn't therapy and it isn't crisis support"
  in the creative itself will *increase* trust on Reddit, not reduce it.
- **State the price.** R850 / about $46. Hiding it reads as a funnel; showing it reads
  as a practitioner. And at these numbers the price is an argument in itself.

### Starter concepts

**A — The one that names the gap (R1 primary)**
> **Nobody warned me what to do after the retreat ended.**
> I'm a counsellor with eight years of serious practice behind me. Most of the people
> I work with had an experience they can't place, and no one to describe it to who
> won't either pathologise it or turn it into a teaching. Not therapy, not crisis
> support, not a teacher telling you what it meant. About $46 a session, online. First
> 15 minutes free.

**B — The credential-forward one (R1/R2 test)**
> **A counsellor who has actually sat the retreats.**
> ASCHP-registered, BA Psychology, 8+ years of personal practice including extended
> silent retreat and training in India. I work with practitioners whose meditation has
> opened something they can't get steady. Online worldwide, about $46 a session.

**C — The scope-first one (R1/R2 test)**
> **This is not therapy, and I'm not going to tell you what your experience meant.**
> What I can do is help you describe it accurately, get the ground under you again,
> and work out what it means for your ordinary week. Registered counsellor, 8+ years
> of practice. Free 15-minute call to see if it fits.

**D — South Africa (R3)**
> **Online counselling, R850 a session, ASCHP registered.**
> For South African adults who understand their patterns and still find themselves
> caught in them. Online anywhere in the country, EFT, no medical aid admin. Free
> 15-minute fit call first.

Run **three creatives per ad group minimum** and refresh whichever is losing every
10–14 days. Reddit creative fatigues fast.

### The comment section is an operational commitment

Reddit ads carry public comment threads. Someone will be sceptical, and on a
counselling ad that scepticism may be sharp. This cuts both ways:

- Left unanswered, a single unchallenged "this is predatory" comment can kill the ad's
  performance.
- Answered honestly and without defensiveness, it is the most persuasive trust signal
  available on the platform — far stronger than any landing page.

**Decide before launch:** either commit to checking comments daily and replying as
Michael in the same register as the site copy, or disable comments at the ad level.
Do not launch and hope. Given how the site is written, engaging is very likely the
better choice — but only if there is genuine capacity to do it.

## 8. Measurement

The good news: **the ground truth needs no new tracking at all.**

Every Reddit link carries `utm_source=reddit` and a per-campaign `utm_campaign`. The
site already captures first-touch UTMs into `sessionStorage` and passes them into the
Cal.com booking config, so a fit call booked from a Reddit click arrives at Cal.com
already tagged. Counting bookings by `utm_campaign` in Cal.com is the number that
decides everything, and it is available on day one.

Layers, in order of how much they matter:

1. **Cal.com bookings tagged `utm_source=reddit`** — ground truth. Free. Use this.
2. **`rdt_cid` capture** — already shipped. The site now stores Reddit's click ID
   first-touch alongside `gclid`, and attaches it to written enquiries, so a lead can
   later be reconciled to a specific click.
3. **Reddit Pixel via GTM** — worth adding for in-platform optimisation signal, but at
   this budget it changes no decisions. Note the pixel misses an estimated 25–35% of
   conversions to ad blockers, and Reddit's audience blocks more than most.
4. **Reddit Conversions API** — the accurate long-term answer, and unnecessary until
   monthly Reddit spend is comfortably into four figures. Do not build it for a
   $400 test.

### Decision gates

| Gate | Trigger | Action |
|---|---|---|
| Day 3 | Any campaign CPC above $2.00 | Cut the bid cap, narrow to the two highest-intent communities |
| Day 7 | Under 40 clicks total | Delivery problem, not a funnel problem. Check ad approval status and whether target subreddits have opted out of the ad category |
| Day 10 | 200+ clicks, zero fit calls | The landing page is the problem, not Reddit. Stop, fix the page, restart |
| Day 21 | Landing-page lead rate ≥ 1.5% | Working. Continue and launch R4 |
| Day 21 | Lead rate 0.5–1.5% | Marginal. One creative iteration and one landing-page iteration, then re-judge |
| Day 21 | Lead rate < 0.5% | Stop paid Reddit. The audience is right, the conversion moment is not |
| Any time | Cost per fit call above R400 with no sign of improving | Pause, per the playbook's own lead CPA ceiling |

## 9. Reddit-specific policy risk

- Subreddits focused on mental health, wellness or vulnerable populations get
  **additional ad review and category restrictions**. Most of the R1 target list is
  wellness-adjacent, so expect slower approval and some communities simply not
  delivering.
- **Subreddit moderators can opt their community out of ad categories, and advertisers
  cannot override that.** A target community delivering zero impressions is a normal
  outcome, not a setup error. Diagnose it before assuming a bidding problem.
- Category restrictions apply **regardless of targeting method** — subreddit, interest
  and keyword targeting are all subject to the same rules, so there is no route around
  a restriction.
- Keep every scope disclaimer from the Google account intact in Reddit creative. The
  non-clinical framing is not only compliance; on Reddit it is also the most persuasive
  thing in the ad.

## 10. Where the 15–20 clients actually come from

Setting expectations honestly, because the paid channels alone will not get there in
one month.

| Source | Realistic monthly clients | Confidence | Spend |
|---|---|---|---|
| Google Search, SA | 0–1 | High — demand-capped, cannot be bought past | R700–1,500 |
| Google Search, international | 0–1 | Low volume, near-zero forecast | R0–1,000 |
| Reddit, if the funnel works | 2–8 | **Unproven — this is the test** | R6,000–9,000 |
| Organic `/counselling-for-meditators/` + new integration page | 0–2 | Compounds slowly, costs nothing | R0 |
| Referral, professional network, Boys to Men, ASCHP directory | Unknown, likely the largest | Not measured today | R0 |

Two things follow.

**First: 15–20 is an accumulation target, not a monthly run rate.** At 3–8 new clients
a month from all sources, 15–20 is a three-to-five month horizon. Treating it as a
30-day target will produce a decision to overspend on a channel that has not yet
proven it converts.

**Second: the largest untracked lever is referral.** Sangham has a professional
reference from a clinical and forensic psychologist, a long history with Boys to Men,
and multi-year client relationships. None of that is currently instrumented or
systematically asked for. A referral costs nothing per client and converts at rates no
paid channel approaches. Before spending another rand on ads, it is worth asking every
past client and professional contact directly. That is not a marketing channel to buy;
it is one afternoon of email.

---

## Blockers

Neither of these can be changed from the API. Both are toggles in the AdKit dashboard.

1. **The Reddit ad account is not assigned to the Sangham project.**
   `adkit_status` reports `reddit: { connected: false, accounts: [] }`.
   Fix at: <https://app.adkit.so/settings/workspace-integrations?projectId=6a8beb727af89af4e2b01c92&platform=reddit>

2. **Advanced Platform Access is disabled for this project.**
   AdKit has no first-class Reddit campaign write support yet — Reddit campaigns must
   go through `entity: "platform-api-request"`, which returns
   `platform_api_requests_disabled` until this is enabled.
   Fix at: <https://app.adkit.so/settings/permissions?projectId=6a8beb727af89af4e2b01c92>

Once both are on, this document is directly executable: three campaigns, their ad
groups, targeting, bids, UTMs and creative are all specified above.

---

## Sources

Benchmarks and platform mechanics in sections 3, 4, 7 and 9 draw on:

- [Reddit Advertising Policy 2026: Promoted Posts + Rules](https://www.auditsocials.com/blog/reddit-advertising-policy-compliance-guide-2026)
- [Reddit Ads Help Center — Targeting Guidelines](https://business.reddithelp.com/s/article/Reddit-Advertising-Policy-Targeting-Guidelines)
- [Reddit Ads Minimum Budget Requirements in 2026](https://www.stackmatix.com/blog/reddit-ads-minimum-budget-requirements-2026)
- [Reddit Ads CPC and CPM Benchmarks](https://www.stackmatix.com/blog/reddit-ads-cpc-cpm-benchmarks)
- [Reddit Ads Benchmarks Per Industry (2026)](https://adbacklog.com/blog/reddit-ads-benchmarks-per-industry-2026)
- [How to advertise on Reddit in 2026: Setup, targeting, and what actually converts](https://launchcodex.com/blog/performance-marketing/how-to-advertise-on-reddit/)
- [Reddit Ads Conversion Tracking — complete guide](https://www.customerlabs.com/blog/reddit-ads-conversion-tracking-the-complete-guide-for-marketers/)

Subscriber counts are deliberately **not** quoted: reddit.com is not reachable from
this environment, and exact reach is shown in Reddit Ads Manager once the targeting is
entered. Verify there before finalising bids.
