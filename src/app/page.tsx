'use client'

import { useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'

// These match the actual industry names in the database
const INDUSTRIES = [
  'Enterprise Software', // Maps to SaaS
  'FinTech',
  'Healthcare & Bio',
  'Climate & Sustainability',
  'Data & AI',
  'Consumer Internet & Commerce',
  'DevTools & Infrastructure', // Maps to Deep Tech
  'Web3',
  'Media & Entertainment',
  'Industrial & Robotics',
]

export default function Home() {
  const [aboutYou, setAboutYou] = useState('')
  const [aboutStartup, setAboutStartup] = useState('')
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  
  const findInvestors = useAction(api.findInvestors.findRelevantInvestors)

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((ind) => ind !== industry)
        : [...prev, industry]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!aboutYou.trim() || !aboutStartup.trim()) {
      alert('Please fill in both text areas.')
      return
    }

    if (selectedIndustries.length === 0) {
      alert('Please select at least one industry.')
      return
    }

    setIsLoading(true)
    setResults(null)

    try {
      // Call Convex action for LLM summarization → embedding → vector search
      const result = await findInvestors({
        aboutYou: aboutYou.trim(),
        aboutStartup: aboutStartup.trim(),
        selectedIndustries,
      })

      console.log('Found investors:', result)
      setResults(result)
      
      // Log detailed results to console
      console.log('Summary:', result.summary)
      console.log(`Found ${result.totalFound} matching investors:`)
      result.investors.forEach((inv: any, i: number) => {
        console.log(`${i + 1}. ${inv.name} (${inv.firm || 'Angel'}) - Score: ${inv.score?.toFixed(3)}`)
        console.log(`   Industries: ${inv.industries.join(', ')}`)
        console.log(`   Twitter: @${inv.username}`)
      })
    } catch (error) {
      console.error('Error finding investors:', error)
      alert('Error finding investors. Check the console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  const clearForm = () => {
    setAboutYou('')
    setAboutStartup('')
    setSelectedIndustries([])
    setResults(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 sm:p-10">
      <main className="w-full max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            freemoney.baby
          </h1>
        </div>

        <section className="rounded-2xl bg-[color:var(--surface)] backdrop-blur px-6 sm:px-8 py-7 shadow-[0_1px_0_rgba(0,0,0,0.35),0_20px_60px_-24px_rgba(0,0,0,0.5)] ring-1 ring-[color:var(--border)]">
          <header className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium tracking-tight">
                  Outreach Agent
                </h2>
                <p className="text-sm text-[color:var(--muted, #8b9891)] mt-1">
                  Match the right angels/VCs and draft DM intros.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-[color:var(--muted, #8b9891)]">
                <span className="msr" aria-hidden>
                  chat
                </span>
                <span>Twitter connected</span>
              </div>
            </div>
          </header>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 sm:gap-6"
          >
            <div>
              <label
                htmlFor="aboutYou"
                className="block text-sm font-medium mb-2"
              >
                About you
              </label>
              <textarea
                id="aboutYou"
                value={aboutYou}
                onChange={(e) => setAboutYou(e.target.value)}
                placeholder="Founder background, strengths, previous roles…"
                rows={3}
                className="w-full resize-y rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-strong)]"
              />
            </div>

            <div>
              <label
                htmlFor="aboutStartup"
                className="block text-sm font-medium mb-2"
              >
                About your startup
              </label>
              <textarea
                id="aboutStartup"
                value={aboutStartup}
                onChange={(e) => setAboutStartup(e.target.value)}
                placeholder="What you do, traction, go‑to‑market, stage…"
                rows={4}
                className="w-full resize-y rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-strong)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Industry focus
              </label>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
                {INDUSTRIES.map((industryOption) => (
                  <label
                    key={industryOption}
                    className="flex items-center gap-2 cursor-pointer hover:bg-[color:var(--surface)] p-2 rounded-lg transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndustries.includes(industryOption)}
                      onChange={() => toggleIndustry(industryOption)}
                      className="w-4 h-4 rounded border border-[color:var(--border)] text-[color:var(--accent-strong)] focus:ring-[color:var(--accent-strong)] focus:ring-2"
                    />
                    <span className="text-sm">{industryOption}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-xl bg-[color:var(--accent-strong)] text-[color:var(--foreground)] px-5 py-3 font-medium shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-strong)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Finding Investors...' : 'Find Investors'}
              </button>
              <button
                type="button"
                onClick={clearForm}
                className="rounded-xl px-4 py-3 font-medium border border-[color:var(--border)] hover:bg-[color:var(--surface-2)] transition"
              >
                Clear
              </button>
            </div>
          </form>
          
          {/* Results Display */}
          {results && (
            <div className="mt-6 p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
              <h3 className="text-lg font-medium mb-3">
                Found {results.totalFound} Relevant Investors
              </h3>
              <p className="text-sm text-[color:var(--muted, #8b9891)] mb-3">
                Check your browser console for detailed results
              </p>
              <div className="text-xs text-[color:var(--muted, #8b9891)]">
                Summary: {results.summary?.summary?.slice(0, 200)}...
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
