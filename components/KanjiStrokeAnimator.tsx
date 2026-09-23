"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Hash } from "lucide-react";

export interface KanjiStrokeData {
  strokes: string[]; // array of svg path "d" strings
  numbers: { num: number; transform: string }[];
}

// Global in-memory cache for loaded kanji stroke data
const STROKE_DATA_CACHE = new Map<string, KanjiStrokeData>();

export function getKanjiHex(ch: string): string {
  if (!ch) return "";
  const code = ch.charCodeAt(0);
  return "0" + code.toString(16).toLowerCase();
}

interface KanjiStrokeAnimatorProps {
  kanji: string;
  size?: number; // width/height in px, default 180 (used if boxClassName not provided)
  boxClassName?: string;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  showNumberToggle?: boolean;
  isParent?: boolean;
}

export function KanjiStrokeAnimator({
  kanji,
  size = 180,
  boxClassName,
  className = "",
  autoPlay = false,
  showControls = true,
  showNumberToggle = true,
  isParent = false,
}: KanjiStrokeAnimatorProps) {
  const [data, setData] = useState<KanjiStrokeData | null>(() => {
    return STROKE_DATA_CACHE.get(kanji) || null;
  });
  const [loading, setLoading] = useState<boolean>(!data);
  const [error, setError] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [showNumbers, setShowNumbers] = useState<boolean>(true);

  const hex = getKanjiHex(kanji);

  // Fetch and parse KanjiVG SVG
  useEffect(() => {
    if (!kanji) return;

    if (STROKE_DATA_CACHE.has(kanji)) {
      const cached = STROKE_DATA_CACHE.get(kanji)!;
      setData(cached);
      setCurrentStroke(cached.strokes.length);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(false);

    async function loadSvg() {
      try {
        // Try local public folder first
        let res = await fetch(`/kanji/${hex}.svg`);
        if (!res.ok) {
          // Fallback to CDN if missing
          res = await fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`);
        }
        if (!res.ok) throw new Error("SVG not found");

        const svgText = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");

        const pathElements = Array.from(doc.querySelectorAll("g[id^='kvg:StrokePaths'] path"));
        const textElements = Array.from(doc.querySelectorAll("g[id^='kvg:StrokeNumbers'] text"));

        const strokes = pathElements
          .map((p) => p.getAttribute("d") || "")
          .filter((d) => d.length > 0);

        const numbers = textElements.map((t) => ({
          num: parseInt(t.textContent || "0", 10),
          transform: t.getAttribute("transform") || "",
        }));

        const strokeData: KanjiStrokeData = { strokes, numbers };
        STROKE_DATA_CACHE.set(kanji, strokeData);

        if (isMounted) {
          setData(strokeData);
          setCurrentStroke(strokeData.strokes.length);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    loadSvg();
    return () => {
      isMounted = false;
    };
  }, [kanji, hex]);

  const totalStrokes = data?.strokes.length || 0;

  // Animation player loop
  useEffect(() => {
    if (!isPlaying || totalStrokes === 0) return;

    const timer = setInterval(() => {
      setCurrentStroke((prev) => {
        if (prev >= totalStrokes) {
          // Reached end: stop animation
          setIsPlaying(false);
          return totalStrokes;
        }
        return prev + 1;
      });
    }, 600); // 600ms per stroke for clear observation

    return () => clearInterval(timer);
  }, [isPlaying, totalStrokes]);

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentStroke >= totalStrokes) {
        setCurrentStroke(1);
      }
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStroke(0);
  };

  const handleShowAll = () => {
    setIsPlaying(false);
    setCurrentStroke(totalStrokes);
  };

  const handlePrevStroke = () => {
    setIsPlaying(false);
    setCurrentStroke((prev) => Math.max(0, prev - 1));
  };

  const handleNextStroke = () => {
    setIsPlaying(false);
    setCurrentStroke((prev) => Math.min(totalStrokes, prev + 1));
  };

  // If loading
  if (loading) {
    return (
      <div
        style={boxClassName ? undefined : { width: size, height: size }}
        className={`relative flex items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950/80 ${boxClassName || ""} ${className}`}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </div>
    );
  }

  // If fallback / error loading SVG
  if (error || !data) {
    return (
      <div
        style={boxClassName ? undefined : { width: size, height: size }}
        className={`relative flex items-center justify-center rounded-2xl border-2 border-slate-700/80 bg-slate-950/80 select-none ${boxClassName || ""} ${className}`}
      >
        {/* Crosshairs */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-300 dark:border-slate-700/60 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-slate-300 dark:border-slate-700/60 pointer-events-none" />
        <span className="font-japanese font-black text-6xl text-slate-100">{kanji}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Canvas Box (Genkouyoushi 4 Kuadran) */}
      <div
        style={boxClassName ? undefined : { width: size, height: size }}
        className={`relative flex items-center justify-center rounded-2xl border-2 transition-all duration-300 shadow-md ${boxClassName || ""} ${
          isParent
            ? "border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/20"
            : "border-slate-300 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-950/80"
        }`}
      >
        {/* 4-Quadrant Crosshair Lines (田) */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-300 dark:border-slate-700/60 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-slate-300 dark:border-slate-700/60 pointer-events-none" />

        {/* Corner Accents */}
        <div className="absolute top-1 left-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-600 pointer-events-none">
          ↖
        </div>
        <div className="absolute top-1 right-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-600 pointer-events-none">
          ↗
        </div>
        <div className="absolute bottom-1 left-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-600 pointer-events-none">
          ↙
        </div>
        <div className="absolute bottom-1 right-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-600 pointer-events-none">
          ↘
        </div>

        {/* SVG Drawing Layer */}
        <svg
          viewBox="0 0 109 109"
          className="w-full h-full p-2.5 overflow-visible"
        >
          {/* Layer 1: Background Ghost / Outline of All Strokes */}
          <g
            style={{
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 3.2,
              strokeLinecap: "round",
              strokeLinejoin: "round",
              opacity: 0.12,
            }}
            className="text-slate-900 dark:text-slate-100"
          >
            {data.strokes.map((d, idx) => (
              <path key={`ghost-${idx}`} d={d} />
            ))}
          </g>

          {/* Layer 2: Completed Drawn Strokes */}
          <g
            style={{
              fill: "none",
              strokeWidth: 3.5,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            }}
          >
            {data.strokes.slice(0, currentStroke).map((d, idx) => {
              const isCurrent = idx === currentStroke - 1;
              return (
                <path
                  key={`stroke-${idx}`}
                  d={d}
                  className={`transition-all duration-200 ${
                    isCurrent
                      ? "stroke-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]"
                      : isParent
                      ? "stroke-emerald-600 dark:stroke-emerald-400"
                      : "stroke-slate-900 dark:stroke-slate-100"
                  }`}
                  style={{
                    strokeWidth: isCurrent ? 4.2 : 3.6,
                  }}
                />
              );
            })}
          </g>

          {/* Layer 3: Stroke Order Numbers (Toggleable) */}
          {showNumbers && (
            <g className="select-none pointer-events-none">
              {data.numbers.slice(0, Math.max(1, currentStroke)).map((n, idx) => {
                const isCurrent = idx === currentStroke - 1;
                return (
                  <text
                    key={`num-${idx}`}
                    transform={n.transform}
                    fontSize={isCurrent ? 9.5 : 8}
                    fontWeight={isCurrent ? "bold" : "normal"}
                    className={`transition-all duration-200 ${
                      isCurrent
                        ? "fill-emerald-500 font-bold"
                        : "fill-slate-500 dark:fill-slate-400"
                    }`}
                  >
                    {n.num}
                  </text>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Interactive Controls Bar */}
      {showControls && (
        <div className="mt-2.5 flex flex-col items-center gap-1.5 w-full">
          {/* Stroke Progress & Actions */}
          <div className="flex items-center justify-between gap-1 w-full max-w-[200px]">
            {/* Prev Stroke */}
            <button
              type="button"
              onClick={handlePrevStroke}
              disabled={currentStroke <= 0}
              className="p-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Goresan Sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={handlePlayToggle}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold shadow-sm transition-all ${
                isPlaying
                  ? "border-amber-500/40 bg-amber-500/20 text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
              title={isPlaying ? "Jeda Animasi" : "Putar Animasi Goresan"}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span className="text-[11px]">{isPlaying ? "Jeda" : "Putar"}</span>
            </button>

            {/* Next Stroke */}
            <button
              type="button"
              onClick={handleNextStroke}
              disabled={currentStroke >= totalStrokes}
              className="p-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Goresan Berikutnya"
            >
              <ChevronRight size={14} />
            </button>

            {/* Reset / Replay */}
            <button
              type="button"
              onClick={currentStroke >= totalStrokes ? handleReset : handleShowAll}
              className="p-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-750 transition-all"
              title={currentStroke >= totalStrokes ? "Reset ke Goresan 0" : "Tampilkan Semua Goresan"}
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Stroke Counter & Number Toggle */}
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400 w-full max-w-[200px] px-0.5">
            <span>
              Goresan: <strong className="text-emerald-400 font-bold">{currentStroke}</strong> / {totalStrokes}
            </span>

            {showNumberToggle && (
              <button
                type="button"
                onClick={() => setShowNumbers((n) => !n)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] transition-all ${
                  showNumbers
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                    : "border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300"
                }`}
                title="Tampilkan / Sembunyikan Nomor Urutan Goresan"
              >
                <Hash size={10} />
                <span>No.</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
