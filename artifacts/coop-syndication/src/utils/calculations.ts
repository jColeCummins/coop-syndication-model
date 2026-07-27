// ============================================================================
// V5.2 CALCULATION ENGINE — Limited-Equity Co-op Conversion Underwriting
// ============================================================================
// Single entry point: calculateDealMetrics(inputs). Pure, typed, no UI
// side-effects. Components must contain zero math.
//
// V5.2 implements the accepted subset of docs/REVIEW-2026-07.md and
// docs/defaults-v5.1.patch.ts (engine changes 1–8), triaged for complexity:
//
//  IMPLEMENTED
//  1. Asset-level basis split (NOT § 1011(b) pro-rata): the land parcel and
//     its basis go to the CLT gift; the building's adjusted basis goes to
//     the co-op sale. Two assets, two counterparties, no bargain element.
//  2. OBBBA 0.5%-of-AGI charitable floor (2026+): the first 0.5% of AGI of
//     contributions claimed each year is disallowed and does NOT carry over.
//  3. § 1245 ordinary-rate exit recapture via exitShortLifeAllocationPct —
//     the negotiated share of exit price allocated to short-life property.
//  4. Ohio Business Income Deduction (first $250k/yr deducted, 3% above),
//     behind a "CPA-confirmed" toggle, applied to seller note income and
//     investor rental profits during the hold.
//  5. § 199A QBI: 20% deduction on positive REPS-year rental income.
//  6. Per-line opex escalators compounding from Year 1; Phase-2 rent and the
//     rent-cliff alert are computed on BUYOUT-YEAR escalated opex.
//     Management: 3%/yr escalator replaces the one-time ×1.15 bump.
//  7. PIK preferred toggle: accrue the 7% pref to the buyout instead of
//     current-paying it from rents (the tenant affordability relief valve).
//  8. Filing-status-driven NIIT threshold and 20% LTCG breakpoint (2026).
//
//  DEFERRED (recorded, not built — see docs/ANALYSIS.md V5.2 addendum)
//  – JSON preset / 4-layer config architecture ("US-2026", jurisdiction
//    packs); constants are grouped by layer below as the seam for it.
//  – capexPlacedInServiceYear per bucket, buyout month/year, CPI indexation
//    of investor capital (decision: default OFF), display-dollars toggle,
//    transfer-type selector (tooltips carry the gift-vs-stepped-up fork).
//
//  STRUCTURAL DECISIONS ALREADY MADE (do not relitigate — handoff §2):
//  – Exit is a fixed-formula purchase option in the CLT ground lease:
//    unreturned capital + accrued unpaid pref + balloon payoff. No
//    appreciation participation. Engine exit price is formula-consistent.
//  – No bargain-sale / Rev. Rul. 82-197 deduction at exit.
// ============================================================================

import { pmt, remainingBalance, irr, npv } from './finance';

/** Clamp a share to [0,1] — surplus splits must never over- or under-allocate. */
const clamp01 = (v: number): number => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/** Present value of a level annuity — inverse of pmt(), for max-supportable-loan. */
function pvOfAnnuity(annualRate: number, months: number, monthlyPayment: number): number {
  const i = annualRate / 12;
  if (months <= 0 || monthlyPayment <= 0) return 0;
  if (i === 0) return monthlyPayment * months;
  return (monthlyPayment * (1 - Math.pow(1 + i, -months))) / i;
}

// ----------------------------------------------------------------------------
// Inputs
// ----------------------------------------------------------------------------

export type FilingStatus = 'single' | 'mfj';

export interface DealInputs {
  // Property & Operations
  units: number;
  currentRent: number;             // $/mo
  vacancyRate: number;             // %
  propertyTaxes: number;           // $/yr, year-1 level
  annualInsuranceMisc: number;     // $/yr, year-1 level
  mgmtFeePerDoor: number;          // $/door/mo, year-1 level
  repairsMaintPerUnit: number;     // $/unit/yr, year-1 level
  utilitiesPerUnit: number;        // $/unit/yr, owner-paid, year-1 level
  reservesPerUnit: number;         // $/unit/yr, year-1 level
  cltGroundLeasePerUnit: number;   // $/unit/yr paid to the CLT for the land + stewardship
  // Inflation & escalators — LONG-RUN AVERAGE %/yr, adjustable. Defaults are
  // blends, not near-term spikes: e.g. utilities average the ordinance-locked
  // 8% (through 2027) with a ~4% long-run tail, not 8% in perpetuity.
  escUtilities: number;            // %/yr
  escInsurance: number;            // %/yr
  escPropertyTax: number;          // %/yr
  escManagement: number;           // %/yr
  escGeneral: number;              // %/yr — R&M, reserves, unspecified lines
  // Property-tax abatement — a CRA / restricted-rent-valuation reduction on the
  // property-tax LINE ONLY (does not touch the seller note or investor basis).
  // 0% = not yet won / off. When active it lowers tenant rent for the term, then
  // the full escalated tax snaps back in the first post-abatement year.
  propertyTaxAbatementPct: number;   // % reduction of the property-tax line, 0–100
  propertyTaxAbatementYears: number; // term of years the reduction applies (from Y1)
  // Rent policy & surplus deployment. Cost-recovery rent is a FLOOR, not a
  // target: charging it exactly makes NOI equal debt service (DSCR 1.00), which
  // no lender will refinance. Holding rent at a policy level at or above the
  // floor produces a surplus that is both the affordability promise and the
  // underwriting cushion. Surplus splits three ways; shadow equity takes the
  // remainder so the three shares always total 100%.
  rentPolicyEnabled: boolean;        // false = pure cost-recovery (legacy behaviour)
  policyMonthlyRent: number;         // $/mo the co-op actually charges in Phase 1
  surplusToPrincipalPct: number;     // % of surplus → extra seller-note principal
  surplusToReservesPct: number;      // % of surplus → capital reserve account
  // Phase-2 financing feasibility — the takeout test the model used to skip.
  // Stabilized value for the LTV test. 0 = DERIVE IT from the restricted
  // income approach (Phase-2 NOI ÷ exitCapRate) rather than assert a market
  // number. Deriving is the honest default: a property encumbered by a ground
  // lease and at-cost rents is appraised on the income it can actually collect,
  // and the same restricted income that wins a property-tax reduction also
  // caps what a lender will advance. See ANALYSIS.md A.21.
  stabilizedValue: number;           // $ override; 0 = use the income approach
  exitCapRate: number;               // % cap rate for the income-approach value
  maxLtvPct: number;                 // lender's max loan-to-value
  minDscr: number;                   // lender's min debt-service coverage ratio
  // Member share capital. Replaces investor capital 1:1 and earns NO preferred
  // return, so every share dollar lowers rent in both phases. It is refundable
  // AT PAR on exit (limited equity — no appreciation), which is what keeps the
  // co-op affordable across generations.
  //
  // ANTI-DISPLACEMENT GUARDRAIL — the share price is the gentrification risk in
  // this whole structure. A price that screens out sitting tenants defeats the
  // purpose. Participation below 100% is the NORMAL case and is not a failure:
  // non-purchasing households remain residents at the same rent and may join
  // later. Buying a share must never be a condition of staying.
  memberSharePrice: number;          // $/unit one-time share
  memberShareParticipationPct: number; // % of units purchasing at closing
  shareAssistancePct: number;        // % of those shares needing outside help
  // Seller Profile
  totalFMV: number;
  // What a real cash buyer would actually pay for the WHOLE property, fee
  // simple — which need not equal appraised FMV. Cash offers routinely sit
  // below appraisal for speed, certainty and as-is condition. 0 = use FMV.
  // Drives ONLY the straight-cash comparison scenario; it never touches the
  // § 170 donation (which rests on the land parcel's own appraisal) or the
  // co-op's contract price. See TOOLTIPS.cashOffer for the appraisal caution.
  cashOfferPrice: number;
  originalCostBasis: number;
  accumulatedDepreciation: number; // clamped to building share of basis
  cltLandDonation: number;         // appraised FMV of the donated land parcel
  sellerOtherIncome: number;
  sellerOrdinaryRate: number;      // % federal marginal
  sellerFilingStatus: FilingStatus;
  discountRate: number;            // % NPV discount = seller's after-tax reinvestment rate
  comparisonHorizon: number;       // years, for the terminal-wealth "money in Year N" view
  marketSaleCostPct: number;       // % broker + closing on an open-market cash sale
  directDealCostPct: number;       // % legal/title on a direct sale to the co-op (no broker)
  // Deal Structure
  sellerDownPaymentPct: number;
  sellerInterestRate: number;
  noteTermYears: number;
  balloonYear: number;
  phase2CommercialRate: number;
  phase2AmortYears: number;        // bank refinance term at buyout (own loan, own term)
  stateTaxRate: number;            // % flat state income tax (nonbusiness)
  localTaxRate: number;            // % municipal (net profits only)
  ohioBIDConfirmed: boolean;       // Ohio Business Income Deduction, CPA-confirmed
  // Grants & Subsidy — $0 = not awarded. Soft (forgiven, non-amortizing)
  // funding. Two timing modes:
  //   grantsAtClosing=true  → committed before closing; replaces investor
  //                           capital dollar-for-dollar (lowers BOTH phases).
  //   grantsAtClosing=false → pursued during the hold and applied at the
  //                           buyout, shrinking the Phase-2 refinance only —
  //                           the "investors move first, grants chisel the
  //                           Year-5 rent" strategy. DEFAULT: don't close on
  //                           hope; underwrite Phase 1 on investor capital.
  // Compliance periods are covenants (tooltips), not cash flows. Ordered by
  // descending probability of award.
  grantsAtClosing: boolean;
  grantEnergyRebates: number;      // utility/HWAP rebates — near-certain, small
  grantCountyHome: number;         // HOME/CHDO via the CLT — high, incumbent partner
  grantOhioTrust: number;          // Ohio Housing Trust Fund — moderate
  grantFhlbAhp: number;            // FHLB Cincinnati AHP — competitive
  // Investor Profile & New CapEx
  // MASTER SWITCH for the tax-investor layer. OFF collapses the syndicate
  // entirely: no investor capital, no preferred return, no bonus depreciation,
  // no Year-5 capital return. Whatever the deal still needs at closing becomes
  // a CLOSING CAPITAL GAP to be met by member shares, grants, a subordinate
  // CDFI/Home Inc. loan, a smaller down payment, or a phased renovation.
  // Turn it off when no investor can actually USE the depreciation — a REPS
  // investor already sheltered by other paper losses has no marginal appetite,
  // and a passive investor cannot deduct currently at all (§ 469 suspends
  // until exit). See ANALYSIS.md A.23.
  investorsEnabled: boolean;
  investorPrefReturn: number;      // %
  prefCurrentPay: boolean;         // true = paid from rents; false = accrues (PIK)
  investorMarginalRate: number;    // %
  investorHasREPS: boolean;
  exitShortLifeAllocationPct: number; // % of short-life depreciation recaptured ordinary at exit
  capexRoofStruct: number;
  capexParkingLand: number;
  capexAppliances: number;
}

// Defaults re-underwritten July 2026 (docs/REVIEW-2026-07.md §3–5):
// - totalFMV $1.25M: as-is value at $700 in-place rents with deferred
//   maintenance. Income approach: EGI ~$202k − realistic YS opex ~$126k
//   (ex-reserves) = NOI ~$75k at a 6.5–7.5% Class-C village cap = $1.0–1.15M;
//   sales comps ~$50k/door Dayton-metro C garden with a Yellow Springs
//   premium and the 3.58-acre site = $1.2–1.35M. $1.5M was a stabilized
//   (post-renovation, market-rent) number, not an as-is one.
// - cltLandDonation $430k (34.4% of FMV): just inside the $436k (34.9%)
//   maximum the seller fully absorbs within the § 170 six-year window at
//   these defaults (findMaxAbsorbableDonation), leaving margin for appraisal
//   drift. 30% of FMV ($375k) absorbs with slack; 40% ($500k) strands ~$87k
//   of deduction. Must be supported by a qualified appraisal of the
//   3.58-acre parcel.
// - Basis $475k / dep $356,250: 1993 stepped-up estimate (three-method
//   convergence $425–525k). If the 1993 transfer was a GIFT, use $250k
//   carryover. The real number is on the seller's Form 4562.
export const DEFAULT_INPUTS: DealInputs = {
  units: 25,
  currentRent: 700,
  vacancyRate: 6,              // conversion years: inherited residents, no screening (A.22)
  propertyTaxes: 30000,
  annualInsuranceMisc: 22500,
  mgmtFeePerDoor: 50,
  repairsMaintPerUnit: 1200,
  utilitiesPerUnit: 1500,
  reservesPerUnit: 550,        // 1968 building; $400 was thin and lenders escrow reserves
  cltGroundLeasePerUnit: 300, // ~$25/unit/mo stewardship fee; see TOOLTIPS.groundLease
  // Blended long-run averages (was flat 8% for utilities/insurance in perpetuity):
  escUtilities: 5.5,          // ~8% locked through 2027 tapering to ~4% (PFAS tail)
  escInsurance: 5.0,          // habitational hard market softening from ~8%
  escPropertyTax: 3.0,
  escManagement: 3.0,
  escGeneral: 2.5,
  propertyTaxAbatementPct: 0,   // off by default — abatement is applied for, not assumed
  propertyTaxAbatementYears: 12, // typical Ohio CRA term for residential rehab
  // Rent policy: hold rent at today's $700 rather than cutting to the cost
  // floor, and spend the difference on the balloon, reserves, and member
  // recognition. Turn OFF to see the pure cost-recovery floor.
  rentPolicyEnabled: true,
  policyMonthlyRent: 700,       // today's rent — tenants see no increase
  surplusToPrincipalPct: 60,    // extra principal shrinks the Year-5 takeout
  surplusToReservesPct: 25,     // 1968 building; lenders escrow reserves anyway
  stabilizedValue: 0,           // 0 = derive from restricted income; override only with a real appraisal
  exitCapRate: 7.0,             // Class-C garden apartment, Yellow Springs
  maxLtvPct: 75,                // co-op blanket loans often stricter — see tooltip
  minDscr: 1.2,
  // $2,000 chosen deliberately BELOW the $3,500 Greenmont benchmark
  // (docs/COMPARABLE-GREENMONT.md): ~2.9 months of rent here, reachable on an
  // installment plan, and low enough not to price out sitting tenants.
  memberSharePrice: 2000,
  memberShareParticipationPct: 80, // day-one buy-in; the rest join later
  shareAssistancePct: 40,          // share needing YS Community Foundation help
  totalFMV: 1250000,
  cashOfferPrice: 0,           // 0 = a cash buyer pays appraised FMV; set it lower to test a real offer
  originalCostBasis: 475000,
  accumulatedDepreciation: 356250,
  cltLandDonation: 430000,
  sellerOtherIncome: 75000,
  sellerOrdinaryRate: 24,
  sellerFilingStatus: 'mfj',
  discountRate: 5,
  comparisonHorizon: 20,
  marketSaleCostPct: 5.5,     // ~5% broker + ~0.5% closing on an open-market sale
  directDealCostPct: 1.0,     // legal/title on a negotiated direct sale to the co-op
  sellerDownPaymentPct: 15,
  sellerInterestRate: 6,
  noteTermYears: 20,
  balloonYear: 5,
  phase2CommercialRate: 7,
  phase2AmortYears: 30,
  stateTaxRate: 2.75,
  localTaxRate: 1.5,
  ohioBIDConfirmed: false,     // CPA-CONFIRM means do not assume it — upside, not base case
  grantsAtClosing: false,
  grantEnergyRebates: 0,
  grantCountyHome: 0,
  grantOhioTrust: 0,
  grantFhlbAhp: 0,
  investorsEnabled: true,      // OFF models the grants-and-member-equity path
  investorPrefReturn: 7,
  prefCurrentPay: true,
  investorMarginalRate: 35,
  investorHasREPS: false,      // passive is the honest base case; REPS is a named-investor fact
  exitShortLifeAllocationPct: 50,
  capexRoofStruct: 90000,
  capexParkingLand: 50000,
  capexAppliances: 40000,
};

// Constants grouped by future preset layer (UX-CONFIG-SPEC-v5.2 §1). The
// grouping is the seam for the deferred JSON-preset architecture.
export const TAX_POLICY = {
  UNRECAP_1250_RATE: 0.25,
  LTCG_RATE_LOW: 0.15,
  LTCG_RATE_HIGH: 0.20,
  LTCG_HIGH_THRESHOLD: { single: 533400, mfj: 613700 } as Record<FilingStatus, number>, // 2026
  NIIT_RATE: 0.038,
  NIIT_MAGI_THRESHOLD: { single: 200000, mfj: 250000 } as Record<FilingStatus, number>,
  CHARITY_AGI_LIMIT: 0.30,
  CHARITY_FLOOR_AGI: 0.005,      // OBBBA floor, contributions after 12/31/2025
  // OBBBA also caps the VALUE of itemized deductions for top-bracket payers:
  // the benefit is haircut to roughly 35 cents on the dollar rather than 37.
  // Modeled as a ceiling on the rate at which a charitable dollar offsets
  // ORDINARY income. Non-binding below the 37% bracket (default seller is 24%).
  CHARITABLE_BENEFIT_CAP: 0.35,
  CHARITY_USABLE_YEARS: 6,       // contribution year + 5-yr carryforward
  QBI_DEDUCTION: 0.20,           // § 199A on qualified rental income
  RESIDENTIAL_LIFE: 27.5,
} as const;

export const JURISDICTION = {
  OHIO_BONUS_ADDBACK: 5 / 6,     // § 168(k) addback, recovered 1/5 over 5 yrs
  OHIO_BID_CAP: 250000,          // Business Income Deduction: first $250k/yr
  OHIO_BID_RATE: 0.03,           // flat 3% above the cap
  MUNI_TAXES_INTANGIBLES: false, // ORC 718: interest/gains municipally exempt
} as const;

// GROUND_LEASE stays a fixed constant (a slow, affordability-held CLT
// stewardship step, not a market-inflation line). The market-inflation
// escalators are now adjustable inputs (esc* on DealInputs); the values here
// are retained only as documentation of the prior defaults.
export const ESCALATORS = {
  UTILITIES: 0.055,              // now inputs.escUtilities (blended avg, was flat 0.08)
  INSURANCE: 0.05,               // now inputs.escInsurance (was flat 0.08)
  PROPERTY_TAX: 0.03,            // now inputs.escPropertyTax
  MANAGEMENT: 0.03,              // now inputs.escManagement
  GROUND_LEASE: 0.015,           // CLT ground lease: slow CPI-style step, held low for affordability
  GENERAL: 0.025,                // now inputs.escGeneral (R&M, reserves)
} as const;

export const DEAL_CONSTANTS = {
  BUILDING_RATIO: 0.75,          // building share of basis; land = 25%
  COST_SEG_SHORT_LIFE_PCT: 0.25, // mid-range for garden apartments (was 0.30)
  REFI_AMORT_YEARS: 30,          // default only; the live term is inputs.phase2AmortYears
  RENT_CLIFF_THRESHOLD_PCT: 10,
  MAX_DONATION_PCT_OF_FMV: 0.40, // search ceiling for the § 170 optimizer
} as const;

// Back-compat aggregate (sanity scripts, tests).
export const CONSTANTS = { ...TAX_POLICY, ...JURISDICTION, ...DEAL_CONSTANTS, ESC: ESCALATORS } as const;

// ----------------------------------------------------------------------------
// Output shapes
// ----------------------------------------------------------------------------

export interface SellerYearRow {
  year: number;
  interestReceived: number;
  principalReceived: number;
  grossCashReceived: number;
  gainRecognized: number;
  gain25: number;
  gainLtcg: number;
  charitableDeductionUsed: number; // after the 0.5% AGI floor
  federalTax: number;
  stateTax: number;
  niitTax: number;
  totalTax: number;
  postTaxCash: number;
  cumulativePostTaxCash: number;
  remainingNoteBalance: number;
  shieldActive: boolean;
  isBalloonYear: boolean;
}

export interface SellerScenario {
  label: string;
  saleCosts: number;             // broker/legal/closing costs for this path
  nominalAfterTax: number;       // undiscounted after-tax proceeds (net of costs)
  npvAfterTax: number;           // discounted at the seller's after-tax reinvestment rate
  terminalWealth: number;        // npvAfterTax grown to the comparison horizon at that rate
  totalTax: number;
  cashAtClosing: number;         // after-tax cash IN HAND on closing day
}

export interface SellerMetrics {
  contractPrice: number;
  downPayment: number;
  financedPrincipal: number;
  totalAdjustedBasis: number;
  soldAdjustedBasis: number;       // building adjusted basis (asset-level split)
  donatedBasisAllocated: number;   // land basis, gifted with the parcel
  clampedDepreciation: number;
  depWasClamped: boolean;
  grossProfit: number;
  grossProfitRatio: number;
  unrecap1250Total: number;
  schedule: SellerYearRow[];
  year1Tax: number;
  year1GrossCash: number;
  headroom: number;
  isTaxExceedsDP: boolean;
  charitable: {
    total: number;
    used: number;                  // deducted after floor
    floorLost: number;             // disallowed by the 0.5% AGI floor (never carries)
    expired: number;               // carryforward remaining after Year 6
    utilizationPct: number;        // used ÷ total
    firstZeroShieldYear: number;
  };
  comparison: {
    straightCash: SellerScenario;
    cashPlusDonation: SellerScenario;
    installmentPlusDonation: SellerScenario;
    npvAdvantageVsCash: number;
    nominalAdvantageVsCash: number;
    horizon: number;               // comparison horizon in years
    upFrontTaxCashSale: number;    // tax due at closing in a lump cash sale
    upFrontTaxNote: number;        // tax due in Year 1 of the installment note
    deferredWorking: number;       // tax kept working inside the note vs a cash sale (Year 1)
  };
}

export interface InvestorYearRow {
  year: number;
  capitalInjected: number;
  operatingCashFlow: number;       // current-pay pref ($0 in PIK mode)
  depreciation: number;
  taxableRentalIncome: number;
  federalTaxCash: number;
  stateTaxCash: number;
  localTax: number;
  suspendedLossBalance: number;
  exitProceeds: number;            // capital + accrued pref (net of tax) − exit tax
  netCashFlow: number;
  cumulativePosition: number;
  isExitYear: boolean;
}

export interface InvestorMetrics {
  capitalRequired: number;
  grantsApplied: number;
  purchaseBasis: number;
  year1Bonus: { costSeg: number; parkingLand: number; appliances: number; total: number };
  annualSL: number;
  accruedPrefAtExit: number;       // PIK mode only; 0 when current-pay
  schedule: InvestorYearRow[];
  exit: {
    year: number;
    salePrice: number;             // formula price for the property (balloon + capital)
    depreciableBasis: number;      // contract price + new CapEx (NOT investor.purchaseBasis)
    totalDepreciationTaken: number;// Y1 bonus + straight line through the exit year
    adjustedBasisAtExit: number;
    gain: number;
    exitOrdinary: number;          // § 1245 tranche at investor marginal rate
    exit25: number;
    exit15: number;
    exitTax: number;
    netToInvestors: number;
  };
  irrWithReps: number | null;
  irrWithoutReps: number | null;
  equityMultiple: number;
  paybackYear: number | null;
  // Plain-English ROI view (active REPS toggle):
  year1TaxRefund: number;          // Year-1 federal + state tax cash back
  effectiveCapitalAtRisk: number;  // capital − Year-1 refund
  totalReturned: number;           // sum of positive annual cash flows
  netProfit: number;               // totalReturned − capital
  simpleRoi: number;               // netProfit ÷ capital (whole-hold, undiscounted)
  optimalWhen: string[];
}

/**
 * What holding rent above the cost-recovery floor buys. Cost-recovery rent is a
 * floor, not a target: charging it exactly pins DSCR at 1.00 and makes the
 * Year-5 takeout unfinanceable. The surplus is simultaneously the affordability
 * promise (rent held flat) and the lender's coverage cushion.
 */
export interface SurplusPlan {
  enabled: boolean;
  policyMonthlyRent: number;
  costFloorMonthlyRent: number;    // what break-even would have required
  annualRevenueAtPolicy: number;
  phase1RequiredRevenue: number;
  annualSurplus: number;           // never negative — see policyBelowCostFloor
  // The policy is a floor on RENT, not a cap: the co-op charges the greater of
  // the policy and its cost floor, so these are what tenants actually pay.
  effectivePhase1Rent: number;
  effectivePhase2Rent: number;
  policyBelowCostFloor: boolean;   // true = the $700 promise cannot be honored
  shortfallPerUnitMonth: number;   // how far above the policy rent must go
  years: number;                   // surplus runs years 1..balloonYear
  toPrincipalPerYear: number;
  toReservesPerYear: number;
  toShadowEquityPerYear: number;
  principalPct: number;
  reservesPct: number;
  shadowEquityPct: number;         // the remainder — always totals 100%
  extraPrincipalTotal: number;
  reservesBalanceAtBuyout: number;
  shadowEquityAtBuyout: number;
  balloonWithoutPolicy: number;
  balloonReduction: number;
}

/**
 * Member share capital and the affordability of buying in. The share price is
 * the gentrification lever in this structure: it lowers rent for everyone, but
 * only if sitting tenants can actually reach it. Reports the outside assistance
 * required so the ask to a community foundation is sized, not assumed.
 */
export interface MemberEquityPlan {
  sharePrice: number;
  participationPct: number;
  unitsPurchasing: number;
  totalRaised: number;              // clamped at the capital need
  assistanceNeeded: number;         // the community-foundation ask
  memberFunded: number;             // raised out of members' own pockets
  monthsOfRent: number;             // share price ÷ rent actually charged
  installment24: number;            // $/mo if spread over 24 months
  installment36: number;            // $/mo if spread over 36 months
  prefAvoided: number;              // annual pref this equity displaces
  rentReliefPerUnitMonth: number;   // that pref, per unit per month
  clampedByCapitalNeed: boolean;    // shares exceed what the deal needs
}

/**
 * Can the co-op actually GET the Year-5 loan? Tests the refinance burden against
 * both lender constraints and reports the dollar gap — which is the real grant
 * target, sized rather than guessed.
 */
export interface FeasibilityMetrics {
  investorsEnabled: boolean;
  capitalNeedAtClosing: number;    // down payment + new CapEx
  closingCapitalGap: number;       // unfunded once shares and grants are applied
  stabilizedValue: number;         // the value actually used in the LTV test
  incomeApproachValue: number;     // Phase-2 NOI ÷ exitCapRate
  valueIsDerived: boolean;         // true when no override was supplied
  impliedCapRate: number;          // NOI ÷ the value used — sanity check on an override
  valuationOptimism: number;       // override ÷ income-approach value (1 = consistent)
  refinanceBurden: number;
  ltv: number;
  maxLtv: number;
  ltvPass: boolean;
  phase2NOI: number;
  phase2DebtService: number;
  dscr: number;
  minDscr: number;
  dscrPass: boolean;
  phase1Dscr: number;
  maxLoanByLtv: number;
  maxLoanByDscr: number;
  supportableLoan: number;
  financingGap: number;            // >0 = the deal cannot refinance as configured
  bindingConstraint: 'ltv' | 'dscr';
}

export interface OpexBreakdown {
  propertyTaxes: number;
  insurance: number;
  mgmt: number;
  repairsMaint: number;
  utilities: number;
  reserves: number;
  groundLease: number;
  total: number;
}

export interface TenantMetrics {
  opexYear1: OpexBreakdown;
  opexBuyoutYear: OpexBreakdown;   // escalated to year balloonYear + 1
  prefAnnual: number;              // funded from rents only when prefCurrentPay
  prefInRent: number;              // prefAnnual or 0 (PIK)
  phase1AnnualDebtService: number;
  phase1AnnualRevenueReq: number;
  phase1MonthlyRent: number;
  rentDelta: number;
  balloonBalance: number;
  balloonBeyondTerm: boolean;
  accruedPrefAtExit: number;
  grantsAtBuyout: number;          // hold-period grants applied against the refinance
  phase2RefinanceBurden: number;   // balloon + capital + accrued pref − buyout grants
  phase2AnnualDebtService: number;
  phase2AnnualRevenueReq: number;
  phase2MonthlyRent: number;
  rentJumpPct: number;
  isRentCliff: boolean;
}

export interface AmortRow {
  year: number;
  annualPayment: number;
  interestPaid: number;
  principalPaid: number;
  endingBalance: number;
  isBalloonYear: boolean;
}

export interface DealMetrics {
  inputs: DealInputs;
  seller: SellerMetrics;
  investor: InvestorMetrics;
  tenant: TenantMetrics;
  memberEquity: MemberEquityPlan;
  surplus: SurplusPlan;
  feasibility: FeasibilityMetrics;
  amortSchedule: AmortRow[];
}

// ----------------------------------------------------------------------------
// Tooltip copy — plain language first, statutory detail second
// (UX-CONFIG-SPEC-v5.2 §2)
// ----------------------------------------------------------------------------

export const TOOLTIPS = {
  recapture453i:
    'PAUL\'S RECAPTURE, IN ORDER. Decades of depreciation drove his basis to nearly zero, so almost the entire price is gain. That gain splits into two buckets: the part equal to depreciation he actually took (unrecaptured § 1250, taxed at up to 25%) and the rest (long-term capital gain at 15%/20%). The crucial mechanic is TIMING and ORDERING. Timing: under the installment method he recognizes gain only as principal arrives, NOT all at closing — there is no § 453(i) acceleration here, because § 453(i) reaches ordinary § 1245/§ 1250 recapture and a building depreciated straight-line since 1993 generates none. Ordering: within each year\'s recognized gain the 25% dollars come out FIRST (Reg. § 1.453-12), so the early years are the expensive ones per dollar and the cheaper 15%/20% dollars land last — typically in the balloon year. This is why Year-1 tax looks low relative to the whole: the 25% bucket is being consumed in order, not deferred. The practical consequence for the seller: the balloon year is the big tax year, and the § 170 deduction is most valuable if it is still available to meet it.',
  grossProfitPct:
    'The share of every dollar of principal collected that counts as taxable profit. For your CPA: asset-level basis — the land basis follows the CLT gift, the building\'s adjusted basis offsets the co-op sale; two assets, two counterparties, no § 1011(b) bargain element.',
  charitable170:
    'The land gift is deductible up to 30% of income per year for six years total; the first 0.5% of income is disallowed each year (2026 law) and unused amounts expire after year six — the dashboard warns if any would. Ohio gives no state deduction for it. For your CPA: §§ 170(b)(1)(C), 170(d); OBBBA floor for contributions after 12/31/2025; qualified appraisal + Form 8283 mandatory.',
  reps469c7:
    'ON: investors (or spouses) qualify as real-estate professionals and use the deal\'s paper losses against regular income each year. OFF: losses are locked up until the buyout and arrive as one lump deduction. This toggle is worth roughly two points of IRR. For your CPA: § 469(c)(7); § 469(g) release at disposition; REPS also exempts the rental income from NIIT.',
  bonus168k:
    '100% first-year write-off on appliances, site work, and the cost-segregated share of the purchased buildings (2025 law, permanent, includes used property). The building shell depreciates over 27.5 years. Ohio adds back 5/6 of the bonus and returns it over five years. For your CPA: § 168(k) as amended by OBBBA; ORC 5747.01 addback.',
  costSegBase:
    'An engineering study can reclassify part of the purchased buildings for immediate write-off. 20–30% is the honest range for garden apartments; 25% survives review without argument. The base is the purchase price — the buyers acquire improvements only (land goes to the CLT).',
  roiStory:
    'How to read the investor return: put in capital, get a large share back within ~12 months as a Year-1 tax refund (the 100% bonus depreciation shelters the investor\'s other income — the LLC is a pass-through, so this lands on the members\' own returns). The middle years are intentionally quiet — bonus depreciation front-loads ~75% of the write-off into Year 1, and the small remaining depreciation is offset by the phantom income of note principal paydown. Capital (plus any accrued preferred) returns at the takeout. The depreciation is a real federal subsidy only a taxable investor can capture — a grant, CDFI, or the CLT cannot — which is what lets investors accept a below-market preferred return and keeps tenant rent low.',
  niit:
    'An extra 3.8% federal tax on investment income above $250k (married) / $200k (single). Spreading the sale keeps most years under the line — a lump-sum sale maximizes it. Applied automatically per year.',
  ltcgBracket:
    'Long-term gains are taxed at 15% until income crosses ~$614k (married, 2026; ~$533k single), then 20%. Installments keep annual gain in the 15% bracket; a lump-sum sale pushes most of it to 20% + surtax.',
  noteVsCashKpi:
    'Compares the seller-financed note to selling the SAME bifurcated deal for cash — it holds the land donation fixed and isolates just the financing choice. This equals the third row minus the second row of the "Why Not Just Take Cash?" panel (Installment + donation − Cash sale + donation). Positive means the note nets more after-tax NPV than a cash sale of the improvements (6% interest, tax deferral, bracket-smoothing, NIIT avoidance, full § 170 absorption). It is NOT measured against the top row — a straight cash sale of the whole property — which nets more only because it keeps the donated land (that gap is the philanthropy, not the financing).',
  terminalWealth:
    'Answers "how are we really comparing these?" Instead of just discounting, it reinvests each path\'s entire after-tax cash stream at the seller\'s after-tax reinvestment rate (the discount-rate slider) and shows the wealth each leaves in the horizon year. This makes the reinvestment assumption explicit — it is exactly the scenario where the seller takes the cash-sale proceeds and invests them at that rate. It ranks paths identically to NPV (terminal = NPV × (1 + rate)^years); the point is to show the reinvestment head-to-head in plain dollars.',
  saleCosts:
    'Transaction costs. An open-market cash sale pays a broker + closing (~5–6%). The installment note and the cash-plus-donation deal are DIRECT sales to the co-op — no broker, just legal/title (~1%). On a $1.75M property the avoided broker commission alone is ~$90k, which is often larger than the NPV gap — a real, under-appreciated advantage of the direct structured deal.',
  npvMethod:
    'HOW EVERY NPV IN THIS TOOL IS COMPUTED, so the three rows are comparable. (1) All flows are AFTER TAX — each path\'s own tax is subtracted before discounting. (2) All are discounted at the seller\'s after-tax reinvestment rate (the discount-rate slider), the return he could actually earn on money in hand. (3) YEAR 1 IS TIME ZERO in every row: closing-day money is not discounted, because all three paths receive their first dollars at closing. Discounting the note\'s down payment a full year while leaving the cash paths undiscounted understated the note, and was fixed in V5.3.4. (4) The straight-cash row is a single closing-day flow, so its NPV equals its nominal by construction — that is not a bug. (5) The cash+donation row is closing-day proceeds plus the later-year charitable deduction benefits, each discounted from its own year. (6) The installment row discounts the full after-tax schedule, including post-balloon years whose only flow is a charitable deduction benefit. (7) Wealth-in-Year-N is the same information restated: terminal = NPV × (1+rate)^N, so it ranks paths identically — its purpose is to make the reinvestment assumption explicit in dollars rather than leave it implicit in a rate.',
  discountRateAfterTax:
    'The NPV column discounts AFTER-TAX cash flows at the seller\'s after-tax opportunity cost (the "discount rate" slider). Read the 6% note coupon after tax: at ordinary rates it nets ~4.4%, so at a 5% after-tax discount the deferred principal loses a little present value each year — which is why the installment NPV sits below its nominal and only slightly above a bifurcated cash sale. Lower the discount rate toward a realistic after-tax alternative (3–4%) and the note wins decisively; the tax deferral, bracket-smoothing, and NIIT avoidance are on top of that.',
  exitTax:
    'THE WRITE-OFFS ARE A LOAN, NOT A GIFT — this is where they are repaid. Every dollar of depreciation the investors deducted reduced the property\'s tax basis by a dollar, so at the buyout those same dollars come back as gain. Mechanically: gain = formula sale price − (purchase basis − all depreciation taken). Because bonus depreciation front-loads roughly 75% of the write-off into Year 1, basis is heavily eroded by Year 5 and the gain is large even though the price is only balloon + capital. The gain is then taxed in three tranches, IN THIS ORDER: (1) ORDINARY, at the investor\'s full marginal rate, up to short-life (cost-seg, appliance, site) depreciation × the negotiated exit allocation — this is § 1245 recapture and it is the expensive tranche; (2) 25%, on the remainder up to total depreciation taken — unrecaptured § 1250; (3) 15%, on anything above that — true appreciation, which a formula-price exit largely forecloses. Flat state tax applies to the whole gain. The biggest lever is the exit-allocation slider: five-year-old appliances justify a low number, and moving it is worth 1.5–2.5 points of IRR. Negotiate that schedule in the buyout agreement — it is not an afterthought.',
  exitAllocation:
    'At buyout, how much of the price is attributed to appliances/site work (taxed at high ordinary rates) versus the building (25%/15%). Five-year-old appliances justify a low number — this is a negotiated schedule in the buyout agreement, not an afterthought.',
  noteMechanics:
    'Payments are sized as if the loan ran the full schedule, but the remaining balance is paid off at the buyout year via the co-op\'s bank refinance. If the buyout year reaches the schedule length, the loan simply pays itself off.',
  refinanceBurden:
    'What the co-op\'s bank loan must cover at buyout: the seller\'s remaining balance, the investors\' capital, and any accrued (unpaid) preferred return — minus any grants awarded during the hold and applied here. The co-op\'s ability to qualify for this mortgage is the deal\'s most important risk.',
  vacancyGrossUp:
    'Required rents are grossed up for empty units and unpaid rent: ÷ (1 − vacancy), so occupied units carry the full requirement.',
  requiredRent:
    'This is the rent needed to cover actual costs — loan payments, taxes, insurance, management, repairs, owner-paid utilities, replacement savings, the CLT ground lease, and the investor return — not a market estimate. If it sits below market comps ($900–1,100 here), the gap is the deal\'s affordability margin.',
  groundLease:
    'What the co-op pays the Community Land Trust each year to lease the land it sits on (the CLT owns the land after the gift). Keep it at a stewardship level — enough to fund the CLT\'s perpetual monitoring, not to extract land rent — because every dollar here raises tenant rent. Typical affordability-CLT fees run ~$300–600/unit/yr. IMPORTANT (keep separate from management): pure land rent is exempt from the CLT\'s unrelated-business income tax under § 512(b)(3); if the CLT also renders substantial services (management, maintenance), that can taint the rent\'s exemption. Route any CLT management through a distinct service agreement, evaluated on its own for relatedness to the CLT\'s exempt purpose.',
  municipalTax:
    'Yellow Springs charges 1.5%, but Ohio law bars cities from taxing interest or capital gains — so it never touches the seller\'s loan income, only positive rental profits (which large depreciation zeroes out in most years).',
  ohioBID:
    'Ohio\'s Business Income Deduction: the first $250k/yr of business income is state-tax-free, 3% flat above. Treating the note income and rental profits as business income cuts the seller\'s Ohio tax roughly in half — but the characterization needs your CPA\'s sign-off, which is why this is a toggle.',
  pikPref:
    'WHAT PIK IS. "Paid in kind" means the investors\' yearly return is not paid in cash — it is added to what the co-op owes them, and that larger balance then earns the return too. It COMPOUNDS. ON (current-pay): investors are paid each year out of rent, so rent carries the preferred return. OFF (PIK): nothing is paid during the hold, Phase-1 rent drops by the full preferred amount, and the whole accumulated sum is paid at the buyout out of the refinance. THE TRADE, PLAINLY: PIK is the single strongest lever for Phase-1 rent, and it is NOT free — it moves the cost onto the Year-5 refinance and charges compound interest for the privilege. At the defaults, PIK cuts Phase-1 rent by about $64/unit/month but grows the takeout by roughly $106,000, which is MORE than the ~$92,000 of rent it saved, because the unpaid preferred earns preferred. It also pushes the loan-to-value and coverage ratios the wrong way at precisely the moment the deal is most fragile — the refinance is this deal\'s binding constraint, not Phase-1 rent. Use PIK when tenants need immediate relief and you have a concrete plan (grants, member shares, faster principal) to shrink the takeout before Year 5. Do not use it to make a launch pro forma look good. Investors are taxed on the accrued preferred as ORDINARY income when it is finally paid, not as capital gain.',
  escalators:
    'Operating costs inflate: water/sewer 8%/yr (village ordinance through 2027, PFAS pressure after), insurance 8%/yr, property taxes and management 3%/yr, other lines 2.5%/yr. Phase-2 rent is computed on buyout-year costs — flat-cost models understate it badly.',
  cashOffer:
    'What a real cash buyer would actually pay for the WHOLE property, fee simple — which need not equal appraised FMV. Set $0 to assume a buyer pays appraisal. Cash offers routinely land 5–15% below appraised value: the buyer is pricing speed, certainty, as-is condition, and their own required return, and an appraisal assumes reasonable exposure time that a quick sale does not get. Lowering this makes the note look better by comparison — correctly, because the honest question is "note versus the cash Paul could ACTUALLY get," not "note versus a theoretical appraisal." It drives ONLY the straight-cash comparison row; it never touches the § 170 donation or the co-op\'s contract price. TWO CAUTIONS FOR THE CPA AND APPRAISER. (1) A contemporaneous arm\'s-length cash offer is evidence of fair market value. Claiming a high FMV to support a large charitable deduction while accepting a materially lower price is a pattern the IRS scrutinizes hard in donation cases; the land appraisal must stand on its own facts. (2) There IS a legitimate reason the parts need not sum to the whole: the co-op buys IMPROVEMENTS ON LEASED LAND, and a leasehold interest is generally worth less than a fee-simple residual. The donated parcel and the sold improvements each get their own appraisal — do not derive one by subtracting from the other.',
  cashAtClosing:
    'What the seller actually banks on closing day, after tax and after sale costs — the number a seller usually cares about most and the one NPV tends to bury. A straight cash sale hands over the whole price at once but also triggers the entire tax bill at once. The installment note pays only the down payment at closing, less Year-1 tax and legal/title, so this column is deliberately much smaller — the rest arrives over the note term with interest, and the deferred tax stays working inside the note. Read this column together with Nominal, NPV and Wealth-in-Year-N: cash at closing answers "what do I have next month," and the other three answer "what am I worth in the end."',
  investorsEnabled:
    'MASTER SWITCH for the tax-investor layer. ON: a syndicate funds the down payment and renovation, takes the bonus depreciation, earns a preferred return, and is bought out at the Year-5 refinance. OFF: no syndicate at all — no investor capital, no preferred return charged to rent, no capital to return at the buyout, so the Year-5 refinance carries only the seller balloon. Whatever the deal still needs at closing is reported as a CLOSING CAPITAL GAP rather than silently assumed. WHEN TO TURN IT OFF: the syndicate only makes sense if a real person can USE the depreciation. A real-estate professional already running paper losses from other property has no marginal appetite for more deductions, and a passive investor cannot deduct currently at all — § 469 suspends the losses until the exit, which is exactly why the passive IRR is materially below the REPS one. If nobody in the actual buyer pool can use it, the tax alpha is theoretical and the honest structure is member shares plus grants plus a low-cost subordinate loan. Pair this with a small down payment and a phased renovation: the capital need collapses fast.',
  memberShares:
    'A one-time share each member buys to join the co-op. It replaces investor capital dollar-for-dollar and earns NO preferred return, so every share dollar lowers rent in BOTH phases and shrinks the Year-5 refinance. Refundable at par when a member leaves (limited equity — no appreciation), which is precisely what keeps the co-op affordable across generations: Greenmont Mutual Housing in Kettering has stayed affordable since 1947 because members cannot sell their units at a profit. THE SHARE PRICE IS THE GENTRIFICATION RISK IN THIS DEAL. $2,000 is set deliberately below Greenmont\'s $3,500 because a price sitting tenants cannot reach would convert an anti-displacement project into a displacement one. Four rules the deal documents must carry: (1) buying a share is NEVER a condition of staying — non-purchasing households remain residents at the SAME rent and may join later; (2) offer installments (24–36 months), sweat-equity credit, and a share-assistance fund; (3) no income minimum, no credit score, no screening of sitting tenants — a conversion inherits its residents, unlike Greenmont, which admits on FICO and income floors; (4) give admission preference to people who live or work in the village, so turnover does not quietly move the community upmarket.',
  shareAssistance:
    'The share of member equity that outside money must cover so nobody is priced out — the ask to the Yellow Springs Community Foundation, Home Inc., or a revolving share-loan fund. Sizing this explicitly is the difference between a real affordability plan and a hope: it converts "some people will need help" into a dollar figure a foundation can actually consider. Assistance money behaves like member equity in the model (it replaces investor capital and earns no preferred return); it differs only in who wrote the cheque. A revolving fund is the strongest version — shares are refundable at par, so as members leave, the fund is repaid and recycles to the next household that needs it.',
  rentPolicy:
    'Cost-recovery rent is a FLOOR, not a target. Charging exactly the floor means the property earns precisely its debt service — a debt-service coverage ratio of 1.00 — and no lender refinances a break-even building. Setting a policy rent at or above the floor (default: today\'s $700, so tenants see no increase) produces a surplus that is simultaneously the affordability promise and the lender\'s coverage cushion. The surplus is spent on the three sliders below. Turn this OFF to see the pure cost-recovery floor the earlier versions reported.',
  surplusSplit:
    'Where the surplus goes. EXTRA PRINCIPAL pays down the seller note faster, shrinking the Year-5 balloon and therefore the refinance — the highest-return use, because it retires debt at the note rate. RESERVES accumulate as the co-op\'s own cash for roofs and furnaces; a 1968 building needs them and most lenders escrow them anyway, so this money is not really optional. SHADOW EQUITY (the remainder) credits members for the capital their above-floor rent contributes. Keep shadow equity NON-REDEEMABLE or deeply capped: a redeemable member claim is a balance-sheet liability a refinance lender will discount, and it can collide with the CLT ground-lease resale formula. CPA must confirm it does not disturb Subchapter T / § 216 treatment.',
  feasibility:
    'Can the co-op actually GET the Year-5 loan? Two tests, and the loan is the smaller of what each allows. LTV: the loan cannot exceed the lender\'s share of appraised value — note that co-op blanket mortgages are underwritten more conservatively than conventional multifamily, because a lender cannot easily foreclose and reposition an occupied limited-equity co-op, so do not assume a 75-80% conventional advance. DSCR: net operating income must exceed debt service by the lender\'s margin (1.20-1.25x typical). Under pure cost-recovery rent, DSCR pins at exactly 1.00 by construction — that is the honest finding, not a rounding artifact. Any FINANCING GAP shown is the dollar amount the deal must close with grants, member equity, a longer seller note, or a smaller investor check. This is the deal\'s single largest risk and earlier versions did not test it at all.',
  stabilizedValue:
    'THE VALUATION PARADOX — the sharpest criticism this model has received, and it is legitimate. You cannot claim a suppressed value at the county auditor to cut property taxes (A.15) and a market value at the bank to support the takeout. A property encumbered by a CLT ground lease and at-cost rents gets appraised on the income it can ACTUALLY collect, so the same restriction that wins the tax reduction also caps the loan. Leave this at $0 and the model DERIVES the value from Phase-2 net operating income at the cap rate below, which is the defensible number. Enter an override only when you hold a real appraisal — and watch the implied cap rate the dashboard reports back: an override that implies a sub-5% cap on a Class-C 1968 garden apartment in a village of 3,700 will not survive a lender review, however attractive it makes the LTV look. Two further haircuts a takeout appraiser may apply: the co-op owns improvements on LEASED land, which some appraisers value below fee simple, and a limited-equity resale formula caps the upside a buyer would pay for.',
  exitCapRate:
    'The capitalization rate a takeout appraiser would apply to this property\'s restricted net operating income. Value = NOI ÷ cap rate, so a HIGHER cap rate means a LOWER value and less loan capacity. 6.5–7.5% is the honest band for a Class-C 1968 garden apartment in a small Ohio village; 7% is the default. This is the single most consequential assumption in the feasibility test — moving it from 6.5% to 7.5% cuts the appraised value by roughly 13% and can flip the binding constraint from coverage to loan-to-value.',
  shadowEquity:
    'Tenants paying above the cost floor are contributing real capital, and recognizing that is fair. This tracks the accumulated credit. Keep it non-redeemable or deeply capped and vest it over years: a cash-redemption right turns member recognition into a liability that reduces what a lender will advance, and may conflict with the ground lease\'s resale formula. Recognition and retention benefits carry most of the fairness at none of the financing cost.',
  propertyTaxAbatement:
    'A negotiated reduction of the property-tax LINE ONLY for a set term — it lowers tenant rent while it runs and touches nothing on the seller or investor side. 0% = not yet won. Two realistic Ohio paths: (1) a Community Reinvestment Area abatement (ORC 3735.65) on the renovation value — municipality-designated, commonly 10–15 years, up to 100% of the improvement\'s added value; the co-op applies after the rehab is placed in service. (2) A restricted-rent / income-approach valuation at the county auditor (ORC 5713.03; Ohio Admin. Code 5703-25-20, eff. 1/1/2026, for federally-subsidized housing), which values the property on its actually-collectible at-cost rents rather than market comps — appealed to the Board of Revision under ORC 5715.19 if the auditor won\'t grant it. Model it as a haircut on the tax line for the years you expect it to hold, then it snaps back to full escalated tax. Applies to the property-tax component of both Phase-1 and Phase-2 rent (Phase 2 only if the buyout year is still inside the term). Do not underwrite closing on an abatement that has not been granted.',
  maxDonation:
    'The largest land gift the seller can fully deduct within the six-year window at the current settings, holding everything else fixed. Larger gifts strand deduction (it expires); the appraisal, not this number, determines what the gift is actually worth.',
  basisFork:
    'What the seller "paid" per the IRS. $475k assumes the 1993 transfer was a purchase or inheritance (stepped-up). If it was a GIFT, the original 1968 cost carries over — roughly $250k. The real figure is on the seller\'s Form 4562 / Schedule E: get the return, stop estimating. Either way the lifetime tax barely moves (~$3k) because the building is fully depreciated.',
  grants:
    'Grants are soft funding (never repaid), $0 = not awarded. Timing toggle: committed AT CLOSING, each dollar replaces an investor dollar (lowers both phases); pursued DURING THE HOLD (default), awards are applied at the buyout and shrink the Phase-2 refinance only — the "investors move first, grants chisel the Year-5 rent" strategy. Don\'t underwrite closing on hoped-for awards. CPA must confirm characterization (deferred-loan treatment keeps depreciable basis intact; taxable-grant treatment would shrink the Year-1 shield).',
  grantEnergyRebates:
    'Utility efficiency rebates (AES Ohio measure-based programs) and Ohio Home Weatherization Assistance for income-qualified units. Near-certain if the renovation includes qualifying measures — but small: budget $200–$1,500/unit. No affordability covenant. Stackable with everything below.',
  grantCountyHome:
    'Federal HOME funds via Greene County / the Ohio Development allocation, ideally through the CLT as a certified CHDO (15% of HOME allocations are reserved for CHDOs — the incumbent-partner advantage). Eligibility: units affordable at HOME rent limits (roughly ≤65–80% AMI — at/above this model\'s required rents, so compatible), 20-year affordability covenant for rehab over $40k/unit, federal environmental review, and Davis-Bacon wages if 12+ units are HOME-assisted. Typically structured as a 0% deferred forgivable loan.',
  grantOhioTrust:
    'Ohio Housing Trust Fund (Ohio Dept. of Development): competitive annual rounds for nonprofit-sponsored affordable housing; priority scoring for projects serving ≤50% AMI households, ~15-year affordability commitment, grants or 0% deferred loans. A CLT/LEC conversion with tenant displacement prevention scores well; moderate probability.',
  grantFhlbAhp:
    'Federal Home Loan Bank of Cincinnati Affordable Housing Program: competitive grants applied for through a member bank (pairs naturally with the Phase-2 refinance lender). Eligibility: ≥20% of units at ≤50% AMI, 15-year retention agreement recorded against the property, nonprofit sponsorship scores well. Awards can reach ~$1M but roughly a third of applications fund — the least certain bucket.',
} as const;

export const METHODOLOGY: string[] = [
  'Structure: the seller donates the 3.58-acre land parcel to a Community Land Trust (§ 170) and sells the improvements to the co-op syndicate on an installment note (§ 453). Contract price = FMV − donated land. Basis splits at the asset level: land basis follows the gift; the building\'s adjusted basis (depreciation clamped at the 75% building share of basis) offsets the sale. Exit at the buyout year is a fixed-formula purchase option in the CLT ground lease — unreturned capital + accrued unpaid preferred + balloon payoff; no appreciation participation.',
  'Seller tax: recognized gain = collected principal × gross profit ratio, 25%-rate unrecaptured § 1250 dollars first (Reg. § 1.453-12), then 15%/20% LTCG split at the 2026 filing-status breakpoint ($613,700 MFJ / $533,400 single). NIIT (3.8%) applies over $250k/$200k MAGI automatically. § 170: 30%-of-AGI annual limit, 0.5%-of-AGI OBBBA floor (disallowed amounts never carry), six usable years. Ohio: flat rate, no charitable deduction; with the CPA-confirmed toggle, the Business Income Deduction exempts the first $250k/yr and taxes the rest at 3%. Municipal tax cannot reach interest or gains (ORC 718).',
  'Investor: depreciable base = contract price + new CapEx; 100% bonus (§ 168(k)/OBBBA) on the 5/15-yr classes including a 25% cost-seg reclass; 27.5-yr straight line on the shell (full-year convention). REPS losses offset W-2 annually with a § 199A 20% deduction on positive years; passive losses suspend and release at the takeout (§ 469(g)). Exit tax: gain up to short-life depreciation × the negotiated exit-allocation % is ordinary income; the next tranche to total depreciation is 25%; the rest 15%; plus flat state on the gain. Ohio during the hold: BID zeroes profit-year state tax; without BID the 5/6 bonus addback applies. IRR/equity multiple/payback are post-tax.',
  'Rent: cost-recovery floor, not market. Phase 1 = seller-note debt service + Year-1 operating costs + investor preferred (when current-pay), ÷ units ÷ 12 ÷ (1 − vacancy). Operating lines escalate at adjustable long-run AVERAGE rates (defaults: utilities 5.5%, insurance 5%, taxes/management 3%, others 2.5% — blends, not the near-term 8% ordinance/hard-market spikes); an optional CRA / restricted-rent property-tax abatement (off by default) haircuts the tax line for a set term and reverts to full escalated tax after. Phase 2 is computed on buyout-year escalated costs + the refinance payment (balloon + capital + any accrued pref, amortized over the configurable Phase-2 bank term, default 30 yr). The rent-cliff alert compares Phase 2 to Phase 1 on that basis — an abatement expiring between the phases widens that cliff.',
  'Member share capital: a one-time per-unit share, applied at closing BEFORE speculative grant money because it is committed and certain. It replaces investor capital dollar-for-dollar and earns no preferred return, so the pref it displaces is rent relief in both phases; it is refundable at par on exit (limited equity), and it is NOT repaid at the buyout, so it permanently shrinks the Phase-2 refinance. Participation below 100% is the expected case — non-purchasing households remain residents at the same rent. The engine clamps total shares at the deal\'s capital need and reports the outside assistance required at the chosen assistance percentage, sizing the community-foundation ask rather than assuming it away. Anti-displacement guardrails (no share requirement to stay, no screening of sitting tenants, installments and assistance offered, local-worker admission preference) are deal-document terms, not model inputs, and are recorded in ANALYSIS.md A.18.',
  'Rent policy and surplus: cost-recovery rent is reported as a FLOOR. When a policy rent is set (default: today\'s $700), the difference is a surplus deployed across extra seller-note principal (applied annually at year end, shrinking the balloon and therefore the Phase-2 refinance), a capital reserve balance held by the co-op (deliberately NOT netted against the refinance — a reserve that is spent is not a reserve), and non-redeemable shadow equity crediting members for the capital their above-floor rent contributes. Surplus accrues only in years 1..buyout, while the seller note is outstanding. A policy rent below the floor is reported as a shortfall and deploys nothing.',
  'Phase-2 financing feasibility: the refinance is tested against BOTH lender constraints — maximum loan-to-value on the stabilized appraised value, and minimum debt-service coverage on buyout-year net operating income — and the supportable loan is the lesser. Any excess of the refinance burden over that amount is reported as a financing gap, which sizes the grant/equity requirement rather than leaving it to assumption. Under pure cost-recovery rent DSCR is exactly 1.00 by construction, which is precisely why a rent policy exists. Co-op blanket mortgages are commonly underwritten more conservatively than conventional multifamily; the LTV input should be set from a real lender term sheet, not a conventional benchmark.',
  'Defaults (July 2026 re-underwrite): FMV $1.25M as-is (in-place $700 rents, deferred maintenance, ~7% Class-C village cap; $1.5M is the stabilized number). Land donation $430k = the largest gift fully absorbed inside the § 170 window at these settings (30% of FMV absorbs with slack; 40% strands deduction). Basis $475k stepped-up story — confirm from the seller\'s Form 4562; a gift transfer means ~$250k carryover instead.',
  'Grants & subsidy: four buckets ordered by award probability (utility/weatherization rebates, county HOME/CHDO via the CLT, Ohio Housing Trust Fund, FHLB Cincinnati AHP), each $0 unless awarded, assumed committed at closing, and modeled as soft forgiven funding that replaces investor capital dollar-for-dollar — cutting the preferred return out of Phase-1 rents and shrinking the Phase-2 refinance. Compliance periods (HOME 20 yr, AHP 15 yr, OHTF ~15 yr) are recorded covenants, not cash flows; their rent/income limits sit at or above this model\'s cost-recovery rents, so they are compatible. CPA items: §61/§118 characterization (deferred-loan treatment assumed, basis intact) and Davis-Bacon exposure at 12+ HOME-assisted units.',
  '§ 465 at-risk limitation (enforced): the seller note is not qualified nonrecourse financing (§ 465(b)(6) excludes debt owed to the property\'s seller), so investors — REPS or not — deduct losses only up to cash invested; the excess suspends and releases against the exit gain. At the no-grant defaults the Year-1 loss sits just inside the at-risk cap; grant-funded scenarios push past it, and the model defers the excess rather than printing fictitious first-year savings.',
  'Adopted from external peer review: a partial-asset-disposition election (Reg. § 1.168(i)-8) on replaced components (e.g., the roof) adds a Year-1 loss deduction for the old component\'s allocated basis — quantified by the cost-seg engineering study, not modeled separately. Ground-lease drafting items: 99-year term (renewable) exceeding any mortgage term, and a solvency safety valve letting a board supermajority override the formula rent if reserves are breached — a rigid rent formula with no escape hatch is an underwriting defect. Rejected from the same reviews (rationale in docs/ANALYSIS.md): the § 170(h) conservation-easement pivot, Ohio CAT modeling (receipts ~$220k vs the $6M exclusion), decimal-arithmetic refactoring, and Columbus-market vacancy/OER benchmarks applied to a Yellow Springs asset.',
  'Simplifications a CPA should re-underwrite: flat marginal rates; full-year MACRS conventions (no placed-in-service timing per bucket); buyout assumed at year-end; investor NIIT ignored (REPS exempts; passive years net to zero); Ohio 1/6 addback recovery truncated at exit; single investor pool, no promote; § 461(l), § 453A pledge rule, month-of-closing AFR, qualified appraisal / Form 8283, and no contractual linkage between donation and sale are diligence items, not model features. Illustrative only — not tax, legal, or investment advice.',
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const escalate = (base: number, rate: number, year: number) =>
  base * Math.pow(1 + rate, year - 1);

function opexAt(inputs: DealInputs, year: number): OpexBreakdown {
  const gen = inputs.escGeneral / 100;
  // CRA / restricted-rent abatement reduces the property-tax line for its term,
  // applied AFTER escalation so the abated years still track underlying valuation
  // growth. Year is 1-based, so the term covers years 1..propertyTaxAbatementYears.
  const abatementActive = year <= inputs.propertyTaxAbatementYears;
  const abatementFactor = abatementActive ? 1 - inputs.propertyTaxAbatementPct / 100 : 1;
  const b = {
    propertyTaxes: escalate(inputs.propertyTaxes, inputs.escPropertyTax / 100, year) * abatementFactor,
    insurance: escalate(inputs.annualInsuranceMisc, inputs.escInsurance / 100, year),
    mgmt: escalate(inputs.mgmtFeePerDoor * inputs.units * 12, inputs.escManagement / 100, year),
    repairsMaint: escalate(inputs.repairsMaintPerUnit * inputs.units, gen, year),
    utilities: escalate(inputs.utilitiesPerUnit * inputs.units, inputs.escUtilities / 100, year),
    reserves: escalate(inputs.reservesPerUnit * inputs.units, gen, year),
    groundLease: escalate(inputs.cltGroundLeasePerUnit * inputs.units, ESCALATORS.GROUND_LEASE, year),
  };
  return {
    ...b,
    total: b.propertyTaxes + b.insurance + b.mgmt + b.repairsMaint + b.utilities + b.reserves + b.groundLease,
  };
}

// Seller state tax on note income for one year. Business-income treatment
// (BID) covers both the installment gain and the note interest — flagged
// CPA-confirm in the UI.
function sellerStateTax(inputs: DealInputs, nii: number): number {
  if (inputs.ohioBIDConfirmed) {
    return JURISDICTION.OHIO_BID_RATE * Math.max(0, nii - JURISDICTION.OHIO_BID_CAP);
  }
  return (inputs.stateTaxRate / 100) * nii;
}

// ----------------------------------------------------------------------------
// Engine
// ----------------------------------------------------------------------------

export function calculateDealMetrics(inputs: DealInputs): DealMetrics {
  const T = TAX_POLICY;
  const D = DEAL_CONSTANTS;
  const ordRate = inputs.sellerOrdinaryRate / 100;
  const disc = inputs.discountRate / 100;
  const ltcgHigh = T.LTCG_HIGH_THRESHOLD[inputs.sellerFilingStatus];
  const niitFloor = T.NIIT_MAGI_THRESHOLD[inputs.sellerFilingStatus];

  // ---- Asset-level basis split ----------------------------------------------
  const depreciableBasis = inputs.originalCostBasis * D.BUILDING_RATIO;
  const clampedDepreciation = Math.min(inputs.accumulatedDepreciation, depreciableBasis);
  const depWasClamped = inputs.accumulatedDepreciation > clampedDepreciation;
  const totalAdjustedBasis = inputs.originalCostBasis - clampedDepreciation;

  const contractPrice = Math.max(0, inputs.totalFMV - inputs.cltLandDonation);
  const landBasis = inputs.originalCostBasis * (1 - D.BUILDING_RATIO);
  const buildingAdjBasis = depreciableBasis - clampedDepreciation;
  // The gift is the land parcel: its basis follows it. With no donation, the
  // whole property is sold and land basis offsets the sale instead.
  const donatedBasisAllocated = inputs.cltLandDonation > 0 ? landBasis : 0;
  const soldAdjustedBasis = buildingAdjBasis + (inputs.cltLandDonation > 0 ? 0 : landBasis);

  const grossProfit = Math.max(0, contractPrice - soldAdjustedBasis);
  const grossProfitRatio = contractPrice > 0 ? grossProfit / contractPrice : 0;
  const unrecap1250Total = Math.min(clampedDepreciation, grossProfit);

  // ---- Note mechanics ---------------------------------------------------------
  const downPayment = contractPrice * (inputs.sellerDownPaymentPct / 100);
  const financedPrincipal = contractPrice - downPayment;
  const noteRate = inputs.sellerInterestRate / 100;
  const noteMonths = inputs.noteTermYears * 12;
  const monthlyPmt = financedPrincipal > 0 ? pmt(noteRate, noteMonths, financedPrincipal) : 0;
  const balloonBeyondTerm = inputs.balloonYear >= inputs.noteTermYears;
  const lastNoteYear = balloonBeyondTerm ? inputs.noteTermYears : inputs.balloonYear;

  // ---- Capital, preferred return and Year-1 opex -------------------------------
  // Computed here (ahead of amortization) so the rent-policy surplus can be
  // derived and fed back as extra principal on the seller note.
  const opexYear1 = opexAt(inputs, 1);
  const opexBuyoutYear = opexAt(inputs, inputs.balloonYear + 1);

  const totalNewCapex = inputs.capexRoofStruct + inputs.capexParkingLand + inputs.capexAppliances;
  // Grants are soft funding (never repaid, basis intact — CPA to confirm
  // §61/§118). Timing decides where they land:
  //   at closing → replace investor capital 1:1 (lowers both phases);
  //   during the hold (default) → applied at the buyout, shrinking the
  //   Phase-2 refinance only. Each clamped at what it offsets.
  const grantsRequested =
    inputs.grantEnergyRebates + inputs.grantCountyHome + inputs.grantOhioTrust + inputs.grantFhlbAhp;
  const capitalNeed = downPayment + totalNewCapex;
  // Member shares are committed at closing and certain, so they are applied
  // BEFORE speculative grant money. They earn no preferred return, which is
  // exactly why each share dollar lowers rent in both phases.
  const memberEquityRaised = Math.min(
    inputs.memberSharePrice * inputs.units * clamp01(inputs.memberShareParticipationPct / 100),
    capitalNeed,
  );
  const capitalAfterShares = capitalNeed - memberEquityRaised;
  const grantsAtClosingApplied = inputs.grantsAtClosing
    ? Math.min(grantsRequested, capitalAfterShares)
    : 0;
  const unfundedAtClosing = Math.max(0, capitalAfterShares - grantsAtClosingApplied);
  // With the syndicate switched off nobody writes this cheque; it becomes an
  // explicit gap rather than silently assumed capital.
  const capitalRequired = inputs.investorsEnabled ? unfundedAtClosing : 0;
  const closingCapitalGap = inputs.investorsEnabled ? 0 : unfundedAtClosing;
  const prefAnnual = capitalRequired * (inputs.investorPrefReturn / 100);
  const prefInRent = inputs.prefCurrentPay ? prefAnnual : 0;
  // Investors are taken out at the BUYOUT, which is not necessarily when the
  // seller note retires: if the note fully amortizes first (balloonYear >=
  // noteTermYears) there is no balloon, but the investors are still
  // outstanding and still earning. Accrual must run to the buyout, not to
  // lastNoteYear — using the note term understated the accrual in that case.
  const investorExitYear = Math.max(1, inputs.balloonYear);
  // TRUE PIK COMPOUNDS. "Paid in kind" means the unpaid preferred is added to
  // the investors' balance and thereafter earns preferred itself; simple
  // accrual (capital x rate x years) is a different, cheaper instrument and
  // understates what the co-op must refinance. See ANALYSIS.md A.20.
  const accruedPrefAtExit = inputs.prefCurrentPay
    ? 0
    : capitalRequired * (Math.pow(1 + inputs.investorPrefReturn / 100, investorExitYear) - 1);

  const phase1AnnualDebtService = monthlyPmt * 12;
  const phase1AnnualRevenueReq = phase1AnnualDebtService + opexYear1.total + prefInRent;
  const occupancy = 1 - inputs.vacancyRate / 100;
  // The cost-recovery FLOOR — what rent would have to be to exactly break even.
  const phase1MonthlyRent = phase1AnnualRevenueReq / inputs.units / 12 / occupancy;

  // ---- Rent policy & surplus deployment ---------------------------------------
  // Surplus runs only while the seller note does (years 1..balloonYear); after
  // the takeout the investors are gone and the co-op is on a bank loan.
  const surplusYears = Math.max(0, Math.min(inputs.balloonYear, lastNoteYear));
  // The policy rent is a FLOOR ON RENT, not a cap: a co-op cannot elect to
  // collect less than its costs. The rent actually charged is the greater of the
  // policy and the cost floor, so surplus is never negative. When the policy
  // sits BELOW the cost floor the promise simply cannot be honored at these
  // assumptions — flagged, with the increase the tenants would actually face.
  const policyBelowCostFloor =
    inputs.rentPolicyEnabled && inputs.policyMonthlyRent < phase1MonthlyRent - 0.005;
  const effectivePhase1Rent = inputs.rentPolicyEnabled
    ? Math.max(inputs.policyMonthlyRent, phase1MonthlyRent)
    : phase1MonthlyRent;
  const annualRevenueAtPolicy = effectivePhase1Rent * inputs.units * 12 * occupancy;
  const annualSurplus = Math.max(0, annualRevenueAtPolicy - phase1AnnualRevenueReq);
  const principalShare = clamp01(inputs.surplusToPrincipalPct / 100);
  const reservesShare = Math.min(clamp01(inputs.surplusToReservesPct / 100), 1 - principalShare);
  const shadowShare = Math.max(0, 1 - principalShare - reservesShare);
  const toPrincipalPerYear = annualSurplus * principalShare;
  const toReservesPerYear = annualSurplus * reservesShare;
  const toShadowEquityPerYear = annualSurplus * shadowShare;

  const amortSchedule: AmortRow[] = [];
  let extraPrincipalTotal = 0;
  {
    let balance = financedPrincipal;
    const r = noteRate / 12;
    for (let year = 1; year <= lastNoteYear && balance > 0.005; year++) {
      let interestPaid = 0;
      let principalPaid = 0;
      for (let m = 0; m < 12 && balance > 0.005; m++) {
        const interest = balance * r;
        const principal = Math.min(monthlyPmt - interest, balance);
        interestPaid += interest;
        principalPaid += principal;
        balance -= principal;
      }
      // Surplus-funded extra principal is applied once at year end (the co-op
      // sweeps its operating surplus annually, not monthly).
      if (year <= surplusYears && toPrincipalPerYear > 0 && balance > 0.005) {
        const extra = Math.min(toPrincipalPerYear, balance);
        principalPaid += extra;
        balance -= extra;
        extraPrincipalTotal += extra;
      }
      amortSchedule.push({
        year,
        annualPayment: interestPaid + principalPaid,
        interestPaid,
        principalPaid,
        endingBalance: Math.max(0, balance),
        isBalloonYear: year === inputs.balloonYear && !balloonBeyondTerm,
      });
    }
  }
  // Balloon = whatever the schedule actually leaves outstanding at the buyout.
  // (Was the closed-form remainingBalance(); extra principal makes that wrong.)
  const balloonRow = amortSchedule[inputs.balloonYear - 1];
  const balloonBalance =
    balloonBeyondTerm || financedPrincipal <= 0
      ? 0
      : balloonRow
        ? Math.max(0, balloonRow.endingBalance)
        : 0;
  // Same balloon with NO surplus applied — the "what the policy bought" baseline.
  const balloonNoPolicy =
    balloonBeyondTerm || financedPrincipal <= 0
      ? 0
      : Math.max(0, remainingBalance(noteRate, noteMonths, financedPrincipal, inputs.balloonYear * 12));

  // ---- Seller annual schedule (marginal convention vs. no-deal baseline) -----
  const splitLtcg = (ltcg: number, taxableProxy: number) => {
    const excess = Math.max(0, taxableProxy - ltcgHigh);
    const g20 = Math.min(ltcg, excess);
    return { g20, g15: ltcg - g20 };
  };

  const schedule: SellerYearRow[] = [];
  let unrecapRemaining = unrecap1250Total;
  let charityCarry = inputs.cltLandDonation;
  let charityUsed = 0;
  let charityFloorLost = 0;
  let cumulative = 0;

  const scheduleYears = Math.max(lastNoteYear, charityCarry > 0 ? T.CHARITY_USABLE_YEARS : 0);
  for (let year = 1; year <= scheduleYears; year++) {
    const amort = amortSchedule[year - 1];
    const isBalloonYear = year === inputs.balloonYear && !balloonBeyondTerm;
    const interest = amort ? amort.interestPaid : 0;
    let principal = amort ? amort.principalPaid : 0;
    if (year === 1) principal += downPayment;
    if (isBalloonYear) principal += balloonBalance;

    const gain = principal * grossProfitRatio;
    const g25base = Math.min(gain, unrecapRemaining);
    unrecapRemaining -= g25base;
    const ltcgBase = gain - g25base;

    const agi = inputs.sellerOtherIncome + interest + gain;

    // § 170 draw with the OBBBA 0.5% floor: the floor portion of what is
    // claimed each year is disallowed and does not return to the carryforward.
    let deduction = 0;
    if (year <= T.CHARITY_USABLE_YEARS && charityCarry > 0) {
      const draw = Math.min(charityCarry, T.CHARITY_AGI_LIMIT * agi);
      charityCarry -= draw;
      const floorLoss = Math.min(draw, T.CHARITY_FLOOR_AGI * agi);
      deduction = draw - floorLoss;
      charityUsed += deduction;
      charityFloorLost += floorLoss;
    }

    // Mechanical ordering: deduction absorbs ordinary income first, then the
    // 25% bucket, then 20%, then 15%.
    const ordinaryIncome = inputs.sellerOtherIncome + interest;
    const dedOrd = Math.min(deduction, ordinaryIncome);
    let dedLeft = deduction - dedOrd;
    const ded25 = Math.min(dedLeft, g25base);
    dedLeft -= ded25;
    const taxableProxy = Math.max(0, agi - deduction);
    const { g20, g15 } = splitLtcg(ltcgBase, taxableProxy);
    const ded20 = Math.min(dedLeft, g20);
    dedLeft -= ded20;
    const ded15 = Math.min(dedLeft, g15);

    const charRate = Math.min(ordRate, T.CHARITABLE_BENEFIT_CAP);
    const fedOrdinaryTax = interest * ordRate - dedOrd * charRate; // may go negative
    const fedGainTax =
      (g25base - ded25) * T.UNRECAP_1250_RATE +
      (g20 - ded20) * T.LTCG_RATE_HIGH +
      (g15 - ded15) * T.LTCG_RATE_LOW;
    const federalTax = fedOrdinaryTax + fedGainTax;

    const nii = interest + gain;
    const niitTax = T.NIIT_RATE * Math.min(nii, Math.max(0, agi - niitFloor));
    const stateTax = sellerStateTax(inputs, nii);

    const totalTax = federalTax + niitTax + stateTax;
    const grossCash = interest + principal;
    const postTaxCash = grossCash - totalTax;
    cumulative += postTaxCash;

    schedule.push({
      year,
      interestReceived: interest,
      principalReceived: principal,
      grossCashReceived: grossCash,
      gainRecognized: gain,
      gain25: g25base,
      gainLtcg: ltcgBase,
      charitableDeductionUsed: deduction,
      federalTax,
      stateTax,
      niitTax,
      totalTax,
      postTaxCash,
      cumulativePostTaxCash: cumulative,
      remainingNoteBalance: isBalloonYear ? 0 : amort ? amort.endingBalance : 0,
      shieldActive: deduction > 0,
      isBalloonYear,
    });
  }

  const year1 = schedule[0];
  const seller: SellerMetrics = {
    contractPrice,
    downPayment,
    financedPrincipal,
    totalAdjustedBasis,
    soldAdjustedBasis,
    donatedBasisAllocated,
    clampedDepreciation,
    depWasClamped,
    grossProfit,
    grossProfitRatio,
    unrecap1250Total,
    schedule,
    year1Tax: year1 ? year1.totalTax : 0,
    year1GrossCash: year1 ? year1.grossCashReceived : 0,
    headroom: year1 ? downPayment - year1.totalTax : downPayment,
    isTaxExceedsDP: year1 ? year1.totalTax > downPayment : false,
    charitable: {
      total: inputs.cltLandDonation,
      used: charityUsed,
      floorLost: charityFloorLost,
      expired: charityCarry,
      utilizationPct:
        inputs.cltLandDonation > 0 ? (charityUsed / inputs.cltLandDonation) * 100 : 100,
      firstZeroShieldYear: T.CHARITY_USABLE_YEARS + 1,
    },
    comparison: buildSellerComparison(inputs, {
      totalAdjustedBasis,
      clampedDepreciation,
      contractPrice,
      soldAdjustedBasis,
      installmentFlows: schedule.map((r) => r.postTaxCash),
      installmentTaxTotal: schedule.reduce((a, r) => a + r.totalTax, 0),
      installmentYear1Tax: schedule.length > 0 ? schedule[0].totalTax : 0,
      disc,
      ordRate,
      ltcgHigh,
      niitFloor,
    }),
  };

  // ---- Tenant / rent requirement (escalated opex) -----------------------------
  // (capital, pref and opex are computed ABOVE the note amortization, because
  // the rent-policy surplus feeds extra principal back into that schedule.)

  const burdenBeforeGrants = balloonBalance + capitalRequired + accruedPrefAtExit;
  const grantsAtBuyoutApplied = inputs.grantsAtClosing
    ? 0
    : Math.min(grantsRequested, burdenBeforeGrants);
  const phase2RefinanceBurden = burdenBeforeGrants - grantsAtBuyoutApplied;
  const refiRate = inputs.phase2CommercialRate / 100;
  const monthlyP2 =
    phase2RefinanceBurden > 0 ? pmt(refiRate, inputs.phase2AmortYears * 12, phase2RefinanceBurden) : 0;
  const phase2AnnualDebtService = monthlyP2 * 12;
  const phase2AnnualRevenueReq = phase2AnnualDebtService + opexBuyoutYear.total;
  const phase2MonthlyRent = phase2AnnualRevenueReq / inputs.units / 12 / occupancy;
  const rentJumpPct =
    phase1MonthlyRent > 0 ? ((phase2MonthlyRent - phase1MonthlyRent) / phase1MonthlyRent) * 100 : 0;
  // Phase 2 obeys the same rule: charge the greater of the policy and the cost
  // floor. Where the policy binds in both phases, tenants see a genuinely flat
  // rent across the buyout and the cliff disappears from their experience.
  const effectivePhase2Rent = inputs.rentPolicyEnabled
    ? Math.max(inputs.policyMonthlyRent, phase2MonthlyRent)
    : phase2MonthlyRent;

  // ---- Surplus plan (reported) -------------------------------------------------
  // Reserves accumulate as the co-op's OWN cash and are deliberately NOT netted
  // against the refinance — the point of a reserve is to still exist afterwards.
  // Extra principal has already shrunk the balloon inside the amortization above.
  const surplus: SurplusPlan = {
    enabled: inputs.rentPolicyEnabled,
    policyMonthlyRent: inputs.policyMonthlyRent,
    costFloorMonthlyRent: phase1MonthlyRent,
    annualRevenueAtPolicy,
    phase1RequiredRevenue: phase1AnnualRevenueReq,
    annualSurplus,
    effectivePhase1Rent,
    effectivePhase2Rent,
    policyBelowCostFloor,
    shortfallPerUnitMonth: policyBelowCostFloor ? phase1MonthlyRent - inputs.policyMonthlyRent : 0,
    years: surplusYears,
    toPrincipalPerYear,
    toReservesPerYear,
    toShadowEquityPerYear,
    principalPct: principalShare * 100,
    reservesPct: reservesShare * 100,
    shadowEquityPct: shadowShare * 100,
    extraPrincipalTotal,
    reservesBalanceAtBuyout: toReservesPerYear * surplusYears,
    shadowEquityAtBuyout: toShadowEquityPerYear * surplusYears,
    balloonWithoutPolicy: balloonNoPolicy,
    balloonReduction: Math.max(0, balloonNoPolicy - balloonBalance),
  };

  // ---- Member equity plan (reported) ------------------------------------------
  // Rent relief is the preferred return this equity displaces: member capital
  // earns no pref, so the pref that WOULD have been paid on it is money that
  // never has to come out of rent.
  const unitsPurchasing = inputs.units * clamp01(inputs.memberShareParticipationPct / 100);
  const prefAvoided = memberEquityRaised * (inputs.investorPrefReturn / 100);
  const rentCharged = effectivePhase1Rent > 0 ? effectivePhase1Rent : inputs.currentRent;
  const memberEquity: MemberEquityPlan = {
    sharePrice: inputs.memberSharePrice,
    participationPct: inputs.memberShareParticipationPct,
    unitsPurchasing,
    totalRaised: memberEquityRaised,
    assistanceNeeded: memberEquityRaised * clamp01(inputs.shareAssistancePct / 100),
    memberFunded: memberEquityRaised * (1 - clamp01(inputs.shareAssistancePct / 100)),
    monthsOfRent: rentCharged > 0 ? inputs.memberSharePrice / rentCharged : 0,
    installment24: inputs.memberSharePrice / 24,
    installment36: inputs.memberSharePrice / 36,
    prefAvoided,
    rentReliefPerUnitMonth:
      inputs.prefCurrentPay && inputs.units > 0
        ? prefAvoided / inputs.units / 12 / occupancy
        : 0,
    clampedByCapitalNeed:
      inputs.memberSharePrice * unitsPurchasing > capitalNeed + 0.5,
  };

  // ---- Phase-2 financing feasibility ------------------------------------------
  // The takeout test the model used to skip entirely. Revenue is measured at the
  // POLICY rent when one is set; under pure cost recovery, revenue equals the
  // requirement by construction and DSCR pins at exactly 1.00 — which is the
  // honest finding, not a rounding artifact: no lender refinances a break-even.
  const phase2Revenue = effectivePhase2Rent * inputs.units * 12 * occupancy;
  const phase2NOI = phase2Revenue - opexBuyoutYear.total;
  const phase1NOI = annualRevenueAtPolicy - opexYear1.total;
  const dscr = phase2AnnualDebtService > 0 ? phase2NOI / phase2AnnualDebtService : Infinity;
  const phase1Dscr =
    phase1AnnualDebtService > 0 ? phase1NOI / phase1AnnualDebtService : Infinity;
  // THE VALUATION CROSS-CHECK. A property encumbered by a ground lease and
  // at-cost rents is appraised on the income it can actually collect. The same
  // restricted income that wins a property-tax reduction (A.15) also caps what
  // a takeout lender will advance — you cannot claim a suppressed value at the
  // auditor and a market value at the bank. Default derives the value; an
  // override is allowed but its implied cap rate is reported so an
  // indefensible number cannot hide.
  const capRate = Math.max(0.0001, inputs.exitCapRate / 100);
  const incomeApproachValue = Math.max(0, phase2NOI) / capRate;
  const valueIsDerived = inputs.stabilizedValue <= 0;
  const valueForLtv = valueIsDerived ? incomeApproachValue : inputs.stabilizedValue;
  const maxLoanByLtv = valueForLtv * (inputs.maxLtvPct / 100);
  const maxLoanByDscr =
    inputs.minDscr > 0 && phase2NOI > 0
      ? pvOfAnnuity(refiRate, inputs.phase2AmortYears * 12, phase2NOI / inputs.minDscr / 12)
      : 0;
  const supportableLoan = Math.max(0, Math.min(maxLoanByLtv, maxLoanByDscr));
  const feasibility: FeasibilityMetrics = {
    investorsEnabled: inputs.investorsEnabled,
    capitalNeedAtClosing: capitalNeed,
    closingCapitalGap,
    stabilizedValue: valueForLtv,
    incomeApproachValue,
    valueIsDerived,
    impliedCapRate: valueForLtv > 0 ? phase2NOI / valueForLtv : 0,
    valuationOptimism: incomeApproachValue > 0 ? valueForLtv / incomeApproachValue : 1,
    refinanceBurden: phase2RefinanceBurden,
    ltv: valueForLtv > 0 ? phase2RefinanceBurden / valueForLtv : 0,
    maxLtv: inputs.maxLtvPct / 100,
    ltvPass: phase2RefinanceBurden <= maxLoanByLtv + 0.5,
    phase2NOI,
    phase2DebtService: phase2AnnualDebtService,
    dscr,
    minDscr: inputs.minDscr,
    dscrPass: dscr >= inputs.minDscr - 1e-9,
    phase1Dscr,
    maxLoanByLtv,
    maxLoanByDscr,
    supportableLoan,
    financingGap: Math.max(0, phase2RefinanceBurden - supportableLoan),
    bindingConstraint: maxLoanByDscr < maxLoanByLtv ? 'dscr' : 'ltv',
  };

  const tenant: TenantMetrics = {
    opexYear1,
    opexBuyoutYear,
    prefAnnual,
    prefInRent,
    phase1AnnualDebtService,
    phase1AnnualRevenueReq,
    phase1MonthlyRent,
    rentDelta: phase1MonthlyRent - inputs.currentRent,
    balloonBalance,
    balloonBeyondTerm,
    accruedPrefAtExit,
    grantsAtBuyout: grantsAtBuyoutApplied,
    phase2RefinanceBurden,
    phase2AnnualDebtService,
    phase2AnnualRevenueReq,
    phase2MonthlyRent,
    rentJumpPct,
    isRentCliff: rentJumpPct > D.RENT_CLIFF_THRESHOLD_PCT,
  };

  // ---- Investor ---------------------------------------------------------------
  const investor = buildInvestorMetrics(inputs, {
    contractPrice,
    capitalRequired,
    grantsApplied: grantsAtClosingApplied,
    totalNewCapex,
    prefAnnual,
    accruedPrefAtExit,
    amortSchedule,
    balloonBalance,
    lastNoteYear,
  });

  return { inputs, seller, investor, tenant, memberEquity, surplus, feasibility, amortSchedule };
}

// ----------------------------------------------------------------------------
// Seller scenario comparison
// ----------------------------------------------------------------------------

interface ComparisonCtx {
  totalAdjustedBasis: number;
  clampedDepreciation: number;
  contractPrice: number;
  soldAdjustedBasis: number;
  installmentFlows: number[];
  installmentTaxTotal: number;
  installmentYear1Tax: number;
  disc: number;
  ordRate: number;
  ltcgHigh: number;
  niitFloor: number;
}

function buildSellerComparison(inputs: DealInputs, ctx: ComparisonCtx): SellerMetrics['comparison'] {
  const T = TAX_POLICY;

  const lumpGainTax = (gain: number, unrecapCap: number, deduction: number): number => {
    const g25base = Math.min(gain, unrecapCap);
    const ltcgBase = gain - g25base;
    const agi = inputs.sellerOtherIncome + gain;
    const dedOrd = Math.min(deduction, inputs.sellerOtherIncome);
    let dedLeft = deduction - dedOrd;
    const ded25 = Math.min(dedLeft, g25base);
    dedLeft -= ded25;
    const taxableProxy = Math.max(0, agi - deduction);
    const excess = Math.max(0, taxableProxy - ctx.ltcgHigh);
    const g20 = Math.min(ltcgBase, excess);
    const g15 = ltcgBase - g20;
    const ded20 = Math.min(dedLeft, g20);
    dedLeft -= ded20;
    const ded15 = Math.min(dedLeft, g15);
    const fed =
      -dedOrd * Math.min(ctx.ordRate, T.CHARITABLE_BENEFIT_CAP) +
      (g25base - ded25) * T.UNRECAP_1250_RATE +
      (g20 - ded20) * T.LTCG_RATE_HIGH +
      (g15 - ded15) * T.LTCG_RATE_LOW;
    const niit = T.NIIT_RATE * Math.min(gain, Math.max(0, agi - ctx.niitFloor));
    const state = sellerStateTax(inputs, gain);
    return fed + niit + state;
  };

  // § 170 draw with floor, for the lump-sum scenarios.
  const drawWithFloor = (carry: number, agi: number): { draw: number; deduction: number } => {
    const draw = Math.min(carry, T.CHARITY_AGI_LIMIT * agi);
    const deduction = Math.max(0, draw - T.CHARITY_FLOOR_AGI * agi);
    return { draw, deduction };
  };

  // Terminal wealth = reinvest a path's whole after-tax stream at the seller's
  // after-tax reinvestment rate (the discount rate) to a common horizon. Since
  // every flow is discounted at that same rate, terminal = NPV × (1+r)^H — so
  // this is the same ranking as NPV, just expressed as "money in Year H", which
  // makes the reinvestment assumption explicit (it directly answers "what if
  // Paul invests the cash-sale proceeds at that rate instead?").
  const H = inputs.comparisonHorizon;
  const growth = Math.pow(1 + ctx.disc, H);
  // A cash buyer pays what they offer, not what the appraisal says. 0 = FMV.
  const cashPrice = inputs.cashOfferPrice > 0 ? inputs.cashOfferPrice : inputs.totalFMV;
  const mktCost = (inputs.marketSaleCostPct / 100) * cashPrice; // broker on the actual price
  const directCost = (inputs.directDealCostPct / 100) * ctx.contractPrice; // legal/title, direct

  // Scenario 1: straight OPEN-MARKET cash sale at FMV — pays a broker; the whole
  // gain and the whole tax land at closing, so only the after-tax, after-cost
  // lump is available to reinvest.
  const cashGain = Math.max(0, cashPrice - ctx.totalAdjustedBasis);
  const cashTax = lumpGainTax(cashGain, Math.min(ctx.clampedDepreciation, cashGain), 0);
  const cashNet = cashPrice - cashTax - mktCost;
  const straightCash: SellerScenario = {
    label: 'Straight cash sale',
    saleCosts: mktCost,
    cashAtClosing: cashNet,
    nominalAfterTax: cashNet,
    npvAfterTax: cashNet,
    terminalWealth: cashNet * growth,
    totalTax: cashTax,
  };

  // Scenario 2: donate land, sell improvements for cash in year 1 (DIRECT sale
  // to the co-op — no broker, just legal/title).
  const bifGain = Math.max(0, ctx.contractPrice - ctx.soldAdjustedBasis);
  const unrecapCap = Math.min(ctx.clampedDepreciation, bifGain);
  const agiY1 = inputs.sellerOtherIncome + bifGain;
  const y1 = drawWithFloor(inputs.cltLandDonation, agiY1);
  const bifTaxY1 = lumpGainTax(bifGain, unrecapCap, y1.deduction);
  let carry = inputs.cltLandDonation - y1.draw;
  let bifNominal = ctx.contractPrice - bifTaxY1 - directCost;
  let bifNpv = ctx.contractPrice - bifTaxY1 - directCost;
  let bifTaxTotal = bifTaxY1;
  for (let year = 2; year <= T.CHARITY_USABLE_YEARS && carry > 0; year++) {
    const d = drawWithFloor(carry, inputs.sellerOtherIncome);
    carry -= d.draw;
    const benefit = d.deduction * Math.min(ctx.ordRate, T.CHARITABLE_BENEFIT_CAP);
    bifNominal += benefit;
    bifNpv += benefit / Math.pow(1 + ctx.disc, year - 1);
    bifTaxTotal -= benefit;
  }
  const cashPlusDonation: SellerScenario = {
    label: 'Cash sale + CLT donation',
    saleCosts: directCost,
    cashAtClosing: ctx.contractPrice - bifTaxY1 - directCost,
    nominalAfterTax: bifNominal,
    npvAfterTax: bifNpv,
    terminalWealth: bifNpv * growth,
    totalTax: bifTaxTotal,
  };

  // Scenario 3: the installment note (DIRECT sale to the co-op). Direct legal/
  // title cost is a closing-day (t0) charge against the Year-1 flow.
  const instNominal = ctx.installmentFlows.reduce((a, b) => a + b, 0) - directCost;
  // Discount with Year 1 = t0, consistent with the two cash scenarios (whose
  // Year-1 proceeds — and the installment down payment — are received at
  // closing). The prior i+1 exponent discounted the installment's closing-day
  // cash a full year while the cash scenarios did not, understating it.
  const instNpv = ctx.installmentFlows.reduce(
    (acc, cf, i) => acc + cf / Math.pow(1 + ctx.disc, i),
    0,
  ) - directCost;
  const installmentPlusDonation: SellerScenario = {
    label: 'Installment + CLT donation',
    saleCosts: directCost,
    cashAtClosing: (ctx.installmentFlows[0] ?? 0) - directCost,
    nominalAfterTax: instNominal,
    npvAfterTax: instNpv,
    terminalWealth: instNpv * growth,
    totalTax: ctx.installmentTaxTotal,
  };

  return {
    straightCash,
    cashPlusDonation,
    installmentPlusDonation,
    npvAdvantageVsCash: instNpv - straightCash.npvAfterTax,
    nominalAdvantageVsCash: instNominal - straightCash.nominalAfterTax,
    horizon: H,
    upFrontTaxCashSale: cashTax,
    upFrontTaxNote: ctx.installmentFlows.length > 0 ? ctx.installmentYear1Tax : 0,
    deferredWorking: Math.max(0, cashTax - (ctx.installmentYear1Tax || 0)),
  };
}

// ----------------------------------------------------------------------------
// Investor model
// ----------------------------------------------------------------------------

interface InvestorCtx {
  contractPrice: number;
  capitalRequired: number;
  grantsApplied: number;
  totalNewCapex: number;
  prefAnnual: number;
  accruedPrefAtExit: number;
  amortSchedule: AmortRow[];
  balloonBalance: number;
  lastNoteYear: number;
}

function buildInvestorMetrics(inputs: DealInputs, ctx: InvestorCtx): InvestorMetrics {
  const T = TAX_POLICY;
  const D = DEAL_CONSTANTS;
  const J = JURISDICTION;
  const invRate = inputs.investorMarginalRate / 100;
  const stateRate = inputs.stateTaxRate / 100;
  const localRate = inputs.localTaxRate / 100;
  // Investors exit at the BUYOUT by design, which is when the co-op refinances
  // and returns their capital — not when the seller note happens to retire.
  // (These coincide in the normal case where the balloon precedes the note
  // term; they diverge only when the note fully amortizes first.)
  const exitYear = Math.max(1, inputs.balloonYear);
  const exitAllocPct = inputs.exitShortLifeAllocationPct / 100;

  const costSegBonus = ctx.contractPrice * D.COST_SEG_SHORT_LIFE_PCT;
  const shell27 = ctx.contractPrice * (1 - D.COST_SEG_SHORT_LIFE_PCT);
  const annualSL = shell27 / T.RESIDENTIAL_LIFE + inputs.capexRoofStruct / T.RESIDENTIAL_LIFE;
  const year1Bonus = {
    costSeg: costSegBonus,
    parkingLand: inputs.capexParkingLand,
    appliances: inputs.capexAppliances,
    total: costSegBonus + inputs.capexParkingLand + inputs.capexAppliances,
  };

  const depByYear: number[] = [];
  for (let y = 1; y <= exitYear; y++) {
    depByYear.push(y === 1 ? year1Bonus.total + annualSL : annualSL);
  }
  const totalDepTaken = depByYear.reduce((a, b) => a + b, 0);
  const shortLifeDepTaken = year1Bonus.total; // all short-life dep is Y1 bonus

  // Exit: formula price for the property = balloon payoff + capital return.
  // Accrued pref (PIK) is paid alongside, funded by the same refinance, but is
  // ordinary income to investors, not sale proceeds.
  const salePrice = ctx.balloonBalance + ctx.capitalRequired;
  const purchaseBasisTotal = ctx.contractPrice + ctx.totalNewCapex;
  const adjustedBasisAtExit = purchaseBasisTotal - totalDepTaken;
  const exitGain = Math.max(0, salePrice - adjustedBasisAtExit);
  // § 1245 tranche per the negotiated exit allocation; then 25% up to the
  // rest of depreciation taken; then 15%. Flat state on the whole gain
  // (per-investor BID may reduce this — diligence item, not modeled).
  const exitOrdinary = Math.min(exitGain, shortLifeDepTaken * exitAllocPct);
  const exit25 = Math.min(exitGain - exitOrdinary, Math.max(0, totalDepTaken - exitOrdinary));
  const exit15 = exitGain - exitOrdinary - exit25;
  const exitTax =
    exitOrdinary * invRate + exit25 * T.UNRECAP_1250_RATE + exit15 * T.LTCG_RATE_LOW +
    exitGain * stateRate;

  const buildFlows = (hasReps: boolean) => {
    const rows: InvestorYearRow[] = [];
    const flows: number[] = [-ctx.capitalRequired];
    let suspended = 0;        // § 469 passive-loss carryforward (non-REPS)
    let suspended465 = 0;     // § 465 at-risk carryforward (REPS mode)
    // At-risk = cash invested. The seller note is NOT qualified nonrecourse
    // financing (§ 465(b)(6) excludes debt owed to the property's seller), so
    // even REPS investors deduct losses only up to cash-at-risk; the excess
    // suspends until income or the exit gain replenishes at-risk. This binds
    // whenever grants shrink the equity slice below the Year-1 bonus.
    let atRisk = ctx.capitalRequired;
    let ohioDeferred = 0;
    let cumulative = -ctx.capitalRequired;

    for (let y = 1; y <= exitYear; y++) {
      const amort = ctx.amortSchedule[y - 1];
      const principal = amort ? amort.principalPaid : 0;
      const dep = depByYear[y - 1];
      const prefReceived = inputs.prefCurrentPay ? ctx.prefAnnual : 0;
      // Cash-basis: PIK pref is not income until paid (at exit).
      const taxable = prefReceived + principal - dep;

      let federalTaxCash = 0;
      let stateTaxCash = 0;
      if (hasReps) {
        // Ohio 5/6 addback bookkeeping (BID-off path only).
        let ohioAdj = 0;
        if (y === 1) {
          ohioAdj = year1Bonus.total * J.OHIO_BONUS_ADDBACK;
          ohioDeferred = ohioAdj;
        } else if (ohioDeferred > 0) {
          ohioAdj = -ohioDeferred / 5;
        }
        if (taxable < 0) {
          const usableLoss = Math.min(-taxable, Math.max(0, atRisk));
          suspended465 += -taxable - usableLoss;
          atRisk -= usableLoss;
          federalTaxCash = usableLoss * invRate;
          stateTaxCash = inputs.ohioBIDConfirmed ? 0 : -(-usableLoss + ohioAdj) * stateRate;
        } else {
          atRisk += taxable;
          // § 199A: 20% QBI deduction on positive rental income years.
          federalTaxCash = -taxable * (1 - T.QBI_DEDUCTION) * invRate;
          stateTaxCash = inputs.ohioBIDConfirmed ? 0 : -(taxable + ohioAdj) * stateRate;
        }
      } else {
        if (taxable < 0) {
          suspended += -taxable;
        } else {
          const offset = Math.min(suspended, taxable);
          suspended -= offset;
          const net = taxable - offset;
          federalTaxCash = -net * invRate;
          stateTaxCash = inputs.ohioBIDConfirmed ? 0 : -net * stateRate;
        }
      }
      const localTax = Math.max(0, taxable) * localRate;

      let exitProceeds = 0;
      const isExitYear = y === exitYear;
      if (isExitYear) {
        exitProceeds = ctx.capitalRequired - exitTax;
        if (ctx.accruedPrefAtExit > 0) {
          exitProceeds += ctx.accruedPrefAtExit * (1 - invRate); // ordinary when paid
        }
        if (!hasReps && suspended > 0) {
          exitProceeds += suspended * invRate; // § 469(g) release
          suspended = 0;
        }
        if (hasReps && suspended465 > 0) {
          // Exit gain replenishes at-risk, releasing § 465-suspended losses.
          const release = Math.min(suspended465, exitGain);
          exitProceeds += release * invRate;
          suspended465 -= release;
        }
      }

      const netCashFlow = prefReceived + federalTaxCash + stateTaxCash - localTax + exitProceeds;
      cumulative += netCashFlow;
      flows.push(netCashFlow);
      rows.push({
        year: y,
        capitalInjected: y === 1 ? ctx.capitalRequired : 0,
        operatingCashFlow: prefReceived,
        depreciation: dep,
        taxableRentalIncome: taxable,
        federalTaxCash,
        stateTaxCash,
        localTax,
        suspendedLossBalance: hasReps ? suspended465 : suspended,
        exitProceeds,
        netCashFlow,
        cumulativePosition: cumulative,
        isExitYear,
      });
    }
    return { rows, flows };
  };

  const withReps = buildFlows(true);
  const withoutReps = buildFlows(false);
  const active = inputs.investorHasREPS ? withReps : withoutReps;

  const irrWithReps = irr(withReps.flows);
  const irrWithoutReps = irr(withoutReps.flows);

  const positives = active.flows.slice(1).reduce((a, b) => a + Math.max(0, b), 0);
  const equityMultiple = ctx.capitalRequired > 0 ? positives / ctx.capitalRequired : 0;
  const year1TaxRefund = Math.max(
    0,
    active.rows[0].federalTaxCash + active.rows[0].stateTaxCash,
  );
  const effectiveCapitalAtRisk = ctx.capitalRequired - year1TaxRefund;
  const netProfit = positives - ctx.capitalRequired;
  const simpleRoi = ctx.capitalRequired > 0 ? netProfit / ctx.capitalRequired : 0;
  let paybackYear: number | null = null;
  {
    let cum = -ctx.capitalRequired;
    for (let i = 1; i < active.flows.length; i++) {
      cum += active.flows[i];
      if (cum >= 0) {
        paybackYear = i;
        break;
      }
    }
  }

  const pct = (x: number | null) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
  const optimalWhen = [
    `Investors with REPS (§ 469(c)(7)) or offsetting passive income: ${pct(irrWithReps)} IRR — Year-1 bonus depreciation returns ~${Math.round(((year1Bonus.total + annualSL) * invRate / Math.max(1, ctx.capitalRequired)) * 100)}% of capital as first-year tax savings, with § 199A trimming tax on later profit years.`,
    `Purely passive high-W-2 investors: ${pct(irrWithoutReps)} IRR — losses suspend under § 469 and release only at the Year-${exitYear} takeout.`,
    `The return is tax-driven and takeout-dependent: capital ${inputs.prefCurrentPay ? '' : 'plus the accrued preferred '}comes back at the formula price in Year ${exitYear} via the co-op refinance — underwrite the co-op's Phase-2 mortgage qualification, not property appreciation (the ground-lease option forecloses it).`,
    `Exit tax of ~$${Math.round(exitTax / 1000)}k reduces the takeout; the negotiated short-life allocation (currently ${inputs.exitShortLifeAllocationPct}%) is worth 1.5–2.5 IRR points — negotiate the buyout price allocation schedule.`,
  ];

  return {
    capitalRequired: ctx.capitalRequired,
    grantsApplied: ctx.grantsApplied,
    purchaseBasis: ctx.contractPrice,
    year1Bonus,
    annualSL,
    accruedPrefAtExit: ctx.accruedPrefAtExit,
    schedule: active.rows,
    exit: {
      year: exitYear,
      salePrice,
      depreciableBasis: purchaseBasisTotal,
      totalDepreciationTaken: totalDepTaken,
      adjustedBasisAtExit,
      gain: exitGain,
      exitOrdinary,
      exit25,
      exit15,
      exitTax,
      netToInvestors: ctx.capitalRequired - exitTax + ctx.accruedPrefAtExit * (1 - invRate),
    },
    irrWithReps,
    irrWithoutReps,
    equityMultiple,
    year1TaxRefund,
    effectiveCapitalAtRisk,
    totalReturned: positives,
    netProfit,
    simpleRoi,
    paybackYear,
    optimalWhen,
  };
}

// ----------------------------------------------------------------------------
// § 170 donation optimizer
// ----------------------------------------------------------------------------
// Largest donation the seller fully absorbs (zero carryforward expiry) within
// the six-year window, holding all other inputs fixed. Capped at 40% of FMV.
// Monotone: bigger gifts both shrink the income that absorbs the deduction
// and grow the deduction itself, so binary search is safe.

export function findMaxAbsorbableDonation(inputs: DealInputs): number {
  const cap = inputs.totalFMV * DEAL_CONSTANTS.MAX_DONATION_PCT_OF_FMV;
  const fullyAbsorbed = (donation: number): boolean =>
    calculateDealMetrics({ ...inputs, cltLandDonation: donation }).seller.charitable.expired < 1;
  if (fullyAbsorbed(cap)) return Math.floor(cap / 1000) * 1000;
  let lo = 0;
  let hi = cap;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fullyAbsorbed(mid)) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo / 1000) * 1000;
}

// Re-export for convenience in components/tests.
export { npv, irr };
