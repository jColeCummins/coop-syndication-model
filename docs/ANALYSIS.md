# Deal Analysis — Limited-Equity Co-op Conversion (V5 Model)

**Structure under analysis:** the owner of a 25-unit property (24 apartment units built 1968 + one standalone house, ~$1.5M FMV, 1993 transferred basis) donates the land to a Community Land Trust (§ 170), sells the improvements to a co-op syndicate on a seller-financed installment note (§ 453), investors inject the down payment + renovation CapEx and are taken out at a Year-5 refinance, after which the tenant co-op owns the improvements on CLT-leased land.

This document explains (1) every place the V5 engine deliberately departs from the Gemini technical primer and the prior V4 build, with the authority for each departure; (2) why the earlier model produced implausibly low rents; (3) the seller's case versus a cash sale; and (4) the investor's return timeline and the situations where this deal is an optimal allocation.

All figures below are the model's **default-input scenario**: $1.5M FMV, $440k land donation, 15% down, 6% note, 20-year amortization, Year-5 balloon/takeout, $180k new CapEx, Ohio seller and investors.

---

## 1. Corrections to the primer (made on higher authority, as instructed)

The primer's intent is right; several of its mechanical tax rules are not. Each was corrected rather than annotated because the errors are large enough to invert the conclusions a seller or CPA would draw.

### 1.1 The "§ 453(i) recapture bomb" does not exist for this property — REMOVED

The primer (and V4) taxed **all** accumulated depreciation at 25% in Year 1, "regardless of cash received." That conflates two different things:

- **§ 453(i)** accelerates *ordinary-income recapture* under §§ 1245/1250 into the year of sale. For **residential real property depreciated straight-line** (mandatory for all post-1986 MACRS realty — and this owner's holding period is 1993→present), § 1250 ordinary recapture is **zero** by definition (it only captures depreciation in excess of straight-line).
- What the seller actually has is **unrecaptured § 1250 gain** — capital gain taxed at a *maximum* 25% rate. Under installment reporting it is **not accelerated**; it is recognized as principal is collected, and per **Reg. § 1.453-12** those 25%-rate dollars come out **first** within each year's recognized gain.

V5 implements the Reg. § 1.453-12 front-loaded ordering. Effect at defaults: Year-1 tax drops from ~$98k (V4) to **~$43k**, and headroom vs. the $159k down payment goes from thin to comfortable. This matters commercially: the phantom bomb made the installment sale look nearly as punitive as a cash sale, destroying the structure's actual selling point. (The primer's hard-coded seller warning banner is retained verbatim for the edge cases where Year-1 tax genuinely exceeds the down payment.)

*If a cost-segregation study had ever been done on the seller's side, § 1245 personal-property recapture **would** be accelerated under § 453(i) — the seller's CPA should confirm the depreciation history is straight-line building only.*

### 1.2 Gross Profit Ratio: wrong denominator and no basis apportionment — FIXED

The primer computes `GPR = (totalFMV − adjustedBasis) / totalFMV` but applies it to collections on a note whose principal is `FMV − donation`. Total gain recognized would never tie out to actual gain. V5 uses the installment-sale definitions: **contract price = FMV − donated land**, basis apportioned pro-rata between the gift and sale parts (the § 1011(b) bargain-sale principle), `GPR = gross profit ÷ contract price`. The ratio is now bounded 0–100% and the schedule's recognized gain sums exactly to gross profit (verified numerically).

### 1.3 "Negative adjusted basis / GPR > 100%" — impossible, now structurally excluded

V4 allowed accumulated depreciation ($300k default) to exceed the depreciable basis. Depreciation deductions stop at zero adjusted basis, and land (25% of basis here) never depreciates. V5 clamps accumulated depreciation at 75% of original basis ($187.5k max on a $250k basis) and surfaces a UI annotation when the input is clamped. Default lowered to $185k — consistent with a building fully depreciated over 27.5 years from 1993.

### 1.4 § 170 shield: the cliff is Year 7, not Year 6 — and the real constraint is the 30%-of-AGI ceiling

- Charitable carryforward under § 170(d) runs **five years beyond the contribution year**: six usable years, so the first zero-shield year is **Year 7**. (Primer said the shield dies at Year 6.)
- Appreciated long-term property to a public charity is capped at **30% of AGI per year** — the primer's "partial shield based on lower-bracket AGI limitations" is now a real mechanical limit.
- **Ohio gives no charitable deduction** (no itemized deductions against the flat state tax), so the state-tax layer is computed with zero shield.
- **The model tracks utilization**: at defaults, the balloon-year AGI spike lets the seller absorb 100% of the $440k deduction inside the window. Shrink the balloon or stretch the note and utilization collapses — the dashboard raises an explicit alert when >10% of the deduction expires unused. This is the single most important § 170 planning variable and was invisible in V4.

### 1.5 Yellow Springs municipal tax cannot touch this income — corrected application

Ohio municipal income tax (ORC 718) reaches **qualifying wages and business net profits only** — never interest, dividends, or capital gains of individuals. The primer's instruction to tax the seller's note interest at "ordinary rate plus state and local" is wrong on the local component. V5 keeps the local-rate slider but applies it only where it legally lands: **positive rental net profits** on the investor side (which large depreciation zeroes out in most years). The seller-side local tax is $0 by law, with a tooltip explaining why.

The state slider defaults to **2.75%** (Ohio's current flat rate) rather than the primer's 3.5%.

### 1.6 Cost-seg bonus base: purchase price, not 75% of FMV

The primer's Year-1 bonus on the acquired building was `(totalFMV × 0.75) × 0.30`. But the buyers don't acquire $1.125M of building — they acquire the **improvements for the contract price** ($1.06M; the land goes to the CLT, so essentially the entire purchase price is depreciable). V5 uses `contractPrice × 30%` for the 5/15-year cost-seg carve-out, with the remaining 70% on the 27.5-year straight line. The 30% short-life share is kept per the primer but flagged as the aggressive end of the typical 20–30% range for garden apartments — it requires an engineering-based study.

Two Ohio/§ 168(k) realities are also now modeled or disclosed: **Ohio adds back 5/6 of bonus depreciation** (recovered over the following five years — modeled), and OBBBA's 100% bonus applies to used property, which is what makes the acquired-improvements carve-out work at all.

### 1.7 Investors cannot exit tax-free — exit tax added

V4 returned investor capital at par at the Year-5 takeout with no tax consequence, after handing investors ~$438k of Year-1 depreciation. Five years of deductions cut the entity's basis to ~$681k against a ~$1.10M takeout price: **~$423k gain, ~$117k exit tax** (25% up to depreciation taken, 15% above, plus Ohio). Any CPA would catch this instantly — bonus depreciation is a *deferral*, not an exemption. IRR is now computed net of exit tax.

### 1.8 NIIT and the 20% bracket — added, and they are the heart of the seller pitch

V4 used flat 15% LTCG with no NIIT. A ~$1.4M single-year gain does not get taxed at 15%: most of it lands in the **20% bracket** plus **3.8% NIIT**. V5 applies both automatically per year based on modeled AGI — which is precisely the quantitative case for the installment structure (see § 3).

### 1.9 Kept from the primer/V4 deliberately

Balloon-year mechanics decoupled from amortization term (the primer's 5-year default note is expressed here as balloon year 5 on a 20-year amortization — a literal 5-year fully-amortizing note would require ~$245/mo more rent); the exact critical-alert string; the 10% rent-cliff threshold; the three MACRS CapEx buckets; the zinc-950 executive aesthetic; `useReducer` state per the primer's Task 2; all § 453(i)/§ 170/§ 469(c)(7)/§ 168(k) tooltips per Task 3.

---

## 2. Why the old model's rents were "especially low"

Your instinct was right. V4's Phase-1 "required rent" at comparable inputs was **~$490/month** — far below both current rents ($700) and your market research. The formula wasn't wrong; it was **incomplete**. The revenue requirement covered only debt service + property taxes + insurance + management, i.e. a break-even on four cost lines. Missing:

| Missing line | V5 default | Annual (25 units) |
|---|---|---|
| Repairs & maintenance (1968 building) | $900/unit/yr | $22,500 |
| Owner-paid utilities (water/sewer/trash/common) | $600/unit/yr | $15,000 |
| Replacement reserves | $300/unit/yr | $7,500 |
| Investor preferred return (7% current-pay on $339k) | — | $23,730 |

With those lines restored, Phase-1 required rent is **$711/month** — right at the property's current $700 and plausibly *below* market for the area, which is the honest affordability story: the structure works without rent increases, rather than the fantasy of a 30% rent cut. Phase 2 drops to **$673** (−5.3%) because the investor preferred return disappears at takeout — no rent cliff; the cliff alert logic remains armed for adverse slider combinations.

A cost-recovery rent is a **floor**, not a market estimate. If your comps research says market is $900–$1,100, the gap is the deal's affordability margin (or additional reserve capacity), and the dashboard now labels the number accordingly.

---

## 3. The seller's case — honestly stated

Three after-tax scenarios at defaults (5% NPV discount):

| Scenario | Total tax | Nominal after-tax | NPV after-tax |
|---|---|---|---|
| Straight cash sale (keep the land, sell everything) | $369k | $1,131k | $1,131k |
| Cash sale + CLT land donation | $136k | $924k | $920k |
| **Installment + CLT donation (this deal)** | **$196k** | **$1,115k** | **$924k** |

What a CPA — and an honest advisor — should say to the seller:

1. **The donation is the expensive decision, not the note.** Giving the CLT $440k of land value costs ~$207k of NPV even after every tax benefit. Nothing recovers a dollar donated except the deduction (~24–37 cents federal). The donation must be motivated by the mission — permanent affordability — with tax relief softening, not erasing, the gift.
2. **Given the donation, the installment note beats cash.** Same bifurcated deal taken in cash nets $920k NPV; the note nets $924k NPV and **$192k more nominal**, because it (a) keeps every year's gain inside the 15% LTCG bracket instead of dumping $1.0M+ into the 20% bracket, (b) keeps MAGI under the $250k NIIT threshold in most years, (c) earns 6% on ~$900k of carried principal, and (d) — crucially — generates the multi-year income stream that **absorbs 100% of the § 170 deduction** (the lump-sum scenarios strand deduction against a $75k AGI).
3. **Per-dollar retention is the cleanest framing:** the structure converts $1.06M of contract price into $1.115M of after-tax cash (interest included) — ~85% retention with a ~$196k lifetime tax bill — versus 75% retention on the straight cash sale. The seller finances the buyer *and* the IRS charges less for it.
4. **The risks are seller-borne and must be disclosed:** five years of buyer credit risk secured by the property, a balloon dependent on the co-op qualifying for a Phase-2 mortgage, and a $130k tax year when the balloon lands (visible in the schedule, softened by the remaining carryforward). The note rate must be at least the AFR (§ 1274); 6% clears current AFRs comfortably.

---

## 4. The investor's case — timeline, IRR, and when it's optimal

$339k in (=$159k down payment + $180k CapEx), five-year hold, taken out at par by the co-op refinance:

| Year | Flow (REPS investor) | What's happening |
|---|---|---|
| 0 | −$339k | Down payment + CapEx |
| 1 | +$162k | $23.7k pref + **$137k tax savings** ($438k deduction: 30% cost-seg bonus + 100% bonus on 15/5-yr CapEx + straight-line) |
| 2–4 | +$17–18k/yr | Pref, minus small tax on positive taxable income |
| 5 | +$238k | Pref + capital returned at par − **$117k exit tax** |

- **IRR with REPS: ~9.5%** · **IRR passive: ~6.4%** · equity multiple ~1.33x · payback at takeout.
- **The two IRRs are the whole story.** Without § 469(c)(7) REPS (or offsetting passive income), losses suspend and only release at disposition — the tax value arrives four years later. This deal is optimal for: real-estate professionals and their spouses filing jointly; investors with passive income to shelter; high-bracket (35–37%) taxpayers who value the Year-1 deduction most; and mission-aligned capital that accepts a below-market pure-financial return for a secured, short-duration, community-outcome position. It is **not** optimal for passive W-2 investors seeking cash yield — they're better off in anything conventional.
- **The return is takeout-dependent, not appreciation-dependent.** Capital comes back at par because the co-op refinances; underwriting the co-op's Phase-2 mortgage qualification (DSCR on $88k/yr debt service at $673 rents) is the real diligence item. There is no upside participation — by design, since the LEC captures the appreciation.
- Honest caveats now displayed in-model: exit tax (deferral, not exemption), Ohio's 5/6 bonus addback (state savings lag federal), municipal tax on positive rental profits, and the § 461(l) excess-business-loss cap for very large investors (disclosed, not modeled).

---

## 5. Remaining simplifications a reviewing CPA should re-underwrite

Flat marginal rates rather than full bracket ladders; full-year (not mid-month/mid-quarter) MACRS conventions; property taxes/insurance held flat across phases (no inflation); investor NIIT ignored; Ohio 1/6 addback recovery truncated at exit; single-entity investor pool with no promote/waterfall; no appraisal or § 170(f) substantiation modeling for the CLT donation (a qualified appraisal and Form 8283 are mandatory at this size, and a CLT ground-lease donation should get a § 170 opinion); no § 453A test needed (< $5M). The engine's every rate and threshold is a named constant in `src/utils/calculations.ts` for easy re-parameterization.

---

# V5.2 Addendum — July 2026 re-underwrite

Implements the accepted subset of `docs/REVIEW-2026-07.md`, `docs/defaults-v5.1.patch.ts`, and `docs/UX-CONFIG-SPEC-v5.2.md`, triaged to capture the benefit without drowning the tool in configuration surface.

## A.1 Complexity triage

**Implemented** (engine changes 1–8 from the patch file): asset-level basis split (land basis → CLT gift, building adjusted basis → co-op sale; GPR is now ~100% on a fully-depreciated building); OBBBA 0.5%-of-AGI charitable floor (disallowed amounts never carry); § 1245 ordinary-rate exit recapture behind a negotiated `exitShortLifeAllocationPct` input (default 50%); Ohio Business Income Deduction behind a CPA-confirm toggle (default on); § 199A QBI on positive REPS years; per-line opex escalators (water/insurance 8%, taxes/management 3%, others 2.5%) with Phase-2 rent and the cliff alert computed on buyout-year costs; PIK-pref toggle; filing-status-driven NIIT/LTCG thresholds (2026 figures); cost-seg share cut to 25%; management ×1.15 bump replaced by the 3%/yr escalator; plain-language labels + tooltips on every input.

**Deferred** (recorded, low regret): the 4-layer JSON preset architecture (constants are now grouped `TAX_POLICY` / `JURISDICTION` / `ESCALATORS` / `DEAL_CONSTANTS` as the seam for it); `capexPlacedInServiceYear` per bucket and buyout month/year (timing shifts ~$18k of Year-1 tax savings — flag for the CPA, not the slider deck); CPI indexation of investor capital (decision: off); transfer-type selector (the basis fork lives in the tooltip; the real answer is the seller's Form 4562); escalator sliders (constants, documented). Structural decisions honored, not relitigated: formula-option exit in the ground lease; no Rev. Rul. 82-197 exit deduction.

## A.2 FMV: $1.5M was a stabilized number — as-is is ~$1.25M

At 25 units × $700 in-place rents (4% vacancy) and honest Yellow Springs operating costs, EGI ≈ $202k and opex ≈ $126k ex-reserves, so NOI ≈ $75k. Ohio Class-C multifamily in tertiary markets trades at 7–9% cap rates in 2026; even granting a village premium (~6.75–7.25%), income supports only ~$1.0–1.15M. Sales comps (~$50k/door for C-class garden with deferred maintenance, plus the standalone house and the well-located 3.58-acre site) support $1.2–1.35M. Reconciled **as-is default: $1,250,000** ($50k/door). The prior $1.5M is what the property is worth *after* renovation at market rents ($900–1,100) — a defensible exit appraisal, not a defensible acquisition price. Sources: Ohio Dept. of Taxation 2026 multifamily cap-rate publication; 2026 Class-C tertiary-market cap-rate surveys (7–9%).

## A.3 Donation sizing: the optimizer answers "redeem it before it expires"

Sweeping the land gift at the new defaults (engine-verified, binary search capped at 40% of FMV):

| Gift | % of FMV | Deducted | Lost to 0.5% floor | Expires unused |
|---|---|---|---|---|
| $375,000 | 30.0% | $367.7k | $7.3k | $0 |
| **$430,000 (default)** | **34.4%** | **$422.7k** | **$7.3k** | **$0** |
| **$436,000 (maximum)** | **34.9%** | — | — | **$0** |
| $450,000 | 36.0% | $424.7k | $7.2k | $18.1k |
| $500,000 | 40.0% | $406.4k | $6.9k | $86.7k |

**The largest fully-redeemed gift is $436k (34.9% of FMV).** The default is $430k — inside the optimum with margin for appraisal drift. 30% ($375k) absorbs with slack; 40% strands $87k of deduction. The binding constraint is the 30%-of-AGI ceiling: absorption capacity is itself a function of the gift (a bigger gift shrinks the note that generates the income that absorbs the deduction), which is why the answer is 34.9% and not a round number. The Year-5 balloon inside the six-year window remains the engine of full absorption — stretch the buyout past Year 6 and utilization collapses. The dashboard now displays the live maximum for whatever inputs are set. The appraisal of the 3.58-acre parcel — not this optimizer — determines what the gift is actually worth; the optimizer tells you what the deal can *use*.

## A.4 Headline numbers at V5.2 defaults

Seller: contract price $820k, Year-1 tax $27.4k against a $123k down payment (headroom $95.6k), lifetime tax $133k with the BID on (vs $149k off), 98.3% of the gift deducted, nothing expires. Given the donation, the note beats a bifurcated cash sale by **$22.7k NPV / $170k nominal**; a straight cash sale (keeping the land) still nets more in pure dollars — the gift is philanthropy, priced honestly. Investor: **7.3% IRR with REPS** / 5.2% passive, 1.27x, capital + formula takeout in Year 5; exit tax $103k at the 50% short-life allocation (negotiating range $88k–$118k ⇒ ±1.1 IRR points vs the 8.4% floor-allocation case). Tenant: **Phase 1 $755** (+$55 vs current, $145–345 under market comps), **Phase 2 $848** — +12.3% over five years of documented cost inflation ≈ 2.4%/yr drift, which trips the >10% cliff badge by design; the **PIK-pref toggle holds Phase 1 at $681** (below current rents) by deferring the investor return into the buyout loan.

---

# V5.3 Addendum — Grants & Subsidy, and verdicts on the earlier-era research

## A.5 Grant buckets: design decisions

Four buckets, ordered by descending probability of award, each defaulting to $0 (= not awarded): **utility/weatherization rebates** (near-certain if the renovation includes qualifying measures; small dollars, no covenant), **county HOME/CHDO funds** (high — the CLT partner is the natural certified CHDO, and 15% of HOME allocations are reserved for CHDOs; 20-year covenant, Davis-Bacon at 12+ assisted units), **Ohio Housing Trust Fund** (moderate — competitive annual rounds, scores well for displacement prevention), and **FHLB Cincinnati AHP** (least certain — roughly a third of applications fund; ≥20% of units at ≤50% AMI, 15-year retention).

**Why amount-only sliders, not year-awarded/duration inputs.** The suggestion was considered and deliberately simplified: (1) capital grants are underwritable only if **committed at closing** — a bank, a seller carrying a note, and investors sizing a check cannot close on "maybe next year," so a year-awarded slider would model a scenario the deal can't actually be built on (a later award is a mid-hold recapitalization — re-run the model at the buyout instead); (2) the **durations** that matter (HOME 20 yr, AHP 15 yr, OHTF ~15 yr) are recorded *affordability covenants*, not cash flows — they belong in tooltips and the closing checklist, and their rent/income limits sit at or above this model's cost-recovery rents, so they bind paperwork, not economics. Twelve extra sliders would have bought no decision-relevant precision.

**Mechanics:** grants are soft forgiven funding replacing investor capital dollar-for-dollar (clamped at the total capital need), which cuts the preferred return out of Phase-1 rents *and* shrinks the Phase-2 refinance — the only lever that improves both phases at once. Depreciable basis is kept intact (deferred-loan characterization; §61/§118 sign-off is a CPA item). Engine-verified at defaults: $165k of grants (rebates + HOME) → Phase 1 $715, Phase 2 $802, investor capital $138k at 14.8% IRR; $265k → $690/$774.

**§ 465 at-risk enforcement (new, and load-bearing).** Grant scenarios exposed a latent error worse than anything in the reviewed documents: a shrunken investor slice cannot deduct the full Year-1 bonus. The seller note is **not qualified nonrecourse financing** — § 465(b)(6) excludes debt owed to the property's seller — so at-risk equals cash invested, REPS or no REPS. The engine now suspends losses beyond at-risk and releases them against the exit gain. At the no-grant defaults the Year-1 loss ($281k) sits just inside the $303k cap, which is why the issue was invisible until grants entered; without the fix, a $38k investor showed a 188% IRR.

## A.6 Verdicts on the two earlier-era documents

**Why the old research showed higher IRRs and lower Phase-2 rents:** those models pro-rated recapture into charitable/capital buckets, took no exit tax, ignored the Ohio 5/6 addback, ran flat (unescalated) operating costs that were also ~40% too low for Yellow Springs, and in one branch stacked a $525k conservation-easement deduction on top. Each of those flatters the deal; none survives review. The current numbers are lower because they are real.

**Perplexity "Final Peer Review — Yellow Springs Model":**
- **§ 170(h) conservation-easement pivot — REJECTED.** The structure already donates the land in fee to the CLT: a clean § 170 FMV deduction with none of § 170(h)'s perpetuity-clause litigation, "clearly delineated governmental policy" burden, or enforcement climate (easement deductions are the IRS's single most-audited charitable item; NWF community certification is not a governmental policy). The easement's only theoretical edge — 50%-of-AGI limit and 15-year carryforward — buys nothing here, because the optimizer shows the fee gift is fully absorbed within the ordinary six-year window up to $436k. Swapping a clean deduction for a dirty one of similar size is strictly worse. (If a future seller wanted to deduct far more than the 30%/6-year math absorbs, revisit — with appraisal and counsel budgets to match.)
- **Partial-asset-disposition "roof maneuver" — ADOPTED** as a methodology/diligence note: Reg. § 1.168(i)-8 lets the buyers write off the old roof's allocated basis when they replace it. Real, modest, quantified by the cost-seg study.
- **Solar ITC "30% through 2032" — CORRECTED.** Post-OBBBA that is no longer true: § 25D (residential) is terminated and § 48E for solar requires construction to begin within the statutory window (roughly mid-2026) or placement in service by end-2027. Solar remains worth pricing for this roof, but it is now a *deadline*, not a standing option.
- 15-year carryforward / 50% AGI claims: correct law, but only for qualified conservation contributions — inapplicable once the easement route is rejected.

**"Twin Coach v44" multidisciplinary review** (reviews a much older build; most findings are already resolved or misdirected):
- Ohio 5/6 addback, bargain-sale recapture ordering, seller break-even framing: **already implemented** in V5/V5.2, in stronger form (asset-level basis split; Reg. § 1.453-12 ordering; three-scenario comparison).
- OBBBA acquisition-date cutoff (1/19/2025): moot — this acquisition closes after it; noted as an assumption.
- Ohio CAT: **dismissed** — ~$220k gross receipts vs. the $6M exclusion; a warning threshold matters only if the tool is pointed at a large portfolio.
- "Strict rent lock" illegality (ORC 5321.20): **overstated** — the statute preempts municipal rent control, not private ground-lease covenants. The underlying instinct is right though, and is adopted as drafting guidance: the ground lease needs a **solvency safety valve** (board-supermajority rent override when reserves are breached) and a **99-year renewable term** exceeding any mortgage term.
- Tenant participation/holdout modeling: fair point, deferred — a `tenantParticipationRate` is a candidate future input for the conversion window.
- Columbus vacancy (9.7%) and 45–50% OER benchmarks: **dismissed** — wrong market; Yellow Springs vacancy is tight (4% modeled), and this property's honest OER is *above* their benchmark (~62–68%) because of village water rates, which the escalators already carry.
- Trademark risk: **dismissed** — the reviewer mistook the project for software marketed under the "Twin Coach" name; it is an internal model *of* the actual Twin Coach Apartments.
- decimal.js / floating point: **dismissed for this tool** — float64 error is orders of magnitude below display rounding on a 30-year schedule; decimal arithmetic becomes relevant only if the engine ever generates filing-grade documents (Form 8283 values come from the appraisal, not this dashboard).
