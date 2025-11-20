import { SubscriptionEntitlementQuery } from "@/convex/query.config";
import { redirect } from "next/navigation";
import { combinedSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

const Page = async () => {
  const { entitlement, profileName } = await SubscriptionEntitlementQuery();

  if (!entitlement._valueJSON) {
    redirect(`/dashboard/${combinedSlug(profileName!)}`);
  }

  // Always redirect to dashboard - users can access billing from there if needed
  redirect(`/dashboard/${combinedSlug(profileName!)}`);
};

export default Page;
