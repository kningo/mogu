import React from "react";
import { Bug } from "lucide-react";
import packageJson from "../package.json";

export function Footer() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950/80 py-6 sm:py-8 px-4 sm:px-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left Section (Developer Copyright & Subtitle) */}
        <div className="text-center sm:text-left">
          <p className="font-semibold text-slate-300">
            © 2026{" "}
            <a
              href="https://xkningo.my.id"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition-colors underline decoration-slate-700 underline-offset-2 hover:decoration-emerald-400"
            >
              xkningo
            </a>{" "}
            • Mogu
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Dirancang untuk belajar dengan target kebut semalam.
          </p>
        </div>

        {/* Right Section (Utility Actions) */}
        <div className="flex items-center flex-wrap justify-center sm:justify-end gap-3 sm:gap-4 text-slate-400">
          <a
            href="https://xkningo.my.id"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
            title="Laporkan bug atau kirimkan masukan"
          >
            <Bug size={13} />
            <span>Laporkan Bug</span>
          </a>

          <span className="text-slate-700 hidden sm:inline">•</span>

          <a
            href="https://xkningo.my.id"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition-colors"
            title="Hubungi pengembang"
          >
            Kontak
          </a>

          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono border border-slate-700/60 select-none">
            v{packageJson.version}
          </span>
        </div>
      </div>
    </footer>
  );
}
