"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Repeat,
  Star,
  Volume2,
} from "lucide-react";
import { FuriganaText } from "./FuriganaText";
import { FuriganaSentence } from "./FuriganaSentence";
import { AudioButton } from "./AudioButton";
import { isBookmarked, toggleBookmark } from "../lib/storage";
import { getBushuByKanji } from "../lib/bushu";
import { BushuDetail } from "../lib/types";

export interface FlashcardItem {
  id: string;
  type: "kanji" | "vocab" | "grammar";
  front: {
    title: string;
    sub?: string;
    badge?: string;
  };
  back: {
    reading?: string;
    meaning: string;
    notes?: string;
    connection?: string;
    bushu?: BushuDetail;
    example?: {
      ja: string;
      id: string;
    };
  };
}

interface FlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FlashcardItem[];
  title?: string;
}

export function FlashcardModal({
  isOpen,
  onClose,
  items,
  title = "Flashcard Sesi Latihan",
}: FlashcardModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [completedDeck, setCompletedDeck] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [sessionStats, setSessionStats] = useState<{ gotIt: number; reviewAgain: number }>({
    gotIt: 0,
    reviewAgain: 0,
  });

  const currentItem = items[currentIndex];
  const currentBushu = currentItem?.back?.bushu || (currentItem?.type === "kanji" ? getBushuByKanji(currentItem.front.title) : null);

  // Sync bookmark state with current item
  useEffect(() => {
    if (currentItem) {
      setBookmarked(isBookmarked(currentItem.id));
    }
  }, [currentItem, currentIndex]);

  // Dialog open/close lifecycle
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setIsFlipped(false);
      setCurrentIndex(0);
      setCompletedDeck(false);
      setSessionStats({ gotIt: 0, reviewAgain: 0 });
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Modern dialog fallback light dismiss
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

  // Next card action
  const handleGotIt = useCallback(() => {
    setSessionStats((prev) => ({ ...prev, gotIt: prev.gotIt + 1 }));
    setIsFlipped(false);

    if (currentIndex + 1 < items.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompletedDeck(true);
    }
  }, [currentIndex, items.length]);

  // Review again action (push current card to later or go back)
  const handleReviewAgain = useCallback(() => {
    setSessionStats((prev) => ({ ...prev, reviewAgain: prev.reviewAgain + 1 }));
    setIsFlipped(false);

    if (currentIndex + 1 < items.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompletedDeck(true);
    }
  }, [currentIndex, items.length]);

  const flipCard = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleToggleStar = () => {
    if (!currentItem) return;
    const newState = toggleBookmark(currentItem.id);
    setBookmarked(newState);
  };

  // Keyboard controls: Space (flip), ArrowRight / '2' (next/got it), ArrowLeft / '1' (again), Esc (close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        flipCard();
      } else if (e.key === "ArrowRight" || e.key === "2") {
        e.preventDefault();
        handleGotIt();
      } else if (e.key === "ArrowLeft" || e.key === "1") {
        e.preventDefault();
        handleReviewAgain();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flipCard, handleGotIt, handleReviewAgain, onClose]);

  if (!isOpen || items.length === 0) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="flashcard-title"
      {...{ closedby: "any" }}
      className="fixed inset-0 z-50 m-auto h-full w-full max-w-2xl bg-transparent p-4 backdrop:bg-slate-950/80 backdrop:backdrop-blur-md outline-none"
    >
      <div className="relative flex h-full max-h-[85vh] flex-col rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3.5 bg-slate-900/90">
          <div>
            <h2 id="flashcard-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{title}</span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-emerald-400 font-mono">
                {currentIndex + 1} / {items.length}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {currentItem && (
              <button
                type="button"
                onClick={handleToggleStar}
                title={bookmarked ? "Hapus dari Starred" : "Simpan ke Starred"}
                className={`p-2 rounded-xl border transition-all ${
                  bookmarked
                    ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                    : "border-slate-800 bg-slate-800/80 text-slate-400 hover:text-amber-400"
                }`}
              >
                <Star size={18} fill={bookmarked ? "currentColor" : "none"} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-800 bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="Tutup Flashcard"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress bar (Hanya bertambah saat kartu dihafal) */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-emerald-500 h-1 transition-all duration-300"
            style={{ width: `${items.length > 0 ? (sessionStats.gotIt / items.length) * 100 : 0}%` }}
          />
        </div>

        {/* Card Canvas */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          {completedDeck ? (
            <div className="text-center py-8 max-w-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-bold text-slate-100">Sesi Latihan Tuntas!</h3>
              <p className="text-sm text-slate-400 mt-2">
                Anda telah mereview semua {items.length} kartu hari ini.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <span className="text-xs text-emerald-400 font-medium">Sudah Paham</span>
                  <p className="text-2xl font-bold text-emerald-300 mt-1">{sessionStats.gotIt}</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <span className="text-xs text-amber-400 font-medium">Perlu Diulang</span>
                  <p className="text-2xl font-bold text-amber-300 mt-1">{sessionStats.reviewAgain}</p>
                </div>
              </div>

              <div className="mt-8 flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(0);
                    setCompletedDeck(false);
                    setIsFlipped(false);
                    setSessionStats({ gotIt: 0, reviewAgain: 0 });
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <Repeat size={16} />
                  Ulangi Sesi
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30"
                >
                  Selesai
                </button>
              </div>
            </div>
          ) : currentItem ? (
            <div
              onClick={flipCard}
              className="w-full max-w-lg cursor-pointer select-none transition-all duration-300"
            >
              <div
                className={`relative flex min-h-[340px] w-full flex-col justify-between rounded-2xl border p-8 shadow-xl transition-all duration-300 ${
                  isFlipped
                    ? "border-emerald-500/40 bg-slate-850"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                {/* Badge top */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-lg bg-slate-800/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-300 border border-slate-700/60">
                    {currentItem.front.badge || currentItem.type}
                  </span>

                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <RotateCw size={12} />
                    <span>{isFlipped ? "Sisi Jawaban (Belakang)" : "Klik untuk Balik"}</span>
                  </span>
                </div>

                {/* Card Front Content */}
                {!isFlipped ? (
                  <div className="my-auto text-center py-6">
                    <div className="text-5xl sm:text-6xl font-bold font-japanese tracking-wide text-slate-100 mb-3">
                      {currentItem.front.title}
                    </div>
                    {currentItem.front.sub && (
                      <p className="text-base text-slate-400 font-japanese mt-2">
                        {currentItem.front.sub}
                      </p>
                    )}
                    <div className="mt-4 flex justify-center">
                      <AudioButton text={currentItem.front.title} size="md" />
                    </div>
                  </div>
                ) : (
                  /* Card Back Content */
                  <div className="my-auto py-4 text-center">
                    {currentItem.back.reading && (
                      <div className="text-xl sm:text-2xl font-bold font-japanese text-emerald-400 mb-2">
                        {currentItem.back.reading}
                      </div>
                    )}
                    <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                      {currentItem.back.meaning}
                    </h4>

                    {currentItem.back.connection && (
                      <div className="mt-4 inline-block rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-1.5 text-xs text-amber-300 font-mono">
                        Rumus: {currentItem.back.connection}
                      </div>
                    )}

                    {currentItem.type === "kanji" && currentBushu && (
                      <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-center text-xs text-slate-200">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
                            Radikal (Bushu):
                          </span>
                          <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg bg-indigo-500/20 px-1.5 font-japanese font-black text-lg text-indigo-400 shadow-sm">
                            {currentBushu.radical}
                          </span>
                          <span className="font-semibold text-slate-100">
                            {currentBushu.nameJa} ({currentBushu.nameRomaji})
                          </span>
                          {currentBushu.positionId && (
                            <span className="rounded bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300">
                              {currentBushu.positionId}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-slate-300 text-xs">
                          Makna: <strong className="text-indigo-400 font-semibold">{currentBushu.meaningId}</strong>
                          <span className="text-slate-400 text-[11px] ml-1.5">({currentBushu.strokes} goresan)</span>
                        </div>
                      </div>
                    )}

                    {currentItem.back.notes && (
                      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left text-xs font-japanese text-slate-400">
                        <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                          Kosakata Terkait:
                        </span>
                        {currentItem.back.notes}
                      </div>
                    )}

                    {currentItem.back.example && (
                      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-left text-xs sm:text-sm">
                        <FuriganaSentence
                          text={currentItem.back.example.ja}
                          className="font-semibold text-slate-200"
                        />
                        <p className="text-slate-400 mt-1">
                          {currentItem.back.example.id}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-center">
                      <AudioButton
                        text={currentItem.back.example ? currentItem.back.example.ja : currentItem.front.title}
                        size="sm"
                      />
                    </div>
                  </div>
                )}

                {/* Flip indicator bottom */}
                <div className="text-center text-[11px] text-slate-400">
                  {isFlipped ? "Klik kartu atau tekan Space untuk kembali ke depan" : "Klik kartu atau tekan Space untuk melihat arti"}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom Actions */}
        {!completedDeck && (
          <div className="border-t border-slate-800 bg-slate-900/95 px-6 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReviewAgain}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all shadow-sm"
                title="Belum Hafal / Ulangi Kartu Ini (Tekan 1 atau ←)"
              >
                <ArrowLeft size={16} />
                <span>Ulangi</span>
              </button>

              <button
                type="button"
                onClick={flipCard}
                className="flex items-center justify-center p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-750 active:scale-95 transition-all shadow-sm"
                title="Balik Kartu (Space)"
              >
                <RotateCw size={18} />
              </button>

              <button
                type="button"
                onClick={handleGotIt}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all shadow-sm"
                title="Sudah Hafal / Lanjut ke Kartu Berikutnya (Tekan 2 atau →)"
              >
                <span>Hafal</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
