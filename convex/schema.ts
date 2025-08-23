import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  investors: defineTable({
    name: v.string(),
    firm: v.optional(v.string()),
    position: v.optional(v.string()),
    industries: v.array(v.string()),
    min_investment: v.optional(v.number()),
    thesis: v.optional(v.string()),
    embedding: v.array(v.float64()),
    dm_open_status: v.union(v.literal("open"), v.literal("closed"), v.literal("unknown")),
    twitter_url: v.optional(v.string()),
    username: v.optional(v.string()),
    source: v.optional(v.string()),
  })
  .index("byTwitter", ["twitter_url"])
  .index("byUsername", ["username"])
  .vectorIndex("byEmbedding", {
    vectorField: "embedding",
    dimensions: 1024,
    filterFields: ["industries", "dm_open_status"]
  }),
});