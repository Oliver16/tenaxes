# Question Bank v2.0 — Review and Integration Notes

The v2.0 comprehensive bank (installed by `supabase/fresh_install.sql`)
replaces the v1 bank following a multi-label semantic audit of coverage:
questions are tagged by policy domain, latent value conflict, actor level,
policy instrument, and scenario conditions rather than compared by lexical
similarity, and conflict coverage (which value pairs the tradeoff scenarios
actually collide) is audited separately from topic coverage.

## What changed

| | v1 | v2.0 |
|---|---|---|
| Constructs | 15 (11 core + 4 facets) | 18 (11 core + 7 facets) |
| Questions | 264 (110 conceptual / 154 applied) | 300 (108 conceptual / 192 applied) |
| Question-axis links | 350 | 348 (300 primary + 48 tradeoff) |
| Collision scenarios | 55 tradeoff-linked questions, 10 of 45 core pairs | 48 deliberate scenarios across 24 mirrored pairs |
| Educational content | 17 questions | 192 (every applied question) |
| Weights | 1.0 / 1.25 | 1.0 conceptual / 1.15 applied / 1.25 collision |

### Construct revisions

- **C10 split.** The old Moral Epistemology axis mixed moral realism,
  relativism, and value pluralism — separable beliefs. It is now
  **C10 Moral Objectivity** (Objectivist ↔ Contextualist) and
  **C11 Value Structure** (Monist ↔ Value Pluralist). International
  enforcement questions moved under C7.
- **F4 split.** The old Decision Authority facet mixed constitutional
  constraint, expert delegation, and direct democracy. It is now
  **F4 Democratic Constraint** (Majoritarian ↔ Constitutionalist),
  **F5 Epistemic Authority** (Popular/Elected Judgment ↔ Expert
  Delegation), and **F6 Democratic Mediation** (Direct Democracy ↔
  Representative Deliberation).
- **Force & Peace moved to F7.** ⚠️ The `F5` id changed meaning
  (was core-tier Force & Peace, now Epistemic Authority). v1 and v2
  results are therefore **not comparable**; `bank_version` is stored on
  questions, responses, and results to keep the eras separate, and the
  results page pins its question fetch to the result's bank version.

### Collision design

Every collision pair is probed twice — once per pole signature — so the
two probes of a pair test *different* pole combinations and are never
averaged. The tension analyzer reports each probe individually
(single-scenario tensions surface with low confidence instead of being
suppressed; `MIN_ANSWERED` is 1), and `analyzeCollisionPairs` rolls the
mirrored probes up per pair by asking whether the pole shared by both
framings survives both: `aligned`, `cross_pressured`, or `inconclusive`.

## Validation

The fresh-install file carries built-in `DO` blocks that
abort installation if any invariant fails (question count, link counts,
metadata coverage, per-axis pole balance). An offline check of the
shipped analyzer against the full bank confirms: 18 axes scored, exact
pole balance (an all-agree responder scores 0.000 on every axis), 48
tension groups, and 24 collision-pair rollups.

Known review notes on the v2.0 data itself:

- The generator's validation JSON reports `F6 tradeoff_endpoints: 0`,
  but the SQL links include F6 in the C4–F6 and F1–F6 collision pairs —
  the SQL data is correct, the JSON summary field is not.
- The upstream dump reintroduced the recursive
  `"Admins can view all profiles"` RLS policy that breaks anonymous
  submits (Postgres 42P17); it is removed in the committed
  `fresh_install.sql` (see `docs/supabase-migration.md`).

## Remaining gaps (future expansion)

The 24 collision pairs cover 14 of 55 core-axis pairs. Each pair×signature
group currently has exactly one scenario, so per-probe confidence stays
"low" by construction; the next expansion should deepen existing pairs to
2–3 scenarios per signature before adding new pairs. C2, C5, C6, C9
carry the fewest tradeoff endpoints among core axes.

## v2.1 addendum — comprehension revision (2026-07-17)

v2.1 revises wording only; the logical bank (axes, keys, weights,
ordering, 348 links, 24 mirrored collision pairs) is unchanged and was
re-verified against v2.0 during integration. Per question: a technical
proposition plus an "In other words, ..." restatement; 152 scenarios add
an explicit "Assume that ..." premise (stored in educational_content);
21 items received material wording corrections (see the bundle change
log); two near-consensus C10 anchors were replaced with harder boundary
cases.

Response model (v2.1 contract): numeric -2..2 are scored, `0` is a
genuine "neither/balanced" answer that counts toward coverage, `null` is
an explicit "Not sure / need more information" excluded from both the
scoring numerator and denominator, and a missing key is unanswered.
Results store per-axis `response_coverage` with confidence bands (high
>= 0.80, moderate >= 0.65, low >= 0.50, otherwise insufficient — also
insufficient below 8 numeric primary items).

v2.0 and v2.1 wordings are not assumed psychometrically interchangeable:
live databases keep v2.0 rows (deactivated) and every response/result row
carries its bank version.
