"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Search,
  X,
  BookOpen,
  Sparkles,
  ArrowRight,
  Languages,
  Layers,
  FileText,
  Compass,
} from "lucide-react";
import kanjiData from "../data/kanji.json";
import vocabData from "../data/vocab.json";
import grammarData from "../data/grammar.json";
import { normalizeSearchQuery } from "../lib/romaji";
import { KanjiItem, VocabItem, GrammarItem } from "../lib/types";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDays: number;
}

type SearchCategory = "all" | "vocab" | "grammar" | "kanji";

interface SearchResultItem {
  id: string;
  type: "vocab" | "grammar" | "kanji";
  title: string;
  sub: string;
  badge: string;
  meaning: string;
  extra?: string;
  dayNumber: number;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  targetDays,
}: GlobalSearchModalProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when search modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setActiveCategory("all");
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prepare datasets with calculated scheduled days
  const allVocab = vocabData as VocabItem[];
  const allGrammar = grammarData as GrammarItem[];
  const allKanji = kanjiData as KanjiItem[];

  const totalVocab = allVocab.length;
  const totalGrammar = allGrammar.length;
  const totalKanji = allKanji.length;

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const { raw, lower, hiragana } = normalizeSearchQuery(query);

    const items: SearchResultItem[] = [];

    // Search Vocab
    if (activeCategory === "all" || activeCategory === "vocab") {
      allVocab.forEach((v, index) => {
        const dayNumber = Math.min(
          targetDays,
          Math.floor((index * targetDays) / totalVocab) + 1
        );
        const matchWord = v.word.toLowerCase().includes(lower);
        const matchReading = v.reading.includes(hiragana) || v.reading.toLowerCase().includes(lower);
        const matchMeaning = v.meaning.toLowerCase().includes(lower);
        const matchExample =
          (v.example?.cleanJa && v.example.cleanJa.includes(hiragana)) ||
          (v.example?.id && v.example.id.toLowerCase().includes(lower));

        if (matchWord || matchReading || matchMeaning || matchExample) {
          items.push({
            id: v.id,
            type: "vocab",
            title: v.word,
            sub: v.reading,
            badge: v.theme || "Kosakata N3",
            meaning: v.meaning,
            extra: v.example?.cleanJa
              ? `「${v.example.cleanJa}」— ${v.example.id || ""}`
              : undefined,
            dayNumber,
          });
        }
      });
    }

    // Search Grammar
    if (activeCategory === "all" || activeCategory === "grammar") {
      allGrammar.forEach((g, index) => {
        const dayNumber = Math.min(
          targetDays,
          Math.floor((index * targetDays) / totalGrammar) + 1
        );
        const matchPattern =
          g.pattern.toLowerCase().includes(lower) ||
          g.pattern.includes(hiragana);
        const matchMeaning = g.meaning.toLowerCase().includes(lower);
        const matchConnection = g.connection.toLowerCase().includes(lower);
        const matchExamples = g.examples?.some(
          (ex) =>
            ex.japanese.includes(hiragana) ||
            ex.indonesian.toLowerCase().includes(lower)
        );

        if (matchPattern || matchMeaning || matchConnection || matchExamples) {
          items.push({
            id: g.id,
            type: "grammar",
            title: g.pattern,
            sub: g.connection,
            badge: "Tata Bahasa N3",
            meaning: g.meaning,
            extra: g.examples?.[0]
              ? `例: ${g.examples[0].japanese} (${g.examples[0].indonesian})`
              : undefined,
            dayNumber,
          });
        }
      });
    }

    // Search Kanji
    if (activeCategory === "all" || activeCategory === "kanji") {
      allKanji.forEach((k, index) => {
        const dayNumber = Math.min(
          targetDays,
          Math.floor((index * targetDays) / totalKanji) + 1
        );
        const matchKanji = k.kanji.includes(raw);
        const matchOn = (k.on || "").includes(hiragana);
        const matchKun = (k.kun || "").includes(hiragana);
        const matchMeaning = k.meaning.toLowerCase().includes(lower);

        if (matchKanji || matchOn || matchKun || matchMeaning) {
          items.push({
            id: k.id,
            type: "kanji",
            title: k.kanji,
            sub: `On: ${k.on || "-"} • Kun: ${k.kun || "-"}`,
            badge: "Kanji N3",
            meaning: k.meaning,
            dayNumber,
          });
        }
      });
    }

    return items;
  }, [
    query,
    activeCategory,
    allVocab,
    allGrammar,
    allKanji,
    targetDays,
    totalVocab,
    totalGrammar,
    totalKanji,
  ]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 !m-0 z-[100] flex items-start justify-center p-4 sm:p-6 md:p-12 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 fade-in duration-200">
        {/* Header with Search Input */}
        <div className="border-b border-slate-800 p-4 sm:p-6 pb-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Compass size={16} />
              </div>
              <h2 className="text-sm font-bold text-slate-100">
                Pencarian Kurikulum N3
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex text-[10px] font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                ESC untuk tutup
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                aria-label="Tutup pencarian"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kanji, romaji (misal: shukuhaku, taberu), arti, atau pola tata bahasa..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 pl-11 pr-10 py-3.5 text-sm text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                activeCategory === "all"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-850 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Layers size={13} />
              <span>Semua</span>
              {query && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/20">
                  {results.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("vocab")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                activeCategory === "vocab"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-850 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Languages size={13} />
              <span>Kosakata</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("grammar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                activeCategory === "grammar"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-850 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <FileText size={13} />
              <span>Tata Bahasa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("kanji")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                activeCategory === "kanji"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-850 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <BookOpen size={13} />
              <span>Kanji</span>
            </button>
          </div>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 divide-y divide-slate-800/60">
          {!query.trim() ? (
            /* Empty state with prompt suggestions */
            <div className="py-12 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-emerald-400 border border-slate-700/80">
                <Search size={22} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-200">
                  Cari apa pun di materi N3
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Ketik dalam huruf romaji, kanji, kana, atau arti bahasa Indonesia.
                </p>
              </div>

              {/* Sample clickable suggestions */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="text-[11px] text-slate-500">Coba cari:</span>
                {[
                  "shukuhaku",
                  "menginap",
                  "わけにはいかない",
                  "berkat",
                  "指示",
                  "terpaksa",
                  "決",
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setQuery(sug)}
                    className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all font-medium"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            /* No results found */
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-bold text-slate-300">
                Tidak ditemukan hasil untuk &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-slate-400">
                Pastikan ejaan benar atau coba kata kunci romaji/arti lainnya.
              </p>
            </div>
          ) : (
            /* Results list */
            results.slice(0, 50).map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="pt-3 first:pt-0 group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-3 hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-1.5 flex-1 pr-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        item.type === "vocab"
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          : item.type === "grammar"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {item.badge}
                    </span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80">
                      Hari {item.dayNumber}
                    </span>

                    <span className="text-xs font-mono text-slate-400">
                      {item.sub}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-100 group-hover:text-emerald-300 transition-colors font-japanese">
                      {item.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-300">
                      {item.meaning}
                    </p>
                  </div>

                  {item.extra && (
                    <p className="text-xs text-slate-400 line-clamp-1 italic">
                      {item.extra}
                    </p>
                  )}
                </div>

                {/* Direct Action Link */}
                <Link
                  href={`/day/${item.dayNumber}`}
                  onClick={onClose}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition-all self-start sm:self-center"
                >
                  <span>Buka Hari {item.dayNumber}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            ))
          )}

          {results.length > 50 && (
            <div className="pt-4 text-center text-xs text-slate-500 font-medium">
              Menampilkan 50 dari {results.length} total hasil. Persempit kata kunci Anda untuk hasil yang lebih spesifik.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800 bg-slate-950/60 px-6 py-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Pencarian mencakup 1.155 Kosakata, 100 Tata Bahasa, dan 650 Kanji N3.
          </span>
          <span className="hidden sm:inline">
            Target sprint aktif: <strong className="text-emerald-400">{targetDays} Hari</strong>
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
