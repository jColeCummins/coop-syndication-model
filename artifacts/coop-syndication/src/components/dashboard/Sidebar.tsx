import React from 'react';
import { EngineInputs } from '@/utils/engine';
import { Slider } from '@/components/ui/slider';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SidebarProps {
  inputs: EngineInputs;
  setInputs: React.Dispatch<React.SetStateAction<EngineInputs>>;
}

export function Sidebar({ inputs, setInputs }: SidebarProps) {
  const update = (key: keyof EngineInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="w-full lg:w-[320px] flex-shrink-0 bg-[#0c0c0e] border-r border-border flex flex-col h-auto lg:h-screen lg:sticky lg:top-0 z-40">
      <button
        type="button"
        className="w-full px-6 py-4 flex items-center justify-between border-b border-border lg:hidden cursor-pointer bg-card text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="sidebar-parameters"
      >
        <span className="text-sm font-semibold tracking-wide uppercase text-foreground">Configure Parameters</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <div id="sidebar-parameters" className={`flex-col overflow-y-auto ${isOpen ? 'flex' : 'hidden lg:flex'} h-full p-6 space-y-8 scrollbar-thin`}>
        <div className="space-y-6">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Property & Tenant Baseline</h3>
          <SliderRow label="Units" value={inputs.units} formatter={(v) => v.toString()} min={10} max={50} step={1} onChange={(v) => update('units', v)} />
          <SliderRow label="Current Rent" value={inputs.currentRent} formatter={formatCurrency} min={400} max={1500} step={25} onChange={(v) => update('currentRent', v)} />
          <SliderRow label="Vacancy Rate" value={inputs.vacancyRate} formatter={formatPercent} min={0} max={15} step={1} onChange={(v) => update('vacancyRate', v)} />
          <SliderRow label="Property Taxes" value={inputs.propertyTaxes} formatter={formatCurrency} min={10000} max={50000} step={500} onChange={(v) => update('propertyTaxes', v)} />
          <SliderRow label="Insurance & Misc" value={inputs.annualInsuranceMisc} formatter={formatCurrency} min={5000} max={30000} step={500} onChange={(v) => update('annualInsuranceMisc', v)} />
          <SliderRow label="Mgmt Fee/Door" value={inputs.mgmtFeePerDoor} formatter={formatCurrency} min={0} max={150} step={5} onChange={(v) => update('mgmtFeePerDoor', v)} />
        </div>

        <div className="space-y-6">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Seller's Financial Reality</h3>
          <SliderRow label="Total FMV" value={inputs.totalFMV} formatter={formatCurrency} min={1000000} max={3000000} step={50000} onChange={(v) => update('totalFMV', v)} />
          <SliderRow label="Original Cost Basis (1993 Transferred)" value={inputs.originalCostBasis} formatter={formatCurrency} min={0} max={1000000} step={10000} onChange={(v) => update('originalCostBasis', v)} />
          <SliderRow label="Accumulated Depreciation" value={inputs.accumulatedDepreciation} formatter={formatCurrency} min={0} max={1000000} step={10000} onChange={(v) => update('accumulatedDepreciation', v)} />
          <SliderRow label="CLT Land Donation" value={inputs.cltLandDonation} formatter={formatCurrency} min={0} max={1000000} step={10000} onChange={(v) => update('cltLandDonation', v)} />
        </div>

        <div className="space-y-6">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">The Deal Structure</h3>
          <SliderRow label="Seller Down Payment" value={inputs.sellerDownPaymentPct} formatter={formatPercent} min={0} max={30} step={1} onChange={(v) => update('sellerDownPaymentPct', v)} />
          <SliderRow label="Seller Interest Rate" value={inputs.sellerInterestRate} formatter={formatPercent} min={3} max={10} step={0.25} onChange={(v) => update('sellerInterestRate', v)} />
          <SliderRow label="Note Term" value={inputs.noteTermYears} formatter={(v) => `${v}yr`} min={5} max={30} step={1} onChange={(v) => update('noteTermYears', v)} />
          <SliderRow label="Balloon Year" value={inputs.balloonYear} formatter={(v) => v.toString()} min={1} max={10} step={1} onChange={(v) => update('balloonYear', v)} />
          <SliderRow label="Phase 2 Commercial Rate" value={inputs.phase2CommercialRate} formatter={formatPercent} min={4} max={10} step={0.25} onChange={(v) => update('phase2CommercialRate', v)} />
        </div>

        <div className="space-y-6 pb-8">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Investor New CapEx Buckets</h3>
          <SliderRow label="Roof/Structural (27.5-yr)" value={inputs.capexRoofStruct} formatter={formatCurrency} min={0} max={200000} step={5000} onChange={(v) => update('capexRoofStruct', v)} />
          <SliderRow label="Parking/Land Imprv (15-yr)" value={inputs.capexParkingLand} formatter={formatCurrency} min={0} max={100000} step={5000} onChange={(v) => update('capexParkingLand', v)} />
          <SliderRow label="Appliances (5-yr)" value={inputs.capexAppliances} formatter={formatCurrency} min={0} max={100000} step={5000} onChange={(v) => update('capexAppliances', v)} />
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, value, formatter, min, max, step, onChange }: { label: string, value: number, formatter: (v: number) => string, min: number, max: number, step: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label className="text-[11px] text-muted-foreground leading-tight max-w-[70%]">{label}</label>
        <span className="text-xs tabular-nums text-foreground">{formatter(value)}</span>
      </div>
      <Slider aria-label={label} min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}