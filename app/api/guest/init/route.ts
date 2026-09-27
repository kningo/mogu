import { NextResponse } from "next/server";
import { executeD1Query } from "../../../../lib/cloudflare/d1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guestCode, mascot } = body;

    if (!guestCode || typeof guestCode !== "string") {
      return NextResponse.json({ error: "guestCode is required" }, { status: 400 });
    }

    const assignedMascot = mascot || "🦊";
    const displayName = `Tamu ${assignedMascot} ${guestCode}`;
    const userId = `guest_${guestCode}`;

    // 1. Insert user record if not exists
    await executeD1Query(
      `INSERT INTO users (id, guest_code, mascot, display_name, auth_provider)
       VALUES (?, ?, ?, ?, 'guest')
       ON CONFLICT(guest_code) DO NOTHING;`,
      [userId, guestCode, assignedMascot, displayName]
    );

    // 2. Insert user_progress record if not exists
    await executeD1Query(
      `INSERT INTO user_progress (user_id, guest_code, completed_days, bookmarks, quiz_results, streak, target_days)
       VALUES (?, ?, '[]', '[]', '{}', '{"current":0,"longest":0,"lastStudyDate":null}', 70)
       ON CONFLICT(user_id) DO NOTHING;`,
      [userId, guestCode]
    );

    return NextResponse.json({ success: true, guestCode, mascot: assignedMascot });
  } catch (error: any) {
    console.error("Error in /api/guest/init:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
