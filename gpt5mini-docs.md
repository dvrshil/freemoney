Below is a compact, copy-pasteable tutorial for using **GPT-5 Mini** to ingest arbitrary text, summarize it, and return a **strictly typed JSON object** via OpenAI’s **Responses API** with **Structured Outputs**—all in **TypeScript** inside a **Next.js** app.

References:

* GPT-5 Mini model doc. ([OpenAI Platform][1])
* Structured Outputs guide (JSON Schema + strict mode). ([OpenAI Platform][2])
* Responses API reference (Node/TS examples, `output_text` / `output_parsed`). ([OpenAI Platform][3])
* Notes on migrating parameters to the Responses API. ([OpenAI Platform][4])

---

# What you’re building

* Input: an arbitrary chunk of text (“data”).
* Task: summarize + optionally extract fields.
* Output: a **single JSON object** that conforms to a **schema you control**.
* Model: `gpt-5-mini` (fast / cost-efficient for well-defined tasks). ([OpenAI Platform][1])
* Mechanism: **Structured Outputs** force the model to emit valid JSON matching your schema. ([OpenAI Platform][2])

---

# 0) Install & env

```bash
npm i openai zod
# or pnpm add openai zod
```

Set `OPENAI_API_KEY` in `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

---

# 1) Pick an output schema (Zod)

Define **exactly** what you want back. Example: concise summary, 3–7 bullets, coarse sentiment, named entities.

```ts
// app/lib/summarySchema.ts
import { z } from "zod";

export const SummarySchema = z.object({
  summary: z.string().min(20),
  key_points: z.array(z.string().min(2)).min(3).max(7),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  entities: z.array(
    z.object({
      text: z.string().min(1),
      type: z.enum(["PERSON", "ORG", "GPE", "OTHER"])
    })
  ).max(20),
  confidence: z.number().min(0).max(1)
});
export type Summary = z.infer<typeof SummarySchema>;
```

Why Zod? The OpenAI Node SDK provides a `responses.parse` helper that validates against your Zod schema and gives **typed** results via `output_parsed`. ([OpenAI Platform][3])

---

# 2) Server route (Next.js App Router)

Create an API route that accepts `{ data: string }` and returns strictly typed JSON.

```ts
// app/api/summarize/route.ts
import OpenAI from "openai";
import { SummarySchema } from "@/app/lib/summarySchema";

export const runtime = "nodejs"; // or "edge" — keep server-side to protect your key
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { data } = await req.json() as { data: string };

  // Guardrails: small temperature, explicit instructions, delimiter fences.
  const instructions =
    "You are a precise summarizer. Produce ONLY the JSON object that matches the schema. No extra commentary.";

  // The Responses API + Structured Outputs (Zod parse helper).
  // This returns `output_parsed` already validated & typed.
  const resp = await client.responses.parse({
    model: "gpt-5-mini",
    instructions,
    input:
      `Summarize the following content.\n\n` +
      `---BEGIN DATA---\n${data}\n---END DATA---`,
    // determinism & compactness
    temperature: 0,
    max_output_tokens: 600,
    // Zod schema for strict structured output
    schema: SummarySchema
  });

  // If the model deviates, parse() throws; catch & map to 400.
  try {
    const parsed = resp.output_parsed; // typed as Summary
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Schema validation failed" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }
}
```

Notes:

* `gpt-5-mini` is appropriate here (speed/\$ for well-scoped JSON tasks). ([OpenAI Platform][1])
* **Structured Outputs** enforces your shape; invalid outputs cause a validation error rather than leaking untyped text. ([OpenAI Platform][2])
* This uses the **Responses API**, not Chat Completions. The latest SDK exposes response helpers like `output_text` and `output_parsed`. ([OpenAI Platform][3])

---

# 3) Client usage (simple fetch from a form)

```ts
// app/page.tsx
"use client";
import { useState } from "react";

export default function Page() {
  const [data, setData] = useState("");
  const [json, setJson] = useState<any>(null);

  return (
    <main className="p-6 grid gap-4 max-w-2xl">
      <textarea
        className="border rounded p-3 min-h-[200px]"
        placeholder="Paste content to summarize…"
        value={data}
        onChange={(e) => setData(e.target.value)}
      />
      <button
        className="border rounded p-2"
        onClick={async () => {
          const res = await fetch("/api/summarize", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ data })
          });
          const out = await res.json();
          setJson(out);
        }}
      >
        Summarize → JSON
      </button>
      <pre className="text-sm bg-black/5 p-3 rounded overflow-auto">
        {json ? JSON.stringify(json, null, 2) : "—"}
      </pre>
    </main>
  );
}
```

---

# 4) Multiple items (batching)

For a list of documents, call the same route per document (parallelized) or create a bulk route that maps `responses.parse` over the array with `Promise.all`. Keep each item self-contained; do not mix multiple documents in one prompt unless the output schema disambiguates them.

---

# 5) Prompting & context design (tight, injection-resistant)

* **Isolate data** with clear fences (`---BEGIN DATA---` / `---END DATA---`) so the model doesn’t confuse instructions with content.
* **Define acceptance criteria in the schema**, not prose: `additionalProperties: false` (Zod default here via exact shape) and enums/min lengths force crisp outputs. Structured Outputs is built specifically for this pattern. ([OpenAI Platform][2])
* **Determinism**: use `temperature: 0`.
* **Bound output size** with `max_output_tokens`.
* **No hidden reasoning**: request only fields you need; avoid asking for rationales.

---

# 6) Alternative: raw JSON Schema (no Zod)

If you prefer explicit JSON Schema and the lower-level call:

```ts
const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", minLength: 20 },
    key_points: { type: "array", minItems: 3, maxItems: 7, items: { type: "string", minLength: 2 } },
    sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
    entities: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string", minLength: 1 },
          type: { type: "string", enum: ["PERSON","ORG","GPE","OTHER"] }
        },
        required: ["text","type"]
      }
    },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["summary","key_points","sentiment","confidence"]
} as const;

const r = await client.responses.create({
  model: "gpt-5-mini",
  instructions: "Produce ONLY the JSON object per schema.",
  input: `Summarize:\n---BEGIN DATA---\n${data}\n---END DATA---`,
  // Newer Responses API shape attaches format/schema under "text"
  // See migration notes; older examples used response_format. :contentReference[oaicite:11]{index=11}
  text: { format: "json_schema", schema }
});
const json = r.output_text ? JSON.parse(r.output_text) : r; // or inspect object fields per the ref. :contentReference[oaicite:12]{index=12}
```

---

# 7) Quality & failure modes

* **Very long inputs**: chunk, summarize-per-chunk, then “summary-of-summaries”.
* **Hallucinated fields**: schema prevents extra keys; keep `additionalProperties: false`. ([OpenAI Platform][2])
* **Invalid JSON**: `responses.parse` already validates; if using raw schema with `create`, add a fallback `try { JSON.parse(output_text) }`.

---

# 8) Model choice note

For **well-defined, schema-constrained extraction/summarization**, `gpt-5-mini` trades top-end reasoning for **speed and cost**; move up to full **GPT-5** only if results miss nuance you truly need. See model pages / comparison. ([OpenAI Platform][1])

---

# 9) Minimal test

```ts
// app/api/dev-test/route.ts
import OpenAI from "openai";
import { SummarySchema } from "@/app/lib/summarySchema";
const client = new OpenAI();

export async function GET() {
  const sample = `OpenAI announced a faster GPT-5 Mini model ...
  The release focuses on structured outputs for production apps ...`;

  const r = await client.responses.parse({
    model: "gpt-5-mini",
    instructions: "Summarize to the schema; return JSON only.",
    input: sample,
    temperature: 0,
    schema: SummarySchema
  });

  return Response.json(r.output_parsed);
}
```

---

# 10) Where this is in the docs

* **Structured Outputs** guide (JSON Schema, strictness, why it prevents invalid shapes). ([OpenAI Platform][2])
* **GPT-5 Mini** model page (positioning, use cases). ([OpenAI Platform][1])
* **Responses API** (core interface; `output_text` / streaming; Node examples). ([OpenAI Platform][3])
* **Migration** notes for parameter names if you’re moving off Chat Completions. ([OpenAI Platform][4])

---

If you want a different output contract (e.g., add `audience`, `reading_level`, or `topics`), specify it in the Zod schema and the model will be constrained accordingly.

[1]: https://platform.openai.com/docs/models/gpt-5-mini?utm_source=chatgpt.com "Model - OpenAI API"
[2]: https://platform.openai.com/docs/guides/structured-outputs?utm_source=chatgpt.com "Structured model outputs - OpenAI API"
[3]: https://platform.openai.com/docs/api-reference/responses?utm_source=chatgpt.com "Responses API reference"
[4]: https://platform.openai.com/docs/guides/migrate-to-responses?utm_source=chatgpt.com "Migrating to Responses API"
