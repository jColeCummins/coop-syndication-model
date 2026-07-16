import React from 'react';
import { DealModel, TOOLTIPS } from '@/utils/engine';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';
import { AlertTriangle } from 'lucide-react';

export function SellerSection({ model, tooltips }: { model: DealModel; tooltips: typeof TOOLTIPS }) {
  return (
    <section className="flex flex-col space-y-4">
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-medium tracking-wide text-foreground">Seller Reality &mdash; The Year 1 Crucible</h2>
      </div>
      
      {model.seller.isTaxExceedsDP && (
        <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-md flex items-start space-x-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-destructive uppercase tracking-wide">
            CRITICAL: Down Payment does not clear Year 1 IRS § 453(i) Recapture & CapGains.
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-md overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-medium text-left">Note Principal</th>
                <th className="py-3 px-4 font-medium">Down Payment Received</th>
                <th className="py-3 px-4 font-medium">Adjusted Basis</th>
                <th className="py-3 px-4 font-medium">Gross Profit % <InfoTooltip text={tooltips.grossProfitPct} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">{formatCurrency(model.seller.notePrincipal)}</td>
                <td className="py-3 px-4 text-emerald-500">{formatCurrency(model.seller.downPaymentReceived)}</td>
                <td className={`py-3 px-4 ${model.seller.isBasisNegative ? 'text-destructive' : 'text-foreground'}`}>
                  {formatCurrency(model.seller.adjustedBasis)}
                  {model.seller.isBasisNegative && (
                    <span className="block text-[9px] -mt-0.5 opacity-80">Past depreciation exceeds transferred basis &mdash; gross profit ratio exceeds 100%.</span>
                  )}
                </td>
                <td className="py-3 px-4">{formatPercent(model.seller.grossProfitPct * 100)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-medium text-left">Recapture Tax <InfoTooltip text={tooltips.recapture453i} /></th>
                <th className="py-3 px-4 font-medium">CapGains on Down Payment <InfoTooltip text={tooltips.capGains} /></th>
                <th className="py-3 px-4 font-bold text-foreground">Total Year 1 Tax Liability</th>
                <th className="py-3 px-4 font-medium">Post-Tax Headroom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left text-destructive">{formatCurrency(model.seller.year1RecaptureTax)}</td>
                <td className="py-3 px-4 text-destructive">{formatCurrency(model.seller.year1CapGainsTax)}</td>
                <td className="py-3 px-4 font-bold text-destructive">{formatCurrency(model.seller.totalYear1Tax)}</td>
                <td className={`py-3 px-4 font-medium ${model.seller.headroom >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {formatCurrency(model.seller.headroom)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}