import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const upsertByTwitter = mutation({
  args: {
    twitter_url: v.optional(v.string()),
    username: v.optional(v.string()),
    name: v.string(),
    firm: v.optional(v.string()),
    position: v.optional(v.string()),
    industries: v.array(v.string()),
    min_investment: v.optional(v.number()),
    thesis: v.optional(v.string()),
    dm_open_status: v.union(v.literal("open"), v.literal("closed"), v.literal("unknown")),
    embedding: v.array(v.float64()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing investor by twitter URL or username
    let existing = null;
    
    if (args.twitter_url) {
      existing = await ctx.db
        .query("investors")
        .withIndex("byTwitter", (q) => q.eq("twitter_url", args.twitter_url!))
        .first();
    }
    
    if (!existing && args.username) {
      // Also check for twitter URL constructed from username
      const twitterUrlFromUsername = `https://twitter.com/${args.username}`;
      existing = await ctx.db
        .query("investors")
        .withIndex("byTwitter", (q) => q.eq("twitter_url", twitterUrlFromUsername))
        .first();
      
      // If still not found, check by username directly
      if (!existing) {
        existing = await ctx.db
          .query("investors")
          .withIndex("byUsername", (q) => q.eq("username", args.username!))
          .first();
      }
    }
    
    if (existing) {
      // Update existing investor
      await ctx.db.patch(existing._id, {
        name: args.name,
        firm: args.firm,
        position: args.position,
        industries: args.industries,
        min_investment: args.min_investment,
        thesis: args.thesis,
        dm_open_status: args.dm_open_status,
        embedding: args.embedding,
        source: args.source,
        username: args.username,
        twitter_url: args.twitter_url,
      });
      return existing._id;
    }
    
    // Insert new investor
    return await ctx.db.insert("investors", {
      name: args.name,
      firm: args.firm,
      position: args.position,
      industries: args.industries,
      min_investment: args.min_investment,
      thesis: args.thesis,
      dm_open_status: args.dm_open_status,
      embedding: args.embedding,
      twitter_url: args.twitter_url,
      username: args.username,
      source: args.source,
    });
  },
});

// Internal query to get investor by ID
export const getById = internalQuery({
  args: { id: v.id("investors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Debug query to check investor count and sample data
export const debugInvestors = query({
  args: {},
  handler: async (ctx) => {
    const allInvestors = await ctx.db.query("investors").collect();
    
    // Get industry distribution
    const industryMap = new Map<string, number>();
    allInvestors.forEach(inv => {
      inv.industries?.forEach(ind => {
        industryMap.set(ind, (industryMap.get(ind) || 0) + 1);
      });
    });
    
    // Sample a few investors
    const sample = allInvestors.slice(0, 3).map(inv => ({
      name: inv.name,
      firm: inv.firm,
      industries: inv.industries,
      dm_open_status: inv.dm_open_status,
      has_embedding: inv.embedding?.length > 0,
      embedding_dimensions: inv.embedding?.length,
    }));
    
    return {
      total_count: allInvestors.length,
      with_open_dms: allInvestors.filter(inv => inv.dm_open_status === 'open').length,
      with_embeddings: allInvestors.filter(inv => inv.embedding?.length > 0).length,
      industry_distribution: Object.fromEntries(industryMap),
      sample_investors: sample,
    };
  },
});