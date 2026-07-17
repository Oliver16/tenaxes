import type { QuestionWithLinks } from '@/lib/database.types'

/**
 * Question-level evidence for one axis: the strongest pulls toward each
 * pole, then the full answer lists grouped by register, all collapsed by
 * default behind native (keyboard-accessible) disclosure elements.
 */

type AnalyzedQuestion = {
  question: QuestionWithLinks
  response: number
  /** response x key x weight — signed pull along the axis. */
  contribution: number
  isOutlier: boolean
}

const RESPONSE_LABELS: Record<number, string> = {
  2: 'Strongly Agree',
  1: 'Agree',
  0: 'Neither / balanced',
  [-1]: 'Disagree',
  [-2]: 'Strongly Disagree'
}

const RESPONSE_COLORS: Record<number, string> = {
  2: 'bg-green-100 text-green-800 border-green-300',
  1: 'bg-green-50 text-green-700 border-green-200',
  0: 'bg-gray-100 text-gray-700 border-gray-300',
  [-1]: 'bg-red-50 text-red-700 border-red-200',
  [-2]: 'bg-red-100 text-red-800 border-red-300'
}

/**
 * An outlier is a strong answer pulling opposite to the register's
 * overall direction (same thresholds as the original drill-down).
 */
function analyzeQuestion(
  question: QuestionWithLinks,
  response: number,
  overallScore: number
): AnalyzedQuestion {
  const contribution = response * question.key * question.weight
  const isSignificantContribution = Math.abs(contribution) > 1.5
  const isOppositeDirection =
    (overallScore > 0.2 && contribution < -0.5) ||
    (overallScore < -0.2 && contribution > 0.5)

  return {
    question,
    response,
    contribution,
    isOutlier: isSignificantContribution && isOppositeDirection
  }
}

function QuestionCard({ item, accent }: { item: AnalyzedQuestion; accent: string }) {
  return (
    <div
      className={`p-3 rounded border ${accent} ${
        item.isOutlier ? 'ring-2 ring-amber-300 bg-amber-50' : 'bg-white'
      } text-xs`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-gray-700 flex-1">{item.question.text}</p>
        {item.isOutlier && (
          <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded-full whitespace-nowrap font-medium">
            Outlier
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded border font-medium ${RESPONSE_COLORS[item.response]}`}>
          {RESPONSE_LABELS[item.response]}
        </span>
        {item.isOutlier && (
          <span className="text-xs text-amber-700">Pulls opposite to your overall tendency</span>
        )}
      </div>
    </div>
  )
}

function DisclosureGroup({
  label,
  count,
  children
}: {
  label: string
  count: number
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <details className="group border border-gray-200 rounded-lg">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 list-none flex items-center gap-2">
        <span className="transition-transform group-open:rotate-90" aria-hidden>›</span>
        {label} ({count})
      </summary>
      <div className="px-4 pb-4 space-y-2">{children}</div>
    </details>
  )
}

export function AxisContributionList({
  axisId,
  poleNegative,
  polePositive,
  conceptualScore,
  appliedScore,
  questions,
  responses
}: {
  axisId: string
  poleNegative: string
  polePositive: string
  conceptualScore: number
  appliedScore: number
  questions: QuestionWithLinks[]
  responses: Record<number, number | null>
}) {
  const axisQuestions = questions.filter(q => q.axis_id === axisId)

  // Only numeric answers are scored; explicit null means "not sure" and
  // is listed separately.
  const conceptual = axisQuestions
    .filter(q => q.question_type === 'conceptual' && typeof responses[q.id] === 'number')
    .map(q => analyzeQuestion(q, responses[q.id] as number, conceptualScore))
  const applied = axisQuestions
    .filter(q => q.question_type === 'applied' && typeof responses[q.id] === 'number')
    .map(q => analyzeQuestion(q, responses[q.id] as number, appliedScore))
  const notSure = axisQuestions.filter(q => responses[q.id] === null)
  const outliers = [...conceptual, ...applied].filter(q => q.isOutlier)

  const answered = [...conceptual, ...applied]
  if (answered.length === 0 && notSure.length === 0) return null

  const towardPositive = answered
    .filter(q => q.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
  const towardNegative = answered
    .filter(q => q.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .slice(0, 3)
  const neutralCount = answered.filter(q => q.response === 0).length

  return (
    <div className="space-y-4">
      {/* Strongest pulls toward each pole */}
      {(towardNegative.length > 0 || towardPositive.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: `Strongest pulls toward ${poleNegative}`, items: towardNegative },
            { label: `Strongest pulls toward ${polePositive}`, items: towardPositive }
          ].map(group => (
            <div key={group.label}>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">{group.label}</h4>
              {group.items.length > 0 ? (
                <ul className="space-y-1.5">
                  {group.items.map(item => (
                    <li key={item.question.id} className="text-xs text-gray-600 p-2 bg-gray-50 rounded border border-gray-200">
                      {item.question.text}
                      <span className="block mt-1 text-gray-400">
                        {RESPONSE_LABELS[item.response]}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">No answers pulled this way.</p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {answered.length} answered
        {neutralCount > 0 ? ` (${neutralCount} neutral)` : ''}
        {notSure.length > 0 ? ` · ${notSure.length} not sure` : ''}
        {outliers.length > 0 ? ` · ${outliers.length} outlier${outliers.length !== 1 ? 's' : ''}` : ''}
      </p>

      {/* Full evidence, collapsed by default */}
      <div className="space-y-2">
        <DisclosureGroup label="Show conceptual answers" count={conceptual.length}>
          {conceptual.map(item => (
            <QuestionCard key={item.question.id} item={item} accent="border-blue-200" />
          ))}
        </DisclosureGroup>
        <DisclosureGroup label="Show practical answers" count={applied.length}>
          {applied.map(item => (
            <QuestionCard key={item.question.id} item={item} accent="border-green-200" />
          ))}
        </DisclosureGroup>
        <DisclosureGroup label="Show not-sure answers" count={notSure.length}>
          {notSure.map(q => (
            <div key={q.id} className="p-3 rounded border border-sky-200 bg-sky-50 text-xs text-gray-700">
              {q.text}
              <span className="ml-2 text-sky-700 font-medium whitespace-nowrap">— excluded from scoring</span>
            </div>
          ))}
        </DisclosureGroup>
        <DisclosureGroup label="Show outliers" count={outliers.length}>
          {outliers.map(item => (
            <QuestionCard
              key={item.question.id}
              item={item}
              accent={item.question.question_type === 'conceptual' ? 'border-blue-200' : 'border-green-200'}
            />
          ))}
        </DisclosureGroup>
      </div>
    </div>
  )
}
