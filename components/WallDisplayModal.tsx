"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Tv,
  Volume2,
} from "lucide-react";
import { FlashcardItem } from "./FlashcardModal";
import { FuriganaSentence } from "./FuriganaSentence";
import { AudioButton } from "./AudioButton";

interface WallDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: FlashcardItem[];
  dayTitle?: string;
}

export function WallDisplayModal({
  isOpen,
  onClose,
  cards,
  dayTitle = "Mode Display TV / Monitor",
}: WallDisplayModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState(10);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when wall display mode is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const currentCard = cards[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
    startTimeRef.current = Date.now();
    setProgressPercent(0);
  }, [cards.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    startTimeRef.current = Date.now();
    setProgressPercent(0);
  }, [cards.length]);

  // Auto-advance loop
  useEffect(() => {
    if (!isOpen || !isPlaying || cards.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      return;
    }

    startTimeRef.current = Date.now();

    // Progress bar tick
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / (intervalSec * 1000)) * 100);
      setProgressPercent(pct);
    }, 100);

    // Auto next card
    timerRef.current = setInterval(() => {
      handleNext();
    }, intervalSec * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isOpen, isPlaying, intervalSec, cards.length, handleNext]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || cards.length === 0 || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 !m-0 z-[100] flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-850 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Tv size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>{dayTitle}</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Kartu {currentIndex + 1} / {cards.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Mode Wall Ambient TV • Berganti otomatis tiap {intervalSec} detik
            </p>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-3">
          {/* Interval selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
            <Clock size={14} className="text-slate-400" />
            <span>Interval:</span>
            {[5, 10, 15, 30].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setIntervalSec(sec)}
                className={`px-2 py-0.5 rounded font-mono font-bold transition-all ${
                  intervalSec === sec
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Keluar Fullscreen" : "Layar Penuh"}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress tick line */}
      <div className="h-1 w-full bg-slate-900">
        <div
          className="h-full bg-emerald-400 transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Wall Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-16 max-w-5xl mx-auto w-full">
        {currentCard && (
          <div className="w-full flex flex-col items-center text-center">
            {/* Category Tag */}
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-emerald-400 mb-6">
              {currentCard.front.badge || currentCard.type}
            </span>

            {/* Kanji / Main Title Huge Typography */}
            <h1 className="text-7xl sm:text-9xl font-black font-japanese tracking-wider text-slate-50 drop-shadow-2xl mb-4">
              {currentCard.front.title}
            </h1>

            {/* Reading Kana */}
            {currentCard.back.reading && (
              <p className="text-3xl sm:text-4xl font-bold font-japanese text-emerald-400 drop-shadow mb-4">
                {currentCard.back.reading}
              </p>
            )}

            {/* Meaning in Indonesian */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-amber-300 max-w-3xl leading-snug drop-shadow-lg mb-6">
              {currentCard.back.meaning}
            </h2>

            {/* Grammar connection or sub */}
            {currentCard.back.connection && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 px-5 py-2.5 text-base text-slate-300 font-mono mb-6">
                Rumus: <span className="text-amber-400">{currentCard.back.connection}</span>
              </div>
            )}

            {/* Example sentence */}
            {currentCard.back.example && (
              <div className="mt-4 rounded-3xl border border-slate-800/90 bg-slate-900/60 p-6 sm:p-8 max-w-3xl backdrop-blur-sm">
                <FuriganaSentence
                  text={currentCard.back.example.ja}
                  className="text-2xl sm:text-3xl font-semibold mb-2"
                />
                <p className="text-lg sm:text-xl text-slate-400 font-medium leading-relaxed">
                  {currentCard.back.example.id}
                </p>
              </div>
            )}

            {/* Audio speaker */}
            <div className="mt-8">
              <AudioButton
                text={currentCard.back.example ? currentCard.back.example.ja : currentCard.front.title}
                size="lg"
                title="Dengarkan Pelafalan Audio"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-slate-850 bg-slate-950/90 backdrop-blur-md">
        <div className="text-xs text-slate-400 hidden sm:block">
          Gunakan panah keyboard <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 font-mono text-slate-300">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 font-mono text-slate-300">→</kbd> atau <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 font-mono text-slate-300">Space</kbd> untuk Play/Pause
        </div>

        <div className="flex items-center gap-4 mx-auto sm:mx-0">
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all shadow-lg active:scale-95 ${
              isPlaying
                ? "bg-amber-500 text-slate-950 shadow-amber-900/30 hover:bg-amber-400"
                : "bg-emerald-500 text-slate-950 shadow-emerald-900/30 hover:bg-emerald-400"
            }`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            <span>{isPlaying ? "Jeda Otomatis" : "Mulai Putar"}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
