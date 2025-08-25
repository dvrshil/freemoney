export const runtime = 'edge'

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { FounderSummarySchema } from '../../../../convex/lib/summarySchema'

export async function POST(req: Request) {
  try {
    const { aboutYou, aboutStartup, selectedIndustries } = await req.json()

    // Validate inputs
    if (!aboutYou?.trim() || !aboutStartup?.trim()) {
      return Response.json(
        { error: "Both 'about you' and 'about startup' fields are required" },
        { status: 400 }
      )
    }

    if (!selectedIndustries || selectedIndustries.length === 0) {
      return Response.json(
        { error: 'At least one industry must be selected' },
        { status: 400 }
      )
    }

    const combinedInput = `
About the Founder:
${aboutYou}

About the Startup:
${aboutStartup}
`

    // Generate structured summary using GPT-4o
    const { object: founderSummary } = await generateObject({
      model: openai('gpt-4o'),
      schema: FounderSummarySchema,
      system:
        "You are a simple summarizer. Create a clear, concise summary of the founder's personal background and their startup. Just summarize what they've written without trying to analyze traction, stage, or investment potential.",
      prompt: `Summarize the following founder and startup information:\n\n---BEGIN DATA---\n${combinedInput}\n---END DATA---`,
      temperature: 0,
    })

    return Response.json({ summary: founderSummary })
  } catch (error) {
    console.error('Summarization error:', error)
    return Response.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
