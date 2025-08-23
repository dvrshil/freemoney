import { z } from 'zod'

export const FounderSummarySchema = z.object({
  summary: z
    .string()
    .min(50) // Reduced from 100 for more flexibility
    .max(800) // Increased from 600 to allow more complete summaries
    .describe(
      "A startup-focused summary highlighting the product, market opportunity, business model, and competitive advantages. Include founder details only if they directly strengthen the startup's case"
    ),

  key_strengths: z
    .array(z.string())
    .min(2) // Reduced from 3 for more flexibility
    .max(5)
    .describe(
      'Top 2-5 key differentiators of the startup (product features, market position, traction metrics, business model advantages) with founder strengths only if they add significant credibility'
    ),

  stage: z
    .enum(['pre-seed', 'seed', 'series-a', 'series-b', 'growth'])
    .describe('Current funding stage of the startup'),

  traction_highlights: z
    .array(z.string())
    .min(1) // Reduced from 2 for more flexibility
    .max(5) // Increased from 4 to allow more highlights
    .describe('Key traction points, metrics, or achievements'),

  funding_ask: z
    .string()
    .optional()
    .describe(
      'What the founder is looking for from investors (amount, type of support, etc)'
    ),
})

export type FounderSummary = z.infer<typeof FounderSummarySchema>
