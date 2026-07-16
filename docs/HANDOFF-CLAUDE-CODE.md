# HANDOFF — Cowork review session → Claude Code implementation
**Date: 2026-07-16 · Repo: `jColeCummins/coop-syndication-model` (main) · Target: V5.2 of `artifacts/coop-syndication`**

Copy this file and its three companions into `docs/` in the repo, commit them first, then implement:

- `REVIEW-2026-07.md` — tax-law verification, Yellow Springs cost research, corrections (§2), realism findings (§3–4)
- `defaults-v5.1.patch.ts` — new default inputs and constants, with engine changes 1–11 annotated at bottom
- `UX-CONFIG-SPEC-v5.2.md` — plain-language labels/tooltips for every input, 4-layer config architecture, escalators, 1993 basis handling

## 1. Context in five sentences

25-unit limited-equity co-op conversion in Yellow Springs, OH: seller ("Paul") donates land to a CLT (§170), sells improvements on a seller-financed installment note (§453), investors fund down payment + renovation and are taken out at a Year-5 co-op refinance. The V5 engine (`src/utils/calculations.ts`, 873 lines, pure function, all math out of components) was independently verified this session — it reproduces every figure in `docs/ANALYSIS.md` exactly. A review pass found four law errors, materially understated Yellow Springs operating costs, and produced revised defaults. Stakeholder priority for defaults: **seller → investors → tenants → CLT/management**, all treated fairly. The tool must generalize to other properties/states — **no hardcoded rates, thresholds, or jurisdiction rules anywhere**.

## 2. Decisions already made — do not relitigate

1. **Exit structure is a fixed-formula purchase option embedded in the CLT ground lease** (unreturned capital + accrued unpaid pref + balloon payoff; no appreciation participation; entity-interest transfers trigger the option; ROFR as backstop only; CPI indexation of capital exists as an input, default OFF).
2. **No bargain-sale / Rev. Rul. 82-197 charitable deduction at exit.** Evaluated and rejected for fragility (quid pro quo doctrine, syndicated-deduction enforcement climate, RERI substantiation risk). Rationale recorded in `defaults-v5.1.patch.ts` change #10. Do not re-propose it.
3. **Basis default $475k / accum. dep. $356,250** (1993 stepped-up estimate). Add a transfer-type selector (purchase/inheritance/gift); gift ⇒ $250k carryover story. Real answer comes from the seller's Form 4562 — the UI tooltip must say so.
4. **Management escalates 3%/yr** replacing the one-time 15% Phase-2 bump (1.03⁵ ≈ 1.159 — continuity holds).

## 3. Implementation order

**Phase A — engine correctness (changes 1–5 in the patch file):**
asset-level basis split (NOT §1011(b) pro-rata — land basis to the gift, building adjusted basis to the sale; expect GPR ≈ 99.8% at old defaults), OBBBA 0.5%-of-AGI charitable floor, §1245 ordinary-rate exit recapture via `EXIT_1245_ALLOCATION` input, Ohio BID behind a "CPA-confirmed" toggle, §199A QBI on positive REPS years.

**Phase B — escalators & timing (changes 6–8, 11):**
per-line escalators compounding from Year 1; **Phase-2 rent and the rent-cliff alert must use buyout-year escalated opex**; PIK-pref toggle; filing-status-driven NIIT/LTCG thresholds; `capexPlacedInServiceYear` per bucket; buyout month/year input.

**Phase C — config architecture + UX (UX-CONFIG-SPEC-v5.2.md):**
split `CONSTANTS` into `TaxPolicy` / `Jurisdiction` / `Escalators` presets (JSON, year-stamped, "US-2026" + "Ohio / Yellow Springs" shipping presets, plus a "Generic — no state tax" preset to prove portability); every UI input gets the plain-language label + tooltip from the spec's §2 tables (statutory cites demoted to a "details for your CPA" second paragraph); an "Assumptions" drawer rendering the active presets. Keep `useReducer` state, engine purity, dark zinc-950 aesthetic.

## 4. Regression baseline — verify before and after

Run at **old** defaults (basis 250k/dep 185k, opex 15k/600/900/300, taxes 28,472, cost-seg 30%, LTCG threshold 550k, no floor, 25% exit rate). The current engine produces, and Phase A will intentionally move some of:

| Metric | Current engine (verified 2026-07-16) |
|---|---|
| Phase-1 / Phase-2 rent | $711 / $673 |
| Seller Year-1 tax / headroom | $43,063 / $115,937 |
| Charitable utilization | 100% |
| NPV: cash / cash+donation / installment+donation | $1,130,908 / $919,974 / $923,556 |
| Installment lifetime tax | $195,834 |
| Investor IRR REPS / passive | 9.49% / 6.36% |
| Exit tax | $117,443 |
| Investor flows (k) | −339, +162, +18, +18, +17, +238 |

Expected movement at **new** defaults: Phase-1 rent ≈ $824 (realistic opex), REPS IRR ≈ 8% (blended §1245 exit at `EXIT_1245_ALLOCATION: 0.5` ⇒ exit tax ≈ $135k), seller Ohio tax $34,796 → $16,738 with BID on, Phase-2 rent ≈ $885–900 with escalators (the −5.3% "rent drop" disappears — the cliff alert must still evaluate correctly). Slider sanity: raising any CapEx slider lowers REPS IRR (verified correct behavior — marginal CapEx earns ~6–7% vs 9.5% blended; roof lowest). Recognized-gain sum must still tie to gross profit exactly; charitable floor disallowances must NOT carry forward.

Test harness note: `pnpm` workspace; for quick engine runs without the app, `node --experimental-strip-types` works if `./finance` import gets an explicit `.ts` extension (or add `tsx` as a devDependency and write real tests — preferred: a `calculations.test.ts` asserting the table above and the new expectations).

## 5. Facts sourced this session (cite in tooltips/docs, don't re-derive)

Yellow Springs water $18.04/1,000 gal (2026) → $19.48 (2027), ordinance-locked 8%/yr; combined water+sewer ≈ $31.6/1,000 gal, highest in Miami Valley; ~2,300 gal/unit/mo ⇒ ~$870/unit/yr water/sewer. Ohio flat 2.75% (HB 96, TY2026+), muni intangibles exempt (ORC 718), YS local 1.5% (RITA), Ohio BID $250k/3%, 5/6 bonus addback. 2026 federal: LTCG 20% breakpoint $613,700 MFJ / $533,400 single; NIIT $250k/$200k; OBBBA 0.5% AGI charitable floor (2026+), 100% permanent bonus incl. used property. National MF insurance $777/unit (2024), habitational hard market ⇒ $900/unit default. YS effective property tax ~1.95%; post-conveyance reassessment risk. AFR: confirm month-of-closing; 6% note clears current rates.

## 6. Open items (human, not code)

Seller's actual Form 4562/Schedule E (basis + straight-line-only confirmation); co-op counsel on ground-lease option drafting; CPA memo on Ohio BID characterization; §170 qualified appraisal + Form 8283 for the land gift; Greene County BOR strategy post-conveyance; CLT partner conversation (Yellow Springs Home, Inc. is the incumbent).
