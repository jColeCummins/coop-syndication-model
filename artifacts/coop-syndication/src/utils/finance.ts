// Monthly PMT (annuity payment)
// rate = annual rate as decimal, nper = total months, pv = loan principal
export function pmt(annualRate: number, nper: number, pv: number): number {
  const r = annualRate / 12;
  if (r === 0) return pv / nper;
  return (pv * r * Math.pow(1 + r, nper)) / (Math.pow(1 + r, nper) - 1);
}

// Remaining balance on amortizing loan after n payments
export function remainingBalance(annualRate: number, totalMonths: number, pv: number, paymentsMade: number): number {
  const r = annualRate / 12;
  if (r === 0) return pv - (pv / totalMonths) * paymentsMade;
  const monthlyPayment = pmt(annualRate, totalMonths, pv);
  return pv * Math.pow(1 + r, paymentsMade) - monthlyPayment * ((Math.pow(1 + r, paymentsMade) - 1) / r);
}

// Net present value of annual flows; flows[0] is t=0 (undiscounted)
export function npv(rate: number, flows: number[]): number {
  return flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

// Annual IRR via bisection. Returns null when no sign change exists in
// (-99%, 1000%) — e.g., all-negative or all-positive flow vectors.
export function irr(flows: number[]): number | null {
  let lo = -0.99;
  let hi = 10;
  const fLo = npv(lo, flows);
  const fHi = npv(hi, flows);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flows);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fMid * fLo > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
