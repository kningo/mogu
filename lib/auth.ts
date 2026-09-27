/**
 * Mogu Authentication & Cloud Sync Helper
 * Manages Guest sessions (mogu-xxxx), mascots (🦊, 🐼, 🐱), and cloud synchronization with Cloudflare D1.
 */

// Unambiguous 32-character set (no 0/O, no 1/l/I)
const CHARSET = "23456789abcdefghjkmnpqrstuvwxyz";

export interface GuestMascot {
  emoji: string;
  name: string;
  title: string;
}

export const MASCOTS: GuestMascot[] = [
  { emoji: "🦊", name: "Kitsune", title: "Kitsune Mogu" },
  { emoji: "🐼", name: "Panda", title: "Panda Mogu" },
  { emoji: "🐱", name: "Maneki-neko", title: "Maneki Mogu" },
];

export interface GuestSession {
  guestCode: string;
  mascot: string;
  mascotName: string;
  createdAt: string;
}

const GUEST_SESSION_KEY = "mogu_guest_session";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Generates random 4-character alphanumeric guest code like "mogu-a7b3"
 */
export function generateGuestCode(): string {
  let result = "";
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    result += CHARSET[randomIndex];
  }
  return `mogu-${result}`;
}

/**
 * Returns deterministic mascot for any mogu-xxxx code
 */
export function getMascotForCode(code: string): GuestMascot {
  const clean = (code || "").replace(/^mogu-/, "").toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % MASCOTS.length;
  return MASCOTS[index];
}

/**
 * Get active guest session from localStorage
 */
export function getActiveGuestSession(): GuestSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Set active guest session in localStorage
 */
export function setActiveGuestSession(session: GuestSession): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error("Error setting guest session:", err);
  }
}

/**
 * Ensures an active guest session exists. If not, creates one and registers in Cloudflare D1.
 */
export function ensureGuestSession(): GuestSession {
  const existing = getActiveGuestSession();
  if (existing && existing.guestCode) {
    return existing;
  }

  const code = generateGuestCode();
  const mascotInfo = getMascotForCode(code);
  const newSession: GuestSession = {
    guestCode: code,
    mascot: mascotInfo.emoji,
    mascotName: mascotInfo.name,
    createdAt: new Date().toISOString(),
  };

  setActiveGuestSession(newSession);

  // Background non-blocking registration to Cloudflare D1
  if (isBrowser()) {
    fetch("/api/guest/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestCode: code, mascot: mascotInfo.emoji }),
    }).catch((err) => console.warn("Background guest init warning:", err));
  }

  return newSession;
}

let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Debounced background sync of progress to Cloudflare D1
 */
export function syncProgressToCloudDebounced(
  progress: {
    completedDays: number[];
    bookmarks: string[];
    quizResults: Record<number, any>;
    streak: any;
    targetDays?: number;
  },
  userIdOrGuestCode?: string
): void {
  if (!isBrowser()) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    try {
      const activeSession = getActiveGuestSession();
      const guestCode = activeSession?.guestCode;
      const idToUse = userIdOrGuestCode || guestCode;

      if (!idToUse) return;

      await fetch("/api/progress/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestCode,
          userId: userIdOrGuestCode?.startsWith("guest_") ? undefined : userIdOrGuestCode,
          completedDays: progress.completedDays,
          bookmarks: progress.bookmarks,
          quizResults: progress.quizResults,
          streak: progress.streak,
          targetDays: progress.targetDays,
        }),
      });
    } catch (err) {
      console.warn("Background cloud sync warning:", err);
    }
  }, 1500); // 1.5 seconds debounce
}

/**
 * Load progress from Cloudflare D1 by guest code
 */
export async function fetchProgressByCode(code: string): Promise<{
  success: boolean;
  user?: any;
  progress?: any;
  error?: string;
}> {
  try {
    const cleanCode = code.trim().toLowerCase();
    const res = await fetch(`/api/progress/load?code=${encodeURIComponent(cleanCode)}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memuat progres dari server." };
  }
}
