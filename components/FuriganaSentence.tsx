import React from "react";

interface FuriganaSentenceProps {
  text?: string;
  className?: string;
}

/**
 * FuriganaSentence converts bracketed Japanese text like "明日[あした]は第一[だいいち]志望[しぼう]の企業[きぎょう]の面接[めんせつ]がある。"
 * into native HTML <ruby> and <rt> markup with clean styling positioned strictly on top of the kanji.
 */
export function FuriganaSentence({
  text = "",
  className = "",
}: FuriganaSentenceProps) {
  if (!text) return null;

  // Split safely by Kanji[Reading] captures while preserving baseline text tokens
  const parts = text.split(/([一-龯々〆ヵヶ]+\[[^\]]+\])/g);

  return (
    <p className={`font-japanese leading-[2.2] tracking-wide text-slate-100 ${className}`}>
      {parts.filter(Boolean).map((part, index) => {
        const match = part.match(/^([一-龯々〆ヵヶ]+)\[([^\]]+)\]$/);
        if (match && match[1] && match[2]) {
          return (
            <ruby
              key={index}
              tabIndex={0}
              role="button"
              aria-label={`${match[1]} (${match[2]})`}
              onClick={(e) => e.currentTarget.classList.toggle("ruby-peek")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.classList.toggle("ruby-peek");
                }
              }}
              className="ruby-position-over px-[1px] outline-none select-text cursor-pointer"
            >
              {match[1]}
              <rt className="text-[11px] text-slate-400 select-none font-normal leading-none">
                {match[2]}
              </rt>
            </ruby>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}

export default FuriganaSentence;
