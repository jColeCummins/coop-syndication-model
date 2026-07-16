import React from 'react';
import { DealMetrics, TOOLTIPS } from '@/utils/calculations';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';
import { AlertTriangle, ShieldOff } from 'lucide-react';

export function SellerSection({ model, tooltips }: { model: DealMetrics; tooltips: typeof TOOLTIPS }) {
  const { seller } = model;
  const underUtilized = seller.charitable.total > 0 && seller.charitable.utilizationPct < 90;

  return (
    <section className="flex flex-col space-y-4">
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-medium tracking-wide text-foreground">Seller &mdash; Installment Note &amp; &sect; 170 Shield</h2>
      </div>

      {seller.isTaxExceedsDP && (
        <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-md flex items-start space-x-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-destructive uppercase tracking-wide">
            CRITICAL: Down Payment does not clear Year 1 IRS &sect; 453(i) Recapture &amp; CapGains.
          </p>
        </div>
      )}

      {underUtilized && (
        <div className="bg-accent/10 border border-accent/30 p-3 rounded-md flex items-start space-x-2">
          <ShieldOff className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[11px] text-accent font-medium leading-relaxed">
            &sect; 170 UTILIZATION: only {formatPercent(seller.charitable.utilizationPct)} of the {formatCurrency(seller.charitable.total)} donation
            deduction is absorbed before the 5-year carryforward expires &mdash; {formatCurrency(seller.charitable.unused)} of deduction is lost.
            The 30%-of-AGI ceiling is the binding constraint; a larger balloon year inside the 6-year window, or donating across tax years, raises utilization.
            <InfoTooltip text={tooltips.charitable170} />
          </p>
        </div>
      )}

      {seller.depWasClamped && (
        <div className="bg-muted/40 border border-border p-3 rounded-md">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Accumulated depreciation input exceeds the depreciable (building) share of basis and was clamped to {formatCurrency(seller.clampedDepreciation)}.
            Land never depreciates and basis cannot fall below zero, so a gross profit ratio above 100% cannot occur.
          </p>
        </div>
      )}

      {/* Deal geometry */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-medium text-left">Contract Price <InfoTooltip text={tooltips.grossProfitPct} /></th>
                <th className="py-3 px-4 font-medium">Down Payment</th>
                <th className="py-3 px-4 font-medium">Basis Allocated to Sale</th>
                <th className="py-3 px-4 font-medium">Gross Profit Ratio</th>
                <th className="py-3 px-4 font-medium">Unrecaptured &sect; 1250 <InfoTooltip text={tooltips.recapture453i} /></th>
                <th className="py-3 px-4 font-medium">Year 1 Tax</th>
                <th className="py-3 px-4 font-medium">Headroom</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">{formatCurrency(seller.contractPrice)}</td>
                <td className="py-3 px-4 text-emerald-500">{formatCurrency(seller.downPayment)}</td>
                <td className="py-3 px-4">{formatCurrency(seller.soldAdjustedBasis)}</td>
                <td className="py-3 px-4">{formatPercent(seller.grossProfitRatio * 100)}</td>
                <td className="py-3 px-4">{formatCurrency(seller.unrecap1250Total)}</td>
                <td className="py-3 px-4 text-destructive">{formatCurrency(seller.year1Tax)}</td>
                <td className={`py-3 px-4 font-medium ${seller.headroom >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {formatCurrency(seller.headroom)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Annual schedule */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
          <span className="text-[11px] font-medium text-foreground">Annual Cash &amp; Tax Schedule</span>
          <span className="text-[10px] text-muted-foreground">
            25%-rate unrecaptured &sect; 1250 dollars recognized first (Reg. &sect; 1.453-12); &sect; 170 shield expires after Year {seller.charitable.firstZeroShieldYear - 1}
            <InfoTooltip text={tooltips.niit} />
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2.5 px-4 font-medium text-left">Year</th>
                <th className="py-2.5 px-4 font-medium">Gross Cash Received</th>
                <th className="py-2.5 px-4 font-medium">Interest</th>
                <th className="py-2.5 px-4 font-medium">Gain Recognized</th>
                <th className="py-2.5 px-4 font-medium">&sect; 170 Used <InfoTooltip text={tooltips.charitable170} /></th>
                <th className="py-2.5 px-4 font-medium">Total Tax</th>
                <th className="py-2.5 px-4 font-medium">Post-Tax Cash</th>
                <th className="py-2.5 px-4 font-medium">Cumulative in Pocket</th>
                <th className="py-2.5 px-4 font-medium">Note Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {seller.schedule.map((row) => (
                <tr
                  key={row.year}
                  className={`hover:bg-muted/30 transition-colors ${row.isBalloonYear ? 'bg-accent/10' : ''} ${!row.shieldActive && row.year > 1 ? 'text-muted-foreground' : ''}`}
                >
                  <td className="py-2.5 px-4 text-left">
                    {row.year}
                    {row.isBalloonYear && <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-accent/20 text-accent text-[8px] uppercase tracking-widest font-bold">Balloon</span>}
                    {!row.shieldActive && <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground text-[8px] uppercase tracking-widest font-bold">No Shield</span>}
                  </td>
                  <td className="py-2.5 px-4">{formatCurrency(row.grossCashReceived)}</td>
                  <td className="py-2.5 px-4">{formatCurrency(row.interestReceived)}</td>
                  <td className="py-2.5 px-4">{formatCurrency(row.gainRecognized)}</td>
                  <td className={`py-2.5 px-4 ${row.charitableDeductionUsed > 0 ? 'text-emerald-500' : ''}`}>{formatCurrency(row.charitableDeductionUsed)}</td>
                  <td className="py-2.5 px-4 text-destructive">{formatCurrency(row.totalTax)}</td>
                  <td className="py-2.5 px-4">{formatCurrency(row.postTaxCash)}</td>
                  <td className="py-2.5 px-4 font-medium text-foreground">{formatCurrency(row.cumulativePostTaxCash)}</td>
                  <td className="py-2.5 px-4">{formatCurrency(row.remainingNoteBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scenario comparison */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/20">
          <span className="text-[11px] font-medium text-foreground">Why Not Just Take Cash? &mdash; After-Tax Scenario Comparison</span>
          <InfoTooltip text={tooltips.ltcgBracket} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2.5 px-4 font-medium text-left">Scenario</th>
                <th className="py-2.5 px-4 font-medium">Total Tax</th>
                <th className="py-2.5 px-4 font-medium">Nominal After-Tax</th>
                <th className="py-2.5 px-4 font-medium">NPV After-Tax @ {formatPercent(model.inputs.discountRate)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[seller.comparison.straightCash, seller.comparison.cashPlusDonation, seller.comparison.installmentPlusDonation].map((sc, i) => (
                <tr key={sc.label} className={`hover:bg-muted/30 transition-colors ${i === 2 ? 'bg-muted/10 font-medium' : ''}`}>
                  <td className="py-2.5 px-4 text-left">{sc.label}{i === 2 && <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-500 text-[8px] uppercase tracking-widest font-bold">This Deal</span>}</td>
                  <td className="py-2.5 px-4 text-destructive">{formatCurrency(sc.totalTax)}</td>
                  <td className="py-2.5 px-4">{formatCurrency(sc.nominalAfterTax)}</td>
                  <td className="py-2.5 px-4 font-medium text-foreground">{formatCurrency(sc.npvAfterTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/10 text-[11px] leading-relaxed text-muted-foreground space-y-1">
          <p>
            The straight cash sale keeps the land ({formatCurrency(model.inputs.cltLandDonation)} of value) but concentrates the entire gain into one year &mdash;
            triggering the 20% bracket, full NIIT exposure, and all unrecaptured &sect; 1250 tax at once.
            Given the decision to donate the land to the CLT, the installment note adds{' '}
            <span className={seller.comparison.installmentPlusDonation.npvAfterTax >= seller.comparison.cashPlusDonation.npvAfterTax ? 'text-emerald-500' : 'text-destructive'}>
              {formatCurrency(seller.comparison.installmentPlusDonation.npvAfterTax - seller.comparison.cashPlusDonation.npvAfterTax)} NPV
            </span>{' '}
            and {formatCurrency(seller.comparison.installmentPlusDonation.nominalAfterTax - seller.comparison.cashPlusDonation.nominalAfterTax)} nominal
            versus taking the same bifurcated deal in cash &mdash; bracket smoothing, NIIT avoidance, {formatPercent(model.inputs.sellerInterestRate)} yield on carried principal,
            and full absorption of the &sect; 170 carryforward against installment income.
          </p>
        </div>
      </div>
    </section>
  );
}
