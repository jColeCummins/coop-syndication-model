import React from 'react';
import { DealModel, EngineInputs, TOOLTIPS } from '@/utils/engine';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';

export function SellerSection({ model, tooltips }: { model: DealModel; tooltips: typeof TOOLTIPS }) {
  return (
    <section className="flex flex-col space-y-4">
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-medium tracking-wide text-foreground">Seller Reality &mdash; Cumulative Cash Flow Schedule</h2>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Summary */}
        <div className="w-full lg:w-80 flex flex-col space-y-4 flex-shrink-0">
          <div className="bg-card border border-border p-5 rounded-md space-y-4">
            <div className="space-y-2">
              <Row label="Note Principal" value={formatCurrency(model.seller.notePrincipal)} />
              <Row label="Down Payment" value={formatCurrency(model.seller.downPayment)} />
              <Row label={<span>Gross Profit % <InfoTooltip text={tooltips.basisAdjustment} /></span>} value={formatPercent(model.seller.grossProfitPct * 100)} />
            </div>
            <div className="pt-4 border-t border-border space-y-2">
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Year 0 Tax Breakdown</h3>
              <Row label={<span>Recapture Tax <InfoTooltip text={tooltips.recapture453i} /></span>} value={formatCurrency(model.seller.recaptureTax)} valueClass="text-destructive" />
              <Row label="Cap Gains on DP" value={formatCurrency(model.seller.dpCapGainsTax)} valueClass="text-destructive" />
              {model.seller.vacantLandTax > 0 && <Row label="Vacant Land Tax" value={formatCurrency(model.seller.vacantLandTax)} valueClass="text-destructive" />}
            </div>
            <div className="pt-4 border-t border-border">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold block mb-1">Year 0 Net Liquidity</span>
              <span className={`text-2xl font-light tabular-nums tracking-tight ${model.seller.year0NetLiquidity < 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                {formatCurrency(model.seller.year0NetLiquidity)}
              </span>
            </div>
          </div>
          {model.seller.isYear0Negative && (
            <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-md animate-pulse">
              <p className="text-[11px] font-semibold text-destructive uppercase tracking-wide">
                CRITICAL: Day-1 cash does not cover the Year 0 recapture liability.
              </p>
            </div>
          )}
        </div>

        {/* Right Table */}
        <div className="w-full bg-card border border-border rounded-md overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-medium text-left">Year</th>
                  <th className="py-3 px-4 font-medium">Gross Cash</th>
                  <th className="py-3 px-4 font-medium">Interest</th>
                  <th className="py-3 px-4 font-medium">Principal</th>
                  <th className="py-3 px-4 font-medium">Tax Paid</th>
                  <th className="py-3 px-4 font-medium text-center">Shield Status <InfoTooltip text={tooltips.agi170} /></th>
                  <th className="py-3 px-4 font-medium">Cum. Post-Tax</th>
                  <th className="py-3 px-4 font-medium">Rem. Princ.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {model.seller.schedule.map((row) => {
                  const isExpired = row.shieldStatus === 'EXPIRED';
                  return (
                    <tr key={row.year} className={`hover:bg-muted/30 transition-colors ${isExpired ? 'bg-destructive/5' : ''}`}>
                      <td className="py-3 px-4 text-left">{row.year === 0 ? '0 (Day 1)' : row.year}</td>
                      <td className="py-3 px-4">
                        {formatCurrency(row.grossCashReceived)}
                        {row.balloonInYear > 0 && <span className="block text-[9px] text-muted-foreground -mt-0.5">(incl. balloon)</span>}
                      </td>
                      <td className="py-3 px-4">{formatCurrency(row.interestReceived)}</td>
                      <td className="py-3 px-4">{formatCurrency(row.principalReceived)}</td>
                      <td className="py-3 px-4 text-destructive">{row.taxPaid > 0 ? formatCurrency(row.taxPaid) : '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <ShieldBadge status={row.shieldStatus} />
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">{formatCurrency(row.cumulativePostTax)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatCurrency(row.remainingPrincipal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(model.seller.shieldWasted > 0 || model.seller.cliffTaxPenalty > 0) && (
            <div className="p-3 bg-muted/20 border-t border-border flex flex-col sm:flex-row sm:items-center gap-4 text-[11px] text-muted-foreground">
              {model.seller.shieldWasted > 0 && (
                <span className="flex items-center space-x-1.5 text-accent">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                  <span>{formatCurrency(model.seller.shieldWasted)} of charitable carryforward expires unused.</span>
                </span>
              )}
              {model.seller.cliffTaxPenalty > 0 && (
                <span className="flex items-center space-x-1.5 text-destructive">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
                  <span>{formatCurrency(model.seller.cliffTaxPenalty)} avoidable tax paid on post-window interest.</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, valueClass = 'text-foreground' }: { label: React.ReactNode, value: React.ReactNode, valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

function ShieldBadge({ status }: { status: string }) {
  switch (status) {
    case 'SHIELDED': return <span className="px-1.5 py-0.5 rounded-sm border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-[9px] uppercase tracking-wider font-semibold">Shielded</span>;
    case 'PARTIAL': return <span className="px-1.5 py-0.5 rounded-sm border border-accent/20 bg-accent/10 text-accent text-[9px] uppercase tracking-wider font-semibold">Partial</span>;
    case 'EXHAUSTED': return <span className="px-1.5 py-0.5 rounded-sm border border-accent/20 bg-accent/10 text-accent text-[9px] uppercase tracking-wider font-semibold">Exhausted</span>;
    case 'EXPIRED': return <span className="px-1.5 py-0.5 rounded-sm border border-destructive/20 bg-destructive/10 text-destructive text-[9px] uppercase tracking-wider font-semibold">Expired</span>;
    default: return <span className="text-muted-foreground">—</span>;
  }
}
