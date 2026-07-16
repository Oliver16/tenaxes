# Question Bank & Tension Methodology Audit

> **Implementation status:** the P0/P1 fixes (and the P2 link
> corrections) are implemented on this branch — see
> `supabase/migrations/20260716120000_fix_tension_links.sql`,
> `src/lib/tension-analyzer.ts`, and `src/lib/scorer.ts`. The analyzer
> ended up strictly more general than §7's proposal: tradeoff questions
> are grouped by unordered axis pair *and* pole signature, and wins are
> counted from push directions, so both same-key and opposite-key
> tradeoffs carry signal.
>
> **Round 2:** 18 new tradeoff questions
> (`20260716140000_add_tradeoff_questions.sql`) bring every tension pair
> to ≥3 scenarios (12 reportable pairs, incl. the new
> Traditionalist-vs-Civil-Liberties pair and the left-vs-left
> green-space-vs-housing pair); the psychometric validation dashboard
> ships at `/admin/validation`; and the archetype pipeline is restored
> (see Part 2 below). Still open: conceptual de-overlap rewording
> (P2 #11) and the archetype editorial recommendations in Part 2 §5.

**Scope:** All 202 questions (98 conceptual + 104 applied), the multi-axis
collision-link system, the scoring pipeline (`src/lib/scorer.ts`), and the
tension/contradiction analysis (`src/lib/collision-analyzer.ts`).

**TL;DR:** The bank itself is well constructed — balanced item counts,
perfectly balanced keying, a sound conceptual/applied split. But the
tension ("collision") methodology has a structural math flaw that makes
most tagged tensions unable to ever report a lean, ~60% of tagged
collision pairs are silently discarded, roughly a dozen collision links
are mis-keyed, and the weight-normalization scheme quietly inverts the
intended 1.25× applied-question weighting. Recommendations and concrete
fixes are at the end.

---

## 1. What the system does today

- **98 conceptual items**: 8 per core axis (C1–C10), 6 per facet (F1–F3),
  weight 1.0, single-axis.
- **104 applied items** (99–202): 8 per axis, weight 1.25, scenario-based.
  79 of them carry 83 `collision` links to a second (occasionally third) axis.
- **Scoring** (`calculateAxisScoresFromLinks`): each question's total link
  weight is normalized to the question's `weight`, contributions are
  `response × axis_key × normalized_weight`, and each axis score is
  `Σcontrib / (2 × Σweight)` → range −1…+1.
- **Tension analysis** (`analyzeCollisions`, applied questions only):
  groups questions by directional `primary|collision` pair, computes a
  normalized score for each side *from the same responses*, and reports
  `preference_index = (score_collision − score_primary) / 2` with a
  0.15 "balanced" threshold.

## 2. What's working well

These are genuine strengths worth preserving:

- **Perfect key balance.** Every axis has exactly half its items keyed +1
  and half −1, in both banks. This is textbook acquiescence-bias control.
- **Balanced coverage.** 16 items per core axis, 14 per facet (8+8 / 6+8).
- **Conceptual vs. applied split.** Measuring ideals separately from
  scenario choices — and showing the divergence — is a differentiator few
  political-typology instruments have.
- **Sound survey mechanics.** 5-point Likert with a true neutral, seeded
  per-session shuffle, skip allowed, missing responses excluded from
  scoring rather than imputed.
- **Normalization intent.** Capping a multi-axis question's total
  influence at its weight is the right instinct (the execution has a bug —
  see §4).
- **DB audit views** (`axis_weight_audit`, `axis_collision_matrix`)
  show the right monitoring instincts.

## 3. The core finding: the tension math cannot detect most tensions

### 3.1 Same-key collision pairs are structurally forced to "balanced"

Both link contributions for a question derive from the *same* response
`r`: `r·p.key·p.weight` and `r·c.key·c.weight`. When the primary and
collision keys point the same way (agreement moves both axes in
correlated directions), the two "scores" being differenced are just two
weightings of the same numbers, and the preference index cancels to ~0
**no matter what the respondent believes**.

Brute-forcing every possible response combination proves it:

| Pair | Structure | Max possible \|preference_index\| | "Non-balanced" threshold |
|---|---|---|---|
| C1\|C2 (Q100, 151, 153) | all same-key | **0.039** | 0.15 |
| C3\|C8 (Q107, 159, 160, 161) | all opposite-key | 1.000 | 0.15 |

A maximally consistent, extreme redistributionist scores an index of
exactly **0.000** on C1|C2. The classic market-vs-equality tension is
*mathematically incapable* of ever showing a lean in the current system.
Five directional pairs are entirely same-key (C1|C2, C2|C1, C3|C2,
C8|C1, F1|C3 — 16 questions), and 7 more pairs mix same-key with
opposite-key questions, diluting real signal with structural zeros.

### 3.2 Why opposite-key pairs "work" — and what that reveals

For opposite-key questions, `score_collision ≈ −score_primary`, so the
index reduces to `−score_primary`: it simply reports which side of the
trade-off the respondent took, rescaled. That's actually the *correct*
quantity — a single Likert answer to a trade-off scenario carries exactly
one bit of direction plus intensity. The two-score-differencing
architecture can't manufacture two independent measurements from one
response; it either recovers the response direction (opposite keys) or
cancels (same keys).

**Implication:** the analyzer should measure "which pole won each
scenario" directly (`sign(r × primary_key)` per question, aggregated),
instead of differencing two rescalings of the same sum.

### 3.3 Two different relationships are conflated in one `role`

Inspecting the 83 links, they fall into two semantically distinct kinds:

1. **Reinforcing secondary loadings** — agreement legitimately moves both
   axes toward commonly co-occurring poles. E.g. Q100 (cap gas prices):
   state-directed *and* redistributionist. Q139 (blocking traffic
   justified): radical *and* civil-libertarian. These are fine for
   *scoring* but carry **zero tension information** — nothing is traded
   off between the axes.
2. **True trade-offs** — the scenario buys one pole at the other's
   expense. E.g. Q107 (oppose encryption back-doors *even if catching
   criminals gets harder*), Q131 (block the dam *despite clean energy for
   50,000 homes*). These are the only questions that reveal how someone
   navigates a value conflict.

Both are currently `role = 'collision'` and both feed the tension
analyzer. Nearly all same-key links are type 1; nearly all opposite-key
links are type 2. The results UI tells users these insights "come from
questions that explicitly ask you to choose between two competing
values" — for same-key pairs that claim is not true.

### 3.4 60% of tagged pairs are silently thrown away

The analyzer requires ≥2 questions per *directional* pair. Of 47
directional pairs, **28 are singletons and never reported** — including
genuinely interesting trade-offs like Q109 (protest vs. order), Q124
(global tax vs. sovereignty), Q176 (WHO powers vs. sovereignty), Q181
(AI-funded UBI). That's a lot of authored content producing nothing.

Compounding this, pairs are directional: `C1|C2` and `C2|C1` are treated
as different pairs, splitting what is one conceptual tension (6 questions)
into two entries of 3 — each analyzed separately and potentially reported
with contradictory directions. Pairs should be canonicalized unordered.

### 3.5 Smaller issues in the same pipeline

- **Interestingness double-counts sample size** — `question_count × 5`
  *plus* a confidence bonus that is itself derived from question count.
  Pairs with many reinforcing (information-free) questions outrank pairs
  with fewer but genuine trade-offs. F1|C3 (5 same-key questions, always
  "balanced", −10 penalty but +25 count points + 20 confidence) still
  ranks above real 2-question trade-off pairs.
- **`getCollisionQuestionDetails` favored-axis logic** compares
  `|primaryContrib − collisionContrib|` against 0.3. For same-key
  questions both contributions share a sign, so the "favored axis" is
  decided by *link weight*, not by the respondent — any non-neutral
  answer to Q139 reports "favored primary" regardless of view.
- **Confidence ignores skips.** A pair answered 2-of-6 looks the same as
  6-of-6 at n=2; axis confidence likewise doesn't reflect the answered
  fraction.

## 4. Scoring pipeline findings

### 4.1 Normalization inverts the applied 1.25× weighting

`targetWeight / questionTotalWeight` is applied to *all* links, so a
question's primary-axis contribution shrinks as collision links are
added. Actual effective primary weights across the 104 applied questions:

| Effective primary weight | Questions |
|---|---|
| 1.25 (no collision links) | 25 |
| 0.95 | 11 |
| 0.89 | 24 |
| 0.84 | 26 |
| 0.80 | 13 |
| 0.73–0.76 | 3 |
| 0.66 | 2 |

So an applied question tagged with collisions counts *less* toward its
own axis (0.66–0.95) than a plain conceptual question (1.0), while an
untagged applied question counts 1.25. Whether a question got a collision
tag — an editorial annotation — silently changes its measurement
influence by up to ~2×. The 1.25× "applied questions matter more" design
intent is inverted for 76% of the applied bank.

**Fix:** give the primary link its full `q.weight` and treat collision
links as bounded extras (e.g. cap total collision weight per question, or
normalize only the collision links among themselves).

### 4.2 Cross-axis contamination is heavy and skewed, especially C2

Collision links pump score into axes from questions that are *about
something else*:

| Axis | Incoming collision links | keyed +1 / −1 | Total collision weight |
|---|---|---|---|
| **C2** | **22** | 8 / **14** | **12.1** |
| C3 | 13 | 6 / 7 | 7.5 |
| C1 | 10 | 4 / 6 | 5.8 |
| C8 | 7 | 2 / 5 | 4.2 |
| C5 | 7 | 4 / 3 | 3.8 |
| others | ≤6 each | — | ≤3.4 |

C2's collision inflow (~12 raw weight, ~8 after normalization) is
comparable to its entire conceptual bank (8.0). A third of a user's
"Economic Equality" score can come from questions about wolves, highways,
mining, scholarships, refugee policy, and drug sentencing. And the inflow
is key-skewed 14:8 toward the redistributionist pole, so mild agreement
bias shifts C2 leftward. Several of these links are weak ideological
correlates rather than content (see §5.2) — pruning them fixes both
problems at once.

### 4.3 Minor code inconsistencies

- `scorer.ts:40` — fallback `q.weight ?? 1.25` vs. `questions.ts:6`
  fallback `1.0`. Pick one (1.0 matches the DB default).
- Axis *confidence* averages |r| over collision links too, so C2's
  confidence is propped up by 22 responses that barely measure C2.

## 5. Question-level content review

### 5.1 Conceptual bank

Generally strong: statements are clean, single-barreled, and the
educational content is admirably even-handed (each blurb presents both
poles). Issues found:

1. **C3 ↔ F1 construct bleed.** Item "The right to protest, even
   disruptively, is essential to a free society" (C3, order 25) vs. F1's
   "Protest and civil disobedience are legitimate tools when institutions
   fail to respond" (order 82) are near-duplicates scored to *different
   axes*. Keep C3 focused on what the **state may do** (restrict/punish)
   and F1 on whether the respondent **endorses disruption as strategy**.
2. **C6 ↔ C7 overlap.** Border/immigration content appears on both:
   "National borders are morally arbitrary…" (C6) vs. "A nation must
   control its own borders…" / "Free movement of people…" (C7). These
   axes will correlate heavily partly by construction. Keep C6 about
   *moral obligation to in-group vs. everyone*, C7 about *institutional
   authority above the nation-state*.
3. **Double-barreled:** "A universal basic income, **funded by taxing
   wealth**, would create a more just society" (C2) — a UBI-supporting
   flat-taxer can't answer. Drop the funding clause or split.
4. **Scope mismatch:** "Schools and employers should enforce conduct
   codes…" (C3) is about *private* institutions on an axis defined as
   state coercive power vs. civil liberties.
5. **Within-axis near-duplicates** (mild redundancy, wasted bandwidth):
   C7 "transfer some sovereignty to global institutions [climate]" vs.
   "Global problems require global governance that nations cannot opt
   out of"; several C10 items restate moral realism in close variants.

### 5.2 Applied bank — mis-keyed or unjustified collision links

These links assert that agreement implies a pole it doesn't imply
(the first three are outright sign errors):

| Q | Scenario (gist) | Current link | Problem | Suggested |
|---|---|---|---|---|
| 109 | Highway-blocking protesters shouldn't face serious charges | F1 **−1** (gradualist) | Sympathy for disruptive tactics keyed as *gradualist*; contradicts Q139/Q191 which key the same sentiment F1 +1 | F1 **+1** |
| 116 | Nativity scene stays on public land | C6 **+1** (universalist) | Preferring majority-culture tradition over objectors is particularist if anything | C6 **−1** or drop |
| 121 | Donate surplus vaccines by global need | C7 **−1** (sovereigntist) | An outward-looking, globally-cooperative act keyed as *sovereigntist* | C7 **+1** or drop |
| 119 | Open ethnicity-restricted scholarship to all | C2 −1 (redistributionist) | Colorblind/merit stance has no redistribution content; empirically likely anti-correlated | drop |
| 160 | Predictive policing algorithms | C2 −1 | No economic content at all | drop |
| 129 | Society should actively encourage lab-grown meat | C1 +1 (market-directed) | "Actively encourage" implies intervention, not markets | drop |
| 149, 199 | Prefer restorative/treatment programs | C2 −1 | Ideological correlate, not an in-question trade-off | drop |
| 110 | Platforms must remove flagged misinformation | C5 +1 (progressivist) | Correlate, not content | drop |
| 114 | National education standards | C5 +1 | Weak; a traditionalist can favor national standards | drop |
| 196 | Trust courts after repeated appeals | C3 −1 (security/order) | Weak; also structurally inconsistent with Q145/146 (opposite-key) in the same pair | drop |
| 181 | Fund UBI from AI profits | *primary* C8 +1 | Primarily measures redistribution; a tech skeptic who likes UBI agrees | consider primary C2 −1, C8 secondary |

### 5.3 Applied bank — item quality

- **Weak discriminator:** Q143 "I want to see **independent verification**
  before fully accepting [vaccine guidance]" — most *trusting* respondents
  also agree; it won't separate the poles. Reword to e.g. "…I assume the
  guidance is driven by politics or money rather than evidence."
- **US-centric wording** (fine if the audience is US, worth flagging
  otherwise): Mississippi/Massachusetts (Q114), sanctuary cities (Q166),
  "citizens and veterans from my own country" (Q174), COVID-specific
  framings (Q112, Q161).
- **Deliberate double-barrels are OK here.** Applied items *should* bundle
  a cost with a choice ("even if…") — that's what makes them trade-offs.
  The review above only flags cases where the *scoring*, not the wording,
  is wrong.

### 5.4 Trade-off coverage gaps

Counting only genuine trade-off (opposite-key) questions and merging
directions, pairs that can actually be reported today:

- **≥3 questions (reportable with decent confidence):** C9↔C2 (6),
  C3↔C8 (4+2 from C8|C3 = 6), C9↔C1 (3+1), C10↔C7 (2+…).
- **Everything else has ≤2 genuine trade-off questions**, and marquee
  tensions have **zero**: C1↔C2 (efficiency vs. equality), C5↔C3
  (tradition vs. liberty), C6↔C2 (in-group vs. redistribution), F2↔F1.

If the tensions feature is a headline of the product, each pair you want
to report needs ≥3 true trade-off scenarios.

## 6. Data hygiene

- **`instrument.ts` is a drifted duplicate of the DB.** Its item IDs
  (1–98 in a different order) don't match the seeded DB IDs, and its
  `order` fields have duplicates (44 twice, 83 twice) and gaps (21, 51) —
  mirrored in `seed.sql` `display_order`. Harmless at runtime today
  (questions are shuffled per session; `ITEMS` is only used by the
  `seedQuestions()` fallback), but it's a second source of truth that will
  eventually bite. Either delete `ITEMS`/`ORDERED_ITEMS` (keep `AXES`,
  `FLAVOR_ARCHETYPES`) or generate it from the DB.
- **README says "150-item survey (98 + 52)"** — it's now 202 (98 + 104).
- **Migration comment** in `20240604130000` says "202 applied questions
  (99-202)" — it's 104 applied questions, 202 total.

## 7. Recommendations (prioritized)

### P0 — Fix the tension methodology

1. **Split `role` into `secondary` and `tradeoff`** (SQL: extend the
   CHECK constraint, reclassify existing rows — same-key reinforcers →
   `secondary`, true trade-offs → `tradeoff`, applying the §5.2
   corrections). `secondary` links keep contributing to axis scores;
   only `tradeoff` links feed the tension analyzer.
2. **Replace the preference-index math with per-question win counting.**
   For each trade-off question: primary pole "won" iff
   `sign(r × primary_key) > 0`; intensity `|r|`. Aggregate per
   *unordered* pair: wins/losses/neutrals and mean intensity. Report
   "When X collided with Y, you chose X in 4 of 5 scenarios." This is
   transparent, matches the existing UI copy, and is what the current
   math accidentally computes for opposite-key pairs anyway.
3. **Canonicalize pairs unordered** so A|B and B|A merge; recompute
   confidence off the merged n and answered fraction.
4. **Fix `getCollisionQuestionDetails`** the same way (favored axis =
   which pole the response endorsed, not a weight-driven diff).
5. **Fix interestingness:** strength × answered-question count is enough;
   drop the double-counted confidence bonus; exclude `secondary`-only
   pairs entirely.

### P1 — Fix scoring weights

6. **Preserve primary influence under normalization:** primary link
   always contributes `q.weight`; normalize only collision/secondary
   links (e.g. cap their combined weight at 0.5 × q.weight).
7. **Prune the weak C2 (and other correlate) links** per §5.2 — this cuts
   the worst contamination and the 14:8 key skew in one move.
8. **Align the weight fallback** (`?? 1.0` everywhere).

### P2 — Improve the bank

9. **Correct the three sign errors** (Q109 F1, Q116 C6, Q121 C7) via a
   new migration (don't edit historical migrations — the DB is live).
10. **Author ≥3 true trade-off items for each pair you want to report**,
    starting with C1↔C2. Trade-off template: *"[Take pole-A action],
    even if it means [explicit pole-B cost]"* with the cost on the
    *opposite* pole of the second axis. Examples:
    - C1↔C2: "Keep a struggling public program even when a private
      provider could deliver it cheaper, because public provision keeps
      access equal." / "Accept a bigger gap between rich and poor if
      market competition makes nearly everyone better off in absolute
      terms."
    - C5↔C3: "The state should be able to restrict art or media that
      mocks sacred traditions." (traditionalist + security/order vs.
      liberty)
    - F2↔F1: "Even though I distrust institutions, working inside them
      beats trying to tear them down."
11. **De-overlap C3/F1 and C6/C7 conceptual items** (§5.1), split the UBI
    double-barrel, reword Q143.
12. **Consider a small forced-choice section** (pick which of two
    statements is closer to your view) for the 6–8 marquee tensions —
    psychometrically the gold standard for trade-off measurement, and it
    eliminates the keying problem entirely.

### P3 — Validate empirically (you have the data pipeline already)

13. Add to the admin analytics: per-item response SD and item–rest
    correlation (flag items < 0.2), per-axis Cronbach's α, and the
    10×13 inter-axis correlation matrix (expect C1↔C2, C3↔F1, C6↔C7 to
    be high — decide whether to merge, de-overlap, or accept). Prune or
    reassign items based on real responses rather than judgment alone.
14. Track skip rates per item — high-skip items are usually confusing or
    double-barreled.

### Hygiene

15. Update README counts; fix the migration comment; remove or
    regenerate `ITEMS` from the DB.

---

---

# Part 2: Archetype ("Character Sheet") Audit

**Scope:** the 30 `FLAVOR_ARCHETYPES` definitions in
`src/lib/instrument.ts`, the matching math, and every surface that
displays matches (archetype pages, results, past surveys, profile,
admin popularity).

## 1. The pipeline was orphaned — FIXED

Nothing in the codebase computed archetype affinities. The submit route
never wrote `top_flavors`, `core_axes`, or `facets`, so for every
session since the scoring refactor those columns are null. Consequences:
the archetype detail page crashed on `top_flavors.find` when visited
with a session, admin "flavor popularity" aggregated nothing, and the
past-surveys/profile pages had no archetype data to show.

**Fix on this branch:** `src/lib/flavor-matcher.ts` computes affinity as
the weighted mean alignment `Σ(score × direction × weight) / Σweight`
per archetype; the submit route now stores `core_axes`, `facets`, and
ranked `top_flavors`; and the archetype page rebuilds all three
on-the-fly from raw `scores` for older sessions, so history isn't
broken.

## 2. Facet components were invisible — FIXED

The archetype page looked up user positions only in `core_axes`, so
components on F1–F3 — present in 17 of 30 archetypes, including the
*defining* components of Social Democrat, Technocratic Centrist, and
both Anti-Establishment types — never appeared in "Why You Matched."
The page now searches core axes and facets.

## 3. Single-component archetypes dominate rankings — recommendation

Moral Absolutist and Moral Pluralist are one axis each, so their
affinity equals the raw C10 score while every other archetype averages
several axes. Verified numerically: a profile with C10 = 0.75 and
moderate-but-coherent libertarian scores everywhere else ranks Moral
Pluralist (0.75) above Libertarian Capitalist (0.40) even though the
libertarian identity describes the person far better. A single strong
axis will *routinely* out-rank any blended identity.

**IMPLEMENTED:** Moral Absolutist gained `C6 +0.4` (objective morality
is universal in scope) and Moral Pluralist the mirror `C6 −0.4`
(pluralism accepts community-specific frameworks) — both grounded in
the C6/C10 axis definitions. This dilutes single-axis dominance
(0.75 → ~0.48 in the demo profile) without a special-case penalty.

## 4. Eco cluster redundancy — recommendation

Four archetypes share `C9 +1, weight 1` as their core (Deep Ecologist,
Green Reformist, Eco-Sovereigntist, Communitarian Conservationist). A
strong ecocentrist's top-5 list can be four flavors of green with one
slot left for everything else.

**IMPLEMENTED:** the differentiating secondary weights were raised
(+0.2 each), so a pure ecocentrist with neutral secondaries now scores
~0.5 on all of them (dilution) while committed subtypes rise above —
and a new Eco-Capitalist (`C9+ / C1+ / C8+`) covers the market-green
profile that previously had no home. A display diversity cap in the
top-5 UI remains available as a further step if real data still shows
all-green lists.

## 5. Definition-level review (all 30)

Component directions were checked against pole semantics — **no sign
errors found** (unlike the question links). Structural notes:

| Archetype | Issue | Resolution |
|---|---|---|
| Civic Nationalist | Only 2 components, 1.5 total weight, and no C6 despite "civic vs ethnic" being a C6 distinction | **IMPLEMENTED:** added `C6 +0.4` |
| Moral Absolutist / Pluralist | single-component (see §3) | **IMPLEMENTED:** supporting C6 components |
| Anarchist | no C1 component (intentional left/right agnosticism) — matches both an-caps and an-coms equally | kept as-is; Libertarian Socialist now covers the left variant explicitly |
| Techno-Skeptic | `C5 −0.5` (traditionalist) makes a left-wing tech skeptic (degrowth type) match worse | **IMPLEMENTED:** reduced to `C5 −0.3` |

**Coverage gaps — IMPLEMENTED:** three new archetypes fill the holes:
**Eco-Capitalist** (`C9+ 1, C1+ 0.8, C8+ 0.4`), **Moral
Traditionalist** (`C5− 1, C10− 0.8, F3− 0.4`), and **Libertarian
Socialist** (`C2− 1, C4+ 0.8, C3+ 0.8`) — 33 archetypes total.

## 6. Display accuracy — recommendation

The archetype page rendered match % as `(affinity + 1) / 2`, so a
*zero*-alignment archetype displayed as a "50% match" and a mildly
opposed one as "40%". **IMPLEMENTED:** now `max(affinity, 0) × 100`,
with clearly opposed profiles labeled "Opposed" instead of a
misleading percentage.

## 7. Tie-in with the tension system — future feature

Archetypes and tensions can now cross-reference: each archetype implies
expected winners in specific tensions (a Deep Ecologist is expected to
choose Ecocentric over Property Rights). Comparing a user's *measured*
tension outcomes against their top archetype's expected ones would give
exactly the "telling vs. room for improvement" insight the tension
system was rebuilt for — e.g. "You match Deep Ecologist, but in
ecology-vs-prosperity scenarios you split 4–3." Straightforward to add
on top of `TensionScore` + `FlavorMatch`.

---

## Appendix: full directional pair census (as the analyzer sees it)

47 directional pairs; 28 dropped (n<2), 5 all-same-key (structurally
"balanced" forever), 7 mixed, 7 all-opposite (fully functional):

| Pair | n | Structure | Questions |
|---|---|---|---|
| C1\|C2 | 3 | ALL-SAME-KEY | 100, 151, 153 |
| C2\|C1 | 3 | ALL-SAME-KEY | 105, 106, 155 |
| C3\|C2 | 2 | ALL-SAME-KEY | 160, 162 |
| C8\|C1 | 2 | ALL-SAME-KEY | 127, 129 |
| F1\|C3 | 5 | ALL-SAME-KEY | 139, 141, 191, 192, 194 |
| C10\|C5 | 3 | MIXED | 136, 137, 188 |
| C1\|F2 | 2 | MIXED | 101, 154 |
| C4\|C2 | 2 | MIXED | 111, 163 |
| C5\|C10 | 2 | MIXED | 117, 168 |
| C6\|C2 | 4 | MIXED | 119, 120, 173, 174 |
| C6\|C7 | 3 | MIXED | 121, 171, 172 |
| F2\|C3 | 3 | MIXED | 145, 146, 196 |
| C10\|C7 | 2 | ALL-OPPOSITE | 138, 190 |
| C3\|C8 | 4 | ALL-OPPOSITE | 107, 159, 160, 161 |
| C4\|C5 | 2 | ALL-OPPOSITE | 114, 165 |
| C8\|C3 | 2 | ALL-OPPOSITE | 179, 182 |
| C9\|C1 | 3 | ALL-OPPOSITE | 131, 132, 183 |
| C9\|C2 | 6 | ALL-OPPOSITE | 131, 133, 134, 184, 185, 186 |
| F3\|C2 | 2 | ALL-OPPOSITE | 149, 199 |
| *28 singletons (dropped)* | 1 | — | 99, 104, 109, 110, 113, 116, 124, 125, 126, 128, 130, 138, 148, 152, 157, 164, 166, 169, 176, 177, 178, 181, 189, 193, 195, 197, 200, plus C8\|C9 (129) |
