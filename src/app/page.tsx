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
  const [isSending, setIsSending] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [dmResult, setDmResult] = useState<{
    results: { id: string; status: string; detail?: string }[]
  } | null>(null)

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
    setDmResult(null)

    try {
      // Call Convex action for LLM summarization → embedding → vector search
      const result = await findInvestors({
        aboutYou: aboutYou.trim(),
        aboutStartup: aboutStartup.trim(),
        selectedIndustries,
      })

      console.log('Found investors:', result)
      setResults(result)

      // Log the DM payload for backend endpoint
      console.log('\n=== DM PAYLOAD FOR BACKEND ===')
      console.log(JSON.stringify(result.dmPayload, null, 2))
      console.log('=== END DM PAYLOAD ===\n')

      // Also log summary for reference
      console.log('Summary:', result.summary)
      console.log(`Found ${result.totalFound} top matching investors`)

      // Send the DM payload to the backend
      setIsSending(true)
      try {
        const resp = await fetch('http://localhost:8000/send-messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(result.dmPayload),
        })
        const text = await resp.text()
        let json: any = null
        try {
          json = text ? JSON.parse(text) : null
        } catch (e) {
          // keep raw text if non-JSON
        }
        if (!resp.ok) {
          console.error('Backend error:', resp.status, text)
          alert(`Backend error ${resp.status}: ${text || 'See console'}`)
        } else if (json) {
          console.log('Backend response JSON:', json)
          setDmResult(json)
        } else {
          console.log('Backend response (no JSON):', text)
        }
      } finally {
        setIsSending(false)
      }
      fetch('http://localhost:8000/send-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result.dmPayload),
      })
        .then((response) => {
          console.log('Backend response:', response.status)
        })
        .catch((error) => {
          console.error('Error sending to backend:', error)
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
    setDmResult(null)
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
                placeholder="What your startup does, your business model, your market…"
                rows={4}
                className="w-full resize-y rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-strong)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Industry focus
              </label>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[color:var(--surface)] p-2 rounded-lg transition col-span-2 border-b border-[color:var(--border)] pb-3 mb-1">
                  <input
                    type="checkbox"
                    checked={selectedIndustries.length === INDUSTRIES.length}
                    onChange={() => {
                      if (selectedIndustries.length === INDUSTRIES.length) {
                        setSelectedIndustries([])
                      } else {
                        setSelectedIndustries([...INDUSTRIES])
                      }
                    }}
                    className="w-4 h-4 rounded border border-[color:var(--border)] text-[color:var(--accent-strong)] focus:ring-[color:var(--accent-strong)] focus:ring-2"
                  />
                  <span className="text-sm font-medium">Select All</span>
                </label>
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
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">
                Top {results.totalFound} Matched Investors
              </h3>

              <div className="space-y-4">
                {results.investors.map((investor: any, index: number) => (
                  <div
                    key={investor.id || index}
                    className="p-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] hover:bg-[color:var(--surface)] transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-base">
                          {investor.name}
                        </h4>
                        <p className="text-sm text-[color:var(--muted, #8b9891)]">
                          {investor.firm || 'Angel Investor'}{' '}
                          {investor.position ? `• ${investor.position}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-[color:var(--accent-strong)] text-[color:var(--foreground)] px-2 py-1 rounded-lg">
                          {Math.round((investor._score || 0) * 100)}% match
                        </span>
                        <a
                          href={
                            investor.twitter_url ||
                            `https://twitter.com/${investor.username}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[color:var(--accent-strong)] hover:underline"
                        >
                          @{investor.username}
                        </a>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-[color:var(--muted, #8b9891)] mb-1">
                        Industries:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {investor.industries.map((industry: string) => (
                          <span
                            key={industry}
                            className="text-xs px-2 py-1 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)]"
                          >
                            {industry}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[color:var(--surface)] rounded-lg p-3">
                      <p className="text-xs text-[color:var(--muted, #8b9891)] mb-2">
                        Personalized DM:
                      </p>
                      <p className="text-sm mb-3 font-mono">
                        {investor.personalizedMessage}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            investor.personalizedMessage
                          )
                          alert('Message copied to clipboard!')
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[color:var(--accent-strong)] text-[color:var(--foreground)] hover:opacity-90 transition"
                      >
                        Copy Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[color:var(--muted, #8b9891)]">
                    {isSending
                      ? 'Sending DMs…'
                      : dmResult
                        ? 'DM results'
                        : 'Ready to send DMs'}
                  </p>
                </div>

                {dmResult && (
                  <div className="mt-3 space-y-2">
                    {dmResult.results.map((r, idx) => (
                      <div
                        key={`${r.id}-${idx}`}
                        className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm truncate" title={r.id}>
                            {r.id}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-md ${
                              r.status === 'ok'
                                ? 'bg-[color:var(--accent-strong)] text-[color:var(--foreground)]'
                                : 'bg-[color:var(--surface-2)] text-[color:var(--muted, #8b9891)]'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                        {r.status !== 'ok' && r.detail && (
                          <p
                            className="mt-1 text-xs text-[color:var(--muted, #8b9891)] truncate"
                            title={r.detail}
                          >
                            {r.detail}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
