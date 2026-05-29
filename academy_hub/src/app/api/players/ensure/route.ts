import { NextRequest, NextResponse } from "next/server";
import { ensurePitchiqPlayerProfile } from "@/lib/pitchiq-player-sync";

export async function POST(request: NextRequest) {
  let body: {
    jerseyNo?: number;
    name?: string;
    position?: string;
    squad?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jerseyNo = body.jerseyNo ? parseInt(String(body.jerseyNo), 10) : NaN;
  const name = body.name?.trim();

  if (Number.isNaN(jerseyNo) || jerseyNo < 1 || jerseyNo > 99) {
    return NextResponse.json({ error: "jerseyNo required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  try {
    const { profile, created } = await ensurePitchiqPlayerProfile({
      jerseyNo,
      name,
      position: body.position?.trim(),
      squad: body.squad?.trim(),
    });

    return NextResponse.json({
      id: profile.id,
      name: profile.user.name,
      email: profile.user.email,
      jerseyNo: profile.jerseyNo,
      created,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync player";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
