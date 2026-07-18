import React from 'react';
import { DealMetrics, TOOLTIPS, DEAL_CONSTANTS } from '@/utils/calculations';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';
import { AlertTriangle } from 'lucide-react';

const fmtIrr = (x: number | null) => (x == null ? 'n/a' : formatPercent(x * 100));

export function InvestorSection({ model, tooltips }: { model: DealMetrics; tooltips: typeof TOOLTIPS }) {
  const { investor, inputs } = model;
  return (
    <section className="flex flex-col space-y-4">
      <div className="border-b border-border pb-2 flex justify-between items-end">
        <h2 className="text-[17px] font-medium tracking-wide text-foreground">Investor &mdash; Capital, Depreciation &amp; Return Timeline</h2>
        <span className="text-[14px] font-semibold uppercase tracking-wider text-muted-foreground">
          Required Capital: <span className="text-foreground">{formatCurrency(investor.capitalRequired)}</span>
          {investor.grantsApplied > 0 && (
            <span className="ml-1 normal-case tracking-normal text-emerald-500">
              (after {formatCurrency(investor.grantsApplied)} grants <InfoTooltip text={tooltips.grants} />)
            </span>
          )}
        </span>
      </div>

      {/* Return metrics strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric
          title={`IRR ${inputs.investorHasREPS ? '(REPS)' : '(REPS, ref.)'}`}
          value={fmtIrr(investor.irrWithReps)}
          active={inputs.investorHasREPS}
        />
        <Metric
          title={`IRR ${!inputs.investorHasREPS ? '(Passive)' : '(Passive, ref.)'}`}
          value={fmtIrr(investor.irrWithoutReps)}
          active={!inputs.investorHasREPS}
        />
        <Metric title="Equity Multiple" value={investor.equityMultiple.toFixed(2) + 'x'} active />
        <Metric title="Payback Year" value={investor.paybackYear == null ? 'n/a' : `Year ${investor.paybackYear}`} active />
      </div>

      {/* Plain-English ROI story — reads the "quiet years" as intended */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
          <span className="text-[14px] font-medium text-foreground">The Investor Deal in Plain Terms <InfoTooltip text={tooltips.roiStory} /></span>
          <span className="text-[13px] text-muted-foreground">{inputs.investorHasREPS ? 'REPS' : 'passive'} · pref {inputs.prefCurrentPay ? 'current-pay' : 'accrues to exit'}</span>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-[14px] tabular-nums">
          <RoiStat label="Capital In" value={formatCurrency(investor.capitalRequired)} sub="at closing" />
          <RoiStat label="Year-1 Tax Refund" value={formatCurrency(investor.year1TaxRefund)} sub="shelters other income" emerald />
          <RoiStat label="Effective Capital at Risk" value={formatCurrency(investor.effectiveCapitalAtRisk)} sub="after the refund" />
          <RoiStat label="Back at Exit + Total" value={formatCurrency(investor.totalReturned)} sub={`net ${formatCurrency(investor.netProfit)} · ${formatPercent(investor.simpleRoi * 100)} total`} emerald={investor.netProfit >= 0} />
        </div>
        <div className="px-4 pb-3 text-[14px] text-muted-foreground leading-relaxed">
          Reads like a tax-advantaged 5-year note: ~{formatPercent((investor.capitalRequired > 0 ? investor.year1TaxRefund / investor.capitalRequired : 0) * 100)} of capital returns in Year 1 as a tax refund, the middle years are intentionally quiet{!inputs.prefCurrentPay ? ' (the preferred return is accruing, not paid)' : ''}, and capital{investor.accruedPrefAtExit > 0 ? ' plus accrued preferred' : ''} comes back at the Year-{investor.exit.year} takeout. The {formatPercent((investor.irrWithReps ?? 0) * 100)} REPS IRR captures all of it — the quiet years are not idle, the work was front-loaded into Year 1.
        </div>
      </div>

      <div className="bg-card border border-border rounded-md overflow-hidden flex flex-col">
        {/* Depreciation build-up */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[14px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3.5 px-4 font-medium text-left">Year 1 Depreciation Build-Up <InfoTooltip text={tooltips.bonus168k} /></th>
                <th className="py-3.5 px-4 font-medium">Class</th>
                <th className="py-3.5 px-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">Cost-Seg {Math.round(DEAL_CONSTANTS.COST_SEG_SHORT_LIFE_PCT * 100)}% of Acquired Improvements <InfoTooltip text={tooltips.costSegBase} /></td>
                <td className="py-3 px-4">5/15-yr, 100% bonus</td>
                <td className="py-3 px-4 text-emerald-500">{formatCurrency(investor.year1Bonus.costSeg)}</td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">Parking/Land Improvements CapEx</td>
                <td className="py-3 px-4">15-yr, 100% bonus</td>
                <td className="py-3 px-4 text-emerald-500">{formatCurrency(investor.year1Bonus.parkingLand)}</td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">Appliances CapEx</td>
                <td className="py-3 px-4">5-yr, 100% bonus</td>
                <td className="py-3 px-4 text-emerald-500">{formatCurrency(investor.year1Bonus.appliances)}</td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">Shell + Roof/Structural CapEx (annual, all years)</td>
                <td className="py-3 px-4">27.5-yr SL, no bonus</td>
                <td className="py-3 px-4">{formatCurrency(investor.annualSL)}</td>
              </tr>
              <tr className="bg-muted/10 font-bold">
                <td className="py-3 px-4 text-left text-foreground">Year 1 Total Deduction</td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4 text-emerald-500 text-[17px]">{formatCurrency(investor.year1Bonus.total + investor.annualSL)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Annual flow table */}
        <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between">
          <span className="text-[14px] font-medium text-foreground">
            Cash Flow &amp; Tax Timeline &mdash; {inputs.investorHasREPS ? 'REPS Active (losses offset W-2 annually, § 199A on profit years)' : 'Passive (losses suspend until takeout)'}
            {!inputs.prefCurrentPay && ' — pref accrues to exit'}
            <InfoTooltip text={tooltips.reps469c7} />
          </span>
          <span className="text-[13px] text-muted-foreground">Exit at Year {investor.exit.year} takeout <InfoTooltip text={tooltips.exitTax} /></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[14px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3.5 px-4 font-medium text-left">Year</th>
                <th className="py-3.5 px-4 font-medium">Capital Injected</th>
                <th className="py-3.5 px-4 font-medium">Operating Cash Flow</th>
                <th className="py-3.5 px-4 font-medium">Depreciation</th>
                <th className="py-3.5 px-4 font-medium">Fed Tax Cash</th>
                <th className="py-3.5 px-4 font-medium">OH / Local</th>
                <th className="py-3.5 px-4 font-medium">Exit Proceeds</th>
                <th className="py-3.5 px-4 font-medium">Net Flow</th>
                <th className="py-3.5 px-4 font-medium">Net Capital Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {investor.schedule.map((row) => (
                <tr key={row.year} className={`hover:bg-muted/30 transition-colors ${row.isExitYear ? 'bg-accent/10' : ''}`}>
                  <td className="py-3 px-4 text-left">
                    {row.year}
                    {row.isExitYear && <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-accent/20 text-accent text-[8px] uppercase tracking-widest font-bold">Takeout</span>}
                  </td>
                  <td className="py-3 px-4">{row.capitalInjected > 0 ? formatCurrency(-row.capitalInjected) : '—'}</td>
                  <td className="py-3 px-4">{formatCurrency(row.operatingCashFlow)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{formatCurrency(row.depreciation)}</td>
                  <td className={`py-3 px-4 ${row.federalTaxCash > 0 ? 'text-emerald-500' : ''}`}>{formatCurrency(row.federalTaxCash)}</td>
                  <td className="py-3 px-4">{formatCurrency(row.stateTaxCash - row.localTax)}</td>
                  <td className="py-3 px-4">{row.exitProceeds !== 0 ? formatCurrency(row.exitProceeds) : '—'}</td>
                  <td className="py-3.5 px-4 font-medium">{formatCurrency(row.netCashFlow)}</td>
                  <td className={`py-3.5 px-4 font-medium ${row.cumulativePosition >= 0 ? 'text-emerald-500' : 'text-foreground'}`}>{formatCurrency(row.cumulativePosition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Exit economics */}
        <div className="px-4 py-3 border-t border-border bg-muted/10 grid grid-cols-2 md:grid-cols-5 gap-3 text-[14px] tabular-nums">
          <ExitStat label="Takeout Price (Formula)" value={formatCurrency(investor.exit.salePrice)} />
          <ExitStat label="Basis at Exit" value={formatCurrency(investor.exit.adjustedBasisAtExit)} />
          <ExitStat label="Gain on Exit" value={formatCurrency(investor.exit.gain)} />
          <ExitStat label="Exit Tax" value={formatCurrency(investor.exit.exitTax)} negative />
          <ExitStat label="Net to Investors" value={formatCurrency(investor.exit.netToInvestors)} />
        </div>
        <div className="px-4 pb-3 bg-muted/10 text-[13px] text-muted-foreground tabular-nums">
          Exit gain split <InfoTooltip text={tooltips.exitAllocation} />: {formatCurrency(investor.exit.exitOrdinary)} ordinary ({formatPercent(inputs.exitShortLifeAllocationPct)} short-life allocation)
          &middot; {formatCurrency(investor.exit.exit25)} @ 25% &middot; {formatCurrency(investor.exit.exit15)} @ 15% &middot; plus state on the full gain
          {investor.accruedPrefAtExit > 0 && <> &middot; accrued pref {formatCurrency(investor.accruedPrefAtExit)} paid at exit (ordinary income)</>}
        </div>

        {/* Optimal-fit guidance */}
        <div className="p-4 bg-accent/5 border-t border-border space-y-1.5">
          <p className="text-[13px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1.5 text-accent" /> When This Investment Is Optimal
          </p>
          {investor.optimalWhen.map((line, i) => (
            <p key={i} className="text-[14px] text-muted-foreground leading-relaxed">&bull; {line}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ title, value, active }: { title: string; value: string; active?: boolean }) {
  return (
    <div className={`border p-4 rounded-md flex flex-col justify-center space-y-1 ${active ? 'bg-card border-border' : 'bg-card/40 border-border/50'}`}>
      <span className="text-[13px] uppercase tracking-widest text-muted-foreground font-medium">{title}</span>
      <span className={`text-2xl font-light tabular-nums tracking-tight ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{value}</span>
    </div>
  );
}

function ExitStat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[12px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`font-medium ${negative ? 'text-destructive' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function RoiStat({ label, value, sub, emerald }: { label: string; value: string; sub?: string; emerald?: boolean }) {
  return (
    <div className="flex flex-col space-y-0.5">
      <span className="text-[12px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`text-[19px] font-light tabular-nums ${emerald ? 'text-emerald-500' : 'text-foreground'}`}>{value}</span>
      {sub && <span className="text-[12px] text-muted-foreground">{sub}</span>}
    </div>
  );
}
