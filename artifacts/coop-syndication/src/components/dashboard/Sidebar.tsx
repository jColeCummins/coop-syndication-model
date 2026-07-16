import React from 'react';
import { DealInputs } from '@/utils/calculations';
import { InputAction } from '@/App';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SidebarProps {
  inputs: DealInputs;
  dispatch: React.Dispatch<InputAction>;
}

// Plain-language labels and tooltips per docs/UX-CONFIG-SPEC-v5.2.md §2.
export function Sidebar({ inputs, dispatch }: SidebarProps) {
  const update = (key: keyof DealInputs, value: DealInputs[keyof DealInputs]) =>
    dispatch({ type: 'set', key, value });

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
        <Group title="Property & Operations">
          <SliderRow label="Number of apartments" tip="Total rentable homes in the deal, including any standalone house." value={inputs.units} formatter={(v) => v.toString()} min={10} max={50} step={1} onChange={(v) => update('units', v)} />
          <SliderRow label="Current average rent" tip="What tenants pay per month today. The tool compares this to the rent the co-op would actually need to charge." value={inputs.currentRent} formatter={formatCurrency} min={400} max={1500} step={25} onChange={(v) => update('currentRent', v)} />
          <SliderRow label="Vacancy allowance" tip="The share of rent you expect to lose to empty units and unpaid rent. Even full buildings budget 3–5%." value={inputs.vacancyRate} formatter={formatPercent} min={0} max={15} step={1} onChange={(v) => update('vacancyRate', v)} />
          <SliderRow label="Property taxes (per year)" tip="The annual real-estate tax bill. After a sale, the county auditor usually resets the value to the sale price, so the new owner's bill may be higher. Escalates 3%/yr in the model." value={inputs.propertyTaxes} formatter={formatCurrency} min={10000} max={50000} step={500} onChange={(v) => update('propertyTaxes', v)} />
          <SliderRow label="Property insurance (per year)" tip="The building's insurance premium. Insurance for older apartment buildings has risen sharply — nationally about $780/unit in 2024 and climbing ~8% per year, which the model applies." value={inputs.annualInsuranceMisc} formatter={formatCurrency} min={5000} max={40000} step={500} onChange={(v) => update('annualInsuranceMisc', v)} />
          <SliderRow label="Management fee (per unit/mo)" tip="What you pay a property manager for rent collection, leasing, and coordination. Grows 3% per year; a co-op that self-manages later can reduce or remove it." value={inputs.mgmtFeePerDoor} formatter={formatCurrency} min={0} max={150} step={5} onChange={(v) => update('mgmtFeePerDoor', v)} />
          <SliderRow label="Repairs & maintenance (per unit/yr)" tip="Routine upkeep — plumbing calls, paint, appliances. Older buildings need bigger budgets; $1,200/unit is a realistic floor for a 1960s property." value={inputs.repairsMaintPerUnit} formatter={formatCurrency} min={0} max={2500} step={50} onChange={(v) => update('repairsMaintPerUnit', v)} />
          <SliderRow label="Owner-paid utilities (per unit/yr)" tip="Water, sewer, trash, and shared-area electric the owner pays. In Yellow Springs, water + sewer alone runs about $870/unit/year — the highest rates in the region — and escalates 8%/yr." value={inputs.utilitiesPerUnit} formatter={formatCurrency} min={0} max={2000} step={50} onChange={(v) => update('utilitiesPerUnit', v)} />
          <SliderRow label="Replacement savings (per unit/yr)" tip="Money set aside every year for big-ticket items — roofs, furnaces, parking — so the co-op never faces a surprise special assessment." value={inputs.reservesPerUnit} formatter={formatCurrency} min={0} max={1000} step={25} onChange={(v) => update('reservesPerUnit', v)} />
        </Group>

        <Group title="Seller Profile">
          <SliderRow label="Property value today" tip="What the whole property (land + buildings) would sell for as-is on the open market. Default $1.25M reflects $700 in-place rents, deferred maintenance, and a ~7% Class-C cap rate; a stabilized, renovated value would be higher." value={inputs.totalFMV} formatter={formatCurrency} min={750000} max={3000000} step={25000} onChange={(v) => update('totalFMV', v)} />
          <SliderRow label="Seller's cost basis" tip="What the seller 'paid' in the eyes of the IRS. $475k assumes the 1993 transfer was a purchase or inheritance; if it was a GIFT, the original 1968 cost (~$250k) carries over. Pull the exact figure from the seller's Form 4562 / Schedule E." value={inputs.originalCostBasis} formatter={formatCurrency} min={0} max={1000000} step={5000} onChange={(v) => update('originalCostBasis', v)} />
          <SliderRow label="Depreciation already claimed" tip="Total depreciation taken over the years. A building held since 1993 is fully written off; the IRS taxes this amount at up to 25% as sale payments arrive." value={inputs.accumulatedDepreciation} formatter={formatCurrency} min={0} max={1000000} step={5000} onChange={(v) => update('accumulatedDepreciation', v)} />
          <SliderRow label="Land gift to the land trust" tip="The appraised value of the land donated to the Community Land Trust. A genuine gift — the deduction softens it but never fully pays for it. The dashboard shows the largest gift the seller can fully deduct before the six-year window closes." value={inputs.cltLandDonation} formatter={formatCurrency} min={0} max={1000000} step={10000} onChange={(v) => update('cltLandDonation', v)} />
          <SliderRow label="Seller's other yearly income" tip="Income apart from this deal (pension, wages, etc.). It determines tax brackets and how much of the donation deduction can be used each year." value={inputs.sellerOtherIncome} formatter={formatCurrency} min={0} max={300000} step={5000} onChange={(v) => update('sellerOtherIncome', v)} />
          <SliderRow label="Seller's income-tax bracket" tip="The seller's federal marginal rate on ordinary income like note interest." value={inputs.sellerOrdinaryRate} formatter={formatPercent} min={10} max={37} step={1} onChange={(v) => update('sellerOrdinaryRate', v)} />
          <SwitchRow
            id="filing-status"
            label="Married filing jointly"
            tip="Filing status sets where the 20% capital-gains rate (~$614k MFJ / ~$533k single) and the 3.8% investment surtax ($250k / $200k) kick in."
            checked={inputs.sellerFilingStatus === 'mfj'}
            onChange={(v) => update('sellerFilingStatus', v ? 'mfj' : 'single')}
          />
          <SliderRow label="Time-value discount rate" tip="Used to compare money received today against money received over 20 years. Higher = you value future dollars less." value={inputs.discountRate} formatter={formatPercent} min={0} max={10} step={0.5} onChange={(v) => update('discountRate', v)} />
        </Group>

        <Group title="Deal Structure">
          <SliderRow label="Down payment to seller" tip="Cash to the seller at closing, as a % of the purchase price. Must comfortably cover the seller's first-year tax bill — the dashboard warns if it doesn't." value={inputs.sellerDownPaymentPct} formatter={formatPercent} min={0} max={30} step={1} onChange={(v) => update('sellerDownPaymentPct', v)} />
          <SliderRow label="Seller loan interest rate" tip="The rate on the loan the seller carries. Must be at least the IRS minimum (published monthly); typically below a bank rate — that gap is part of the deal's affordability." value={inputs.sellerInterestRate} formatter={formatPercent} min={3} max={10} step={0.25} onChange={(v) => update('sellerInterestRate', v)} />
          <SliderRow label="Loan payoff schedule (years)" tip="Payments are sized as if the loan ran this long, even though it's paid off early at the buyout. Longer = lower payments = lower rents, but a bigger final payoff." value={inputs.noteTermYears} formatter={(v) => `${v}yr`} min={5} max={30} step={1} onChange={(v) => update('noteTermYears', v)} />
          <SliderRow label="Buyout year" tip="The year the co-op refinances with a bank, pays the seller the remaining balance, and returns the investors' money. Also drives how fast the seller's donation deduction is absorbed." value={inputs.balloonYear} formatter={(v) => v.toString()} min={1} max={10} step={1} onChange={(v) => update('balloonYear', v)} />
          <SliderRow label="Bank mortgage rate at buyout" tip="The rate the co-op expects on the bank loan that pays off the seller and investors. The co-op's ability to qualify for this loan is the deal's most important risk." value={inputs.phase2CommercialRate} formatter={formatPercent} min={4} max={10} step={0.25} onChange={(v) => update('phase2CommercialRate', v)} />
          <SliderRow label="State income tax" tip="Ohio's flat rate (2.75%, 2026). Applies to note interest and gains unless the business-income deduction below covers them." value={inputs.stateTaxRate} formatter={formatPercent} min={0} max={5} step={0.25} onChange={(v) => update('stateTaxRate', v)} />
          <SliderRow label="City income tax" tip="Yellow Springs charges 1.5%, but Ohio law bars cities from taxing interest or capital gains — it only touches positive rental profits, which depreciation zeroes out in most years." value={inputs.localTaxRate} formatter={formatPercent} min={0} max={3} step={0.25} onChange={(v) => update('localTaxRate', v)} />
          <SwitchRow
            id="ohio-bid"
            label="Ohio business-income deduction"
            tip="Ohio's Business Income Deduction: first $250k/yr of business income state-tax-free, 3% flat above — roughly halves the seller's Ohio tax. Needs the CPA's sign-off on characterization, hence the toggle."
            checked={inputs.ohioBIDConfirmed}
            onChange={(v) => update('ohioBIDConfirmed', v)}
          />
        </Group>

        <Group title="Investors & Renovation" last>
          <SliderRow label="Investor preferred return" tip="The fixed yearly return investors earn on their money. They get this plus their money back at buyout — and no share of appreciation (the ground lease locks that in for the community)." value={inputs.investorPrefReturn} formatter={formatPercent} min={0} max={12} step={0.5} onChange={(v) => update('investorPrefReturn', v)} />
          <SwitchRow
            id="pref-current"
            label="Pay investor return from rents"
            tip="ON: investors are paid each year from rents. OFF: the return accrues and is paid at the buyout instead — Phase-1 rents drop by the pref amount and the buyout loan grows by the accrued total. The tenant-affordability relief valve."
            checked={inputs.prefCurrentPay}
            onChange={(v) => update('prefCurrentPay', v)}
          />
          <SliderRow label="Investor tax bracket" tip="Investors' federal marginal rate. Higher-bracket investors get more value from the deal's depreciation deductions." value={inputs.investorMarginalRate} formatter={formatPercent} min={10} max={37} step={1} onChange={(v) => update('investorMarginalRate', v)} />
          <SwitchRow
            id="reps-switch"
            label="Real-estate professional investors"
            tip="ON: investors (or spouses) qualify as real-estate professionals and use the paper losses against regular income each year. OFF: losses are locked up until buyout. Worth about two points of IRR."
            checked={inputs.investorHasREPS}
            onChange={(v) => update('investorHasREPS', v)}
          />
          <SliderRow label="Exit value on short-life items" tip="At buyout, how much of the price is attributed to appliances/site work (taxed at high ordinary rates) vs. the building (25%/15%). Five-year-old appliances justify a low number — negotiate this schedule; it's worth 1.5–2.5 points of IRR." value={inputs.exitShortLifeAllocationPct} formatter={formatPercent} min={0} max={100} step={5} onChange={(v) => update('exitShortLifeAllocationPct', v)} />
          <SliderRow label="Renovation: roof & structure" tip="Building-shell work, deducted slowly over 27.5 years — no first-year write-off. Renovation dollars earn the preferred return but dilute headline IRR; they're for building health, not returns." value={inputs.capexRoofStruct} formatter={formatCurrency} min={0} max={200000} step={5000} onChange={(v) => update('capexRoofStruct', v)} />
          <SliderRow label="Renovation: parking & site" tip="Parking, walkways, landscaping. Qualifies for the 100% first-year write-off." value={inputs.capexParkingLand} formatter={formatCurrency} min={0} max={100000} step={5000} onChange={(v) => update('capexParkingLand', v)} />
          <SliderRow label="Renovation: appliances & interiors" tip="Appliances, flooring, fixtures — including water-saving fixtures, which at Yellow Springs water rates are the best-returning dollars in the whole budget. 100% first-year write-off." value={inputs.capexAppliances} formatter={formatCurrency} min={0} max={100000} step={5000} onChange={(v) => update('capexAppliances', v)} />
        </Group>
      </div>
    </div>
  );
}

function Group({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`space-y-6 ${last ? 'pb-8' : ''}`}>
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">{title}</h3>
      {children}
    </div>
  );
}

function SliderRow({ label, tip, value, formatter, min, max, step, onChange }: { label: string, tip?: string, value: number, formatter: (v: number) => string, min: number, max: number, step: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label className="text-[11px] text-muted-foreground leading-tight max-w-[70%]">
          {label}
          {tip && <InfoTooltip text={tip} />}
        </label>
        <span className="text-xs tabular-nums text-foreground">{formatter(value)}</span>
      </div>
      <Slider aria-label={label} min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function SwitchRow({ id, label, tip, checked, onChange }: { id: string; label: string; tip?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-[11px] text-muted-foreground leading-tight max-w-[70%]">
        {label}
        {tip && <InfoTooltip text={tip} />}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
