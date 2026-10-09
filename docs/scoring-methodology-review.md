# Scoring Methodology Review (v2.2 bank)

**Date:** 2026-07-17
**Scope:** end-to-end review of the deterministic scoring pipeline —
item weighting, axis scoring, the collision/tension layer, the
conceptual-vs-applied consistency rating, archetype matching, the
admin validation console, and the public methodology page — checked
against the shipped code (`src/lib/scorer.ts`,
`src/lib/tension-analyzer.ts`, `src/lib/flavor-matcher.ts`,
`src/lib/results/consistency.ts`,
`src/app/api/admin/validation/route.ts`), the canonical bank
(`supabase/fresh_install.sql`, 350 items / 398 links), and survey
psychology / psychometric best practice.

All bank statistics below were recomputed from the repository, not
taken from prior docs.

---

## 1. What the instrument gets right

These properties were verified computationally and deserve to be kept:

1. **Exact, weight-adjusted acquiescence balance.** Every axis has
   equal item counts *and* equal summed weight toward each pole — in
   the combined bank and within the conceptual and applied registers
   separately. An all-agree (or all-disagree) responder scores 0.000
   on all 18 axes in every register. This is a stronger
   acquiescence-bias control than most published political
   instruments, which balance counts but not weights.
2. **Principled missing-data contract.** Separating "Neither /
   genuinely balanced" (numeric 0, stays in the denominator) from
   "Not sure / need more information" (null, excluded from numerator
   and denominator) matches survey-methods best practice: forced
   midpoints conflate ambivalence, indifference, and ignorance
   (Krosnick's "no-opinion" literature). Coverage per axis is tracked
   and surfaced with explicit thresholds instead of silently imputing.
3. **Per-session seeded shuffle with same-axis adjacency repair.**
   Item-order effects are randomized across respondents (so they
   become noise, not bias), the order is reproducible for resume, and
   same-axis items never appear back-to-back, reducing carryover and
   memory-based consistency pressure.
4. **Bank versioning.** Results pin `bank_version`, and the submit
   route scores exactly the bank the client displayed. v1/v2 eras are
   correctly declared non-comparable (the F5 id changed meaning).
5. **Tradeoff links excluded from the sacrificed axis.** Scoring a
   forced-choice answer as a *position* on the axis that lost the
   tradeoff would double-count priorities as positions; the scorer
   correctly refuses to do this (though see §3 — the same logic is
   not applied to the primary axis).
6. **Validation infrastructure exists** (item response rates,
   item-rest correlations, per-axis Cronbach's alpha, inter-axis
   correlations) and the limits page honestly states the absence of
   norms and validity evidence.

---

## 2. Highest-severity finding: the tension layer's labels are not supported by its data

### 2.1 Every tension group contains exactly one item

The analyzer groups tradeoff questions by unordered axis pair **and**
pole signature (`tension-analyzer.ts`). The v2.2 bank has 48 tradeoff
items across 24 pairs × 2 signatures — **exactly one scenario per
group**, and `MIN_ANSWERED = 1`. Consequences, from the code's own
thresholds:

| Output | Threshold | Reachable with 1 item? |
|---|---|---|
| `classification: consistent_priority` | abs(lean) ≥ 0.30 | **Yes — from any single non-neutral answer** (lean is ±0.5 or ±1.0) |
| `classification: context_dependent` | wins on both sides | **Never** (needs ≥2 answered in one group) |
| `classification: balanced` | otherwise | Only via a single 0 answer |
| `preference_strength: 'moderate'` | 0.15 ≤ abs(lean) < 0.35 | **Never** (single-item leans are 0, 0.5, 1.0) |
| `preference_strength: 'strong'` / `'very strong'` | ≥0.35 / ≥0.60 | **Yes — one Agree = "strong", one Strongly Agree = "very strong"** |
| `confidence_level: 'medium'` / `'high'` | ≥3 / ≥5 answered | **Never** |

So the per-probe layer reports "**consistent** priority" with
"**very strong**" preference from a **single Likert response**. In
psychometric terms this is a single-item behavioral indicator being
labeled as if it demonstrated cross-situational consistency — exactly
the inference single items cannot support (single-item reliability for
attitude measures is typically r ≈ .3–.6; the attitude–behavior
literature since Fishbein & Ajzen is unambiguous that one scenario
choice does not establish a stable priority).

The pair-level rollup (`analyzeCollisionPairs`) is the
methodologically defensible unit — it requires two decisive probes for
`aligned` and both a win and a loss for `cross_pressured` — but the
per-probe `TensionScore`s, with their unqualified labels, are what
`collision_pairs` stores and what several surfaces narrate.

**Recommendation (P0):** either
(a) restore multi-scenario groups (the documented plan: 2–3 scenarios
per pair×signature) before using words like "consistent"/"very
strong", or
(b) recalibrate the single-item vocabulary now: rename
`consistent_priority` → `single_scenario_priority` (or cap
`preference_strength` at "indicative"), and reserve
priority/consistency language for the pair-level rollup. Dead
branches (`context_dependent`, `moderate`, `medium`/`high`
confidence, the `answered * 6` and confidence terms of
`interestingness_score`, and the stored-but-unused 0.65 tradeoff link
weight) should be removed or made reachable — unreachable thresholds
in scoring code are a maintenance hazard because they *look* like
active safeguards.

### 2.2 The public methodology page contradicts the shipped code

`/methodology` states: *"A tension is reported only when at least two
relevant probes were answered. Fewer than three is low confidence,
three or four is medium, and five or more is high."*

None of this is true of the shipped system: tensions are reported from
one answered probe (`MIN_ANSWERED = 1`), and with one item per group
the medium/high bands are unreachable. For an instrument whose brand
is "designed to be inspected", the inspection page misdescribing the
flagship feature is the single most important fix in this review.

Similarly stale: `docs/question-bank-balance.md` (dated the same day)
censuses a 286-item, 15-axis bank, declares "the bank satisfies every
rule below" including **"every [tension] group must have ≥ 3
scenarios (the analyzer's hard floor is 2)"** — while the actual bank
has 1 scenario per group and a hard floor of 1. `README.md` describes
weight 1.25 as "collision scenarios" although the 50 controversy items
also carry 1.25.

---

## 3. The collision items' primary links are internally inconsistent

The scorer's rationale for excluding tradeoff links is stated in
`scorer.ts`: *"a tradeoff answer reveals a priority between two
values, not a position on the sacrificed axis."* Correct — but the
same answer **is** scored as a position on the primary axis, at
**1.25, the highest weight in the bank**.

The asymmetry matters in the disagree direction. Take item 253
(primary C1+, tradeoff C3): a respondent who strongly values market
freedom but values privacy slightly more will *disagree* — and be
pushed toward the State-Directed pole of C1 at 1.25× weight, even
though their answer expressed "privacy outranks markets", not "the
state should direct the economy". A priority revealed between two
values is not a position on *either* axis; the code's own comment
proves half of this and the weight table contradicts the other half.

This has a knock-on effect: collision items are `applied`, so they
feed the applied register that the **consistency rating** compares
against conceptual scores. Items deliberately engineered to force
value sacrifices depress applied scores relative to conceptual ones —
then the gap is presented to the user as *their* inconsistency
("Different under constraint"). Part of the measured "hypocrisy" is an
instrument artifact, which is circular.

**Recommendation (P1):** pick one consistent treatment. Options, in
order of preference: (a) score collision primaries at reduced weight
(e.g. the 0.65 already stored on tradeoff links) reflecting that they
are noisier position measures; (b) exclude collision items from the
applied register used for the consistency comparison while keeping
them in the combined profile; (c) keep current behavior but disclose
on the consistency page that applied scores include forced-tradeoff
items. Doing nothing leaves the strongest-weighted items in the bank
measuring a different construct (priority) than the axis they load on
(position).

---

## 4. The weight tiers (1.0 / 1.15 / 1.25) are theory, not measurement

Differential item weighting is asserted ("applied answers carry more
weight because consequences are real"), not estimated. No IRT
calibration, factor loadings, or item-discrimination evidence backs
the tiers. The psychometric literature is consistent that a-priori
differential weights rarely beat unit weights and can hurt when the
up-weighted items are noisier (Wainer 1976, "it don't make no
nevermind"; Cohen 1990) — and here the up-weighted items are
*structurally* noisier: collision items measure priorities (§3), and
the 50 controversy items were explicitly added as a "stress layer"
whose performance "can be audited rather than blended invisibly" —
yet they were given the **top** weight tier before any such audit.
With balanced keying the tiers mostly cannot bias direction, only
reweight variance, so the practical damage is bounded — but the
methodology page presents the tiers as a feature rather than an
assumption.

**Recommendation (P2):** default new layers to weight 1.0 until
`/admin/validation` item-rest data justifies more; when data exists,
derive weights from discrimination estimates (or keep unit weights
and say so). At minimum, label the tiers as design assumptions on the
methodology page.

---

## 5. Consistency rating: a gap score without an error model

`consistency.ts` computes `rating = 100·(1 − meanGap/2)` over per-axis
|conceptual − applied| gaps, then assigns bands at 90/78/64.

Problems, in decreasing order of importance:

1. **No treatment of measurement error.** The conceptual register has
   **6 items per axis**; its per-axis scores carry substantial
   standard error. The applied register differs. A gap must exceed
   the noise floor (≈ SEM·√2 per axis) before it means anything, but
   every gap counts fully. With no reliability estimates yet, the
   honest statement is "we cannot yet distinguish a 0.15 gap from
   noise" — the UI instead assigns colored verdicts.
2. **Register difficulty differences guarantee nonzero gaps.** Applied
   items systematically include cost clauses ("even if…", "even
   when…") that lower endorsement by design; conceptual items don't.
   Two registers with different item difficulty produce different
   means for a perfectly consistent respondent. Classical practice is
   to compare standardized scores (or model difficulty explicitly);
   comparing raw means measures item wording as much as the person.
3. **Collision contamination** (§3) pushes the applied register
   further from conceptual for anyone who faces real dilemmas.
4. **The scale is compressed and the bands unanchored.** meanGap = 2
   requires a full pole flip on *every* axis; realistic values live
   below ~0.5, so ratings cluster in 75–100 and the 90/78/64 bands
   partition a range no one validated. Band labels ("Highly
   consistent", "Different under constraint") are empirical claims
   with no empirical calibration behind them.

**Recommendation (P2):** present the mean gap with an uncertainty
qualifier and frame bands as descriptive quantiles once real data
exists; per-axis, only surface gaps that exceed a noise threshold;
note the register-difficulty caveat on the consistency page. The
existing "signal for reflection, not a diagnosis" framing used for
tension contradictions should be applied here too.

---

## 6. Archetype matching: sound core, three structural biases

Affinity = weighted mean of `score × direction` over the archetype's
**own** components — a compensatory projection, not a profile
distance. That is a defensible choice, but it has consequences:

1. **Unlisted axes are invisible.** An archetype with 3 components
   ignores the other 15 dimensions entirely. A respondent can be a
   "Very Strong" Anarchist match while holding strongly statist
   economic views if C1/C2 aren't in the component list. A
   distance-based or penalty-augmented score (e.g. subtract mean
   |score| on axes the archetype is silent about only when they
   oppose its cluster) would reduce absurd matches; at minimum the
   UI could show "based on N of 18 dimensions".
2. **Fewer components ⇒ structurally easier high affinity.**
   Components per archetype range 2–6 (mean 3.0). A 2-component
   archetype (Reactionary, Radical Progressive, Punitive
   Authoritarian…) needs alignment on only 2 axes to top the ranking,
   while Populist Nationalist needs 6. Ranking therefore favors
   simple archetypes for extreme respondents. Consider a small
   shrinkage toward 0 proportional to 1/√(component count) — the
   same correction used for small-sample means — or report affinity
   with component count.
3. **Pole coverage is asymmetric.** Anchor counts per pole are
   unbalanced: C2− (redistribution) anchors 5 archetypes vs C2+
   (property-rights) 1; C9+ (ecocentric) 5 vs C9− 1; C5− 5 vs C5+ 2.
   Respondents on under-covered poles get systematically weaker and
   less differentiated top matches — which reads to the user as "the
   test couldn't place me" and is invisible in aggregate popularity
   stats (it also biases the admin "popular flavors" chart toward
   well-covered poles). The Round-3 Monte Carlo ("all 26 axis poles
   anchor at least one archetype; 1.1% lack a ≥0.30 match") was run
   against the 33-archetype / 15-axis instrument; it has not been
   re-run for 38 archetypes / 18 axes / 36 poles.
4. Two display-level conflations: **negative affinity is labeled
   "Minimal"** (opposition ≠ irrelevance — a −0.6 affinity is
   informative and could be surfaced as "opposed"); and the hero's
   **"N% match"** equals affinity×100, which conflates direction
   alignment with extremity — a perfectly aligned but uniformly
   moderate (±0.5) respondent can never exceed "50% match" for any
   archetype, which users will misread as poor fit.

---

## 7. Axis-score internals

1. **`confidence` conflates extremity with confidence.**
   `AxisScore.confidence` = mean |response|. A dogmatic extremist
   scores maximal "confidence"; a genuinely moderate respondent
   minimal. The UI (rightly) ignores this field in favor of coverage
   confidence — so it is dead weight with a misleading name. Remove
   it or rename (`mean_intensity`). Same for `response_variance`,
   which is the variance of |r| (inconsistency of *intensity*, not of
   direction) and is also unused.
2. **Primary links ignore `link.weight`.** `scorer.ts` uses
   `q.weight` for primaries and `link.weight` only for secondaries.
   Today the DB keeps them identical, but an admin editing a primary
   link's weight would see no effect — a silent drift hazard. Either
   read the link weight or drop the column for primaries.
3. **Coverage thresholds** (0.8/0.65/0.5, ≥8 numeric items) are
   arbitrary but transparent and conservative — fine as-is.
4. The normalization `raw / (2·Σw)` correctly maps to [−1, 1], and
   skipped axes are correctly excluded rather than zero-filled.

---

## 8. Data-quality gaps (the biggest practical risk for a 350-item survey)

A 350-item self-paced survey is a 45–90 minute task. The literature on
long self-administered instruments predicts substantial satisficing:
straightlining, speeding, and midpoint-dumping increase materially
after ~20–30 minutes (Krosnick; Galesic & Bosnjak 2009). The pipeline
currently has **no** protection:

- **No attention checks / infrequency items.** Standard practice for
  anything over ~100 items.
- **No straightlining or longstring detection.** Worse: because
  keying is perfectly balanced, a straightliner scores ≈0 on every
  axis and looks like a thoughtful centrist. They pass every
  validation screen, enter the admin population averages, and
  receive a plausible-looking "Centrist / Mixed" profile. A simple
  longstring/IRV screen on `responses` (available at submit time)
  would catch this.
- **No response-time capture.** Per-item timestamps are cheap to
  collect and are the single best satisficing signal; they also
  enable the planned empirical pruning.
- **Fatigue interacts with the shuffle.** Randomized order turns
  position effects into noise for *axis scores* (good), but the 48
  collision items land uniformly across the session, so ~half are
  answered in the fatigued back half — and each tension group has
  exactly one item (§2), so there is no within-group redundancy to
  absorb that noise.

**Recommendation (P1):** add 2–4 infrequency items, longstring +
per-item latency capture, and flag (not silently drop) suspect
sessions in `survey_results`; exclude flagged sessions from
`/admin/validation` samples and population averages.

---

## 9. Validation console: right idea, three mismatches

1. **Bank-version mixing.** The route loads *active* questions but
   pulls the latest 2000 `survey_responses` **without filtering by
   bank_version**. Live-DB ids differ per era (v2.0 = 1–300,
   v2.1 = 301–600, v2.2 = 601–950 per `question-bank-v2.md`), so
   pre-v2.2 sessions contribute no matching ids — silently deflating
   `answered`, inflating `skip_rate`, and shrinking alpha's
   complete-case count. Filter the sample to the active bank version
   (and consider surfacing per-version splits).
2. **Reliability statistics don't match the scoring model.** Alpha
   and item-rest treat all primary items of an axis equally, but
   scoring weights them 1.0/1.15/1.25 and collision items load a
   partly different construct (§3). Weighted alpha — or better,
   McDonald's omega once a factor model exists — would estimate the
   reliability of the score actually reported. Also, alpha assumes
   tau-equivalence; with deliberately heterogeneous item types,
   omega is the right target.
3. **Population averages can pool incomparable eras.** Aggregate
   views group by axis id across all results; the F5 id changed
   meaning between v1 and v2. Any admin chart or view that doesn't
   split by `bank_version` will corrupt F5 (and dilute the rest).

Also worth stating on `/admin/validation` itself: inter-axis
correlations are necessary but not sufficient for the "18 distinct
dimensions" claim — with enough n, an exploratory factor analysis is
the real test of whether C1/C2 (coordination vs distribution) and
C10/C11 (objectivity vs structure) separate empirically. They are the
likeliest merge candidates.

---

## 10. Item-design observations

1. **Dual-stimulus items.** Every item pairs the technical proposition
   with an "In other words" restatement. This is a real comprehension
   win, but it means each item presents two stimuli; where the
   restatement subtly shifts scope (e.g. softening "should be
   prohibited" into "would wait"), respondents anchor on different
   sentences and item variance mixes two readings. The restatements
   should be audited specifically for entailment-equivalence with the
   proposition, item by item (a task the AI-analysis layer is
   well-placed to assist but which currently has no check).
2. **"Assume that" premises are a strength** — they pin the
   counterfactual that respondents otherwise supply themselves (the
   classic source of spurious disagreement in scenario items). Two
   caveats: compliance is unverifiable (respondents notoriously
   reject premises they dislike — "durable exception" in the
   cognitive-interviewing literature), and premise-rejection is
   exactly what "Not sure / need more information" will absorb, so
   high per-item null rates on premised items are ambiguous between
   knowledge gaps and premise rejection. The signals layer
   (`possible_knowledge_gap`) currently reads them as knowledge gaps.
3. **The controversy layer (301–350) is well-worded** for its purpose
   (neutral framing of hot topics, both-sides formulations for C10),
   but see §4 on its premature 1.25 weight.
4. **5-point scale**: acceptable; the ordinal-as-interval treatment is
   standard. A 7-point scale would buy a little reliability per item,
   but with 18–22 items per axis the aggregate is fine — not worth a
   bank migration.

---

## 11. Prioritized fix list

| P | Fix | Where |
|---|---|---|
| **P0** | Correct the methodology page's tension-reporting claims (≥2 probes, medium/high confidence bands) to match `MIN_ANSWERED = 1` and one-item groups — or change the code to match the page | `src/app/methodology/page.tsx`, `tension-analyzer.ts` |
| **P0** | Recalibrate single-item tension vocabulary (`consistent_priority`, `strong`/`very strong`) or restore ≥2 scenarios per pair×signature | `tension-analyzer.ts`, bank migration |
| **P1** | Resolve the collision primary-link asymmetry (reduced weight, exclusion from the consistency registers, or explicit disclosure) | `scorer.ts`, `consistency.ts`, methodology page |
| **P1** | Data-quality screens: infrequency items, longstring/latency capture, flagged-session exclusion from analytics | survey page, submit route, validation route |
| **P1** | Filter `/admin/validation` sample by active `bank_version` | `api/admin/validation/route.ts` |
| **P2** | Add uncertainty framing to the consistency rating; per-axis noise threshold before surfacing gaps; register-difficulty caveat | `consistency.ts`, consistency page |
| **P2** | Justify or flatten the 1.0/1.15/1.25 tiers; drop controversy layer to 1.0 until audited | bank weights, methodology page |
| **P2** | Update stale docs (`question-bank-balance.md` census & rules, README weight description) | docs |
| **P3** | Archetype coverage: re-run the Monte Carlo at 38 archetypes / 18 axes, rebalance under-anchored poles (C2+, C9−, C5+), consider component-count shrinkage, show "based on N of 18 dimensions", distinguish "opposed" from "minimal" | `instrument.ts`, `flavor-matcher.ts`, results UI |
| **P3** | Remove/rename dead metrics (`confidence` = mean intensity, `response_variance`), dead analyzer branches, unused 0.65 tradeoff weight; make primary links read `link.weight` or drop it | `scorer.ts`, `tension-analyzer.ts`, schema |
| **P4** | When n allows: omega instead of alpha, EFA/CFA for the 18-axis structure, convergent validity against an established instrument, empirical band calibration | validation console |

---

## 12. Summary judgment

The deterministic core — balanced keying verified to the weight level,
the null-vs-neutral response contract, normalization by answered
weight, bank version pinning — is genuinely better than typical online
political tests, and the codebase is unusually candid about its
limits. The two places where the instrument currently claims more
than its data can support are (1) the tension layer, whose per-probe
labels assert consistency and strength from single Likert answers
while the public methodology page describes thresholds the shipped
bank makes unreachable, and (2) the consistency rating, which
converts unmodeled measurement error and deliberate register
differences into verdicts about the respondent. Both are fixable
mostly by relabeling and disclosure in the short term, and by bank
deepening plus empirical calibration once response volume exists.
