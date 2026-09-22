"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Layers,
  BookOpen,
  GraduationCap,
  Star,
  Tv,
  CheckCircle2,
  Sparkles,
  Volume2,
  List,
  Rows2,
  LayoutGrid,
  Lock,
} from "lucide-react";
import { getDailyContent } from "../../../data/schedule";
import { FuriganaText } from "../../../components/FuriganaText";
import { FuriganaSentence } from "../../../components/FuriganaSentence";
import { AudioButton } from "../../../components/AudioButton";
import { FlashcardModal, FlashcardItem } from "../../../components/FlashcardModal";
import { WallDisplayModal } from "../../../components/WallDisplayModal";
import { QuizWidget } from "../../../components/QuizWidget";
import {
  isBookmarked,
  toggleBookmark,
  isDayCompleted,
  setDayCompleted,
  getTargetDays,
  getCompletedDays,
  getAllowFreeAccess,
  getShowBushu,
  setShowBushu,
  DEFAULT_TARGET_DAYS,
  PROGRESS_EVENT_NAME,
} from "../../../lib/storage";
import { getBushuByKanji } from "../../../lib/bushu";

export default function DailyLessonPage() {
  const params = useParams();
  const router = useRouter();

  const [targetDays, setTargetDays] = useState<number>(DEFAULT_TARGET_DAYS);

  useEffect(() => {
    setTargetDays(getTargetDays());
  }, []);

  const dayIdNum = useMemo(() => {
    const raw = Number(params?.dayId);
    return isNaN(raw) ? 1 : Math.max(1, Math.min(raw, targetDays));
  }, [params?.dayId, targetDays]);

  const schedule = useMemo(() => getDailyContent(dayIdNum, targetDays), [dayIdNum, targetDays]);

  const [activeTab, setActiveTab] = useState<"all" | "kanji" | "vocab" | "grammar">("all");
  const [kanjiCols, setKanjiCols] = useState<1 | 2>(1);
  const [vocabViewMode, setVocabViewMode] = useState<"full" | "compact">("full");
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const [isWallModeOpen, setIsWallModeOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(new Set());
  const [allowFreeAccess, setAllowFreeAccess] = useState<boolean>(true);
  const [showBushu, setShowBushuState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedVocab = localStorage.getItem("jlpt_n3_vocab_view_mode");
      if (savedVocab === "compact" || savedVocab === "full") {
        setVocabViewMode(savedVocab);
      }
      const savedKanji = localStorage.getItem("jlpt_n3_kanji_cols");
      if (savedKanji === "2") {
        setKanjiCols(2);
      } else if (savedKanji === "1") {
        setKanjiCols(1);
      }
      setShowBushuState(getShowBushu());
    } catch {}
  }, []);

  const handleKanjiColsChange = (cols: 1 | 2) => {
    setKanjiCols(cols);
    try {
      localStorage.setItem("jlpt_n3_kanji_cols", cols.toString());
    } catch {}
  };

  const handleToggleBushu = () => {
    const next = !showBushu;
    setShowBushuState(next);
    setShowBushu(next);
  };

  const handleVocabViewModeChange = (mode: "full" | "compact") => {
    setVocabViewMode(mode);
    try {
      localStorage.setItem("jlpt_n3_vocab_view_mode", mode);
    } catch {}
  };

  useEffect(() => {
    const syncState = () => {
      setTargetDays(getTargetDays());
      setIsCompleted(isDayCompleted(dayIdNum));
      setAllowFreeAccess(getAllowFreeAccess());
      setShowBushuState(getShowBushu());

      // Build bookmarked set for all items in this day
      const currentSet = new Set<string>();
      schedule.kanji.forEach((k) => {
        if (isBookmarked(k.id)) currentSet.add(k.id);
      });
      schedule.vocab.forEach((v) => {
        if (isBookmarked(v.id)) currentSet.add(v.id);
      });
      schedule.grammar.forEach((g) => {
        if (isBookmarked(g.id)) currentSet.add(g.id);
      });
      setBookmarkedSet(currentSet);
    };

    syncState();
    window.addEventListener(PROGRESS_EVENT_NAME, syncState);
    window.addEventListener("storage", syncState);

    return () => {
      window.removeEventListener(PROGRESS_EVENT_NAME, syncState);
      window.removeEventListener("storage", syncState);
    };
  }, [dayIdNum, schedule]);

  const handleToggleBookmark = (id: string) => {
    toggleBookmark(id);
    setBookmarkedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build flashcards deck for today
  const flashcards: FlashcardItem[] = useMemo(() => {
    const deck: FlashcardItem[] = [];

    // Kanji
    schedule.kanji.forEach((k) => {
      deck.push({
        id: k.id,
        type: "kanji",
        front: {
          title: k.kanji,
          sub: `On: ${k.on || "-"} • Kun: ${k.kun || "-"}`,
          badge: "Kanji N3",
        },
        back: {
          reading: k.on || k.kun,
          meaning: k.meaning,
          notes: k.words?.map((w) => `${w.word} (${w.reading}): ${w.meaning}`).join(" | "),
        },
      });
    });

    // Vocab
    schedule.vocab.forEach((v) => {
      deck.push({
        id: v.id,
        type: "vocab",
        front: {
          title: v.word,
          sub: v.reading,
          badge: v.theme,
        },
        back: {
          reading: v.reading,
          meaning: v.meaning,
          example: v.example,
        },
      });
    });

    // Grammar
    schedule.grammar.forEach((g) => {
      deck.push({
        id: g.id,
        type: "grammar",
        front: {
          title: g.pattern,
          sub: g.connection,
          badge: "Grammar N3",
        },
        back: {
          meaning: g.meaning,
          connection: g.connection,
          example: g.examples[0]
            ? { ja: g.examples[0].japanese, id: g.examples[0].indonesian }
            : undefined,
        },
      });
    });

    return deck;
  }, [schedule]);

  const prevDay = dayIdNum > 1 ? dayIdNum - 1 : null;
  const nextDay = dayIdNum < targetDays ? dayIdNum + 1 : null;

  const nextIncompleteDay = useMemo(() => {
    const completed = getCompletedDays();
    for (let d = 1; d <= targetDays; d++) {
      if (!completed.includes(d)) return d;
    }
    return 1;
  }, [targetDays, isCompleted]);

  const isCurrentDayLocked = !allowFreeAccess && dayIdNum > nextIncompleteDay;
  const isNextDayLocked = !allowFreeAccess && nextDay !== null && nextDay > nextIncompleteDay;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Day Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Compass size={14} />
            <span>Semua Roadmap</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-bold text-emerald-400">
            Hari {dayIdNum} dari {targetDays}
          </span>
        </div>

        {/* Prev / Next buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {prevDay ? (
            <Link
              href={`/day/${prevDay}`}
              className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Hari {prevDay}</span>
            </Link>
          ) : (
            <span className="text-xs text-slate-600 px-3 py-1.5">Awal Maraton</span>
          )}

          {nextDay ? (
            isNextDayLocked ? (
              <span
                title={`Hari ${nextDay} terkunci dalam Mode Sekuensial. Selesaikan Hari ${nextIncompleteDay} terlebih dahulu atau aktifkan Akses Terbuka di Roadmap.`}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-1.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
              >
                <Lock size={13} />
                <span>Hari {nextDay}</span>
              </span>
            ) : (
              <Link
                href={`/day/${nextDay}`}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <span>Hari {nextDay}</span>
                <ChevronRight size={16} />
              </Link>
            )
          ) : (
            <span className="text-xs text-emerald-500 font-bold px-3 py-1.5">Hari Terakhir!</span>
          )}
        </div>
      </div>

      {/* Notice for direct access when in Sequential Lock Mode */}
      {isCurrentDayLocked && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
              <Lock size={14} />
            </div>
            <p className="text-amber-200">
              <strong>Mode Sekuensial:</strong> Modul ini berstatus terkunci sampai Hari {nextIncompleteDay} selesai. Anda dapat membuka semua hari kapan saja melalui tombol <strong>Akses Terbuka</strong> di Roadmap.
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/30 transition-colors"
          >
            Ke Roadmap
          </Link>
        </div>
      )}

      {/* Day Hero Header Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-400 font-mono">
                MODUL {dayIdNum}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/20 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 size={13} />
                  Selesai
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-100 tracking-tight">
              {schedule.title}
            </h1>
            <p className="text-sm text-slate-400">
              Fokus Utama: <span className="text-slate-200 font-medium">{schedule.focus}</span>
            </p>

            {/* Quick module stats */}
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-2.5 py-1 border border-slate-800">
                <BookOpen size={13} className="text-emerald-400" />
                <strong className="text-slate-200">{schedule.kanji.length}</strong> Kanji
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-2.5 py-1 border border-slate-800">
                <Layers size={13} className="text-cyan-400" />
                <strong className="text-slate-200">{schedule.vocab.length}</strong> Kosakata
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-2.5 py-1 border border-slate-800">
                <GraduationCap size={13} className="text-indigo-400" />
                <strong className="text-slate-200">{schedule.grammar.length}</strong> Tata Bahasa
              </span>
            </div>
          </div>

          {/* Action Launchers: Flashcards & Wall Mode */}
          <div className="flex flex-wrap lg:flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsFlashcardOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Layers size={18} />
              <span>Latihan Flashcards ({flashcards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWallModeOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-750 transition-colors active:scale-95"
            >
              <Tv size={18} className="text-emerald-400" />
              <span>Mode Wall TV</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Segment Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "all"
              ? "bg-slate-800 text-emerald-400 border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Semua Materi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("kanji")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "kanji"
              ? "bg-slate-800 text-emerald-400 border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen size={15} />
          <span>Kanji ({schedule.kanji.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vocab")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "vocab"
              ? "bg-slate-800 text-emerald-400 border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers size={15} />
          <span>Kosakata ({schedule.vocab.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("grammar")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "grammar"
              ? "bg-slate-800 text-emerald-400 border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <GraduationCap size={15} />
          <span>Tata Bahasa ({schedule.grammar.length})</span>
        </button>
      </div>

      {/* SECTION 1: KANJI */}
      {(activeTab === "all" || activeTab === "kanji") && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <BookOpen size={18} />
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                Bagian Kanji ({schedule.kanji.length} Karakter)
              </h2>
            </div>

            {/* Kanji Controls: Bushu Toggle & Layout Switcher */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Bushu Radical Toggle */}
              <button
                type="button"
                onClick={handleToggleBushu}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  showBushu
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold shadow-sm"
                    : "border-slate-800 bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
                title={showBushu ? "Sembunyikan Informasi Radikal (Bushu)" : "Tampilkan Informasi Radikal (Bushu)"}
              >
                <Sparkles size={13} className={showBushu ? "text-emerald-400" : "text-slate-400"} />
                <span>Radikal Bushu: {showBushu ? "Aktif" : "Off"}</span>
              </button>

              {/* Kanji Layout Switcher: 1 Baris (Fokus) vs 2 Baris (Grid) */}
              <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs font-semibold shadow-sm">
                <button
                  type="button"
                  onClick={() => handleKanjiColsChange(1)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    kanjiCols === 1
                      ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Tampilan 1 Baris per Kanji (Mode Fokus)"
                >
                  <Rows2 size={13} />
                  <span>1 Baris (Fokus)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleKanjiColsChange(2)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    kanjiCols === 2
                      ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Tampilan 2 Kolom (Grid)"
                >
                  <LayoutGrid size={13} />
                  <span>2 Baris (Grid)</span>
                </button>
              </div>
            </div>
          </div>

          <div className={`grid gap-4 ${kanjiCols === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {schedule.kanji.map((kanjiItem) => {
              const isStarred = bookmarkedSet.has(kanjiItem.id);

              return (
                <div
                  key={kanjiItem.id}
                  className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Big Character */}
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-950 border border-slate-800 text-4xl sm:text-5xl font-black font-japanese text-slate-50 shadow-inner">
                        {kanjiItem.kanji}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-emerald-400">
                            {kanjiItem.meaning}
                          </h3>
                        </div>

                        {kanjiItem.on && (
                          <p className="text-xs text-slate-300">
                            <span className="text-slate-500 font-mono mr-1">ON:</span>
                            <span className="font-japanese font-semibold text-amber-300">
                              {kanjiItem.on}
                            </span>
                          </p>
                        )}

                        {kanjiItem.kun && (
                          <p className="text-xs text-slate-300">
                            <span className="text-slate-500 font-mono mr-1">KUN:</span>
                            <span className="font-japanese font-semibold text-cyan-300">
                              {kanjiItem.kun}
                            </span>
                          </p>
                        )}

                        {kanjiItem.strokes && (
                          <p className="text-[10px] text-slate-500">
                            {kanjiItem.strokes} Goresan
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Star & Audio Actions */}
                    <div className="flex items-center gap-1.5">
                      <AudioButton text={kanjiItem.kanji} size="sm" />
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(kanjiItem.id)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isStarred
                            ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                            : "border-slate-800 bg-slate-850 text-slate-400 hover:text-amber-400"
                        }`}
                        title={isStarred ? "Hapus dari Starred" : "Simpan ke Starred"}
                      >
                        <Star size={16} fill={isStarred ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>

                  {/* Bushu Radical Badge (Active when toggled on) */}
                  {showBushu && (() => {
                    const bushu = getBushuByKanji(kanjiItem.kanji);
                    if (!bushu) return null;
                    return (
                      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 text-xs font-semibold text-emerald-300">
                          <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">Bushu:</span>
                          <span className="font-japanese font-black text-sm text-emerald-200">{bushu.radical}</span>
                          <span>{bushu.nameJa} ({bushu.nameRomaji})</span>
                        </span>
                        {bushu.positionId && (
                          <span className="rounded-lg bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[11px] text-slate-300">
                            Posisi: {bushu.positionId}
                          </span>
                        )}
                        <span className="text-slate-300">
                          Makna: <strong className="text-emerald-300 font-medium">{bushu.meaningId}</strong>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({bushu.strokes} goresan)
                        </span>
                      </div>
                    );
                  })()}

                  {/* Compound Words (Jukugo) with Ruby/Furigana */}
                  {kanjiItem.words && kanjiItem.words.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Kosakata Gabungan (Jukugo):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {kanjiItem.words.map((w, wIdx) => (
                          <div
                            key={wIdx}
                            className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 flex items-center justify-between gap-3 shadow-sm hover:border-slate-700/80 transition-colors"
                          >
                            <div className="min-w-0">
                              <FuriganaText
                                kanji={w.word}
                                reading={w.reading}
                                className="text-[1.5rem] font-bold text-slate-100 leading-snug"
                              />
                              <p className="text-xs text-slate-400 mt-0.5">{w.meaning}</p>
                            </div>
                            <AudioButton text={w.word} size="sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2: VOCABULARY */}
      {(activeTab === "all" || activeTab === "vocab") && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Layers size={18} />
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                Bagian Kosakata / Goi ({schedule.vocab.length} Kata)
              </h2>
            </div>

            {/* View Mode Switcher: Lengkap (Opsi 1) vs Ringkas */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold shadow-sm">
              <button
                type="button"
                onClick={() => handleVocabViewModeChange("full")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  vocabViewMode === "full"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Tampilan lengkap dengan contoh kalimat praktis"
              >
                <BookOpen size={13} />
                <span>Mode Lengkap</span>
              </button>
              <button
                type="button"
                onClick={() => handleVocabViewModeChange("compact")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  vocabViewMode === "compact"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Tampilan ringkas tanpa kalimat contoh (Kamus Cepat)"
              >
                <List size={13} />
                <span>Mode Ringkas</span>
              </button>
            </div>
          </div>

          <div
            className={`grid gap-3 sm:gap-4 transition-all ${
              vocabViewMode === "compact"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 md:grid-cols-2"
            }`}
          >
            {schedule.vocab.map((vItem) => {
              const isStarred = bookmarkedSet.has(vItem.id);

              return (
                <div
                  key={vItem.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-4.5 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Term, Reading, Tag, Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl sm:text-2xl font-bold font-japanese text-slate-100 tracking-wide">
                            {vItem.word}
                          </h3>
                          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                            {vItem.reading}
                          </span>
                          {vItem.pos && (
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 rounded">
                              {vItem.pos}
                            </span>
                          )}
                        </div>

                        {/* Indonesian Meaning */}
                        <p className="text-sm sm:text-base font-bold text-amber-300 leading-snug">
                          {vItem.meaning}
                        </p>
                      </div>

                      {/* Action Buttons: Audio & Star */}
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <AudioButton text={vItem.word} size="sm" />
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(vItem.id)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isStarred
                              ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                              : "border-slate-800 bg-slate-850 text-slate-400 hover:text-amber-400"
                          }`}
                          title={isStarred ? "Hapus dari Starred" : "Simpan ke Starred"}
                        >
                          <Star size={16} fill={isStarred ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </div>

                    {/* Example Sentence (Shown in "full" mode) */}
                    {vocabViewMode === "full" && vItem.example && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/70">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex-1 min-w-0">
                            <FuriganaSentence
                              text={vItem.exampleJaWithFurigana || vItem.example.ruby || vItem.example.ja}
                              className="text-xs sm:text-[13px] font-medium leading-relaxed"
                            />
                            <p className="text-xs text-slate-400 mt-1 leading-normal line-clamp-2">
                              {vItem.example.id}
                            </p>
                          </div>
                          <div className="shrink-0 pt-0.5">
                            <AudioButton text={vItem.example.ja} size="sm" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: GRAMMAR */}
      {(activeTab === "all" || activeTab === "grammar") && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <GraduationCap size={18} />
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                Bagian Tata Bahasa / Bunpou ({schedule.grammar.length} Pola)
              </h2>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Rumus setsuzoku dan contoh kalimat praktis
            </span>
          </div>

          <div className="space-y-5">
            {schedule.grammar.map((gItem) => {
              const isStarred = bookmarkedSet.has(gItem.id);

              return (
                <div
                  key={gItem.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-7 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl sm:text-3xl font-black font-japanese text-emerald-400">
                          {gItem.pattern}
                        </h3>
                        <span className="rounded-md bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                          N3 Bunpou
                        </span>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-slate-100 mt-1.5">
                        {gItem.meaning}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <AudioButton text={gItem.pattern} size="md" />
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(gItem.id)}
                        className={`p-2 rounded-xl border transition-all ${
                          isStarred
                            ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                            : "border-slate-800 bg-slate-850 text-slate-400 hover:text-amber-400"
                        }`}
                        title={isStarred ? "Hapus dari Starred" : "Simpan ke Starred"}
                      >
                        <Star size={18} fill={isStarred ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>

                  {/* Connection Rule (Setsuzoku) */}
                  <div className="mt-4 flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">
                      Rumus Sambungan (接続):
                    </span>
                    <span className="font-mono text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      {gItem.connection}
                    </span>
                  </div>

                  {/* Example Sentences */}
                  <div className="mt-5 space-y-3">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block">
                      Contoh Kalimat Praktis:
                    </span>
                    {gItem.examples.map((ex, exIdx) => (
                      <div
                        key={exIdx}
                        className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-japanese text-base font-bold text-slate-100 leading-relaxed">
                              {ex.japanese}
                            </p>
                            {ex.reading && (
                              <p className="font-japanese text-xs text-slate-400 mt-0.5">
                                {ex.reading}
                              </p>
                            )}
                            <p className="text-xs sm:text-sm text-emerald-400/90 font-medium mt-1.5 leading-relaxed">
                              {ex.indonesian}
                            </p>
                          </div>
                          <AudioButton text={ex.japanese} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 4: MICRO QUIZ & DAY COMPLETION */}
      <section className="pt-4">
        <QuizWidget
          dayId={dayIdNum}
          questions={schedule.quiz}
          onCompletionChange={(status) => setIsCompleted(status)}
        />
      </section>

      {/* Bottom Navigation */}
      <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
        {prevDay ? (
          <Link
            href={`/day/${prevDay}`}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-emerald-400"
          >
            <ChevronLeft size={18} />
            <span>Hari Sebelumnya (Hari {prevDay})</span>
          </Link>
        ) : (
          <div></div>
        )}

        {nextDay ? (
          <Link
            href={`/day/${nextDay}`}
            className="flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300"
          >
            <span>Hari Berikutnya (Hari {nextDay})</span>
            <ChevronRight size={18} />
          </Link>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300"
          >
            <span>Kembali ke Beranda Maraton</span>
            <Compass size={18} />
          </Link>
        )}
      </div>

      {/* Interactive Modals */}
      <FlashcardModal
        isOpen={isFlashcardOpen}
        onClose={() => setIsFlashcardOpen(false)}
        items={flashcards}
        title={`Flashcard Hari ${dayIdNum} (${flashcards.length} Kartu)`}
      />

      <WallDisplayModal
        isOpen={isWallModeOpen}
        onClose={() => setIsWallModeOpen(false)}
        cards={flashcards}
        dayTitle={`JLPT N3 Maraton • Hari ${dayIdNum}`}
      />
    </div>
  );
}
