// ============================================================================
// V4 CALCULATION ENGINE — Real Estate Limited-Equity Co-op Syndication
// ============================================================================
// Implements the user's V4 spec ALGEBRAIC ENGINE verbatim. Order of operations
// (no circular dependencies):
//   1. Read global state (inputs)
//   2. Seller: Year 1 tax liability & note parameters
//   3. Investor: capital requirements & MACRS/OBBBA depreciation
//   4. Tenant: revenue required & rent deltas
//   5. (UI renders the returned model — zero math in components)
//
// MODELING POSITIONS (verbatim from spec — do not "improve" without direction):
// - Note Principal = FMV − CLT land donation; DP is a % of Note Principal.
// - Adjusted Basis = originalCostBasis − accumulatedDepreciation. May go
//   NEGATIVE when past depreciation exceeds the 1993 transferred basis; the
//   Gross Profit % formula MAX(0, (FMV − AdjBasis)/FMV) then exceeds 100%.
//   This is surfaced (isBasisNegative) but NOT capped — exact spec algebra.
// - Year 1 Recapture Tax = accumulatedDepreciation × 25% (flat § 1250 rate).
// - Year 1 CapGains Tax = Down Payment × GP% × 15% (flat LTCG rate).
// - Year 1 OBBBA Bonus Shield = 100% bonus on 5-yr + 15-yr new CapEx buckets
//   plus 30% segregated bonus on the acquired building (FMV × 75% building).
// - Phase 1 debt service: monthly PMT convention (rate/12, years×12), ×12.
// - Balloon due at month (balloonYear × 12) on the noteTermYears amortization
//   schedule; if balloonYear ≥ noteTermYears the note self-amortizes first and
//   the balloon is $0 (flagged balloonBeyondTerm).
// - Phase 2 burden = balloon balance + Required Capital Injection (investor
//   take-out), refinanced over 30 years at phase2CommercialRate; mgmt fees
//   inflated by a flat 15% in Phase 2.
// - Rents are grossed up for vacancy: ÷ (1 − vacancyRate).
// - Rent cliff alert threshold: Phase 2 > Phase 1 by more than 10%.
// ============================================================================

import { pmt, remainingBalance } from './finance';

// ----------------------------------------------------------------------------
// Inputs
// ----------------------------------------------------------------------------

export interface EngineInputs {
  // Property & Tenant Baseline
  units: number;                 // integer, 10–50
  currentRent: number;           // $/mo, 400–1500
  vacancyRate: number;           // %, 0–15
  propertyTaxes: number;         // $/yr, 10k–50k
  annualInsuranceMisc: number;   // $/yr, 5k–30k
  mgmtFeePerDoor: number;        // $/door/mo, 0–150
  // Seller's Financial Reality
  totalFMV: number;              // $1M–$3M
  originalCostBasis: number;     // 1993 transferred basis, 0–1M
  accumulatedDepreciation: number; // 0–1M
  cltLandDonation: number;       // 0–1M
  // The Deal Structure
  sellerDownPaymentPct: number;  // %, 0–30
  sellerInterestRate: number;    // %, 3–10
  noteTermYears: number;         // 5–30
  balloonYear: number;           // 1–10
  phase2CommercialRate: number;  // %, 4–10
  // Investor New CapEx Buckets
  capexRoofStruct: number;       // 27.5-yr MACRS, 0–200k
  capexParkingLand: number;      // 15-yr MACRS, 0–100k
  capexAppliances: number;       // 5-yr MACRS, 0–100k
}

export const DEFAULT_INPUTS: EngineInputs = {
  units: 24,
  currentRent: 700,
  vacancyRate: 4,
  propertyTaxes: 28472,
  annualInsuranceMisc: 15000,
  mgmtFeePerDoor: 50,
  totalFMV: 1500000,
  originalCostBasis: 250000,
  accumulatedDepreciation: 300000,
  cltLandDonation: 440000,
  sellerDownPaymentPct: 15,
  sellerInterestRate: 6,
  noteTermYears: 20,
  balloonYear: 5,
  phase2CommercialRate: 7,
  capexRoofStruct: 90000,
  capexParkingLand: 50000,
  capexAppliances: 40000,
};

export const CONSTANTS = {
  RECAPTURE_RATE: 0.25,          // § 1250 unrecaptured gain, flat
  LTCG_RATE: 0.15,               // long-term capital gains, flat
  BUILDING_RATIO: 0.75,          // building share of FMV for cost-seg bonus
  SEG_BONUS_RATE: 0.30,          // 30% segregated bonus on acquired building
  REFI_AMORT_YEARS: 30,          // Phase 2 commercial amortization
  MGMT_INFLATION_P2: 1.15,       // flat +15% mgmt fees in Phase 2
  RENT_CLIFF_THRESHOLD_PCT: 10,  // Phase 2 > Phase 1 by more than 10% → alert
} as const;

// ----------------------------------------------------------------------------
// Outputs
// ----------------------------------------------------------------------------

export interface SellerAnalysis {
  notePrincipal: number;
  downPaymentReceived: number;
  adjustedBasis: number;         // may be negative (depr > basis)
  isBasisNegative: boolean;
  grossProfitPct: number;        // fraction; may exceed 1.0 when basis < 0
  year1RecaptureTax: number;
  year1CapGainsTax: number;
  totalYear1Tax: number;
  headroom: number;              // downPayment − totalYear1Tax
  isTaxExceedsDP: boolean;       // CRITICAL alert condition
}

export interface InvestorAnalysis {
  totalNewCapex: number;
  requiredCapitalInjection: number;
  // Year 1 OBBBA bonus depreciation shield and its components
  bonusOnParkingLand: number;    // 100% bonus, 15-yr MACRS bucket
  bonusOnAppliances: number;     // 100% bonus, 5-yr MACRS bucket
  segBonusOnBuilding: number;    // FMV × 75% × 30%
  year1BonusShield: number;
}

export interface AmortRow {
  year: number;                  // 1..effectiveBalloonYear
  annualPayment: number;
  interestPaid: number;
  principalPaid: number;
  endingBalance: number;
  isBalloonYear: boolean;
}

export interface TenantAnalysis {
  financedPrincipal: number;     // Note Principal − Down Payment
  phase1AnnualDebtService: number;
  phase1MgmtAnnual: number;
  phase1AnnualRevenueReq: number;
  phase1MonthlyRent: number;
  rentDelta: number;             // Phase 1 rent − current rent (signed)
  balloonBalance: number;        // at month balloonYear × 12 (0 if beyond term)
  balloonBeyondTerm: boolean;    // balloonYear ≥ noteTermYears
  phase2RefinanceBurden: number; // balloon + required capital injection
  phase2AnnualDebtService: number;
  phase2MgmtAnnual: number;      // Phase 1 mgmt × 1.15
  phase2AnnualRevenueReq: number;
  phase2MonthlyRent: number;
  rentJumpPct: number;           // Phase 2 vs Phase 1, signed %
  isRentCliff: boolean;          // jump > +10%
}

export interface DealModel {
  inputs: EngineInputs;
  seller: SellerAnalysis;
  investor: InvestorAnalysis;
  tenant: TenantAnalysis;
  amortSchedule: AmortRow[];     // note mechanics through the balloon
}

// ----------------------------------------------------------------------------
// Tooltip copy (spec-derived; no invented tax law)
// ----------------------------------------------------------------------------

export const TOOLTIPS = {
  recapture453i:
    'IRS § 453(i): depreciation recapture cannot be deferred through an installment sale — it is recognized in full in the year of sale, regardless of cash received. Modeled at a flat 25% unrecaptured § 1250 rate.',
  grossProfitPct:
    'Gross Profit % = MAX(0, (FMV − Adjusted Basis) ÷ FMV), where Adjusted Basis = 1993 transferred basis − accumulated depreciation. When past depreciation exceeds the transferred basis, Adjusted Basis is negative and this ratio exceeds 100% — every installment dollar (and more) is taxable gain.',
  capGains:
    'Capital gains recognized in Year 1 = Down Payment × Gross Profit % × 15% flat LTCG rate. Under § 453 installment treatment, gain is recognized proportionally as principal is collected; the down payment is the Year 1 collection.',
  obbbaShield:
    'Assumes 100% bonus depreciation on the 5-year (appliances) and 15-year (parking/land improvements) new CapEx buckets, plus a 30% segregated bonus on the acquired building (75% of FMV). Roof/structural CapEx depreciates on the 27.5-year schedule — no Year 1 bonus.',
  reps469c7:
    'IRC § 469(c)(7): passive investors cannot use this depreciation shield against W-2 income without Real Estate Professional Status (≥750 hours + material participation). Without REPS, losses are suspended under the passive activity rules.',
  noteMechanics:
    'The seller note amortizes monthly over the full note term, but the remaining balance comes due as a balloon at the configured balloon year. If the balloon year reaches the note term, the note self-amortizes and no balloon is due.',
  refinanceBurden:
    'Phase 2 Refinance Burden = balloon balance due to the seller + full return of investor capital (down payment + CapEx). The co-op refinances both at the commercial rate over 30 years.',
  vacancyGrossUp:
    'Required rents are grossed up for vacancy/collection loss: divided by (1 − vacancy rate), so occupied units carry the full revenue requirement.',
} as const;

// Methodology footnote lines (rendered verbatim by the UI)
export const METHODOLOGY: string[] = [
  'Note Principal = FMV − CLT land donation; the down payment is a percentage of the note. Adjusted Basis = 1993 transferred basis − accumulated depreciation and may be negative; the Gross Profit % formula MAX(0, (FMV − Adjusted Basis) ÷ FMV) is applied exactly and may exceed 100% in that case.',
  'Year 1 taxes use flat federal rates: 25% on unrecaptured § 1250 depreciation recapture (recognized entirely in Year 1 per § 453(i)) and 15% LTCG on the down-payment share of gain. State and local taxes are excluded from this model.',
  'The Year 1 OBBBA bonus shield assumes 100% bonus depreciation on 5-yr and 15-yr new CapEx and a 30% segregated bonus on the acquired building at 75% of FMV. Roof/structural spend follows the 27.5-year schedule with no Year 1 bonus.',
  'Debt service uses monthly amortization (annual rate ÷ 12) times 12. The seller note amortizes over the full term with the balloon due at the configured year. Phase 2 refinances the balloon plus full investor capital take-out over 30 years at the commercial rate.',
  'Required rents gross up for vacancy: ÷ (1 − vacancy). Management fees inflate a flat 15% in Phase 2. Property taxes and insurance are held constant across phases.',
  'Illustrative model — not tax or investment advice; validate with counsel & CPA.',
];

// ----------------------------------------------------------------------------
// Engine
// ----------------------------------------------------------------------------

export function computeDealModel(inputs: EngineInputs): DealModel {
  const C = CONSTANTS;

  // ---- 2. Seller's Crucible -------------------------------------------------
  const notePrincipal = inputs.totalFMV - inputs.cltLandDonation;
  const downPaymentReceived = notePrincipal * (inputs.sellerDownPaymentPct / 100);
  const adjustedBasis = inputs.originalCostBasis - inputs.accumulatedDepreciation;
  const grossProfitPct = Math.max(0, (inputs.totalFMV - adjustedBasis) / inputs.totalFMV);
  const year1RecaptureTax = inputs.accumulatedDepreciation * C.RECAPTURE_RATE;
  const year1CapGainsTax = downPaymentReceived * grossProfitPct * C.LTCG_RATE;
  const totalYear1Tax = year1RecaptureTax + year1CapGainsTax;

  const seller: SellerAnalysis = {
    notePrincipal,
    downPaymentReceived,
    adjustedBasis,
    isBasisNegative: adjustedBasis < 0,
    grossProfitPct,
    year1RecaptureTax,
    year1CapGainsTax,
    totalYear1Tax,
    headroom: downPaymentReceived - totalYear1Tax,
    isTaxExceedsDP: totalYear1Tax > downPaymentReceived,
  };

  // ---- 3. Investor Profile ---------------------------------------------------
  const totalNewCapex = inputs.capexRoofStruct + inputs.capexParkingLand + inputs.capexAppliances;
  const requiredCapitalInjection = downPaymentReceived + totalNewCapex;
  const segBonusOnBuilding = inputs.totalFMV * C.BUILDING_RATIO * C.SEG_BONUS_RATE;
  const year1BonusShield = inputs.capexParkingLand + inputs.capexAppliances + segBonusOnBuilding;

  const investor: InvestorAnalysis = {
    totalNewCapex,
    requiredCapitalInjection,
    bonusOnParkingLand: inputs.capexParkingLand,
    bonusOnAppliances: inputs.capexAppliances,
    segBonusOnBuilding,
    year1BonusShield,
  };

  // ---- 4. Tenant Rent Cliff ---------------------------------------------------
  const rate1 = inputs.sellerInterestRate / 100;
  const financedPrincipal = notePrincipal - downPaymentReceived;
  const noteMonths = inputs.noteTermYears * 12;
  const monthlyP1 = financedPrincipal > 0 ? pmt(rate1, noteMonths, financedPrincipal) : 0;
  const phase1AnnualDebtService = monthlyP1 * 12;
  const phase1MgmtAnnual = inputs.mgmtFeePerDoor * inputs.units * 12;
  const phase1AnnualRevenueReq =
    phase1AnnualDebtService + inputs.propertyTaxes + inputs.annualInsuranceMisc + phase1MgmtAnnual;
  const occupancy = 1 - inputs.vacancyRate / 100;
  const phase1MonthlyRent = phase1AnnualRevenueReq / inputs.units / 12 / occupancy;
  const rentDelta = phase1MonthlyRent - inputs.currentRent;

  const balloonBeyondTerm = inputs.balloonYear >= inputs.noteTermYears;
  const balloonMonths = Math.min(inputs.balloonYear, inputs.noteTermYears) * 12;
  const balloonBalance =
    balloonBeyondTerm || financedPrincipal <= 0
      ? 0
      : Math.max(0, remainingBalance(rate1, noteMonths, financedPrincipal, balloonMonths));

  const phase2RefinanceBurden = balloonBalance + requiredCapitalInjection;
  const rate2 = inputs.phase2CommercialRate / 100;
  const monthlyP2 =
    phase2RefinanceBurden > 0 ? pmt(rate2, C.REFI_AMORT_YEARS * 12, phase2RefinanceBurden) : 0;
  const phase2AnnualDebtService = monthlyP2 * 12;
  const phase2MgmtAnnual = phase1MgmtAnnual * C.MGMT_INFLATION_P2;
  const phase2AnnualRevenueReq =
    phase2AnnualDebtService + inputs.propertyTaxes + inputs.annualInsuranceMisc + phase2MgmtAnnual;
  const phase2MonthlyRent = phase2AnnualRevenueReq / inputs.units / 12 / occupancy;
  const rentJumpPct =
    phase1MonthlyRent > 0 ? ((phase2MonthlyRent - phase1MonthlyRent) / phase1MonthlyRent) * 100 : 0;

  const tenant: TenantAnalysis = {
    financedPrincipal,
    phase1AnnualDebtService,
    phase1MgmtAnnual,
    phase1AnnualRevenueReq,
    phase1MonthlyRent,
    rentDelta,
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

  // ---- Note mechanics through the balloon (pure amortization, no tax) --------
  const amortSchedule: AmortRow[] = [];
  const lastYear = Math.min(inputs.balloonYear, inputs.noteTermYears);
  if (financedPrincipal > 0) {
    let balance = financedPrincipal;
    const r = rate1 / 12;
    for (let year = 1; year <= lastYear; year++) {
      let interestPaid = 0;
      let principalPaid = 0;
      for (let m = 0; m < 12; m++) {
        const interest = balance * r;
        const principal = Math.min(monthlyP1 - interest, balance);
        interestPaid += interest;
        principalPaid += principal;
        balance -= principal;
        if (balance <= 0) break;
      }
      amortSchedule.push({
        year,
        annualPayment: interestPaid + principalPaid,
        interestPaid,
        principalPaid,
        endingBalance: Math.max(0, balance),
        isBalloonYear: year === lastYear && !balloonBeyondTerm,
      });
      if (balance <= 0) break;
    }
  }

  return { inputs, seller, investor, tenant, amortSchedule };
}
