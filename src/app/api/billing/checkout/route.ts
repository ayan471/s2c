import { NextRequest, NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Check for required environment variables
    if (!process.env.POLAR_ACCESS_TOKEN) {
      console.error("POLAR_ACCESS_TOKEN is not set");
      return NextResponse.json(
        { error: "Server configuration error: Missing Polar credentials" },
        { status: 500 }
      );
    }

    if (!process.env.POLAR_STANDARD_PLAN) {
      console.error("POLAR_STANDARD_PLAN is not set");
      return NextResponse.json(
        { error: "Server configuration error: Missing plan configuration" },
        { status: 500 }
      );
    }

    const polar = new Polar({
      server: process.env.POLAR_ENV === "sandbox" ? "sandbox" : "production",
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    });

    const session = await polar.checkouts.create({
      products: [process.env.POLAR_STANDARD_PLAN],
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
      metadata: {
        userId,
      },
    });

    if (!session.url) {
      console.error("Polar checkout created but no URL returned");
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error details:", error);

    // Provide more detailed error information
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorDetails = {
      error: "Failed to create checkout session",
      message: errorMessage,
      details: error,
    };

    return NextResponse.json(errorDetails, { status: 500 });
  }
}
