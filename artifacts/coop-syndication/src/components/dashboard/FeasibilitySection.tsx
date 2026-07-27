import React from 'react';
import { DealMetrics, TOOLTIPS } from '@/utils/calculations';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';
import { AlertTriangle, Check } from 'lucide-react';

/**
 * Phase-2 financing feasibility — can the co-op actually GET the takeout loan?
 * Presentational only; every number comes from the engine's FeasibilityMetrics.
 */
export function FeasibilitySection({ model, tooltips }: { model: DealMetrics; tooltips: typeof TOOLTIPS }) {
  const { feasibility: f, surplus: s, memberEquity: me, inputs } = model;
  const fundable = f.financingGap <= 0.5;
  const p2Year = inputs.balloonYear + 1;

  return (
    <section className="flex flex-col space-y-4">
      <div className="border-b border-border pb-2">
        <h2 className="text-[17px] font-medium tracking-wide text-foreground">
          Phase-2 Financing Feasibility &mdash; Can the Co-op Get the Loan? <InfoTooltip text={tooltips.feasibility} />
        </h2>
      </div>

      {/* Verdict banner */}
      <div className={`p-6 rounded-md border flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
        fundable ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive'
      }`}>
        <div className="flex items-start space-x-3">
          {fundable
            ? <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            : <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />}
          <div>
            <div className={`text-[15px] font-semibold ${fundable ? 'text-emerald-500' : 'text-destructive'}`}>
              {fundable
                ? 'Refinance is supportable at these terms'
                : `Financing gap of ${formatCurrency(f.financingGap)}`}
            </div>
            <div className="text-[13px] text-muted-foreground mt-1 max-w-2xl">
              {fundable
                ? `A lender advancing ${formatPercent(f.maxLtv * 100)} LTV at ${f.minDscr.toFixed(2)}x coverage supports ${formatCurrency(f.supportableLoan)} — at or above the ${formatCurrency(f.refinanceBurden)} needed at buyout.`
                : `The Year-${p2Year} refinance needs ${formatCurrency(f.refinanceBurden)}, but a lender at ${formatPercent(f.maxLtv * 100)} LTV and ${f.minDscr.toFixed(2)}x coverage supports only ${formatCurrency(f.supportableLoan)}. The ${f.bindingConstraint === 'dscr' ? 'coverage ratio' : 'loan-to-value'} test is binding. Close the gap with grants, member equity, a faster seller-note paydown, or a smaller investor check.`}
            </div>
          </div>
        </div>
      </div>

      {/* The two lender tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TestCard
          label="Loan-to-Value"
          pass={f.ltvPass}
          actual={formatPercent(f.ltv * 100)}
          limit={`max ${formatPercent(f.maxLtv * 100)}`}
          detail={`${formatCurrency(f.refinanceBurden)} against ${formatCurrency(f.stabilizedValue)} stabilized value`}
          supports={f.maxLoanByLtv}
          binding={f.bindingConstraint === 'ltv'}
        />
        <TestCard
          label="Debt-Service Coverage"
          pass={f.dscrPass}
          actual={`${f.dscr.toFixed(2)}x`}
          limit={`min ${f.minDscr.toFixed(2)}x`}
          detail={`${formatCurrency(f.phase2NOI)} net operating income ÷ ${formatCurrency(f.phase2DebtService)} debt service`}
          supports={f.maxLoanByDscr}
          binding={f.bindingConstraint === 'dscr'}
        />
      </div>

      {!s.enabled && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-4 text-[13px] text-amber-500/90">
          <span className="font-semibold">Cost-recovery mode.</span> Rent is set to exactly break even, so net
          operating income equals debt service and coverage pins at 1.00&times; by construction. That is the honest
          result, not a rounding artifact &mdash; no lender refinances a break-even property. Turn on
          &ldquo;Hold rent at a policy level&rdquo; to model the cushion.
        </div>
      )}

      {/* Member share capital */}
      {me.totalRaised > 0 && (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <span className="text-[14px] font-medium text-muted-foreground">
              Member Share Capital <InfoTooltip text={tooltips.memberShares} />
            </span>
            <span className="text-[12px] text-emerald-500">
              {formatCurrency(me.totalRaised)} raised &middot; {Math.round(me.unitsPurchasing)} of {inputs.units} homes
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            <Stat
              label="What a household pays"
              value={formatCurrency(me.sharePrice)}
              sub={`${me.monthsOfRent.toFixed(1)} months of rent · ${formatCurrency(me.installment24)}/mo over 24, ${formatCurrency(me.installment36)}/mo over 36`}
            />
            <Stat
              label="Assistance needed"
              value={formatCurrency(me.assistanceNeeded)}
              sub={`${formatPercent(inputs.shareAssistancePct)} of shares · the community-foundation ask, sized`}
              tip={tooltips.shareAssistance}
              accent
            />
            <Stat
              label="What it buys the co-op"
              value={`${formatCurrency(me.totalRaised)} off the refinance`}
              sub={me.rentReliefPerUnitMonth > 0
                ? `plus ${formatCurrency(me.rentReliefPerUnitMonth)}/unit/mo of rent relief (preferred return avoided)`
                : `${formatCurrency(me.prefAvoided)}/yr of preferred return avoided (accrues to buyout)`}
            />
          </div>
          <div className="px-4 py-3 border-t border-border text-[12px] text-muted-foreground">
            <span className="text-foreground font-medium">Anti-displacement terms</span> &mdash; deal documents, not model
            inputs: buying a share is never a condition of staying, and non-purchasing households remain residents at the
            same rent; installments, sweat-equity credit and assistance are offered; no income minimum, credit score or
            screening applies to sitting tenants; admission preference goes to people who live or work in the village.
            Shares refund at par &mdash; no appreciation &mdash; which is how Greenmont has stayed affordable since 1947.
          </div>
          {me.clampedByCapitalNeed && (
            <div className="px-4 py-3 border-t border-border text-[12px] text-amber-500">
              Shares at this price exceed the deal&rsquo;s entire capital need; the excess is not used. Lower the price
              &mdash; the co-op cannot productively absorb more member money than it needs.
            </div>
          )}
        </div>
      )}

      {/* Surplus deployment */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
          <span className="text-[14px] font-medium text-muted-foreground">
            Rent Policy &amp; Surplus Deployment <InfoTooltip text={tooltips.surplusSplit} />
          </span>
          {s.enabled && !s.policyBelowCostFloor && s.annualSurplus > 0 && (
            <span className="text-[12px] text-emerald-500">
              {formatCurrency(s.annualSurplus)}/yr &times; {s.years} yrs
            </span>
          )}
        </div>

        {s.policyBelowCostFloor ? (
          <div className="p-4 text-[13px] text-destructive">
            <span className="font-semibold">Policy rent cannot be honored.</span> The cost floor is{' '}
            {formatCurrency(s.costFloorMonthlyRent)}/mo &mdash; {formatCurrency(s.shortfallPerUnitMonth)}/unit/mo above
            the {formatCurrency(s.policyMonthlyRent)} policy. Tenants pay the floor regardless; there is no surplus to
            deploy. Bring costs down (management, insurance, utilities, tax abatement) or raise the policy rent.
          </div>
        ) : !s.enabled ? (
          <div className="p-4 text-[13px] text-muted-foreground">
            Rent policy is off &mdash; rent equals the cost floor and no surplus is generated.
          </div>
        ) : s.annualSurplus <= 0 ? (
          <div className="p-4 text-[13px] text-muted-foreground">
            Policy rent exactly equals the cost floor. No surplus to deploy.
          </div>
        ) : (
          <table className="w-full text-right text-[14px] tabular-nums whitespace-nowrap">
            <tbody className="divide-y divide-border">
              <Row label={`Tenants pay (policy, held flat)`} v={`${formatCurrency(s.effectivePhase1Rent)}/mo`} note={`cost floor ${formatCurrency(s.costFloorMonthlyRent)}`} />
              <Row label="Annual surplus over the floor" v={formatCurrency(s.annualSurplus)} note={`years 1–${s.years}`} />
              <Row
                label="→ Extra seller-note principal"
                v={`${formatCurrency(s.toPrincipalPerYear)}/yr`}
                note={`${formatPercent(s.principalPct)} · ${formatCurrency(s.extraPrincipalTotal)} total`}
              />
              <Row
                label="→ Capital reserves (co-op holds)"
                v={`${formatCurrency(s.toReservesPerYear)}/yr`}
                note={`${formatPercent(s.reservesPct)} · ${formatCurrency(s.reservesBalanceAtBuyout)} at buyout`}
              />
              <Row
                label="→ Shadow equity (member credit)"
                v={`${formatCurrency(s.toShadowEquityPerYear)}/yr`}
                note={`${formatPercent(s.shadowEquityPct)} · ${formatCurrency(s.shadowEquityAtBuyout)} at buyout`}
                tip={tooltips.shadowEquity}
              />
              <tr className="bg-muted/10 font-medium">
                <td className="py-3 px-4 text-left text-foreground">Balloon at buyout</td>
                <td className="py-3 px-4 text-foreground">{formatCurrency(model.tenant.balloonBalance)}</td>
                <td className="py-3 px-4 text-[12px] text-emerald-500">
                  {s.balloonReduction > 0
                    ? `${formatCurrency(s.balloonReduction)} below the ${formatCurrency(s.balloonWithoutPolicy)} it would have been`
                    : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function TestCard({ label, pass, actual, limit, detail, supports, binding }: {
  label: string; pass: boolean; actual: string; limit: string; detail: string; supports: number; binding: boolean;
}) {
  return (
    <div className={`bg-card border rounded-md p-5 flex flex-col space-y-2 ${pass ? 'border-border' : 'border-destructive/50'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
        <span className={`text-[11px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
          pass ? 'bg-emerald-500/15 text-emerald-500' : 'bg-destructive text-destructive-foreground'
        }`}>{pass ? 'Pass' : 'Fail'}</span>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl font-light tabular-nums ${pass ? 'text-foreground' : 'text-destructive'}`}>{actual}</span>
        <span className="text-[13px] text-muted-foreground">{limit}</span>
        {binding && <span className="text-[11px] text-amber-500 uppercase tracking-widest">binding</span>}
      </div>
      <div className="text-[12px] text-muted-foreground">{detail}</div>
      <div className="text-[12px] text-muted-foreground pt-1 border-t border-border">
        Supports <span className="text-foreground tabular-nums">{formatCurrency(supports)}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tip, accent }: {
  label: string; value: string; sub: string; tip?: string; accent?: boolean;
}) {
  return (
    <div className="p-4 flex flex-col space-y-1">
      <span className="text-[12px] uppercase tracking-widest text-muted-foreground font-semibold">
        {label}{tip && <InfoTooltip text={tip} />}
      </span>
      <span className={`text-xl font-light tabular-nums ${accent ? 'text-amber-500' : 'text-foreground'}`}>{value}</span>
      <span className="text-[12px] text-muted-foreground">{sub}</span>
    </div>
  );
}

function Row({ label, v, note, tip }: { label: string; v: string; note?: string; tip?: string }) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4 text-left">{label}{tip && <InfoTooltip text={tip} />}</td>
      <td className="py-3 px-4">{v}</td>
      <td className="py-3 px-4 text-[12px] text-muted-foreground">{note ?? ''}</td>
    </tr>
  );
}
