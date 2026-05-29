import { NextRequest, NextResponse } from "next/server";
import { findPitchiqPlayerProfile } from "@/lib/pitchiq-player-sync";

export async function GET(request: NextRequest) {
  const jerseyNoRaw = request.nextUrl.searchParams.get("jerseyNo");
  const name = request.nextUrl.searchParams.get("name")?.trim();

  const jerseyNo = jerseyNoRaw ? parseInt(jerseyNoRaw, 10) : undefined;
  if (jerseyNoRaw && Number.isNaN(jerseyNo)) {
    return NextResponse.json({ error: "Invalid jerseyNo" }, { status: 400 });
  }
  if (!jerseyNo && !name) {
    return NextResponse.json({ error: "jerseyNo or name required" }, { status: 400 });
  }

  const profile = await findPitchiqPlayerProfile(jerseyNo, name);
  if (!profile) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: profile.id,
    name: profile.user.name,
    email: profile.user.email,
    jerseyNo: profile.jerseyNo,
  });
}
