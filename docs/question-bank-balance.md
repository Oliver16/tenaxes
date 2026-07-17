# Question Bank Balance Policy & Census

**Date:** 2026-07-17 (implemented by `20260717030000_balance_question_bank.sql`)
**Status:** the bank satisfies every rule below; the census tables are
verified against `supabase/fresh_install.sql` by script. This document
is the source for the public methodology ("white paper") page — the
page itself computes its distribution live from the database, so the
published numbers can never drift from the bank.

## 1. Balance policy

These are the rules the bank is now held to. Any future content
migration should re-verify all five (the check script is reproduced in
§5).

1. **Exact key balance per axis.** Every axis has an equal number of
   active items keyed toward each pole — not approximately, exactly.
   This is the acquiescence-bias control the methodology page
   advertises.
2. **Tier depth.** Core axes: 8 conceptual + 10–16 applied. Facets
   (F1–F4): 6 conceptual + 8 applied. F5 (Force & Peace) is core-tier
   in display and now core-tier in depth (8 + 10).
3. **Conflict coverage minimum.** Tension groups are what the analyzer
   actually reports: an unordered axis pair *plus* a pole signature —
   i.e., a specific pair of opposed values, not just a topic. Every
   group must have **≥ 3 scenarios** (the analyzer's hard floor is 2;
   3 is the editorial bar so a single skip can't silence a tension).
4. **Two audit lenses, in order.** *Conflict coverage* first (which
   value collisions do the tradeoff scenarios force?), *topic
   coverage* second (which policy domains do scenarios draw from?).
   Wording similarity is only a tertiary duplicate screen — two items
   can be lexically unrelated and still test the same conflict, which
   is the redundancy that actually matters.
5. **No same-axis adjacency.** The session shuffle spaces axes so
   consecutive questions never probe the same dimension.

## 2. The bank at a glance (286 active items)

| Axis | Name | Conceptual | Applied | Total | Keyed +/− |
|---|---|---|---|---|---|
| C1 | Economic Control | 8 | 12 | 20 | 10/10 |
| C2 | Economic Equality | 8 | 16 | 24 | 12/12 |
| C3 | Coercive Power | 8 | 16 | 24 | 12/12 |
| C4 | Where Power Sits | 8 | 12 | 20 | 10/10 |
| C5 | Cultural Orientation | 8 | 16 | 24 | 12/12 |
| C6 | Group Boundaries | 8 | 10 | 18 | 9/9 |
| C7 | Sovereignty Scope | 8 | 14 | 22 | 11/11 |
| C8 | Technology Stance | 8 | 12 | 20 | 10/10 |
| C9 | Nature's Moral Weight | 8 | 14 | 22 | 11/11 |
| C10 | Moral Epistemology | 8 | 10 | 18 | 9/9 |
| F1 | Change Strategy | 6 | 8 | 14 | 7/7 |
| F2 | Institutional Trust | 6 | 8 | 14 | 7/7 |
| F3 | Justice Style | 6 | 8 | 14 | 7/7 |
| F4 | Decision Authority | 6 | 8 | 14 | 7/7 |
| F5 | Force & Peace | 8 | 10 | 18 | 9/9 |
| | **Total** | **112** | **174** | **286** | **143/143** |

Two additional rows exist but are inactive (155, 257 — true duplicates
retired for scoring history; see §4). Depth spread is now 18–24 for
core axes (was 17–26) and uniform 14 for facets (was 10–14); the
heaviest axis has 1.33× the items of the lightest core axis (was
1.53×), and F5's scores carry core-tier precision instead of
half-facet noise.

## 3. Conflict-coverage census (17 tension groups, all ≥ 3)

Signature notation: the two pole labels are the values the scenarios
force against each other.

| Group | Opposed values | Scenarios |
|---|---|---|
| C2×C9 (−) | Ecocentric vs Property Rights (ecology vs prosperity) | 7 |
| C3×C8 (−) | Civil Liberties vs Tech-Solutionist (privacy vs smart security) | 6 |
| C3×F1 (+) | Radical vs Security/Order (disruption vs order) | 5 |
| C1×C2 (+) | Market-Directed vs Redistributionist (efficiency vs equality) | 5 |
| C3×C5 (−) | Secular neutrality vs religious liberty | 4 |
| C8×C9 (−) | **Tech-Solutionist vs Ecocentric (new)** — nuclear, geoengineering, dams | 4 |
| C2×C7 (−) | Global economic rules vs national economic freedom | 3 |
| C8×F2 (−) | Tech benefits vs distrust of the companies behind them | 3 |
| C2×C4 (+) | Local control vs affordable housing | 3 |
| C3×C7 (−) | International authority vs personal liberty | 3 |
| C7×C8 (−) | Global tech restraint vs national tech advantage | 3 |
| C2×C9 (+) | Green space vs affordable housing (left vs left) | 3 |
| C10×C7 (−) | Universal rights vs cultural self-determination | 3 |
| C3×C5 (+) | Traditionalist standards vs personal liberty | 3 |
| F2×F4 (−) | Expert authority vs popular will | 3 |
| C7×F5 (−) | **Force vs international authorization (new)** | 3 |
| C2×C3 (+) | Positive vs negative liberty | 3 |

Notes:

- The census groups by **pair × signature** because that is how
  `tension-analyzer.ts` groups. The round-5 audit collapsed signatures
  and therefore missed that "secular neutrality vs religious liberty"
  (C3×C5, −) had only 2 scenarios; this round's validation checks the
  real grouping, and that gap is filled (items 287–288).
- **C7×F5** previously had 1 scenario — below even the analyzer's
  n≥2 floor, so the advertised force-vs-sovereignty tension could
  never appear in results. Now 3.
- **C8×C9** is new: tech-optimism vs ecological reverence had zero
  tradeoff scenarios despite being a marquee real-world conflict
  (eco-modernism vs deep ecology). Its four scenarios are built on
  energy infrastructure — nuclear power, solar geoengineering, dam
  removal, dam retention — with keys balanced 2/2.
- **Deliberately not added:** F1×F2 ("distrust institutions but work
  within them") — the two axes correlate by construction, so the
  analyzer's signature math cannot frame a clean value opposition;
  and C2×C6 (welfare chauvinism) — no keying of "benefits for our own
  first" cleanly prices one axis against the other without asserting
  an ideological correlation the data may not support. Both remain
  candidates pending item designs that key cleanly.

## 4. What the balance migration changed

- **+24 items (265–288):** F5 to core depth (incl. conscription, arms
  sales, overseas bases, diplomacy-vs-isolation, genocide intervention
  with/without UN authorization); F4 to facet parity (independent
  redistricting, emergency powers, fluoridation-vs-referendum,
  mega-project siting); the C8×C9 energy-infrastructure quartet;
  transport-infrastructure items for C1 (toll-road financing,
  high-speed rail) and C4 (energy-grid siting authority); key-balance
  completions for C5 (inclusive language) and C6 (co-ethnic
  citizenship preference); and the C3×C5 religious-liberty pair
  (equal-rules slaughter standards, religious homeschool autonomy).
- **20 rewords in place** (same construct, same key — scoring history
  stays valid): the round-5 near-duplicates. Each now tests a distinct
  manifestation of its pole: e.g. 70 became human moral exceptionalism,
  89 regulatory capture, 28 fiscal federalism, 69 animal ethics
  (previously double-barreled with intergenerational duty, now covered
  by 262/263), 174 buy-national procurement, 199 record expungement,
  203 labor standards in trade deals, 209 biometric watchlists,
  211 embryo-editing limits, 191 blockading construction projects.
- **2 retirements** (`active = false`, rows kept so old sessions still
  score): 155 (duplicate of 105) and 257 (covered by 259/260) — which
  is exactly what restored C2's 12/12 key balance.
- Domains newly represented: energy infrastructure (nuclear, dams,
  grids), transport infrastructure (tolls, rail, mega-project siting),
  conscription and arms policy, electoral mechanics (redistricting),
  homeschooling, animal ethics.

## 5. Verification

Every claim in §2–§3 is checked by
`scratch: validate_bank.py` logic (reproduced in the PR description),
run against `supabase/fresh_install.sql` after every content change:
row/link counts, one primary link per question matching its axis and
key, no non-primary link on a question's own axis, no duplicate active
text, exact per-axis key balance, and ≥3 scenarios per pair×signature
group. The public pages recompute the distribution from the live DB on
an hourly revalidation, so the published white-paper numbers are the
bank, not a copy of it.

## 6. Known tradeoffs and next levers

- **Respondent burden** is now ~286 items (~35 min). This was a
  deliberate trade: coverage and balance first, then reduce burden by
  *sampling*, not deletion. The next lever is a short-form mode —
  e.g. serve a per-session stratified sample (4 conceptual + 6 applied
  per core axis) with confidence intervals widened accordingly; the
  balance rules above are exactly what makes stratified sampling safe.
- **Pollution externalities** remain untested as a scenario domain
  (C9 scenarios price habitat/species; a polluter-pays scenario keys
  more naturally to C1/C2 regulation). Candidate for the next content
  round.
- **Empirical pruning** via `/admin/validation` once response volume
  exists: item-rest correlations adjudicate the remaining mild
  same-pole clusters (round-5 §2.6) and the C2/C6 keying of the
  race-policy items (258 vs 260).
