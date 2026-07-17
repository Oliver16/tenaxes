import Link from 'next/link'
import type { Metadata } from 'next'
import { AXES, FLAVOR_ARCHETYPES } from '@/lib/instrument'
import QuestionDistribution, { getBankDistribution } from '@/components/QuestionDistribution'

export const metadata: Metadata = {
  title: 'Methodology — Polyaxis',
  description: 'How Polyaxis v2.2 measures 18 political dimensions, scores conceptual and applied answers, analyzes value tradeoffs, and reports its limits.',
}

export const revalidate = 3600

const coreAxes = Object.values(AXES).filter(axis => !('is_facet' in axis))
const facetAxes = Object.values(AXES).filter(axis => 'is_facet' in axis)

function SectionHeading({ number, title, kicker }: { number: string; title: string; kicker?: string }) {
  return (
    <div className="mb-6 mt-16 scroll-mt-24">
      <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
        <span>{number}</span><span className="h-px w-8 bg-blue-300" />{kicker}
      </div>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
    </div>
  )
}

function AxisTable({ axes, label }: { axes: typeof coreAxes; label: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="divide-y divide-slate-100">
        {axes.map(axis => (
          <div key={axis.id} className="grid gap-1 px-5 py-3 sm:grid-cols-[1.15fr_1.5fr] sm:items-center">
            <div className="font-semibold text-slate-900">{axis.name}</div>
            <div className="text-sm text-slate-500">{axis.pole_negative} <span className="px-1 text-slate-300" aria-hidden="true">↔</span> {axis.pole_positive}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function MethodologyPage() {
  const distribution = await getBankDistribution()
  const aiAnalysisEnabled = process.env.AI_ANALYSIS_ENABLED === 'true'
  const totalQuestions = distribution?.totals.total ?? 350
  const conceptualQuestions = distribution?.totals.conceptual ?? 108
  const appliedQuestions = distribution?.totals.applied ?? 242
  const tradeoffScenarios = distribution?.totals.tradeoffScenarios ?? 48
  const tensionGroups = distribution?.totals.tensionGroups ?? 24

  return (
    <main className="min-h-screen bg-slate-50 text-slate-700">
      <section className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Polyaxis v2.2 · Methodology</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight sm:text-7xl">The machinery behind the hard test.</h1>
          <p className="mt-7 max-w-3xl text-xl leading-relaxed text-slate-300">
            Polyaxis is designed to be inspected, not taken on faith. Here is what the instrument measures,
            how the live question bank is built, what the scoring code actually does, and where the results stop being certain.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [String(totalQuestions), 'questions'],
              ['18', 'dimensions'],
              [String(tradeoffScenarios), 'tradeoffs'],
              [String(FLAVOR_ARCHETYPES.length), 'archetypes'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="text-2xl font-black">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:py-16">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm" aria-label="Methodology sections">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">On this page</p>
            <div className="space-y-2 text-slate-600">
              <a className="block hover:text-blue-700" href="#architecture">1. Architecture</a>
              <a className="block hover:text-blue-700" href="#bank">2. Question bank</a>
              <a className="block hover:text-blue-700" href="#experience">3. Taking the test</a>
              <a className="block hover:text-blue-700" href="#scoring">4. Scoring</a>
              <a className="block hover:text-blue-700" href="#tensions">5. Value tensions</a>
              <a className="block hover:text-blue-700" href="#archetypes">6. Archetypes</a>
              {aiAnalysisEnabled && <a className="block hover:text-blue-700" href="#ai-analysis">7. Deeper Analysis</a>}
              <a className="block hover:text-blue-700" href="#validation">{aiAnalysisEnabled ? '8' : '7'}. Validation</a>
              <a className="block hover:text-blue-700" href="#limits">{aiAnalysisEnabled ? '9' : '8'}. Limits & privacy</a>
            </div>
          </nav>
        </aside>

        <article className="min-w-0">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">The short version</p>
            <p className="mt-3 text-lg leading-relaxed text-slate-800">
              Polyaxis measures <strong>positions</strong> on 11 core axes and <strong>political style</strong> on seven facets.
              It asks the same mind two kinds of question—principles in the abstract and choices with consequences—then
              compares the answers. Dedicated tradeoff links reveal which value wins when two endorsed values cannot both have their way.
            </p>
          </div>

          <section id="architecture">
            <SectionHeading number="01" kicker="Instrument architecture" title="Eighteen dimensions, not one left–right line." />
            <p className="text-lg leading-relaxed">
              Each dimension is bipolar and reported from −100% to +100%. The midpoint means the weighted evidence landed
              between the two poles; it does not automatically mean apathy. Because the dimensions are scored independently,
              combinations that look unusual in a two-axis model are allowed to remain unusual.
            </p>
            <div className="mt-7 grid gap-5">
              <AxisTable axes={coreAxes} label="11 core axes · what kind of society you favor" />
              <AxisTable axes={facetAxes} label="7 style facets · how politics should be conducted" />
            </div>
          </section>

          <section id="bank">
            <SectionHeading number="02" kicker="Question bank" title="Principles first. Then the bill arrives." />
            <p className="text-lg leading-relaxed">
              The current v2.2 bank contains <strong>{totalQuestions} active items</strong>: {conceptualQuestions} conceptual and {appliedQuestions} applied.
              The two registers are intentional, because agreement with a principle and willingness to accept its consequences are different evidence.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-black text-blue-700">CONCEPTUAL</div>
                <h3 className="mt-2 text-xl font-bold text-slate-950">What should be true?</h3>
                <p className="mt-3 leading-relaxed text-slate-600">Abstract propositions establish your ideals and carry a base weight of 1.00.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-black text-amber-700">APPLIED</div>
                <h3 className="mt-2 text-xl font-bold text-slate-950">What would you actually choose?</h3>
                <p className="mt-3 leading-relaxed text-slate-600">Concrete scenarios introduce costs and competing claims. Depending on the item layer, they carry weight 1.15 or 1.25.</p>
              </div>
            </div>
            <p className="mt-6 leading-relaxed">
              Every item pairs its technical proposition with an “In other words” restatement. Many applied items also display
              an explicit “Assume that” premise, keeping the intended factual setup visible rather than hiding it in a tooltip.
              The v2.2 expansion adds 50 neutrally worded, overtly contentious items across subjects such as abortion, firearms,
              immigration, economic systems, gender identity, capital punishment, and nuclear force. These are tagged as a separate
              controversy-stress layer so their performance can be audited rather than blended invisibly into the bank.
            </p>
            <p className="mt-4 leading-relaxed">
              Primary items are balanced toward both poles within every axis to reduce agreement bias. The bank also carries semantic
              metadata for policy domain, latent conflict, actor level, and policy instrument, supporting content and coverage audits.
            </p>

            {distribution && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h3 className="mb-1 text-xl font-bold text-slate-950">The live bank, not a hand-maintained graphic</h3>
                <p className="mb-6 text-sm text-slate-500">These counts are read from the active database and refreshed periodically.</p>
                <QuestionDistribution data={distribution} variant="light" />
              </div>
            )}
          </section>

          <section id="experience">
            <SectionHeading number="03" kicker="Response design" title="Uncertainty is not fake centrism." />
            <p className="text-lg leading-relaxed">
              Responses use a five-point agree–disagree scale from −2 to +2, plus a separate “Not sure / need more information” option.
              A numeric zero means you understood the proposition and are genuinely balanced; it remains in the score denominator.
              “Not sure” is stored as null and excluded from both numerator and denominator, lowering the reported coverage for that axis.
            </p>
            <ul className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <li><strong className="text-slate-950">Order:</strong> a session-seeded shuffle is reproducible and actively spaces same-axis items apart.</li>
              <li><strong className="text-slate-950">Pacing:</strong> there is no timer, and progress saves to local storage after every answer.</li>
              <li><strong className="text-slate-950">Passing:</strong> “Skip” moves ahead temporarily; you must return and record an answer—including “Not sure”—before submission.</li>
              <li><strong className="text-slate-950">Version safety:</strong> a saved draft is only resumed against the same question-bank version.</li>
            </ul>
          </section>

          <section id="scoring">
            <SectionHeading number="04" kicker="Scoring" title="Weighted evidence, normalized by what you answered." />
            <div className="rounded-2xl bg-slate-950 p-6 text-center font-mono text-sm text-slate-200 sm:text-base">
              axis score = Σ(response × direction × effective weight) ÷ (2 × Σ effective weight)
            </div>
            <p className="mt-6 leading-relaxed">
              The result is normalized to −1…+1 and displayed as a percentage. A question&rsquo;s primary link always receives the item&rsquo;s
              full weight. Some items also have bounded secondary links to related axes; all secondary weight from one question is capped
              at half that question&rsquo;s own weight, so cross-loadings cannot overpower the construct the item was written to measure.
            </p>
            <p className="mt-4 leading-relaxed">
              Scores are calculated three ways: conceptual only, applied only, and combined. Per-axis coverage records how much available
              primary weight received a numeric answer. Coverage below 50%, or fewer than eight numeric primary responses, is marked insufficient;
              higher bands are labeled low, moderate, or high by explicit thresholds in the scoring code.
            </p>
          </section>

          <section id="tensions">
            <SectionHeading number="05" kicker="The distinctive part" title="What wins when both values cannot?" />
            <p className="text-lg leading-relaxed">
              The bank includes <strong>{tradeoffScenarios} deliberate tradeoff scenarios</strong> covering {tensionGroups} mirrored value-tension groups.
              Each has a primary axis link and a separate tradeoff link to a competing value. The primary link contributes normally to its designated
              axis; the tradeoff link does not cross-score the competing axis. Instead, it feeds the tension analyzer.
            </p>
            <div className="mt-7 space-y-4">
              {[
                ['Count the wins', 'Each numeric response records which named value won that scenario and how strongly. Neutral responses count as answered but do not award a win.'],
                ['Look for a pattern', 'Across related scenarios, the analyzer classifies the result as a consistent priority, context-dependent, or balanced. Confidence depends on how many probes were answered.'],
                ['Compare ideals with choices', 'Conceptual support is sign-adjusted for each value. The system can flag a genuine dilemma, or a case where the more strongly professed value repeatedly loses in practice.'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{copy}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-slate-500">
              A tension is reported only when at least two relevant probes were answered. Fewer than three is low confidence, three or four is medium,
              and five or more is high. “Contradiction” is a rule-based signal for reflection, not a diagnosis of hypocrisy.
            </p>
          </section>

          <section id="archetypes">
            <SectionHeading number="06" kicker="Interpretation" title="Archetypes are coordinates, not cages." />
            <p className="text-lg leading-relaxed">
              Your combined axis scores are compared with {FLAVOR_ARCHETYPES.length} named archetypes. Each archetype is a weighted pattern across selected
              axes; affinity is the weighted average alignment between your scores and that pattern. Several partial matches are expected.
              The full spread is usually more informative than the winner, and no match changes your underlying scores.
            </p>
          </section>

          {aiAnalysisEnabled && (
            <section id="ai-analysis">
              <SectionHeading number="07" kicker="Feature-flagged & opt-in" title="AI may interpret the evidence. It never creates the score." />
              <p className="text-lg leading-relaxed">
                When the optional AI-analysis feature is enabled, a respondent can explicitly consent to send their anonymous result data
                and any context they choose to add to the configured third-party AI provider. The model receives a structured evidence bundle:
                deterministic axis scores, coverage, conceptual–applied gaps, tradeoff signals, topic signals, question text, responses, and evidence IDs.
                It does not calculate, alter, or replace the Polyaxis scores.
              </p>
              <p className="mt-4 leading-relaxed">
                Provider output must match a strict versioned schema and pass a second evidence validator. Serious claims require linked question,
                axis, or tradeoff evidence; stronger labels face higher evidence thresholds. A failed output gets one constrained repair attempt and is
                rejected if it still cannot be verified. Respondents can optionally answer clarifying questions to create a separately stored refined
                interpretation without overwriting the original.
              </p>
              <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-6 text-violet-950">
                <p className="font-bold">Important boundary</p>
                <p className="mt-2 leading-relaxed text-violet-900/80">
                  Evidence-linked is not the same as infallible. AI interpretations can be blunt, mistaken, or overconfident, and optional free-text context
                  may be reflected indirectly in the report. The consent screen states both limits before any provider request is made.
                </p>
              </div>
            </section>
          )}

          <section id="validation">
            <SectionHeading number={aiAnalysisEnabled ? '08' : '07'} kicker="Quality control" title="The instrument can be challenged with data." />
            <p className="text-lg leading-relaxed">
              The repository includes an administrator validation console that computes item response rates, item–rest discrimination,
              per-axis Cronbach&rsquo;s alpha, and inter-axis correlations from stored response sets. Those diagnostics make weak, redundant,
              or cross-loading items visible for revision. The bank also has versioned migrations and documented content, balance, and conflict-coverage audits.
            </p>
            <p className="mt-4 leading-relaxed">
              These facilities are infrastructure for validation, not proof that validation is finished. Reliability estimates are unstable at small samples,
              correlation does not establish construct validity, and item revisions can change the meaning of a score. That is why submitted results retain their bank version.
            </p>
          </section>

          <section id="limits">
            <SectionHeading number={aiAnalysisEnabled ? '09' : '08'} kicker="Honest limits" title="A rigorous model is still a model." />
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Self-report', 'Polyaxis measures considered answers in this setting, not observed political behavior.'],
                ['No population norms yet', 'Scores are positions on this instrument—not percentiles against a representative public sample.'],
                ['Scenario locality', 'Some institutional assumptions fit certain countries and political systems better than others.'],
                ['Finite constructs', 'Eighteen dimensions preserve far more structure than four quadrants, but they still compress a political mind.'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="text-lg font-bold text-emerald-950">Privacy and persistence</h3>
              <p className="mt-2 leading-relaxed text-emerald-900/80">
                You do not need an account to take the evaluation. Draft progress stays in this browser&rsquo;s local storage. On submission,
                the app stores your responses and computed results under a randomly generated session ID so the results page can be revisited and shared.
                If you choose to create or use an account, that result can be linked to your profile for history across devices.
              </p>
            </div>
          </section>

          <div className="mt-16 rounded-3xl bg-slate-950 p-8 text-center text-white sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">Method inspected?</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Now put your own politics through it.</h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">{totalQuestions} questions. No timer. Your contradictions included.</p>
            <Link href="/survey" className="mt-7 inline-block rounded-xl bg-blue-500 px-8 py-4 font-bold text-white transition hover:bg-blue-400">
              Start the evaluation <span aria-hidden="true">→</span>
            </Link>
          </div>
        </article>
      </div>
    </main>
  )
}
