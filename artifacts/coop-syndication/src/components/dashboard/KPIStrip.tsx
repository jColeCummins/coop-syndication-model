import React from 'react';
import { DealMetrics } from '@/utils/calculations';
import { formatCurrency, formatPercent } from '@/lib/utils';

export function KPIStrip({ model }: { model: DealMetrics }) {
  const hr = model.seller.headroom;
  const irr = model.inputs.investorHasREPS ? model.investor.irrWithReps : model.investor.irrWithoutReps;
  const npvAdv = model.seller.comparison.installmentPlusDonation.npvAfterTax
    - model.seller.comparison.cashPlusDonation.npvAfterTax;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard
        title="Seller Y1 Headroom"
        value={formatCurrency(hr)}
        valueClass={hr < 0 ? 'text-destructive' : 'text-emerald-500'}
        subtitle="DP − Y1 tax"
      />
      <KPICard
        title="Note vs Cash (NPV)"
        value={formatCurrency(npvAdv)}
        valueClass={npvAdv < 0 ? 'text-destructive' : 'text-emerald-500'}
        subtitle="given the donation"
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
      />
    </div>
  );
}

function KPICard({ title, value, subtitle, valueClass }: { title: string, value: string, subtitle?: string, valueClass?: string }) {
  return (
    <div className="bg-card border border-border p-4 rounded-md flex flex-col justify-center space-y-1">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{title}</span>
      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl font-light tabular-nums tracking-tight ${valueClass || 'text-foreground'}`}>{value}</span>
        {subtitle && <span className="text-[10px] text-muted-foreground tabular-nums font-medium">{subtitle}</span>}
      </div>
    </div>
  );
}
