// ============================================================================
// V5.1 DEFAULTS PATCH — apply to src/utils/calculations.ts
// Priority ordering: seller → investors → tenants → CLT/management.
// Every changed line cites its basis. Engine changes required beyond
// constants are listed at the bottom.
// ============================================================================

export const DEFAULT_INPUTS_V51 = {
  units: 25,
  currentRent: 700,
  vacancyRate: 4,

  // --- Operating lines re-underwritten to Yellow Springs reality -----------
  propertyTaxes: 30000,        // was 28,472. YS effective rate 1.95% (highest in
                               // Greene Co.); arm's-length conveyance will reach
                               // the Auditor. BOR challenge is the counter-lever.
  annualInsuranceMisc: 22500,  // was 15,000. $900/unit. National MF avg $777/unit
                               // (2024, +55% since 2021); 1968 vintage + hard
                               // habitational market; verify wiring era.
  mgmtFeePerDoor: 50,          // unchanged; Phase-2 self-management is the lever.
  repairsMaintPerUnit: 1200,   // was 900. 58-year-old building.
  utilitiesPerUnit: 1150,      // was 600. Village water $18.04/kgal (2026) →
                               // $19.48 (2027); combined w/s ≈ $31.6/kgal;
                               // ~2,300 gal/unit/mo ≈ $870 w/s + trash/common.
  reservesPerUnit: 400,        // was 300. Age-appropriate replacement funding.

  // --- Seller profile -------------------------------------------------------
  totalFMV: 1500000,
  originalCostBasis: 475000,   // was 250,000. 1993 stepped-up/purchase estimate
                               // (three-method convergence $425–525k; see
                               // UX-CONFIG-SPEC-v5.2.md §5). Keep 250,000 if the
                               // 1993 transfer was a GIFT (1968-cost carryover).
                               // Confirm from seller's Form 4562 / Schedule E.
  accumulatedDepreciation: 356250, // building share fully depreciated by ~2021
  cltLandDonation: 440000,
  sellerOtherIncome: 75000,
  sellerOrdinaryRate: 24,
  discountRate: 5,

  // --- Deal structure (unchanged; seller-priority core) ---------------------
  sellerDownPaymentPct: 15,    // funds Year-1 tax ($43k) with ~$116k headroom
  sellerInterestRate: 6,       // > AFR (§1274), < 7% commercial; confirm
                               // month-of-closing AFR
  noteTermYears: 20,
  balloonYear: 5,              // drives 100% §170 utilization — do not stretch
  phase2CommercialRate: 7,
  stateTaxRate: 2.75,          // Ohio flat, HB 96, TY2026+
  localTaxRate: 1.5,           // Yellow Springs (RITA); intangibles exempt ORC 718

  // --- Investor profile ------------------------------------------------------
  investorPrefReturn: 7,       // unchanged; add PIK/current-pay toggle (below)
  investorMarginalRate: 35,
  investorHasREPS: true,
  capexRoofStruct: 90000,
  capexParkingLand: 50000,
  capexAppliances: 40000,      // include low-flow fixtures/leak detection here:
                               // at $31.6/kgal, conservation CapEx is the
                               // highest-ROI line in the deal
} as const;

export const CONSTANTS_V51 = {
  UNRECAP_1250_RATE: 0.25,
  LTCG_RATE_LOW: 0.15,
  LTCG_RATE_HIGH: 0.20,
  LTCG_HIGH_THRESHOLD: 613700, // was 550,000. 2026 MFJ breakpoint ($533,400
                               // single — make filing-status-driven).
  NIIT_RATE: 0.038,
  NIIT_MAGI_THRESHOLD: 250000, // MFJ; 200,000 single — expose filing status.
  CHARITY_AGI_LIMIT: 0.30,
  CHARITY_FLOOR_AGI: 0.005,    // NEW — OBBBA: itemized charitable deduction
                               // allowed only above 0.5% of AGI, per year
                               // claimed, contributions after 12/31/2025.
  CHARITY_USABLE_YEARS: 6,
  BUILDING_RATIO: 0.75,
  COST_SEG_SHORT_LIFE_PCT: 0.25, // was 0.30. Mid-range for garden apartments;
                                 // survives an engineering study unargued.
  EXIT_1245_ALLOCATION: 0.50,  // NEW — share of short-life depreciation
                               // recaptured as ORDINARY income at exit
                               // (§1245). 0.0 = V5 behavior (all 25%),
                               // 1.0 = full ordinary. Negotiate the exit
                               // purchase-price allocation; worth 1.5–2.5
                               // IRR points ($117k–$158k exit-tax range).
  RESIDENTIAL_LIFE: 27.5,
  REFI_AMORT_YEARS: 30,
  // MGMT_INFLATION_P2 REMOVED — replaced by ESC_MANAGEMENT (1.03^5 ≈ 1.159,
  // so the Year-5 level matches the old one-time 15% bump).
  RENT_CLIFF_THRESHOLD_PCT: 10,
  OHIO_BONUS_ADDBACK: 5 / 6,
  // NEW — escalators (compound annually from Year 1; Phase-2 rent and the
  // rent-cliff alert MUST use buyout-year escalated opex):
  ESC_UTILITIES: 0.08,         // Council-authorized water increases through
                               // 2027; PFAS capital sustains pressure after
  ESC_INSURANCE: 0.08,         // habitational market trend
  ESC_PROPERTY_TAX: 0.03,
  ESC_MANAGEMENT: 0.03,        // "Management fee grows 3% per year"
  ESC_GENERAL: 0.025,          // fallback for R&M, reserves, any unspecified line
  // NEW — Ohio Business Income Deduction (CPA to confirm characterization):
  OHIO_BID_CAP: 250000,        // first $250k/yr of business income deducted
  OHIO_BID_RATE: 0.03,         // flat 3% above the cap
} as const;

// ============================================================================
// ENGINE CHANGES REQUIRED (beyond constants)
// ============================================================================
// 1. Basis allocation (§ 2.5 of review): NOT a §1011(b) bargain sale — land
//    donated to the CLT, improvements sold to the co-op, two counterparties.
//    Use asset-level basis: land = 25% of cost (never depreciated) to the
//    gift; building adjusted basis (187.5k − dep) to the sale. GPR ≈ 99.8%
//    at defaults, not 95.7%.
// 2. Charitable floor: each year, deduction = min(carry, 30%·AGI) reduced by
//    0.5%·AGI floor (disallowed portion does NOT carry forward).
// 3. Exit tax: exitOrdinary = min(exitGain, shortLifeDep·EXIT_1245_ALLOCATION)
//    at investorMarginalRate; next tranche at 25% up to remaining dep; rest
//    at 15%. Blended default exit tax ≈ $135k; honest REPS IRR ≈ 8%.
// 4. Ohio BID: seller — state tax = OHIO_BID_RATE · max(0, nii − 250k)
//    per year (drops total state tax $34.8k → $16.7k at defaults).
//    Investor profit years fall entirely inside the cap → $0 state.
//    Gate behind a toggle labeled "CPA-confirmed business income."
// 5. §199A QBI: 20% deduction on positive taxable rental income (years 2–5,
//    $19–24k/yr) for the REPS path.
// 6. Escalators: apply ESC_* to utilities/insurance/taxes per year; compute
//    Phase-2 rent on year-(balloonYear+1) opex. Expect P2 ≈ $885–900, not
//    $787 — the "-5.3% rent drop" does not survive escalation.
// 7. Pref toggle: prefCurrentPay: boolean (or split %). PIK pref holds
//    Phase-1 rent at ~$742 instead of $824 at realistic opex.
// 8. Filing status input driving NIIT threshold + LTCG breakpoint.
// 9. FORMULA-OPTION EXIT (structural decision, July 2026): the CLT ground
//    lease embeds a fixed-price purchase option over the improvements —
//    exit price = unreturned capital + accrued unpaid pref + balloon payoff
//    (assumed via refinance). No FMV/appreciation participation. Transfers
//    of ENTITY interests trigger the option; ROFR retained only as backstop;
//    memorandum of option recorded. Engine: exit salePrice is already
//    formula-consistent (balloon + capitalRequired) — add accruedPref when
//    the PIK toggle (change 7) is on. CPI indexation of capital: modeled as
//    an optional input, DEFAULT OFF (the 7% pref already prices time value).
// 10. NO bargain-sale / Rev. Rul. 82-197 deduction at exit — evaluated and
//    rejected. Authority is one 1982 ruling with hostile adjacent doctrine
//    (quid pro quo: Hernandez, American Bar Endowment, Wendell Falls;
//    syndicated real-estate charitable deductions are an IRS enforcement
//    priority; strict substantiation per RERI Holdings). The ground-lease
//    formula cap means investor-interest FMV ≈ formula price — no gift
//    element exists. Charitable outlet: individual investors may donate
//    cash from formula proceeds post-closing (60%-of-AGI, no appraisal,
//    no structural dependency). Do not model a deduction.
// 11. capexPlacedInServiceYear per bucket (roof/parking/appliances): bonus
//    and MACRS start in the placed-in-service year, not the spend year.
//    Year-2 completion moves ~$17.5k of REPS Year-1 tax savings to Year 2.
//    Flag Q4-heavy placements (mid-quarter convention on non-bonused
//    property). Buyout date input (month/year): January-Y6 vs December-Y5
//    shifts exit gain a full tax year.
// ============================================================================
