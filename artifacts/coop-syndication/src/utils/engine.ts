// ============================================================================
// Deal Engine — Bifurcated Co-op Conversion Underwriting Model (V3)
// Pure calculation module. All tax/finance math lives HERE, not in components.
//
// Structure: CLT land donation (§ 170) + seller-financed installment sale of
// improvements (§ 453), Phase 1 syndicate harvesting § 168(k) bonus
// depreciation, Phase 2 co-op commercial refinance.
//
// Key modeling positions (chosen to withstand CPA scrutiny):
// 1. § 453(i) recapture is recognized entirely in Year 0 (closing year),
//    decoupled from cash received, at the 25% federal unrecaptured § 1250
//    rate PLUS state/local rates.
// 2. Anti-double-taxation basis adjustment: recognized recapture increases
//    basis for installment gross-profit purposes, so
//    grossProfit = FMV − originalBasis − accumulatedDepreciation.
//    (Without this, the recaptured amount would be taxed twice.)
// 3. § 170 charitable shield is a tracked carryforward BALANCE (starting at
//    the donation value), consumed by installment interest income, and it
//    EXPIRES after the 5-year carryforward window — Year 6+ interest is
//    fully taxed at ordinary + state + local rates. Unused balance is wasted.
//    Conservative position: the shield is NOT applied against the Year 0
//    recapture spike (AGI-cap constrained retiree).
// 4. Installment principal collections (incl. balloon) carry embedded capital
//    gain: principal × GP% taxed at 15% federal + state + local.
// 5. Depreciable basis = note principal (improvements actually purchased;
//    land is excluded via the CLT donation — no land in basis).
// 6. Limited-equity co-op: Phase 1 rents are set at break-even cost recovery.
//    Investor return is tax-driven (depreciation shield) + return of capital
//    at the Phase 2 refinance, NOT operating cash flow.
// ============================================================================

import { pmt, remainingBalance } from './finance';

// ----------------------------------------------------------------------------
// Inputs & constants
// ----------------------------------------------------------------------------

export interface EngineInputs {
  totalFMV: number;                 // $
  cltLandDonation: number;          // $
  accumulatedDepreciation: number;  // $ (seller's past depreciation taken)
  vacantLandCash: number;           // $ Day-1 cash from optional vacant-parcel sale
  sellerDownPaymentPct: number;     // % (0–30)
  sellerInterestRate: number;       // % annual
  phase2InterestRate: number;       // % annual
  noteTermYears: number;            // years (5–15) — balloon due at end of term
  capexPerUnit: number;             // $/unit/month
  mgmtFee: number;                  // $/unit/month
  stateTaxRate: number;             // % (Ohio override)
  localTaxRate: number;             // % (municipal override)
  sellerOrdinaryBracket: number;    // % federal marginal bracket (seller)
  investorOrdinaryBracket: number;  // % federal marginal bracket (investor)
}

export const CONSTANTS = {
  units: 25,
  propertyTaxes: 28472,          // $/yr (fixed)
  insuranceMisc: 15000,          // $/yr (fixed)
  amortYears: 20,                // seller note amortization schedule
  phase2AmortYears: 30,          // commercial refinance amortization
  originalBasis: 250000,         // seller's adjusted basis before recapture add-back
  recaptureFedRate: 0.25,        // unrecaptured § 1250 federal rate
  capGainsFedRate: 0.15,         // LTCG federal rate
  bonusShare: 0.30,              // 20% 5-yr + 10% 15-yr property (cost seg) → 100% bonus
  structureLife: 27.5,           // residential straight-line, remaining basis
  charitableWindowYears: 5,      // § 170 carryforward window
  mgmtInflationAnnual: 0.03,     // compounding management inflation
  vacancyFactor: 1.04,           // 4% vacancy/collection buffer on rents
  cliffThresholdPct: 15,         // rent-jump warning threshold
} as const;

export const DEFAULT_INPUTS: EngineInputs = {
  totalFMV: 2_000_000,
  cltLandDonation: 500_000,
  accumulatedDepreciation: 300_000,
  vacantLandCash: 0,
  sellerDownPaymentPct: 15,
  sellerInterestRate: 6,
  phase2InterestRate: 7,
  noteTermYears: 5,
  capexPerUnit: 100,
  mgmtFee: 50,
  stateTaxRate: 3.5,
  localTaxRate: 1.5,
  sellerOrdinaryBracket: 24,
  investorOrdinaryBracket: 37,
};

// ----------------------------------------------------------------------------
// Output shapes
// ----------------------------------------------------------------------------

export type ShieldStatus = 'SHIELDED' | 'PARTIAL' | 'EXHAUSTED' | 'EXPIRED' | 'N/A';

export interface SellerYearRow {
  year: number;                  // 0 = Day 1 / closing
  grossCashReceived: number;     // cash in (down payment, P&I, balloon, land cash)
  interestReceived: number;
  principalReceived: number;     // includes balloon in final year
  balloonInYear: number;         // balloon component of principal (0 except final year)
  shieldUsed: number;            // § 170 carryforward consumed this year
  shieldRemaining: number;       // balance after this year
  shieldStatus: ShieldStatus;
  taxPaid: number;               // total tax attributable to this year's receipts
  postTaxCash: number;           // grossCashReceived − taxPaid
  cumulativePostTax: number;     // running post-tax cash in pocket
  remainingPrincipal: number;    // note balance at end of year
}

export interface InvestorYearRow {
  year: number;                  // 0 = closing
  capitalInjected: number;       // positive = cash in; NEGATIVE in final year = capital returned
  operatingCashFlow: number;     // 0 by construction (break-even co-op)
  depreciationTaxSavings: number;
  netCapitalPosition: number;    // cumulative: −injections + savings + returns
}

export interface SellerAnalysis {
  notePrincipal: number;
  downPayment: number;
  loanAmount: number;
  grossProfitPct: number;        // AFTER § 453(i) basis adjustment
  recaptureTax: number;          // accumDepr × (25% + state + local)
  dpCapGainsTax: number;         // down-payment embedded gain tax
  vacantLandTax: number;
  year0Tax: number;
  year0NetLiquidity: number;     // (vacantLandCash + DP) − year0Tax
  isYear0Negative: boolean;
  schedule: SellerYearRow[];
  totalPostTaxCash: number;      // final cumulative
  totalTaxPaid: number;
  shieldWasted: number;          // unused § 170 carryforward at expiry
  cliffTaxPenalty: number;       // extra tax on Year 6+ unshielded interest
}

export interface InvestorAnalysis {
  requiredCapitalInjection: number;  // DP + noteTermYears × annual CapEx reserve
  year1DepreciationShield: number;   // depreciable basis × 30% (bonus-eligible)
  year1TaxSavings: number;           // shield × combined investor rate
  depreciableBasis: number;          // = notePrincipal
  schedule: InvestorYearRow[];
  totalTaxSavings: number;
  moic: number;                      // (capital + savings) / capital
  irr: number | null;                // annual IRR of investor flows
}

export interface TenantAnalysis {
  phase1AnnualRevenueReq: number;
  phase1MonthlyRent: number;
  balloonBalance: number;            // note balance at month noteTermYears×12
  phase2RefinanceBurden: number;     // balloon + investor capital returned
  phase2AnnualRevenueReq: number;
  phase2MonthlyRent: number;
  phase2MgmtFeePerUnit: number;      // inflated mgmt fee at refinance
  rentJumpPct: number;
  isRentCliff: boolean;
}

export interface Insight {
  id: string;
  severity: 'positive' | 'warning' | 'critical' | 'info';
  title: string;
  body: string;
}

export interface DealModel {
  seller: SellerAnalysis;
  investor: InvestorAnalysis;
  tenant: TenantAnalysis;
  insights: Insight[];
  combinedCapGainsRate: number;
  sellerCombinedOrdinaryRate: number;
  investorCombinedRate: number;
}

// ----------------------------------------------------------------------------
// Amortization helper — per-year interest/principal split
// ----------------------------------------------------------------------------

export interface YearAmort {
  year: number;              // 1-based
  interest: number;
  principal: number;
  endingBalance: number;
}

export function annualAmortization(
  annualRate: number,        // decimal, e.g. 0.06
  totalMonths: number,
  principal: number,
  years: number,
): YearAmort[] {
  const r = annualRate / 12;
  const monthly = pmt(annualRate, totalMonths, principal);
  const rows: YearAmort[] = [];
  let balance = principal;
  for (let y = 1; y <= years; y++) {
    let interest = 0;
    let principalPaid = 0;
    for (let m = 0; m < 12; m++) {
      const i = balance * r;
      const p = Math.min(monthly - i, balance);
      interest += i;
      principalPaid += p;
      balance -= p;
      if (balance <= 0) { balance = 0; break; }
    }
    rows.push({ year: y, interest, principal: principalPaid, endingBalance: balance });
    if (balance === 0) break;
  }
  return rows;
}

// IRR via bisection on annual cash flows (flows[0] at t=0). Null if undefined.
export function irr(flows: number[]): number | null {
  const hasPos = flows.some(f => f > 0);
  const hasNeg = flows.some(f => f < 0);
  if (!hasPos || !hasNeg) return null;
  const npv = (rate: number) =>
    flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
  let lo = -0.9999;
  let hi = 1;
  let fLo = npv(lo);
  let fHi = npv(hi);
  // Expand the upper bracket until a sign change is found (IRR can legitimately
  // exceed 1000% for tiny-capital / large-shield configurations).
  let guard = 0;
  while (fLo * fHi > 0 && guard < 64) {
    hi *= 2;
    fHi = npv(hi);
    guard++;
  }
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) { hi = mid; } else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

// ----------------------------------------------------------------------------
// Main engine
// ----------------------------------------------------------------------------

export function computeDealModel(inp: EngineInputs): DealModel {
  const C = CONSTANTS;
  const stateLocal = (inp.stateTaxRate + inp.localTaxRate) / 100;
  const combinedCapGainsRate = C.capGainsFedRate + stateLocal;
  const sellerCombinedOrdinaryRate = inp.sellerOrdinaryBracket / 100 + stateLocal;
  const investorCombinedRate = inp.investorOrdinaryBracket / 100 + stateLocal;
  const annualCapex = inp.capexPerUnit * C.units * 12;
  const annualMgmt = inp.mgmtFee * C.units * 12;

  // --- Deal structure -------------------------------------------------------
  const notePrincipal = inp.totalFMV - inp.cltLandDonation;
  const downPayment = notePrincipal * (inp.sellerDownPaymentPct / 100);
  const loanAmount = notePrincipal - downPayment;
  const T = Math.round(inp.noteTermYears);

  // --- § 453(i) adjusted gross profit (anti-double-taxation) ----------------
  const grossProfit = Math.max(0, inp.totalFMV - C.originalBasis - inp.accumulatedDepreciation);
  const grossProfitPct = inp.totalFMV > 0 ? grossProfit / inp.totalFMV : 0;

  // --- Seller: Year 0 -------------------------------------------------------
  const recaptureTax = inp.accumulatedDepreciation * (C.recaptureFedRate + stateLocal);
  const dpCapGainsTax = downPayment * grossProfitPct * combinedCapGainsRate;
  // Vacant land assumed to carry the same gross-profit ratio (stated assumption).
  const vacantLandTax = inp.vacantLandCash * grossProfitPct * combinedCapGainsRate;
  const year0Gross = inp.vacantLandCash + downPayment;
  const year0Tax = recaptureTax + dpCapGainsTax + vacantLandTax;
  const year0Net = year0Gross - year0Tax;

  // --- Seller: Years 1..T schedule ------------------------------------------
  const amort = annualAmortization(inp.sellerInterestRate / 100, C.amortYears * 12, loanAmount, T);
  const balloonBalance = Math.max(0, remainingBalance(
    inp.sellerInterestRate / 100, C.amortYears * 12, loanAmount, T * 12,
  ));

  const schedule: SellerYearRow[] = [];
  let cumulative = year0Net;
  let totalTaxPaid = year0Tax;
  let shieldBalance = inp.cltLandDonation;
  let cliffTaxPenalty = 0;

  schedule.push({
    year: 0,
    grossCashReceived: year0Gross,
    interestReceived: 0,
    principalReceived: 0,
    balloonInYear: 0,
    shieldUsed: 0,
    shieldRemaining: shieldBalance,
    shieldStatus: 'N/A',
    taxPaid: year0Tax,
    postTaxCash: year0Net,
    cumulativePostTax: cumulative,
    remainingPrincipal: loanAmount,
  });

  let shieldWasted = 0;
  for (let y = 1; y <= T; y++) {
    const row = amort[y - 1] ?? { year: y, interest: 0, principal: 0, endingBalance: 0 };
    const isFinal = y === T;
    const balloonInYear = isFinal ? balloonBalance : 0;
    const principalReceived = row.principal + balloonInYear;
    const grossCash = row.interest + principalReceived;

    // § 170 shield: valid only within the 5-year carryforward window.
    let shieldUsed = 0;
    let shieldStatus: ShieldStatus;
    if (y <= C.charitableWindowYears) {
      shieldUsed = Math.min(row.interest, shieldBalance);
      shieldBalance -= shieldUsed;
      shieldStatus = shieldUsed >= row.interest - 0.005
        ? 'SHIELDED'
        : shieldUsed > 0 ? 'PARTIAL' : 'EXHAUSTED';
    } else {
      shieldStatus = 'EXPIRED';
      cliffTaxPenalty += row.interest * sellerCombinedOrdinaryRate;
    }
    if (y === C.charitableWindowYears) {
      shieldWasted = shieldBalance; // whatever remains after year 5 is lost
    }

    const taxableInterest = row.interest - shieldUsed;
    const interestTax = taxableInterest * sellerCombinedOrdinaryRate;
    const gainTax = principalReceived * grossProfitPct * combinedCapGainsRate;
    const taxPaid = interestTax + gainTax;
    const postTax = grossCash - taxPaid;
    cumulative += postTax;
    totalTaxPaid += taxPaid;

    schedule.push({
      year: y,
      grossCashReceived: grossCash,
      interestReceived: row.interest,
      principalReceived,
      balloonInYear,
      shieldUsed,
      shieldRemaining: shieldBalance,
      shieldStatus,
      taxPaid,
      postTaxCash: postTax,
      cumulativePostTax: cumulative,
      remainingPrincipal: isFinal ? 0 : row.endingBalance,
    });
  }
  if (T < C.charitableWindowYears) shieldWasted = shieldBalance;

  const seller: SellerAnalysis = {
    notePrincipal,
    downPayment,
    loanAmount,
    grossProfitPct,
    recaptureTax,
    dpCapGainsTax,
    vacantLandTax,
    year0Tax,
    year0NetLiquidity: year0Net,
    isYear0Negative: year0Net < 0,
    schedule,
    totalPostTaxCash: cumulative,
    totalTaxPaid,
    shieldWasted,
    cliffTaxPenalty,
  };

  // --- Investor -------------------------------------------------------------
  const depreciableBasis = notePrincipal; // improvements only; land excluded via CLT
  const requiredCapitalInjection = downPayment + annualCapex * T;
  const year1DepreciationShield = depreciableBasis * C.bonusShare;
  const year1TaxSavings = year1DepreciationShield * investorCombinedRate;
  const annualSLDepreciation = (depreciableBasis * (1 - C.bonusShare)) / C.structureLife;
  const annualSLSavings = annualSLDepreciation * investorCombinedRate;

  const invSchedule: InvestorYearRow[] = [];
  let position = 0;
  let totalTaxSavings = 0;
  const flows: number[] = [];

  // Year 0: down payment + Year 1 CapEx reserve.
  const y0Injection = downPayment + annualCapex;
  position -= y0Injection;
  invSchedule.push({
    year: 0,
    capitalInjected: y0Injection,
    operatingCashFlow: 0,
    depreciationTaxSavings: 0,
    netCapitalPosition: position,
  });
  flows.push(-y0Injection);

  for (let y = 1; y <= T; y++) {
    // Reserve funding for the FOLLOWING year (none needed after final year);
    // final year returns ALL capital via the Phase 2 refinance.
    const reserveInjection = y < T ? annualCapex : 0;
    const capitalReturned = y === T ? requiredCapitalInjection : 0;
    const savings = y === 1 ? year1TaxSavings : annualSLSavings;
    totalTaxSavings += savings;

    const capitalInjected = reserveInjection - capitalReturned; // negative in final year
    position += -reserveInjection + savings + capitalReturned;
    invSchedule.push({
      year: y,
      capitalInjected,
      operatingCashFlow: 0,
      depreciationTaxSavings: savings,
      netCapitalPosition: position,
    });
    flows.push(-reserveInjection + savings + capitalReturned);
  }

  const investor: InvestorAnalysis = {
    requiredCapitalInjection,
    year1DepreciationShield,
    year1TaxSavings,
    depreciableBasis,
    schedule: invSchedule,
    totalTaxSavings,
    moic: requiredCapitalInjection > 0
      ? (requiredCapitalInjection + totalTaxSavings) / requiredCapitalInjection
      : 0,
    irr: irr(flows),
  };

  // --- Tenant ----------------------------------------------------------------
  const annualDS_P1 = pmt(inp.sellerInterestRate / 100, C.amortYears * 12, loanAmount) * 12;
  const phase1AnnualRevenueReq =
    annualDS_P1 + C.propertyTaxes + C.insuranceMisc + annualMgmt + annualCapex;
  const phase1MonthlyRent = (phase1AnnualRevenueReq / C.units / 12) * C.vacancyFactor;

  const phase2RefinanceBurden = balloonBalance + requiredCapitalInjection;
  const annualDS_P2 = pmt(inp.phase2InterestRate / 100, C.phase2AmortYears * 12, phase2RefinanceBurden) * 12;
  const phase2MgmtFeePerUnit = inp.mgmtFee * Math.pow(1 + C.mgmtInflationAnnual, T);
  const phase2AnnualRevenueReq =
    annualDS_P2 + C.propertyTaxes + C.insuranceMisc + phase2MgmtFeePerUnit * C.units * 12;
  const phase2MonthlyRent = (phase2AnnualRevenueReq / C.units / 12) * C.vacancyFactor;

  const rentJumpPct = phase1MonthlyRent > 0
    ? ((phase2MonthlyRent - phase1MonthlyRent) / phase1MonthlyRent) * 100
    : 0;

  const tenant: TenantAnalysis = {
    phase1AnnualRevenueReq,
    phase1MonthlyRent,
    balloonBalance,
    phase2RefinanceBurden,
    phase2AnnualRevenueReq,
    phase2MonthlyRent,
    phase2MgmtFeePerUnit,
    rentJumpPct,
    isRentCliff: rentJumpPct > C.cliffThresholdPct,
  };

  // --- Structuring insights ---------------------------------------------------
  const insights: Insight[] = [];

  // 1. Year 0 liquidity — minimum down payment for a solvent closing.
  if (seller.isYear0Negative) {
    let minPct: number | null = null;
    for (let pct = inp.sellerDownPaymentPct; pct <= 30; pct += 0.5) {
      const dp = notePrincipal * (pct / 100);
      const tax = recaptureTax + dp * grossProfitPct * combinedCapGainsRate + vacantLandTax;
      if (inp.vacantLandCash + dp - tax >= 0) { minPct = pct; break; }
    }
    insights.push({
      id: 'year0-insolvent',
      severity: 'critical',
      title: 'Seller is cash-negative at closing',
      body: minPct !== null
        ? `Down payment does not cover the Year 0 recapture liability. Raise the down payment to at least ${minPct.toFixed(1)}% (or add Day-1 vacant-land cash) to close solvent.`
        : `Down payment cannot cover the Year 0 recapture liability at any level up to 30%. Add Day-1 cash (vacant-land sale) or reduce accumulated depreciation exposure via a § 1031-eligible structure review.`,
    });
  } else {
    insights.push({
      id: 'year0-solvent',
      severity: 'positive',
      title: 'Closing is self-funding for the seller',
      body: `Day-1 cash of ${fmtUSD(year0Gross)} covers the full ${fmtUSD(year0Tax)} Year 0 tax load (recapture + embedded gain) with ${fmtUSD(year0Net)} to spare.`,
    });
  }

  // 2. § 170 shield utilization & note-term cliff.
  if (T > C.charitableWindowYears) {
    insights.push({
      id: 'shield-cliff',
      severity: 'critical',
      title: `Note term breaches the 5-year § 170 window`,
      body: `Years 6–${T} interest is fully taxed at ${(sellerCombinedOrdinaryRate * 100).toFixed(1)}%, costing the seller ${fmtUSD(cliffTaxPenalty)} in avoidable tax${shieldWasted > 0 ? `, while ${fmtUSD(shieldWasted)} of charitable carryforward expires unused` : ''}. Shortening the note to 5 years eliminates this penalty.`,
    });
  } else if (shieldWasted > 0) {
    const usable = inp.cltLandDonation - shieldWasted;
    insights.push({
      id: 'shield-oversized',
      severity: 'warning',
      title: 'Charitable shield is oversized for this note',
      body: `Only ${fmtUSD(usable)} of the ${fmtUSD(inp.cltLandDonation)} donation is consumed by interest income within the 5-year window — ${fmtUSD(shieldWasted)} of deduction expires unused. Consider a smaller donation / larger note split, or ensure the seller has other ordinary income to absorb it.`,
    });
  } else if (T === C.charitableWindowYears) {
    insights.push({
      id: 'shield-optimal',
      severity: 'positive',
      title: 'Note term is § 170-optimal',
      body: `The ${T}-year note keeps every interest dollar inside the charitable carryforward window — the donation shield is fully harvested with no Year 6 cliff exposure.`,
    });
  }

  // 3. Rent cliff.
  if (tenant.isRentCliff) {
    insights.push({
      id: 'rent-cliff',
      severity: 'critical',
      title: `Phase 2 rent jump of ${rentJumpPct.toFixed(1)}% breaches the 15% affordability guardrail`,
      body: `The refinance must absorb ${fmtUSD(phase2RefinanceBurden)} (balloon + investor capital return). Levers: extend investor capital as subordinate debt instead of a Day-1 buyout, negotiate the Phase 2 rate below ${inp.phase2InterestRate.toFixed(2)}%, or lengthen amortization.`,
    });
  } else {
    insights.push({
      id: 'rent-stable',
      severity: 'positive',
      title: 'Tenant rent path clears the affordability guardrail',
      body: `Phase 2 rent moves ${rentJumpPct >= 0 ? '+' : ''}${rentJumpPct.toFixed(1)}% vs Phase 1 — inside the 15% limited-equity guardrail.`,
    });
  }

  // 4. Investor tax-efficiency framing.
  if (investor.irr !== null) {
    insights.push({
      id: 'investor-return',
      severity: 'info',
      title: `Investor return is 100% tax-harvested`,
      body: `At a ${(investorCombinedRate * 100).toFixed(1)}% combined bracket, the § 168(k) cost-seg bonus converts ${fmtUSD(year1DepreciationShield)} of basis into ${fmtUSD(year1TaxSavings)} of Year 1 savings — an all-tax ${(investor.irr * 100).toFixed(1)}% IRR with capital returned at par. REPS status (750+ hrs) is mandatory to use it against active income.`,
    });
  }

  return {
    seller,
    investor,
    tenant,
    insights,
    combinedCapGainsRate,
    sellerCombinedOrdinaryRate,
    investorCombinedRate,
  };
}

function fmtUSD(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(Math.round(v));
}

// ----------------------------------------------------------------------------
// Tooltip portfolio — exact strings per spec (hardcoded, do not edit)
// ----------------------------------------------------------------------------

export const TOOLTIPS = {
  recapture453i:
    'IRS Code dictates that all historical depreciation claimed on a property must be recaptured and taxed as ordinary income up front in Year 1 of an installment sale, completely decoupled from the actual cash received at closing.',
  agi170:
    "Charitable deductions for land donations to public charities are capped at 50% of the donor's Adjusted Gross Income (AGI) per year. Unused deduction balances can be carried forward for a maximum of 5 consecutive tax years, creating a severe tax cliff in Year 6.",
  reps469c7:
    'To use passive real estate depreciation losses to offset active W-2 or ordinary income, an investor must log 750+ hours annually in real property trades or businesses and materially participate in operations.',
  macs168k:
    'An engineering-based study that unpacks a monolithic real estate asset into 5-year personal property and 15-year land improvements, legally unlocking immediate 100% bonus depreciation expensing upon acquisition.',
  // Supplemental assumption tooltips (model positions, not statute quotes)
  basisAdjustment:
    'Anti-double-taxation adjustment: depreciation recaptured under § 453(i) increases basis for installment gross-profit purposes, so the recaptured amount is not taxed a second time as capital gain when principal is collected.',
  depreciableBasis:
    'Depreciable basis equals the note principal — only the improvements are purchased; the land is excluded from basis via the CLT donation.',
  breakEvenCoop:
    'Limited-equity co-op: Phase 1 rents are set at break-even cost recovery. Investor return is tax-driven plus return of capital at refinance — not operating cash flow.',
  vacantLand:
    'Optional Day-1 cash from selling an adjacent vacant parcel at closing. Modeled with the same gross-profit ratio as the installment sale.',
  reserveMechanics:
    'Investors pre-fund each year\'s CapEx reserve; tenant rents cover ongoing CapEx accrual, so reserves are returned at par in the Phase 2 refinance along with the down payment.',
} as const;
