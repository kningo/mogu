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
  Loader2,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  GuestSession,
  getActiveGuestSession,
  ensureGuestSession,
  getMascotForCode,
  fetchProgressByCode,
  setActiveGuestSession,
  syncProgressToCloudDebounced,
  MASCOTS,
} from "../lib/auth";
import { applyLoadedProgress, getAllProgress, getTargetDays, getAllSettings } from "../lib/storage";

interface AuthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthProfileModal({ isOpen, onClose }: AuthProfileModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const { data: session } = useSession();

  const [guestSession, setGuestSessionState] = useState<GuestSession | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Mascot selection view toggle
  const [isSelectingMascot, setIsSelectingMascot] = useState(false);

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
      setIsSelectingMascot(false);
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
            settings: getAllSettings(),
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

  const handleSelectMascot = (m: (typeof MASCOTS)[number]) => {
    if (!guestSession) return;
    const updated: GuestSession = {
      ...guestSession,
      mascot: m.emoji,
      mascotName: m.title,
    };
    setActiveGuestSession(updated);
    setGuestSessionState(updated);

    // Sync mascot change to Cloudflare D1
    const progress = getAllProgress();
    const targetDays = getTargetDays();
    const settings = getAllSettings();
    syncProgressToCloudDebounced({
      ...progress,
      targetDays,
      settings,
      mascot: m.emoji,
    });

    // Notify listeners so Navbar Pill updates immediately
    window.dispatchEvent(new Event("jlpt_n3_storage_update"));
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
          text: data.error || "Kode tidak ditemukan di server.",
        });
        setIsRestoring(false);
        return;
      }

      // Apply loaded progress to local storage & trigger UI update
      applyLoadedProgress(data.progress);

      // Update active guest session to match the loaded code & mascot from cloud
      const loadedMascotEmoji = data.user?.mascot || "🦊";
      const matchedMascot = MASCOTS.find((m) => m.emoji === loadedMascotEmoji) || getMascotForCode(clean);
      const newSession: GuestSession = {
        guestCode: clean,
        mascot: matchedMascot.emoji,
        mascotName: matchedMascot.title,
        createdAt: new Date().toISOString(),
      };
      setActiveGuestSession(newSession);
      setGuestSessionState(newSession);

      setRestoreMessage({
        type: "success",
        text: `Progres ${clean} berhasil dimuat! 🎉`,
      });
      setTimeout(() => {
        setRestoreMessage(null);
      }, 2500);
    } catch (err: any) {
      setRestoreMessage({
        type: "error",
        text: err.message || "Gagal memuat progres.",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  const isGoogleLoggedIn = Boolean(session?.user);
  const mascotInfo = guestSession ? getMascotForCode(guestSession.guestCode) : null;
  const activeMascot = MASCOTS.find((m) => m.emoji === guestSession?.mascot) || mascotInfo || MASCOTS[0];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="auth-profile-title"
      className="fixed inset-0 z-50 m-auto flex items-center justify-center p-3 sm:p-4 w-full max-w-[400px] bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm outline-none"
    >
      <div className="relative flex flex-col w-full rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 id="auth-profile-title" className="text-sm font-bold text-slate-100 tracking-tight">
            Profil & Sinkronisasi
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="Tutup modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-3">
          {!isSelectingMascot ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {session?.user ? (
                  session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="h-12 w-12 rounded-2xl border border-emerald-500/40 object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
                      {session.user.name?.charAt(0) || "U"}
                    </div>
                  )
                ) : (
                  <div className="relative group shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsSelectingMascot(true)}
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 hover:scale-105 active:scale-95 border ${activeMascot.borderActive} bg-gradient-to-br ${activeMascot.bgGlow}`}
                      title="Klik untuk memilih maskot karakter"
                    >
                      <span className="transform transition-transform group-hover:scale-115 select-none drop-shadow-md">
                        {activeMascot.emoji}
                      </span>
                      <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] text-emerald-400 shadow-md group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                        <Sparkles size={10} />
                      </span>
                    </button>
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-100 truncate">
                      {isGoogleLoggedIn
                        ? session?.user?.name || "Akun Google"
                        : activeMascot.title}
                    </h3>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono border shrink-0 ${
                        isGoogleLoggedIn
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {isGoogleLoggedIn ? "Cloud" : "Tamu"}
                    </span>
                  </div>

                  {isGoogleLoggedIn ? (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {session?.user?.email}
                    </p>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${activeMascot.tagColor}`}
                      >
                        {activeMascot.trait}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSelectingMascot(true)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 hover:underline transition-colors"
                      >
                        <span>Ganti Maskot</span>
                        <ChevronRight size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isGoogleLoggedIn && (
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11px] font-semibold transition-all shrink-0"
                  title="Keluar dari akun Google"
                >
                  <LogOut size={12} />
                  <span>Keluar</span>
                </button>
              )}
            </div>
          ) : (
            /* Collectible Cards Selection */
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-emerald-400" />
                  <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                    Pilih Maskot Belajar
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSelectingMascot(false)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold px-2 py-0.5 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <span>Selesai</span>
                  <Check size={11} strokeWidth={3} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {MASCOTS.map((m) => {
                  const isSelected = guestSession?.mascot === m.emoji;
                  return (
                    <button
                      key={m.emoji}
                      type="button"
                      onClick={() => {
                        handleSelectMascot(m);
                      }}
                      className={`relative flex flex-col items-center text-center p-2.5 rounded-xl border transition-all duration-200 active:scale-95 group ${
                        isSelected
                          ? `${m.borderActive} bg-gradient-to-b ${m.bgGlow} scale-[1.02]`
                          : "border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* Active Ribbon */}
                      {isSelected && (
                        <span className="absolute -top-1.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black text-[8px] uppercase tracking-wider shadow-sm flex items-center gap-0.5">
                          <Check size={8} strokeWidth={3} />
                          <span>Aktif</span>
                        </span>
                      )}

                      {/* Emoji */}
                      <span className="text-2xl select-none transform transition-transform group-hover:scale-115 block drop-shadow-sm my-1">
                        {m.emoji}
                      </span>

                      {/* Name */}
                      <h4 className="text-[11px] font-bold text-slate-100 leading-tight">
                        {m.name}
                      </h4>

                      {/* Japanese text */}
                      <span className="text-[9px] text-slate-400 font-japanese mt-0.5">
                        {m.jpName.split("•")[0]}
                      </span>

                      {/* Trait badge */}
                      <span className={`mt-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-semibold border ${m.tagColor} leading-tight truncate max-w-full`}>
                        {m.trait}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] text-center text-slate-400 font-medium">
                {activeMascot.desc}
              </p>
            </div>
          )}

          {/* Guest Action Bar: Magic Code & Quick Copy */}
          {!isGoogleLoggedIn && guestSession?.guestCode && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-850">
              <span className="font-mono text-xs font-bold tracking-wider text-emerald-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                {guestSession.guestCode}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700/80 bg-slate-900 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 text-[11px] font-semibold transition-all active:scale-95"
                  title="Salin Magic Code"
                >
                  {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedCode ? "Tersalin" : "Salin Kode"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700/80 bg-slate-900 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 text-[11px] font-semibold transition-all active:scale-95"
                  title="Salin Magic Link"
                >
                  {copiedLink ? <Check size={12} className="text-emerald-400" /> : <LinkIcon size={12} />}
                  <span>{copiedLink ? "Tersalin" : "Salin Link"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Google Login Section (Prominent, High-Contrast Google Button) */}
        {!isGoogleLoggedIn && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => signIn("google")}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2.5 shadow-sm transition-all active:scale-[0.98] group"
            >
              {/* Official Google 'G' Icon */}
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
              <span className="text-gray-800 text-xs font-semibold group-hover:text-gray-900">
                Lanjutkan dengan Google
              </span>
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Sinkronisasi aman ke cloud agar progres tidak hilang
            </p>
          </div>
        )}

        {/* Restore from another device (Directly visible) */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Download size={13} className="text-emerald-400" />
            <span className="font-semibold text-[11px]">Muat Progres Perangkat Lain</span>
          </div>

          <form onSubmit={handleRestoreFromCode} className="flex gap-2">
            <input
              type="text"
              value={restoreCode}
              onChange={(e) => setRestoreCode(e.target.value)}
              placeholder="Contoh: mogu-a7b3"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:border-emerald-500/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!restoreCode.trim() || isRestoring}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0 active:scale-95"
            >
              {isRestoring ? <Loader2 size={12} className="animate-spin" /> : "Muat"}
            </button>
          </form>

          {restoreMessage && (
            <div
              className={`flex items-start gap-1.5 p-2 rounded-lg text-xs font-medium ${
                restoreMessage.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {restoreMessage.type === "success" ? (
                <Check size={13} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
              )}
              <span>{restoreMessage.text}</span>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
