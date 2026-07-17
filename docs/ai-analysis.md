# AI-assisted interpretation

Polyaxis can optionally generate a candid, evidence-linked interpretation of a
completed result. This layer interprets verified output; it is not a new scorer.
The deterministic Polyaxis scores, coverage, conceptual/applied comparisons,
collision classifications, and archetype affinities remain authoritative.
It is labeled **AI-assisted interpretation**, not a diagnosis, clinical profile,
or definitive judgment of character; every interpretation can be wrong.

The feature is off by default and does not run merely because somebody opens a
result URL. A respondent must read the disclosure, consent, and explicitly
request generation.

## Architecture

The on-demand pipeline is:

1. The server loads the result through `loadResultAnalysis(sessionId)`, retaining
   its stored bank version and null-safe response semantics.
2. `load-ai-analysis-context.ts` loads only questions and metadata belonging to
   those bank-pinned question IDs. Missing metadata on an older result degrades
   to null fields rather than switching to the active bank.
3. `signals.ts` computes topic engagement, center shape, and candidate tensions.
   These deterministic signals narrow the model's task and preserve the
   distinction between neutral (`0`) and `Not sure` (`null`).
4. `build-context.ts` constructs a minimized provider payload. It includes
   authoritative scores and evidence, but no session ID, account information,
   email, IP address, or auth claims.
5. The canonical payload and provider configuration are hashed. A matching
   completed row is returned without another provider call.
6. The selected adapter asks OpenAI or Anthropic for the same schema-constrained
   report. There is no silent provider fallback.
7. Zod validates the shape, then `evidence-validator.ts` verifies every cited
   question, axis, and collision pair against the loaded result. Invalid output
   receives one repair attempt; a second failure is stored safely as failed.
8. A validated report is stored in `result_ai_analyses` and rendered through the
   server API. Raw deterministic context and user context are never returned by
   the GET endpoint.

The primary implementation is under `src/lib/ai-analysis/`. Generation and
retrieval use `/api/results/[sessionId]/ai-analysis`; the user experience is at
`/results/[sessionId]/analysis`.

## Configuration

Copy `.env.example` to `.env.local`. These values are server-only unless their
name already begins with `NEXT_PUBLIC_` for the normal Supabase browser client.

| Variable | Purpose | Default/example |
|---|---|---|
| `AI_ANALYSIS_ENABLED` | Master feature flag; only the exact string `true` enables generation | `false` |
| `AI_ANALYSIS_PROVIDER` | Selected adapter: `openai` or `anthropic` | `openai` |
| `AI_ANALYSIS_PROMPT_VERSION` | Cache/provenance version for prompt behavior | `v1` |
| `OPENAI_API_KEY` | OpenAI server credential, required when OpenAI is selected | empty |
| `OPENAI_ANALYSIS_MODEL` | Explicit OpenAI model ID | empty |
| `ANTHROPIC_API_KEY` | Anthropic server credential, required when Anthropic is selected | empty |
| `ANTHROPIC_ANALYSIS_MODEL` | Explicit Anthropic model ID | empty |
| `AI_ANALYSIS_MAX_REGENERATIONS` | Maximum completed generations per session in a rolling 24 hours | `3` |
| `AI_ANALYSIS_CONTEXT_MAX_CHARS` | Maximum initial free-form context length | `2000` |
| `AI_ANALYSIS_TIMEOUT_MS` | Per-provider-attempt abort timeout in milliseconds | `60000` |
| `RUN_LIVE_AI_EVALS` | Opt-in switch for development-only provider evaluations | `false` |

The selected provider must have both its key and model configured. Missing
configuration produces a safe unavailable state; it must not break deterministic
result routes or reveal environment variable names to a visitor. Never rename
provider credentials with a `NEXT_PUBLIC_` prefix.

The repository uses the official `openai` and `@anthropic-ai/sdk` packages.
OpenAI generation uses the Responses API with strict structured output,
`store: false`, no search, and no external tools. Anthropic generation forces a
single `submit_polyaxis_analysis` schema tool. Both adapters apply a timeout,
capture available usage/provenance, and validate against the same Zod schema.

## Structured report contract

Schema version `1` produces a `PersonalizedAnalysis` with:

- a headline, executive summary, and overall coherence/engagement assessment;
- three to six defining commitments with evidence references;
- explanations for center-shaped axes;
- up to eight classified tension findings;
- engagement and knowledge findings by policy domain;
- domain-specific exceptions and their analogous-case test;
- blind spots, up to five clarifying questions, reflection questions, and
  limitations;
- a stage of `provisional` or `refined`.

Serious findings contain the exact principle, conflicting pattern, confidence,
both coherent and critical interpretations, a generalization test, and IDs for
the supporting axes/questions/pairs. The language model cannot add or change a
score. The server rejects unknown or wrong-bank evidence rather than quietly
removing a citation while retaining its claim.

## Candor taxonomy and evidence thresholds

Tensions use these exact classifications:

- `principled_domain_exception`: a different domain follows a coherent,
  generalizable rule and materially different facts.
- `coherent_tradeoff`: two endorsed values conflict in a real scenario and one
  receives a defensible priority.
- `context_dependent_preference`: the rule legitimately changes with relevant
  circumstances or stakes.
- `unresolved_inconsistency`: the answers conflict and no supported distinction
  yet resolves them.
- `selective_application`: a principle is unevenly applied in ways correlated
  with preferred outcomes, but hypocrisy is not yet established.
- `possible_hypocrisy`: a strongly supported broad principle has at least two
  independent applied violations favoring the respondent's side, with at least
  medium confidence and no evident general rule.
- `likely_hypocrisy`: at least two independent principle items and two
  independent violations span multiple families, scenarios, or domains;
  coverage and confidence are high; a favored side benefits; and plausible
  principled exceptions were explicitly considered and found weak.
- `irrational_tension`: two commitments cannot jointly be true or implemented
  under the same premises. The report must state both premises, the short
  contradiction, and a distinction that could reconcile them.
- `insufficient_evidence`: coverage, item independence, or wording is too weak
  to support the stronger claim.

One response can establish an outlier or possible exception, never a stable
character verdict. `likely_hypocrisy` needs at least four evidence questions and
high confidence. `irrational_tension` needs two independent incompatible
commitments. Low-coverage axes cannot be described as definitive.

### Domain-specific exception test

A deviation from a broad ideology is not automatically hypocrisy. The report
must ask:

1. Is there a rule that makes the exception generalizable?
2. Would the same rule be applied to analogous cases?
3. Are the factual assumptions mutually compatible?
4. Is the exception applied consistently?
5. Is a universal principle being dropped only when it becomes personally or
   politically costly?

For example, support for public ownership of electricity can be coherent with a
general market orientation when the rule concerns natural monopolies, network
infrastructure, reliability, externalities, national security, or unusually
long-lived capital. Applying that logic only to a favored employer while
rejecting analogous water, transmission, or rail cases instead raises
selective-application or self-serving-risk evidence.

## Deterministic engagement signals

Topic metrics group bank-pinned evidence by `policy_domain`. A numeric answer
includes neutral `0`; `null` is `Not sure` and is never converted to zero.
`mean_intensity` is the mean of `abs(response) / 2` over numeric responses.

Named v1 thresholds are:

| Signal | Deterministic threshold |
|---|---|
| Insufficient evidence | Fewer than 4 recorded items, or fewer than 3 numeric and fewer than 2 `Not sure` answers |
| Possible knowledge gap | At least 4 recorded; `Not sure` rate at least 0.35; at least 2 `Not sure` answers |
| Apparent low salience | At least 5 numeric; neutral rate at least 0.45; intensity at most 0.35; `Not sure` rate below 0.25 |
| Strongly engaged | At least 4 numeric; intensity at least 0.65; strong-answer rate at least 0.30 |
| Counterbalanced convictions | At least 5 numeric; intensity at least 0.55; each pole has at least 0.30 of directional contribution; absolute net contribution at most 0.20 |

Low salience therefore means enough numeric answers, many deliberate neutrals,
and low intensity. A knowledge-gap candidate instead means frequent `Not sure`
answers and weak coverage. Neither permits an inference about intelligence.
Possible avoidance or ambivalence is only a model-reviewed candidate: it requires
at least four numeric controversy-stress answers in a topic, a neutral rate of at
least 0.50 on those items, a `Not sure` rate below 0.20, a related conceptual
absolute score of at least 0.40, and noncontroversial applied intensity of at
least 0.50. The model must still review whether selective neutrality actually
reflects avoidance, ambivalence, discomfort, or deliberate moderation.
For this candidate only, v2.2 controversy probes are collected by their shared
`latent_conflict` label because each stress scenario can have a deliberately
narrow `policy_domain`; ordinary topic metrics remain policy-domain based.

Profile-level `selectively_engaged` requires at least two strongly engaged topics
and at least two low-salience or possible-knowledge-gap topics.

## Center scores

An axis with `abs(score) >= 0.20` is not center-shaped. Below that boundary, the
deterministic engine distinguishes:

- `insufficient_evidence` when existing scorer reliability is insufficient;
- `uncertain_center` when the axis `Not sure` rate is at least 0.25;
- `low_intensity_center` when intensity is at most 0.35 and neutral rate is at
  least 0.40;
- `counterbalanced_center` when intensity is at least 0.55 and each pole receives
  at least 0.30 of directional weighted contribution;
- `contextual_center` when the conceptual/applied gap is at least 0.30 or policy
  domains lean strongly in opposite directions.

This prevents strong offsetting convictions from being summarized as apathy or
generic centrism.

## Clarification and refinement

A provisional analysis can ask up to five targeted clarifying questions. The
respondent may answer any subset and request refinement. Refinement uses the
same deterministic context, the provisional classifications, all retained prior
context, and the new answers, then inserts a separate `refined` row whose `parent_analysis_id` points
to the provisional row. The original is retained. Context can reconcile,
strengthen, or leave a finding unchanged; it is not accepted automatically.

Initial context is limited to 2,000 characters by default. Each clarification
answer is limited to 1,000 characters and at most five answers are accepted.

## Caching and generation limits

The canonical SHA-256 cache identity includes bank version, responses,
authoritative results, coverage, collisions, deterministic signals, context,
clarification answers, provider, model, prompt version, and schema version. It
excludes timestamps, session ID, unrelated row IDs, and provider request IDs.

A completed unique index prevents duplicate cached rows, and a partial unique
index permits only one pending generation per session. Cached reads never consume
the rolling limit or call a provider. At most three completed generations per
session are allowed in a rolling 24-hour window by default. Ordinary clients
cannot force regeneration.

Changing UI code does not invalidate a report. Changing evidence, user context,
provider/model, prompt version, or schema version does. A report generated under
different current configuration is marked stale rather than silently presented
as current.

## Privacy and storage

- Provider payloads exclude session ID, user ID, email, IP, auth claims, and
  saved-account metadata.
- The model is told not to infer sensitive traits and to abstract volunteered
  identifying details.
- API keys, the Supabase service role, generation, and database access remain
  server-side.
- OpenAI request storage is disabled. No adapter may add web search, file search,
  or external tools.
- Application logs may contain provider/model, latency, token usage, safe error
  categories, hash prefixes, and a hashed session identifier. They must not
  contain full prompts, provider output, raw answer maps, or user context.
- `context_json` and deterministic signals are stored for provenance/refinement,
  but are not returned to the shared result page.
- `result_ai_analyses` has RLS enabled, no client policies, and revoked
  `anon`/`authenticated` table privileges. Server routes use the service role.

Delete is intentionally not exposed until ownership semantics are defined.

## Database installation

Fresh Supabase projects receive the table from `supabase/fresh_install.sql`.
Existing v2.2 projects should apply
`supabase/migrations/20260717180000_add_result_ai_analysis.sql`. See
`docs/supabase-migration.md` for ordering, export, and verification guidance.
After applying it, run `supabase/ai_analysis_post_install_checks.sql`; the checks
roll back their synthetic rows and verify constraints, cache/pending uniqueness,
RLS, grants, and the rolling-cap index.

## Evaluation and tests

Ordinary tests use mocks and never call a live provider:

```bash
npm test
```

The synthetic fixtures cover a principled public-utility exception, a
self-serving utility exception, repeated free-speech selectivity, an impossible
fiscal package, a counterbalanced economic center, low salience, a knowledge
gap, and controversy avoidance/ambivalence.

The development evaluation harness runs without provider calls by default:

```bash
node scripts/evaluate-ai-analysis.mjs
```

To intentionally incur live provider usage, configure the selected provider and
run with `RUN_LIVE_AI_EVALS=true`. Review generated output under the harness's
gitignored temporary directory and inspect reported expected-classification
mismatches. Never enable live evaluations in ordinary CI.

## Prompt and schema versioning

Prompt behavior lives in versioned prompt modules such as
`src/lib/ai-analysis/prompts/v1.ts`. Increment `AI_ANALYSIS_PROMPT_VERSION` when
instructions change in a way that should invalidate the cache. Increment the
structured schema version when the JSON contract changes, and retain readers for
stored historical rows where practical. Provider/model changes already form part
of cache identity and provenance.

To disable the feature, set `AI_ANALYSIS_ENABLED=false` (or remove it) and
redeploy. Existing deterministic results remain fully available; provider
configuration failures must never break unrelated result routes.
