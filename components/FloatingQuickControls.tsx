"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SlidersHorizontal,
  X,
  Eye,
  EyeOff,
  Sparkles,
  PlayCircle,
  Rows2,
  LayoutGrid,
  Languages,
  Maximize,
  Minimize,
} from "lucide-react";

interface FloatingQuickControlsProps {
  showFurigana: boolean;
  onToggleFurigana: () => void;
  showMeaning?: boolean;
  onToggleMeaning?: () => void;
  showBushu: boolean;
  onToggleBushu: () => void;
  showStrokeControls?: boolean;
  onToggleStrokeControls?: () => void;
  kanjiCols?: 1 | 2;
  onKanjiColsChange?: (cols: 1 | 2) => void;
}

export function FloatingQuickControls({
  showFurigana,
  onToggleFurigana,
  showMeaning,
  onToggleMeaning,
  showBushu,
  onToggleBushu,
  showStrokeControls,
  onToggleStrokeControls,
  kanjiCols = 2,
  onKanjiColsChange,
}: FloatingQuickControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFull);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    if (typeof window === "undefined") return;
    try {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isFull) {
        const elem = document.documentElement as any;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const hasCustomActive =
    !showFurigana ||
    (typeof showMeaning === "boolean" && !showMeaning) ||
    showBushu ||
    showStrokeControls ||
    isFullscreen;

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40 print:hidden">
      {/* Micro Floating Popover Panel */}
      {isOpen && (
        <div
          role="region"
          aria-label="Kontrol Tampilan Belajar"
          className="absolute bottom-full mb-3 right-0 w-[215px] sm:w-[225px] max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-2.5 text-slate-100"
        >
          {/* Micro Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              Opsi Belajar
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className={`p-1 rounded-md transition-colors ${
                  isFullscreen
                    ? "text-violet-400 bg-violet-500/10 hover:bg-violet-500/20"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                }`}
                title={isFullscreen ? "Keluar Layar Penuh (F11 / Esc)" : "Layar Penuh (F11)"}
                aria-label={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
              >
                {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                aria-label="Tutup panel"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Micro Switch Items (No Paragraphs) */}
          <div className="space-y-1.5">
            {/* 1. Furigana Toggle */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                {showFurigana ? (
                  <Eye size={14} className="text-emerald-400 shrink-0" />
                ) : (
                  <EyeOff size={14} className="text-amber-400 shrink-0" />
                )}
                <span className="text-xs font-medium text-slate-200">Furigana</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={showFurigana}
                onClick={onToggleFurigana}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showFurigana ? "bg-emerald-500" : "bg-slate-700"
                }`}
                title={showFurigana ? "Sembunyikan Furigana (Sentuh/Arahkan kursor ke kanji untuk mengintip)" : "Tampilkan Furigana"}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    showFurigana ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* 2. Arti & Makna Toggle */}
            {onToggleMeaning && typeof showMeaning === "boolean" && (
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <Languages
                    size={14}
                    className={showMeaning ? "text-amber-400 shrink-0" : "text-slate-400 shrink-0"}
                  />
                  <span className="text-xs font-medium text-slate-200">Arti & Makna</span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={showMeaning}
                  onClick={onToggleMeaning}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showMeaning ? "bg-amber-500" : "bg-slate-700"
                  }`}
                  title={
                    showMeaning
                      ? "Sembunyikan Arti (Sentuh/Arahkan kursor untuk mengintip arti)"
                      : "Tampilkan Arti"
                  }
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      showMeaning ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* 3. Radikal Bushu */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className={showBushu ? "text-indigo-400 shrink-0" : "text-slate-400 shrink-0"} />
                <span className="text-xs font-medium text-slate-200">Radikal Bushu</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={showBushu}
                onClick={onToggleBushu}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showBushu ? "bg-indigo-500" : "bg-slate-700"
                }`}
                title={showBushu ? "Nonaktifkan Radikal Bushu" : "Aktifkan Radikal Bushu"}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    showBushu ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* 3. Stroke Controls */}
            {onToggleStrokeControls && typeof showStrokeControls === "boolean" && (
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <PlayCircle size={14} className={showStrokeControls ? "text-cyan-400 shrink-0" : "text-slate-400 shrink-0"} />
                  <span className="text-xs font-medium text-slate-200">Urutan Goresan</span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={showStrokeControls}
                  onClick={onToggleStrokeControls}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showStrokeControls ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                  title={showStrokeControls ? "Sembunyikan Kontrol Goresan" : "Tampilkan Kontrol Goresan"}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      showStrokeControls ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* 4. Layar Penuh (F11) */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                {isFullscreen ? (
                  <Minimize size={14} className="text-violet-400 shrink-0" />
                ) : (
                  <Maximize size={14} className="text-slate-400 shrink-0" />
                )}
                <span className="text-xs font-medium text-slate-200">Layar Penuh (F11)</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isFullscreen}
                onClick={handleToggleFullscreen}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isFullscreen ? "bg-violet-500" : "bg-slate-700"
                }`}
                title={
                  isFullscreen
                    ? "Keluar Layar Penuh (F11 / Esc)"
                    : "Masuk Mode Layar Penuh (F11)"
                }
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isFullscreen ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* 5. Layout Grid */}
            {onKanjiColsChange && (
              <div className="pt-2 mt-1 border-t border-slate-800/80">
                <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onKanjiColsChange(1)}
                    className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-semibold transition-all ${
                      kanjiCols === 1
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="1 Kolom per Kanji (Fokus)"
                  >
                    <Rows2 size={12} />
                    <span>1 Baris</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onKanjiColsChange(2)}
                    className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-semibold transition-all ${
                      kanjiCols === 2
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="2 Kolom per Kanji (Grid)"
                  >
                    <LayoutGrid size={12} />
                    <span>2 Baris</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative flex items-center justify-center w-11 h-11 rounded-2xl border shadow-xl backdrop-blur-md transition-all active:scale-95 group ${
          isOpen
            ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
            : "bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-slate-850"
        }`}
        title="Opsi Tampilan Belajar (Furigana, Radikal, Layout)"
        aria-label="Buka Opsi Tampilan Belajar"
        aria-expanded={isOpen}
      >
        <SlidersHorizontal
          size={18}
          className={`transition-transform duration-200 ${isOpen ? "rotate-90" : "group-hover:scale-110"}`}
        />

        {/* Status dot if active custom modes */}
        {hasCustomActive && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900" />
          </span>
        )}
      </button>
    </div>
  );
}
