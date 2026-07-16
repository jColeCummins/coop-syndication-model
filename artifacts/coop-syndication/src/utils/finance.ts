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
