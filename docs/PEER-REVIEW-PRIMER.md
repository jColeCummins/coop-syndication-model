# Peer-Review Primer — Limited-Equity Co-op Conversion Model

**Subject property:** ~25-unit garden apartment complex (24 apartments in 1968-vintage blocks + one standalone ~1,144 sq ft house), on a 3.58-acre lot, Yellow Springs, Ohio.
**Purpose of this document:** give a reviewer from any one discipline enough of the whole picture to (a) understand the deal, (b) see exactly what the financial model assumes and computes, (c) know what has changed as the model matured, and (d) find the questions their own expertise should be pointed at.
**Status:** illustrative underwriting model, not tax, legal, or investment advice. Every figure is a model output at stated assumptions; nothing here substitutes for a qualified appraisal, a CPA opinion, or counsel.

> **How to read this.** Part I explains the project in plain language. Part II gives the current base-case numbers. Part III is eight stakeholder lenses — read yours first, but the deal only holds together if all eight do. Part IV is the change log (what moved, and on whose authority). Part V is the honest list of what is *not* yet modeled. An appendix defines terms.

---

## Part I — The project in plain language

### I.1 The problem being solved

An owner wants to exit a 25-unit rental property. The tenants are paying around $700/month and the local market is tight (low vacancy), but the building is 58 years old with deferred maintenance, and a conventional sale to a market buyer would almost certainly mean rent increases toward $900–1,100 market comps, or a flip. The community goal is **permanent affordability**: keep the current tenants housed at prices they can bear, and hand them collective ownership over time. The owner is also charitably motivated toward that outcome.

The obstacle is that "affordable" and "sellable at fair value" usually pull against each other. This structure is an attempt to reconcile them using four cooperating legal/financial instruments, each doing one job.

### I.2 The four moving parts

1. **CLT land donation (IRC § 170).** The owner donates the *land* (the 3.58-acre parcel) to a Community Land Trust — Yellow Springs already has one, **Home, Inc.** — and takes a charitable deduction for its appraised value. The CLT holds the land in trust permanently and ground-leases it to the resident co-op. Because the co-op never has to buy or finance the land, its cost basis (and therefore the rent it must charge) drops.

2. **Seller-financed installment note (IRC § 453).** The owner sells only the *improvements* (the buildings) to a resident cooperative / investor syndicate and carries the financing personally instead of demanding all cash. The buyer pays a modest down payment and monthly principal-and-interest; the remaining balance comes due as a "balloon" at a set year. This spreads the owner's taxable gain over years instead of one lump, and provides the buyer below-bank financing.

3. **Investor syndicate (the Phase-1 capital).** Local investors put up the down payment and the renovation money. In exchange they receive a fixed **preferred return** and, critically, the first-year federal **bonus depreciation** on the improvements and renovations — which under 2025's OBBBA law is 100% expensable. They are **taken out** (repaid) at the balloon/refinance year; they do **not** share in any future appreciation. This is deliberate: the appreciation is what the community keeps.

4. **The resident cooperative + CLT ground lease (the permanence).** The residents form a limited-equity cooperative (LEC) that owns the improvements and leases the land from the CLT. Two independent shields keep it affordable forever: the **ground lease** (limits resale value and rents) and the **cooperative structure** (residents govern their own carrying costs). Neither depends on the tax deduction — the IRS only cares about the land gift.

### I.3 The two phases and the timeline

- **Phase 1 (Years 1–≈5): "launch."** Investors have funded the deal, the seller carries the note, renovations happen, and rents only need to cover *operating cost recovery* — debt service on the note + operating expenses + the investor preferred return. The goal is to hold rents **at or below what tenants pay today** while the building is stabilized.
- **The buyout (≈Year 5).** The co-op refinances with a conventional bank mortgage. That mortgage pays off (a) the seller's remaining note balance and (b) the investors' capital. The seller is now fully cashed out; the investors are gone; the co-op owns the buildings outright (on CLT land).
- **Phase 2 (Year 6+): "steady state."** The co-op's rent must now cover the bank mortgage + operating expenses, but **not** the investor preferred return (they're gone). The strategy is to attack this later rent through grants won during the hold, self-management, and conservation capital.

### I.4 What "the model" is

The repository is a browser-based financial model (`artifacts/coop-syndication`). All math lives in one pure, typed engine (`src/utils/calculations.ts`, `calculateDealMetrics`); the UI only displays. Every rate, threshold, asset life, and jurisdiction rule is a named constant or an input, so the tool generalizes to other properties, states, and tax years. A reviewer can drag any slider and watch all downstream figures — seller taxes, investor IRR, tenant rent — recompute instantly. Every nontrivial figure is verified by a Node sanity script before the UI is touched.

---

## Part II — The numbers a reviewer will see (current defaults)

Two configurations matter. The **base case** is the neutral default. The **launch case** is the tenant-first operating plan the principals intend to run.

### II.1 Base case (neutral defaults)

| Dimension | Value |
|---|---|
| FMV (as-is) | $1,250,000 |
| Land donation to CLT | $430,000 (34.4% of FMV; max fully absorbed within the § 170 window ≈ $436k) |
| Contract price (improvements) | $820,000 |
| Down payment (15%) | $123,000 |
| Seller note | 6%, 20-yr amortization, Year-5 balloon |
| Seller basis / accum. depreciation | $475,000 / $356,250 (stepped-up-transfer assumption) |
| **Seller Year-1 tax** | **$27,358** (Ohio BID on) — vs. $123k down payment → $95,642 headroom |
| Seller lifetime tax (installment) | ~$133,000 |
| Charitable deduction utilization | 98.3% used, ~$7.3k lost to the OBBBA floor, **$0 expires** |
| Investor capital required | $303,000 (down payment + $180k renovation) |
| Investor Year-1 depreciation | ~$320,600 ($295k bonus + $25.6k straight-line) |
| Investor exit tax (Year 5, 50% short-life alloc.) | ~$103,000 |
| **Investor IRR** | **7.3% with REPS / 5.2% passive**, 1.27× equity multiple, payback Year 5 |
| **Phase-1 rent** | **$755** (+$55 vs. current $700) |
| **Phase-2 rent** | **$848** (+12.3% over Phase 1, ≈2.4%/yr) |

Seller after-tax comparison (5% NPV discount): straight cash sale **$952k** · cash sale + donation **$707k NPV** · **installment + donation $730k NPV**. Given the decision to donate, the installment note beats a bifurcated cash sale on NPV and by ~$170k nominal (bracket-smoothing, NIIT avoidance, 6% carried yield, full § 170 absorption). The straight cash sale nets more raw dollars only because it keeps the $430k of land — the donation is philanthropy, priced honestly.

### II.2 Launch case (tenant-first operating plan)

Configuration: investor preferred return **accrues** to the buyout (PIK) instead of being paid from rents; note sized on a 25-year amortization; seller rate 5.5%; water-conservation CapEx included; **no grants assumed at closing**.

| Step (grants won *during the hold*, applied at buyout) | Phase 1 rent | Phase 2 rent |
|---|---|---|
| Launch — nothing else goes right | **$634** (−$66 vs. current) | $866 |
| + HOME $150k + utility rebates $15k | $634 | $820 |
| + Ohio Housing Trust Fund $150k | $634 | $778 |
| + Phase-2 self-management | $634 | **$718** |

Tenants launch **below today's rent and stay there for five years**; the Phase-2 step is bounded at $866 in the worst case (every grant fails) and chiseled toward $718 as subsidy and self-management land. Investors put in ~$318k for a 6.3% REPS IRR (4.8% passive) with ~$111k of Year-1 federal tax savings and a formula takeout at Year 5. The federal subsidy reaches the community **through** local investors (as depreciation) without anyone waiting on a grant award to close.

---

## Part III — Eight stakeholder lenses

Each lens: **what they look for → what the model shows → their open questions / red flags.**

### III.1 CPA / Tax advisor

**Looks for:** correct character and timing of the seller's gain; that the installment method is available and correctly applied; that the charitable deduction is substantiated and within AGI limits; that investor depreciation is real and its recapture is honestly priced; state conformity.

**Model shows:**
- **No § 453(i) acceleration.** The property is straight-line residential realty, so there is no § 1250 *ordinary* recapture to accelerate. The 25%-rate *unrecaptured § 1250 gain* spreads over the installments and is recognized first within each year's gain (Reg. § 1.453-12). This is the single most consequential correction from early drafts (see Part IV).
- **Asset-level basis split**, not a § 1011(b) pro-rata bargain sale: the land and its basis follow the gift to the CLT; the building's adjusted basis offsets the sale to the co-op. Two assets, two counterparties. Gross profit ratio ≈ 100% because the building is fully depreciated.
- **§ 170 mechanics:** FMV deduction for appreciated long-term property, **30%-of-AGI** annual ceiling, six usable years (contribution year + 5 carryforward; Year 7 is the first zero-shield year), **OBBBA 0.5%-of-AGI floor** applied and non-carrying. The model reports utilization and warns if any deduction would expire.
- **NIIT (3.8%)** and the **15%/20% LTCG split** applied automatically per year by filing status (2026 thresholds).
- **Ohio:** flat 2.75%, no state charitable deduction, **5/6 bonus-depreciation add-back** modeled, and the **Business Income Deduction** (first $250k of business income deducted, 3% above) behind a "CPA-confirmed" toggle. Municipal tax (ORC 718) cannot reach interest or capital gains — only positive rental net profits.
- **Investor exit is taxed.** Bonus depreciation is deferral, not exemption: five years of write-downs erode basis, so the takeout triggers ~$103k of tax at defaults. The ordinary/25%/15% split is driven by a **negotiated exit purchase-price allocation** input (§ 1245 on short-life property).
- **§ 465 at-risk limitation enforced.** The seller note is *not* qualified nonrecourse financing (§ 465(b)(6) excludes seller debt), so losses deduct only up to cash invested; excess suspends and releases against the exit gain. This matters the moment grants shrink the equity slice.

**Open questions / red flags to run down:**
1. **Confirm the seller's depreciation history is straight-line building only.** If any cost-seg or § 1245 personal property exists on the seller's schedule, § 453(i) *would* accelerate that portion. Pull Form 4562 / Schedule E.
2. **Basis fork.** $475k assumes a purchase/inheritance (stepped-up) 1993 transfer; a *gift* transfer means ~$250k carryover. Lifetime tax barely moves (~$3k) but get the real number from the return.
3. **§ 170 substantiation:** qualified appraisal + Form 8283 + contemporaneous CLT acknowledgment are mandatory at this size. Ensure the donation is **not contractually contingent** on the sale closing (step-transaction risk).
4. **Ohio BID characterization** of the note income and rental profits needs a written CPA position — it is worth ~$18k to the seller.
5. **§ 61/§ 118 characterization of grants** (deferred-loan vs. taxable) — the model assumes deferred-loan (basis intact).
6. Confirm the note rate clears the **month-of-closing AFR** (§ 1274); 6% clears current long-term AFRs comfortably. Seller must not pledge the note (§ 453A(d)).

### III.2 MBA / Financial strategist

**Looks for:** does the capital stack clear, is the return commensurate with the risk, where is the deal fragile, and is the "win-win" real or an accounting mirage.

**Model shows:** the stack closes on investor capital alone (no grant dependency at closing). Investor IRR is a modest but real 6–7% *after* honest exit tax, delivered mostly as Year-1 tax alpha plus a par takeout — a bond-like, tax-driven, short-duration position, not a growth play (by design; appreciation is ceded to the community). The seller keeps ~85% of contract value after tax and beats a bifurcated cash sale once the donation decision is made. Tenants pay cost-recovery rents that sit *below* market comps — the affordability isn't magic, it's the land gift + below-market seller financing + ceded appreciation, each quantified.

**Open questions / red flags:**
1. **The takeout is the deal's spine.** Everything depends on the co-op qualifying for a Phase-2 bank mortgage in Year 5. Underwrite that DSCR now, not later. A bigger balloon or a higher rate is the real risk, not property value.
2. **Investor pool is narrow** in the launch (PIK) case: zero cash for five years selects for mission-aligned capital. A 4%-paid / 3%-accrued split restores some current yield at ~$723 launch rent if recruiting proves hard.
3. **Sensitivity:** the model's escalators (water/insurance 8%, taxes/mgmt 3%) drive the Phase-2 rent. If Yellow Springs water inflation runs hotter, Phase 2 drifts up — stress it.
4. Vacancy is modeled at 4% (tight local market). This is *not* Columbus (where oversupply pushes ~10%); don't import metro benchmarks — but do document the local vacancy evidence.

### III.3 Lawyer

**Looks for:** enforceability of the affordability mechanism, clean separation of the tax and social shields, entity and securities questions, ground-lease financeability, and conversion/tenant-rights compliance.

**Model shows (and flags for drafting):**
- **Two independent shields, kept separate.** The CLT ground lease enforces affordability (social); the land donation earns the deduction (tax). They must not be cross-conditioned in the documents — the IRS only evaluates the gift.
- **Ground-lease drafting items (adopted from peer review):** a **99-year renewable term** exceeding any mortgage term (secondary-market financeability), and a **solvency safety valve** — a board-supermajority override of the formula rent if reserves are breached. A rigid rent formula with no escape hatch is an underwriting defect, not a protection.
- **Rent formula is a private covenant, not municipal rent control.** ORC 5321.20 preempts *political subdivisions* from enacting rent control; it does not bar a private ground-lease restriction. (An earlier review overstated this.)
- **Management contracted flat per-door**, never as a percentage of cost — a percentage literally pays the manager more to spend more (mow more). This is a fiduciary-alignment term for the co-op's counsel.

**Open questions / red flags:**
1. **Securities law:** the investor syndication is likely a securities offering — Reg D exemption, accredited-investor verification, and disclosure documents needed. Local/"community" investors do not change this.
2. **Entity structure** for the improvements-owner during Phase 1 (LLC taxed as partnership?) and its conversion to the LEC at buyout — model tax consequences of the entity transition.
3. **Cooperative conversion** under ORC 5311.033 / Chapter 5321, including **non-purchasing / holdout tenants** and retaliatory-eviction protection (ORC 5321.02). The model does not yet include a tenant-participation rate for the conversion window.
4. **CLT ground-lease pass-through** of the land parcel's property tax, and whether the CLT land qualifies for an Ohio charitable-use exemption (contested, case-by-case).
5. Confirm no **step-transaction** linkage between the donation and the sale.

### III.4 Seller

**Looks for:** how much they net, when, how it compares to just selling for cash, and what risk they carry by financing the buyer.

**Model shows:** Year-1 tax (~$27k) is comfortably covered by the $123k down payment. Over the note's life the seller collects principal + 6% interest, keeps ~85% of contract value after tax, fully uses the charitable deduction, and nets more (NPV and nominal) than taking the same bifurcated deal in cash. The donation itself costs real money (~$200k+ of value given away, softened but not repaid by the deduction) — that is the philanthropic choice, stated honestly.

**Open questions / red flags:**
1. **You are the bank for five years.** You carry buyer credit risk secured by the property, and a balloon that depends on the co-op refinancing. What happens on default? (Deed-in-lieu, note guarantees, reserve requirements.)
2. **Balloon-year tax spike:** the year the balloon is collected is the big tax year (visible in the schedule) — plan liquidity for it.
3. Confirm your basis and depreciation history (Part III.1) — it sets your actual tax.
4. The deduction only helps against income you actually have; the six-year absorption assumes the modeled AGI path. If your other income drops, utilization drops.

### III.5 Investor

**Looks for:** IRR/ROI, when capital comes back, the tax benefits, and the downside.

**Model shows:** ~$303k in (base) or ~$318k (launch), ~$100–111k of Year-1 federal tax savings if REPS or with passive income to shelter, a fixed preferred return, and capital back at par at the Year-5 refinance. IRR 6–7% after exit tax; equity multiple ~1.27×; payback at the takeout. This is optimal for **real-estate professionals (§ 469(c)(7)) or investors with passive income**, high-bracket taxpayers who value the Year-1 deduction, and mission-aligned capital accepting a below-market financial return for a secured, short, community-outcome position. It is **not** for passive investors seeking cash yield.

**Open questions / red flags:**
1. **REPS is worth ~2 IRR points and is a factual test** (750 hours + material participation). Without it, losses suspend until the takeout — model both (the tool does).
2. **At-risk limits** cap your usable Year-1 loss at cash invested (the seller note doesn't count) — the model now enforces this; don't expect deductions beyond your check.
3. **Exit tax is real** — your basis is gone after five years of depreciation. The **buyout price allocation** (short-life %) is negotiable and worth 1.5–2.5 IRR points; negotiate it.
4. **No appreciation upside** — the ground-lease formula caps your exit. Underwrite the co-op's refinance ability; that, not the property, is your repayment source.

### III.6 Tenant

**Looks for:** will I be able to afford to stay, will I be displaced, and what do I get for participating.

**Model shows:** in the launch plan, Phase-1 rent is **below what you pay today** and held for five years; Phase-2 rises modestly and is actively pushed down by grants and self-management. Cost-recovery rents sit under market comps, so there's affordability headroom rather than a looming increase. Over time you gain **collective ownership** and a voice in your own carrying costs.

**Open questions / red flags:**
1. **What if you don't want to buy a co-op share?** Non-purchasing tenants' rights during conversion need to be spelled out (Part III.3).
2. **The Year-5 step** is real if grants don't land — understand the range ($718–$866 in the launch ladder) and who is working to keep it low.
3. **Self-management means participation** — the low Phase-2 number assumes residents do some work (governance, light grounds) instead of paying a full-service manager.

### III.7 Community Land Trust (Home, Inc.)

**Looks for:** does this advance permanent affordability, is the land gift clean and the stewardship durable, and what is the CLT's ongoing role and risk.

**Model shows:** the CLT receives the 3.58-acre parcel unencumbered (~$430k of value), ground-leases it to the co-op, and permanently controls resale/affordability. The structure is engineered so the CLT's affordability mission does not depend on — and is legally separated from — the seller's tax deduction. As a certified CHDO, the CLT is also the natural conduit for HOME funds (15% of allocations reserved for CHDOs) that chisel the Phase-2 rent.

**Ground lease (modeled).** The co-op pays the CLT an annual ground-lease fee — modeled as a per-unit operating line (default ~$300/unit/yr, ~$26/month of tenant rent, escalating slowly at 1.5%/yr). It funds the CLT's perpetual stewardship. Two design rules: (a) keep it at a **stewardship level, not land-rent extraction**, because every dollar raises tenant rent; (b) keep it **legally separate from any CLT management contract** — pure land rent is exempt from the CLT's unrelated-business income tax under § 512(b)(3), but if the CLT also renders substantial services (management, maintenance) the rent can lose that exemption. Route CLT management, if any, through a distinct fair-market service agreement evaluated on its own for relatedness to the CLT's exempt purpose.

**Open questions / red flags:**
1. **Stewardship capacity:** the CLT holds the land forever and enforces the ground lease. Is the ground-lease fee sized to actually fund long-term monitoring without over-burdening rent?
2. **Ground-lease terms** (Part III.3) — the CLT is a party to the safety-valve and term provisions.
3. **UBIT / service-bundling** — if the CLT wants to also manage the property, structure it as a separate agreement (see above); do not fold it into the ground lease.
4. **Grant compliance:** HOME (20-yr), OHTF (~15-yr), AHP (15-yr) covenants run against the property; the CLT often co-signs affordability monitoring.
5. Pursue the **Ohio charitable-use property-tax exemption** for the land parcel — it directly lowers tenant rent.

### III.8 Village Council member

**Looks for:** public benefit, precedent, fiscal and regulatory impact on the Village, and durability.

**Model shows:** 25 households kept affordably housed without displacement, a 58-year-old building recapitalized with private and federal money (not Village funds), permanent affordability anchored by a local CLT, and a green, low-density anchor preserved on 3.58 acres. The Village's role is enabling, not funding.

**Open questions / red flags:**
1. **Property-tax base:** a CLT land exemption removes the land parcel from the tax rolls (contested in Ohio) — quantify the levy impact and weigh against the affordability benefit.
2. **Conveyance and reassessment:** the recorded arm's-length sale price resets the Auditor's value; a Board of Revision posture may be warranted.
3. **Utility load / water policy:** the deal's biggest operating cost is Village water/sewer (the highest rates in the region, ordinance-locked to rise). Conservation CapEx in the plan reduces demand on the system — a policy alignment worth noting.
4. **Precedent:** if this works, it is a template other Village properties could follow; consider whether Village policy wants to encourage or standardize it.

---

## Part IV — What has changed (change log for reviewers)

The model went through four dated revisions during this engagement. Each change is stated with its **authority** because a peer reviewer will (rightly) ask "says who?" The convention throughout: questionable inputs are annotated in the UI; questionable *math* is corrected and documented, never silently.

### V4 → V5 — CPA-correctness reboot

The inherited "V4" engine implemented a spec's flat-rate algebra verbatim, including several errors large enough to invert the deal's conclusions. Corrected, each on cited authority:

| Change | From (V4) | To (V5) | Authority |
|---|---|---|---|
| "§ 453(i) recapture bomb" | all depreciation taxed 25% in Year 1 | unrecaptured § 1250 gain spreads over installments, recognized first per payment | §§ 453(i), 1250(b)(1); Reg. § 1.453-12 |
| Gross profit ratio | (FMV − basis)/FMV, could exceed 100% | gross profit ÷ contract price, basis apportioned, bounded 0–100% | § 453; Reg. § 15A.453-1(b) |
| Negative basis | allowed | depreciation clamped at depreciable basis; impossible | mechanics of § 1016/§ 168 |
| § 170 cliff | Year 6, no AGI limit | Year 7, 30%-of-AGI limit, utilization tracked | §§ 170(b)(1)(C), 170(d) |
| Municipal tax on note income | taxed | $0 — ORC 718 exempts intangibles | ORC 718 |
| Cost-seg bonus base | FMV × 75% | contract price (buyers acquire improvements only) | § 168(k) mechanics |
| Investor exit | tax-free at par | taxed (~$117k); IRR net of exit tax | § 1245/§ 1250 recapture |
| NIIT + 20% bracket | omitted (flat 15%) | applied automatically per year | § 1411; § 1(h) |

Net effect: Year-1 seller tax fell from ~$98k to ~$43k (the phantom bomb had made the installment sale look as punitive as a cash sale), and the deal's real economics became visible.

### V5 → V5.2 — external review corrections + Yellow Springs realism

Implemented the accepted subset of a July 2026 multi-document review:

- **Asset-level basis split** (not § 1011(b) pro-rata) — land basis to the gift, building basis to the sale.
- **OBBBA 0.5%-of-AGI charitable floor** (non-carrying).
- **§ 1245 exit recapture** exposed as a negotiated `exitShortLifeAllocationPct` input.
- **Ohio Business Income Deduction** (toggle) and **§ 199A QBI** on REPS profit years.
- **Filing-status-driven** NIIT / LTCG thresholds (2026 figures).
- **Per-line operating-cost escalators** (water/insurance 8%, taxes/mgmt 3%, others 2.5%); **Phase-2 rent and the cliff alert now compute on buyout-year costs** — the flat-cost assumption had understated Phase 2 badly.
- **PIK-preferred toggle** — accrue the investor return to the buyout instead of paying it from rents.
- **Defaults re-underwritten:** FMV $1.5M → **$1.25M as-is** (the $1.5M was a stabilized, post-renovation value); realistic Yellow Springs operating costs (water/sewer alone ~$870/unit/yr, the highest in the region); basis $475k (stepped-up story).
- **§ 170 donation optimizer** (`findMaxAbsorbableDonation`): the largest gift fully absorbed within the six-year window at defaults is **$436k (34.9% of FMV)**; default set to $430k. *This answered the "how big should the donation be?" question numerically.*

### V5.2 → V5.3 — grants, at-risk, and verdicts on earlier research

- **Four grant buckets** ordered by descending award probability (utility/weatherization rebates → county HOME/CHDO → Ohio Housing Trust Fund → FHLB Cincinnati AHP), each $0 = not awarded, eligibility and compliance periods in tooltips. **Amount-only by design** — award timing and covenant durations are closing-calendar items, not cash-flow sliders.
- **§ 465 at-risk limitation enforced** — a correctness fix exposed by grant scenarios (a shrunken equity slice was printing a 188% IRR). The seller note is not qualified nonrecourse financing, so losses cap at cash invested and release against the exit gain.
- **Verdicts on two earlier-era research documents** (full reasoning in `ANALYSIS.md` §A.6):
  - *Rejected:* the § 170(h) conservation-easement "pivot" (the fee gift to the CLT is cleaner and already fully absorbed; easements are the IRS's most-audited charitable item); Ohio CAT modeling (receipts far below the $6M exclusion); a decimal-arithmetic refactor (float error is far below display rounding); Columbus vacancy/expense benchmarks (wrong market); a trademark concern (based on misreading the model as a marketed product).
  - *Adopted:* the partial-asset-disposition roof-loss election (methodology note); the ground-lease **safety valve** and **99-year term**.
  - *Corrected:* the "solar ITC 30% through 2032" claim is stale post-OBBBA — it is now a construction-start deadline (~mid-2026), not a standing option.

### V5.3 → V5.3.1 — grant timing + the tenant-first launch plan

- **Grant-timing toggle.** Default is now **"pursued during the hold, applied at the buyout"** (shrinks the Phase-2 refinance only), matching the intended strategy: investors close first with no grant risk; awards won during the hold chisel the Year-5 rent step. Flip to "committed at closing" only when awards are in hand pre-closing (they then replace investor capital and lower both phases).
- **Tenant-first launch ladder** documented (`ANALYSIS.md` §A.7): launch Phase-1 rent **$634** (below current), Phase-2 bounded at $866 worst case and chiseled to $718 via HOME + OHTF + self-management.
- **Management-incentive guardrail** written into the tooltip and diligence list: flat per-door management only.

> A note on *why the earlier research showed higher IRRs and lower Phase-2 rents*: those models took no exit tax, pro-rated recapture into cheaper buckets, ignored the Ohio bonus add-back, ran flat operating costs that were also well below Yellow Springs reality, and in one branch stacked a large conservation-easement deduction on top. Each of those flatters the deal; none survives review. The current numbers are lower because they are defensible.

---

## Part V — What is deliberately *not* modeled (open diligence)

A reviewer should treat these as live items, not oversights — they are disclosed rather than approximated:

- **Flat marginal rates**, not the full federal bracket ladder; **full-year MACRS** conventions (no mid-quarter/mid-month, no per-bucket placed-in-service timing); buyout assumed at year-end.
- **Investor NIIT** during the hold (REPS exempts it; passive profit years net near zero).
- **Ohio 1/6 bonus add-back recovery** truncated at the exit year.
- **Single investor pool, no promote/waterfall**; no CPI indexation of investor capital (decision: off).
- **Tenant-participation / holdout rate** for the conversion window — a candidate future input.
- **Securities-offering mechanics**, entity-transition tax, and ground-lease drafting — legal work, not model features.
- **Qualified appraisal / Form 8283**, month-of-closing AFR, and the no-linkage-between-gift-and-sale requirement — closing-checklist items.
- **The appraisal, not the optimizer, sets the donation's value.** The optimizer tells you what the deal can *use* ($436k); a qualified appraisal of the 3.58 acres tells you what the gift *is*.

**The single biggest external dependency:** the co-op's ability to qualify for the Phase-2 bank mortgage at the buyout year. Model value, seller terms, and tenant rents all rest on that refinance closing. Underwrite it first.

---

## Appendix — Glossary for cross-disciplinary readers

- **LEC / co-op** — limited-equity cooperative: residents collectively own the improvements; resale of shares is price-restricted to preserve affordability.
- **CLT** — Community Land Trust: nonprofit holding land in perpetual trust, ground-leasing it to keep housing on it affordable. Here: Home, Inc.
- **§ 170 / § 453 / § 168(k) / § 469(c)(7) / § 465 / § 1245 / § 1250** — Internal Revenue Code sections for, respectively: charitable deductions; installment sales; bonus depreciation; real-estate-professional status; at-risk limits; and depreciation recapture on personal property / real property.
- **OBBBA** — the 2025 tax act restoring 100% first-year bonus depreciation (permanent, including used property).
- **Bonus / cost-seg / straight-line** — first-year expensing; an engineering study reclassifying building components into shorter (5/15-yr) depreciation lives; and the 27.5-year residential schedule.
- **Preferred return / PIK** — a fixed investor return; "paid-in-kind" means it accrues and is paid at exit rather than in cash each year.
- **Balloon / takeout / refinance** — the note's remaining balance due at a set year, paid by the co-op refinancing into a conventional mortgage that also repays the investors.
- **REPS** — Real Estate Professional Status; lets rental losses offset ordinary (W-2) income.
- **NIIT / LTCG / AGI** — 3.8% net investment income tax; long-term capital gains; adjusted gross income.
- **BID / CAT (Ohio)** — Business Income Deduction (first $250k business income deductible, 3% above); Commercial Activity Tax (gross-receipts tax, immaterial here below the $6M exclusion).
- **DSCR** — debt service coverage ratio; the key metric for the Phase-2 refinance underwrite.

---

*Companion documents in `docs/`: `ANALYSIS.md` (full narrative + change-by-change rationale and figures), `REVIEW-2026-07.md` (external tax/cost review), `UX-CONFIG-SPEC-v5.2.md` (input labels/tooltips), `defaults-v5.1.patch.ts` (annotated defaults). The engine itself is `artifacts/coop-syndication/src/utils/calculations.ts` — every constant named, every position commented.*
