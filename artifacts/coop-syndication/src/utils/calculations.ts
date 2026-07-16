// ============================================================================
// V5 CALCULATION ENGINE — Limited-Equity Co-op Conversion Underwriting
// ============================================================================
// Single entry point: calculateDealMetrics(inputs). Pure, typed, no UI
// side-effects. Components must contain zero math.
//
// V5 supersedes the V4 "exact algebra" engine. The V4/Gemini-primer positions
// that were CORRECTED here (each documented in docs/ANALYSIS.md):
//
//  1. § 453(i) "recapture bomb" REMOVED for straight-line residential real
//     property. § 453(i) accelerates only ordinary recapture under §§ 1245/
//     1250. Post-1986 residential rental is straight-line, so there is no
//     § 1250 ordinary recapture; the 25% "unrecaptured § 1250 gain" is NOT
//     accelerated — it spreads over installments, recognized FIRST within
//     each payment's gain (Reg. § 1.453-12 ordering).
//  2. Gross Profit Ratio computed on the CONTRACT PRICE (FMV − donated land),
//     not total FMV, with adjusted basis apportioned pro-rata between the
//     gift and sale parts (§ 1011(b) bargain-sale principle). GPR ∈ [0, 1].
//  3. Accumulated depreciation is clamped at the depreciable (building)
//     share of basis — land never depreciates and basis cannot go below zero,
//     so "negative adjusted basis / GPR > 100%" cannot occur.
//  4. § 170 shield: 30%-of-AGI annual limit for appreciated long-term
//     property to a public charity, usable in the contribution year plus a
//     5-year carryforward (6 usable years; first zero-shield year is Year 7,
//     not Year 6). Ohio allows NO charitable deduction (no itemized
//     deductions against the state flat tax), and Ohio municipalities cannot
//     tax intangible income (interest, capital gains) under ORC 718 — the
//     local rate therefore never touches the seller's note income.
//  5. Investor cost-seg bonus base = purchase price (the improvements the
//     buyer actually acquires — land goes to the CLT), not 75% of total FMV.
//  6. Rent requirement now includes repairs/maintenance, owner-paid
//     utilities, replacement reserves, and a current-pay investor preferred
//     return — the missing lines that made V4 rents implausibly low.
//  7. Investor exit is taxed: five years of depreciation drives the basis
//     down, so the Year-5 takeout triggers gain (~25% bucket up to
//     depreciation taken). IRR is computed on post-tax flows, with and
//     without REPS (§ 469(c)(7)).
//  8. NIIT (3.8% over $250k MAGI) and the 20% LTCG bracket are applied
//     automatically per-year, which is precisely why the installment
//     structure beats a lump-sum cash sale for this seller.
// ============================================================================

import { pmt, remainingBalance, irr, npv } from './finance';

// ----------------------------------------------------------------------------
// Inputs
// ----------------------------------------------------------------------------

export interface DealInputs {
  // Property & Operations
  units: number;                   // 10–50
  currentRent: number;             // $/mo, 400–1500
  vacancyRate: number;             // %, 0–15
  propertyTaxes: number;           // $/yr
  annualInsuranceMisc: number;     // $/yr
  mgmtFeePerDoor: number;          // $/door/mo
  repairsMaintPerUnit: number;     // $/unit/yr
  utilitiesPerUnit: number;        // $/unit/yr, owner-paid common/water/sewer/trash
  reservesPerUnit: number;         // $/unit/yr, replacement reserves
  // Seller Profile
  totalFMV: number;
  originalCostBasis: number;       // 1993 transferred basis
  accumulatedDepreciation: number; // clamped to building share of basis
  cltLandDonation: number;         // FMV of land donated to the CLT
  sellerOtherIncome: number;       // $/yr baseline AGI outside the deal
  sellerOrdinaryRate: number;      // % federal marginal ordinary rate
  discountRate: number;            // % NPV discount for scenario comparison
  // Deal Structure
  sellerDownPaymentPct: number;    // % of contract price
  sellerInterestRate: number;      // %
  noteTermYears: number;           // amortization term
  balloonYear: number;             // takeout / Phase 2 boundary
  phase2CommercialRate: number;    // % refinance rate
  stateTaxRate: number;            // % Ohio flat income tax
  localTaxRate: number;            // % municipal (earned income / net profits only)
  // Investor Profile & New CapEx
  investorPrefReturn: number;      // % current-pay preferred on invested capital
  investorMarginalRate: number;    // % federal marginal (W-2) rate
  investorHasREPS: boolean;        // § 469(c)(7) real estate professional status
  capexRoofStruct: number;         // 27.5-yr
  capexParkingLand: number;        // 15-yr
  capexAppliances: number;         // 5-yr
}

export const DEFAULT_INPUTS: DealInputs = {
  units: 25,
  currentRent: 700,
  vacancyRate: 4,
  propertyTaxes: 28472,
  annualInsuranceMisc: 15000,
  mgmtFeePerDoor: 50,
  repairsMaintPerUnit: 900,
  utilitiesPerUnit: 600,
  reservesPerUnit: 300,
  totalFMV: 1500000,
  originalCostBasis: 250000,
  accumulatedDepreciation: 185000,
  cltLandDonation: 440000,
  sellerOtherIncome: 75000,
  sellerOrdinaryRate: 24,
  discountRate: 5,
  sellerDownPaymentPct: 15,
  sellerInterestRate: 6,
  noteTermYears: 20,
  balloonYear: 5,
  phase2CommercialRate: 7,
  stateTaxRate: 2.75,
  localTaxRate: 1.5,
  investorPrefReturn: 7,
  investorMarginalRate: 35,
  investorHasREPS: true,
  capexRoofStruct: 90000,
  capexParkingLand: 50000,
  capexAppliances: 40000,
};

export const CONSTANTS = {
  UNRECAP_1250_RATE: 0.25,        // cap-gain rate ceiling on unrecaptured § 1250 gain
  LTCG_RATE_LOW: 0.15,
  LTCG_RATE_HIGH: 0.20,
  LTCG_HIGH_THRESHOLD: 550000,    // approx. taxable-income breakpoint for the 20% bracket
  NIIT_RATE: 0.038,
  NIIT_MAGI_THRESHOLD: 250000,    // MFJ
  CHARITY_AGI_LIMIT: 0.30,        // appreciated LT property to a public charity
  CHARITY_USABLE_YEARS: 6,        // contribution year + 5-year carryforward
  BUILDING_RATIO: 0.75,           // building share of basis/value; land = 25%
  COST_SEG_SHORT_LIFE_PCT: 0.30,  // share of acquired improvements reclassed 5/15-yr
  RESIDENTIAL_LIFE: 27.5,
  REFI_AMORT_YEARS: 30,
  MGMT_INFLATION_P2: 1.15,
  RENT_CLIFF_THRESHOLD_PCT: 10,
  OHIO_BONUS_ADDBACK: 5 / 6,      // Ohio § 168(k) addback, deducted 1/5 over 5 yrs
} as const;

// ----------------------------------------------------------------------------
// Output shapes
// ----------------------------------------------------------------------------

export interface SellerYearRow {
  year: number;
  interestReceived: number;
  principalReceived: number;       // incl. down payment (yr 1) and balloon
  grossCashReceived: number;
  gainRecognized: number;
  gain25: number;                  // unrecaptured § 1250 portion (25%)
  gainLtcg: number;                // 15/20% portion
  charitableDeductionUsed: number;
  federalTax: number;
  stateTax: number;
  niitTax: number;
  totalTax: number;
  postTaxCash: number;
  cumulativePostTaxCash: number;
  remainingNoteBalance: number;
  shieldActive: boolean;           // any § 170 deduction applied this year
  isBalloonYear: boolean;
}

export interface SellerScenario {
  label: string;
  nominalAfterTax: number;
  npvAfterTax: number;
  totalTax: number;
}

export interface SellerMetrics {
  contractPrice: number;
  downPayment: number;
  financedPrincipal: number;
  totalAdjustedBasis: number;
  soldAdjustedBasis: number;
  donatedBasisAllocated: number;
  clampedDepreciation: number;
  depWasClamped: boolean;
  grossProfit: number;
  grossProfitRatio: number;        // ∈ [0, 1]
  unrecap1250Total: number;
  schedule: SellerYearRow[];
  year1Tax: number;
  year1GrossCash: number;
  headroom: number;
  isTaxExceedsDP: boolean;
  charitable: {
    total: number;
    used: number;
    unused: number;
    utilizationPct: number;
    firstZeroShieldYear: number;   // year 7 under § 170(d)
  };
  comparison: {
    straightCash: SellerScenario;
    cashPlusDonation: SellerScenario;
    installmentPlusDonation: SellerScenario;
    npvAdvantageVsCash: number;    // installment NPV − straight-cash net
    nominalAdvantageVsCash: number;
  };
}

export interface InvestorYearRow {
  year: number;
  capitalInjected: number;         // year 1 only
  operatingCashFlow: number;       // preferred return, current pay
  depreciation: number;
  taxableRentalIncome: number;     // pref + principal amortized − depreciation
  federalTaxCash: number;          // + = savings, − = tax paid (REPS-dependent)
  stateTaxCash: number;            // Ohio w/ 5/6 bonus addback (REPS mode)
  localTax: number;                // municipal net-profits tax on positive rental income
  suspendedLossBalance: number;    // non-REPS mode
  exitProceeds: number;            // capital return − exit tax (+ loss release), exit yr
  netCashFlow: number;
  cumulativePosition: number;
  isExitYear: boolean;
}

export interface InvestorMetrics {
  capitalRequired: number;
  purchaseBasis: number;           // contract price (improvements only; land → CLT)
  year1Bonus: { costSeg: number; parkingLand: number; appliances: number; total: number };
  annualSL: number;                // 27.5-yr straight-line on non-seg building + roof
  schedule: InvestorYearRow[];     // reflects the current REPS toggle
  exit: {
    year: number;
    salePrice: number;
    adjustedBasisAtExit: number;
    gain: number;
    exitTax: number;
    netToInvestors: number;
  };
  irrWithReps: number | null;      // fraction
  irrWithoutReps: number | null;
  equityMultiple: number;          // on the active REPS toggle
  paybackYear: number | null;
  optimalWhen: string[];
}

export interface TenantMetrics {
  opexAnnual: number;              // taxes + insurance + mgmt + R&M + utilities + reserves
  opexBreakdown: {
    propertyTaxes: number;
    insurance: number;
    mgmt: number;
    repairsMaint: number;
    utilities: number;
    reserves: number;
  };
  prefAnnual: number;
  phase1AnnualDebtService: number;
  phase1AnnualRevenueReq: number;
  phase1MonthlyRent: number;
  rentDelta: number;
  balloonBalance: number;
  balloonBeyondTerm: boolean;
  phase2RefinanceBurden: number;
  phase2AnnualDebtService: number;
  phase2MgmtAnnual: number;
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
  amortSchedule: AmortRow[];
}

// ----------------------------------------------------------------------------
// Tooltip copy
// ----------------------------------------------------------------------------

export const TOOLTIPS = {
  recapture453i:
    'IRC § 453(i) accelerates only ORDINARY recapture (§§ 1245/1250) into the year of sale. Post-1986 residential rental is straight-line, so there is no § 1250 ordinary recapture here. The 25% "unrecaptured § 1250 gain" is not accelerated: it spreads over the installments and is recognized FIRST within each payment\'s gain (Reg. § 1.453-12).',
  grossProfitPct:
    'Gross Profit Ratio = (Contract Price − Basis Allocated to the Sale) ÷ Contract Price, where Contract Price = FMV − donated land and basis is apportioned pro-rata between the gift and sale parts under the § 1011(b) bargain-sale principle. Bounded 0–100% — depreciation is clamped at depreciable basis, so basis can never go negative.',
  charitable170:
    'IRC § 170: donating appreciated long-term property to a public charity (the CLT) deducts fair market value, limited to 30% of AGI per year, usable in the contribution year plus a 5-year carryforward (§ 170(d)) — six years total; Year 7 is the first zero-shield year. Ohio allows no charitable deduction against its flat tax, and Ohio municipalities cannot tax interest or capital gains at all (ORC 718).',
  reps469c7:
    'IRC § 469(c)(7): without Real Estate Professional Status (750+ hours, material participation), rental losses are passive — they cannot offset W-2 income and suspend until disposition (§ 469(g)), releasing as a lump deduction at the Year-5 takeout. With REPS, losses offset ordinary income annually. Toggle REPS to see both timelines.',
  bonus168k:
    'IRC § 168(k) as amended by OBBBA (2025): 100% first-year bonus depreciation, permanent, including used property. Applies to the 5-yr and 15-yr classes — new appliance/site CapEx plus the cost-segregated share of the ACQUIRED improvements. The 27.5-yr residential shell never qualifies for bonus. Ohio decouples: 5/6 of bonus is added back and recovered over the following five years.',
  costSegBase:
    'The buyers acquire the improvements only (land goes to the CLT), so the depreciable base is the contract price — not 75% of total FMV. A cost-segregation study reclassifying 30% into 5/15-yr classes is the aggressive end of the typical 20–30% range for garden apartments; treat it as requiring an engineering study.',
  niit:
    'The 3.8% Net Investment Income Tax applies to interest and gains once MAGI exceeds $250k (MFJ). Spreading gain over installments keeps most years below the threshold — a lump-sum cash sale maximizes NIIT exposure. Applied automatically per year.',
  ltcgBracket:
    'Long-term gain is taxed at 15% until taxable income crosses ≈$550k, then 20%. A lump-sum sale pushes most of the gain into the 20% bracket + NIIT; installments keep annual gain in the 15% bracket. Applied automatically per year.',
  exitTax:
    'Bonus depreciation is a deferral, not an exemption: five years of deductions cut the entity\'s basis, so the Year-5 co-op takeout triggers gain — modeled at 25% up to total depreciation taken (§ 1245 ordinary recapture on personal-property components could raise this), 15% above. Investor IRR is net of this exit tax.',
  noteMechanics:
    'The seller note amortizes monthly over the full term with the remaining balance due as a balloon at the takeout year. If the balloon year reaches the term, the note self-amortizes and no balloon is due.',
  refinanceBurden:
    'Phase 2 Refinance = balloon balance owed to the seller + full return of investor capital. The co-op refinances both on a 30-year commercial mortgage; the preferred-return line disappears because investors have been taken out.',
  vacancyGrossUp:
    'Required rents are grossed up for vacancy/collection loss: ÷ (1 − vacancy), so occupied units carry the full revenue requirement.',
  requiredRent:
    'This is a COST-RECOVERY rent, not a market rent: debt service + full operating costs (taxes, insurance, management, repairs & maintenance, owner-paid utilities, replacement reserves) + the investor preferred return, grossed up for vacancy. If it sits below market comps, the structure has affordability headroom.',
  municipalTax:
    'Ohio municipal income tax (ORC 718) reaches qualifying wages and business net profits only — never interest, dividends, or capital gains. It therefore never touches the seller\'s note income, and it only touches investors when rental income is positive after depreciation.',
} as const;

export const METHODOLOGY: string[] = [
  'Structure: the seller donates the land to a Community Land Trust (§ 170) and sells the improvements to the co-op syndicate on an installment note (§ 453). Contract price = FMV − donated land; basis is apportioned pro-rata between gift and sale parts (§ 1011(b) principle); accumulated depreciation is clamped at the building share of basis (75%), since land never depreciates and basis cannot go below zero.',
  'Seller gain: no § 453(i) acceleration applies to straight-line residential real property. Each year\'s collected principal × Gross Profit Ratio is recognized as gain, 25%-rate unrecaptured § 1250 dollars first (Reg. § 1.453-12), then LTCG at 15%/20% by an automatic ≈$550k taxable-income breakpoint. NIIT (3.8%) applies automatically when MAGI exceeds $250k. Ohio taxes the full amount at the flat state rate with no charitable offset; Ohio municipalities cannot tax interest or gains (ORC 718), so the local rate does not touch the seller.',
  'Charitable shield: FMV deduction limited to 30% of AGI per year, contribution year + 5 carryforward years (6 usable years; Year 7 is the first zero-shield year). Applied mechanically against ordinary income first, then the 25% bucket, then 20/15% gain. Unused carryforward after Year 6 expires and is surfaced as a utilization warning.',
  'Investor: depreciable base = contract price (improvements only) + new CapEx. § 168(k)/OBBBA 100% bonus on the 5-yr and 15-yr classes, including a 30% cost-seg reclass of acquired improvements; the 27.5-yr shell is straight-line (full-year convention, simplified). Without REPS, losses suspend and release at the takeout (§ 469(g)); with REPS they offset W-2 annually. Ohio state effect models the 5/6 bonus addback recovered over five years; municipal tax hits only positive rental net profits. Exit: takeout price − depreciated basis is taxed 25% up to depreciation taken, 15% above; IRR/equity multiple/payback are computed on post-tax flows.',
  'Rent: required rent is cost-recovery — Phase 1 = seller-note debt service + property taxes + insurance + management + repairs & maintenance + owner-paid utilities + replacement reserves + investor preferred return, ÷ units ÷ 12 ÷ (1 − vacancy). Phase 2 swaps in the 30-yr refinance payment (balloon + investor take-out), inflates management 15%, and drops the preferred return. Property taxes/insurance held flat across phases (no inflation modeling).',
  'Simplifications a CPA should re-underwrite: flat marginal rates (no full bracket ladder); mid-month/mid-year MACRS conventions ignored; § 461(l) excess-business-loss cap, § 453A interest charge (>$5M notes), imputed-interest floors (§ 1274, note rate must be ≥ AFR), Ohio 1/6 addback recovery beyond exit, and investor NIIT are noted but not modeled. Illustrative only — not tax or investment advice.',
];

// ----------------------------------------------------------------------------
// Engine
// ----------------------------------------------------------------------------

export function calculateDealMetrics(inputs: DealInputs): DealMetrics {
  const C = CONSTANTS;
  const ordRate = inputs.sellerOrdinaryRate / 100;
  const stateRate = inputs.stateTaxRate / 100;
  const localRate = inputs.localTaxRate / 100;
  const disc = inputs.discountRate / 100;

  // ---- Basis, bargain-sale allocation, gross profit ratio -------------------
  const depreciableBasis = inputs.originalCostBasis * C.BUILDING_RATIO;
  const clampedDepreciation = Math.min(inputs.accumulatedDepreciation, depreciableBasis);
  const depWasClamped = inputs.accumulatedDepreciation > clampedDepreciation;
  const totalAdjustedBasis = inputs.originalCostBasis - clampedDepreciation;

  const contractPrice = Math.max(0, inputs.totalFMV - inputs.cltLandDonation);
  const donationShare = inputs.totalFMV > 0 ? inputs.cltLandDonation / inputs.totalFMV : 0;
  const donatedBasisAllocated = totalAdjustedBasis * donationShare;
  const soldAdjustedBasis = totalAdjustedBasis - donatedBasisAllocated;

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

  const amortSchedule: AmortRow[] = [];
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
  const balloonBalance =
    balloonBeyondTerm || financedPrincipal <= 0
      ? 0
      : Math.max(0, remainingBalance(noteRate, noteMonths, financedPrincipal, inputs.balloonYear * 12));

  // ---- Seller annual schedule ------------------------------------------------
  // Marginal convention: taxes shown are the DEAL's incremental taxes vs. a
  // no-deal baseline of sellerOtherIncome. The § 170 deduction may therefore
  // produce negative deal-tax years (it shields other income too).
  interface GainSplit { g25: number; g20: number; g15: number }
  const splitLtcg = (ltcg: number, taxableProxy: number): { g20: number; g15: number } => {
    const excess = Math.max(0, taxableProxy - C.LTCG_HIGH_THRESHOLD);
    const g20 = Math.min(ltcg, excess);
    return { g20, g15: ltcg - g20 };
  };

  const schedule: SellerYearRow[] = [];
  let unrecapRemaining = unrecap1250Total;
  let charityCarry = inputs.cltLandDonation;
  let charityUsedTotal = 0;
  let cumulative = 0;

  const scheduleYears = Math.max(lastNoteYear, charityCarry > 0 ? C.CHARITY_USABLE_YEARS : 0);
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
    let deduction = 0;
    if (year <= C.CHARITY_USABLE_YEARS && charityCarry > 0) {
      deduction = Math.min(charityCarry, C.CHARITY_AGI_LIMIT * agi);
      charityCarry -= deduction;
      charityUsedTotal += deduction;
    }

    // Mechanical ordering: deduction absorbs ordinary income first (interest +
    // other income), then the 25% bucket, then 20%, then 15%.
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

    // Incremental federal tax vs. baseline (other income at ordinary rate).
    // dedOrd beyond interest shields other income, so this may go negative.
    const fedOrdinaryTax = (interest - dedOrd) * ordRate;
    const fedGainTax =
      (g25base - ded25) * C.UNRECAP_1250_RATE +
      (g20 - ded20) * C.LTCG_RATE_HIGH +
      (g15 - ded15) * C.LTCG_RATE_LOW;
    const federalTax = fedOrdinaryTax + fedGainTax;

    // NIIT: MAGI is pre-itemized-deduction; NII = interest + gains.
    const nii = interest + gain;
    const niitTax = C.NIIT_RATE * Math.min(nii, Math.max(0, agi - C.NIIT_MAGI_THRESHOLD));

    // Ohio: flat rate on the deal's income; no charitable deduction at state
    // level. Municipal: interest/gains are intangible income — never taxed.
    const stateTax = stateRate * nii;

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
      used: charityUsedTotal,
      unused: inputs.cltLandDonation - charityUsedTotal,
      utilizationPct:
        inputs.cltLandDonation > 0 ? (charityUsedTotal / inputs.cltLandDonation) * 100 : 100,
      firstZeroShieldYear: C.CHARITY_USABLE_YEARS + 1,
    },
    comparison: buildSellerComparison(inputs, {
      totalAdjustedBasis,
      clampedDepreciation,
      contractPrice,
      soldAdjustedBasis,
      installmentFlows: schedule.map((r) => r.postTaxCash),
      installmentTaxTotal: schedule.reduce((a, r) => a + r.totalTax, 0),
      disc,
      ordRate,
      stateRate,
    }),
  };

  // ---- Tenant / rent requirement ----------------------------------------------
  const perUnitOpex =
    inputs.repairsMaintPerUnit + inputs.utilitiesPerUnit + inputs.reservesPerUnit;
  const mgmtAnnual = inputs.mgmtFeePerDoor * inputs.units * 12;
  const opexBreakdown = {
    propertyTaxes: inputs.propertyTaxes,
    insurance: inputs.annualInsuranceMisc,
    mgmt: mgmtAnnual,
    repairsMaint: inputs.repairsMaintPerUnit * inputs.units,
    utilities: inputs.utilitiesPerUnit * inputs.units,
    reserves: inputs.reservesPerUnit * inputs.units,
  };
  const opexAnnual =
    inputs.propertyTaxes + inputs.annualInsuranceMisc + mgmtAnnual + perUnitOpex * inputs.units;

  const totalNewCapex = inputs.capexRoofStruct + inputs.capexParkingLand + inputs.capexAppliances;
  const capitalRequired = downPayment + totalNewCapex;
  const prefAnnual = capitalRequired * (inputs.investorPrefReturn / 100);

  const phase1AnnualDebtService = monthlyPmt * 12;
  const phase1AnnualRevenueReq = phase1AnnualDebtService + opexAnnual + prefAnnual;
  const occupancy = 1 - inputs.vacancyRate / 100;
  const phase1MonthlyRent = phase1AnnualRevenueReq / inputs.units / 12 / occupancy;

  const phase2RefinanceBurden = balloonBalance + capitalRequired;
  const refiRate = inputs.phase2CommercialRate / 100;
  const monthlyP2 =
    phase2RefinanceBurden > 0 ? pmt(refiRate, C.REFI_AMORT_YEARS * 12, phase2RefinanceBurden) : 0;
  const phase2AnnualDebtService = monthlyP2 * 12;
  const phase2MgmtAnnual = mgmtAnnual * C.MGMT_INFLATION_P2;
  const phase2AnnualRevenueReq =
    phase2AnnualDebtService + (opexAnnual - mgmtAnnual + phase2MgmtAnnual);
  const phase2MonthlyRent = phase2AnnualRevenueReq / inputs.units / 12 / occupancy;
  const rentJumpPct =
    phase1MonthlyRent > 0 ? ((phase2MonthlyRent - phase1MonthlyRent) / phase1MonthlyRent) * 100 : 0;

  const tenant: TenantMetrics = {
    opexAnnual,
    opexBreakdown,
    prefAnnual,
    phase1AnnualDebtService,
    phase1AnnualRevenueReq,
    phase1MonthlyRent,
    rentDelta: phase1MonthlyRent - inputs.currentRent,
    balloonBalance,
    balloonBeyondTerm,
    phase2RefinanceBurden,
    phase2AnnualDebtService,
    phase2MgmtAnnual,
    phase2AnnualRevenueReq,
    phase2MonthlyRent,
    rentJumpPct,
    isRentCliff: rentJumpPct > C.RENT_CLIFF_THRESHOLD_PCT,
  };

  // ---- Investor ---------------------------------------------------------------
  const investor = buildInvestorMetrics(inputs, {
    contractPrice,
    capitalRequired,
    totalNewCapex,
    prefAnnual,
    amortSchedule,
    balloonBalance,
    balloonBeyondTerm,
    lastNoteYear,
    localRate,
    stateRate,
  });

  return { inputs, seller, investor, tenant, amortSchedule };
}

// ----------------------------------------------------------------------------
// Seller scenario comparison (vs. cash sale)
// ----------------------------------------------------------------------------

interface ComparisonCtx {
  totalAdjustedBasis: number;
  clampedDepreciation: number;
  contractPrice: number;
  soldAdjustedBasis: number;
  installmentFlows: number[];
  installmentTaxTotal: number;
  disc: number;
  ordRate: number;
  stateRate: number;
}

function buildSellerComparison(inputs: DealInputs, ctx: ComparisonCtx): SellerMetrics['comparison'] {
  const C = CONSTANTS;

  // Tax on a fully-recognized gain in a single year, marginal to other income.
  const lumpGainTax = (gain: number, unrecapCap: number, deduction: number): number => {
    const g25base = Math.min(gain, unrecapCap);
    const ltcgBase = gain - g25base;
    const agi = inputs.sellerOtherIncome + gain;
    const ordinaryIncome = inputs.sellerOtherIncome;
    const dedOrd = Math.min(deduction, ordinaryIncome);
    let dedLeft = deduction - dedOrd;
    const ded25 = Math.min(dedLeft, g25base);
    dedLeft -= ded25;
    const taxableProxy = Math.max(0, agi - deduction);
    const excess = Math.max(0, taxableProxy - C.LTCG_HIGH_THRESHOLD);
    const g20 = Math.min(ltcgBase, excess);
    const g15 = ltcgBase - g20;
    const ded20 = Math.min(dedLeft, g20);
    dedLeft -= ded20;
    const ded15 = Math.min(dedLeft, g15);
    const fed =
      -dedOrd * ctx.ordRate +
      (g25base - ded25) * C.UNRECAP_1250_RATE +
      (g20 - ded20) * C.LTCG_RATE_HIGH +
      (g15 - ded15) * C.LTCG_RATE_LOW;
    const niit = C.NIIT_RATE * Math.min(gain, Math.max(0, agi - C.NIIT_MAGI_THRESHOLD));
    const state = ctx.stateRate * gain;
    return fed + niit + state;
  };

  // Scenario 1: straight cash sale of the whole property at FMV, no donation.
  const cashGain = Math.max(0, inputs.totalFMV - ctx.totalAdjustedBasis);
  const cashTax = lumpGainTax(cashGain, Math.min(ctx.clampedDepreciation, cashGain), 0);
  const straightCash: SellerScenario = {
    label: 'Straight cash sale',
    nominalAfterTax: inputs.totalFMV - cashTax,
    npvAfterTax: inputs.totalFMV - cashTax, // all at t=0
    totalTax: cashTax,
  };

  // Scenario 2: donate land, sell improvements for CASH in year 1; the § 170
  // carryforward then runs against other income in years 2–6.
  const bifGain = Math.max(0, ctx.contractPrice - ctx.soldAdjustedBasis);
  const unrecapCap = Math.min(ctx.clampedDepreciation, bifGain);
  const agiY1 = inputs.sellerOtherIncome + bifGain;
  const dedY1 = Math.min(inputs.cltLandDonation, C.CHARITY_AGI_LIMIT * agiY1);
  const bifTaxY1 = lumpGainTax(bifGain, unrecapCap, dedY1);
  let carry = inputs.cltLandDonation - dedY1;
  let bifNominal = ctx.contractPrice - bifTaxY1;
  let bifNpv = ctx.contractPrice - bifTaxY1;
  let bifTaxTotal = bifTaxY1;
  for (let year = 2; year <= C.CHARITY_USABLE_YEARS && carry > 0; year++) {
    const ded = Math.min(carry, C.CHARITY_AGI_LIMIT * inputs.sellerOtherIncome);
    carry -= ded;
    const benefit = ded * ctx.ordRate; // shields other ordinary income (federal only)
    bifNominal += benefit;
    bifNpv += benefit / Math.pow(1 + ctx.disc, year - 1);
    bifTaxTotal -= benefit;
  }
  const cashPlusDonation: SellerScenario = {
    label: 'Cash sale + CLT donation',
    nominalAfterTax: bifNominal,
    npvAfterTax: bifNpv,
    totalTax: bifTaxTotal,
  };

  // Scenario 3: the structure (installment + donation) from the schedule.
  const instNominal = ctx.installmentFlows.reduce((a, b) => a + b, 0);
  const instNpv = ctx.installmentFlows.reduce(
    (acc, cf, i) => acc + cf / Math.pow(1 + ctx.disc, i + 1),
    0,
  );
  const installmentPlusDonation: SellerScenario = {
    label: 'Installment + CLT donation',
    nominalAfterTax: instNominal,
    npvAfterTax: instNpv,
    totalTax: ctx.installmentTaxTotal,
  };

  return {
    straightCash,
    cashPlusDonation,
    installmentPlusDonation,
    npvAdvantageVsCash: instNpv - straightCash.npvAfterTax,
    nominalAdvantageVsCash: instNominal - straightCash.nominalAfterTax,
  };
}

// ----------------------------------------------------------------------------
// Investor model
// ----------------------------------------------------------------------------

interface InvestorCtx {
  contractPrice: number;
  capitalRequired: number;
  totalNewCapex: number;
  prefAnnual: number;
  amortSchedule: AmortRow[];
  balloonBalance: number;
  balloonBeyondTerm: boolean;
  lastNoteYear: number;
  localRate: number;
  stateRate: number;
}

function buildInvestorMetrics(inputs: DealInputs, ctx: InvestorCtx): InvestorMetrics {
  const C = CONSTANTS;
  const invRate = inputs.investorMarginalRate / 100;
  const exitYear = ctx.lastNoteYear;

  // Depreciable base: buyers acquire the improvements only (land → CLT).
  const costSegBonus = ctx.contractPrice * C.COST_SEG_SHORT_LIFE_PCT;
  const shell27 = ctx.contractPrice * (1 - C.COST_SEG_SHORT_LIFE_PCT);
  const annualSL = shell27 / C.RESIDENTIAL_LIFE + inputs.capexRoofStruct / C.RESIDENTIAL_LIFE;
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

  // Exit: co-op buys the entity out at balloon + capital return.
  const salePrice = ctx.balloonBalance + ctx.capitalRequired;
  const purchaseBasisTotal = ctx.contractPrice + ctx.totalNewCapex;
  const adjustedBasisAtExit = purchaseBasisTotal - totalDepTaken;
  const exitGain = Math.max(0, salePrice - adjustedBasisAtExit);
  const exitRecapture = Math.min(exitGain, totalDepTaken);
  const exitTax =
    exitRecapture * C.UNRECAP_1250_RATE +
    (exitGain - exitRecapture) * C.LTCG_RATE_LOW +
    exitGain * ctx.stateRate;

  // Build the annual flow model for a given REPS assumption.
  const buildFlows = (hasReps: boolean) => {
    const rows: InvestorYearRow[] = [];
    const flows: number[] = [-ctx.capitalRequired];
    let suspended = 0;
    let ohioDeferred = 0; // 5/6 addback recovered 1/5 per following year (REPS mode)
    let cumulative = -ctx.capitalRequired;

    for (let y = 1; y <= exitYear; y++) {
      const amort = ctx.amortSchedule[y - 1];
      const principal = amort ? amort.principalPaid : 0;
      const dep = depByYear[y - 1];
      const taxable = ctx.prefAnnual + principal - dep;

      let federalTaxCash = 0;
      let stateTaxCash = 0;
      if (hasReps) {
        federalTaxCash = -taxable * invRate; // loss → savings (+), profit → tax (−)
        // Ohio: add back 5/6 of year-1 bonus, recover 1/5 of it per year after.
        let ohioTaxable = taxable;
        if (y === 1) {
          const addback = year1Bonus.total * C.OHIO_BONUS_ADDBACK;
          ohioTaxable += addback;
          ohioDeferred = addback;
        } else if (ohioDeferred > 0) {
          ohioTaxable -= ohioDeferred / 5;
        }
        stateTaxCash = -ohioTaxable * ctx.stateRate;
      } else {
        // § 469: losses suspend; profits absorb carryforward first.
        if (taxable < 0) {
          suspended += -taxable;
        } else {
          const offset = Math.min(suspended, taxable);
          suspended -= offset;
          const net = taxable - offset;
          federalTaxCash = -net * invRate;
          stateTaxCash = -net * ctx.stateRate;
        }
      }
      const localTax = Math.max(0, taxable) * ctx.localRate;

      let exitProceeds = 0;
      const isExitYear = y === exitYear;
      if (isExitYear) {
        exitProceeds = ctx.capitalRequired - exitTax;
        if (!hasReps && suspended > 0) {
          exitProceeds += suspended * invRate; // § 469(g) release at full disposition
          suspended = 0;
        }
      }

      const netCashFlow = ctx.prefAnnual + federalTaxCash + stateTaxCash - localTax + exitProceeds;
      cumulative += netCashFlow;
      flows.push(netCashFlow);
      rows.push({
        year: y,
        capitalInjected: y === 1 ? ctx.capitalRequired : 0,
        operatingCashFlow: ctx.prefAnnual,
        depreciation: dep,
        taxableRentalIncome: taxable,
        federalTaxCash,
        stateTaxCash,
        localTax,
        suspendedLossBalance: suspended,
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
    `Investors with REPS (§ 469(c)(7)) or offsetting passive income: ${pct(irrWithReps)} IRR — Year-1 bonus depreciation returns ~${Math.round(((year1Bonus.total + annualSL) * invRate / Math.max(1, ctx.capitalRequired)) * 100)}% of capital as first-year tax savings.`,
    `Purely passive high-W-2 investors: ${pct(irrWithoutReps)} IRR — losses suspend under § 469 and release only at the Year-${exitYear} takeout.`,
    `The return is tax-driven and takeout-dependent: capital is returned at par in Year ${exitYear} via the co-op refinance, so underwrite the co-op's ability to qualify for the Phase 2 mortgage, not property appreciation.`,
    `Exit tax of ${Math.round(exitTax / 1000)}k reduces the takeout — bonus depreciation is a deferral, not an exemption.`,
  ];

  return {
    capitalRequired: ctx.capitalRequired,
    purchaseBasis: ctx.contractPrice,
    year1Bonus,
    annualSL,
    schedule: active.rows,
    exit: {
      year: exitYear,
      salePrice,
      adjustedBasisAtExit,
      gain: exitGain,
      exitTax,
      netToInvestors: ctx.capitalRequired - exitTax,
    },
    irrWithReps,
    irrWithoutReps,
    equityMultiple,
    paybackYear,
    optimalWhen,
  };
}

// Re-export for convenience in components/tests.
export { npv, irr };
