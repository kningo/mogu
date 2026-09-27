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
} from "lucide-react";

interface FloatingQuickControlsProps {
  showFurigana: boolean;
  onToggleFurigana: () => void;
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
  showBushu,
  onToggleBushu,
  showStrokeControls,
  onToggleStrokeControls,
  kanjiCols = 2,
  onKanjiColsChange,
}: FloatingQuickControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const hasCustomActive = !showFurigana || showBushu || showStrokeControls;

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40 print:hidden">
      {/* Floating Popover Panel */}
      {isOpen && (
        <div
          role="region"
          aria-label="Kontrol Tampilan Belajar"
          className="absolute bottom-14 right-0 w-[300px] sm:w-[325px] rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-4 text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <SlidersHorizontal size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                  Kontrol Tampilan
                </h3>
                <p className="text-[11px] text-slate-400">Pengaturan cepat materi harian</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              aria-label="Tutup panel kontrol"
            >
              <X size={15} />
            </button>
          </div>

          {/* Controls List */}
          <div className="space-y-3">
            {/* Control 1: Furigana Toggle */}
            <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="space-y-0.5 min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  {showFurigana ? (
                    <Eye size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <EyeOff size={14} className="text-amber-400 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-slate-200">
                    Tampilkan Furigana
                  </span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-slate-400">
                  {showFurigana
                    ? "Bacaan hiragana selalu terlihat di atas kanji."
                    : "Sentuh atau arahkan mouse ke kanji untuk mengintip bacaan."}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={showFurigana}
                onClick={onToggleFurigana}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showFurigana ? "bg-emerald-500" : "bg-slate-700"
                }`}
                title={showFurigana ? "Sembunyikan Furigana" : "Tampilkan Furigana"}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    showFurigana ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Control 2: Radikal Bushu */}
            <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="space-y-0.5 min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className={showBushu ? "text-indigo-400 shrink-0" : "text-slate-400 shrink-0"} />
                  <span className="text-xs font-semibold text-slate-200">
                    Radikal Bushu
                  </span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-slate-400">
                  Tampilkan makna & struktur radikal pembentuk kanji.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={showBushu}
                onClick={onToggleBushu}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showBushu ? "bg-indigo-500" : "bg-slate-700"
                }`}
                title={showBushu ? "Nonaktifkan Radikal Bushu" : "Aktifkan Radikal Bushu"}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    showBushu ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Control 3: Stroke Controls (Optional) */}
            {onToggleStrokeControls && typeof showStrokeControls === "boolean" && (
              <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <PlayCircle size={14} className={showStrokeControls ? "text-cyan-400 shrink-0" : "text-slate-400 shrink-0"} />
                    <span className="text-xs font-semibold text-slate-200">
                      Animasi Goresan
                    </span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-slate-400">
                    Tombol putar dan kontrol goresan per langkah kanji.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={showStrokeControls}
                  onClick={onToggleStrokeControls}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showStrokeControls ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                  title={showStrokeControls ? "Sembunyikan Kontrol Goresan" : "Tampilkan Kontrol Goresan"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      showStrokeControls ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Control 4: Layout Kanji (1 Kolom vs 2 Kolom) */}
            {onKanjiColsChange && (
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-200">
                  Tata Letak Kartu Kanji
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => onKanjiColsChange(1)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold transition-all ${
                      kanjiCols === 1
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Rows2 size={13} />
                    <span>1 Baris (Fokus)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onKanjiColsChange(2)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold transition-all ${
                      kanjiCols === 2
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <LayoutGrid size={13} />
                    <span>2 Kolom (Grid)</span>
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
        className={`relative flex items-center justify-center w-12 h-12 rounded-2xl border shadow-xl backdrop-blur-md transition-all active:scale-95 group ${
          isOpen
            ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
            : "bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-slate-850"
        }`}
        title="Kontrol Tampilan Belajar (Furigana, Radikal, Layout)"
        aria-label="Buka Kontrol Tampilan Belajar"
        aria-expanded={isOpen}
      >
        <SlidersHorizontal
          size={20}
          className={`transition-transform duration-200 ${isOpen ? "rotate-90" : "group-hover:scale-110"}`}
        />

        {/* Status dot if active custom modes */}
        {hasCustomActive && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900" />
          </span>
        )}
      </button>
    </div>
  );
}

