import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get user credits record (read-only, no creation)
async function getUserCredits(ctx: any, userId: string) {
  const userCredits = await ctx.db
    .query("user_credits")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();

  return userCredits;
}

// Get or create user credits record (for mutations only)
async function getOrCreateUserCredits(ctx: any, userId: string) {
  let userCredits = await getUserCredits(ctx, userId);

  if (!userCredits) {
    // Create new user_credits record with 0 balance
    const id = await ctx.db.insert("user_credits", {
      userId,
      balance: 0,
      lastUpdated: Date.now(),
    });
    userCredits = await ctx.db.get(id);
  }

  return userCredits;
}

// Get user's total credit balance (from subscription + purchases)
export const getCreditsBalance = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const userCredits = await getUserCredits(ctx, userId);

    // Also check if they have subscription credits
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const subscriptionBalance = sub?.creditsBalance || 0;
    const purchasedBalance = userCredits?.balance || 0;

    // Return total balance
    return subscriptionBalance + purchasedBalance;
  },
});

// Purchase credits (called after Polar payment confirmation)
export const purchaseCredits = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    priceUSD: v.number(),
    polarOrderId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, amount, priceUSD, polarOrderId }) => {
    console.log("💳 [Credits] Processing credit purchase:", {
      userId,
      amount,
      priceUSD,
      polarOrderId,
    });

    // Create purchase record
    const purchaseId = await ctx.db.insert("credit_purchases", {
      userId,
      amount,
      priceUSD,
      polarOrderId,
      status: "completed",
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    // Get or create user credits
    const userCredits = await getOrCreateUserCredits(ctx, userId);

    // Update user's credit balance
    const newBalance = userCredits.balance + amount;
    await ctx.db.patch(userCredits._id, {
      balance: newBalance,
      lastUpdated: Date.now(),
    });

    // Add to ledger
    await ctx.db.insert("credits_ledger", {
      userId,
      subscriptionId: undefined,
      amount,
      type: "purchase",
      reason: "credit-purchase",
      idempotencyKey: polarOrderId,
      meta: {
        priceUSD,
        prev: userCredits.balance,
        next: newBalance,
      },
    });

    console.log("✅ [Credits] Purchase completed:", {
      purchaseId,
      newBalance,
    });

    return { success: true, balance: newBalance, purchaseId };
  },
});

// Consume credits (works with both subscription and purchased credits)
export const consumeCredits = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    reason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, { userId, amount, reason, idempotencyKey }) => {
    if (amount <= 0) return { ok: false, error: "invalid-amount" };

    // Check for duplicate with idempotency key
    if (idempotencyKey) {
      const dupe = await ctx.db
        .query("credits_ledger")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", idempotencyKey)
        )
        .first();
      if (dupe) return { ok: true, idempotent: true };
    }

    // Get or create user credits
    const userCredits = await getOrCreateUserCredits(ctx, userId);

    // Check if user has subscription credits first
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    let subscriptionBalance = 0;
    let purchasedBalance = userCredits.balance;

    if (sub) {
      subscriptionBalance = sub.creditsBalance || 0;
    }

    const totalBalance = subscriptionBalance + purchasedBalance;

    if (totalBalance < amount) {
      return {
        ok: false,
        error: "insufficient-credits",
        balance: totalBalance,
      };
    }

    // Consume from subscription first, then purchased credits
    let remaining = amount;

    if (sub && subscriptionBalance > 0) {
      const fromSubscription = Math.min(subscriptionBalance, remaining);
      await ctx.db.patch(sub._id, {
        creditsBalance: subscriptionBalance - fromSubscription,
      });

      await ctx.db.insert("credits_ledger", {
        userId,
        subscriptionId: sub._id,
        amount: -fromSubscription,
        type: "consume",
        reason: reason || "usage",
        idempotencyKey,
        meta: {
          prev: subscriptionBalance,
          next: subscriptionBalance - fromSubscription,
          source: "subscription",
        },
      });

      remaining -= fromSubscription;
    }

    // If still need more credits, consume from purchased
    if (remaining > 0 && purchasedBalance > 0) {
      const fromPurchased = Math.min(purchasedBalance, remaining);
      const newPurchasedBalance = purchasedBalance - fromPurchased;

      await ctx.db.patch(userCredits._id, {
        balance: newPurchasedBalance,
        lastUpdated: Date.now(),
      });

      await ctx.db.insert("credits_ledger", {
        userId,
        subscriptionId: undefined,
        amount: -fromPurchased,
        type: "consume",
        reason: reason || "usage",
        idempotencyKey,
        meta: {
          prev: purchasedBalance,
          next: newPurchasedBalance,
          source: "purchase",
        },
      });
    }

    const newTotalBalance =
      (sub ? sub.creditsBalance - Math.min(subscriptionBalance, amount) : 0) +
      (purchasedBalance -
        Math.min(purchasedBalance, remaining + (amount - remaining)));

    console.log("💰 [Credits] Consumed:", {
      amount,
      fromSubscription: amount - remaining,
      fromPurchased: remaining,
      newBalance: newTotalBalance,
    });

    return { ok: true, balance: newTotalBalance };
  },
});

// Get purchase history
export const getPurchaseHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const purchases = await ctx.db
      .query("credit_purchases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return purchases;
  },
});
