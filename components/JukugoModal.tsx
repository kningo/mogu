"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { KanjiCompound } from "../lib/types";
import { AudioButton } from "./AudioButton";
import { FuriganaText } from "./FuriganaText";
import { KanjiStrokeAnimator } from "./KanjiStrokeAnimator";
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
  const [replayKey, setReplayKey] = useState<number>(0);

  // Sync index on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, words.length - 1)));
      setIsSuperZoom(false);
      setReplayKey((k) => k + 1);
    }
  }, [isOpen, initialIndex, words.length]);

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

  const isSingleKanji = words.length === 1 && Boolean(parentKanji && words[0].word === parentKanji);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Panduan Goresan Kanji"
      className="fixed inset-0 z-50 m-auto flex items-center justify-center p-2 sm:p-4 w-full max-w-xl sm:max-w-2xl bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-md outline-none"
    >
      <div className="relative flex flex-col w-full max-h-[88vh] sm:max-h-[92vh] rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header (Minimalist: Only Close Button & Counter) */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-3.5 pb-1 sm:px-6 bg-slate-900">
          {words.length > 1 ? (
            <span className="rounded-lg bg-slate-800/90 border border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-400">
              {currentIndex + 1} / {words.length}
            </span>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-slate-800 bg-slate-800/80 text-slate-400 hover:text-slate-100 hover:bg-slate-750 transition-colors ml-auto"
            title="Tutup (Esc)"
          >
            <X size={18} />
          </button>
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
            {/* Minimalist Action Controls: Replay Semua (When multiple kanji present) */}
            {characters.filter((c) => /[\u4E00-\u9FAF\u3400-\u4DBF々]/.test(c)).length > 1 && (
              <div className="flex items-center justify-end mb-2.5">
                <button
                  type="button"
                  onClick={() => setReplayKey((k) => k + 1)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 text-xs font-semibold transition-all shadow-sm active:scale-95"
                  title="Putar ulang animasi semua kanji sekaligus"
                >
                  <RotateCcw size={12} className="text-emerald-400" />
                  <span>Replay Semua</span>
                </button>
              </div>
            )}

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

                      {/* Animated Stroke Order (KanjiVG - Mazii Style) */}
                      {isKanji ? (
                        <div className="flex flex-col items-center">
                          <KanjiStrokeAnimator
                            key={`${char}-${cIdx}-${replayKey}`}
                            kanji={char}
                            isParent={isParent}
                            boxClassName={getBoxSizeClass()}
                            autoPlay={true}
                            showControls={false}
                            showNumberToggle={true}
                            showReplayButton={true}
                          />
                          <div className="mt-2">
                            <AudioButton text={char} size="sm" title={`Dengarkan pelafalan karakter ${char}`} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2">
                          <div
                            className={`relative flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white transition-all duration-300 shadow-sm ${getBoxSizeClass()}`}
                          >
                            {/* 4-Quadrant Crosshair Lines (田) */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-sky-300/60 pointer-events-none" />
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-sky-300/60 pointer-events-none" />

                            <span className="relative z-10 font-japanese font-black tracking-wide leading-none text-slate-900 select-none">
                              {char}
                            </span>
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
