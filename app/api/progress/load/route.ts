import { NextResponse } from "next/server";
import { executeD1Query } from "../../../../lib/cloudflare/d1";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim().toLowerCase();
    const userId = searchParams.get("userId")?.trim();

    if (!code && !userId) {
      return NextResponse.json({ error: "code or userId query parameter is required" }, { status: 400 });
    }

    let progressRows: any[] = [];
    let userRows: any[] = [];

    if (code) {
      progressRows = await executeD1Query(
        `SELECT * FROM user_progress WHERE LOWER(guest_code) = ? LIMIT 1;`,
        [code]
      );
      userRows = await executeD1Query(
        `SELECT * FROM users WHERE LOWER(guest_code) = ? LIMIT 1;`,
        [code]
      );
    } else if (userId) {
      progressRows = await executeD1Query(
        `SELECT * FROM user_progress WHERE user_id = ? LIMIT 1;`,
        [userId]
      );
      userRows = await executeD1Query(
        `SELECT * FROM users WHERE id = ? LIMIT 1;`,
        [userId]
      );
    }

    if (progressRows.length === 0) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    }

    const raw = progressRows[0];
    const user = userRows[0] || {};

    const progress = {
      completedDays: JSON.parse(raw.completed_days || "[]"),
      bookmarks: JSON.parse(raw.bookmarks || "[]"),
      quizResults: JSON.parse(raw.quiz_results || "{}"),
      streak: JSON.parse(raw.streak || '{"current":0,"longest":0,"lastStudyDate":null}'),
      targetDays: raw.target_days || 70,
      settings: JSON.parse(raw.settings || "{}"),
    };

    return NextResponse.json({
      success: true,
      user: {
        id: user.id || raw.user_id,
        guestCode: user.guest_code || raw.guest_code,
        mascot: user.mascot || "🦊",
        displayName: user.display_name || user.guest_code,
        authProvider: user.auth_provider || "guest",
        email: user.email || null,
        avatarUrl: user.avatar_url || null,
      },
      progress,
    });
  } catch (error: any) {
    console.error("Error in /api/progress/load:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
