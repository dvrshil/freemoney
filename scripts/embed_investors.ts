import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

dotenv.config();
dotenv.config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!OPENAI_API_KEY || !CONVEX_URL) {
  throw new Error("Set OPENAI_API_KEY and NEXT_PUBLIC_CONVEX_URL in your .env file");
}

const MODEL = "text-embedding-3-large";
const DIMENSIONS = 1024;  // Must match the vector index dimension in schema
const INPUT_PATH = "./investors_data/bay_area_investors_with_open_dms.json";
const BATCH_SIZE = 20;    // Smaller batch size for cleaner progress updates

type Investor = {
  name?: string;
  position?: string;
  min_investment?: string | number;
  firm?: string;
  industries?: string[];
  enrichment?: {
    investor_name?: string;
    firm_name?: string;
    personal_bio?: string;
    interests?: string[];
    career_background?: string;
    previous_investments?: string[];
    investment_focus?: string;
    personal_twitter_profile?: string | null;
  };
  dm_check_result?: { 
    can_dm?: boolean; 
    username?: string;
  };
};

function renderInvestorText(inv: Investor): string {
  const e = inv.enrichment ?? {};
  const parts = [
    (inv.name || e.investor_name) && `Investor: ${inv.name || e.investor_name}`,
    inv.firm && `Firm: ${inv.firm}`,
    e.firm_name && !inv.firm && `Firm: ${e.firm_name}`,
    inv.position && `Role: ${inv.position}`,
    inv.industries?.length ? `Industries: ${inv.industries.join(", ")}` : undefined,
    typeof inv.min_investment !== "undefined"
      ? `Min check size: $${inv.min_investment}`
      : undefined,
    e.investment_focus && `Investment focus: ${e.investment_focus}`,
    e.personal_bio && `Bio: ${e.personal_bio}`,
    e.interests?.length ? `Interests: ${e.interests.join("; ")}` : undefined,
    e.career_background && `Background: ${e.career_background}`,
    e.previous_investments?.length
      ? `Notable investments: ${e.previous_investments.slice(0, 10).join(", ")}`
      : undefined,
  ].filter(Boolean);
  
  return parts.join(" | ");
}

async function main() {
  console.log("🚀 Starting investor embedding process...\n");
  
  const file = path.resolve(INPUT_PATH);
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Investor[];
  
  // Filter for investors with DMs open (though your file is pre-filtered)
  const investors = raw.filter(
    (x) => x.dm_check_result?.can_dm !== false
  );
  
  console.log(`📊 Found ${investors.length} investors with open DMs\n`);

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const convex = new ConvexHttpClient(CONVEX_URL);

  let totalProcessed = 0;
  let totalErrors = 0;

  for (let i = 0; i < investors.length; i += BATCH_SIZE) {
    const slice = investors.slice(i, i + BATCH_SIZE);
    const inputs = slice.map(renderInvestorText);
    
    console.log(`⚙️  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(investors.length / BATCH_SIZE)}...`);
    
    try {
      // Generate embeddings for this batch
      const resp = await openai.embeddings.create({
        model: MODEL,
        input: inputs,
        dimensions: DIMENSIONS,
      });

      // Upsert each investor with its embedding
      await Promise.all(
        slice.map(async (inv, idx) => {
          try {
            const embedding = resp.data[idx].embedding;
            const twitter = inv.enrichment?.personal_twitter_profile ?? null;
            const username = inv.dm_check_result?.username ?? null;

            await convex.mutation(api.investors.upsertByTwitter, {
              twitter_url: twitter,
              username,
              name: inv.name ?? inv.enrichment?.investor_name ?? "Unknown",
              firm: inv.firm ?? inv.enrichment?.firm_name ?? undefined,
              position: inv.position ?? undefined,
              industries: inv.industries ?? [],
              min_investment: typeof inv.min_investment === "string"
                ? Number(inv.min_investment) || undefined
                : inv.min_investment ?? undefined,
              thesis: inv.enrichment?.investment_focus ?? undefined,
              dm_open_status: "open",
              embedding,
              source: "seed_bay_area_2025_08_23",
            });
            
            totalProcessed++;
          } catch (error) {
            console.error(`  ❌ Error upserting ${inv.name}:`, error);
            totalErrors++;
          }
        })
      );

      console.log(`  ✅ Processed ${totalProcessed}/${investors.length} investors\n`);
    } catch (error) {
      console.error("❌ Batch processing error:", error);
      totalErrors += slice.length;
    }
  }

  console.log("🎉 Embedding process complete!");
  console.log(`✅ Successfully processed: ${totalProcessed} investors`);
  if (totalErrors > 0) {
    console.log(`❌ Errors encountered: ${totalErrors} investors`);
  }
  console.log("\n💡 Your investors are now in Convex with embeddings!");
  console.log("   You can now use vector search to find relevant investors for founders.");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});