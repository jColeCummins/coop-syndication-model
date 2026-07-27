# Peer Review — July 2026 (Perplexity)

Verbatim text as supplied by the project owner. Verdicts and implementation
decisions are recorded in docs/ANALYSIS.md A.22; the adopted action plan is
docs/CLOSE-OR-RESTRUCTURE.md.

---

# Critical Review: Co-op Syndication Model (V5–V5.11)

The analysis document is one of the stronger internal underwriting write-ups I've seen for a mission deal: it repeatedly finds its own errors, prices the gift as philanthropy, and refuses several flattering tax ideas. What follows is a hard second look at residual gaps, soft spots, and where effort should go next—not a re-litigation of fixes already done well.

## What Has Been Done Well

**Tax mechanics that actually matter.** You correctly killed the false § 453(i) "recapture bomb" for straight-line residential realty, implemented Reg. § 1.453-12 ordering (unrecaptured § 1250 first), fixed GPR/bargain-sale basis split, added investor exit tax, § 465 at-risk against seller paper, and Ohio's 5/6 bonus addback. Those are not polish items; each one can invert seller or investor economics.

**Honest deal framing.** The three-way seller comparison (straight cash / cash+gift / note+gift), broker-cost differential, after-tax discount-rate labeling, cash-at-closing column, and "donation is philanthropy" language are exactly how this should be sold to a CPA and a seller. Decoupling `cashOfferPrice` from appraised FMV is commercially real and often larger than the tax-geometry edge.

**Binding constraints surfaced.** Moving from pure cost-recovery rent (DSCR = 1.00 by construction) to a rent policy + surplus deployment + LTV/DSCR feasibility test was the largest *economic* upgrade in the stack. Fixing the valuation paradox (restricted income approach for takeout value) and flagging debt-vs-equity recharacterization show the model is being stress-tested, not defended.

**Operational and local grounding.** Greenmont as a metro comparable, CLT ground-lease economics, UBIT separation of lease vs management, flat per-door management, anti-displacement share rules, and the tenant-first "investors close / grants chisel" sequence are decision-grade, not dashboard theater.

**Process quality.** Versioned addenda, engine assertions, "deferred not forgotten" lists, and explicit rejection of bad ideas (§ 170(h) easement pivot, expired § 45L, inapplicable § 179D) are unusually disciplined.

## Overlooked, Weak, or Still Too Soft

### 1. Legal entity stack is still a black box (high severity)
The model prices a clean story: investors in → Year-5 formula takeout → tenant co-op on CLT land. It does **not** underwrite the path between those states: who holds title in Years 0–5 (LLC, LP, co-op corporation, dual entities); how the "syndicate" becomes a tenant LEC without a taxable transfer, transfer tax, or broken installment-sale characterization; whether the buyout is a co-op *option* (good for equity factors) or an economic compulsion that looks like mandatory redemption; securities (Reg D / Ohio blue sky) on the investor raise and on member shares; Subchapter T / § 216 qualification if the operating entity is meant to be a housing co-op during the hold. Until counsel sketches a one-page entity stack and conversion steps, the tax alpha and the refinance story are both provisional.

### 2. Debt-vs-equity is correctly named—and still under-mitigated
Fixed ~7% preferred, no upside, formula exit at capital (+PIK) is a classic recharacterization profile. If the IRS treats the interest as debt, § 168(k) vanishes and the deal's cheap-capital thesis collapses. Mitigants you list (co-op option, real loss risk, avoid default PIK) are real but incomplete. Still missing as *design* work: even a thin promote or residual share (e.g. 5–10% of refinancing surplus above a hurdle); governance rights that look like equity (board seat, major-decision votes); written tax opinion as a closing condition, not a post-close nice-to-have; explicit rejection of language that guarantees return of capital on a date certain. This is not a slider problem. It is the single point of failure for the entire investor thesis.

### 3. Phase-2 takeout is still the deal—and still partly aspirational
You correctly show that cost-recovery alone cannot refinance, that DSCR (not LTV) often binds, and that § 538 can close the gap on paper. Residual optimism: § 538 as "highest-value diligence" is the correct priority, but until address eligibility + approved lender + term sheet exist, gap closure is a hypothesis. § 538 rehab often needs meaningful per-unit hard costs; $7,200/door sits near thin thresholds and may not match a real PCA. Nonprofit vs for-profit leverage and LTC differ; the co-op/CLT stack must match program rules. Self-management to $718 — the Greenmont write-up says 25 units cannot self-manage like 500; using that lever in the "fully chiseled" ladder overstates the end state. NCB-style co-op blanket loans are conservative; program overlays (reserves, owner-occupancy, share-loan ecosystem) are still outside the engine.

**Unjustly optimistic pattern:** launch cases that look tenant-friendly (PIK, low Phase-1 rent) systematically *worsen* the binding Year-5 constraint. You document this; defaults and "headline" narratives still sometimes lead with Phase-1 comfort.

### 4. OpEx and physical reality are still model-led, not building-led
Raising utilities toward $1,500/unit/yr was right; the analysis still treats Paul's actual bills, village apartment-class rates, and a real insurance quote as future diligence. For a 1968 garden asset, still thin or absent as *defaults discipline*: Property Condition Assessment (roof, boilers, electric, plumbing, envelope); lead / asbestos / accessibility capital; habitational insurance **bindability**, not only trend rates; reserves at $500–600/unit (you agree $400 is light; default not moved); vacancy/bad debt above 4% in conversion years (you agree; default not moved); working capital and reno-period vacancy / temp housing.

### 5. Tax items still over-smooth or default-aggressive

*Likely fine / well handled:* § 453 installment + unrecaptured § 1250 ordering; seller-financing excluded from qualified nonrecourse; OBBBA-era 100% bonus on eligible used personal property via cost seg (with study risk).

*Still soft or incomplete:*
- **REPS as a binary toggle** — Real estate professional status is fact-intensive (hours, material participation, spouse aggregation). Marketing ~7–8.5% "with REPS" without a named investor who actually qualifies is optimistic capital-raise fiction. Passive IRR (~4.5–5%) is the honest base case for most checks.
- **§ 199A QBI on rental** — Not automatic; safe harbor / trade-or-business facts required. Defaulting benefit on without a toggle hazard is mildly aggressive.
- **Ohio Business Income Deduction default on** — Rental / installment character may not cleanly sit in BID; CPA-confirm toggle is good, default-on may flatter seller tax.
- **OBBBA charitable limits** — You model the 0.5%-of-AGI floor; 2026 also tightens the *value* of itemized charitable benefits for high earners (commonly described as a 35% benefit cap). Confirm whether the engine's marginal benefit on the land gift reflects that.
- **Investor NIIT and § 461(l)** — Still simplified away; large Year-1 bonus users care about both.
- **Grant / basis** — "Keep depreciable basis intact via deferred-loan characterization" is a drafting and § 61/§ 118 conclusion, not a free modeling choice.
- **Cost-seg 25% + 100% bonus on CapEx** — Defensible only with an engineering study and correct asset classes; garden apartments often land lower on short-life share.
- **Seller AGI path** — Full § 170 absorption is an artifact of *modeled* note income + balloon inside the six-year window. Optimizer answers "what the deal can use," not "what the appraisal and the IRS will allow."

### 6. Appraisal and § 170 substantiation are still the quiet audit magnet
The optimizer still encourages sizing the gift to tax capacity (~35% of FMV). That is fine as a *capacity* tool and dangerous as a *valuation* tool. Missing as first-class work: engagement of a qualified appraiser (Form 8283 / qualified appraisal rules); CLT donee acknowledgment and a ground-lease form that does not depress land FMV into absurdity; a consistency memo (as-is ~$1.25M, stabilized restricted value, cash offer, land residual — one narrative, not four convenient numbers).

### 7. Conversion politics and credit are under-modeled
Greenmont admits by credit screen; you inherit residents and correctly refuse screening. Implications not yet in numbers: collections and bad debt through conversion; holdouts and non-purchasing households (participation default 80% is good; eviction/non-member occupancy legal path is not modeled); share-purchase capacity at $2k still excludes some households even with 40% assistance; board capacity, training, and D&O for a new 25-unit LEC; "buying a share is never required to stay" is ethically right and can leave a permanent dual-class occupancy mess if not drafted carefully.

### 8. PIK is documented as costly—and still easy to misuse
Compounding PIK and buyout-tied accrual fixes were necessary. Net: lower Phase-1 rent, larger balloon, worse DSCR/LTV, ordinary income to investors when paid. Any default or "launch" preset that leans on PIK without a locked takeout path (term sheet or committed grants) is still presentation risk.

### 9. What the analysis may still get slightly wrong or overconfident
- **Municipal tax on seller** — Directionally right that OH municipal tax is not a general capital-gains tax; always confirm the specific municipality's base and any net-profits overlay.
- **"Ohio gives no charitable deduction"** — Treat as jurisdiction-confirm-with-CPA; state conformity moves.
- **§ 538 rent/income caps "don't bind at all"** — Likely true at $700–800 rents vs AMI caps, but occupancy rules, average-rent tests, and rehab standards can still bind in underwriting.
- **Float64 dismissal** — Fine for a dashboard; wrong the day you export "filing-grade" schedules. Keep that boundary bright.
- **Member shares as major rent lever** — You already say $40k ≈ $10/unit/mo; keep that honesty in every member-facing deck.

### 10. Capital-market reality check (outside the engine)
Mission-aligned *and* REPS-qualified *and* willing to accept ~6–8% levered tax-aware IRR with refinance risk and possible recharacterization haircut is a thin buyer pool. The model optimizes structure for that unicorn. It does not ask: "What is the minimum check size and which three people actually write it?" Without a named capital plan, IRR decimals are decorative.

## Erroneous or Misguided Patterns to Drop

1. Leading with Phase-1 rent victories that are financed by Year-5 fragility (especially PIK).
2. Treating grant/AHP/OHTF ladders as a plan rather than a sensitivity.
3. Tax-capacity-maximizing gift size as if it were land value. Optimizer ≠ appraisal.
4. Further tax-geometry features before OpEx, PCA, counsel, and lender paper.
5. Self-management and deep grant stacks in the same "success" column as base case.

## Optimal Focus Going Forward

**Tier 1 — Close / kill criteria (next 30–60 days):** (1) Phase-2 takeout package — USDA map eligibility for the address; § 538 approved lenders; indicative rate/term/LTV/DSCR/reserve requirements; parallel CDFI/NCB co-op blanket indication. Hard gate. (2) Tax counsel memo — entity stack; installment sale + CLT gift; investor interest as equity (§ 385 factors); § 704(b) allocations; grant paper; § 216/Subchapter T path. Opinion or issues list before capital is solicited. (3) Building truth set — 12 months actuals; broker opinion or comp set; rough PCA; insurance indication. (4) Appraisals scope — separate land and leasehold improvements; as-is restricted vs fee-simple; no subtraction games. (5) Seller decision package — one page.

**Tier 2 — Structure the capital and the co-op:** (6) Named investor path — REPS vs passive; minimum check; whether 7% pref clears without fantasy. (7) Member conversion plan. (8) Ground lease + management documents. (9) Surplus / shadow equity policy.

**Tier 3 — Model work (only after Tier 1 starts):** (10) Freeze a base/downside/upside preset set and stop adding mechanisms. (11) Add conversion-year stress as a named scenario. (12) Toggle discipline: REPS off, BID off, QBI off, PIK off as the **printed** base case. (13) If anything new is coded: debt-equity/opinion checklist and takeout term-sheet fields — not more MACRS nuance.

**What to stop doing:** new credit theories (§ 179D/45L-style archaeology); finer escalator choreography; donation-size optimizers beyond what's built; IRR cosmetics without a term sheet.

## Balanced Verdict

| Dimension | Grade | Note |
|---|---|---|
| Tax engine integrity | Strong | Major false rules removed; at-risk and exit tax real |
| Seller honesty | Strong | Philanthropy priced; note vs same-gift cash is the right frame |
| Refinance realism | Improved, incomplete | Feasibility test + restricted value fixed a real bug; § 538 still unconfirmed |
| Ops / physical | Behind the tax work | Utilities moved; PCA, insurance, reserves, vacancy still soft |
| Legal / securities / equity character | Behind | Largest unmodeled failure mode |
| Tenant mission design | Strong | Anti-displacement shares, rent policy, grant timing philosophy |
| Capital raise realism | Weak | REPS + mission + thin IRR + refinance risk is a narrow needle |

**Bottom line:** The model is no longer "operationally fictional" in the way a hostile reviewer claimed, but it is still **legally and takeout-incomplete**. The remaining risk is not another mis-coded GPR — it is closing a 1968 village property with inherited tenants, seller paper, a formula investor exit, and a Year-5 loan that only clears under programs or subsidies you do not yet hold.

**Optimal focus:** freeze feature work; run a six-week "close-or-restructure" sprint on (1) takeout lender reality, (2) tax/structure opinion, (3) actuals + PCA + insurance, (4) appraisal scopes, (5) named capital. Use the engine only to underwrite those facts.
