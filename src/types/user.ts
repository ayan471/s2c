import { combinedSlug } from "../lib/utils";

export type ConvexUserRaw = {
  _creationTime: number;
  _id: string;
  email: string;
  emailVerificationTime?: number;
  image?: string;
  name?: string;
};

export type Profile = {
  id: string; // normalized from _id
  createdAtMs: number; // from _creationTime
  email: string;
  emailVerifiedAtMs?: number; // from emailVerificationTime
  image?: string;
  name?: string; // Display name (full name or extracted from email)
  slug?: string; // URL-safe slug for routing
};

export const normalizeProfile = (raw: ConvexUserRaw | null): Profile | null => {
  if (!raw) return null;

  const extractNameFromEmail = (email: string): string => {
    const username = email.split("@")[0];
    return username
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  };

  // Use raw.name if it exists, otherwise extract from email
  const displayName =
    raw.name && raw.name.trim() !== ""
      ? raw.name
      : extractNameFromEmail(raw.email);

  // Create slug for URLs (used in routes)
  // If displayName is still empty, use email username directly
  const slug =
    displayName && displayName.trim() !== ""
      ? combinedSlug(displayName)
      : raw.email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "user";

  console.log("🔍 [Profile] Normalizing:", {
    rawName: raw.name,
    email: raw.email,
    displayName,
    slug,
  });

  return {
    id: raw._id,
    createdAtMs: raw._creationTime,
    email: raw.email,
    emailVerifiedAtMs: raw.emailVerificationTime,
    image: raw.image,
    name: displayName, // Use full display name, not slug
    slug, // Add slug for URL purposes
  };
};
