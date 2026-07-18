import React from 'react';
import { DealMetrics, TOOLTIPS } from '@/utils/calculations';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';

export function KPIStrip({ model }: { model: DealMetrics }) {
  const hr = model.seller.headroom;
  const irr = model.inputs.investorHasREPS ? model.investor.irrWithReps : model.investor.irrWithoutReps;
  const npvAdv = model.seller.comparison.installmentPlusDonation.npvAfterTax
    - model.seller.comparison.cashPlusDonation.npvAfterTax;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <KPICard
        title="Seller Y1 Headroom"
        value={formatCurrency(hr)}
        valueClass={hr < 0 ? 'text-destructive' : 'text-emerald-500'}
        subtitle="DP − Y1 tax"
      />
      <KPICard
        title="Note vs Cash Sale of Same Gift"
        value={formatCurrency(npvAdv)}
        valueClass={npvAdv < 0 ? 'text-destructive' : 'text-emerald-500'}
        subtitle="NPV, donation held fixed"
        tip={TOOLTIPS.noteVsCashKpi}
      />
      <KPICard
        title="Required Capital"
        value={formatCurrency(model.investor.capitalRequired)}
      />
      <KPICard
        title="Investor IRR"
        value={irr == null ? 'n/a' : formatPercent(irr * 100)}
        valueClass="text-emerald-500"
        subtitle={model.inputs.investorHasREPS ? 'with REPS' : 'passive'}
      />
      <KPICard
        title="Phase 1 Rent"
        value={formatCurrency(model.tenant.phase1MonthlyRent)}
        subtitle={`${model.tenant.rentDelta > 0 ? '+' : ''}${formatCurrency(model.tenant.rentDelta)} vs current`}
      />
      <KPICard
        title="Phase 2 Jump"
        value={`${model.tenant.rentJumpPct > 0 ? '+' : ''}${formatPercent(model.tenant.rentJumpPct)}`}
        valueClass={model.tenant.isRentCliff ? 'text-destructive' : 'text-emerald-500'}
        subtitle={`over ${model.inputs.balloonYear} yrs of cost inflation`}
      />
    </div>
  );
}

function KPICard({ title, value, subtitle, valueClass, tip }: { title: string, value: string, subtitle?: string, valueClass?: string, tip?: string }) {
  return (
    <div className="bg-card border border-border px-5 py-4 rounded-md flex flex-col justify-center gap-1.5">
      <span className="text-[13px] uppercase tracking-widest text-muted-foreground font-medium">
        {title}{tip && <InfoTooltip text={tip} />}
      </span>
      <span className={`text-[28px] leading-none font-light tabular-nums tracking-tight ${valueClass || 'text-foreground'}`}>{value}</span>
      {subtitle && <span className="text-[13px] text-muted-foreground tabular-nums font-medium">{subtitle}</span>}
    </div>
  );
}
