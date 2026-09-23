"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PenTool,
  RotateCcw,
  Sliders,
  Zap,
} from "lucide-react";
import { KanjiCompound } from "../lib/types";
import { AudioButton } from "./AudioButton";
import { FuriganaText } from "./FuriganaText";
import { KanjiStrokeAnimator } from "./KanjiStrokeAnimator";
import { getStrokeControls, setStrokeControls } from "../lib/storage";
import kanjiData from "../data/kanji.json";

interface JukugoModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: KanjiCompound[];
  initialIndex?: number;
  parentKanji?: string;
  parentMeaning?: string;
}

// Precompute quick stroke lookup map for characters
const STROKE_MAP: Record<string, number> = {};
(kanjiData as Array<{ kanji: string; strokes?: number }>).forEach((k) => {
  if (k.kanji && k.strokes) {
    STROKE_MAP[k.kanji] = k.strokes;
  }
});

export function JukugoModal({
  isOpen,
  onClose,
  words,
  initialIndex = 0,
  parentKanji,
  parentMeaning,
}: JukugoModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [isSuperZoom, setIsSuperZoom] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<"stroke" | "font">("stroke");
  const [showControls, setShowControls] = useState<boolean>(() => getStrokeControls());
  const [replayKey, setReplayKey] = useState<number>(0);

  // Sync index and settings on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, words.length - 1)));
      setIsSuperZoom(false);
      setDisplayMode("stroke");
      setShowControls(getStrokeControls());
      setReplayKey((k) => k + 1);
    }
  }, [isOpen, initialIndex, words.length]);

  const handleToggleControls = () => {
    const next = !showControls;
    setShowControls(next);
    setStrokeControls(next);
  };

  // Dialog open/close lifecycle
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

  // Light dismiss on clicking backdrop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isDialogContent) {
        onClose();
      }
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, [onClose]);

  const currentWord = words[currentIndex] || words[0];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : words.length - 1));
  }, [words.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < words.length - 1 ? prev + 1 : 0));
  }, [words.length]);

  // Keyboard navigation: Escape to close, ArrowLeft / ArrowRight to change words
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        setIsSuperZoom((z) => !z);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentWord) return null;

  // Split word into individual characters for stroke grid inspection
  const characters = Array.from(currentWord.word);
  const charCount = characters.length;

  // Dynamic responsive box sizing based on character count and zoom state
  const getBoxSizeClass = () => {
    if (isSuperZoom) {
      if (charCount <= 2) {
        return "w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 text-7xl sm:text-8xl md:text-9xl";
      }
      if (charCount === 3) {
        return "w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 text-6xl sm:text-7xl md:text-8xl";
      }
      return "w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 text-5xl sm:text-6xl md:text-7xl";
    }

    // Normal mode (well-proportioned to modal width)
    if (charCount <= 2) {
      return "w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 text-6xl sm:text-7xl md:text-8xl";
    }
    if (charCount === 3) {
      return "w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 text-5xl sm:text-6xl md:text-7xl";
    }
    return "w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 text-4xl sm:text-5xl md:text-6xl";
  };

  const isSingleKanji = words.length === 1 && parentKanji && words[0].word === parentKanji;
  const modalHeaderTitle = isSingleKanji
    ? `Panduan Menulis Kanji: ${parentKanji}`
    : `Panduan Menulis & Goresan: ${currentWord.word}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="jukugo-modal-title"
      {...{ closedby: "any" }}
      className="fixed inset-0 z-50 m-auto flex items-center justify-center p-2 sm:p-4 w-full max-w-xl sm:max-w-2xl bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-md outline-none"
    >
      <div className="relative flex flex-col w-full max-h-[88vh] sm:max-h-[92vh] rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header (Always pinned on top) */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-800 px-5 py-3 sm:px-6 sm:py-3.5 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
              <PenTool size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="jukugo-modal-title" className="text-base font-extrabold text-slate-100">
                  {modalHeaderTitle}
                </h2>
                {parentKanji && !isSingleKanji && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                    Kanji: {parentKanji}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Kisi kotak 4 kuadran (田) & animasi urutan goresan resmi KanjiVG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {words.length > 1 && (
              <span className="rounded-xl bg-slate-800/90 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">
                {currentIndex + 1} / {words.length}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-800 bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-750 transition-colors"
              title="Tutup (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Content (Smooth inner scroll) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Top Word Summary Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 sm:px-5 sm:py-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                {isSingleKanji ? "Karakter Kanji Utama:" : "Kosakata / Jukugo:"}
              </span>
              <div className="mt-0.5">
                <FuriganaText
                  kanji={currentWord.word}
                  reading={currentWord.reading}
                  className="text-2xl sm:text-3xl font-black text-slate-100"
                />
              </div>
              <p className="text-sm font-bold text-amber-400 mt-1">
                {currentWord.meaning}
              </p>
            </div>

            {/* Quick Actions in Banner */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <AudioButton text={currentWord.word} size="md" title="Putar Pelafalan Audio" />

              {/* Super Zoom Toggle */}
              <button
                type="button"
                onClick={() => setIsSuperZoom((z) => !z)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  isSuperZoom
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold shadow-sm"
                    : "bg-slate-800/90 border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-750"
                }`}
                title={isSuperZoom ? "Kembali ke Ukuran Standar (Tekan Z)" : "Perbesar Ekstra Raksasa (Tekan Z)"}
              >
                {isSuperZoom ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isSuperZoom ? "Zoom Standar" : "Super Zoom (2x)"}</span>
              </button>
            </div>
          </div>

          {/* Character Stroke Practice Grid (Genkouyoushi Boxes) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-400" />
                <span>Detail Goresan per Karakter:</span>
              </span>

              {/* Controls Toolbar: Mazii Autoplay Toggle, Replay All, & Display Mode Switcher */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {/* Stroke Controls Mode Toggle (Autoplay Mazii vs Kontrol Manual) */}
                {displayMode === "stroke" && (
                  <button
                    type="button"
                    onClick={handleToggleControls}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all ${
                      showControls
                        ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400 font-bold shadow-sm"
                        : "border-slate-800 bg-slate-950/70 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30"
                    }`}
                    title={
                      showControls
                        ? "Mode Kontrol Manual Aktif (Klik untuk kembali ke Autoplay Mazii)"
                        : "Mode Autoplay Mazii Aktif (Klik untuk membuka kontrol manual bertahap)"
                    }
                  >
                    {showControls ? <Sliders size={13} className="text-indigo-400" /> : <Zap size={13} className="text-emerald-400" />}
                    <span>{showControls ? "Kontrol: Manual" : "Mode: Autoplay Mazii"}</span>
                  </button>
                )}

                {/* Replay All Button (When multiple kanji present) */}
                {displayMode === "stroke" && characters.filter((c) => /[\u4E00-\u9FAF\u3400-\u4DBF々]/.test(c)).length > 1 && (
                  <button
                    type="button"
                    onClick={() => setReplayKey((k) => k + 1)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 text-xs font-semibold transition-all"
                    title="Putar ulang animasi semua kanji sekaligus"
                  >
                    <RotateCcw size={12} />
                    <span>Replay Semua</span>
                  </button>
                )}

                {/* Display Mode Switcher: Animasi Goresan (KanjiVG) vs Huruf Kaligrafi */}
                <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDisplayMode("stroke")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      displayMode === "stroke"
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Tampilkan animasi urutan goresan bertahap (KanjiVG)"
                  >
                    Animasi Goresan
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode("font")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      displayMode === "font"
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Tampilkan bentuk huruf statis kaligrafi"
                  >
                    Huruf Kaligrafi
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto pb-2 pt-1">
              <div className="flex items-start justify-center gap-3 sm:gap-4 flex-nowrap min-w-max mx-auto px-2">
                {characters.map((char, cIdx) => {
                  const strokes = STROKE_MAP[char];
                  const isParent = Boolean(parentKanji && char === parentKanji);
                  const isKanji = /[\u4E00-\u9FAF\u3400-\u4DBF々]/.test(char);

                  return (
                    <div
                      key={cIdx}
                      className="flex flex-col items-center space-y-1.5 select-none"
                    >
                      {/* Character Label & Stroke Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          #{cIdx + 1}
                        </span>
                        {isParent && (
                          <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Utama
                          </span>
                        )}
                        {strokes && (
                          <span className="rounded-md bg-slate-800/90 border border-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                            {strokes} goresan
                          </span>
                        )}
                      </div>

                      {/* Display Mode 1: Animated Stroke Order (KanjiVG - Mazii Style) */}
                      {displayMode === "stroke" && isKanji ? (
                        <div className="flex flex-col items-center">
                          <KanjiStrokeAnimator
                            key={`${char}-${cIdx}-${replayKey}`}
                            kanji={char}
                            isParent={isParent}
                            boxClassName={getBoxSizeClass()}
                            autoPlay={true}
                            showControls={showControls}
                            showNumberToggle={true}
                            showReplayButton={true}
                          />
                          <div className="mt-2">
                            <AudioButton text={char} size="sm" title={`Dengarkan pelafalan karakter ${char}`} />
                          </div>
                        </div>
                      ) : (
                        /* Display Mode 2: Static Calligraphy Typography Box */
                        <div className="flex flex-col items-center space-y-2">
                          <div
                            className={`relative flex items-center justify-center rounded-2xl border-2 transition-all duration-300 shadow-md ${getBoxSizeClass()} ${
                              isParent
                                ? "border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/20"
                                : "border-slate-300 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-950/80"
                            }`}
                          >
                            {/* 4-Quadrant Crosshair Lines (田) */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-300 dark:border-slate-700/60 pointer-events-none" />
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-slate-300 dark:border-slate-700/60 pointer-events-none" />

                            {/* Kanji Character - Clean, sharp typography without muddy shadow */}
                            <span
                              className={`relative z-10 font-japanese font-black tracking-wide leading-none transition-transform duration-200 select-none ${
                                isParent
                                  ? "text-emerald-600 dark:text-emerald-300"
                                  : "text-slate-900 dark:text-slate-100"
                              }`}
                            >
                              {char}
                            </span>

                            {/* Corner Accents */}
                            <div className="absolute top-1 left-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-600 select-none pointer-events-none">
                              ↖
                            </div>
                            <div className="absolute top-1 right-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-600 select-none pointer-events-none">
                              ↗
                            </div>
                            <div className="absolute bottom-1 left-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-600 select-none pointer-events-none">
                              ↙
                            </div>
                            <div className="absolute bottom-1 right-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-600 select-none pointer-events-none">
                              ↘
                            </div>
                          </div>

                          <AudioButton text={char} size="sm" title={`Dengarkan pelafalan karakter ${char}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stroke Practice Helpful Guide (Compact Tip) */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-2.5 text-xs text-slate-300">
            <Sparkles size={14} className="text-emerald-400 shrink-0" />
            <p className="text-[11px] sm:text-xs text-slate-400 leading-snug">
              <strong>Tips Menulis:</strong> Tekan tombol <strong>Putar</strong> untuk melihat animasi goresan otomatis, atau gunakan tombol panah <strong>&lt; &gt;</strong> untuk mengamati urutan goresan satu per satu secara bertahap.
            </p>
          </div>
        </div>

        {/* Footer Navigation (Always pinned at bottom) */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-800 px-5 py-3 sm:px-6 sm:py-3.5 bg-slate-900/95">
          <button
            type="button"
            onClick={handlePrev}
            disabled={words.length <= 1}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
              words.length <= 1
                ? "border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed"
                : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-750 hover:text-emerald-400 shadow-sm"
            }`}
          >
            <ChevronLeft size={16} />
            <span>Sebelumnya</span>
          </button>

          {/* Indicators for words */}
          {words.length > 1 && (
            <div className="flex items-center gap-1.5">
              {words.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-6 bg-emerald-400"
                      : "w-2 bg-slate-700 hover:bg-slate-600"
                  }`}
                  title={`Buka Kata ${idx + 1}`}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={words.length <= 1}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
              words.length <= 1
                ? "border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed"
                : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-750 hover:text-emerald-400 shadow-sm"
            }`}
          >
            <span>Selanjutnya</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </dialog>
  );
}
