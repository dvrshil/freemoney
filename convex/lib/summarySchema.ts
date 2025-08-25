import { z } from 'zod'

export const FounderSummarySchema = z.object({
  summary: z
    .string()
    .min(50)
    .max(800)
    .describe(
      "A simple, clear summary of the founder's background and their startup based on what they provided"
    ),
})

export type FounderSummary = z.infer<typeof FounderSummarySchema>
