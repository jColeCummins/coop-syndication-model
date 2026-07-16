import React from 'react';
import { DealModel, EngineInputs } from '@/utils/engine';
import { formatCurrency, formatPercent } from '@/lib/utils';

export function KPIStrip({ model, inputs }: { model: DealModel; inputs: EngineInputs }) {
  const y0Liq = model.seller.year0NetLiquidity;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <KPICard 
        title="Seller Y0 Net Liquidity" 
        value={formatCurrency(y0Liq)} 
        valueClass={y0Liq < 0 ? 'text-destructive' : 'text-emerald-500'}
      />
      <KPICard 
        title="Seller Total Post-Tax Cash" 
        value={formatCurrency(model.seller.totalPostTaxCash)} 
      />
      <KPICard 
        title="Investor IRR" 
        value={model.investor.irr !== null ? formatPercent(model.investor.irr * 100) : 'N/A'} 
        subtitle={`${model.investor.moic.toFixed(2)}x MOIC`}
      />
      <KPICard 
        title="Year 1 Depr Shield" 
        value={formatCurrency(model.investor.year1DepreciationShield)} 
      />
      <KPICard 
        title="Phase 2 Rent Jump" 
        value={formatPercent(model.tenant.rentJumpPct)} 
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
