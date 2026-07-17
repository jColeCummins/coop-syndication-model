# Co-op Syndication Deal Configuration Engine

A dark-mode, data-dense financial modeling SPA for a bifurcated Real Estate Limited-Equity Co-op conversion (25-unit, $1.5M FMV): CLT land donation (§ 170) + seller-financed installment note (§ 453), with investor bonus depreciation/IRR analysis and a tenant cost-recovery rent model. See docs/ANALYSIS.md for the full deal analysis and the V5 correction log.

## Run & Operate

- Frontend workflow: `artifacts/coop-syndication: web` (restart via WorkflowsRestart)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/coop-syndication run typecheck` — typecheck the app only
- No backend, no database — all calculations are client-side (pure functions + useMemo)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind, shadcn/ui components, Radix sliders, Recharts, lucide-react
- Forced dark mode (class="dark" on <html>, tokens in src/index.css)

## Where things live

- App: `artifacts/coop-syndication/src/`
  - `utils/calculations.ts` — THE calculation engine (calculateDealMetrics): all tax/finance math, tooltip strings, methodology copy, defaults. Components must contain zero math.
  - `utils/finance.ts` — low-level PMT / remaining-balance / NPV / IRR helpers
  - `components/` — presentational only
- `docs/ANALYSIS.md` — CPA-grade deal analysis + V5 correction log (why each V4/primer rule changed)
- API server exists (`artifacts/api-server`) but is unused by this app
- Build/serve require env vars: `PORT` and `BASE_PATH` (e.g. `PORT=5199 BASE_PATH=/ pnpm run build`)

## Architecture decisions

- Frontend-only: all financial math runs client-side for instant slider reactivity; no API calls
- Engine/UI separation (since V3): pure typed engine in `utils/calculations.ts`, hand-verified via esbuild-bundled node sanity script before any UI work; executive zinc-950 aesthetic
- V5.3 (current) adds Grants & Subsidy: 4 buckets ordered by award probability (rebates / county HOME-CHDO / OHTF / FHLB AHP), $0 = not awarded, committed-at-closing assumption, soft-forgiven-funding treatment replacing investor capital 1:1 (basis intact, CPA to confirm §61/§118), clamped at total capital need — plus § 465 AT-RISK enforcement (seller note ≠ qualified nonrecourse financing per § 465(b)(6); losses capped at cash-at-risk, excess releases against exit gain). Verdicts on earlier-era research (conservation-easement pivot REJECTED, PAD roof election ADOPTED as note, solar ITC deadline corrected, CAT/decimal.js/Columbus-benchmarks dismissed) in docs/ANALYSIS.md A.6.
- V5.2 implemented the accepted subset of the July 2026 external review (docs/REVIEW-2026-07.md + docs/defaults-v5.1.patch.ts + docs/UX-CONFIG-SPEC-v5.2.md; triage in docs/ANALYSIS.md V5.2 addendum):
  - Asset-level basis split (land basis → CLT gift, building adj basis → sale; GPR ≈ 100%); OBBBA 0.5%-AGI charitable floor (never carries); § 1245 exit recapture via exitShortLifeAllocationPct input (default 50%); Ohio BID toggle (default on, CPA-confirm); § 199A QBI on REPS profit years; filing-status NIIT/LTCG thresholds (2026)
  - Per-line opex escalators (util/ins 8%, tax/mgmt 3%, other 2.5%) compounding from Y1; Phase-2 rent + cliff alert computed on buyout-year opex; mgmt ×1.15 bump replaced by 3%/yr; PIK-pref toggle (accrues to buyout, added to refinance burden)
  - Defaults re-underwritten: FMV $1.25M as-is ($700 rents, ~7% cap, deferred maintenance); YS opex (taxes 30k, ins 22.5k, R&M 1200/u, util 1150/u, res 400/u); basis $475k/dep $356,250 (stepped-up story — Form 4562 is the truth); cost-seg 25%; donation $430k = just inside the $436k (34.9% of FMV) max fully absorbed in the § 170 window (findMaxAbsorbableDonation, search capped at 40%)
  - Deferred deliberately: JSON preset architecture (constants grouped TAX_POLICY/JURISDICTION/ESCALATORS/DEAL_CONSTANTS as the seam), capexPlacedInServiceYear, buyout month, CPI indexation (off), transfer-type selector, escalator sliders
  - Locked decisions (handoff §2, do not relitigate): formula-option exit in CLT ground lease; NO Rev. Rul. 82-197 exit deduction
- V5 was the CPA-correctness reboot under user-granted override authority. V5 positions (full rationale in docs/ANALYSIS.md):
  - NO § 453(i) recapture bomb for straight-line residential realty: unrecaptured § 1250 gain (25%) spreads over installments, recognized FIRST within each year's gain (Reg. § 1.453-12)
  - GPR = gross profit ÷ CONTRACT PRICE (FMV − donation), basis apportioned pro-rata gift/sale (§ 1011(b)); accumulated depreciation clamped at 75%-of-basis building share → GPR ∈ [0,1], negative basis impossible
  - § 170: FMV deduction, 30%-of-AGI/yr, 6 usable years (Y7 = first zero-shield year), utilization tracked + under-90% alert; Ohio allows no charitable deduction; Ohio municipalities can't tax interest/gains (ORC 718) — local rate only hits positive investor rental profits
  - Auto per-year NIIT (3.8% over $250k MAGI) and 15/20% LTCG bracket split (~$550k threshold)
  - Investor: cost-seg bonus base = contract price × 30% (not FMV × 75%); Ohio 5/6 bonus addback modeled; EXIT TAX at takeout (basis eroded by depreciation, 25%/15%); IRR computed net of tax, both REPS and passive; suspended § 469 losses release at exit
  - Rent = cost-recovery FLOOR incl. R&M, owner-paid utilities, replacement reserves, investor pref (the missing lines that made V4 rents ~$490 vs realistic ~$711)
  - Seller comparison card: straight cash vs cash+donation vs installment+donation (nominal + NPV @ slider discount rate)
  - Kept from V4/primer: balloon (1–10) decoupled from term (5–30); exact CRITICAL alert string; >10% rent-cliff threshold; three MACRS CapEx buckets; Phase 2 = balloon + investor take-out on 30-yr refi, mgmt ×1.15

## Product (V5.3 — Limited-Equity Co-op Conversion)

- Left sidebar: plain-language labels + tooltips on every input (UX-CONFIG-SPEC §2), 29 sliders + 4 switches (MFJ, Ohio BID, pref current-pay, REPS) in 5 groups incl. Grants & Subsidy (4 buckets by award probability, $0 = not awarded, soft-funding treatment, § 465 at-risk enforced); mobile: accordion toggle; state via useReducer
- Main view: 6-KPI strip + three data cards: Seller (§ 170 max-absorbable-donation readout + expiry alert, deal geometry, annual cash & tax schedule with balloon/no-shield badges, 3-scenario cash-sale comparison), Investor (Y1 depreciation build-up, flow table w/ takeout row, exit economics + gain split by rate, IRR/EM/payback, optimal-when bullets), Tenant (rent triptych w/ annualized-drift framing, escalated Phase-1/Phase-2 revenue build-up with per-line escalator badges, note amortization)
- Methodology footnote rendered from engine `METHODOLOGY` array

## User preferences

- Specs arrive as pasted "ROLE:" prompt files (attached_assets) or uploaded primers — but as of V5 the user granted standing authority to OVERRIDE spec math that is wrong, provided every change is explicitly called out and justified (docs/ANALYSIS.md is the ledger)
- Executive dark aesthetic: zinc-950, muted slate/amber/emerald, no neon terminal styling

## Gotchas

- All math lives in `utils/calculations.ts` — never put formulas in components; verify engine changes with an esbuild-bundle + node script before UI work
- Dark mode is permanent; no light/dark toggle
- esbuild binary is not exposed via pnpm bins; locate it under `node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild`
