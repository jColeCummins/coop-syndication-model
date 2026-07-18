import React, { useReducer, useMemo } from 'react';
import { calculateDealMetrics, DEFAULT_INPUTS, DealInputs, TOOLTIPS } from '@/utils/calculations';
import { KPIStrip } from '@/components/dashboard/KPIStrip';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { SellerSection } from '@/components/dashboard/SellerSection';
import { InvestorSection } from '@/components/dashboard/InvestorSection';
import { TenantSection } from '@/components/dashboard/TenantSection';
import { MethodologyFootnote } from '@/components/dashboard/MethodologyFootnote';
import { Building2 } from 'lucide-react';

export type InputAction =
  | { type: 'set'; key: keyof DealInputs; value: DealInputs[keyof DealInputs] }
  | { type: 'reset' };

function inputsReducer(state: DealInputs, action: InputAction): DealInputs {
  switch (action.type) {
    case 'set':
      return { ...state, [action.key]: action.value };
    case 'reset':
      return DEFAULT_INPUTS;
  }
}

export default function App() {
  const [inputs, dispatch] = useReducer(inputsReducer, DEFAULT_INPUTS);

  const model = useMemo(() => calculateDealMetrics(inputs), [inputs]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row font-sans selection:bg-muted-foreground/20 selection:text-foreground">
      {/* LEFT SIDEBAR */}
      <Sidebar inputs={inputs} dispatch={dispatch} />

      {/* MAIN VIEW */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-sm border-b border-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="w-6 h-6 text-accent" />
              <div className="flex flex-col">
                <h1 className="text-[22px] font-semibold tracking-tight text-foreground leading-tight">
                  Limited-Equity Co-op Conversion
                </h1>
                <p className="text-[13px] text-muted-foreground uppercase tracking-wider hidden sm:block">
                  CLT Land Donation (&sect; 170) + Seller Installment Note (&sect; 453) | Underwriting Model V5.4
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col space-y-10">
          <KPIStrip model={model} />

          <div className="space-y-12">
            <SellerSection model={model} tooltips={TOOLTIPS} />
            <InvestorSection model={model} tooltips={TOOLTIPS} />
            <TenantSection model={model} tooltips={TOOLTIPS} />
          </div>

          <MethodologyFootnote />
        </main>
      </div>
    </div>
  );
}
