"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  X,
  Copy,
  Check,
  Link as LinkIcon,
  Download,
  LogOut,
  Sparkles,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  GuestSession,
  getActiveGuestSession,
  ensureGuestSession,
  getMascotForCode,
  fetchProgressByCode,
  setActiveGuestSession,
} from "../lib/auth";
import { applyLoadedProgress, getAllProgress, getTargetDays } from "../lib/storage";

interface AuthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthProfileModal({ isOpen, onClose }: AuthProfileModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const { data: session, status } = useSession();

  const [guestSession, setGuestSessionState] = useState<GuestSession | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Restore input state
  const [restoreCode, setRestoreCode] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync session state on open
  useEffect(() => {
    if (isOpen) {
      const current = ensureGuestSession();
      setGuestSessionState(current);
      setCopiedCode(false);
      setCopiedLink(false);
      setRestoreMessage(null);
      setRestoreCode("");
    }
  }, [isOpen]);

  // Dialog lifecycle (only open/close via showModal/close)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle native dialog cancel event (Esc key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // When Google session becomes available and was previously guest, link Google account
  useEffect(() => {
    const user = session?.user;
    const guestCode = guestSession?.guestCode;
    if (user && guestCode) {
      const linkAccount = async () => {
        try {
          const localProgress = {
            ...getAllProgress(),
            targetDays: getTargetDays(),
          };

          const res = await fetch("/api/progress/link-google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              googleId: (user as any).id || user.email,
              email: user.email,
              name: user.name,
              image: user.image,
              guestCode: guestCode,
              localProgress,
            }),
          });

          const data = await res.json();
          if (data.success && data.mergedProgress) {
            applyLoadedProgress(data.mergedProgress);
          }
        } catch (err) {
          console.warn("Failed to link Google account to D1:", err);
        }
      };

      linkAccount();
    }
  }, [session, guestSession?.guestCode]);

  const handleCopyCode = async () => {
    if (!guestSession?.guestCode) return;
    try {
      await navigator.clipboard.writeText(guestSession.guestCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleCopyLink = async () => {
    if (!guestSession?.guestCode) return;
    try {
      const url = `${window.location.origin}/?guest=${guestSession.guestCode}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleRestoreFromCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = restoreCode.trim().toLowerCase();
    if (!clean) return;

    setIsRestoring(true);
    setRestoreMessage(null);

    try {
      const data = await fetchProgressByCode(clean);
      if (!data.success || !data.progress) {
        setRestoreMessage({
          type: "error",
          text: data.error || "Kode tidak ditemukan atau belum pernah tersimpan di server.",
        });
        setIsRestoring(false);
        return;
      }

      // Apply loaded progress to local storage & trigger UI update
      applyLoadedProgress(data.progress);

      // Update active guest session to match the loaded code
      const mascot = getMascotForCode(clean);
      const newSession: GuestSession = {
        guestCode: clean,
        mascot: mascot.emoji,
        mascotName: mascot.name,
        createdAt: new Date().toISOString(),
      };
      setActiveGuestSession(newSession);
      setGuestSessionState(newSession);

      setRestoreMessage({
        type: "success",
        text: `Progres dari ${clean} berhasil dimuat! 🎉`,
      });
      setRestoreCode("");
    } catch (err: any) {
      setRestoreMessage({
        type: "error",
        text: err.message || "Terjadi kesalahan saat memuat progres.",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  const isGoogleLoggedIn = Boolean(session?.user);
  const mascotInfo = guestSession ? getMascotForCode(guestSession.guestCode) : null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="auth-profile-title"
      className="fixed inset-0 z-50 m-auto flex items-center justify-center p-3 sm:p-4 w-full max-w-lg bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-md outline-none"
    >
      <div className="relative flex flex-col w-full max-h-[90vh] rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 id="auth-profile-title" className="text-base font-bold text-slate-100">
                Profil & Sinkronisasi Belajar
              </h2>
              <p className="text-xs text-slate-400">
                Kelola akun tamu, magic code, atau hubungkan Google
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Section 1: Active Profile Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {session?.user ? (
                session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "Google User"}
                    className="h-14 w-14 rounded-2xl border-2 border-emerald-500/40 object-cover shadow-md shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl font-bold text-emerald-400 shrink-0">
                    {session.user.name?.charAt(0) || "U"}
                  </div>
                )
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-3xl shadow-inner shrink-0 select-none">
                  {guestSession?.mascot || "🦊"}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100 truncate">
                    {isGoogleLoggedIn
                      ? session?.user?.name || "Akun Google"
                      : mascotInfo?.title || "Tamu Mogu"}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border shrink-0 ${
                      isGoogleLoggedIn
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {isGoogleLoggedIn ? "Google Cloud" : "Akun Tamu"}
                  </span>
                </div>

                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {isGoogleLoggedIn ? session?.user?.email : `ID Akses: ${guestSession?.guestCode}`}
                </p>
              </div>
            </div>

            {isGoogleLoggedIn && (
              <button
                type="button"
                onClick={() => signOut()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-all shrink-0"
                title="Keluar dari akun Google"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
          </div>

          {/* Section 2: Magic Code & Magic Link (Always useful for cross-device) */}
          {guestSession?.guestCode && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Smartphone size={13} className="text-emerald-400" />
                  <span>Magic Code & Link Perangkat</span>
                </label>
                <span className="text-[11px] text-slate-400">Akses tanpa password</span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg select-none">{guestSession.mascot}</span>
                  <span className="text-base font-mono font-bold tracking-wider text-emerald-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
                    {guestSession.guestCode}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                    title="Salin 4 Karakter Magic Code"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedCode ? "Tersalin!" : "Salin Kode"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                    title="Salin Tautan Langsung Magic Link"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-400" /> : <LinkIcon size={14} />}
                    <span>{copiedLink ? "Link Tersalin!" : "Salin Link"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Google Login Upgrade (Only when not logged in) */}
          {!isGoogleLoggedIn && (
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 sm:p-5 space-y-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Simpan Progres Permanen ke Cloud
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                    Hubungkan akun Google agar seluruh kuis, streak, dan progres belajarmu tersimpan aman di cloud dan tidak hilang saat membersihkan cache browser.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signIn("google")}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 px-5 py-3 text-sm font-bold shadow-md transition-all active:scale-98"
              >
                {/* Official Google 'G' Icon */}
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Google</span>
              </button>
            </div>
          )}

          {/* Section 4: Load Progress from Another Device */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5 space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Download size={13} className="text-cyan-400" />
                <span>Punya Kode dari Perangkat Lain?</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Masukkan Magic Code (contoh: <code>mogu-a7b3</code>) untuk memuat progres belajar ke perangkat ini.
              </p>
            </div>

            <form onSubmit={handleRestoreFromCode} className="flex items-center gap-2">
              <input
                type="text"
                value={restoreCode}
                onChange={(e) => setRestoreCode(e.target.value)}
                placeholder="Contoh: mogu-a7b3"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 font-mono focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!restoreCode.trim() || isRestoring}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md transition-all shrink-0"
              >
                {isRestoring ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>Muat</span>
              </button>
            </form>

            {restoreMessage && (
              <div
                className={`flex items-start gap-2 p-2.5 rounded-xl text-xs font-medium ${
                  restoreMessage.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {restoreMessage.type === "success" ? (
                  <Check size={14} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                )}
                <span>{restoreMessage.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 px-6 py-3.5 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>Mogu Cloud Sync • Cloudflare D1</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-750 font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </dialog>
  );
}
