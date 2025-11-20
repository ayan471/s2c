import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserFolders = query({
  args: {
    userId: v.id("users"),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, includeDeleted = false }) => {
    // Get all folders for the user
    const allFolders = await ctx.db
      .query("folders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Filter based on deleted status
    const folders = includeDeleted
      ? allFolders.filter((f) => f.isDeleted === true)
      : allFolders.filter((f) => !f.isDeleted); // This handles both false and undefined

    return folders;
  },
});

export const createFolder = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, color }) => {
    const folderId = await ctx.db.insert("folders", {
      userId,
      name,
      color,
      createdAt: Date.now(),
      isDeleted: false, // Explicitly set to false for new folders
    });

    console.log("📁 [Convex] Folder created:", folderId);
    return { folderId, name };
  },
});

export const deleteFolder = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, { folderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Folder not found");

    if (folder.userId !== userId) {
      throw new Error("Access denied");
    }

    const now = Date.now();

    // Soft delete the folder
    await ctx.db.patch(folderId, {
      isDeleted: true,
      deletedAt: now,
    });

    // Soft delete all projects in this folder
    const projectsInFolder = await ctx.db
      .query("projects")
      .withIndex("by_folderId", (q) => q.eq("folderId", folderId))
      .collect();

    for (const project of projectsInFolder) {
      await ctx.db.patch(project._id, {
        isDeleted: true,
        deletedAt: now,
      });
    }

    console.log("🗑️ [Convex] Folder moved to trash:", folderId);

    return { success: true };
  },
});

export const restoreFolder = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, { folderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Folder not found");

    if (folder.userId !== userId) {
      throw new Error("Access denied");
    }

    // Restore the folder
    await ctx.db.patch(folderId, {
      isDeleted: false,
      deletedAt: undefined,
    });

    // Restore all projects in this folder
    const projectsInFolder = await ctx.db
      .query("projects")
      .withIndex("by_folderId", (q) => q.eq("folderId", folderId))
      .collect();

    for (const project of projectsInFolder) {
      if (project.isDeleted) {
        await ctx.db.patch(project._id, {
          isDeleted: false,
          deletedAt: undefined,
        });
      }
    }

    console.log("♻️ [Convex] Folder restored:", folderId);

    return { success: true };
  },
});

export const permanentlyDeleteFolder = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, { folderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Folder not found");

    if (folder.userId !== userId) {
      throw new Error("Access denied");
    }

    // Permanently delete all projects in this folder
    const projectsInFolder = await ctx.db
      .query("projects")
      .withIndex("by_folderId", (q) => q.eq("folderId", folderId))
      .collect();

    for (const project of projectsInFolder) {
      await ctx.db.delete(project._id);
    }

    // Permanently delete the folder
    await ctx.db.delete(folderId);
    console.log("💀 [Convex] Folder permanently deleted:", folderId);

    return { success: true };
  },
});

export const renameFolder = mutation({
  args: {
    folderId: v.id("folders"),
    newName: v.string(),
  },
  handler: async (ctx, { folderId, newName }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Folder not found");

    if (folder.userId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(folderId, { name: newName.trim() });
    console.log("✏️ [Convex] Folder renamed:", { folderId, newName });

    return { success: true };
  },
});

export const cleanupOldDeletedFolders = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

    // Find all deleted folders older than 90 days
    const oldDeletedFolders = await ctx.db.query("folders").collect();

    const foldersToDelete = oldDeletedFolders.filter(
      (folder) =>
        folder.isDeleted && folder.deletedAt && folder.deletedAt < ninetyDaysAgo
    );

    for (const folder of foldersToDelete) {
      // Permanently delete all projects in this folder
      const projectsInFolder = await ctx.db
        .query("projects")
        .withIndex("by_folderId", (q) => q.eq("folderId", folder._id))
        .collect();

      for (const project of projectsInFolder) {
        await ctx.db.delete(project._id);
      }

      // Permanently delete the folder
      await ctx.db.delete(folder._id);
      console.log("🧹 [Convex] Auto-cleaned folder:", folder._id);
    }

    return { cleaned: foldersToDelete.length };
  },
});

export const moveProjectToFolder = mutation({
  args: {
    projectId: v.id("projects"),
    folderId: v.optional(v.id("folders")), // undefined means move out of folder
  },
  handler: async (ctx, { projectId, folderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    if (project.userId !== userId) {
      throw new Error("Access denied");
    }

    // If folderId is provided, verify it exists and belongs to the user
    if (folderId) {
      const folder = await ctx.db.get(folderId);
      if (!folder) throw new Error("Folder not found");
      if (folder.userId !== userId) {
        throw new Error("Folder access denied");
      }
    }

    await ctx.db.patch(projectId, { folderId });
    console.log("📦 [Convex] Project moved to folder:", {
      projectId,
      folderId,
    });

    return { success: true };
  },
});
