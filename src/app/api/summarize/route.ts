export const runtime = "edge";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { FounderSummarySchema } from "../../../../convex/lib/summarySchema";

export async function POST(req: Request) {
  try {
    const { aboutYou, aboutStartup, selectedIndustries } = await req.json();

    // Validate inputs
    if (!aboutYou?.trim() || !aboutStartup?.trim()) {
      return Response.json(
        { error: "Both 'about you' and 'about startup' fields are required" },
        { status: 400 }
      );
    }

    if (!selectedIndustries || selectedIndustries.length === 0) {
      return Response.json(
        { error: "At least one industry must be selected" },
        { status: 400 }
      );
    }

    const combinedInput = `
About the Founder:
${aboutYou}

About the Startup:
${aboutStartup}

Industry Focus: ${selectedIndustries.join(", ")}
`;

    // Generate structured summary using GPT-4o
    const { object: founderSummary } = await generateObject({
      model: openai("gpt-4o"),
      schema: FounderSummarySchema,
      system: "You are a precise summarizer for startup founders seeking investment. Create a comprehensive summary that will help match them with relevant investors. Focus on key strengths, traction, and what makes them investable.",
      prompt: `Summarize the following founder and startup information for investor matching:\n\n---BEGIN DATA---\n${combinedInput}\n---END DATA---`,
      temperature: 0,
      maxTokens: 600,
    });

    return Response.json({ summary: founderSummary });
  } catch (error) {
    console.error("Summarization error:", error);
    return Response.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}