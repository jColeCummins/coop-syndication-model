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
- Engine/UI separation (since V3): pure typed engine in `utils/engine.ts`, hand-verified via esbuild-bundled node sanity script before any UI work; executive zinc-950 aesthetic
- V4 (current) is a deliberate SIMPLIFICATION reboot: the user's V4 spec walked back V3's CPA-grade enhancements (state/local taxes, § 453(i) basis adjustment, § 170 carryforward schedule, IRR/insights) in favor of exact flat-rate algebra ("Do NOT hallucinate tax law — use the exact algebraic logic provided"). V4 positions, all verbatim:
  - Recapture flat 25%; LTCG flat 15%; no state/local
  - Adjusted Basis = original cost basis − accumulated depreciation; MAY GO NEGATIVE → GP% = MAX(0,(FMV−AdjBasis)/FMV) exceeds 100% (surfaced as `isBasisNegative` annotation, math NOT capped)
  - Balloon year (1–10) decoupled from note term (5–30); balloon ≥ term → note self-amortizes, balloon $0
  - Y1 OBBBA shield = 100% bonus on 15-yr + 5-yr CapEx buckets + FMV × 75% × 30% seg bonus on building
  - Phase 2 burden = balloon + full investor capital take-out, 30-yr refi; mgmt fees flat ×1.15 in Phase 2; rent cliff threshold >10%

## Product (V4 — Limited-Equity Co-op Syndication)

- Left sidebar, 18 sliders in 4 spec-named groups (Property & Tenant Baseline / Seller's Financial Reality / The Deal Structure / Investor New CapEx Buckets); mobile: accordion toggle
- Main view: 5-KPI strip + three data cards: Seller (Year 1 crucible, exact CRITICAL alert string when tax > DP), Investor (MACRS bucket table, shield build-up, REPS box), Tenant (current/P1/P2 rent triptych with Rent Delta vs current, revenue build-up per phase, note amortization table with balloon row)
- Methodology footnote rendered from engine `METHODOLOGY` array

## User preferences

- Specs arrive as pasted "ROLE:" prompt files in attached_assets — latest is ALWAYS authoritative and each is a full reboot; implement its formulas verbatim (V4 explicitly revoked V3's enhance-beyond-spec license). Questionable math → annotate in UI, never alter
- Executive dark aesthetic: zinc-950, muted slate/amber/emerald, no neon terminal styling

## Gotchas

- All math lives in `utils/engine.ts` — never put formulas in components; verify engine changes with an esbuild-bundle + node script before UI work
- Dark mode is permanent; no light/dark toggle
- esbuild binary is not exposed via pnpm bins; locate it under `node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild`
