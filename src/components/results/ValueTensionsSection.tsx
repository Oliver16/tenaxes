import { TensionScore, QuestionWithLinks, ResponsesMap } from '@/lib/database.types'
import { getTensionQuestionDetails } from '@/lib/tension-analyzer'
import { TensionCard } from './TensionCard'

interface ValueTensionsSectionProps {
  tensions: TensionScore[]
  questions: QuestionWithLinks[]
  responses: ResponsesMap
}

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mt-0.5 text-muted-foreground"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="8" />
  </svg>
)

export function ValueTensionsSection({
  tensions,
  questions,
  responses
}: ValueTensionsSectionProps) {

  if (tensions.length === 0) return null

  // Top 6 most interesting tensions (analyzer already requires >=2
  // answered scenarios and ranks contradictions and dilemmas highest)
  const topTensions = tensions.slice(0, 6)

  return (
    <section className="mt-12 space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          How You Navigate Value Conflicts
        </h2>
        <p className="text-muted-foreground text-lg">
          Real-world decisions often pit two good things against each other.
          Here&apos;s what your responses reveal: where you hold clear priorities,
          where you weigh things case-by-case, and where your choices diverge
          from your stated ideals.
        </p>
      </div>

      <div className="space-y-8">
        {topTensions.map((tension, index) => (
          <TensionCard
            key={tension.pair_key}
            tension={tension}
            rank={index + 1}
            questionDetails={getTensionQuestionDetails(tension, responses, questions)}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-start gap-3">
          <InfoIcon />
          <div className="space-y-1 text-sm">
            <p className="font-medium">How we identify these tensions</p>
            <p className="text-muted-foreground">
              These insights come only from scenario questions that explicitly
              price one value against another (&quot;even if&hellip;&quot;, &quot;rather
              than&hellip;&quot;). Each answer reveals which value won that
              collision; we count those wins and compare them with the ideals
              you expressed in the conceptual questions. A gap between the two
              can be telling &mdash; or a place to revisit for consistency.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
