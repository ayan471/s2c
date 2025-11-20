import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  subscriptions: defineTable({
    userId: v.id("users"),
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    productId: v.optional(v.string()),
    priceId: v.optional(v.string()),
    planCode: v.optional(v.string()),
    status: v.string(),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    seats: v.optional(v.number()),
    metadata: v.optional(v.any()),
    creditsBalance: v.number(),
    creditsGrantPerPeriod: v.number(),
    creditsRolloverLimit: v.number(),
    lastGrantCursor: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_polarSubscriptionId", ["polarSubscriptionId"])
    .index("by_status", ["status"]),
  credits_ledger: defineTable({
    userId: v.id("users"),
    subscriptionId: v.optional(v.id("subscriptions")), // Optional for standalone purchases
    amount: v.number(),
    type: v.string(), // "grant" | "consume" | "adjust" | "purchase"
    reason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    meta: v.optional(v.any()),
  })
    .index("by_subscriptionId", ["subscriptionId"])
    .index("by_userId", ["userId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),
  credit_purchases: defineTable({
    userId: v.id("users"),
    amount: v.number(), // Number of credits purchased
    priceUSD: v.number(), // Price paid in USD
    polarOrderId: v.optional(v.string()),
    status: v.string(), // "pending" | "completed" | "failed"
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_polarOrderId", ["polarOrderId"])
    .index("by_status", ["status"]),
  user_credits: defineTable({
    userId: v.id("users"),
    balance: v.number(), // Total available credits (from subscriptions + purchases)
    lastUpdated: v.number(),
  }).index("by_userId", ["userId"]),
  folders: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.optional(v.string()), // Optional color for folder
    createdAt: v.number(),
    isDeleted: v.optional(v.boolean()), // Soft delete flag
    deletedAt: v.optional(v.number()), // Timestamp when deleted
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isDeleted", ["userId", "isDeleted"]),
  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    folderId: v.optional(v.id("folders")), // Optional folder assignment
    styleGuide: v.optional(v.string()),
    sketchesData: v.any(), // JSON structure matching Redux shapes state (EntityState<Shape>)
    viewportData: v.optional(v.any()), // JSON structure for viewport state (scale, translate)
    generatedDesignData: v.optional(v.any()), // JSON structure for generated UI components
    thumbnail: v.optional(v.string()), // Base64 or URL for project thumbnail
    moodBoardImages: v.optional(v.array(v.string())), // Array of storage IDs for mood board images (max 5)
    inspirationImages: v.optional(v.array(v.string())), // Array of storage IDs for inspiration images (max 6)
    lastModified: v.number(), // Timestamp for last modification
    createdAt: v.number(), // Project creation timestamp
    isPublic: v.optional(v.boolean()), // For future sharing features
    tags: v.optional(v.array(v.string())), // For future categorization
    projectNumber: v.number(), // Auto-incrementing project number per user
    isDeleted: v.optional(v.boolean()), // Soft delete flag
    deletedAt: v.optional(v.number()), // Timestamp when deleted
  })
    .index("by_userId", ["userId"])
    .index("by_userId_lastModified", ["userId", "lastModified"])
    .index("by_userId_projectNumber", ["userId", "projectNumber"])
    .index("by_folderId", ["folderId"])
    .index("by_public", ["isPublic"])
    .index("by_tags", ["tags"])
    .index("by_userId_isDeleted", ["userId", "isDeleted"]),
  project_counters: defineTable({
    userId: v.id("users"),
    nextProjectNumber: v.number(), // Next available project number for this user
  }).index("by_userId", ["userId"]),
});

export default schema;
