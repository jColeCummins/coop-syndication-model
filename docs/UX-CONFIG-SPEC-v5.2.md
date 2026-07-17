# V5.2 Spec — Plain-Language UI, Full Configurability, Inflation, and the 1993 Basis
**Companion to REVIEW-2026-07.md and defaults-v5.1.patch.ts. Supersedes nothing in the engine math; this governs naming, tooltips, configuration architecture, and two default changes (basis, management escalation).**

---

## 1. Configuration architecture — nothing hardcoded

The tool must work for any apartment complex, any state, any tax year. Split today's single `CONSTANTS` object into four config layers, each editable and each shipping with a named preset:

| Layer | Contents | Ships as | User edits where |
|---|---|---|---|
| `DealInputs` | Everything about *this* property and *this* deal | "Yellow Springs 25-unit" preset | Main sidebar sliders |
| `TaxPolicy` | Federal law: LTCG rates & thresholds **by filing status**, NIIT rate & thresholds, charity AGI limits & 0.5% floor, carryforward years, bonus %, MACRS lives, recapture rates | "US-2026" preset (year-stamped) | Advanced panel |
| `Jurisdiction` | State income tax rate, state charitable deduction (on/off), business-income deduction rules (cap + rate), bonus addback fraction & recovery years, municipal rate + what it can tax (intangibles yes/no, net profits yes/no) | "Ohio / Yellow Springs" preset | Advanced panel; second preset "Generic — no state tax" proves portability |
| `Escalators` | Per-line annual inflation (§ 4) | "YS 2026 documented" preset | Advanced panel |

Rules: no numeric literal appears in engine code — every rate, threshold, life, and fraction resolves from config. `units`, `BUILDING_RATIO`, `COST_SEG_SHORT_LIFE_PCT`, filing status, and the exit-allocation percentage are all inputs. Presets are JSON, so a new city or a 2027 law change is a data edit, not a code edit. Add a visible "Assumptions" drawer that renders the active preset values so users see exactly which law-year and jurisdiction they're computing under.

## 2. Plain-language labels and tooltips — every input

UI shows the plain label; code keys stay stable. Tooltips are written for someone who has never met the tax code. (Existing statutory tooltips in `TOOLTIPS` stay, demoted to a "details for your CPA" second paragraph.)

### Property & operations
| Code key | Label | Tooltip |
|---|---|---|
| `units` | Number of apartments | Total rentable homes in the deal, including any standalone house. |
| `currentRent` | Current average rent | What tenants pay per month today. The tool compares this to the rent the co-op would actually need to charge. |
| `vacancyRate` | Vacancy allowance | The share of rent you expect to lose to empty units and unpaid rent. Even full buildings budget 3–5%. |
| `propertyTaxes` | Property taxes (per year) | The annual real-estate tax bill. Note: after a sale, the county auditor usually resets the value to the sale price, so the new owner's bill may be higher than the current one. |
| `annualInsuranceMisc` | Property insurance (per year) | The building's insurance premium. Insurance for older apartment buildings has risen sharply — nationally about $780 per unit in 2024 and climbing ~8% per year. |
| `mgmtFeePerDoor` | Management fee (per unit, per month) | What you pay a property manager for rent collection, leasing, and coordination. A co-op that self-manages later can reduce or remove this. |
| `repairsMaintPerUnit` | Repairs & maintenance (per unit, per year) | Routine upkeep — plumbing calls, paint, appliances. Older buildings need bigger budgets; $1,200/unit is a realistic floor for a 1960s property. |
| `utilitiesPerUnit` | Owner-paid utilities (per unit, per year) | Water, sewer, trash, and shared-area electric that the owner (not tenants) pays. In Yellow Springs, water + sewer alone runs about $870/unit/year — the highest rates in the region. |
| `reservesPerUnit` | Replacement savings (per unit, per year) | Money set aside every year for big-ticket items — roofs, furnaces, parking — so the co-op never faces a surprise special assessment. |

### Seller
| Code key | Label | Tooltip |
|---|---|---|
| `totalFMV` | Property value today | What the whole property (land + buildings) would sell for on the open market right now. |
| `originalCostBasis` | Seller's cost basis | What the seller "paid" in the eyes of the IRS. If the seller bought or inherited the property, it's roughly the value at that time; if it was a **gift**, the original owner's much older cost carries over. Pull the exact figure from the seller's tax-return depreciation schedule (Schedule E / Form 4562) — see § 5. |
| `accumulatedDepreciation` | Depreciation already claimed | The total depreciation deductions taken over the years of ownership. A building held since 1993 is fully written off. When the property sells, the IRS "recaptures" tax on this amount at up to 25%. |
| `cltLandDonation` | Land gift to the land trust | The market value of the land being donated to the Community Land Trust. This is a genuine gift — the tax deduction softens it but never fully pays for it. |
| `sellerOtherIncome` | Seller's other yearly income | The seller's income apart from this deal (pension, wages, etc.). It determines tax brackets and how much of the donation deduction can be used each year. |
| `sellerOrdinaryRate` | Seller's income-tax bracket | The seller's federal marginal tax rate on ordinary income like interest. |
| `sellerFilingStatus` *(new)* | Seller's filing status | Single or married filing jointly. This sets the income levels where the 20% capital-gains rate and the 3.8% investment-income surtax kick in. |
| `discountRate` | Time-value discount rate | Used to compare money received today against money received over 20 years. Higher = you value future dollars less. |

### Deal structure
| Code key | Label | Tooltip |
|---|---|---|
| `sellerDownPaymentPct` | Down payment to seller | The cash the buyers hand the seller at closing, as a % of the purchase price. It must comfortably cover the seller's first-year tax bill — the dashboard warns if it doesn't. |
| `sellerInterestRate` | Seller loan interest rate | The rate on the loan the seller carries for the buyers. Must be at least the IRS minimum rate (published monthly); typically set below what a bank would charge — that gap is part of the deal's affordability. |
| `noteTermYears` | Loan payoff schedule (years) | The payment schedule length. Payments are sized as if the loan ran this long, even though it's paid off early at the buyout. Longer = lower monthly payments = lower rents, but a bigger final payoff. |
| `balloonYear` | Buyout year | The year the co-op refinances with a bank, pays the seller the remaining loan balance, and returns the investors' money. This deal's Phase 1 → Phase 2 boundary. |
| `phase2CommercialRate` | Bank mortgage rate at buyout | The interest rate the co-op expects on the bank loan it takes out in the buyout year to pay off the seller and the investors. The co-op's ability to qualify for this loan is the deal's most important risk. |

### Investors & renovation
| Code key | Label | Tooltip |
|---|---|---|
| `investorPrefReturn` | Investor preferred return | The fixed yearly return investors receive on their money, like interest — paid from rents. Investors get this plus their money back at buyout, and no share of any appreciation (the ground lease locks that in for the community). |
| `investorMarginalRate` | Investor tax bracket | Investors' federal marginal rate. Higher-bracket investors get more value from the deal's depreciation deductions. |
| `investorHasREPS` | Real-estate professional investors? | On: investors (or spouses) qualify as real-estate professionals and can use the deal's paper losses against regular income each year. Off: losses are locked up until the buyout. This toggle is the difference between ~8% and ~6% returns. |
| `capexRoofStruct` | Renovation: roof & structure | Building-shell work. Deducted slowly over 27.5 years — no first-year write-off. Note: renovation dollars earn the preferred return but dilute the headline IRR; they're for building health, not returns. |
| `capexParkingLand` | Renovation: parking & site | Parking, walkways, landscaping. Qualifies for the 100% first-year write-off. |
| `capexAppliances` | Renovation: appliances & interiors | Appliances, flooring, fixtures — including water-saving fixtures, which at Yellow Springs water rates are the best-returning dollars in the whole budget. 100% first-year write-off. |
| `capexPlacedInServiceYear` *(new, per bucket)* | Year work is finished | Tax write-offs start when work is *completed and in use*, not when it's paid for. A parking lot finished in Year 2 moves its deduction to Year 2. |
| `buyoutMonth` *(new)* | Buyout timing | January vs. December placement shifts which tax year absorbs the investors' exit gain. |
| `exitShortLifeAllocationPct` *(new)* | Exit value on short-life items | At buyout, how much of the price is attributed to appliances/site work (taxed at high ordinary rates) vs. the building (25%/15%). Five-year-old appliances justify a low number — negotiate this schedule; it's worth 1.5–2.5 points of IRR. |

### Taxes & law (Advanced panel — from old `CONSTANTS`)
| Code key | Label | Tooltip |
|---|---|---|
| `UNRECAP_1250_RATE` | Depreciation-recapture tax rate | When a depreciated building sells, the gain caused by past depreciation deductions is taxed at up to this rate (25%) instead of the normal capital-gains rate. |
| `LTCG_RATE_LOW / HIGH`, `LTCG_HIGH_THRESHOLD` | Capital-gains rates & 20% threshold | Profits on long-held property are taxed at 15%, rising to 20% above ~$614k of income (married, 2026). Spreading the sale over years keeps most gain at 15% — a core reason this structure beats a lump-sum sale. |
| `NIIT_RATE / THRESHOLD` | Investment-income surtax | An extra 3.8% federal tax on investment income above $250k (married) / $200k (single). Installments keep most years under the line. |
| `CHARITY_AGI_LIMIT / FLOOR / USABLE_YEARS` | Donation deduction limits | A property gift is deductible up to 30% of income per year, for six years total; the first 0.5% of income is disallowed each year (2026 law). Unused amounts after year six expire — the dashboard warns. |
| `BUILDING_RATIO` | Building share of value | How much of the property's value is building (depreciable) vs. land (not). 75% is typical; make property-specific from the county's land/building split. |
| `COST_SEG_SHORT_LIFE_PCT` | Cost-segregation share | Share of the purchased buildings an engineering study can reclassify for immediate write-off. 20–30% is the honest range for garden apartments; 25% survives review without argument. |
| `OHIO_BONUS_ADDBACK` | State bonus-depreciation addback | Ohio doesn't honor the federal first-year write-off up front: 5/6 is added back and recovered over five years. Jurisdiction-preset value. |
| `OHIO_BID_CAP / RATE` | State business-income deduction | Ohio deducts the first $250k/yr of business income and taxes the rest at 3% — worth ~$18k to the seller here. Requires CPA confirmation; jurisdiction-preset. |
| `localTaxRate` + `localTaxesIntangibles` *(new flag)* | City income tax & what it touches | Yellow Springs charges 1.5%, but Ohio law bars cities from taxing interest or capital gains — so it never touches the seller's loan income, only positive rental profits. The flag exists so other states' rules can differ. |

## 3. Management inflation — 3% per year, stated plainly

Replace the one-time Phase-2 bump (`MGMT_INFLATION_P2: 1.15`) with `ESC_MANAGEMENT: 0.03`, compounding annually from Year 1. Continuity check: 1.03⁵ ≈ 1.159, so the Year-5 level matches the old 15% bump almost exactly — same destination, honest path. UI copy: **"Management fee grows 3% per year."**

## 4. Inflation everywhere else

Every operating line gets an escalator, compounding annually, config-driven, with a `ESC_GENERAL` (default 2.5%) fallback for any line without a specific one:

| Line | Default | Basis |
|---|---|---|
| Owner-paid utilities | **8%** through 2027, then 4% | Village ordinance locks 8% water increases through 2027; PFAS compliance sustains pressure after |
| Insurance | **8%** | habitational market trend |
| Property taxes | **3%** | levy growth + reappraisal cycle |
| Repairs & maintenance | **3%** | aging building, trade labor |
| Management | **3%** | § 3 |
| Reserves | **3%** | replacement costs inflate too |
| Rent display | 2.5% (display-only toggle) | show required rents in both nominal and today's dollars |

Engine: Phase-1 required rent may stay a Year-1 snapshot, but Phase-2 rent **must** be computed on buyout-year escalated opex (expect ≈ $885–900, not $787, at realistic defaults) — and the rent-cliff alert must evaluate against the escalated number, or it will sleep through a real cliff.

## 5. The 1993 cost basis — estimate and what it turns out to mean

Three independent estimates of the property's 1993 value (24 garden units + house, 1968 construction, Dayton-metro village):

| Method | 1993 estimate |
|---|---|
| Income approach: ~$375–425/mo village rents × GRM 5–6 for 25-yr-old Class C | $450k–$640k |
| Price-per-unit comps, Dayton MSA Class B/C garden, 1993: $14k–20k/unit | $350k–$500k |
| Backcast: $1.5M today deflated at 3.5–4.5%/yr apartment appreciation over 33 yrs | $355k–$480k |

Convergence: **$425k–$525k; use $475,000** if the 1993 transfer was a purchase or inheritance (inheritance = stepped-up to 1993 value). Building share $356k, fully depreciated by ~2021, so `accumulatedDepreciation = 356,250`.

The critical fork: ANALYSIS.md says "1993 **transferred** basis." If the transfer was a **gift**, basis is the *original owner's* carryover — plausibly the 1968 construction cost of roughly $10–11k/unit ≈ **$250k**, which is exactly the current default. So both defaults are internally coherent; they encode different transfer stories.

Engine-verified consequence — it barely matters: gift basis ($250k/$185k) → lifetime tax $195.8k; stepped-up ($475k/$356k) → $198.7k. Nearly a wash, because on a fully-depreciated building every extra dollar of basis has already converted into 25%-rate recapture. What actually matters is **accuracy, not optimization**: the real numbers are sitting on the seller's Schedule E depreciation schedule (Form 4562). Get the return; stop estimating. UI: add a "transfer type" selector (purchase / inheritance / gift) that sets sensible defaults and a tooltip telling the user exactly which tax form to pull.

## 6. Default changes vs. v5.1 patch

`originalCostBasis: 475000`, `accumulatedDepreciation: 356250` (stepped-up story, pending the seller's return), `ESC_MANAGEMENT: 0.03` replacing `MGMT_INFLATION_P2`, `ESC_GENERAL: 0.025`, `sellerFilingStatus: 'MFJ'`. All other v5.1 values stand.
