import { NextRequest, NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed-database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.SETUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SETUP_SECRET is not configured on the server" },
      { status: 503 },
    );
  }

  const provided = request.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await seedDatabase();
    return NextResponse.json({
      ok: true,
      message: "Demo data created. You can log in now.",
      ...result,
    });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json(
      { error: "Seed failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}
