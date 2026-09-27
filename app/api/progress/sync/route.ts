import { NextResponse } from "next/server";
import { executeD1Query } from "../../../../lib/cloudflare/d1";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Endpoint /api/progress/sync siap menerima sinkronisasi data via POST.",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      guestCode,
      userId: passedUserId,
      completedDays,
      bookmarks,
      quizResults,
      streak,
      targetDays,
      settings,
      mascot,
    } = body;

    if (!guestCode && !passedUserId) {
      return NextResponse.json({ error: "guestCode or userId is required" }, { status: 400 });
    }

    // Normalize userId: if it's missing, identical to guestCode, or starts with "mogu-", format as guest_<guestCode>
    let userId = passedUserId;
    if (!userId || userId === guestCode || userId.startsWith("mogu-")) {
      userId = guestCode ? `guest_${guestCode}` : userId;
    }

    const completedDaysStr = JSON.stringify(completedDays || []);
    const bookmarksStr = JSON.stringify(bookmarks || []);
    const quizResultsStr = JSON.stringify(quizResults || {});
    const streakStr = JSON.stringify(streak || { current: 0, longest: 0, lastStudyDate: null });
    const targetDaysNum = typeof targetDays === "number" ? targetDays : 70;
    const settingsStr = JSON.stringify(settings || {});

    // 1. Ensure user exists in users table (if guest)
    if (guestCode && (!passedUserId || passedUserId === guestCode || passedUserId.startsWith("mogu-") || passedUserId === `guest_${guestCode}`)) {
      const assignedMascot = mascot || "🦊";
      const displayName = `Tamu ${assignedMascot} ${guestCode}`;
      await executeD1Query(
        `INSERT INTO users (id, guest_code, mascot, display_name, auth_provider)
         VALUES (?, ?, ?, ?, 'guest')
         ON CONFLICT(guest_code) DO UPDATE SET
           mascot = COALESCE(?, users.mascot),
           updated_at = CURRENT_TIMESTAMP;`,
        [userId, guestCode, assignedMascot, displayName, mascot || null]
      );
    }

    // 2. Upsert into user_progress
    await executeD1Query(
      `INSERT INTO user_progress (user_id, guest_code, completed_days, bookmarks, quiz_results, streak, target_days, settings, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         guest_code = COALESCE(excluded.guest_code, user_progress.guest_code),
         completed_days = excluded.completed_days,
         bookmarks = excluded.bookmarks,
         quiz_results = excluded.quiz_results,
         streak = excluded.streak,
         target_days = excluded.target_days,
         settings = excluded.settings,
         updated_at = CURRENT_TIMESTAMP;`,
      [userId, guestCode || null, completedDaysStr, bookmarksStr, quizResultsStr, streakStr, targetDaysNum, settingsStr]
    );

    // 3. If mascot is provided, update users table
    if (mascot) {
      await executeD1Query(
        `UPDATE users SET mascot = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR LOWER(guest_code) = ?;`,
        [mascot, userId, (guestCode || "").toLowerCase()]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/progress/sync:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
