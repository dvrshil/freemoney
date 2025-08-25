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
`

    // Generate structured summary using GPT-4o via OpenAI SDK
    let founderSummary: any
    try {
      const result = await generateObject({
        model: openaiSDK('gpt-4o'),
        schema: FounderSummarySchema,
        mode: 'json', // Explicitly use JSON mode for better compatibility
        system:
          "You are the worlds top summarizer. Create a clear, concise summary of the founder's personal background and the startup that theyre working on.",
        prompt: `Summarize the following founder and startup information:\n\n---BEGIN DATA---\n${combinedInput}\n---END DATA---`,
        temperature: 0,
        maxTokens: 1000, // Increased from 600 to allow more complete responses
      })
      founderSummary = result.object
    } catch (error) {
      console.error('Error generating summary:', error)
    }

    console.log('Summary generated:', founderSummary)

    // Step 2: Generate embeddings for the summary
    console.log('Generating embeddings...')

    const embeddingText = founderSummary?.summary || ''

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
      const investor = await ctx.runQuery(internal.investors.getById, {
        id: result._id,
      })
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

    // Take top 100 investors after filtering
    const topInvestors = investorsWithData.slice(0, 100)

    console.log(
      `Found ${topInvestors.length} relevant investors after industry filtering`
    )

    // Step 5: Generate personalized DM messages for each investor
    console.log('Generating personalized DM messages...')

    const investorsWithMessages = await Promise.all(
      topInvestors.map(async (investor) => {
        // Extract first name (lowercase for DM consistency)
        const firstName = investor.name.split(' ')[0].toLowerCase()

        // Create context for message generation
        const messagePrompt = `
You're writing a high-converting cold DM to an investor. Investors get hundreds of pitches daily and only respond to messages that immediately demonstrate relevance and opportunity.

STARTUP DATA:
${founderSummary.summary}

INVESTOR PROFILE:
Name: ${investor.name} (use "${firstName}" in the message)
Firm: ${investor.firm || 'Angel Investor'}
Investment Focus: ${investor.industries.join(', ')}
${investor.thesis ? `Investment Thesis: ${investor.thesis}` : ''}

Write a 2-3 sentence DM following this structure:

1. **RELEVANCE HOOK**: Start with "hey ${firstName}," then immediately connect to their specific investment focus with a detail about your startup that would interest them

2. **BRIEF DESCRIPTION**: Summarize the key aspects of the startup based on the provided information

3. **CLEAR ASK**: End with a specific, low-friction next step (quick call, deck review, coffee if in same city)

CRITICAL REQUIREMENTS:
- Connect to their investment focus area
- Be specific about what the startup does
- Professional but conversational tone
- Make it scannable - short sentences, key info upfront
- NO generic language - tailor to this specific investor
- NEVER use em dashes (—) - use regular hyphens (-) or rephrase sentences instead
- Avoid hyperbolic language - no words like "revolutionary", "groundbreaking", "game-changing", etc.
- MANDATORY: Write the entire message in all lowercase letters. No capital letters anywhere except for proper names and acronyms that are typically capitalized (like "AI", "API", etc.)
`

        const messageResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You write casual, confident Twitter DMs for founders reaching out to investors. Keep it short, punchy, and personalized. CRITICAL: Write the entire message in all lowercase letters only, except for proper names and standard acronyms.',
            },
            {
              role: 'user',
              content: messagePrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        })

        const personalizedMessage =
          messageResponse.choices[0].message.content?.trim() || ''

        return {
          ...investor,
          personalizedMessage,
        }
      })
    )

    // Create the DM payload array for backend
    const dmPayload = investorsWithMessages.map((investor) => ({
      twitterUrl:
        investor.twitter_url || `https://twitter.com/${investor.username}`,
      message: investor.personalizedMessage,
    }))

    console.log('DM payload created:', dmPayload)

    // Return the results with complete investor objects and DM payload
    return {
      summary: founderSummary,
      investors: investorsWithMessages,
      dmPayload,
      totalFound: investorsWithMessages.length,
    }
  },
})
