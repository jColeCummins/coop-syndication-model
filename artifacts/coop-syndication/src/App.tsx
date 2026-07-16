import React, { useState, useMemo } from 'react';
import { computeDealModel, DEFAULT_INPUTS, TOOLTIPS } from '@/utils/engine';
import { KPIStrip } from '@/components/dashboard/KPIStrip';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { SellerSection } from '@/components/dashboard/SellerSection';
import { InvestorSection } from '@/components/dashboard/InvestorSection';
import { TenantSection } from '@/components/dashboard/TenantSection';
import { MethodologyFootnote } from '@/components/dashboard/MethodologyFootnote';
import { Building2 } from 'lucide-react';

export default function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);

  const model = useMemo(() => computeDealModel(inputs), [inputs]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row font-sans selection:bg-muted-foreground/20 selection:text-foreground">
      
      {/* LEFT SIDEBAR */}
      <Sidebar inputs={inputs} setInputs={setInputs} />

      {/* MAIN VIEW */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Restrained Header */}
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-sm border-b border-border/50">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <h1 className="text-sm font-semibold tracking-wide text-foreground">
                  Limited-Equity Co-op Syndication
                </h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider hidden sm:block">
                  Bifurcated CLT Donation + § 453 Installment Structure | Institutional Underwriting
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col space-y-10">
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