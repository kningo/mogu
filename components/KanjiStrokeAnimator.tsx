"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Hash } from "lucide-react";

export interface KanjiStrokeData {
  strokes: string[]; // array of svg path "d" strings
  numbers: { num: number; transform: string }[];
  lengths: number[]; // exact getTotalLength() values for each stroke path
}

// Global in-memory cache for loaded kanji stroke data
const STROKE_DATA_CACHE = new Map<string, KanjiStrokeData>();

export function getKanjiHex(ch: string): string {
  if (!ch) return "";
  const code = ch.charCodeAt(0);
  return "0" + code.toString(16).toLowerCase();
}

// 10-Color Palette reference from Mazii CSS
export const MAZII_STROKE_COLORS = [
  "#3e67d6", // 1. Blue (--bs-blue)
  "#dc3545", // 2. Red (--bs-red)
  "#212529", // 3. Black / Dark Charcoal (--bs-black / --bs-dark)
  "#198754", // 4. Green (--bs-green)
  "#fd7e14", // 5. Orange / Amber (--bs-orange / --bs-warning)
  "#6f42c1", // 6. Purple (--bs-purple)
  "#20c997", // 7. Teal (--bs-teal)
  "#d63384", // 8. Pink (--bs-pink)
  "#6610f2", // 9. Indigo (--bs-indigo)
  "#0dcaf0", // 10. Cyan (--bs-cyan)
];

// Mazii animation timing constants
const STROKE_DURATION = 400; // ms (transition-duration: 400ms as in Mazii)
const STEP_INTERVAL = 480; // ms (400ms transition + 80ms natural pause before next stroke)

/**
 * Computes exact path lengths using an offscreen SVG element in browser DOM.
 * Exactly matches Mazii / dmak.js path.getTotalLength() technique.
 */
export function computePathLengths(strokes: string[]): number[] {
  if (typeof document === "undefined") {
    return strokes.map(() => 100);
  }

  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 109 109");
    svg.style.position = "absolute";
    svg.style.width = "0";
    svg.style.height = "0";
    svg.style.top = "-9999px";
    svg.style.left = "-9999px";
    svg.style.opacity = "0";
    svg.style.pointerEvents = "none";
    document.body.appendChild(svg);

    const lengths = strokes.map((d) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
      const len = path.getTotalLength();
      svg.removeChild(path);
      return len > 0 ? Number(len.toFixed(2)) : 100;
    });

    document.body.removeChild(svg);
    return lengths;
  } catch (err) {
    console.error("Error computing stroke path lengths:", err);
    return strokes.map(() => 100);
  }
}

interface KanjiStrokeAnimatorProps {
  kanji: string;
  size?: number; // width/height in px, default 180 (used if boxClassName not provided)
  boxClassName?: string;
  className?: string;
  autoPlay?: boolean; // default: true (autoplay seperti di mazii)
  showControls?: boolean; // default: false (kontrol interaktif dimatikan secara default)
  showNumberToggle?: boolean;
  showReplayButton?: boolean;
  isParent?: boolean;
}

export function KanjiStrokeAnimator({
  kanji,
  size = 180,
  boxClassName,
  className = "",
  autoPlay = true,
  showControls = false,
  showNumberToggle = true,
  showReplayButton = true,
  isParent = false,
}: KanjiStrokeAnimatorProps) {
  const [data, setData] = useState<KanjiStrokeData | null>(() => {
    return STROKE_DATA_CACHE.get(kanji) || null;
  });
  const [loading, setLoading] = useState<boolean>(!data);
  const [error, setError] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState<boolean>(false);
  const [showNumbers, setShowNumbers] = useState<boolean>(true);

  const hex = getKanjiHex(kanji);

  // Smooth start/restart sequence for Mazii-style transition
  const startAutoplay = useCallback((total: number) => {
    if (total <= 0) return;
    // Step 1: Hide all strokes instantly with transition: none
    setIsTransitionEnabled(false);
    setCurrentStroke(0);
    setIsPlaying(false);

    // Step 2: In next animation frames, enable transition and start stroke 1 smoothly
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsTransitionEnabled(true);
        setCurrentStroke(1);
        setIsPlaying(true);
      });
    });
  }, []);

  // Fetch and parse KanjiVG SVG
  useEffect(() => {
    if (!kanji) return;

    if (STROKE_DATA_CACHE.has(kanji)) {
      const cached = STROKE_DATA_CACHE.get(kanji)!;
      if (!cached.lengths || cached.lengths.length !== cached.strokes.length) {
        cached.lengths = computePathLengths(cached.strokes);
      }
      setData(cached);
      setLoading(false);
      if (autoPlay) {
        startAutoplay(cached.strokes.length);
      } else {
        setIsTransitionEnabled(false);
        setCurrentStroke(cached.strokes.length);
        setIsPlaying(false);
      }
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(false);

    async function loadSvg() {
      try {
        let res = await fetch(`/kanji/${hex}.svg`);
        if (!res.ok) {
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

        const lengths = computePathLengths(strokes);
        const strokeData: KanjiStrokeData = { strokes, numbers, lengths };
        STROKE_DATA_CACHE.set(kanji, strokeData);

        if (isMounted) {
          setData(strokeData);
          setLoading(false);
          if (autoPlay) {
            startAutoplay(strokes.length);
          } else {
            setIsTransitionEnabled(false);
            setCurrentStroke(strokes.length);
            setIsPlaying(false);
          }
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
  }, [kanji, hex, autoPlay, startAutoplay]);

  const totalStrokes = data?.strokes.length || 0;

  // Mazii-style sequential stroke animator loop
  useEffect(() => {
    if (!isPlaying || totalStrokes === 0) return;

    const timer = setInterval(() => {
      setCurrentStroke((prev) => {
        if (prev >= totalStrokes) {
          // Reached end: stop animation loop, maintain all completed strokes
          setIsPlaying(false);
          return totalStrokes;
        }
        return prev + 1;
      });
    }, STEP_INTERVAL);

    return () => clearInterval(timer);
  }, [isPlaying, totalStrokes]);

  const handleReplay = useCallback(() => {
    startAutoplay(totalStrokes);
  }, [startAutoplay, totalStrokes]);

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsTransitionEnabled(true);
      if (currentStroke >= totalStrokes) {
        startAutoplay(totalStrokes);
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setIsTransitionEnabled(false);
    setCurrentStroke(0);
  };

  const handleShowAll = () => {
    setIsPlaying(false);
    setIsTransitionEnabled(false);
    setCurrentStroke(totalStrokes);
  };

  const handlePrevStroke = () => {
    setIsPlaying(false);
    setIsTransitionEnabled(true);
    setCurrentStroke((prev) => Math.max(0, prev - 1));
  };

  const handleNextStroke = () => {
    setIsPlaying(false);
    setIsTransitionEnabled(true);
    setCurrentStroke((prev) => Math.min(totalStrokes, prev + 1));
  };

  // If loading
  if (loading) {
    return (
      <div
        style={boxClassName ? undefined : { width: size, height: size }}
        className={`relative flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white ${boxClassName || ""} ${className}`}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // If fallback / error loading SVG
  if (error || !data) {
    return (
      <div
        style={boxClassName ? undefined : { width: size, height: size }}
        className={`relative flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white select-none ${boxClassName || ""} ${className}`}
      >
        {/* Crosshairs */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-sky-300/60 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-sky-300/60 pointer-events-none" />
        <span className="font-japanese font-black text-6xl text-slate-900">{kanji}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Canvas Box (Genkouyoushi 4 Kuadran - Mazii Style) */}
      <div
        style={boxClassName ? undefined : { width: size, height: size }}
        onClick={() => {
          if (!showControls && !isPlaying) {
            handleReplay();
          }
        }}
        className={`relative flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white transition-all duration-300 shadow-sm ${
          !showControls ? "cursor-pointer hover:shadow-md" : ""
        } ${boxClassName || ""}`}
      >
        {/* Top-Right Replay Button (Mazii Style circular reload) */}
        {showReplayButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleReplay();
            }}
            className="absolute top-2 right-2 z-20 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-500 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-50 shadow-sm transition-all active:scale-95"
            title="Putar Ulang Animasi Goresan (Replay)"
          >
            <RotateCcw
              size={14}
              className={`transition-transform duration-300 ${isPlaying ? "animate-spin text-emerald-500" : ""}`}
            />
          </button>
        )}

        {/* 4-Quadrant Crosshair Lines (田) - Soft dashed lines like Mazii */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-sky-300/60 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-sky-300/60 pointer-events-none" />

        {/* Corner Accents */}
        <div className="absolute top-1 left-1.5 text-[9px] font-mono text-slate-300 pointer-events-none">
          ↖
        </div>
        <div className="absolute top-1 right-1.5 text-[9px] font-mono text-slate-300 pointer-events-none">
          ↗
        </div>
        <div className="absolute bottom-1 left-1.5 text-[9px] font-mono text-slate-300 pointer-events-none">
          ↙
        </div>
        <div className="absolute bottom-1 right-1.5 text-[9px] font-mono text-slate-300 pointer-events-none">
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
              stroke: "#0f172a",
              strokeWidth: 3.2,
              strokeLinecap: "round",
              strokeLinejoin: "round",
              opacity: 0.1,
            }}
          >
            {data.strokes.map((d, idx) => (
              <path key={`ghost-${idx}`} d={d} />
            ))}
          </g>

          {/* Layer 2: Completed & Drawing Strokes (Mazii Stroke-Dashoffset Engine) */}
          <g
            style={{
              fill: "none",
              strokeLinecap: "round",
              strokeLinejoin: "round",
            }}
          >
            {data.strokes.map((d, idx) => {
              const isDrawn = idx < currentStroke;
              const isCurrent = idx === currentStroke - 1;
              const len = data.lengths[idx] || 100;
              const strokeColor = `var(--kvg-stroke-${(idx % 10) + 1}, ${MAZII_STROKE_COLORS[idx % 10]})`;

              return (
                <path
                  key={`stroke-${idx}`}
                  d={d}
                  style={{
                    stroke: strokeColor,
                    strokeWidth: isCurrent ? 4.5 : 3.9,
                    strokeDasharray: `${len} ${len}`,
                    strokeDashoffset: isDrawn ? 0 : len,
                    transition: isTransitionEnabled
                      ? `stroke-dashoffset ${STROKE_DURATION}ms ease, stroke-width 200ms ease, opacity 150ms ease`
                      : "none",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    opacity: isDrawn ? 1 : 0,
                  }}
                />
              );
            })}
          </g>

          {/* Layer 3: Stroke Order Numbers (Color-matched to strokes) */}
          {showNumbers && (
            <g className="select-none pointer-events-none">
              {data.numbers.map((n, idx) => {
                const isVisible = idx < currentStroke;
                const isCurrent = idx === currentStroke - 1;
                const strokeColor = `var(--kvg-stroke-${(idx % 10) + 1}, ${MAZII_STROKE_COLORS[idx % 10]})`;

                return (
                  <text
                    key={`num-${idx}`}
                    transform={n.transform}
                    fontSize={isCurrent ? 9.5 : 8.5}
                    fontWeight="bold"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    style={{
                      fill: strokeColor,
                      opacity: isVisible ? 1 : 0,
                      transition: isTransitionEnabled ? "opacity 300ms ease" : "none",
                    }}
                    className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
                  >
                    {n.num}
                  </text>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Interactive Controls Bar (Only rendered when showControls is true) */}
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
