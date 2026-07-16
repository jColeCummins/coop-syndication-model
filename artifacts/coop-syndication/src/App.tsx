import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { pmt, remainingBalance } from '@/utils/finance';
import { Slider } from '@/components/ui/slider';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  DollarSign, 
  Building, 
  Users,
  Briefcase,
  TrendingDown
} from 'lucide-react';

export default function App() {
  // Global State (8 sliders)
  const [totalFMV, setTotalFMV] = useState<number>(2000000);
  const [cltLandDonation, setCltLandDonation] = useState<number>(500000);
  const [accumulatedDepreciation, setAccumulatedDepreciation] = useState<number>(300000);
  const [sellerDownPaymentPct, setSellerDownPaymentPct] = useState<number>(15);
  const [sellerInterestRate, setSellerInterestRate] = useState<number>(6);
  const [phase2InterestRate, setPhase2InterestRate] = useState<number>(7);
  const [capexPerUnit, setCapexPerUnit] = useState<number>(100);
  const [mgmtFee, setMgmtFee] = useState<number>(50);

  // Constants
  const units = 25;
  const propertyTaxes = 28472;
  const insuranceMisc = 15000;
  const amortYears = 20;
  const balloonYear = 5;
  const phase2AmortizationYears = 30;

  // Derivations via useMemo
  const math = useMemo(() => {
    // ---------------------------------------------------------
    // CARD 1: SELLER REALITY
    // ---------------------------------------------------------
    const notePrincipal = totalFMV - cltLandDonation;
    const downPaymentReceived = notePrincipal * (sellerDownPaymentPct / 100);
    const grossProfitPct = (totalFMV - 250000) / totalFMV;
    
    // Year 1 Tax Liability
    const recaptureBomb = accumulatedDepreciation * 0.25;
    const capGainsOnCash = (downPaymentReceived * grossProfitPct) * 0.15;
    const totalYear1Tax = recaptureBomb + capGainsOnCash;
    
    const year1NetLiquidity = downPaymentReceived - totalYear1Tax;

    // ---------------------------------------------------------
    // CARD 2: INVESTOR REALITY
    // ---------------------------------------------------------
    const requiredCapitalInjection = downPaymentReceived + (capexPerUnit * units * 12 * 5);
    const year1DepreciationShield = (totalFMV * 0.75) * 0.30;

    // ---------------------------------------------------------
    // CARD 3: TENANT REALITY
    // ---------------------------------------------------------
    const loanAmount = notePrincipal - downPaymentReceived;
    
    // Phase 1
    const annualDS_P1 = pmt(sellerInterestRate / 100, amortYears * 12, loanAmount) * 12;
    const phase1AnnualRevenueReq = annualDS_P1 + propertyTaxes + insuranceMisc + (mgmtFee * units * 12) + (capexPerUnit * units * 12);
    const phase1MonthlyRent = (phase1AnnualRevenueReq / units / 12) * 1.04;

    // Phase 2
    const balloonBalance = remainingBalance(sellerInterestRate / 100, amortYears * 12, loanAmount, balloonYear * 12);
    const phase2RefinanceBurden = balloonBalance + requiredCapitalInjection;
    const annualDS_P2 = pmt(phase2InterestRate / 100, phase2AmortizationYears * 12, phase2RefinanceBurden) * 12;
    const phase2AnnualRevenueReq = annualDS_P2 + propertyTaxes + insuranceMisc + ((mgmtFee * 1.15) * units * 12);
    const phase2MonthlyRent = (phase2AnnualRevenueReq / units / 12) * 1.04;

    const rentJumpPct = ((phase2MonthlyRent - phase1MonthlyRent) / phase1MonthlyRent) * 100;
    const isRentCliff = rentJumpPct > 15;

    return {
      notePrincipal,
      downPaymentReceived,
      grossProfitPct,
      recaptureBomb,
      capGainsOnCash,
      totalYear1Tax,
      year1NetLiquidity,
      requiredCapitalInjection,
      year1DepreciationShield,
      phase1MonthlyRent,
      phase2MonthlyRent,
      balloonBalance,
      phase2RefinanceBurden,
      rentJumpPct,
      isRentCliff
    };
  }, [
    totalFMV, cltLandDonation, accumulatedDepreciation, sellerDownPaymentPct,
    sellerInterestRate, phase2InterestRate, capexPerUnit, mgmtFee,
    units, propertyTaxes, insuranceMisc, amortYears, phase2AmortizationYears
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-12">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded border border-primary/20 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">
                Co-op Deal Configuration Engine
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest">
                25-Unit Limited-Equity Syndication | § 453(i) · § 170 · § 469(c)(7) Compliant Model
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-4 font-mono text-[10px] tracking-wider text-muted-foreground">
            <span>ENGINE: ONLINE</span>
            <span className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded">LIVE COMPUTE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">

        {/* TOP BAND: Global Sliders */}
        <section className="bg-card border border-border p-5 rounded-sm">
          <div className="flex items-center space-x-2 mb-4 border-b border-border pb-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground">Global Parameters</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-muted-foreground">Total FMV</label>
                <span className="text-sm font-mono">{formatCurrency(totalFMV)}</span>
              </div>
              <Slider min={1500000} max={3000000} step={50000} value={[totalFMV]} onValueChange={([v]) => setTotalFMV(v)} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-muted-foreground">CLT Land Donation</label>
                <span className="text-sm font-mono">{formatCurrency(cltLandDonation)}</span>
              </div>
              <Slider min={0} max={1000000} step={50000} value={[cltLandDonation]} onValueChange={([v]) => setCltLandDonation(v)} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline text-[11px]">
                <label className="text-muted-foreground">Past Depreciation Taken</label>
                <span className="font-mono text-sm">{formatCurrency(accumulatedDepreciation)}</span>
              </div>
              <Slider min={0} max={1000000} step={10000} value={[accumulatedDepreciation]} onValueChange={([v]) => setAccumulatedDepreciation(v)} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-muted-foreground">Seller Down Payment</label>
                <span className="text-sm font-mono">{formatPercent(sellerDownPaymentPct)}</span>
              </div>
              <Slider min={0} max={30} step={1} value={[sellerDownPaymentPct]} onValueChange={([v]) => setSellerDownPaymentPct(v)} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-muted-foreground">Seller Interest Rate</label>
                <span className="text-sm font-mono">{formatPercent(sellerInterestRate)}</span>
              </div>
              <Slider min={3} max={10} step={0.25} value={[sellerInterestRate]} onValueChange={([v]) => setSellerInterestRate(v)} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-muted-foreground">Phase 2 Interest Rate</label>
                <span className="text-sm font-mono">{formatPercent(phase2InterestRate)}</span>
              </div>
              <Slider min={4} max={10} step={0.25} value={[phase2InterestRate]} onValueChange={([v]) => setPhase2InterestRate(v)} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-muted-foreground">CapEx per Unit/mo</label>
                <span className="text-sm font-mono">{formatCurrency(capexPerUnit)}</span>
              </div>
              <Slider min={0} max={300} step={10} value={[capexPerUnit]} onValueChange={([v]) => setCapexPerUnit(v)} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-muted-foreground">Mgmt Fee/mo</label>
                <span className="text-sm font-mono">{formatCurrency(mgmtFee)}</span>
              </div>
              <Slider min={0} max={100} step={5} value={[mgmtFee]} onValueChange={([v]) => setMgmtFee(v)} />
            </div>

          </div>
        </section>

        {/* 3-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CARD 1: SELLER REALITY */}
          <section className={`border flex flex-col transition-colors duration-300 ${
            math.year1NetLiquidity < 0 
              ? 'border-destructive bg-destructive/10 animate-pulse' 
              : 'border-border bg-card'
          }`}>
            <div className="bg-[#0f1511] px-4 py-3 border-b border-border flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground">Seller Reality</h2>
              <span className="text-[10px] text-muted-foreground ml-auto hidden xl:inline-block">The Seller's Crucible</span>
            </div>

            {math.year1NetLiquidity < 0 && (
              <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-start space-x-2 text-xs font-bold tracking-widest uppercase">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>CRITICAL: Down payment does not cover Year 1 Recapture Liability.</p>
              </div>
            )}

            <div className="p-5 flex flex-col space-y-6 flex-1">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-1">
                  <span className="text-muted-foreground">Seller Note Principal</span>
                  <span className="font-mono text-foreground">{formatCurrency(math.notePrincipal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-1">
                  <span className="text-muted-foreground">Down Payment Received</span>
                  <span className="font-mono text-foreground">{formatCurrency(math.downPaymentReceived)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-1">
                  <span className="text-muted-foreground">Gross Profit Pct</span>
                  <span className="font-mono text-foreground">{formatPercent(math.grossProfitPct * 100)}</span>
                </div>
              </div>

              <div className="bg-background/50 border border-border p-3 rounded-sm space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-1">Year 1 Tax Liability</h3>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">§ 453(i) Recapture Bomb</span>
                  <span className="font-mono text-destructive">{formatCurrency(math.recaptureBomb)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Capital Gains</span>
                  <span className="font-mono text-destructive">{formatCurrency(math.capGainsOnCash)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-border/50 font-medium">
                  <span className="text-foreground">Total Year 1 Tax</span>
                  <span className="font-mono text-destructive">{formatCurrency(math.totalYear1Tax)}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 flex flex-col items-center justify-center bg-[#0a0e0c] p-4 border border-border">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Year 1 Net Liquidity</span>
                <span className={`text-3xl font-mono ${math.year1NetLiquidity < 0 ? 'text-destructive' : 'text-primary'}`}>
                  {math.year1NetLiquidity < 0 ? '-' : ''}{formatCurrency(Math.abs(math.year1NetLiquidity))}
                </span>
              </div>

              <div className="flex items-start space-x-2 text-[10px] text-muted-foreground border-t border-border/50 pt-3">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                <p><strong>§ 170 AGI Limitation — Partial Shield Only:</strong> The $500k CLT donation is subject to 30%/50% AGI caps. For a low-income retiree, it provides only a partial shield spread over a 5-year carryforward, and cannot offset § 453(i) recapture.</p>
              </div>
            </div>
          </section>

          {/* CARD 2: INVESTOR REALITY */}
          <section className="border border-border bg-card flex flex-col">
            <div className="bg-[#0f1511] px-4 py-3 border-b border-border flex items-center space-x-2">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground">Investor Reality</h2>
              <span className="text-[10px] text-muted-foreground ml-auto hidden xl:inline-block">REPS Investor Profile</span>
            </div>

            <div className="p-5 flex flex-col space-y-6 flex-1">
              
              <div className="flex flex-col items-center justify-center bg-background/50 border border-border p-6 rounded-sm text-center space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Required Capital Injection</span>
                <span className="text-3xl font-mono text-foreground">{formatCurrency(math.requiredCapitalInjection)}</span>
                <span className="text-[10px] text-muted-foreground">Down payment + 5yrs CapEx reserves</span>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-px h-6 bg-border"></div>
              </div>

              <div className="flex flex-col items-center justify-center bg-primary/5 border border-primary/20 p-6 rounded-sm text-center space-y-2">
                <span className="text-xs text-primary uppercase tracking-widest font-semibold">Year 1 Depreciation Shield</span>
                <span className="text-3xl font-mono text-primary">{formatCurrency(math.year1DepreciationShield)}</span>
                <span className="text-[10px] text-primary/70">§ 168(k) 100% OBBBA Bonus on 30% of basis</span>
              </div>

              <div className="mt-auto bg-accent/10 border border-accent/20 p-3 rounded-sm flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-accent font-medium leading-relaxed">
                  Assumes Section 469(c)(7) REPS. Passive investors cannot offset active W-2 income.
                </p>
              </div>
            </div>
          </section>

          {/* CARD 3: TENANT REALITY */}
          <section className="border border-border bg-card flex flex-col">
            <div className="bg-[#0f1511] px-4 py-3 border-b border-border flex items-center space-x-2">
              <Building className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground">Tenant Reality</h2>
              <span className="text-[10px] text-muted-foreground ml-auto hidden xl:inline-block">The Rent Cliff</span>
            </div>

            <div className="p-5 flex flex-col space-y-6 flex-1">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 border border-border p-4 flex flex-col items-center justify-center space-y-2 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Phase 1 Rent</span>
                  <span className="text-xl lg:text-2xl font-mono text-foreground">{formatCurrency(math.phase1MonthlyRent)}</span>
                  <span className="text-[10px] text-muted-foreground">Years 1-5</span>
                </div>

                <div className={`border p-4 flex flex-col items-center justify-center space-y-2 text-center relative ${
                  math.isRentCliff 
                    ? 'bg-destructive/10 border-destructive text-destructive' 
                    : 'bg-primary/5 border-primary/20 text-primary'
                }`}>
                  {math.isRentCliff && (
                    <div className="absolute top-0 right-0 m-1.5 flex items-center space-x-1 px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[8px] font-bold tracking-widest uppercase">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>CLIFF</span>
                    </div>
                  )}
                  <span className={`text-[10px] uppercase tracking-widest ${math.isRentCliff ? 'text-destructive' : 'text-primary/80'}`}>Phase 2 Rent</span>
                  <span className="text-xl lg:text-2xl font-mono font-bold">{formatCurrency(math.phase2MonthlyRent)}</span>
                  <span className={`text-[10px] ${math.isRentCliff ? 'text-destructive/80' : 'text-primary/60'}`}>Year 6+</span>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Rent Jump</span>
                  <div className="flex items-center space-x-2">
                    {math.rentJumpPct >= 0 ? (
                      <TrendingUp className={`w-4 h-4 ${math.isRentCliff ? 'text-destructive' : 'text-primary'}`} />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-primary" />
                    )}
                    <span className={`font-mono font-bold ${math.isRentCliff ? 'text-destructive' : 'text-primary'}`}>
                      {math.rentJumpPct >= 0 ? '+' : ''}{formatPercent(math.rentJumpPct)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Y5 Balloon Balance</span>
                  <span className="font-mono text-foreground">{formatCurrency(math.balloonBalance)}</span>
                </div>

                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Phase 2 Refinance Burden</span>
                  <span className="font-mono text-foreground">{formatCurrency(math.phase2RefinanceBurden)}</span>
                </div>
              </div>
              
              <div className="mt-auto bg-[#0a0e0c] p-3 border border-border/50 text-[10px] text-muted-foreground leading-relaxed">
                <p><strong>Methodology:</strong> Phase 1 accounts for CapEx reserves. Phase 2 rent reflects new debt service required to clear balloon plus investor capital return, modeling 15% mgmt inflation but omitting further CapEx reserves.</p>
              </div>

            </div>
          </section>

        </div>

      </main>
    </div>
  );
}