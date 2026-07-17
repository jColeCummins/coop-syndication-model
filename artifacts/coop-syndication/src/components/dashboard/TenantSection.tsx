import React from 'react';
import { DealMetrics, TOOLTIPS, ESCALATORS } from '@/utils/calculations';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';
import { AlertTriangle } from 'lucide-react';

export function TenantSection({ model, tooltips }: { model: DealMetrics; tooltips: typeof TOOLTIPS }) {
  const { tenant, inputs } = model;
  const isCliff = tenant.isRentCliff;
  const o1 = tenant.opexYear1;
  const o2 = tenant.opexBuyoutYear;
  const p2Year = inputs.balloonYear + 1;
  // The Phase-2 jump accumulates over the whole Phase-1 period — show the
  // equivalent annual drift so a 5-year 12% move reads as ~2.4%/yr, not a cliff.
  const annualizedJump =
    tenant.phase1MonthlyRent > 0 && inputs.balloonYear > 0
      ? (Math.pow(tenant.phase2MonthlyRent / tenant.phase1MonthlyRent, 1 / inputs.balloonYear) - 1) * 100
      : 0;

  return (
    <section className="flex flex-col space-y-4">
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-medium tracking-wide text-foreground">Tenant &mdash; Cost-Recovery Rent, Both Phases</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-6 rounded-md flex flex-col items-center justify-center space-y-2 text-center">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Current Rent</span>
          <span className="text-3xl font-light tabular-nums text-foreground">{formatCurrency(inputs.currentRent)}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Baseline &mdash; market comps $900&ndash;$1,100</span>
        </div>

        <div className="bg-card border border-border p-6 rounded-md flex flex-col items-center justify-center space-y-2 text-center">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Phase 1 Rent <InfoTooltip text={tooltips.requiredRent} /></span>
          <span className="text-3xl font-light tabular-nums text-foreground">{formatCurrency(tenant.phase1MonthlyRent)}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Years 1&ndash;{inputs.balloonYear} (Year-1 costs)</span>
          <span className={`text-[11px] font-medium ${tenant.rentDelta <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {tenant.rentDelta > 0 ? '+' : ''}{formatCurrency(tenant.rentDelta)} vs current
          </span>
        </div>

        <div className={`p-6 rounded-md flex flex-col items-center justify-center space-y-2 text-center border relative ${
          isCliff ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
        }`}>
          {isCliff && (
            <div className="absolute top-3 right-3 flex items-center space-x-1 px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[8px] font-bold tracking-widest uppercase rounded-sm">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>Cliff</span>
            </div>
          )}
          <span className={`text-[11px] uppercase tracking-widest font-semibold ${isCliff ? 'text-destructive' : 'text-emerald-500/80'}`}>Phase 2 Rent</span>
          <span className="text-3xl font-light tabular-nums font-bold">{formatCurrency(tenant.phase2MonthlyRent)}</span>
          <span className={`text-[10px] uppercase tracking-widest ${isCliff ? 'text-destructive/80' : 'text-emerald-500/60'}`}>Year {p2Year}+ (escalated costs) <InfoTooltip text={tooltips.escalators} /></span>
          <span className="text-[11px] font-medium">
            {tenant.rentJumpPct > 0 ? '+' : ''}{formatPercent(tenant.rentJumpPct)} vs Phase 1 &asymp; {formatPercent(annualizedJump)}/yr drift
          </span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-md overflow-hidden flex flex-col mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-medium text-left">Revenue Build-Up</th>
                <th className="py-3 px-4 font-medium">Phase 1 (Year-1 costs)</th>
                <th className="py-3 px-4 font-medium">Phase 2 (Year-{p2Year} costs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-4 text-left">Annual Debt Service</td>
                <td className="py-2.5 px-4">{formatCurrency(tenant.phase1AnnualDebtService)}</td>
                <td className="py-2.5 px-4">{formatCurrency(tenant.phase2AnnualDebtService)}</td>
              </tr>
              <OpexRow label="Property Taxes" v1={o1.propertyTaxes} v2={o2.propertyTaxes} esc={ESCALATORS.PROPERTY_TAX} />
              <OpexRow label="Insurance & Misc" v1={o1.insurance} v2={o2.insurance} esc={ESCALATORS.INSURANCE} />
              <OpexRow label="Management" v1={o1.mgmt} v2={o2.mgmt} esc={ESCALATORS.MANAGEMENT} />
              <OpexRow label="Repairs & Maintenance" v1={o1.repairsMaint} v2={o2.repairsMaint} esc={ESCALATORS.GENERAL} />
              <OpexRow label="Owner-Paid Utilities" v1={o1.utilities} v2={o2.utilities} esc={ESCALATORS.UTILITIES} />
              <OpexRow label="Replacement Reserves" v1={o1.reserves} v2={o2.reserves} esc={ESCALATORS.GENERAL} />
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-4 text-left">CLT Ground Lease <InfoTooltip text={tooltips.groundLease} /></td>
                <td className="py-2.5 px-4">{formatCurrency(o1.groundLease)}</td>
                <td className="py-2.5 px-4">{formatCurrency(o2.groundLease)} <span className="text-[9px] text-muted-foreground ml-1">+{(ESCALATORS.GROUND_LEASE * 100).toFixed(1)}%/yr</span></td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-4 text-left">Investor Preferred Return <InfoTooltip text={tooltips.pikPref} /></td>
                <td className="py-2.5 px-4">
                  {inputs.prefCurrentPay
                    ? formatCurrency(tenant.prefInRent)
                    : <span className="text-muted-foreground">$0 <span className="text-[9px] ml-1">accrues to buyout ({formatCurrency(tenant.accruedPrefAtExit)})</span></span>}
                </td>
                <td className="py-2.5 px-4 text-muted-foreground">&mdash; <span className="text-[9px] ml-1">investors taken out</span></td>
              </tr>
              <tr className="bg-muted/10 font-medium">
                <td className="py-2.5 px-4 text-left text-foreground">Annual Revenue Required</td>
                <td className="py-2.5 px-4 text-foreground">{formatCurrency(tenant.phase1AnnualRevenueReq)}</td>
                <td className="py-2.5 px-4 text-foreground">{formatCurrency(tenant.phase2AnnualRevenueReq)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground flex justify-end items-center">
          <span>&divide; units &divide; 12 &divide; (1 &minus; vacancy)</span> <InfoTooltip text={tooltips.vacancyGrossUp} />
        </div>

        <div className="overflow-x-auto border-t border-border mt-4">
          <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-medium text-left">Note Mechanics <InfoTooltip text={tooltips.noteMechanics} /></th>
                <th className="py-3 px-4 font-medium">Payment</th>
                <th className="py-3 px-4 font-medium">Interest</th>
                <th className="py-3 px-4 font-medium">Principal</th>
                <th className="py-3 px-4 font-medium">Ending Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {model.amortSchedule.map((row) => (
                <tr key={row.year} className={`hover:bg-muted/30 transition-colors ${row.isBalloonYear ? 'bg-accent/10 border-accent/20' : ''}`}>
                  <td className="py-2.5 px-4 text-left">
                    Year {row.year}
                    {row.isBalloonYear && <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-accent/20 text-accent text-[8px] uppercase tracking-widest font-bold">Balloon Due</span>}
                  </td>
                  <td className="py-2.5 px-4">{formatCurrency(row.annualPayment)}</td>
                  <td className="py-2.5 px-4">{formatCurrency(row.interestPaid)}</td>
                  <td className="py-2.5 px-4">{formatCurrency(row.principalPaid)}</td>
                  <td className="py-2.5 px-4 text-foreground">{formatCurrency(row.endingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/10 flex flex-col md:flex-row md:items-center justify-between text-[11px]">
          {tenant.balloonBeyondTerm ? (
            <span className="text-muted-foreground italic">Note self-amortizes before the buyout year &mdash; no balloon due.</span>
          ) : (
            <span className="text-muted-foreground flex items-center">
              Phase 2 Refinance = Balloon + Investor Capital{tenant.accruedPrefAtExit > 0 ? ' + Accrued Pref' : ''}
              {tenant.grantsAtBuyout > 0 ? <span className="text-emerald-500 ml-1">&minus; {formatCurrency(tenant.grantsAtBuyout)} grants</span> : ''} <InfoTooltip text={tooltips.refinanceBurden} />
            </span>
          )}
          <span className="font-semibold tabular-nums mt-1 md:mt-0 text-foreground">{formatCurrency(tenant.phase2RefinanceBurden)}</span>
        </div>
      </div>
    </section>
  );
}

function OpexRow({ label, v1, v2, esc }: { label: string; v1: number; v2: number; esc: number }) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="py-2.5 px-4 text-left">{label}</td>
      <td className="py-2.5 px-4">{formatCurrency(v1)}</td>
      <td className="py-2.5 px-4">
        {formatCurrency(v2)} <span className="text-[9px] text-muted-foreground ml-1">+{(esc * 100).toFixed(1)}%/yr</span>
      </td>
    </tr>
  );
}
