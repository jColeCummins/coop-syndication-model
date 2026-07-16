import React from 'react';
import { EngineInputs, CONSTANTS } from '@/utils/engine';
import { Slider } from '@/components/ui/slider';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface InputPanelProps {
  inputs: EngineInputs;
  setInputs: React.Dispatch<React.SetStateAction<EngineInputs>>;
}

export function InputPanel({ inputs, setInputs }: InputPanelProps) {
  const [expanded, setExpanded] = React.useState(true);

  const update = (key: keyof EngineInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
      <div 
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-4">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground">Configuration Parameters</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {CONSTANTS.units} Units · {formatCurrency(CONSTANTS.propertyTaxes)} Taxes · {formatCurrency(CONSTANTS.insuranceMisc)} Ins · {CONSTANTS.amortYears}-yr Amort · {CONSTANTS.phase2AmortYears}-yr Refi
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>
      
      {expanded && (
        <div className="p-6 border-t border-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          <div className="space-y-5">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Deal Structure</h3>
            <SliderRow label="Total FMV" value={inputs.totalFMV} formatter={formatCurrency} min={1500000} max={3000000} step={50000} onChange={v => update('totalFMV', v)} />
            <SliderRow label="CLT Land Donation" value={inputs.cltLandDonation} formatter={formatCurrency} min={0} max={1000000} step={50000} onChange={v => update('cltLandDonation', v)} />
            <SliderRow label="Seller's Past Depr." value={inputs.accumulatedDepreciation} formatter={formatCurrency} min={0} max={1000000} step={10000} onChange={v => update('accumulatedDepreciation', v)} />
            <SliderRow label="Vacant Land Cash (Day 1)" value={inputs.vacantLandCash} formatter={formatCurrency} min={0} max={500000} step={25000} onChange={v => update('vacantLandCash', v)} />
            <SliderRow label="Seller Down Payment" value={inputs.sellerDownPaymentPct} formatter={formatPercent} min={0} max={30} step={1} onChange={v => update('sellerDownPaymentPct', v)} />
          </div>

          <div className="space-y-5">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Note & Financing</h3>
            <SliderRow label="Seller Interest Rate" value={inputs.sellerInterestRate} formatter={formatPercent} min={3} max={10} step={0.25} onChange={v => update('sellerInterestRate', v)} />
            <SliderRow label="Seller Note Term" value={inputs.noteTermYears} formatter={v => `${v} yrs`} min={5} max={15} step={1} onChange={v => update('noteTermYears', v)} />
            <SliderRow label="Phase 2 Interest Rate" value={inputs.phase2InterestRate} formatter={formatPercent} min={4} max={10} step={0.25} onChange={v => update('phase2InterestRate', v)} />
          </div>

          <div className="space-y-5">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Tax Profile</h3>
            <SliderRow label="Ohio State Tax" value={inputs.stateTaxRate} formatter={formatPercent} min={0} max={5} step={0.1} onChange={v => update('stateTaxRate', v)} />
            <SliderRow label="Local Tax (Yellow Springs)" value={inputs.localTaxRate} formatter={formatPercent} min={0} max={3} step={0.1} onChange={v => update('localTaxRate', v)} />
            <SliderRow label="Seller Ordinary Bracket" value={inputs.sellerOrdinaryBracket} formatter={formatPercent} min={10} max={37} step={1} onChange={v => update('sellerOrdinaryBracket', v)} />
            <SliderRow label="Investor Ordinary Bracket" value={inputs.investorOrdinaryBracket} formatter={formatPercent} min={24} max={37} step={1} onChange={v => update('investorOrdinaryBracket', v)} />
          </div>

          <div className="space-y-5">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Operations</h3>
            <SliderRow label="CapEx per Unit/mo" value={inputs.capexPerUnit} formatter={formatCurrency} min={0} max={300} step={10} onChange={v => update('capexPerUnit', v)} />
            <SliderRow label="Mgmt Fee/mo" value={inputs.mgmtFee} formatter={formatCurrency} min={0} max={100} step={5} onChange={v => update('mgmtFee', v)} />
          </div>

        </div>
      )}
    </div>
  );
}

function SliderRow({ label, value, formatter, min, max, step, onChange }: { label: string, value: number, formatter: (v: number) => string, min: number, max: number, step: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <label className="text-[11px] text-muted-foreground">{label}</label>
        <span className="text-xs tabular-nums text-foreground">{formatter(value)}</span>
      </div>
      <Slider aria-label={label} min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}