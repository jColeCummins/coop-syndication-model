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
  - `utils/finance.ts` — PMT, future value, remaining-balance amortization helpers (source of truth for math)
  - `components/` — one component per model block
- API server exists (`artifacts/api-server`) but is unused by this app

## Architecture decisions

- Frontend-only: all financial math runs client-side for instant slider reactivity; no API calls
- Formulas follow the user's uploaded spec verbatim — do not "improve" tax math without user direction
- V2 spec (Deal Configuration Engine) superseded the V1 five-block dashboard: three-column layout of Seller Reality / Investor Reality / Tenant Reality with audit flaws (§ 453(i) recapture, § 170 AGI caps, § 469(c)(7) REPS) baked into calculations

## Product

- 8 global sliders (FMV, CLT donation, accumulated depreciation, down payment %, seller rate, refi rate, CapEx/door, mgmt fee/door) driving instant recomputation
- Seller card: Year 1 recapture bomb vs. liquidity, flashing CRITICAL warning when down payment can't cover Year 1 tax
- Investor card: required capital vs. Year 1 OBBBA depreciation shield, permanent REPS disclaimer
- Tenant card: Phase 1 vs Phase 2 (Year 6 refi) monthly rent with >15% rent-cliff red highlight

## User preferences

- Specs arrive as pasted "ROLE:" prompt files in attached_assets — treat the latest one as authoritative and implement formulas exactly as written

## Gotchas

- The user's specs define exact formulas, slider ranges, steps, and defaults — implement verbatim, no invented tax logic
- Dark mode is permanent; no light/dark toggle
