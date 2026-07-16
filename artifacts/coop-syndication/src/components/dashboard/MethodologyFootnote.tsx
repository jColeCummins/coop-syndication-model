import React from 'react';

export function MethodologyFootnote() {
  return (
    <div className="pt-8 border-t border-border mt-8">
      <div className="text-[10px] text-muted-foreground leading-relaxed max-w-4xl space-y-3">
        <p className="uppercase tracking-widest font-semibold text-zinc-500 mb-1">Methodology & Assumptions</p>
        <p>
          § 453(i) recapture is recognized entirely in Year 0 (closing year), decoupled from cash received, at the federal unrecaptured § 1250 rate plus state/local rates. An anti-double-taxation basis adjustment is applied: recognized recapture increases basis for installment gross-profit purposes. 
        </p>
        <p>
          The § 170 charitable shield is modeled as a tracked carryforward balance, consumed by installment interest income, which strictly expires after the 5-year carryforward window. Unused balances are permanently lost. It is conservatively assumed the shield does NOT offset the Year 0 recapture spike due to AGI cap constraints on the seller.
        </p>
        <p>
          Depreciable basis is set equal to note principal, excluding land via the CLT donation structure. Phase 1 tenant rents are set to break-even cost recovery. Taxes and insurance are held flat. Management fees are inflated at 3% annually. A 4% vacancy/collection buffer is applied to rents.
        </p>
        <p className="font-medium text-zinc-400 mt-4">
          Illustrative model — not tax advice; validate with counsel & CPA.
        </p>
      </div>
    </div>
  );
}