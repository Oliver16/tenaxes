import Link from 'next/link'
import type { Metadata } from 'next'
import { AXES, FLAVOR_ARCHETYPES } from '@/lib/instrument'
import { getBankDistribution } from '@/components/QuestionDistribution'

export const metadata: Metadata = {
  title: 'Polyaxis — Your Politics, Under Pressure',
  description: 'A rigorous ideological stress test across 18 dimensions, built to reveal what you believe, what you choose, and which values win when they collide.',
  openGraph: {
    title: 'Polyaxis — Your Politics, Under Pressure',
    description: 'Not your grandmother’s political compass test. Measure your principles, choices, value tensions, and political archetypes.',
    type: 'website',
  },
}

export const revalidate = 3600

const coreAxes = Object.values(AXES).filter(axis => !('is_facet' in axis))
const facetAxes = Object.values(AXES).filter(axis => 'is_facet' in axis)

const resultCards = [
  {
    number: '01',
    title: 'Your political fingerprint',
    copy: 'A position on every core axis and style facet—not a dot stranded in somebody else’s quadrant.',
  },
  {
    number: '02',
    title: 'Your ideals under pressure',
    copy: 'See where the principles you endorse in the abstract survive a concrete cost—and where they do not.',
  },
  {
    number: '03',
    title: 'Your value hierarchy',
    copy: 'When liberty, order, equality, sovereignty, ecology, and progress collide, find out which value actually wins.',
  },
  {
    number: '04',
    title: 'Your closest archetypes',
    copy: `Compare your full profile with ${FLAVOR_ARCHETYPES.length} political types. The match is a description, not a team assignment.`,
  },
]

export default async function Home() {
  const distribution = await getBankDistribution()
  const totalQuestions = distribution?.totals.total ?? 350
  const tradeoffScenarios = distribution?.totals.tradeoffScenarios ?? 48

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.20),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.16),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.09),transparent_38%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="max-w-4xl">
            <p className="mb-6 inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
              Not your grandmother&rsquo;s political compass test
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl">
              Your politics,
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                under pressure.
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-slate-300 sm:text-2xl">
              Polyaxis is a {totalQuestions}-question ideological stress test. It measures what you believe,
              what you choose when the costs become real, and which values win when your principles collide.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400">
              No four-quadrant shortcut. No ten-question horoscope. This one asks for attention—and earns it
              with a much sharper picture of how you actually think.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/survey"
                className="rounded-xl bg-blue-500 px-7 py-4 text-center text-lg font-bold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:bg-blue-400"
              >
                Take the hard one <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/methodology"
                className="rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-center font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
              >
                Inspect the methodology
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <span>About 45 minutes</span>
              <span>Progress saves on this device</span>
              <span>No account required</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-slate-900/60">
        <div className="mx-auto grid max-w-6xl gap-px border-x border-white/10 bg-white/10 sm:grid-cols-4">
          {[
            [String(totalQuestions), 'questions'],
            ['18', 'measured dimensions'],
            [String(tradeoffScenarios), 'forced tradeoffs'],
            [String(FLAVOR_ARCHETYPES.length), 'political archetypes'],
          ].map(([value, label]) => (
            <div key={label} className="bg-slate-900 px-6 py-7 text-center">
              <div className="text-3xl font-black text-white">{value}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">A fair warning</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">This is not a personality snack.</h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-400">
              Polyaxis is deliberately long. Politics is not one argument, and rigor does not fit in a swipe deck.
              The challenge is the point: enough questions to separate a stable conviction from a reflex, a slogan,
              or one unusually strong opinion.
            </p>
            <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6">
              <p className="font-semibold text-amber-100">Not feeling faint of heart?</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Start now, stop whenever you like, and come back later. Your order and answers are saved locally
                until you finish.
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">What makes it different</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight">Most tests ask what you believe. Polyaxis makes your beliefs compete.</h2>
            <div className="mt-10 space-y-4">
              {[
                ['Declare your principles', 'Conceptual items establish your ideals without pretending that every political question is a policy scenario.'],
                ['Put a price on them', 'Applied questions introduce consequences: money, risk, institutional power, competing rights, and people who do not agree with you.'],
                ['Read the receipts', 'Separate conceptual and applied scores expose the gap between your stated ideals and your choices under constraint.'],
              ].map(([title, copy], index) => (
                <div key={title} className="group grid gap-5 rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:border-blue-400/30 hover:bg-white/[0.055] sm:grid-cols-[3rem_1fr]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-lg font-black text-blue-300">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="mt-2 leading-relaxed text-slate-400">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">The instrument</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Eighteen ways to be politically complicated.</h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-400">
              Eleven core axes map the society you want. Seven style facets map how you want power exercised,
              change pursued, knowledge trusted, and conflict handled.
            </p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.45fr_1fr]">
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">11 core axes</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {coreAxes.map(axis => (
                  <div key={axis.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="font-semibold text-slate-100">{axis.name}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <span>{axis.pole_negative}</span><span aria-hidden="true">&harr;</span><span>{axis.pole_positive}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">7 style facets</h3>
              <div className="space-y-3">
                {facetAxes.map(axis => (
                  <div key={axis.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="font-semibold text-slate-100">{axis.name}</div>
                    <div className="mt-2 text-xs text-slate-500">{axis.pole_negative} <span aria-hidden="true">&harr;</span> {axis.pole_positive}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Your payoff</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">More than a label. Much more than a dot.</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {resultCards.map(card => (
            <div key={card.number} className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-7">
              <div className="text-sm font-black text-blue-400">{card.number}</div>
              <h3 className="mt-5 text-2xl font-bold">{card.title}</h3>
              <p className="mt-3 leading-relaxed text-slate-400">{card.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-gradient-to-r from-blue-600/20 via-slate-950 to-violet-600/20">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl">Think you know what you believe?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
            Good. Now find out what happens when those beliefs have to share a room.
          </p>
          <Link
            href="/survey"
            className="mt-9 inline-block rounded-xl bg-white px-8 py-4 text-lg font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-blue-50"
          >
            Begin the evaluation <span aria-hidden="true">&rarr;</span>
          </Link>
          <p className="mt-5 text-sm text-slate-500">Anonymous by default. Optional account after you finish.</p>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Polyaxis · ideological evaluation without the shortcut</p>
          <Link href="/methodology" className="font-semibold text-slate-400 hover:text-white">How it works <span aria-hidden="true">&rarr;</span></Link>
        </div>
      </footer>
    </main>
  )
}
