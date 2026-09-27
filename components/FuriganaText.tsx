import React from "react";

interface FuriganaTextProps {
  kanji?: string;
  reading?: string;
  text?: string; // Supports bracketed format: "政治[せいじ]を行う" or standard text
  className?: string;
  rubyClassName?: string;
  hideRuby?: boolean;
}

export function FuriganaText({
  kanji,
  reading,
  text,
  className = "",
  rubyClassName = "text-[0.6em] text-emerald-400/90 select-none",
  hideRuby = false,
}: FuriganaTextProps) {
  // If direct kanji & reading are provided
  if (kanji && reading) {
    return (
      <ruby
        tabIndex={0}
        role="button"
        aria-label={`${kanji} (${reading})`}
        onClick={(e) => e.currentTarget.classList.toggle("ruby-peek")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.currentTarget.classList.toggle("ruby-peek");
          }
        }}
        className={`font-japanese tracking-wide outline-none select-text cursor-pointer ${className}`}
      >
        {kanji}
        {!hideRuby && (
          <>
            <rp className="text-transparent text-[0px]">(</rp>
            <rt className={rubyClassName}>{reading}</rt>
            <rp className="text-transparent text-[0px]">)</rp>
          </>
        )}
      </ruby>
    );
  }

  // If parsed text with brackets like "政治[せいじ]"
  if (text) {
    // Regex matches "kanji[reading]" or "kanji(reading)"
    const parts = text.split(/([一-龯々〆ヵヶ]+\[[^\]]+\])/g);

    return (
      <span className={`font-japanese ${className}`}>
        {parts.map((part, idx) => {
          const match = part.match(/^([一-龯々〆ヵヶ]+)\[([^\]]+)\]$/);
          if (match) {
            const [, kText, rText] = match;
            return (
              <ruby
                key={idx}
                tabIndex={0}
                role="button"
                aria-label={`${kText} (${rText})`}
                onClick={(e) => e.currentTarget.classList.toggle("ruby-peek")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.classList.toggle("ruby-peek");
                  }
                }}
                className="tracking-wide outline-none select-text cursor-pointer"
              >
                {kText}
                {!hideRuby && (
                  <>
                    <rp className="text-transparent text-[0px]">(</rp>
                    <rt className={rubyClassName}>{rText}</rt>
                    <rp className="text-transparent text-[0px]">)</rp>
                  </>
                )}
              </ruby>
            );
          }
          return <React.Fragment key={idx}>{part}</React.Fragment>;
        })}
      </span>
    );
  }

  return null;
}
