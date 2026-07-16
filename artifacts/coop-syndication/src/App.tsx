import React, { useState, useMemo } from 'react';
import { computeDealModel, DEFAULT_INPUTS, TOOLTIPS } from '@/utils/engine';
import { KPIStrip } from '@/components/dashboard/KPIStrip';
import { InputPanel } from '@/components/dashboard/InputPanel';
import { SellerSection } from '@/components/dashboard/SellerSection';
import { InvestorSection } from '@/components/dashboard/InvestorSection';
import { TenantSection } from '@/components/dashboard/TenantSection';
import { InsightsSection } from '@/components/dashboard/InsightsSection';
import { MethodologyFootnote } from '@/components/dashboard/MethodologyFootnote';
import { Building2 } from 'lucide-react';

export default function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);

  const model = useMemo(() => computeDealModel(inputs), [inputs]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-16 selection:bg-muted-foreground/20 selection:text-foreground">
      {/* Restrained Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border/50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold tracking-wide text-foreground">
                Co-op Conversion Underwriting Model
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Bifurcated CLT Donation + § 453 Installment Structure | Institutional Analysis
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col space-y-10">
        <KPIStrip model={model} inputs={inputs} />
        
        <InputPanel inputs={inputs} setInputs={setInputs} />

        <div className="space-y-12">
          <SellerSection model={model} tooltips={TOOLTIPS} />
          <InvestorSection model={model} tooltips={TOOLTIPS} />
          <TenantSection model={model} inputs={inputs} />
          <InsightsSection model={model} />
        </div>

        <MethodologyFootnote />
      </main>
    </div>
  );
}