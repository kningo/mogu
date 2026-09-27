import { NextResponse } from "next/server";
import { executeD1Query } from "../../../../lib/cloudflare/d1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      googleId,
      email,
      name,
      image,
      guestCode,
      localProgress,
    } = body;

    if (!googleId || !email) {
      return NextResponse.json({ error: "googleId and email are required" }, { status: 400 });
    }

    // 1. Upsert Google user into users table
    await executeD1Query(
      `INSERT INTO users (id, guest_code, display_name, email, avatar_url, auth_provider, updated_at)
       VALUES (?, ?, ?, ?, ?, 'google', CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         email = excluded.email,
         avatar_url = excluded.avatar_url,
         auth_provider = 'google',
         updated_at = CURRENT_TIMESTAMP;`,
      [googleId, guestCode || null, name || email.split("@")[0], email, image || null]
    );

    // 2. Fetch existing Google user progress if any
    const existingGoogleRows = await executeD1Query(
      `SELECT * FROM user_progress WHERE user_id = ? LIMIT 1;`,
      [googleId]
    );

    let mergedCompletedDays: number[] = localProgress?.completedDays || [];
    let mergedBookmarks: string[] = localProgress?.bookmarks || [];
    let mergedQuizResults: Record<string, any> = localProgress?.quizResults || {};
    let mergedStreak = localProgress?.streak || { current: 0, longest: 0, lastStudyDate: null };
    let mergedTargetDays = localProgress?.targetDays || 70;
    let mergedSettings: Record<string, any> = localProgress?.settings || {};

    if (existingGoogleRows.length > 0) {
      const gRow = existingGoogleRows[0];
      const gCompletedDays: number[] = JSON.parse(gRow.completed_days || "[]");
      const gBookmarks: string[] = JSON.parse(gRow.bookmarks || "[]");
      const gQuizResults: Record<string, any> = JSON.parse(gRow.quiz_results || "{}");
      const gStreak = JSON.parse(gRow.streak || '{"current":0,"longest":0,"lastStudyDate":null}');
      const gSettings: Record<string, any> = JSON.parse(gRow.settings || "{}");

      // Union completed days
      mergedCompletedDays = Array.from(new Set([...mergedCompletedDays, ...gCompletedDays])).sort((a, b) => a - b);
      // Union bookmarks
      mergedBookmarks = Array.from(new Set([...mergedBookmarks, ...gBookmarks]));
      // Merge quiz results (keep passed or highest score)
      mergedQuizResults = { ...gQuizResults, ...mergedQuizResults };
      // Merge streak
      mergedStreak = {
        current: Math.max(mergedStreak.current || 0, gStreak.current || 0),
        longest: Math.max(mergedStreak.longest || 0, gStreak.longest || 0),
        lastStudyDate: mergedStreak.lastStudyDate || gStreak.lastStudyDate,
      };
      if (gRow.target_days) {
        mergedTargetDays = gRow.target_days;
      }
      mergedSettings = { ...gSettings, ...mergedSettings };
    }

    // 3. Upsert merged progress into user_progress under Google user ID
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
      [
        googleId,
        guestCode || null,
        JSON.stringify(mergedCompletedDays),
        JSON.stringify(mergedBookmarks),
        JSON.stringify(mergedQuizResults),
        JSON.stringify(mergedStreak),
        mergedTargetDays,
        JSON.stringify(mergedSettings),
      ]
    );

    return NextResponse.json({
      success: true,
      mergedProgress: {
        completedDays: mergedCompletedDays,
        bookmarks: mergedBookmarks,
        quizResults: mergedQuizResults,
        streak: mergedStreak,
        targetDays: mergedTargetDays,
        settings: mergedSettings,
      },
    });
  } catch (error: any) {
    console.error("Error in /api/progress/link-google:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
