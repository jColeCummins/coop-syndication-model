# Co-op Syndication Deal Configuration Engine

A dark-mode, data-dense financial modeling SPA for a bifurcated Real Estate Limited-Equity Co-op Syndication (25-unit, $2M FMV): CLT land donation (§ 170) + seller-financed installment note (§ 453), with investor bonus depreciation and a tenant rent-cliff analysis.

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
  - `utils/engine.ts` — THE calculation engine (computeDealModel): all tax/finance math, insights, tooltip strings, defaults. Components must contain zero math.
  - `utils/finance.ts` — low-level PMT / remaining-balance amortization helpers
  - `components/` — presentational only
- API server exists (`artifacts/api-server`) but is unused by this app

## Architecture decisions

- Frontend-only: all financial math runs client-side for instant slider reactivity; no API calls
- V3 (current): engine/UI separation — pure typed engine in `utils/engine.ts`, hand-verified via esbuild-bundled node sanity script; executive zinc-950 aesthetic replaced the V2 "hacker terminal" look
- V3 CPA-grade corrections (user granted license to enhance beyond spec):
  - § 453(i) anti-double-taxation: recapture increases basis → GP% = (FMV − 250k − accumDepr)/FMV
  - § 170 shield modeled as a tracked carryforward balance consumed by installment interest, hard 5-year expiry (Year 6+ cliff), unused balance reported as wasted
  - State + local rates applied to recapture, capital gains, and ordinary interest
  - Depreciable basis = note principal (land excluded via CLT donation)
  - Installment principal collections (incl. balloon) carry embedded gain tax each year
  - Limited-equity co-op: investor operating cash flow = $0 by construction; return = depreciation shield + capital back at par (IRR/MOIC computed)

## Product (V3 — Institutional Underwriting Model)

- 14 grouped sliders incl. note term (5–15 yrs), OH state + Yellow Springs local tax overrides, seller/investor brackets, Day-1 vacant land cash (default $0 — undefined in user spec, surfaced as explicit assumption)
- Seller: Year 0 crucible + multi-year cumulative post-tax schedule with shield-status badges (SHIELDED/PARTIAL/EXHAUSTED/EXPIRED)
- Investor: net cash in/out schedule, REPS disclaimer, IRR/MOIC
- Tenant: Phase 1 vs Phase 2 rent cliff (>15% guardrail), dynamic refi year
- Structuring Insights: dynamic advisory cards (min solvent DP%, § 170 window optimization, rent-cliff levers, tax-harvest framing)
- Hardcoded statutory tooltips (4 exact strings from spec) + supplemental assumption tooltips

## User preferences

- Specs arrive as pasted "ROLE:" prompt files in attached_assets — latest is authoritative; user explicitly granted license (V3) to enhance/expand beyond spec for CPA/MBA/lawyer-grade scrutiny
- Executive dark aesthetic: zinc-950, muted slate/amber/emerald, no neon terminal styling

## Gotchas

- All math lives in `utils/engine.ts` — never put formulas in components; verify engine changes with an esbuild-bundle + node script before UI work
- Dark mode is permanent; no light/dark toggle
- esbuild binary is not exposed via pnpm bins; locate it under `node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild`
