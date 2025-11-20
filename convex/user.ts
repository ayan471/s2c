import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);

    // Auto-fix missing name by extracting from email
    if (user && (!user.name || user.name.trim() === "") && user.email) {
      const extractedName = user.email
        .split("@")[0]
        .split(/[._-]/)
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join(" ");

      console.log(
        "⚠️ [User] Missing name, extracted from email:",
        extractedName
      );

      // Note: We can't modify in a query, but we log it
      // The client-side normalization will handle it
    }

    return user;
  },
});

export const updateUserName = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(userId, { name: name.trim() });

    console.log("✅ [User] Name updated:", name);

    return { success: true, name: name.trim() };
  },
});

//this is for inngest if metadata is missing
export const getUserIdByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    return user?._id ?? null;
  },
});
