import { UserProgress, QuizResult, StudyStreak } from "./types";

const STORAGE_KEYS = {
  COMPLETED_DAYS: "jlpt_n3_completed_days",
  BOOKMARKS: "jlpt_n3_bookmarks",
  QUIZ_RESULTS: "jlpt_n3_quiz_results",
  STREAK: "jlpt_n3_streak",
  TARGET_DAYS: "jlpt_n3_target_days",
  EXAM_DATE: "jlpt_n3_exam_date",
  THEME: "jlpt_n3_theme",
  ALLOW_FREE_ACCESS: "jlpt_n3_allow_free_access",
  SHOW_BUSHU: "jlpt_n3_show_bushu",
};

export type AppTheme = "dark" | "matcha";

export const DEFAULT_TARGET_DAYS = 70;
export const MIN_TARGET_DAYS = 30;
export const MAX_TARGET_DAYS = 120;

export const PROGRESS_EVENT_NAME = "jlpt_n3_storage_update";

export interface OfficialJLPTDate {
  id: string;
  label: string;
  subLabel: string;
  dateStr: string;
  date: Date;
}

export function getFirstSunday(year: number, month1Indexed: number): Date {
  const d = new Date(year, month1Indexed - 1, 1);
  const dayOfWeek = d.getDay();
  const offset = (7 - dayOfWeek) % 7;
  d.setDate(1 + offset);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function formatDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getUpcomingOfficialDates(fromDate: Date = new Date()): OfficialJLPTDate[] {
  const currentYear = fromDate.getFullYear();
  const candidates: OfficialJLPTDate[] = [];

  for (const yr of [currentYear, currentYear + 1, currentYear + 2]) {
    for (const [m, wave, name] of [
      [7, 1, "Gelombang Juli"],
      [12, 2, "Gelombang Desember"],
    ] as const) {
      const dt = getFirstSunday(yr, m);
      // Keep dates that are future or today
      if (dt.getTime() > fromDate.getTime() - 24 * 60 * 60 * 1000) {
        candidates.push({
          id: `${yr}-${String(m).padStart(2, "0")}`,
          label: `${name} ${yr}`,
          subLabel: `Sesi Gelombang ${wave}`,
          dateStr: formatDateToISO(dt),
          date: dt,
        });
      }
    }
  }

  return candidates.slice(0, 4);
}

export function getDefaultExamDate(): string {
  const upcoming = getUpcomingOfficialDates();
  return upcoming[0]?.dateStr || "2026-12-06";
}

export function parseExamDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d, 9, 0, 0);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? parseExamDate(getDefaultExamDate()) : parsed;
}

export function formatExamDateLabel(input: Date | string): string {
  const d = typeof input === "string" ? parseExamDate(input) : input;
  try {
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d.toDateString();
  }
}

export function formatExamDateCompact(input: Date | string): string {
  const d = typeof input === "string" ? parseExamDate(input) : input;
  try {
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}

export function formatExamDateMedium(input: Date | string): string {
  const d = typeof input === "string" ? parseExamDate(input) : input;
  try {
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d.toDateString();
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function dispatchStorageUpdate() {
  if (isBrowser()) {
    window.dispatchEvent(new Event(PROGRESS_EVENT_NAME));
  }
}

export function getTargetDays(): number {
  if (!isBrowser()) return DEFAULT_TARGET_DAYS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TARGET_DAYS);
    if (!raw) return DEFAULT_TARGET_DAYS;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed)
      ? DEFAULT_TARGET_DAYS
      : Math.max(MIN_TARGET_DAYS, Math.min(MAX_TARGET_DAYS, parsed));
  } catch (err) {
    return DEFAULT_TARGET_DAYS;
  }
}

export function setTargetDays(days: number): void {
  if (!isBrowser()) return;
  try {
    const clamped = Math.max(MIN_TARGET_DAYS, Math.min(MAX_TARGET_DAYS, days));
    localStorage.setItem(STORAGE_KEYS.TARGET_DAYS, clamped.toString());
    dispatchStorageUpdate();
  } catch (err) {
    console.error("Error setting target days:", err);
  }
}

export function getExamDate(): string {
  if (!isBrowser()) return getDefaultExamDate();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAM_DATE);
    if (!raw) return getDefaultExamDate();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }
    return getDefaultExamDate();
  } catch (err) {
    return getDefaultExamDate();
  }
}

export function setExamDate(dateStr: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.EXAM_DATE, dateStr);
    dispatchStorageUpdate();
  } catch (err) {
    console.error("Error setting exam date:", err);
  }
}

export function getTheme(): AppTheme {
  if (!isBrowser()) return "dark";
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME);
    return raw === "matcha" ? "matcha" : "dark";
  } catch {
    return "dark";
  }
}

export function setTheme(theme: AppTheme): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === "matcha") {
      document.documentElement.setAttribute("data-theme", "matcha");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    }
    dispatchStorageUpdate();
  } catch (err) {
    console.error("Error setting theme:", err);
  }
}

export function getAllowFreeAccess(): boolean {
  if (!isBrowser()) return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALLOW_FREE_ACCESS);
    if (raw === null) return true; // Default: Akses Terbuka (true)
    return raw === "true";
  } catch {
    return true;
  }
}

export function setAllowFreeAccess(allow: boolean): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.ALLOW_FREE_ACCESS, String(allow));
    dispatchStorageUpdate();
  } catch (err) {
    console.error("Error setting allow free access:", err);
  }
}

export function getCompletedDays(): number[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPLETED_DAYS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Error reading completed days:", err);
    return [];
  }
}

export function isDayCompleted(dayId: number): boolean {
  const completed = getCompletedDays();
  return completed.includes(dayId);
}

export function setDayCompleted(dayId: number, completed: boolean): void {
  if (!isBrowser()) return;
  try {
    const current = getCompletedDays();
    let updated: number[];
    if (completed) {
      if (!current.includes(dayId)) {
        updated = [...current, dayId].sort((a, b) => a - b);
        updateStudyStreak();
      } else {
        updated = current;
      }
    } else {
      updated = current.filter((id) => id !== dayId);
    }
    localStorage.setItem(STORAGE_KEYS.COMPLETED_DAYS, JSON.stringify(updated));
    dispatchStorageUpdate();
  } catch (err) {
    console.error("Error setting day completion:", err);
  }
}

export function toggleDayCompletion(dayId: number): boolean {
  const completed = isDayCompleted(dayId);
  setDayCompleted(dayId, !completed);
  return !completed;
}

export function getBookmarks(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Error reading bookmarks:", err);
    return [];
  }
}

export function isBookmarked(id: string): boolean {
  const bookmarks = getBookmarks();
  return bookmarks.includes(id);
}

export function toggleBookmark(id: string): boolean {
  if (!isBrowser()) return false;
  try {
    const bookmarks = getBookmarks();
    let updated: string[];
    const willBookmark = !bookmarks.includes(id);
    if (willBookmark) {
      updated = [...bookmarks, id];
    } else {
      updated = bookmarks.filter((bId) => bId !== id);
    }
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
    dispatchStorageUpdate();
    return willBookmark;
  } catch (err) {
    console.error("Error toggling bookmark:", err);
    return false;
  }
}

export function removeBookmark(id: string): void {
  if (!isBrowser()) return;
  try {
    const bookmarks = getBookmarks();
    const updated = bookmarks.filter((bId) => bId !== id);
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
    dispatchStorageUpdate();
  } catch (err) {
    console.error("Error removing bookmark:", err);
  }
}

export function getQuizResults(): Record<number, QuizResult> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUIZ_RESULTS);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("Error reading quiz results:", err);
    return {};
  }
}

export function saveQuizResult(dayId: number, score: number, total: number): QuizResult {
  const passed = score / total >= 0.8;
  const result: QuizResult = {
    score,
    total,
    passed,
    date: new Date().toISOString(),
  };

  if (!isBrowser()) return result;
  try {
    const results = getQuizResults();
    results[dayId] = result;
    localStorage.setItem(STORAGE_KEYS.QUIZ_RESULTS, JSON.stringify(results));
    dispatchStorageUpdate();
  } catch (err) {
    console.error("Error saving quiz result:", err);
  }
  return result;
}

export function getStudyStreak(): StudyStreak {
  const fallback: StudyStreak = { current: 0, longest: 0, lastStudyDate: null };
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

export function updateStudyStreak(): StudyStreak {
  if (!isBrowser()) return { current: 0, longest: 0, lastStudyDate: null };
  try {
    const streak = getStudyStreak();
    const today = new Date().toISOString().slice(0, 10);

    if (streak.lastStudyDate === today) {
      return streak; // Already studied today
    }

    if (!streak.lastStudyDate) {
      streak.current = 1;
      streak.longest = Math.max(streak.longest, 1);
      streak.lastStudyDate = today;
    } else {
      const lastDate = new Date(streak.lastStudyDate);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak.current += 1;
      } else {
        streak.current = 1;
      }
      streak.longest = Math.max(streak.longest, streak.current);
      streak.lastStudyDate = today;
    }

    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
    dispatchStorageUpdate();
    return streak;
  } catch (err) {
    console.error("Error updating streak:", err);
    return { current: 1, longest: 1, lastStudyDate: new Date().toISOString().slice(0, 10) };
  }
}

export function getAllProgress(): UserProgress {
  return {
    completedDays: getCompletedDays(),
    bookmarks: getBookmarks(),
    quizResults: getQuizResults(),
    streak: getStudyStreak(),
  };
}

export function resetAllProgress(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.COMPLETED_DAYS);
    localStorage.removeItem(STORAGE_KEYS.BOOKMARKS);
    localStorage.removeItem(STORAGE_KEYS.QUIZ_RESULTS);
    localStorage.removeItem(STORAGE_KEYS.STREAK);
    dispatchStorageUpdate();
  } catch (err) {
    console.error("Error resetting progress:", err);
  }
}

export function getShowBushu(): boolean {
  if (!isBrowser()) return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHOW_BUSHU);
    return raw === "true";
  } catch {
    return false;
  }
}

export function setShowBushu(show: boolean): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.SHOW_BUSHU, show ? "true" : "false");
    dispatchStorageUpdate();
  } catch (err) {
    console.error("Error setting show bushu:", err);
  }
}
