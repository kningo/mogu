"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Star,
  Trash2,
  Layers,
  BookOpen,
  GraduationCap,
  Sparkles,
  Search,
  ArrowRight,
  Filter,
} from "lucide-react";
import { getBookmarks, removeBookmark, PROGRESS_EVENT_NAME } from "../../lib/storage";
import { findItemById } from "../../data/schedule";
import { FuriganaText } from "../../components/FuriganaText";
import { FuriganaSentence } from "../../components/FuriganaSentence";
import { AudioButton } from "../../components/AudioButton";
import { FlashcardModal, FlashcardItem } from "../../components/FlashcardModal";

export default function ReviewPage() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "kanji" | "vocab" | "grammar">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      setBookmarks(getBookmarks());
    };
    update();
    window.addEventListener(PROGRESS_EVENT_NAME, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(PROGRESS_EVENT_NAME, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // Hydrate bookmarked items
  const hydratedItems = useMemo(() => {
    return bookmarks
      .map((id) => findItemById(id))
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [bookmarks]);

  // Filtered by tab and search
  const filteredItems = useMemo(() => {
    return hydratedItems.filter(({ type, item }) => {
      if (activeTab !== "all" && type !== activeTab) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (type === "kanji") {
          const k = item as any;
          return (
            k.kanji.toLowerCase().includes(q) ||
            k.meaning.toLowerCase().includes(q) ||
            (k.on && k.on.toLowerCase().includes(q)) ||
            (k.kun && k.kun.toLowerCase().includes(q))
          );
        } else if (type === "vocab") {
          const v = item as any;
          return (
            v.word.toLowerCase().includes(q) ||
            v.reading.toLowerCase().includes(q) ||
            v.meaning.toLowerCase().includes(q)
          );
        } else if (type === "grammar") {
          const g = item as any;
          return (
            g.pattern.toLowerCase().includes(q) ||
            g.meaning.toLowerCase().includes(q)
          );
        }
      }

      return true;
    });
  }, [hydratedItems, activeTab, searchQuery]);

  // Build flashcards deck from filtered items
  const flashcardsDeck: FlashcardItem[] = useMemo(() => {
    return filteredItems.map(({ type, item }) => {
      if (type === "kanji") {
        const k = item as any;
        return {
          id: k.id,
          type: "kanji",
          front: { title: k.kanji, sub: `On: ${k.on || "-"} • Kun: ${k.kun || "-"}`, badge: "Kanji Starred" },
          back: { reading: k.on || k.kun, meaning: k.meaning, notes: k.words?.map((w: any) => `${w.word}: ${w.meaning}`).join(" | ") },
        };
      } else if (type === "vocab") {
        const v = item as any;
        return {
          id: v.id,
          type: "vocab",
          front: { title: v.word, sub: v.reading, badge: v.theme },
          back: { reading: v.reading, meaning: v.meaning, example: v.example },
        };
      } else {
        const g = item as any;
        return {
          id: g.id,
          type: "grammar",
          front: { title: g.pattern, sub: g.connection, badge: "Grammar Starred" },
          back: { meaning: g.meaning, connection: g.connection, example: g.examples?.[0] ? { ja: g.examples[0].japanese, id: g.examples[0].indonesian } : undefined },
        };
      }
    });
  }, [filteredItems]);

  const kanjiCount = hydratedItems.filter((i) => i.type === "kanji").length;
  const vocabCount = hydratedItems.filter((i) => i.type === "vocab").length;
  const grammarCount = hydratedItems.filter((i) => i.type === "grammar").length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Star className="text-amber-400 fill-amber-400/40" size={24} />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
              Bank Starred & Registry Kelemahan
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kumpulan kanji, kosakata, dan tata bahasa yang Anda tandai bintang untuk drill intensif.
          </p>
        </div>

        {hydratedItems.length > 0 && (
          <button
            type="button"
            onClick={() => setIsFlashcardModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Layers size={18} />
            <span>Latih Starred ({flashcardsDeck.length} Kartu)</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "all"
                ? "bg-slate-850 text-emerald-400 border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Semua ({hydratedItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kanji")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "kanji"
                ? "bg-slate-850 text-emerald-400 border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen size={14} />
            <span>Kanji ({kanjiCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vocab")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "vocab"
                ? "bg-slate-850 text-emerald-400 border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers size={14} />
            <span>Kosakata ({vocabCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("grammar")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "grammar"
                ? "bg-slate-850 text-emerald-400 border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <GraduationCap size={14} />
            <span>Tata Bahasa ({grammarCount})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari item starred..."
            className="w-full sm:w-64 rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Bookmarked Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-16 text-center text-slate-400">
          <Star size={48} className="mx-auto mb-3 text-slate-600" />
          <h3 className="text-lg font-bold text-slate-200">
            {bookmarks.length === 0
              ? "Belum ada materi yang ditandai bintang (Starred)"
              : "Tidak ada item yang cocok dengan filter atau pencarian"}
          </h3>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
            Klik ikon bintang (⭐) pada kartu kanji, kosakata, atau pola tata bahasa di modul harian untuk menyimpannya ke halaman review ini.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <span>Buka Roadmap Maraton</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map(({ type, item }) => {
            if (type === "kanji") {
              const k = item as any;
              return (
                <div
                  key={k.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 border border-slate-800 text-3xl font-black font-japanese text-slate-50 shadow-inner">
                        {k.kanji}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          Kanji N3
                        </span>
                        <h4 className="text-base font-bold text-slate-100 mt-1">{k.meaning}</h4>
                        <p className="text-xs text-slate-400 font-japanese mt-0.5">
                          {k.on && `ON: ${k.on}`} {k.kun && `• KUN: ${k.kun}`}
                        </p>
                        {k.bushu && (
                          <p className="text-xs text-indigo-400 font-medium mt-1">
                            Bushu: <span className="font-japanese font-bold">[{k.bushu.radical}]</span> {k.bushu.nameJa} ({k.bushu.meaningId})
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <AudioButton text={k.kanji} size="sm" />
                      <button
                        type="button"
                        onClick={() => removeBookmark(k.id)}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-850 text-amber-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                        title="Hapus dari Starred"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            } else if (type === "vocab") {
              const v = item as any;
              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xl font-bold font-japanese text-slate-100">
                            {v.word}
                          </h4>
                          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            {v.reading}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold mt-1 block">
                          {v.theme}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <AudioButton text={v.word} size="sm" />
                        <button
                          type="button"
                          onClick={() => removeBookmark(v.id)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-850 text-amber-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                          title="Hapus dari Starred"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-bold text-amber-300 mt-2">{v.meaning}</p>
                    {v.example && (
                      <div className="mt-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <FuriganaSentence
                          text={v.exampleJaWithFurigana || v.example.ruby || v.example.ja}
                          className="text-xs font-medium"
                        />
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                          {v.example.id}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            } else {
              const g = item as any;
              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between md:col-span-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold font-japanese text-emerald-400">
                          {g.pattern}
                        </h4>
                        <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                          Bunpou
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-200 mt-1">{g.meaning}</p>
                      <span className="text-xs font-mono text-amber-400/90 mt-1 block">
                        Rumus: {g.connection}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <AudioButton text={g.pattern} size="sm" />
                      <button
                        type="button"
                        onClick={() => removeBookmark(g.id)}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-850 text-amber-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                        title="Hapus dari Starred"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Flashcard Modal for Starred Items */}
      <FlashcardModal
        isOpen={isFlashcardModalOpen}
        onClose={() => setIsFlashcardModalOpen(false)}
        items={flashcardsDeck}
        title="Drill Starred & Kelemahan"
      />
    </div>
  );
}
