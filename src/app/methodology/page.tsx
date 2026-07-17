import Link from 'next/link'
import type { Metadata } from 'next'
import { AXES } from '@/lib/instrument'
import QuestionDistribution, { getBankDistribution } from '@/components/QuestionDistribution'

export const metadata: Metadata = {
  title: 'Methodology — Polyaxis',
  description:
    'How Polyaxis works: 15 measured dimensions, a balanced question bank, tradeoff-based tension analysis, archetype matching, and ongoing psychometric validation.',
}

// Re-check the live question counts at most once an hour
export const revalidate = 3600

const coreAxes = Object.values(AXES).filter(a => !(a as { is_facet?: boolean }).is_facet)
const facetAxes = Object.values(AXES).filter(a => (a as { is_facet?: boolean }).is_facet)

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">{children}</h2>
}

export default async function MethodologyPage() {
  const distribution = await getBankDistribution()
  const totalQuestions = distribution?.totals.total ?? 286
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
          Methodology
        </p>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">How Polyaxis Works</h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Polyaxis is built on a simple conviction: two axes cannot describe a political
          mind. This page is the short version of our white paper — what we measure, how
          the questions are constructed, how scoring works, how we detect the tensions
          and contradictions in your answers, and what the honest limitations are.
        </p>

        <SectionTitle>1. What we measure</SectionTitle>
        <p className="text-gray-700 leading-relaxed mb-4">
          Polyaxis scores you on <strong>15 independent dimensions</strong>: 11 core axes
          (what you believe about how society should work) and 4 style facets (how you
          pursue those beliefs). Each dimension is bipolar — a score from −100% to +100%
          between two named poles, where 0 means balanced or conflicted, not apathetic.
        </p>

        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Core axes</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-3">Axis</th>
                <th className="py-2 px-3">One pole</th>
                <th className="py-2 px-3">The other</th>
              </tr>
            </thead>
            <tbody>
              {coreAxes.map(axis => (
                <tr key={axis.id} className="border-b last:border-0">
                  <td className="py-2 px-3 font-medium text-gray-900">{axis.name}</td>
                  <td className="py-2 px-3 text-gray-600">{axis.pole_negative}</td>
                  <td className="py-2 px-3 text-gray-600">{axis.pole_positive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Style facets</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-3">Facet</th>
                <th className="py-2 px-3">One pole</th>
                <th className="py-2 px-3">The other</th>
              </tr>
            </thead>
            <tbody>
              {facetAxes.map(axis => (
                <tr key={axis.id} className="border-b last:border-0">
                  <td className="py-2 px-3 font-medium text-gray-900">{axis.name}</td>
                  <td className="py-2 px-3 text-gray-600">{axis.pole_negative}</td>
                  <td className="py-2 px-3 text-gray-600">{axis.pole_positive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SectionTitle>2. The question bank</SectionTitle>
        <p className="text-gray-700 leading-relaxed mb-4">
          The evaluation contains <strong>{totalQuestions} statements</strong> answered on a
          five-point agree–disagree scale, in two deliberately different registers:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
          <li>
            <strong>Conceptual items</strong> state a principle in the abstract
            (&ldquo;Ecosystems and species have intrinsic value&hellip;&rdquo;). They measure
            your ideals.
          </li>
          <li>
            <strong>Applied items</strong> put you in a concrete scenario with a real cost
            attached (&ldquo;&hellip;even if it eliminates jobs&rdquo;). They measure what you
            actually choose, and they carry 25% more scoring weight because behavior under
            constraint is more informative than assent to a principle.
          </li>
        </ul>
        <p className="text-gray-700 leading-relaxed mb-4">
          Every axis has an equal number of items keyed toward each pole, so a tendency to
          agree with things (acquiescence bias) cannot masquerade as an ideology. Question
          order is shuffled per session with consecutive questions never probing the same
          axis, skipping is allowed (skipped items are excluded rather than guessed), and
          there is no time limit.
        </p>

        {distribution && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">
              How the questions are distributed
            </h3>
            <div className="rounded-lg border border-gray-200 bg-white p-5 mb-4">
              <QuestionDistribution data={distribution} variant="light" />
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              The distribution above is computed from the live question bank, not
              hand-maintained. Coverage is audited on two levels: <em>topic coverage</em>{' '}
              (which policy domains the scenarios draw from — economics, liberty, culture,
              ecology, technology, infrastructure, defense, democratic process, and more)
              and <em>conflict coverage</em> (which pairs of values the tradeoff scenarios
              actually force against each other). Every reported value tension is backed by
              at least three distinct scenarios.
            </p>
          </>
        )}

        <SectionTitle>3. Scoring</SectionTitle>
        <p className="text-gray-700 leading-relaxed mb-4">
          Each answer contributes <em>response × key × weight</em> to its axis, and the axis
          score is the weighted average normalized to −1&hellip;+1. Some questions carry
          carefully bounded <strong>secondary loadings</strong> onto a related axis (capped at
          half the question&rsquo;s weight so no axis is ever dominated by questions written
          for another). Your conceptual and applied scores are also computed separately, so
          you can see where your ideals and your choices diverge.
        </p>

        <SectionTitle>4. Value tensions — the heart of Polyaxis</SectionTitle>
        <p className="text-gray-700 leading-relaxed mb-4">
          Most political tests only ask what you believe. Polyaxis also measures what wins
          when your beliefs collide. A subset of applied items are{' '}
          <strong>tradeoff scenarios</strong>: each one explicitly prices one value against
          another (civil liberties against tech-enabled security, ecology against
          prosperity, local control against housing, tradition against personal freedom, and
          more). These items are excluded from ordinary axis scoring — choosing a side in a
          dilemma is not the same as holding a position — and analyzed separately:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
          <li>
            Every answer to a tradeoff scenario records <strong>which value won</strong> that
            collision and how decisively.
          </li>
          <li>
            Across the scenarios for a pair of values we count wins, compute a lean, and
            classify the result: a <strong>consistent priority</strong> (you reliably rank
            one value above the other), a <strong>context-dependent</strong> pattern (each
            side wins some scenarios — nuance, not noise), or no clear pattern.
          </li>
          <li>
            We then compare against your conceptual scores. If you endorse both values in
            principle, the scenarios forced a <strong>genuine dilemma</strong> — and the
            ranking they reveal is telling. If the value you profess <em>more</em> strongly
            consistently <em>loses</em>, we flag a{' '}
            <strong>contradiction with your stated ideals</strong>: possibly the most useful
            single insight the evaluation produces, whether you read it as self-knowledge or
            as a spot to revisit for consistency.
          </li>
        </ul>
        <p className="text-gray-700 leading-relaxed mb-4">
          Tensions are only reported when at least two scenarios support them, with
          confidence labeled from the number of scenarios you answered.
        </p>

        <SectionTitle>5. Archetypes</SectionTitle>
        <p className="text-gray-700 leading-relaxed mb-4">
          Your profile is matched against <strong>33 political archetypes</strong> — from
          Revolutionary Socialist to Libertarian Capitalist, Deep Ecologist to
          Eco-Capitalist, Moral Traditionalist to Libertarian Socialist. Each archetype is
          defined as a weighted set of positions across the axes; your affinity is the
          weighted average alignment between your scores and those positions. Matches are
          descriptive, not prescriptive — most people fit several archetypes partially, and
          the interesting information is usually in the spread, not the single top label.
        </p>

        <SectionTitle>6. Validation and continuous improvement</SectionTitle>
        <p className="text-gray-700 leading-relaxed mb-4">
          The instrument is engineered to be checked, not just believed. Beyond the design
          controls (balanced keying, single-construct wording, mixed agreement directions
          within every tension pair), we continuously compute item-level discrimination
          statistics, per-axis internal consistency (Cronbach&rsquo;s α), and the full
          inter-axis correlation matrix from real responses. Items that fail to discriminate
          or that cross-load onto the wrong axis get reworded or retired; the question bank
          has already been through one full audit-and-repair cycle, documented in the
          project repository.
        </p>

        <SectionTitle>7. Honest limitations</SectionTitle>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
          <li>
            <strong>Self-report.</strong> Polyaxis measures your considered answers, not your
            behavior in the world.
          </li>
          <li>
            <strong>No population norming yet.</strong> Scores are positions on the
            instrument&rsquo;s own scale, not percentiles against a representative sample.
          </li>
          <li>
            <strong>Scenario locality.</strong> Some applied scenarios assume institutions
            (federal states, private healthcare) that fit some countries better than others.
          </li>
          <li>
            <strong>A model, not a mirror.</strong> Fifteen dimensions is far richer than
            four quadrants, but any finite instrument compresses a political mind.
          </li>
        </ul>

        <SectionTitle>8. Privacy</SectionTitle>
        <p className="text-gray-700 leading-relaxed mb-8">
          The evaluation is anonymous: no login is required and no personally identifying
          information is collected. Results live at an unguessable URL that only you can
          share. An optional account exists solely to let you revisit your own results.
        </p>

        <div className="rounded-lg bg-slate-900 p-8 text-center">
          <p className="text-slate-300 mb-4">
            {totalQuestions} questions. 15 dimensions. Your contradictions included.
          </p>
          <Link
            href="/survey"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Start the Evaluation →
          </Link>
        </div>
      </div>
    </main>
  )
}
