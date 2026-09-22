"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Shuffle,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Star,
  BookOpen,
  GraduationCap,
  Sparkles,
  Repeat,
  CheckCircle2,
  Tv,
} from "lucide-react";
import { getDailyContent, findItemById } from "../../data/schedule";
import { getBookmarks, getTargetDays, isBookmarked, toggleBookmark, PROGRESS_EVENT_NAME } from "../../lib/storage";
import { FlashcardItem } from "../../components/FlashcardModal";
import { FuriganaSentence } from "../../components/FuriganaSentence";
import { AudioButton } from "../../components/AudioButton";
import { WallDisplayModal } from "../../components/WallDisplayModal";
import { getBushuByKanji } from "../../lib/bushu";

export default function FlashcardsDeckPage() {
  const [selectedDay, setSelectedDay] = useState<number | "all" | "starred">(1);
  const [selectedType, setSelectedType] = useState<"all" | "kanji" | "vocab" | "grammar">("all");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [targetDays, setTargetDays] = useState<number>(70);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isDeckCompleted, setIsDeckCompleted] = useState<boolean>(false);
  const [isWallOpen, setIsWallOpen] = useState<boolean>(false);
  const [shuffledSeed, setShuffledSeed] = useState<number>(0);
  const [stats, setStats] = useState<{ gotIt: number; again: number }>({ gotIt: 0, again: 0 });

  useEffect(() => {
    const update = () => {
      setBookmarks(getBookmarks());
      setTargetDays(getTargetDays());
    };
    update();
    window.addEventListener(PROGRESS_EVENT_NAME, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(PROGRESS_EVENT_NAME, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // Build deck based on filters
  const rawDeck: FlashcardItem[] = useMemo(() => {
    const items: FlashcardItem[] = [];

    if (selectedDay === "starred") {
      bookmarks.forEach((bId) => {
        const found = findItemById(bId);
        if (!found) return;

        if (found.type === "kanji") {
          const k = found.item as any;
          items.push({
            id: k.id,
            type: "kanji",
            front: { title: k.kanji, sub: `On: ${k.on || "-"} • Kun: ${k.kun || "-"}`, badge: "Kanji Starred" },
            back: { reading: k.on || k.kun, meaning: k.meaning, notes: k.words?.map((w: any) => `${w.word}: ${w.meaning}`).join(" | ") },
          });
        } else if (found.type === "vocab") {
          const v = found.item as any;
          items.push({
            id: v.id,
            type: "vocab",
            front: { title: v.word, sub: v.reading, badge: v.theme },
            back: { reading: v.reading, meaning: v.meaning, example: v.example },
          });
        } else if (found.type === "grammar") {
          const g = found.item as any;
          items.push({
            id: g.id,
            type: "grammar",
            front: { title: g.pattern, sub: g.connection, badge: "Grammar Starred" },
            back: { meaning: g.meaning, connection: g.connection, example: g.examples?.[0] ? { ja: g.examples[0].japanese, id: g.examples[0].indonesian } : undefined },
          });
        }
      });
    } else {
      const daysToFetch = selectedDay === "all" ? Array.from({ length: 15 }, (_, i) => i + 1) : [selectedDay];

      daysToFetch.forEach((d) => {
        const schedule = getDailyContent(d, targetDays);

        schedule.kanji.forEach((k) => {
          items.push({
            id: k.id,
            type: "kanji",
            front: { title: k.kanji, sub: `On: ${k.on || "-"} • Kun: ${k.kun || "-"}`, badge: `Hari ${d} • Kanji` },
            back: { reading: k.on || k.kun, meaning: k.meaning, notes: k.words?.map((w) => `${w.word}: ${w.meaning}`).join(" | ") },
          });
        });

        schedule.vocab.forEach((v) => {
          items.push({
            id: v.id,
            type: "vocab",
            front: { title: v.word, sub: v.reading, badge: `Hari ${d} • ${v.theme}` },
            back: { reading: v.reading, meaning: v.meaning, example: v.example },
          });
        });

        schedule.grammar.forEach((g) => {
          items.push({
            id: g.id,
            type: "grammar",
            front: { title: g.pattern, sub: g.connection, badge: `Hari ${d} • Bunpou` },
            back: { meaning: g.meaning, connection: g.connection, example: g.examples[0] ? { ja: g.examples[0].japanese, id: g.examples[0].indonesian } : undefined },
          });
        });
      });
    }

    return items;
  }, [selectedDay, bookmarks, targetDays]);

  // Filter by Type
  const filteredDeck = useMemo(() => {
    let list = rawDeck;
    if (selectedType !== "all") {
      list = list.filter((item) => item.type === selectedType);
    }
    if (shuffledSeed > 0) {
      list = [...list].sort(() => Math.sin(shuffledSeed + Math.random()) - 0.5);
    }
    return list;
  }, [rawDeck, selectedType, shuffledSeed]);

  // Reset indices on deck change
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsDeckCompleted(false);
    setStats({ gotIt: 0, again: 0 });
  }, [selectedDay, selectedType, shuffledSeed]);

  const currentCard = filteredDeck[currentIndex];
  const currentBushu = currentCard?.type === "kanji" ? getBushuByKanji(currentCard.front.title) : null;
  const isCurrentBookmarked = currentCard ? bookmarks.includes(currentCard.id) : false;

  const flipCard = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    setStats((prev) => ({ ...prev, gotIt: prev.gotIt + 1 }));
    setIsFlipped(false);
    if (currentIndex + 1 < filteredDeck.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsDeckCompleted(true);
    }
  }, [currentIndex, filteredDeck.length]);

  const handleAgain = useCallback(() => {
    setStats((prev) => ({ ...prev, again: prev.again + 1 }));
    setIsFlipped(false);
    if (currentIndex + 1 < filteredDeck.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsDeckCompleted(true);
    }
  }, [currentIndex, filteredDeck.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        flipCard();
      } else if (e.key === "ArrowRight" || e.key === "2") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "1") {
        e.preventDefault();
        handleAgain();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipCard, handleNext, handleAgain]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="text-emerald-400" size={24} />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
              Interactive Flashcard Deck Player
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Latih active recall kanji, kosakata, dan bunpou dengan navigasi keyboard kilat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShuffledSeed((s) => s + 1)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-750 transition-colors"
          >
            <Shuffle size={14} />
            <span>Acak Kartu</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWallOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Tv size={14} />
            <span>Mode Wall TV</span>
          </button>
        </div>
      </div>

      {/* Control Filters */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Deck Source */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pilih Deck:
            </span>

            <select
              value={selectedDay}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedDay(v === "all" ? "all" : v === "starred" ? "starred" : Number(v));
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="starred">⭐ Hanya Starred / Disimpan ({bookmarks.length})</option>
              <option value="all">📚 Sampel Gabungan (Hari 1-15)</option>
              {Array.from({ length: targetDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Hari {d}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setSelectedType("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedType === "all" ? "bg-slate-800 text-slate-100 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("kanji")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedType === "kanji" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Kanji
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("vocab")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedType === "vocab" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Kosakata
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("grammar")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedType === "grammar" ? "bg-indigo-500/20 text-indigo-300 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tata Bahasa
            </button>
          </div>
        </div>

        {/* Deck Count and Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>
              Kartu ke-<strong>{filteredDeck.length > 0 ? currentIndex + 1 : 0}</strong> dari{" "}
              <strong>{filteredDeck.length}</strong>
            </span>
            <span className="font-mono text-emerald-400">
              {filteredDeck.length > 0
                ? `${Math.round(((currentIndex + 1) / filteredDeck.length) * 100)}%`
                : "0%"}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{
                width: `${filteredDeck.length > 0 ? ((currentIndex + 1) / filteredDeck.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Flashcard Interactive Player */}
      {filteredDeck.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-16 text-center text-slate-400">
          <Layers size={40} className="mx-auto mb-3 text-slate-600" />
          <h3 className="text-lg font-bold text-slate-200">Deck Kosong</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {selectedDay === "starred"
              ? "Belum ada kartu yang di-star. Tekan ikon bintang (⭐) pada kanji, kosakata, atau grammar untuk mengumpulkannya di sini."
              : "Tidak ada kartu yang cocok dengan kriteria filter."}
          </p>
        </div>
      ) : isDeckCompleted ? (
        /* Finished Deck */
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-12 text-center max-w-lg mx-auto shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="text-2xl font-bold text-slate-100">Deck Berhasil Dituntaskan!</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Anda telah melatih semua {filteredDeck.length} kartu dalam deck ini.
          </p>

          <div className="grid grid-cols-2 gap-3 my-6">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5">
              <span className="text-xs text-emerald-400 font-semibold">Sudah Paham</span>
              <p className="text-2xl font-extrabold text-emerald-300 mt-1">{stats.gotIt}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5">
              <span className="text-xs text-amber-400 font-semibold">Perlu Diulang</span>
              <p className="text-2xl font-extrabold text-amber-300 mt-1">{stats.again}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                setIsDeckCompleted(false);
                setIsFlipped(false);
                setStats({ gotIt: 0, again: 0 });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <Repeat size={16} />
              <span>Ulangi Deck</span>
            </button>
            <Link
              href="/"
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/40"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      ) : (
        /* Active Card Player */
        <div className="space-y-6">
          <div
            onClick={flipCard}
            className="cursor-pointer select-none transition-all duration-300"
          >
            <div
              className={`min-h-[380px] rounded-3xl border p-8 sm:p-12 shadow-2xl flex flex-col justify-between transition-all duration-300 ${
                isFlipped
                  ? "border-emerald-500/40 bg-slate-850"
                  : "border-slate-800 bg-slate-900 hover:border-slate-700"
              }`}
            >
              {/* Card Top Banner */}
              <div className="flex items-center justify-between">
                <span className="rounded-xl bg-slate-800 px-3.5 py-1 text-xs font-bold text-slate-300 border border-slate-700">
                  {currentCard.front.badge || currentCard.type}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(currentCard.id);
                    }}
                    className={`p-2 rounded-xl border transition-all ${
                      isCurrentBookmarked
                        ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                        : "border-slate-800 bg-slate-850 text-slate-400 hover:text-amber-400"
                    }`}
                  >
                    <Star size={18} fill={isCurrentBookmarked ? "currentColor" : "none"} />
                  </button>

                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <RotateCw size={13} />
                    <span>{isFlipped ? "Jawaban" : "Klik Balik"}</span>
                  </span>
                </div>
              </div>

              {/* Card Main Face */}
              {!isFlipped ? (
                <div className="my-auto text-center py-6">
                  <h2 className="text-5xl sm:text-7xl font-black font-japanese tracking-wide text-slate-100 mb-3">
                    {currentCard.front.title}
                  </h2>
                  {currentCard.front.sub && (
                    <p className="text-lg text-slate-400 font-japanese mt-2">
                      {currentCard.front.sub}
                    </p>
                  )}
                  <div className="mt-6 flex justify-center">
                    <AudioButton text={currentCard.front.title} size="md" />
                  </div>
                </div>
              ) : (
                /* Card Back Face */
                <div className="my-auto py-6 text-center max-w-2xl mx-auto">
                  {currentCard.back.reading && (
                    <p className="text-2xl font-bold font-japanese text-emerald-400 mb-2">
                      {currentCard.back.reading}
                    </p>
                  )}
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100 leading-tight">
                    {currentCard.back.meaning}
                  </h3>

                  {currentCard.back.connection && (
                    <div className="mt-4 inline-block rounded-xl border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs text-amber-300 font-mono">
                      接続: {currentCard.back.connection}
                    </div>
                  )}

                  {currentCard.type === "kanji" && currentBushu && (
                    <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-center text-xs text-slate-200">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
                          Radikal (Bushu):
                        </span>
                        <span className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-xl bg-indigo-500/20 px-2 font-japanese font-black text-xl text-indigo-400 shadow-sm">
                          {currentBushu.radical}
                        </span>
                        <span className="font-semibold text-slate-100">
                          {currentBushu.nameJa} ({currentBushu.nameRomaji})
                        </span>
                        {currentBushu.positionId && (
                          <span className="rounded bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300">
                            {currentBushu.positionId}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 text-slate-300 text-xs">
                        Makna Radikal: <strong className="text-indigo-400 font-semibold">{currentBushu.meaningId}</strong>
                        <span className="text-slate-400 text-[11px] ml-1.5">({currentBushu.strokes} goresan)</span>
                      </div>
                    </div>
                  )}

                  {currentCard.back.notes && (
                    <p className="mt-4 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-left font-japanese">
                      {currentCard.back.notes}
                    </p>
                  )}

                  {currentCard.back.example && (
                    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-left">
                      <FuriganaSentence
                        text={currentCard.back.example.ja}
                        className="font-semibold text-sm sm:text-base text-slate-200"
                      />
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        {currentCard.back.example.id}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex justify-center">
                    <AudioButton
                      text={currentCard.back.example ? currentCard.back.example.ja : currentCard.front.title}
                      size="sm"
                    />
                  </div>
                </div>
              )}

              {/* Indicator Bottom */}
              <div className="text-center text-xs text-slate-500">
                Tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 font-mono text-[10px]">Space</kbd> untuk membalik kartu
              </div>
            </div>
          </div>

          {/* Action Buttons & Keyboard Hints */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleAgain}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 py-4 text-sm font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
            >
              <ArrowLeft size={18} />
              <span>Belum Hafal (1 / ←)</span>
            </button>

            <button
              type="button"
              onClick={flipCard}
              className="flex items-center justify-center p-4 rounded-2xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-750 transition-colors"
              title="Balik Kartu (Space)"
            >
              <RotateCw size={20} />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-4 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all"
            >
              <span>Sudah Hafal (2 / →)</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Wall Display Modal */}
      <WallDisplayModal
        isOpen={isWallOpen}
        onClose={() => setIsWallOpen(false)}
        cards={filteredDeck}
        dayTitle="Deck Flashcard Maraton"
      />
    </div>
  );
}
