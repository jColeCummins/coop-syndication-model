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

## A.7 The tenant-first launch plan (V5.3.1)

The strategy the deal is actually being run on — investors close first (no grants underwritten at closing; the federal subsidy arrives *through* them as bonus depreciation, QBI, and the at-risk-shaped loss schedule), tenants are protected from day one, and the Year-5 rent step is chiseled during the hold — is now directly modelable via the **grant-timing toggle** (default: awards applied at the buyout, shrinking the Phase-2 refinance; flip it only when awards are committed pre-closing).

Engine-verified ladder at the launch configuration (PIK pref + 25-yr note sizing + 5.5% seller rate + water-conservation CapEx; no closing grants):

| Step | Phase 1 rent | Phase 2 rent |
|---|---|---|
| Launch (nothing else goes right) | **$634** | $866 |
| HOME $150k + rebates $15k won by Year 5 | $634 | $820 |
| + OHTF $150k ($315k total at buyout) | $634 | $778 |
| + Phase-2 self-management | $634 | **$718** |

Tenants pay **$66 below current rents for five years**; the fully-chiseled Phase-2 rent is +13% over launch across six years (~2%/yr — below general inflation) against $900–1,100 market comps. Investors: $318k in, 6.3% REPS IRR (4.8% passive), ~$111k of federal tax savings in Year 1, formula takeout in Year 5 — mission-priced but compensated, and every grant dollar won during the hold de-risks *their* takeout too (a smaller Phase-2 mortgage is easier to qualify). Seller: unchanged — headroom $97k, donation fully absorbed, still ahead of a bifurcated cash sale. The downside case is not collapse but a bounded rent step to $866 if every grant application fails.

**Management-incentive guardrail** (raised during strategy review, now in the model's tooltip and the diligence list): contract management on a **flat per-door fee** — never a percentage of rents or costs, which literally pays the manager more for mowing more — and carve large recurring services (landscaping, turns) into competitively-bid or tenant-performed work. The model's management line has always been flat per-door; the deal documents must match it.

## A.8 CLT ground lease (V5.3.2) — a corrected omission

Earlier versions modeled the CLT owning the land but charged the co-op **nothing** to lease it — a real omission, since the entire premise is that the CLT holds the land and ground-leases it back. Added as a per-unit operating line (`cltGroundLeasePerUnit`, default $300/unit/yr, escalating 1.5%/yr — a slow, affordability-minded step).

**Effect:** raises required rent ~$26/month at defaults (base Phase-1 $755 → $781; launch case $634 → $660, still below the current $700). It is a **pure pass-through**: because the fee is both a rent component and a deductible operating expense, the investor entity's taxable income is unchanged (the `principal + pref − depreciation` identity holds), so investor IRR and the seller's position are byte-for-byte unaffected — verified. The ground lease's only economic incidence is on tenant rent, and its only beneficiary is the CLT.

**Sizing.** Affordability CLT ground leases typically run **$300–600/unit/yr** — enough to fund perpetual stewardship (monitoring, administration, ground-lease enforcement) rather than to extract land rent. Because it lands entirely on tenants, hold it at the stewardship floor. A formula alternative (1–3% of donated land value; here $430k × 1–3% = $4,300–$12,900/yr, i.e. $172–$516/unit) brackets the same range.

**The "can the CLT pay management out of the ground lease?" question — answer: keep them separate.** Economically you *can* route both the ground lease and a management contract to the CLT (keeping money in the community and aligning incentives — a mission-aligned steward, unlike a percentage-fee manager, wants costs low). But do **not bundle them into one instrument**, for the CLT's own tax protection: rent from real property is excluded from the CLT's unrelated-business income tax (UBIT) under **§ 512(b)(3)**, but that exclusion is lost if the lessor also renders **substantial services** with the lease. So structure two documents — a pure land ground lease (UBIT-exempt rent) and, if desired, a separate fair-market management/service agreement evaluated on its own for relatedness to the CLT's charitable purpose (managing affordable housing is plausibly related, but it is a facts-and-circumstances call for counsel). There is no tax arbitrage in relabeling either payment — both are deductible to the co-op regardless — so the only reasons to involve the CLT in management are mission and incentive alignment, not tax.

## A.9 Investor ROI readout — making the tax alpha legible (V5.3.3)

The investor flow table shows near-zero cash in Years 2–5, which reads as "nothing is happening" and obscures the actual return. Added a plain-English ROI band to the investor card and the underlying metrics (`year1TaxRefund`, `effectiveCapitalAtRisk`, `totalReturned`, `netProfit`, `simpleRoi`).

**Why Years 2–5 are quiet (it is correct, not a defect).** 100% bonus depreciation front-loads ~76% of the five-year depreciation into Year 1. In Years 2–5 the only depreciation is ~$25.6k/yr of straight-line, and that is almost entirely offset by the **phantom income** of seller-note principal paydown (non-deductible use of cash funded by taxable rent), leaving the entity's taxable income ≈ $0. There is no untapped Year-2+ shelter to find — the asset simply does not generate more paper loss after the bonus is claimed. Note interest is already deducted every year inside the flows and declines over time; it is not a hidden lever.

**Pass-through, stated plainly.** The investor LLC (partnership) pays no entity tax; income/loss passes through on K-1s to the members, who report it on their own returns. The model applies the investor's marginal rate to the passed-through amounts — i.e. it already computes at the member level for a representative investor. Differentiated members (some REPS, some not) are where § 704(b) special allocations of depreciation would add value; the model assumes a uniform pool.

**The ROI story at defaults** (PIK on, REPS on): $303k in → **$105.7k back in Year 1** as a tax refund against other income → effective capital at risk ~$197k → quiet Years 2–4 → **$274k at the Year-5 takeout** (capital + accrued preferred − exit tax). Totals: 1.25× equity multiple, +$77k net, 6.2% IRR, ~1.39× on the capital genuinely left at risk. It behaves like a tax-advantaged 5-year note: refund up front, principal-plus-yield at the end, nothing in between.

**Why this is a real benefit, and the strategic implication.** The Year-1 refund is federal subsidy that **only a taxable investor can capture** — a grant, a CDFI, or the (tax-exempt) CLT cannot use depreciation at all. That capture is precisely what lets investors accept a below-market ~7% preferred return instead of the 10–12% bridge capital would otherwise demand, which is what holds launch rent near $660. So the depreciation is not "claimed ineffectively"; it is the mechanism that makes the bridge capital cheap, once, for the tenants' benefit. Corollary for the "skip investors, wait for grants" question: grants cannot be underwritten to a closing date (annual competitive rounds, ~⅓ hit rates), the seller will not wait indefinitely, and dropping taxable investors forfeits the ~$105k of federal money only they can pull in. The right structure sequences them — investors close now (cheap capital via the tax capture), grants chisel the Year-5 refinance — rather than choosing one. A legitimate refinement: minimize the investor check to essentials and defer nice-to-have renovation until grants land.

*(Correction to a prior message: an apparent "n/a" IRR in the PIK + passive corner was a bug in a diagnostic script, not the engine — the engine computes that IRR correctly at ~4.6%. `irr()` returns null only when a return is genuinely undefined, e.g. zero investor capital when grants cover everything.)*

## A.10 Seller comparison NPV — discounting bug fix + after-tax discount-rate clarification (V5.3.4)

A user reading the "Why Not Just Take Cash?" card noticed the installment note's NPV looked too weak given the 6% interest. Investigation found two distinct things.

**The bug (fixed).** The three scenarios discounted inconsistently. The straight cash sale and the cash-sale-plus-donation both anchor their Year-1 proceeds at t0 (received at closing). The installment scenario, however, discounted its *entire* Year-1 flow — including the down payment received at that same closing — a full year (`1.05^(i+1)` with `i` from 0). So the note was penalized one full period of discounting on closing-day cash the cash scenarios treated as present. Corrected to `1.05^i` (Year 1 = t0), consistent across all three. Effect at the user's inputs (FMV $1.75M, donation $500k): installment NPV rose from $1,075,990 to **$1,129,789**, and its advantage over a bifurcated cash sale from a misleading +$17,908 to **+$71,708**. At the shipping defaults (FMV $1.25M, donation $430k) the installment-vs-cash-plus-donation NPV edge moved from ~$23k to **~$59k**. (The installment still trails a *straight* cash sale on NPV — correctly — because that scenario keeps the donated land; that gap is the philanthropy, unchanged.)

**The economics (not a bug, now explained in-UI).** Even after the fix, the installment NPV sits well below its nominal, and the reason is the heart of the user's question: **the 6% coupon is pre-tax, but the NPV discounts after-tax cash flows.** Interest is ordinary income (~24% federal + state), so the note's after-tax yield is ~4.4% — *below* the 5% after-tax discount rate. Carrying principal to the Year-5 balloon at ~4.4% after-tax while discounting at 5% erodes present value; the 6% "sounds" like it beats 5% but does not once taxed. The discount-rate slider is now labeled **"(after-tax)"** with a tooltip making this explicit, and the comparison card's tooltip explains that lowering the rate toward a realistic after-tax alternative (3–4%) makes the note win decisively, with tax deferral / bracket-smoothing / NIIT-avoidance on top. The discount rate is the single biggest swing factor in the cash-vs-note comparison, so surfacing its after-tax nature matters for honest seller conversations.

## A.11 Down-payment → Phase-2 rent mechanics, and a variable Phase-2 bank term (V5.3.5)

**Why a higher down payment raises Phase-2 rent (slightly, and counterintuitively).** The down payment is funded by the investors, and the co-op must return all investor capital at the buyout. A higher down payment shrinks the seller's balloon (less seller financing) but by less than it adds to investor capital, because ~85% of the seller note is still outstanding at Year 5 while investor equity does not amortize at all. Net: each extra $1 of down payment leaves ~$0.15 more principal to refinance at buyout (more in PIK mode, where the larger capital base accrues more preferred return). Concretely, moving the down payment 15%→30% at defaults changes Phase-2 rent only ~+$5/mo (current-pay) to ~+$17/mo (PIK) — real but small, and in the opposite direction from the intuition that "more down payment = less debt." The clean framing: **seller financing partly amortizes itself away before the buyout; investor equity does not — so loading the stack toward the down payment leaves slightly more to refinance.** Now surfaced in the down-payment slider tooltip.

**Phase-2 bank term is now its own variable.** The co-op's Phase-2 refinance was hardcoded to a 30-year amortization. It is a separate loan from the seller note and deserves its own term, added as `phase2AmortYears` (10–40, default 30). It is a pure Phase-2 tenant lever — it does not touch Phase 1, the seller, or the investors. Sensitivity at defaults: 15yr → $963, 25yr → $891, 30yr → $876, 35yr → $866, 40yr → $859. Stretching 30→40 years saves tenants ~$17/mo; agency/CLT-friendly programs that reach 35–40-year amortization are therefore a real affordability lever for the steady-state rent, and belong in the Phase-2 refinance conversation alongside the rate. The Phase-2 revenue-build-up row now annotates both the seller-note rate and the bank rate/term.

## A.12 V5.4 — adjustable escalators, editable inputs, legibility redesign

**Adjustable inflation escalators (blended averages).** The operating-cost escalators were hardcoded, with utilities and insurance at a flat 8%/yr *in perpetuity* — unrealistic, since the Yellow Springs water ordinance locks 8% only through 2027 and habitational insurance hard-markets soften. They are now adjustable inputs (`escUtilities`, `escInsurance`, `escPropertyTax`, `escManagement`, `escGeneral`) in an "Inflation & Escalators" group, defaulted to **long-run blended averages**: utilities 5.5% (8% near-term tapering to ~4%), insurance 5%, taxes/management 3%, other 2.5%. Effect at defaults: buyout-year opex and Phase-2 rent drop (~$876 → $845), and the Phase-1→Phase-2 jump falls from 12.2% to 8.2% — **below the 10% cliff threshold**, so the "rent cliff" was partly an artifact of assuming 8% utility inflation forever. Ground-lease escalation stays a fixed 1.5% (stewardship step, not market inflation).

**Directly-editable inputs.** Every slider's value is now a text box: click to type an exact number (currency/%/unit suffixes are parsed, so pasting "$1,600,000" works), committed on Enter/blur, clamped to range and snapped to the slider step, Escape cancels. Faster and more precise than dragging — especially for large-range inputs like FMV.

**Legibility redesign (laptop + reading-glasses).** A systematic accessibility pass for an older audience on a laptop: base font 15px; a uniform type-scale bump (9/10/11px and text-xs → 12–14px; section headings → 17px; header title → 22px; KPI values → 28px); higher-contrast tokens (`--muted-foreground` 65%→74%, brighter borders); larger controls (slider thumb 16→20px, tooltip trigger 14→20px with 14px tooltip body); wider sidebar (320→380px) with boxed inputs; roomier table rows; and KPI cards restacked into a clean 3×2 grid (value and subtitle on their own lines) instead of a cramped 6-across row. No engine-behavior change beyond the escalator defaults.

## A.13 V5.4.1 — sub-step precise entry, and disambiguating the "Note vs Cash" KPI

**Precise typed entry (grains preserved for dragging).** Editable inputs no longer snap typed values to the slider step: you can type a precise figure like 3.5% vacancy even though the vacancy slider drags in 1% grains, or 6.35% on a 0.25%-step rate. Typed values are still clamped to [min, max]; dragging the slider still moves on the step grain. A `formatPercentInput` formatter shows the sidebar's percent fields to their typed precision (up to 2 decimals, trailing zeros trimmed) so 6.35% doesn't display as "6.3%" — computed outputs (IRR, rent jump, etc.) keep the fixed 1-decimal `formatPercent`.

**"Note vs Cash" KPI relabeled (no math change).** A user found the KPI value didn't seem to line up with the "Why Not Just Take Cash?" panel. It does — the KPI equals exactly (Installment + donation) − (Cash sale + donation), the third-minus-second rows of the panel, which the panel narrative also states. The confusion was the label: "Note vs Cash" invited comparison against the panel's *top* row (a straight cash sale of the whole property), against which the note is lower — because that scenario keeps the donated land. Renamed to **"Note vs Cash Sale of Same Gift"** with subtitle "NPV, donation held fixed" and a tooltip spelling out that it isolates the *financing* choice with the donation held constant, and is not measured against the straight-cash row (whose surplus is the philanthropy, not the financing). This is the decision-relevant comparison: given the choice to donate, does carrying the note beat taking that same deal in cash?

## A.14 V5.5 — honest note-vs-cash comparison: broker costs, tax deferral, terminal wealth

Responding to a seller's question about how the NPV comparison actually works and what structuring strengthens the note case. Four additions, all in the seller comparison:

**1. Transaction / closing costs (the biggest missing piece).** An open-market cash sale pays a broker + closing (`marketSaleCostPct`, default 5.5%); the installment note and the cash-plus-donation deal are DIRECT sales to the co-op and pay only legal/title (`directDealCostPct`, default 1%). On the $1.75M-FMV example the avoided broker commission is ~$68.75k — frequently larger than the NPV gap itself, and a real, under-appreciated advantage of the structured direct deal. This narrows the straight-cash lead materially (note-vs-straight-cash NPV gap moved from −$186k to −$125k at that example).

**2. "How are we truly comparing NPV?" — a terminal-wealth view.** The NPV column already discounts after-tax flows at the seller's *after-tax reinvestment rate* (the discount slider), which is mathematically the scenario where the seller takes the cash-sale proceeds and reinvests them at that rate. To make that explicit, added a **"Wealth in Year N"** column (`comparisonHorizon`, default 20): each path's after-tax stream reinvested at the discount rate to the horizon. Terminal = NPV × (1+rate)^years, so it ranks identically to NPV — the value is showing the reinvestment head-to-head in plain dollars ("in 20 years the note leaves ~$157k more than a bifurcated cash sale, holding the gift fixed").

**3. The tax-deferral working-capital argument, made visible.** A lump cash sale pays its entire tax at closing (~$298k at defaults), so only the after-tax remainder is available to reinvest. The note pays only its Year-1 tax (~$27k), leaving the difference (~$270k) working *inside* the note at the note rate — an interest-free loan from the IRS. This is why the note can beat a cash sale even though its after-tax coupon (~4.4%) sits near the discount rate: it keeps more capital deployed. Surfaced as an explicit callout (`upFrontTaxCashSale`, `upFrontTaxNote`, `deferredWorking`).

**4. What actually helps the note case (levers, some modeled, some advisory).** Modeled: broker avoidance (#1), deferral (#3), and the discount-rate framing (#2). Advisory, discussed with the seller: (a) minimizing the down payment to the floor that still covers Year-1 tax defers more gain AND lowers tenant rent in both phases (a genuine win-win — smaller investor check → lower pref → lower Phase-1 rent, and less capital to refinance → lower Phase-2 rent); (b) a higher note rate improves the seller's after-tax yield but raises tenant rent (a real tension, not a free lunch); (c) an interest-only note maximizes deferral but concentrates the balloon-year tax and enlarges the Phase-2 refinance. The tool now lets each of these be explored directly.

The straight cash sale still leads on raw NPV/terminal — correctly, because it keeps the donated land; that gap is the philanthropy, priced honestly. The decision-relevant comparison (note vs a cash sale of the *same* bifurcated gift deal) favors the note on every measure: less up-front tax, no broker, deferral, and a positive NPV/terminal edge.

## A.15 V5.6 — property-tax abatement option (CRA / restricted-rent valuation)

Follows the seller's question about getting the county auditor to *freeze* property taxes given the sale restrictions and at-cost revenue. A freeze per se is not a mechanism Ohio law offers, but two real paths reduce the tax line for a term of years, and both flow straight through to lower tenant rent. Added them as a single modeled lever (`propertyTaxAbatementPct`, default **0 = off/not yet won**; `propertyTaxAbatementYears`, default **12**).

**The two real-world paths the one lever represents:**
1. **Community Reinvestment Area abatement (ORC 3735.65 et seq.).** A municipality (Yellow Springs) designates a CRA and grants a term abatement — commonly 10–15 years, up to 100% — on the *added value* of a qualifying residential rehabilitation. The co-op applies after the rehab is placed in service. This is the strongest, most discretionary lever: it is negotiated with the village, not the auditor.
2. **Restricted-rent / income-approach valuation (ORC 5713.03; Ohio Admin. Code 5703-25-20, effective 1/1/2026 for federally-subsidized housing).** Rather than valuing on market comps, the auditor values on the property's *actually-collectible, at-cost* rents — precisely the LEC/CLT constraint. If the auditor won't grant it administratively, it is pursued by complaint to the Board of Revision (ORC 5715.19). This is closer to the "freeze" the seller had in mind: it holds valuation down for as long as the affordability restriction runs, rather than abating a fixed term.

**Engine.** The abatement is a haircut on the **property-tax opex line only**, applied *after* escalation so abated years still track underlying valuation growth: `propertyTaxes = escalate(...) × (1 − pct/100)` for `year ≤ abatementYears`, full escalated tax after. It is deliberately isolated from the seller and investor economics — a `JSON.stringify` equality check on `seller` and `investor` before/after confirms they are byte-for-byte unchanged; only tenant rent moves. Phase 1 uses Year-1 costs (always inside a term ≥ 1); Phase 2 uses Year-(balloonYear+1) costs, so a term shorter than the buyout year correctly reverts to full tax.

**UI.** Two sliders directly under "Property taxes (per year)" (`0–100%`, `0–15 yr`). On the tenant Revenue Build-Up, the Property Taxes row now carries a status badge: green "−X% abated" on each phase where the term is active, and an amber "abatement expired" on Phase 2 when the term ends before the buyout — which, combined with the existing rent-cliff alert, makes the expiry trade-off honest and visible. A short abatement lowers early rent but *widens the Phase-1→Phase-2 cliff*; a full-term abatement (covering the buyout year) lowers both phases and does not.

**Verified numbers (V5.6 defaults, 60% abatement):** full 12-yr term → Phase-1 tax $30,000 → $12,000, Phase-2 (Year-6) $34,778 → $13,911; monthly rent $781 → ~$718 (Phase 1) and $845 → ~$772 (Phase 2). A 3-yr term abates Phase 1 identically but reverts Phase 2 to the full $34,778, lighting the CLIFF badge (+17.6% vs Phase 1). Default (0%) leaves every number identical to V5.5 — the abatement is applied for, never assumed. **Do not underwrite closing on an abatement that has not been granted.**

## A.16 V5.7 — rent policy, surplus deployment, and the Phase-2 feasibility test

The largest correction since V5. Prompted by two findings: (a) an external check that co-op blanket mortgages are underwritten more conservatively than conventional multifamily (National Cooperative Bank publishes a 55% maximum combined LTV on co-op underlying loans), and (b) the seller's decision that **rent need not be cut below today's $700** — the difference should buy something.

### The defect this fixes

Every version through V5.6 solved for a **cost-recovery rent**: revenue set to exactly cover debt service, opex and pref. That makes net operating income *identically equal* to debt service, so the debt-service coverage ratio is **exactly 1.00 by construction**. No lender refinances a break-even property; 1.20–1.25× is the normal floor. The model therefore reported an affordable rent for a deal that **could not have obtained its own Year-5 takeout loan** — and never tested for it. Affordability was being optimised against the wrong binding constraint.

### Rent policy — a floor on rent, not a cap

`rentPolicyEnabled` (default **on**) with `policyMonthlyRent` (default **$700**, today's rent). The co-op charges **the greater of the policy and its cost floor** — a co-op cannot elect to collect less than its costs, so surplus is never negative. Where the policy sits *below* the floor the promise simply cannot be honoured: `policyBelowCostFloor` fires, `shortfallPerUnitMonth` reports how far short, and tenants pay the floor regardless. That is the case at stock V5.6 defaults, where the floor is **$781** — the $700 policy only becomes honourable once the operating levers bring costs down.

Phase 2 obeys the same rule, so where the policy binds in both phases tenants experience a genuinely **flat rent across the buyout** and the rent cliff disappears from their experience (verified: $700 / $700, 0.0% drift, against cost floors of $675 and $694).

### Surplus deployment

Surplus accrues only in years 1..buyout, while the seller note is outstanding, and splits three ways (shadow equity takes the remainder, so shares always total 100%):

- **Extra seller-note principal** (default 60%) — applied once at each year end, inside the amortisation loop. The balloon is now taken from the schedule's actual ending balance rather than the closed-form `remainingBalance()`, which extra principal makes wrong. Verified: $21,353 of extra principal removes **$24,155** from the balloon — the excess is compounded interest saved.
- **Capital reserves** (default 25%) — accumulate as the co-op's own cash and are **deliberately NOT netted against the refinance**. A reserve that gets spent is not a reserve, and most lenders escrow replacement reserves as a condition anyway.
- **Shadow equity** (remainder, 15%) — credits members for the capital their above-floor rent contributes. Documented as **non-redeemable or deeply capped**: a cash-redemption right is a balance-sheet liability a refinance lender discounts, and it can collide with the CLT ground-lease resale formula. CPA to confirm it does not disturb Subchapter T / § 216 treatment.

### Phase-2 feasibility test

New `FeasibilityMetrics` tests the refinance against **both** lender constraints and reports the supportable loan as the lesser: max LTV against `stabilizedValue` (default $1.45M, CONFIRM BY APPRAISAL), and min DSCR (default 1.20×) against buyout-year NOI. The excess is a **financing gap in dollars** — which sizes the grant requirement instead of leaving it to assumption. `bindingConstraint` names which test binds; at every configuration tested it is DSCR, not LTV, which is the opposite of the intuition that drove earlier grant sizing.

Engine-verified ladder (stabilized value $1.45M, 75% LTV, 1.20×):

| Configuration | Refi | LTV | DSCR | Gap |
|---|---|---|---|---|
| V5.6 defaults (cost recovery) | $894,750 | 62% | **1.00** | $149,125 |
| + conservative ops, $700 policy | $870,596 | 60% | 1.03 | $126,227 |
| + 16-yr note amortisation | $848,549 | 59% | 1.10 | $67,866 |
| + $315k grants at buyout | $555,596 | 38% | 1.69 | **$0** |

### Seller effect

Extra principal is NPV-neutral to the seller and improves current income: through the balloon he receives **+$17,082 more in years 1–4**, with total cash essentially unchanged (−$2,802, being interest he no longer earns on a faster-declining balance). Donation absorption is untouched — the $430k gift stays fully absorbed at 98.3% utilisation, $0 expired, in every configuration.

### Regression safety

`rentPolicyEnabled: false` reproduces V5.6 **exactly** — Phase 1 $781, Phase 2 $845, refinance $894,750, no surplus deployed, balloon equal to the closed-form baseline. 25 engine assertions, all passing.

### Known limitation, deliberately not modelled

The abatement's own expiry lies outside the model's window: a 60% CRA abatement on a 3%-escalating base steps the tax line up roughly **$25,700/yr in year 13** (~$89/unit/month). The dashboard's horizon ends at the buyout, so this is documented rather than displayed, and is the strongest argument for pairing the CRA with the restricted-rent valuation of A.15, which does not expire on a clock.

## A.17 Operating comparable: Greenmont Mutual Housing Corporation (Kettering)

Full write-up in **docs/COMPARABLE-GREENMONT.md** (sources and retrieval date recorded there). Greenmont Village is a 500-unit resident-owned cooperative ~20 minutes from the subject property, built 1941–42 under the Federal Works Agency's Mutual Home Ownership Plan and sold to a resident non-profit corporation in 1947. It has operated continuously for 84 years. Five findings bear directly on this model:

1. **Member equity is benchmarked at $3,500/unit** (plus a $100 membership fee) — $87,500 across 25 units, inside the $75k–$125k band already tested, which moved investor IRR 7.3% → 12.1% while lowering rent in both phases. Member share capital is standard practice in this market, not a theoretical lever.
2. **Affordability was preserved by the no-resale rule, not by a land trust.** Greenmont holds its own land title and has no CLT, yet has stayed affordable since 1947 because members cannot buy or sell units; transfer is by beneficiary designation after ten years. This corrects an earlier working assumption in this project — the co-op's own bylaws do more of the affordability work than the ground lease does. The CLT's distinct value is protecting the land if the co-op ever fails or converts, which remains worth having.
3. **The 1947 monthly-fee formula is our cost-recovery stack, line for line**: amortisation, mortgage interest, depreciation, repairs, insurance, *vacancy losses*, operating expenses, taxes, and a *reserve account*. The vacancy gross-up and replacement reserve that V5 added over V4's objection have been in continuous use since 1947.
4. **Self-management is not available to us at this scale.** Greenmont self-manages 500 units *and* employs a property/maintenance manager plus staff, across nine standing committees. Twenty-five units cannot spread that overhead; management should be modelled as a contracted or shared service. Shared administration with Greenmont is worth pursuing on its own merits, and they would be a credible co-op reference for a Phase-2 lender.
5. **We cannot underwrite by selection.** Greenmont admits on FICO ≥630, income minimums, DTI ≤40%, and clean criminal/bankruptcy records. A conversion-in-place inherits its residents, so our credit and collection risk is structurally higher. The 4% vacancy/bad-debt allowance is likely optimistic for the transition years and reserves should sit at the deeper end — raised here as a defaults question, deliberately **not** changed unilaterally.

Also confirming A.15: Greenmont carries property taxes inside its dues. An 84-year-old non-profit housing cooperative in the same metro is on the tax rolls, which is real-world evidence that the ORC 5709.12 charitable-exemption path is a long shot and the CRA / restricted-rent-valuation route is the realistic one.

## A.18 V5.8 — member share capital, priced against displacement risk

Builds the lever quantified in A.17 and prices it deliberately **below** the Greenmont benchmark. Three inputs: `memberSharePrice` ($2,000), `memberShareParticipationPct` (80%), `shareAssistancePct` (40%).

### Why $2,000 and not $3,500

Greenmont charges $3,500 (docs/COMPARABLE-GREENMONT.md), but Greenmont **admits by selection** — FICO ≥630, income minimums, DTI ≤40%. A conversion-in-place inherits its residents and cannot screen, which is the entire point. At the $700 policy rent, $3,500 is 4.6 months of rent; **$2,000 is 2.6 months**, or $83/mo over 24 months and $56/mo over 36. The share price is the gentrification lever in this structure: set it where sitting tenants can reach it, or the project becomes the thing it exists to prevent.

### Mechanics

Member equity is applied at closing **before** grant money, because it is committed and certain while grants are speculative. It replaces investor capital 1:1, earns **no preferred return**, is refundable **at par** on exit (limited equity — no appreciation), and is **not** repaid at the buyout, so it permanently shrinks the Phase-2 refinance. Total is clamped at the deal's capital need, with a UI warning when a price exceeds what the co-op can productively absorb.

### Engine-verified effect ($2,000 × 80% of 25 homes = $40,000)

| | without shares | with shares |
|---|---|---|
| Investor capital | $303,000 | $263,000 |
| Investor IRR (REPS) | 7.3% | **8.5%** |
| Phase-1 cost floor | $781 | $771 |
| Phase-2 cost floor | $845 | $833 |
| Phase-2 refinance | $894,750 | $854,750 |
| Financing gap | $149,125 | $142,458 |

**Read this honestly: $40,000 moves the rent floor only about $10/unit/month.** Member shares are not primarily a rent lever at this price — the pref they displace is small. Their real value is $40,000 straight off the Year-5 takeout and +1.2 points of investor IRR, which is takeout de-risking and investor compensation rather than affordability. Anyone presenting this to members should say so plainly; overselling the rent effect would be a false promise.

**The assistance ask is small and that is the good news.** At 40% of shares, outside help totals **$16,000** — a realistic request to the Yellow Springs Community Foundation, Home Inc., or a revolving share-loan fund, and two orders of magnitude easier than the ~$315k grant target. A revolving fund is the strongest form: because shares refund at par, departing members repay the fund and it recycles to the next household that needs it.

### Anti-displacement terms (deal documents, not model inputs)

Recorded here because the model cannot enforce them and they are the difference between this structure and a displacement:

1. **Buying a share is never a condition of staying.** Non-purchasing households remain residents at the **same rent** and may join later. Participation below 100% is the expected case, not a failure — hence an 80% default rather than 100%.
2. **No screening of sitting tenants** — no income minimum, no credit score, no background requirement. This is the sharpest departure from Greenmont, and it is intentional.
3. **Multiple paths to a share**: cash, 24–36 month installments, sweat-equity credit, or assistance.
4. **Admission preference for people who live or work in the village**, so turnover does not quietly move the community upmarket over a generation.
5. **Shares refund at par, never at market.** This is the mechanism — not the CLT — that has held Greenmont affordable since 1947.

## A.19 V5.9 — cash offer ≠ appraised FMV; plus verdicts on § 179D, § 45L and USDA

### A.19.1 § 179D — Twin Coach is TOO SHORT, not eligible

Earlier shorthand in this project ("garden apartments under 4 stories") was ambiguous. Stated plainly: **§ 179D requires four or more storeys** for residential rental property. The deduction reaches property "within the scope of ASHRAE Standard 90.1," and 90.1 expressly **excludes low-rise residential — three storeys or fewer above grade**. Twin Coach at a maximum of three storeys falls outside 90.1 and is therefore **outside § 179D**. Height disqualifies it. **REJECTED.**

### A.19.2 § 45L — right threshold, wrong calendar: the credit is already gone

§ 45L is the mirror image of § 179D: it applies to dwelling units in buildings of **three storeys or fewer**, which is exactly Twin Coach, and § 45L(b)(2) reaches **substantial reconstruction and rehabilitation**, not only new construction. Multifamily rates run $500–$1,000/unit, rising to $2,500–$5,000/unit where prevailing-wage requirements are met. On the merits this was the right credit for this building.

**But OBBBA (P.L. 119-21, 4 July 2025) accelerated its expiration from 31 Dec 2032 to 30 June 2026**, and a rental unit is "acquired" for § 45L purposes when it is leased. As of this writing (July 2026) that date has passed. **EXPIRED — do not underwrite it.** Recorded here so nobody rediscovers § 45L in six months and mistakes it for live money.

### A.19.3 USDA rural eligibility — an earlier statement in this project was WRONG

An earlier working note asserted that "Greene County sits in the Dayton MSA, which very likely disqualifies on rural eligibility." **That is incorrect and is withdrawn.** The § 520 rural test is:

> an area of **no more than 10,000 residents**; *or* an area of **10,001–20,000 residents** that is **not** located in a Metropolitan Statistical Area.

The MSA exclusion applies **only to the 10,001–20,000 band**. Yellow Springs, at roughly 3,700 residents, sits under the 10,000 threshold outright, so **MSA membership never reaches it**. Eligibility is determined per-address on the USDA eligibility map, not by county, and must be confirmed there — but the population test does not disqualify this property, and the earlier note wrongly closed off a live option.

**§ 515 remains a dead end** (no meaningful new-loan appropriation for years; it survives essentially as preservation/transfer of existing § 515 properties, which Twin Coach is not). **§ 538 is the live programme** — a guarantee of up to 90% of a private lender's loan, permitting terms conventional lenders will not, with tenant income ≤115% AMI at initial occupancy and average project rent ≤30% of 100% AMI.

**The § 538 restrictions do not bind us at all.** At a Dayton-area AMI of $70–90k the rent cap computes to $1,750–2,250/month against our $700–780 — an order of magnitude of headroom — and ≤115% AMI is a high ceiling our residents clear easily. Compare that with LIHTC's 30-year compliance or HOME's Davis-Bacon exposure.

And it attacks the binding constraint directly (ops stack, $700 policy):

| Phase-2 takeout | P2 cost floor | Debt service | DSCR | Financing gap |
|---|---|---|---|---|
| Conventional 7% / 30yr | $698 | $65,553 | 1.01 | $132,203 |
| CDFI 6.25% / 35yr | $672 | $57,845 | 1.14 | $40,410 |
| **§ 538 6.0% / 40yr** | $659 | $54,213 | **1.22** | **$0** |
| § 538 5.5% / 40yr | $647 | $50,819 | 1.30 | $0 |

**A § 538-guaranteed takeout closes the financing gap on its own, with no grants.** That makes confirming the address on USDA's eligibility map, and identifying an approved § 538 lender, the highest-value outstanding diligence item in the deal — ahead of the grant applications.

### A.19.4 Cash offer decoupled from appraised FMV (`cashOfferPrice`)

The comparison previously assumed a cash buyer pays appraised FMV. Real cash offers routinely land 5–15% below appraisal: the buyer prices speed, certainty, as-is condition and their own required return, while an appraisal assumes reasonable exposure time a quick sale never gets. New input `cashOfferPrice` (**0 = use FMV**, so the default reproduces prior behaviour exactly) drives **only** the straight-cash row — never the § 170 donation, never the co-op's contract price.

The effect is large. At FMV $1.8M with a real $1.6M cash offer, the note moves from **$59,152 behind** a straight cash sale to **$76,248 ahead** — a **$135,400 swing** — because the honest question is "the note versus the cash Paul can *actually get*," not "the note versus a theoretical appraisal."

**Two cautions carried in the tooltip.** (1) A contemporaneous arm's-length cash offer is *evidence of fair market value*; claiming a high FMV to support a large charitable deduction while accepting a materially lower price is a pattern the IRS scrutinises hard, and the land appraisal must stand on its own facts. (2) There is nonetheless a legitimate reason the parts need not sum to the whole: the co-op buys **improvements on leased land**, and a leasehold interest is generally worth less than a fee-simple residual. The donated parcel and the sold improvements each require their own appraisal — neither should be derived by subtracting from the other.

### A.19.5 Cash at closing

Added `cashAtClosing` to every comparison scenario and a column to the seller table. NPV and terminal wealth answer "what am I worth in the end"; sellers usually ask "what do I bank next month" first, and the installment note's answer is deliberately much smaller (down payment less Year-1 tax and legal/title) with the remainder arriving over the term with interest. At FMV $1.8M / $1.6M offer: straight cash **$1,120,485**, cash+donation **$1,120,683**, installment **$236,517**. Showing this honestly is better than letting a seller discover it at the closing table.

## A.20 V5.10 — audit of NPV, both recapture mechanics, and PIK (two PIK corrections)

Requested as a comprehension check across four mechanics. Each was re-derived against the engine rather than described from memory; two real defects were found in PIK and fixed. Seller recapture, investor recapture and the NPV conventions audited **clean**.

### A.20.1 NPV — one convention, applied to all three rows

| | Cash at closing | Nominal | NPV | Wealth Yr 20 |
|---|---|---|---|---|
| Straight cash sale | $883,535 | $883,535 | $883,535 | $2,344,281 |
| Cash sale + CLT donation | $675,958 | $702,508 | $698,947 | $1,854,515 |
| Installment + CLT donation | $147,365 | $872,899 | $758,147 | $2,011,590 |

The rules, now surfaced in a `npvMethod` tooltip on the comparison card:

1. **Every flow is after tax** — each path's own tax is subtracted before discounting.
2. **One discount rate**: the seller's after-tax reinvestment rate (the slider).
3. **Year 1 is time zero in every row.** All three paths receive their first dollars at closing, so closing-day money is undiscounted. (Discounting the note's down payment a full year while leaving the cash rows undiscounted was the V5.3.4 bug.) Verified independently: recomputing the installment NPV as `Σ cf_i /(1+r)^i − direct cost` reproduces the engine's figure to the dollar.
4. **Straight cash NPV = nominal by construction** — a single closing-day flow. Not a bug.
5. **Cash+donation** = closing-day proceeds plus later-year § 170 benefits, each discounted from its own year.
6. **Installment** discounts the whole after-tax schedule, including post-balloon years whose only flow is a charitable deduction benefit.
7. **Wealth-in-Year-N = NPV × (1+r)^N** — verified for all three rows. It ranks paths identically to NPV; its only job is to state the reinvestment assumption in dollars.

### A.20.2 Paul's recapture — clean, and the ordering is the point

At defaults: contract price $820,000, sold adjusted basis ~$0 (a building held since 1993 is fully depreciated), gross profit $820,000, GPR 100%. Of that, **$356,250 is unrecaptured § 1250** (25% rate) and **$463,750 is LTCG**.

Verified: recognized gain sums exactly to gross profit; the 25% bucket sums exactly to unrecaptured § 1250; and the two buckets sum to total gain.

The **Reg. § 1.453-12 front-loading is visible in the schedule** — 25% dollars are consumed first, and the cheaper LTCG dollars only appear once the 25% bucket is exhausted:

| Year | Gain recognized | at 25% | at LTCG |
|---|---|---|---|
| 1 | $141,608 | $141,608 | $0 |
| 2 | $19,756 | $19,756 | $0 |
| 3 | $20,975 | $20,975 | $0 |
| 4 | $22,268 | $22,268 | $0 |
| 5 (balloon) | $615,392 | $151,642 | $463,750 |

Two consequences worth stating to the seller. **There is no § 453(i) bomb**: Year-1 25%-rate gain is $141,608 of the $356,250 total, not all of it — § 453(i) reaches ordinary § 1245/§ 1250 recapture, and straight-line residential realty generates none. And **the balloon year is the big tax year**, which is exactly why § 170 capacity should still be available to meet it.

### A.20.3 Investor recapture at the buyout — clean

| | |
|---|---|
| Depreciable basis (contract price + CapEx) | $1,000,000 |
| Depreciation taken (Y1 bonus $295,000 + SL) | $423,182 |
| Adjusted basis at exit | $576,818 |
| Formula sale price (balloon + capital) | $854,750 |
| **Exit gain** | **$277,932** |
| § 1245 ordinary @ 35% | $147,500 |
| Unrecaptured § 1250 @ 25% | $130,432 |
| LTCG @ 15% | $0 |
| **Exit tax** | **$91,876** |

Verified: tranches sum to the gain; the ordinary tranche is capped at short-life depreciation × the exit allocation; ordinary + 25% never exceeds depreciation taken; and the tax recomputes exactly as ordinary@marginal + 25% + 15% + flat state on the whole gain.

The headline for investors: **bonus depreciation is a loan against their own future gain.** $423,182 of write-offs erodes basis by the same amount, and a price of merely balloon-plus-capital still throws off $277,932 of gain. The LTCG tranche is $0 because a formula-price exit forecloses appreciation — the entire gain is recaptured depreciation.

**A naming trap fixed:** `investor.purchaseBasis` is the contract price only ($820,000), while the *depreciable* basis is contract price + CapEx ($1,000,000). Subtracting the wrong one overstates depreciation and produces a false recapture failure. The exit object now exposes `depreciableBasis` and `totalDepreciationTaken` explicitly.

### A.20.4 PIK — two corrections

**Correction 1 — PIK now COMPOUNDS.** The model accrued unpaid preferred as `capital × rate × years`, which is *simple* accrual. "Paid in kind" means the unpaid preferred is added to the investors' balance and thereafter earns preferred itself. At defaults that understated the accrual by **$13,821** ($92,050 simple vs **$105,871** compounded). Now `capital × ((1+rate)^years − 1)`.

**Correction 2 — accrual runs to the BUYOUT, not the note term.** The accrual window used `lastNoteYear`. When the seller note fully amortizes before the buyout (`balloonYear >= noteTermYears`) there is no balloon, but the investors are still outstanding and still earning. With a 5-year note and an 8-year buyout the model accrued only 5 years. Both the accrual window and the investor exit year now follow `balloonYear`. The default case is unaffected (the two coincide).

**The trade, stated plainly** — and it is worse than the old numbers implied:

| | Current-pay | PIK |
|---|---|---|
| Phase-1 rent | $771 | **$707** |
| Phase-2 refinance | $854,750 | **$960,621** |
| Financing gap | $142,458 | $160,104 |

PIK saves roughly **$92,050** of rent across five years and adds **$105,871** to the takeout — a **net cost of $13,821**, which is precisely the compounding. It also pushes LTV and coverage the wrong way at the moment the deal is most fragile, and the refinance — not Phase-1 rent — is this deal's binding constraint.

PIK is still the strongest single lever on Phase-1 rent, and it is legitimate when tenants need immediate relief **and** there is a concrete plan (grants, member shares, faster principal, a § 538 takeout) to shrink the Year-5 burden. It is not free, and it should never be used to make a launch pro forma look good. Investors are taxed on the accrued preferred as **ordinary income** when it is finally paid.

## A.21 V5.11 — triage of the July 2026 external review ("operational fiction")

An outside reviewer argued the model "optimizes for tax geometry while ignoring concrete operational physics." Four specific claims. **Two are correct and are now implemented; one is factually wrong about this model but right in direction; one is partly right.** Verdicts below, each checked against the engine rather than accepted or dismissed on tone.

### A.21.1 "The utility baseline is a fantasy — the model allocates $600/unit/yr" — PREMISE WRONG, DIRECTION ACCEPTED

The model's default was **$1,150/unit/yr ($96/month)**, not $600. The reviewer's stated baseline is off by nearly 2×, and the headline consequence ("understates OpEx by $20,000–$30,000 annually… erases $428,000 of exit valuation") is correspondingly inflated: the true gap to their own recommended $1,500 floor is $350/unit/yr, or $8,750/yr across 25 units.

**But the direction is right and the reviewer wins the argument on the merits.** Yellow Springs has had the region's most expensive water since 2017; reporting puts the average household combined water+sewer bill near **$237/month**, with lower-usage households around $94/month for water alone, and ordinance increases landed in January 2026 with another due in 2027. Apartments consume well below a single-family home, but $96/month all-in for water, sewer, trash and common-area electric was thin for this village.

**Default raised $1,150 → $1,500/unit/yr.** Effect: Phase-1 cost floor $771 → **$802**, Phase-2 $833 → **$873**. Flagged in the tooltip as a **diligence item, not an estimate** — the real answer is the Village's apartment-class rate schedule plus Paul's last twelve months of actual bills.

### A.21.2 "The valuation paradox" — CORRECT, AND THE STRONGEST POINT. IMPLEMENTED

The criticism: A.15 pitches a *restricted-rent* valuation to suppress assessed value for property-tax purposes, while A.16 tested the refinance against a $1.45M "stabilized" market value. You cannot claim a low value at the auditor and a high one at the bank — a takeout appraiser valuing a property encumbered by a ground lease and at-cost rents will use the restricted income approach.

This is right. The old $1.45M default implied a **4.71% cap rate** on the restricted NOI, which is not a Class-C 1968 garden apartment in a village of 3,700. (The model's own `stabilizedValue` tooltip already warned about exactly this; the *default* contradicted the warning — a fair hit.)

**Implemented:** new `exitCapRate` input (default 7.0%); `stabilizedValue` becomes an **override with 0 = derive**, and the default is now **derived** as Phase-2 NOI ÷ cap rate. The feasibility panel carries a valuation cross-check that reports the income-approach value, and when an override is supplied it reports the **implied cap rate** and flags divergence above 1.15×. The old $1.45M now displays as **1.49× the income-approach value at a 4.71% implied cap** — visible rather than buried.

At the new defaults the derived value is **$974,858**, LTV **88%** — failing. Cap-rate sensitivity:

| Cap rate | Derived value | LTV | Gap | Binding |
|---|---|---|---|---|
| 6.5% | $1,049,848 | 81% | $142,458 | DSCR |
| 7.0% | $974,858 | 88% | $142,458 | DSCR |
| 7.5% | $909,868 | 94% | $172,349 | **LTV** |
| 8.0% | $853,001 | 100% | $214,999 | **LTV** |

The reviewer's "$300k+ hole" overshoots at realistic cap rates (the gap stays DSCR-bound at $142,458 through 7%), but the direction and the seriousness are correct.

**A perverse dynamic this exposes, which neither we nor the reviewer had named:** under cost-recovery rent, *making the deal cheaper lowers the appraised value*. A § 538 takeout drops debt service, which drops the cost floor, which drops collected rent, which drops NOI — and the derived value falls from $974,858 to $806,220. Cheaper debt buys less loan capacity. The escape is the **rent policy**: holding rent at the policy level instead of falling to the cost floor keeps NOI up. The $700 policy therefore does *triple* duty — affordability promise, DSCR cushion, and appraisal support.

The combination that actually clears: **§ 538 at 6%/40yr plus ~$315k of grants → LTV 77%, DSCR 1.37, gap $15,368.**

### A.21.3 "Debt-vs-equity recharacterization" — CORRECT AND SERIOUS. DILIGENCE ITEM, NOT A MATH FIX

Fixed 7% preferred + no upside participation + return of capital at a formula price is a profile the IRS can recharacterize as **debt**. If it is, the investors lose § 168(k) entirely, the tax alpha vanishes, and the capital does not close. This is the single largest *structural* risk in the deal and it is not something the engine can compute.

Mitigating factors already in the design, and the ones that need counsel:
- The exit is an **option held by the co-op, not a mandatory redemption** — no fixed maturity is among the strongest equity factors (already a locked design decision, A.6).
- Investors bear **real loss risk**: nothing guarantees the Year-5 refinance, and this model exists precisely because that refinance is uncertain.
- **PIK accrual is more debt-like** than current-pay; that is a further argument against defaulting to it.
- Consider granting **some upside participation**, however small, purely as an equity indicium.
- § 704(b) **substantial economic effect** must independently support allocating the depreciation to investors.

Added to the diligence list at the top of the risk stack, alongside the Phase-2 takeout.

### A.21.4 "The CapEx illusion — $7,200/door" — PARTLY RIGHT

$180,000 ($7,200/door) is light for a 1968 building, and the reviewer is right that a Year-5 commercial Property Condition Assessment will look for end-of-life mechanicals. Two corrections to the framing: this is a **preservation conversion, not a repositioning**, and **Davis-Bacon triggers only if HOME funds are used** — optional here and defaulted to $0.

Sensitivity, since the sliders already allow it:

| CapEx | Investor capital | IRR | P1 floor | Gap |
|---|---|---|---|---|
| $7,200/door | $263,000 | 8.5% | $771 | $142,458 |
| $15,000/door | $458,000 | 7.5% | $819 | $174,958 |
| $20,000/door | $583,000 | 7.1% | $849 | $195,792 |

Default unchanged — it is a user judgment the sliders expose — but the reviewer's separate point about **reserves** lands: $400/unit/yr is thin for this building, and $500–600 is the defensible range.

### A.21.5 "Rents suppressed via a policy floor of $700" — MISREADS THE MODEL

The policy is a floor on **rent**, not a cap: the co-op charges the greater of the policy and its cost floor, and a policy below the floor is reported as unhonourable rather than applied. At defaults the cost floor is **$802 > $700**, so `policyBelowCostFloor` already fires and tenants pay $802. The reviewer's recommendation — "this will instantly show that a $700 rent policy cannot be maintained" — describes behaviour the model already had (A.16).

Similarly "artificially elevate the IRR to ~7.3%": bonus depreciation is statutory, not artificial, and the figure was already 8.5% after member shares (A.18).

### A.21.6 Verdict

The review's closing line — *"stop polishing the depreciation schedule until the building can actually afford its own water bill"* — is unfair to the model's actual state but correct about priority. Its two real contributions are the **valuation paradox**, which was a genuine internal contradiction between A.15 and A.16 and is now resolved in favour of the restricted income approach, and the **debt-vs-equity recharacterization risk**, which is now on the diligence list. Both improve the model. The utilities claim was wrong about our number and right about our judgment.

## A.22 V5.12 — triage of the July 2026 peer review; feature freeze

Archived at `docs/REVIEW-2026-07-perplexity.md`. This is the strongest review the project has received: specific, fair, credits what works, and its central instruction is correct — **the remaining risk is legal and takeout-related, not mathematical.** Feature work on the engine is now frozen; the deliverable is `docs/CLOSE-OR-RESTRUCTURE.md`.

### A.22.1 Accepted and implemented — defaults discipline

The review's sharpest *actionable* point: the model kept flattering toggles ON while its own prose called them CPA-confirm items, and twice agreed a default was thin without moving it. Fixed. The printed base case is now the conservative one, with tax alpha shown as upside:

| Default | Was | Now | Why |
|---|---|---|---|
| `investorHasREPS` | **true** | **false** | REPS is a fact about a named investor (documented hours, material participation), not a setting. Marketing a REPS IRR without one is capital-raise fiction. |
| `ohioBIDConfirmed` | **true** | **false** | "CPA-confirm" means do not assume it. |
| `reservesPerUnit` | $400 | **$550** | A.17 already conceded $400 was thin for a 1968 building; lenders escrow reserves anyway. |
| `vacancyRate` | 4% | **6%** | A.17 already conceded 4% was optimistic for a conversion that inherits residents and refuses screening. |
| `prefCurrentPay` | true | true | PIK was already off — correctly. |

Effect at defaults: Phase-1 cost floor $802 → **$832**; seller lifetime note tax $133,263 → **$149,108**; **Year-1 investor refund $92,050 → $0**, because a passive investor's losses suspend under § 469 until the exit. The investor card now tells the passive story by default and labels the REPS figure as conditional on a named qualifying investor.

That $0 is the honest headline. The whole "get a large share back within twelve months" narrative was REPS-only and was being printed as though it were the base case.

### A.22.2 Accepted and implemented — OBBBA charitable benefit cap

The review asked whether the engine reflects OBBBA's 2026 tightening of the *value* of itemised charitable deductions for top-bracket payers (commonly described as a 35-cent cap). It did not. Added `TAX_POLICY.CHARITABLE_BENEFIT_CAP = 0.35`, applied wherever a charitable dollar offsets **ordinary** income (annual schedule and both lump-sum comparison scenarios). The capital-gain offsets at 25%/20%/15% are unaffected, being already below the cap.

Non-binding at the default 24% seller bracket; it bites only above 35%. Verified: lifetime note tax at a 37% bracket rises from the uncapped path, while 24/32/35% are unchanged.

### A.22.3 Checked and found NOT to bind — § 461(l)

The review flags excess-business-loss limitation as "simplified away." Checked: **§ 465 at-risk already caps the Year-1 deduction at cash contributed — $263,000 at defaults — which sits below the ~$313k single / ~$626k MFJ § 461(l) thresholds.** The at-risk rule pre-empts § 461(l) at this deal's sizing. It would bind if investor capital rose materially or if a member aggregated other business losses; recorded as a named limitation rather than modelled, consistent with the freeze.

### A.22.4 Accepted, NOT coded — deliberately

Each of these is correct and each is a *counsel or diligence* item, not a slider. Coding them would be exactly the "depreciation theatre" the review warns against. All are now Tier 1/2 line items in `docs/CLOSE-OR-RESTRUCTURE.md`:

- **Entity stack as a first-class workstream** — who holds title Years 0–5; how the syndicate becomes a tenant LEC without a taxable transfer or broken installment characterisation; securities (Reg D + Ohio blue sky) on *both* the investor raise and member shares; § 216/Subchapter T during the hold. Correctly identified as the largest unmodelled failure mode.
- **Debt-vs-equity under-mitigated** — the review is right that naming the risk (A.21.3) is not mitigating it. Added as design work: thin promote or residual share above a hurdle, governance rights, written opinion as a *closing condition*, and striking any date-certain return-of-capital language.
- **Physical reality** — PCA, lead/asbestos/accessibility, insurance *bindability* (not trend), working capital and renovation-period vacancy.
- **Conversion politics** — collections through conversion, the legal path for non-buying households, board capacity and D&O, and the dual-class occupancy risk created by "buying a share is never required to stay" if it is not carefully drafted.
- **Capital-market reality** — mission-aligned *and* REPS-qualified *and* content with a single-digit tax-aware IRR carrying refinance and recharacterisation risk is a thin buyer pool. "Without a named capital plan, IRR decimals are decorative" is fair, and the passive-by-default change is the model's half of the answer.

### A.22.5 Noted with qualification

- **QBI defaulting on** — largely moot now: § 199A applies on REPS profit years, and REPS defaults off. Left un-toggled rather than adding a control during a freeze.
- **Cost-seg 25% short-life share** — already flagged as the aggressive end of the 20–30% band and study-dependent; unchanged.
- **Grant/basis characterisation** — already carried as a CPA-confirm; the review correctly upgrades it from modelling choice to drafting conclusion. Now a Tier 1 item.
- **"Ohio gives no charitable deduction" / municipal tax** — fair to demand periodic reconfirmation rather than treating a tooltip as eternal. Added to the counsel memo scope.
- **§ 538 caps "don't bind at all"** — the *rent* math is easy (cap $1,750–2,250/mo vs $700–800), but occupancy rules, average-rent tests and rehab hard-cost minimums can still bind in underwriting. A.19.3's phrasing was too breezy; corrected here and in the checklist.
- **Float64** — the boundary stays bright: fine for a dashboard, wrong the day anything exports filing-grade schedules.

### A.22.6 Where the review slightly overshoots

- **"Self-management to $718 overstates the end state"** — agreed on substance, and A.17 already said 25 units cannot self-manage like Greenmont's 500. The $718 figure came from A.7's V5.3.1-era ladder, which predates that finding; it is superseded, not defended.
- **"Rehab minimum … $7,200/door may not match a real PCA"** — correct as a § 538 program concern, and already carried as sensitivity (A.21.4). The default stays a user judgment the sliders expose, now paired with a Tier 1 PCA requirement.

### A.22.7 Verdict

Two of the review's contributions changed the model: **defaults discipline** (the printed base case was quietly optimistic in four places) and the **OBBBA charitable cap**. Everything else it raises is correct and belongs to counsel, a lender, an appraiser, or a named investor — not to the engine.

Its bottom line is adopted verbatim as project policy: *freeze feature work; run a six-week close-or-restructure sprint on takeout lender reality, tax/structure opinion, actuals + PCA + insurance, appraisal scopes, and named capital.* The engine is sufficient for that job.

## A.23 V5.13 — the investor syndicate becomes a toggle (and may be net-negative)

Raised by the project owner: the REPS-qualified people actually reachable are *already* running paper losses from other property, so more deductions have no marginal value to them; and a passive investor cannot use the depreciation currently at all. If nobody in the real buyer pool can use the tax shield, the syndicate is paying a preferred return and consuming a Year-5 capital return in exchange for a benefit that no one banks.

That is correct, and the model should be able to test the deal without investors. New `investorsEnabled` master switch (default **true**, so nothing silently changes).

### A.23.1 Can a passive investor be made to benefit? Honestly, no

- **§ 469** suspends passive losses until disposition. They release in full at the Year-5 exit — which is why the passive IRR (6.1%) sits below the REPS IRR (9.0%). The deduction is not lost, it is deferred five years, and the time value of that gap *is* the tax alpha.
- **Passive income from other activities** is the one real answer: an investor with other rentals or LP income can absorb these losses currently. That is a search criterion for investors, not a structural fix.
- **§ 469(i)'s $25,000 allowance** phases out between $100k and $150k MAGI — irrelevant to anyone writing a meaningful cheque.
- **No clean workaround exists.** Short-term-rental treatment does not apply to apartments; grouping elections cannot manufacture REPS; and recharacterising the interest as debt to create portfolio income is precisely the failure mode A.21.3 warns about.

So the owner's read stands: unless a specific investor either qualifies as a real-estate professional *with unused capacity* or has other passive income to shelter, the syndicate's tax premise is theoretical.

### A.23.2 What the switch does

**OFF:** no investor capital, no preferred return charged to rent, no bonus depreciation, no capital returned at the buyout — so the Year-5 refinance carries **the seller balloon alone**. Whatever the deal still needs at closing is reported as a **closing capital gap** rather than silently assumed. The investor card is hidden entirely.

Verified: seller economics are byte-for-byte identical either way; the gap when OFF equals exactly the capital investors would have contributed.

### A.23.3 The finding — the syndicate looks net-negative here

Same inputs, switch flipped:

| | Investors ON | Investors OFF |
|---|---|---|
| Investor capital | $263,000 | $0 |
| Closing capital gap | $0 | $263,000 |
| Preferred return in rent | $18,410/yr | $0 |
| Phase-1 cost floor | $832 | **$767** |
| Phase-2 refinance | $854,750 | **$591,750** |
| Phase-2 financing gap | $142,458 | **$98,625** |

The syndicate buys $263,000 of closing capital and costs $18,410/yr of rent plus a $263,000 capital return at the buyout — which is most of why the Year-5 refinance is unfinanceable. Remove it and both the rent floor and the takeout improve immediately. The trade is that the $263,000 must come from somewhere else.

### A.23.4 It can come from somewhere else — the capital need collapses

| Configuration | Capital need | Member shares | Closing gap |
|---|---|---|---|
| As-is (15% down, $180k CapEx) | $303,000 | $40,000 | $263,000 |
| 5% down, phase the renovation | $41,000 | $40,000 | $1,000 |
| + shares at 100% participation | $41,000 | $41,000 | **$0** |

**A $2,000 member share at full participation funds a 5% down payment outright.** Paul's headroom stays positive ($24,454 against a $16,546 Year-1 tax), so the down payment still covers his tax.

Stacked with the § 538 takeout and the operating levers:

> **No investors · closing gap $0 · Phase-1 $709 · Phase-2 $653 · refinance $361,368 · DSCR 1.55 · financing gap $0**

That is the first configuration in this project's history that clears **both** phases with no financing gap and no reliance on a tax investor.

### A.23.5 What it costs — stated plainly

1. **No renovation at closing.** $0 CapEx means the 1968 building's deferred maintenance is funded later from surplus, reserves or grants. For a property that needs a PCA, this is the real trade, and it argues for pursuing rehab grants *before* closing rather than after.
2. **Paul receives far less at closing** — a 5% down payment is $41,000 against $123,000 at 15%. His NPV is largely preserved (more principal arrives later with interest), but his day-one cash drops sharply and his headroom over the Year-1 tax narrows to $24,454.
3. **100% member participation is optimistic.** A.18 defaults to 80% precisely because partial buy-in is the expected case. At 80% the gap is roughly $8,000 — small, and exactly what an $8,000 revolving share-assistance fund from the Community Foundation covers.
4. **The federal subsidy is forgone.** Nobody claims the bonus depreciation. Given the owner's stated buyer pool, that subsidy was not being captured anyway — but it does mean this path leans harder on grants and the § 538 guarantee.

### A.23.6 Consequence for the sprint

This reorders `docs/CLOSE-OR-RESTRUCTURE.md`. If the no-investor path is the plan, **Tier 1.2's tax-counsel memo shrinks dramatically** — no syndicate means no § 385 debt-vs-equity exposure, no § 704(b) allocation question, and no Reg D offering on the investor side (member share offerings still need securities review). The largest unmodelled failure mode identified in A.22 substantially disappears.

What becomes *more* critical: the § 538 term sheet, Home Inc. as a subordinate-loan or guarantee partner, and grant timing — because with no investor capital there is no buffer if a grant slips.
