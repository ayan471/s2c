/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createProject = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    sketchesData: v.any(), // JSON structure from Redux shapes state
    thumbnail: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, sketchesData, thumbnail }) => {
    console.log("🚀 [Convex] Creating project for user:", userId);

    // Get next project number for auto-naming
    const projectNumber = await getNextProjectNumber(ctx, userId);
    const projectName = name || `Project ${projectNumber}`;

    // Create the project
    const projectId = await ctx.db.insert("projects", {
      userId,
      name: projectName,
      sketchesData,
      thumbnail,
      projectNumber,
      lastModified: Date.now(),
      createdAt: Date.now(),
      isPublic: false,
      isDeleted: false, // Explicitly set to false for new projects
    });

    console.log("✅ [Convex] Project created:", {
      projectId,
      name: projectName,
      projectNumber,
    });

    return {
      projectId,
      name: projectName,
      projectNumber,
    };
  },
});

export const getUserProjects = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    folderId: v.optional(v.union(v.id("folders"), v.null())), // null means root folder
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { userId, limit = 20, folderId, includeDeleted = false }
  ) => {
    const allProjects = await ctx.db
      .query("projects")
      .withIndex("by_userId_lastModified", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Filter by deleted status - handles both false and undefined
    const filteredByDeleteStatus = includeDeleted
      ? allProjects.filter((p) => p.isDeleted === true)
      : allProjects.filter((p) => !p.isDeleted); // This handles both false and undefined

    // Filter by folder if specified
    const filteredProjects =
      folderId !== undefined
        ? filteredByDeleteStatus.filter((p) => {
            if (folderId === null) {
              // Show only projects not in any folder
              return !p.folderId;
            }
            return p.folderId === folderId;
          })
        : filteredByDeleteStatus;

    const projects = filteredProjects.slice(0, limit);

    return projects.map((project) => ({
      _id: project._id,
      name: project.name,
      projectNumber: project.projectNumber,
      thumbnail: project.thumbnail,
      lastModified: project.lastModified,
      createdAt: project.createdAt,
      isPublic: project.isPublic,
      folderId: project.folderId,
      isDeleted: project.isDeleted,
      deletedAt: project.deletedAt,
    }));
  },
});

export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check ownership or public access
    if (project.userId !== userId && !project.isPublic) {
      throw new Error("Access denied");
    }

    return project;
  },
});

export const getProjectStyleGuide = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check ownership or public access
    if (project.userId !== userId && !project.isPublic) {
      throw new Error("Access denied");
    }

    // Return parsed style guide data or null
    return project.styleGuide ? JSON.parse(project.styleGuide) : null;
  },
});

export const updateProjectSketches = mutation({
  args: {
    projectId: v.id("projects"),
    sketchesData: v.any(),
    viewportData: v.optional(v.any()),
  },
  handler: async (ctx, { projectId, sketchesData, viewportData }) => {
    console.log("💾 [Convex] Auto-saving project:", projectId);

    // Verify project exists and user has access
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Prepare update data
    const updateData: any = {
      sketchesData,
      lastModified: Date.now(),
    };

    // Include viewport data if provided
    if (viewportData) {
      updateData.viewportData = viewportData;
    }

    // Update sketches and viewport data
    await ctx.db.patch(projectId, updateData);

    console.log("✅ [Convex] Project auto-saved successfully");
    return { success: true };
  },
});

export const updateProjectStyleGuide = mutation({
  args: {
    projectId: v.id("projects"),
    styleGuideData: v.any(), // JSON structure for AI-generated style guide
  },
  handler: async (ctx, { projectId, styleGuideData }) => {
    console.log("🎨 [Convex] Updating project style guide:", projectId);
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(projectId, {
      styleGuide: JSON.stringify(styleGuideData), // Store as JSON string
      lastModified: Date.now(),
    });

    console.log("✅ [Convex] Project style guide updated successfully");
    return { success: true, styleGuide: styleGuideData };
  },
});

export const renameProject = mutation({
  args: {
    projectId: v.id("projects"),
    newName: v.string(),
  },
  handler: async (ctx, { projectId, newName }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    if (project.userId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(projectId, {
      name: newName.trim(),
      lastModified: Date.now(),
    });

    console.log("✏️ [Convex] Project renamed:", { projectId, newName });

    return { success: true, name: newName.trim() };
  },
});

export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    if (project.userId !== userId) {
      throw new Error("Access denied");
    }

    // Soft delete the project
    await ctx.db.patch(projectId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    console.log("🗑️ [Convex] Project moved to trash:", projectId);

    return { success: true };
  },
});

export const restoreProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    if (project.userId !== userId) {
      throw new Error("Access denied");
    }

    // Restore the project
    await ctx.db.patch(projectId, {
      isDeleted: false,
      deletedAt: undefined,
    });

    console.log("♻️ [Convex] Project restored:", projectId);

    return { success: true };
  },
});

export const permanentlyDeleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    if (project.userId !== userId) {
      throw new Error("Access denied");
    }

    // Permanently delete the project
    await ctx.db.delete(projectId);
    console.log("💀 [Convex] Project permanently deleted:", projectId);

    return { success: true };
  },
});

export const cleanupOldDeletedProjects = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

    // Find all deleted projects older than 90 days
    const oldDeletedProjects = await ctx.db.query("projects").collect();

    const projectsToDelete = oldDeletedProjects.filter(
      (project) =>
        project.isDeleted &&
        project.deletedAt &&
        project.deletedAt < ninetyDaysAgo
    );

    for (const project of projectsToDelete) {
      await ctx.db.delete(project._id);
      console.log("🧹 [Convex] Auto-cleaned project:", project._id);
    }

    return { cleaned: projectsToDelete.length };
  },
});

async function getNextProjectNumber(ctx: any, userId: string): Promise<number> {
  // Get or create project counter for this user
  const counter = await ctx.db
    .query("project_counters")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();

  if (!counter) {
    // Create new counter starting at 1
    await ctx.db.insert("project_counters", {
      userId,
      nextProjectNumber: 2, // Next will be 2
    });
    return 1;
  }

  const projectNumber = counter.nextProjectNumber;

  // Increment counter for next time
  await ctx.db.patch(counter._id, {
    nextProjectNumber: projectNumber + 1,
  });

  return projectNumber;
}
