import React from 'react';
import { DealModel, TOOLTIPS } from '@/utils/engine';
import { formatCurrency } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';
import { AlertTriangle } from 'lucide-react';

export function InvestorSection({ model, tooltips }: { model: DealModel; tooltips: typeof TOOLTIPS }) {
  const { investor } = model;
  return (
    <section className="flex flex-col space-y-4">
      <div className="border-b border-border pb-2 flex justify-between items-end">
        <h2 className="text-sm font-medium tracking-wide text-foreground">Investor Reality &mdash; Capital & Year 1 Shield</h2>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required Capital Injection: <span className="text-foreground">{formatCurrency(investor.requiredCapitalInjection)}</span></span>
      </div>

      <div className="bg-card border border-border rounded-md overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-medium text-left">Bucket</th>
                <th className="py-3 px-4 font-medium">MACRS Class</th>
                <th className="py-3 px-4 font-medium">Amount</th>
                <th className="py-3 px-4 font-medium">Year 1 Bonus Treatment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">Roof/Structural</td>
                <td className="py-3 px-4">27.5-yr</td>
                <td className="py-3 px-4">{formatCurrency(model.inputs.capexRoofStruct)}</td>
                <td className="py-3 px-4 text-muted-foreground">27.5-yr schedule, no bonus</td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">Parking/Land</td>
                <td className="py-3 px-4">15-yr</td>
                <td className="py-3 px-4">{formatCurrency(model.inputs.capexParkingLand)}</td>
                <td className="py-3 px-4 text-emerald-500">100% bonus</td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">Appliances</td>
                <td className="py-3 px-4">5-yr</td>
                <td className="py-3 px-4">{formatCurrency(model.inputs.capexAppliances)}</td>
                <td className="py-3 px-4 text-emerald-500">100% bonus</td>
              </tr>
              <tr className="bg-muted/10 font-medium">
                <td className="py-3 px-4 text-left">Total New CapEx</td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4 text-foreground">{formatCurrency(investor.totalNewCapex)}</td>
                <td className="py-3 px-4"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-right text-[11px] tabular-nums whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-medium text-left">Shield Build-Up <InfoTooltip text={tooltips.obbbaShield} /></th>
                <th className="py-3 px-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">Parking/Land 100% bonus</td>
                <td className="py-3 px-4 text-emerald-500">{formatCurrency(investor.bonusOnParkingLand)}</td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">Appliances 100% bonus</td>
                <td className="py-3 px-4 text-emerald-500">{formatCurrency(investor.bonusOnAppliances)}</td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-left">30% Segregated Bonus on Building (75% of FMV)</td>
                <td className="py-3 px-4 text-emerald-500">{formatCurrency(investor.segBonusOnBuilding)}</td>
              </tr>
              <tr className="bg-muted/10 font-bold">
                <td className="py-3 px-4 text-left text-foreground">Year 1 OBBBA Bonus Shield Total</td>
                <td className="py-3 px-4 text-emerald-500 text-sm">{formatCurrency(investor.year1BonusShield)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-accent/10 border-t border-border flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[11px] text-accent font-medium leading-relaxed">
            Passive investors cannot use this shield against W-2 income without IRC § 469(c)(7) REPS status. <InfoTooltip text={tooltips.reps469c7} />
          </p>
        </div>
      </div>
    </section>
  );
}