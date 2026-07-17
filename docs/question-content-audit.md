# Question Content & Ordering Audit (Round 5)

> **Implementation status:** the P0 shuffle fix shipped with this
> audit; the P1 de-duplication and P2 depth/coverage work shipped in
> `supabase/migrations/20260717030000_balance_question_bank.sql` — see
> `question-bank-balance.md` for the balance policy, the final
> distribution, and the conflict-coverage census. One correction to
> §3.3 below: tension pairs must be counted per **pair × pole
> signature** (the analyzer's real grouping), which revealed a
> fourth under-minimum group this table missed (C3×C5 −1, "secular
> neutrality vs religious liberty", n=2 — now 4). Wording similarity
> is demoted to a tertiary screen in the balance policy; conflict
> coverage is the primary lens.

**Date:** 2026-07-17
**Scope:** all 264 active questions (source of truth:
`supabase/fresh_install.sql`, verified dump of the live bank), the
survey ordering mechanics (`src/app/survey/page.tsx`,
`src/lib/shuffle.ts`), item similarity/redundancy, and per-axis depth.
Complements `question-bank-audit.md` (rounds 1–4), which covered the
scoring and tension methodology; this round is about the *content* the
respondent actually experiences.

**TL;DR:**

1. Similar questions appearing back-to-back was **not intentional** —
   the survey uses an unconstrained uniform shuffle, which produces
   ~18 same-axis adjacent pairs per session on average. Fixed on this
   branch with an axis-spacing shuffle (residual ≈ 0.15 per session).
2. The bank contains **~13 high-severity near-duplicate pairs** (same
   axis, same key, near-identical content), two C10 applied-item
   templates repeated 3–4×, and several pure mirror-negation pairs —
   together these are what makes the survey feel repetitive.
3. Categories genuinely are uneven: **C2 has 26 items; F4 and F5 have
   10 each** (~1.6× noisier scores), C6 is the thinnest core axis, and
   two tension pairs are below the reporting bar (C7×F5 can *never*
   report with only 1 scenario).

---

## 1. Ordering: why similar questions appeared close together

### 1.1 How ordering works today

`src/app/survey/page.tsx` loads all active questions, sorts by
`display_order` (only to make the input deterministic — this order is
never shown), then applies `seededShuffle(data, sessionId)`: a
Fisher–Yates shuffle seeded with the per-session nanoid. Every session
gets a different but reproducible order, and **no constraint prevents
related questions from landing adjacent**.

### 1.2 How often it happens (simulation, 2,000 sessions)

With 264 items across 15 axes (largest axis = 26 items):

| Metric | Uniform shuffle (before) |
|---|---|
| Same-axis *adjacent* pairs per session | **mean 17.8** (range 3–36) |
| Same-axis pairs within 3 positions | mean ~53 |

So in a typical session the respondent hits two consecutive questions
probing the same axis ~18 times — and that count doesn't include
cross-axis items that share a *topic* (see §2.4), which read as
duplicates even when they measure different things.

### 1.3 Fix (implemented on this branch)

`seededShuffleSpaced(array, seed, groupOf)` in `src/lib/shuffle.ts`:
same seeded shuffle, followed by a deterministic left-to-right repair
pass that swaps any item sharing an axis with its left neighbor to the
next position where it fits. Verified over 2,000 random seeds against
the real bank composition:

| Metric | Before | After |
|---|---|---|
| Same-axis adjacent pairs / session | 17.8 | **0.15** (worst seed: 2) |

Still deterministic per session ID, still O(n·k), no items lost or
duplicated. Axis spacing does **not** space shared *topics* across
different axes (e.g. two housing scenarios keyed to C4 and C9 can still
meet); that needs topic tags — see P3 in §5.

---

## 2. Similarity audit ("several seemed similar")

**Method:** TF-IDF cosine screen over all 34,716 item pairs, plus a
full manual read of all 264 items grouped by axis/key. Severity is
about respondent experience and measurement value: a *high* pair reads
as the same question asked twice and yields highly correlated
responses (wasted burden, inflated apparent reliability).

### 2.1 High-severity near-duplicates (same axis, same key)

| Items | Axis/key | Content | Recommendation |
|---|---|---|---|
| **119 vs 258** | C6+ appl | Ethnic scholarship "opened to all qualified students" vs "strictly colorblind" admissions/hiring | Retire 119 or re-scope it away from admissions; it also overlaps the C2 race-policy items 257/260 (§2.5) — the bank asks this debate 4–5 times |
| **139 vs 191** | F1+ appl | Activists "block traffic or disrupt businesses" vs "occupying buildings or blocking major roads" — near-verbatim; #109 (C3+) is the *same* road-blocking scenario a third time | Reword 191 to a non-street-protest tactic (strike, boycott, encampment); C3×F1 tension pair keeps n=4 |
| **66 vs 70** | C9− conc | "Natural world exists as a resource for human use" vs "Nature's primary value lies in the resources and services it provides" | Retire one; replace with a distinct anthropocentric item (e.g. stewardship-for-human-benefit) to preserve key balance |
| **87 vs 89** | F2+ conc | Institutions "routinely mislead the public" vs leaders "more interested in protecting their position" (applied 145 is a third restatement) | Reword 89 toward a distinct facet of distrust (capture, incompetence) |
| **26 vs 28** | C4+ conc | States "pass laws that differ from national policy" vs regions "experiment with different policies" | Merge; author a replacement on an untouched C4+ facet |
| **29 vs 31** | C4− conc | National standards "guarantee equal rights everywhere" vs local autonomy causes "unequal treatment across regions" — same claim, mirrored phrasing | Reword 31 toward coordination/fragmentation costs instead of equality |
| **57 vs 60** | C8− conc | Tech "creates new problems as fast as it solves" vs "unintended consequences often worse than the problems addressed" | Retire or reword one (flagged by cosine screen at 0.40, highest same-axis score) |
| **45 vs 48** | C6+ conc | Obligations to strangers "just as strong as neighbors" vs wellbeing "shouldn't depend on where born" (47 is close behind) | Reword one; C6+ conceptual is four restatements of the same universalist sentence |
| **122 vs 174** | C6− appl | Business owner prefers "hiring people from their own community" vs "citizens and veterans should get priority" in hiring | Move 174 out of hiring (e.g. "buy national" procurement) |
| **149 vs 199** | F3+ appl | Non-violent crimes: "programs … work better than jail time" vs drug offenses: "treatment … over prison" | Retire one, or split by severity so they discriminate differently |
| **124 vs 203** | C7+ appl (both tradeoff C2−) | Global minimum corporate tax vs global tax-haven crackdown | Don't retire (C2×C7 tension pair would drop to n=2) — reword 203 to a non-tax scenario with the same poles, e.g. labor standards in trade agreements |
| **176 vs 209** | C7+ appl (both tradeoff C3−) | WHO binding travel restrictions vs internationally required digital health passes — both pandemic-authority | Same constraint (C3×C7 pair n=3): reword 209 out of the pandemic frame (e.g. cross-border biometric watchlists) |
| **178 vs 211** | C7+ appl (both tradeoff C8−) | Global treaty limiting autonomous weapons/military AI vs binding international AI safety limits | Same constraint (C7×C8 pair n=3): reword 211 to a different technology (e.g. geoengineering moratorium) |

### 2.2 "Applied" items that are actually conceptual restatements

These carry `question_type = 'applied'` (weight 1.25) but pose no
concrete scenario, so they duplicate a conceptual sibling *and* get
extra weight for it:

- **142** (F1−) "Dramatic political changes usually backfire…" ≈ conceptual **86** "Revolutionary movements usually cause more suffering…". Rewrite as a real scenario (e.g. prefer a slower bipartisan bill over a sweeping executive order that the next administration could reverse).
- **146** (F2−) "universities, courts, and scientific institutions are genuinely trying to pursue truth" ≈ conceptual **90** "institutions … genuinely trying to do the right thing". Rewrite around a concrete event.
- **145** (F2+) "Exposed scandals probably represent just a fraction of institutional wrongdoing" — restates 87/89; no scenario.

### 2.3 Template reuse (C10 applied bank)

Two sentence templates cover 7 of C10's 10 applied items:

- *"Different cultures reach different conclusions and both can be valid"* ×4: **135** (end-of-life), **137** (abortion), **187** (hate speech), **189** (death penalty).
- *"Practice X is wrong everywhere regardless of culture"* ×3: **136** (arranged teen marriage), **138** (worker exploitation), **188** (genital cutting).

Respondents notice templates quickly, and templated items yield
correlated answers (less information per item than the count suggests).
Recommend capping each template at 2 and rewriting one of 187/189 into
a first-person decision scenario.

### 2.4 Cross-axis felt-duplicates and construct bleed

Different constructs, but the respondent experiences a repeat:

- **53 (C7+) vs 221 (F4+):** "International courts should be able to override national laws that violate human rights" vs "Courts should be able to strike down laws passed by large democratic majorities when those laws violate fundamental rights." Highest cross-axis cosine in the bank (0.47). Both constructs are legitimate; reword 221 to name a *domestic constitutional court* and vary the sentence shape. Expect high C7–F4 correlation; verify at `/admin/validation`.
- **109 (C3+) vs 139/191 (F1+):** three block-the-road protest scenarios (see §2.1).
- **159 (C3+) vs 179 (C8+):** citywide facial-recognition cameras vs citywide sensor networks — both "blanket urban surveillance for safety/efficiency."
- **69 (C9+)** is double-barreled ("future generations **and** non-human life") and now collides with round-4's dedicated intergenerational items **262/263**. Drop "future generations" from 69 so the constructs stay separate.
- **258 (C6+) vs 260 (C2+):** "strictly colorblind" vs "group preferences are unfair" — the same opinion keyed to two different axes. This is the round-4 intentional split awaiting item-rest evidence; fine to keep, but it *will* read as a repeat until one is retired.
- Topic concentration compounds all of this: hand-verified clusters include **affordable housing/zoning ~11 items across 6 axes** (105, 151, 155, 163, 186, 207, 208, 215, 216, 246, 248), **schools/education ~13 items across 6 axes** (108, 114, 115, 119, 130, 165, 168, 169, 170, 220, 241, 257, 258), **AI ~9**, **taxes ~10**, **pandemic ~7**. Axis spacing can't separate these (different axes); if it still feels repetitive after this branch, add a `topic` tag and space on axis+topic.

### 2.5 Pure mirror-negations (same content, opposite key)

Reverse-keyed items are *required* for acquiescence control, but a pure
negation of an existing item adds little information and is the other
big driver of "didn't I just answer this?". Worst offenders:

- **2 vs 5** (C1): market prices for essentials vs price controls on necessities
- **18 vs 23** (C3): offensive speech legal vs harmful speech prohibited
- **223 vs 224** (F4): "too technical … delegate to experts" vs "citizens, not experts … even on complex issues"
- **121 vs 172** (C6 appl): donate surplus abroad by need vs fund domestic recovery first
- **115 vs 170** (C5 appl): teach diverse family forms vs avoid nontraditional-lifestyle topics

Recommendation: keep each axis key-balanced, but make the reversed item
a different *manifestation* of the opposite pole rather than a negation
of the same sentence. Lower priority than §2.1 — mirrors at least
serve consistency-checking.

### 2.6 Mild same-axis clusters (acceptable; revisit with data)

1 vs 4 (C1+); 34 vs 36 (C5+); 81 vs 83 (F1+); 93 vs 95 (F3+); 96 vs 97
(F3−); 231 vs 233 (F5+); C10 conceptual triplets 74/75/77 and 73/78/80
(inherent to an abstract axis). Leave these to empirical pruning: once
`/admin/validation` has volume, inter-item correlations will show which
member of each cluster is redundant.

---

## 3. Category balance ("some categories seemed light")

### 3.1 Depth per axis

| Axis | Name | Conceptual | Applied | Total | Scoring bandwidth* |
|---|---|---|---|---|---|
| C2 | Economic Equality | 8 | 18 | **26** | 31.9 |
| C3 | Coercive Power | 8 | 16 | 24 | 29.1 |
| C7 | Sovereignty Scope | 8 | 14 | 22 | 27.1 |
| C5 | Cultural Orientation | 8 | 13 | 21 | 26.9 |
| C9 | Nature's Moral Weight | 8 | 12 | 20 | 24.1 |
| C1 | Economic Control | 8 | 10 | 18 | 23.1 |
| C4 | Where Power Sits | 8 | 10 | 18 | 20.5 |
| C8 | Technology Stance | 8 | 10 | 18 | 21.7 |
| C10 | Moral Epistemology | 8 | 10 | 18 | 21.5 |
| C6 | Group Boundaries | 8 | 9 | **17** | 21.0 |
| F1 | Change Strategy | 6 | 8 | 14 | 17.0 |
| F2 | Institutional Trust | 6 | 8 | 14 | 16.9 |
| F3 | Justice Style | 6 | 8 | 14 | 16.0 |
| F4 | Decision Authority | 6 | 4 | **10** | 11.0 |
| F5 | Force & Peace | 6 | 4 | **10** | 11.0 |

\* Effective weight as the scorer computes it: primary links at full
question weight + secondary links capped at 0.5× (tradeoff links score
nothing).

Findings:

- **C2 has 2.6× the items and 2.9× the bandwidth of F4/F5.** Score
  noise scales ~1/√weight, so F4/F5 scores are roughly 1.6–1.7× noisier
  than C2's. F5 is *displayed as a core axis* (per the
  `instrument.ts` note) yet has the depth of half a facet — if it's
  core-tier in the UI, it deserves core-tier depth (≥6 applied items).
- **C6 is the thinnest core axis** (17), and two of its nine applied
  items (119, 258) are the race-policy debate that arguably belongs to
  C2 — genuine in-group-loyalty scenarios (local trade preferences,
  diaspora obligations, club membership) are underrepresented.
- The user impression that "some categories seemed light" is correct:
  in a shuffled 264-item run, F4/F5 items appear roughly once every 26
  questions vs once every 10 for C2.

### 3.2 Key-balance drift

Round 1 praised "perfect key balance"; rounds 2–4 broke it slightly.
Primary items: C2 is 12+/14−, C5 10+/11−, C6 9+/8− (all others
balanced). Including secondary links, net scoring-link skew per axis:
**C1 −3, C2 −5, C6 −2, C9 +2, F1 +2, F2 +2** (all others 0/±1). The
skew means acquiescence bias (yes-saying) nudges scores toward
state-directed, redistributionist, particularist, ecocentric, radical,
and institution-skeptical poles respectively. Small but systematic —
when retiring §2.1 duplicates, retire/reword in key-balanced sets and
prefer restoring these axes to ±0.

### 3.3 Tension-pair coverage

Current tradeoff scenarios per unordered pair (analyzer requires
**≥2 answered** to report at all; the round-2 editorial bar is ≥3):

| Pair | n | Status |
|---|---|---|
| C2×C9 | 10 | ✅ |
| C3×C8 | 6 | ✅ |
| C1×C2, C3×C5, C3×F1 | 5 | ✅ |
| C2×C7, C2×C3, C2×C4, C3×C7, C7×C8, C8×F2, C10×C7 | 3 | ✅ at the bar — retiring any member drops reporting confidence; reword instead (§2.1) |
| **F2×F4** | **2** | ⚠️ Reports only when both answered, always "low" confidence; below the round-2 bar |
| **C7×F5** | **1** | ❌ Below `MIN_ANSWERED = 2` — **can never report**. Question 239's tradeoff tag currently produces nothing |

---

## 4. What was implemented on this branch

- `seededShuffleSpaced` in `src/lib/shuffle.ts` + survey page switched
  to it: no two consecutive questions share an axis (verified over
  2,000 seeds: mean residual 0.15 adjacent pairs vs 17.8 before;
  deterministic per session).
- This document.

Content changes (retirements/rewordings) are deliberately **not**
included: they alter the live instrument and its key balance, and
several are constrained by tension-pair minimums, so they should ship
as one reviewed migration (see P1).

## 5. Recommendations (prioritized)

- **P0 — shipped here:** axis-spaced shuffle.
- **P1 — de-duplication migration:** apply §2.1 (reword where the
  tension pair sits at n=3: items 203, 209, 211; retire/reword the
  rest), §2.2 scenario rewrites (142, 145, 146), the 69 double-barrel
  fix, and the 221 rewording — in key-balanced sets per axis,
  restoring the §3.2 skews to ±0. Net effect: ~8–10 items reworded,
  ~4–6 retired, bank ~258–260 items.
- **P2 — depth:** +2 applied items each for F4 and F5 (bringing both
  to 12), including 1–2 more C7×F5 tradeoffs (so the pair can report)
  and a third F2×F4 scenario; +2 genuinely-C6 applied items to
  compensate for 119/258 belonging to the race-policy cluster.
- **P3 — repetitiveness beyond axes:** add a nullable `topic` tag to
  questions and extend the spaced shuffle to axis+topic; cap the C10
  templates at 2 each. Consider a short-form mode before adding any
  more items — at 264, burden remains the binding constraint
  (round 4's conclusion stands).
- **P4 — empirical:** once `/admin/validation` has response volume,
  use inter-item correlations to adjudicate the §2.6 mild clusters and
  the 258-vs-260 axis split, and re-check the predicted C7–F4
  correlation from item 53 vs 221.

---

## Appendix: methodology

- Bank extracted from `supabase/fresh_install.sql` (264 questions, 350
  axis links) — the verified dump of the live DB state, not the drifted
  `instrument.ts` fallback.
- Similarity: TF-IDF cosine over stemmed, stopworded item texts across
  all pairs (top screen threshold 0.32), then a manual read of all 264
  items grouped by axis and key — most true near-duplicates are
  paraphrases that lexical screens miss, so the manual pass is the
  authoritative source for §2.
- Adjacency: Monte Carlo over 2,000 seeded sessions using the actual
  shuffle implementations against the real axis distribution.
- Effective weights mirror `scorer.ts` exactly (primary = full weight,
  secondaries capped at 0.5×, tradeoffs excluded).
