import React from 'react';
import { DealModel, TOOLTIPS } from '@/utils/engine';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';
import { AlertTriangle } from 'lucide-react';

export function InvestorSection({ model, tooltips }: { model: DealModel; tooltips: typeof TOOLTIPS }) {
  return (
    <section className="flex flex-col space-y-4">
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-medium tracking-wide text-foreground">Investor Reality &mdash; Net Cash In / Out</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Summary */}
        <div className="w-full lg:w-80 flex flex-col space-y-4 flex-shrink-0">
          <div className="bg-card border border-border p-5 rounded-md space-y-4">
            <div className="space-y-2">
              <Row label={<span>Capital Injection <InfoTooltip text={tooltips.reserveMechanics} /></span>} value={formatCurrency(model.investor.requiredCapitalInjection)} />
              <Row label={<span>Y1 Depr. Shield <InfoTooltip text={tooltips.macs168k} /></span>} value={formatCurrency(model.investor.year1DepreciationShield)} valueClass="text-emerald-500" />
            </div>
            <div className="pt-4 border-t border-border space-y-2">
              <Row label="Y1 Tax Savings" value={formatCurrency(model.investor.year1TaxSavings)} valueClass="text-emerald-500" />
              <Row label="Total Tax Savings" value={formatCurrency(model.investor.totalTaxSavings)} valueClass="text-emerald-500" />
            </div>
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold block mb-1">IRR</span>
                <span className="text-xl font-light tabular-nums tracking-tight text-foreground">
                  {model.investor.irr !== null ? formatPercent(model.investor.irr * 100) : 'N/A'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold block mb-1">MOIC</span>
                <span className="text-xl font-light tabular-nums tracking-tight text-foreground">
                  {model.investor.moic.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>

          <div className="bg-accent/10 border border-accent/20 p-3 rounded-md flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-accent font-medium leading-relaxed">
              Assumes Section 469(c)(7) <InfoTooltip text={tooltips.reps469c7} /> REPS. Passive investors cannot offset active W-2 income.
            </p>
          </div>
        </div>

        {/* Right Table */}
        <div className="w-full bg-card border border-border rounded-md overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-medium text-left">Year</th>
                  <th className="py-3 px-4 font-medium">Capital Injected</th>
                  <th className="py-3 px-4 font-medium">Op. Cash Flow <InfoTooltip text={tooltips.breakEvenCoop} /></th>
                  <th className="py-3 px-4 font-medium">Depr. Tax Savings</th>
                  <th className="py-3 px-4 font-medium">Net Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {model.investor.schedule.map((row, idx, arr) => {
                  const isFinal = idx === arr.length - 1;
                  const isReturn = row.capitalInjected < 0;
                  return (
                    <tr key={row.year} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-left">{row.year === 0 ? '0 (Day 1)' : row.year}</td>
                      <td className="py-3 px-4">
                        {isReturn ? (
                          <span className="text-emerald-500">
                            {formatCurrency(row.capitalInjected)}
                            <span className="block text-[9px] -mt-0.5 uppercase tracking-wider">Return of Capital</span>
                          </span>
                        ) : (
                          <span className="text-foreground">{formatCurrency(row.capitalInjected)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">—</td>
                      <td className="py-3 px-4 text-emerald-500">{row.depreciationTaxSavings > 0 ? formatCurrency(row.depreciationTaxSavings) : '—'}</td>
                      <td className={`py-3 px-4 font-medium ${row.netCapitalPosition >= 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                        {formatCurrency(row.netCapitalPosition)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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