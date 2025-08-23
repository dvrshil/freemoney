'use node'

import { action } from './_generated/server'
import { v } from 'convex/values'
import OpenAI from 'openai'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { FounderSummarySchema } from './lib/summarySchema'
import { internal } from './_generated/api'

export const findRelevantInvestors = action({
  args: {
    aboutYou: v.string(),
    aboutStartup: v.string(),
    selectedIndustries: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate inputs
    if (!args.aboutYou.trim() || !args.aboutStartup.trim()) {
      throw new Error(
        "Both 'about you' and 'about startup' fields are required"
      )
    }

    if (args.selectedIndustries.length === 0) {
      throw new Error('At least one industry must be selected')
    }

    // Get OpenAI API key from Convex environment
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured in Convex environment')
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })
    
    // Create OpenAI instance for Vercel AI SDK
    const openaiSDK = createOpenAI({
      apiKey: openaiApiKey,
    })

    // Step 1: Summarize founder inputs using GPT-4o
    console.log('Summarizing founder information...')

    const combinedInput = `
About the Founder:
${args.aboutYou}

About the Startup:
${args.aboutStartup}

Industry Focus: ${args.selectedIndustries.join(', ')}
`

    // Generate structured summary using GPT-4o via OpenAI SDK
    const { object: founderSummary } = await generateObject({
      model: openaiSDK('gpt-4o'),
      schema: FounderSummarySchema,
      system:
        'You are a precise summarizer for startup founders seeking investment. Create a comprehensive summary that will help match them with relevant investors. Focus on key strengths, traction, and what makes them investable.',
      prompt: `Summarize the following founder and startup information for investor matching:\n\n---BEGIN DATA---\n${combinedInput}\n---END DATA---`,
      temperature: 0,
      maxTokens: 600,
    })

    console.log('Summary generated:', founderSummary)

    // Step 2: Generate embeddings for the summary
    console.log('Generating embeddings...')

    const embeddingText = `
${founderSummary.summary}
Key strengths: ${founderSummary.key_strengths.join(', ')}
Stage: ${founderSummary.stage}
Traction: ${founderSummary.traction_highlights.join(', ')}
${founderSummary.funding_ask ? `Funding ask: ${founderSummary.funding_ask}` : ''}
Industries: ${args.selectedIndustries.join(', ')}
`

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: embeddingText.trim(),
      dimensions: 1024, // Must match investor embeddings
    })

    const founderEmbedding = embeddingResponse.data[0].embedding
    console.log('Embedding generated, dimensions:', founderEmbedding.length)

    // Step 3: Vector search for relevant investors
    console.log('Searching for relevant investors...')

    // Get more results initially since we'll filter by industry after
    const searchResults = await ctx.vectorSearch('investors', 'byEmbedding', {
      vector: founderEmbedding,
      limit: 100, // Get more results to filter from
      filter: (q) => q.eq('dm_open_status', 'open'), // All our investors have open DMs anyway
    })

    console.log(`Vector search returned ${searchResults.length} results`)

    // Step 4: Fetch full documents and filter by industries
    const investorsWithData = []
    for (const result of searchResults) {
      const investor = await ctx.runQuery(internal.investors.getById, { id: result._id })
      if (investor) {
        // Check if investor has at least one matching industry
        const hasMatchingIndustry = investor.industries?.some((ind) =>
          args.selectedIndustries.includes(ind)
        )
        
        if (hasMatchingIndustry) {
          investorsWithData.push({
            ...investor,
            _score: result._score, // Include similarity score
          })
        }
      }
    }

    // Take top 25 investors after filtering
    const topInvestors = investorsWithData.slice(0, 25)

    console.log(`Found ${topInvestors.length} relevant investors after industry filtering`)

    // Return the results
    return {
      summary: founderSummary,
      investors: topInvestors.map((inv) => ({
        id: inv._id,
        name: inv.name,
        firm: inv.firm,
        position: inv.position,
        industries: inv.industries,
        thesis: inv.thesis,
        minInvestment: inv.min_investment,
        username: inv.username,
        twitterUrl: inv.twitter_url,
        score: inv._score, // Vector similarity score
      })),
      totalFound: topInvestors.length,
    }
  },
})
