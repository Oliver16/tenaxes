import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Multidimensional
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Political Compass
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Go beyond left vs. right. Discover your political profile across 10 core 
            dimensions and 3 behavioral facets with our 98-question assessment.
          </p>
          <Link
            href="/survey"
            className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/30"
          >
            Start the Survey →
          </Link>
          <p className="text-slate-400 text-sm mt-4">~15 minutes • No account required</p>
        </div>

        {/* Axes Preview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {[
            { name: 'Economic Control', left: 'State-Directed', right: 'Market-Directed', color: 'from-red-500 to-green-500' },
            { name: 'Economic Equality', left: 'Redistributionist', right: 'Property Rights', color: 'from-rose-500 to-emerald-500' },
            { name: 'Coercive Power', left: 'Security/Order', right: 'Civil Liberties', color: 'from-orange-500 to-cyan-500' },
            { name: 'Where Power Sits', left: 'Centralized', right: 'Localized', color: 'from-amber-500 to-teal-500' },
            { name: 'Cultural Orientation', left: 'Traditionalist', right: 'Progressivist', color: 'from-purple-500 to-pink-500' },
            { name: 'Group Boundaries', left: 'Particularist', right: 'Universalist', color: 'from-indigo-500 to-yellow-500' },
          ].map((axis) => (
            <div key={axis.name} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-white font-medium mb-2">{axis.name}</h3>
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>{axis.left}</span>
                <span>{axis.right}</span>
              </div>
              <div className={`h-2 rounded-full bg-gradient-to-r ${axis.color}`} />
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">10 Core Axes</h3>
            <p className="text-slate-400">
              Measure your position on economics, liberty, culture, environment, and more.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">3 Style Facets</h3>
            <p className="text-slate-400">
              Understand how you pursue your beliefs: gradual vs. radical, trusting vs. skeptical.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">25+ Archetypes</h3>
            <p className="text-slate-400">
              See which political types match your profile, from Social Democrat to Libertarian.
            </p>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="text-center">
          <div className="inline-block bg-slate-800/50 rounded-lg px-6 py-4 border border-slate-700">
            <p className="text-slate-300">
              <span className="text-green-400">🔒 Anonymous</span> — No login required. No personal data collected.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>98 questions • 10 axes • 3 facets • 25+ political archetypes</p>
          <div className="mt-4">
            <a href="/admin" className="text-slate-400 hover:text-slate-300">
              View Analytics →
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
