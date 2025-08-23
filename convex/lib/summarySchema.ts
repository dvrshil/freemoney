import { z } from "zod";

export const FounderSummarySchema = z.object({
  summary: z.string()
    .min(100)
    .max(600)
    .describe("A concise, comprehensive summary of the founder and their startup that captures key information for investor matching"),
  
  key_strengths: z.array(z.string())
    .min(3)
    .max(5)
    .describe("Top 3-5 key strengths, skills, or differentiators of the founder and startup"),
  
  stage: z.enum(["pre-seed", "seed", "series-a", "series-b", "growth"])
    .describe("Current funding stage of the startup"),
  
  traction_highlights: z.array(z.string())
    .min(2)
    .max(4)
    .describe("Key traction points, metrics, or achievements"),
  
  funding_ask: z.string()
    .optional()
    .describe("What the founder is looking for from investors (amount, type of support, etc)"),
});

export type FounderSummary = z.infer<typeof FounderSummarySchema>;