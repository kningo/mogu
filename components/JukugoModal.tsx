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
} from "lucide-react";
import { KanjiCompound } from "../lib/types";
import { AudioButton } from "./AudioButton";
import { FuriganaText } from "./FuriganaText";
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

  // Sync index on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, words.length - 1)));
      setIsSuperZoom(false);
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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="jukugo-modal-title"
      {...{ closedby: "any" }}
      className="fixed inset-0 z-50 m-auto h-full w-full max-w-2xl bg-transparent p-4 backdrop:bg-slate-950/80 backdrop:backdrop-blur-md outline-none"
    >
      <div className="relative flex flex-col rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
              <PenTool size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="jukugo-modal-title" className="text-base font-extrabold text-slate-100">
                  Panduan Menulis & Goresan Jukugo
                </h2>
                {parentKanji && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    Kanji: {parentKanji}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Kisi kotak 4 kuadran (田) untuk melatih proporsi dan arah goresan
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

        {/* Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[78vh]">
          {/* Top Word Summary Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Kosakata Gabungan (Jukugo):
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <FuriganaText
                  kanji={currentWord.word}
                  reading={currentWord.reading}
                  className="text-2xl sm:text-3xl font-black text-slate-100"
                />
                <span className="text-xs sm:text-sm font-mono text-emerald-400 font-semibold">
                  [{currentWord.reading}]
                </span>
              </div>
              <p className="text-sm font-bold text-amber-300 mt-1">
                {currentWord.meaning}
              </p>
            </div>

            {/* Quick Actions in Banner */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <AudioButton text={currentWord.word} size="md" title="Putar Pelafalan Audio Jukugo" />

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
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-400" />
                <span>Detail Goresan per Karakter Kanji:</span>
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                {isSuperZoom ? "Mode Super Zoom Aktif" : "Tekan tombol Super Zoom untuk melihat lebih dekat"}
              </span>
            </div>

            <div className="overflow-x-auto pb-2 pt-1">
              <div className="flex items-center justify-center gap-3 sm:gap-4 flex-nowrap min-w-max mx-auto">
                {characters.map((char, cIdx) => {
                  const strokes = STROKE_MAP[char];
                  const isParent = parentKanji && char === parentKanji;

                  return (
                    <div
                      key={cIdx}
                      className="flex flex-col items-center space-y-2 select-none"
                    >
                      {/* Character Label & Stroke Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          #{cIdx + 1}
                        </span>
                        {isParent && (
                          <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400">
                            Utama
                          </span>
                        )}
                        {strokes && (
                          <span className="rounded-md bg-slate-800 border border-slate-700 px-1.5 py-0.2 text-[10px] font-mono text-slate-300">
                            {strokes} goresan
                          </span>
                        )}
                      </div>

                      {/* The Genkouyoushi Character Box */}
                      <div
                        className={`relative flex items-center justify-center rounded-2xl border-2 transition-all duration-300 shadow-lg ${
                          isSuperZoom
                            ? "h-36 w-36 sm:h-44 sm:w-44 text-7xl sm:text-8xl"
                            : "h-28 w-28 sm:h-36 sm:w-36 text-5xl sm:text-7xl"
                        } ${
                          isParent
                            ? "border-emerald-500/50 bg-emerald-950/20 shadow-emerald-500/10"
                            : "border-slate-700/80 bg-slate-950/80"
                        }`}
                      >
                        {/* 4-Quadrant Crosshair Lines (田) */}
                        {/* Horizontal dashed line */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-700/50 pointer-events-none" />
                        {/* Vertical dashed line */}
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-slate-700/50 pointer-events-none" />

                        {/* Kanji Character */}
                        <span
                          className={`relative z-10 font-japanese font-black tracking-wide leading-none transition-transform duration-200 ${
                            isParent
                              ? "text-emerald-300 drop-shadow-[0_2px_10px_rgba(52,211,153,0.3)]"
                              : "text-slate-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                          }`}
                        >
                          {char}
                        </span>

                        {/* Corner Accents */}
                        <div className="absolute top-1 left-1.5 text-[9px] font-mono text-slate-600 select-none pointer-events-none">
                          ↖
                        </div>
                        <div className="absolute top-1 right-1.5 text-[9px] font-mono text-slate-600 select-none pointer-events-none">
                          ↗
                        </div>
                        <div className="absolute bottom-1 left-1.5 text-[9px] font-mono text-slate-600 select-none pointer-events-none">
                          ↙
                        </div>
                        <div className="absolute bottom-1 right-1.5 text-[9px] font-mono text-slate-600 select-none pointer-events-none">
                          ↘
                        </div>
                      </div>

                      {/* Character Audio Button */}
                      <AudioButton text={char} size="sm" title={`Dengarkan pelafalan karakter ${char}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stroke Practice Helpful Guide */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Sparkles size={14} />
              <span>Panduan Menulis Kanji Rapi:</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px] sm:text-xs">
              Garis bantu putus-putus <strong>4 kuadran (田)</strong> di atas membagi ruang kanji menjadi empat sektor simetris. Saat menulis, perhatikan titik awal dan akhir goresan relatif terhadap garis tengah untuk memastikan keseimbangan proporsi huruf.
            </p>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-900/95">
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
                  title={`Buka Jukugo ${idx + 1}`}
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
