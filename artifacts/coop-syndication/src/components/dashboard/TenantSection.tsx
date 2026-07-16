import React from 'react';
import { DealModel, EngineInputs } from '@/utils/engine';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

export function TenantSection({ model, inputs }: { model: DealModel; inputs: EngineInputs }) {
  const { tenant } = model;
  const isCliff = tenant.isRentCliff;
  const yearN = inputs.noteTermYears + 1;

  return (
    <section className="flex flex-col space-y-4">
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-medium tracking-wide text-foreground">Tenant Reality &mdash; The Rent Cliff</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Comparison Cards */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border p-6 rounded-md flex flex-col items-center justify-center space-y-2 text-center">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Phase 1 Rent</span>
            <span className="text-3xl font-light tabular-nums text-foreground">{formatCurrency(tenant.phase1MonthlyRent)}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Years 1–{inputs.noteTermYears}</span>
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
            <span className={`text-[10px] uppercase tracking-widest ${isCliff ? 'text-destructive/80' : 'text-emerald-500/60'}`}>Year {yearN}+</span>
          </div>
        </div>

        {/* Supporting Rows */}
        <div className="w-full lg:w-80 flex flex-col justify-center space-y-3 bg-card border border-border p-5 rounded-md flex-shrink-0">
          <div className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Rent Jump</span>
            <span className={`font-medium tabular-nums ${isCliff ? 'text-destructive' : 'text-emerald-500'}`}>
              {tenant.rentJumpPct > 0 ? '+' : ''}{formatPercent(tenant.rentJumpPct)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Y-{inputs.noteTermYears} Balloon Balance</span>
            <span className="font-medium tabular-nums text-foreground">{formatCurrency(tenant.balloonBalance)}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Phase 2 Refinance Burden</span>
            <span className="font-medium tabular-nums text-foreground">{formatCurrency(tenant.phase2RefinanceBurden)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Phase 2 Mgmt Fee (Inflated)</span>
            <span className="font-medium tabular-nums text-foreground">{formatCurrency(tenant.phase2MgmtFeePerUnit)}/mo</span>
          </div>
        </div>

      </div>
    </section>
  );
}