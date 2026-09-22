export interface BushuDetail {
  /** Radical symbol (e.g. 氵, 亻, 扌, 木, 宀) */
  radical: string;
  /** Japanese name in kana (e.g. さんずい, にんべん, てへん) */
  nameJa: string;
  /** Japanese name in romaji (e.g. sanzui, ninben, tehen) */
  nameRomaji?: string;
  /** Meaning translated into natural Indonesian (e.g. Air / Cairan, Orang / Manusia) */
  meaningId: string;
  /** Radical stroke count */
  strokes?: number;
  /** Position name in Japanese if applicable (e.g. へん, つくり, かんむり) */
  positionJa?: string;
  /** Position name in Indonesian if applicable (e.g. Kiri (Hen), Atas (Kanmuri)) */
  positionId?: string;
}

export interface KanjiCompound {
  word: string;
  reading: string;
  meaning: string;
}

export interface KanjiItem {
  id: string;
  kanji: string;
  on: string;
  kun: string;
  meaning: string;
  strokes?: number;
  words: KanjiCompound[];
  bushu?: BushuDetail;
}

export interface VocabExample {
  ja: string;
  cleanJa?: string;
  ruby?: string;
  reading?: string;
  id: string;
}

export interface VocabItem {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  theme: string;
  pos?: string;
  example?: VocabExample;
  exampleJaWithFurigana?: string;
}

export interface GrammarExample {
  japanese: string;
  reading: string;
  indonesian: string;
}

export interface GrammarItem {
  id: string;
  pattern: string;
  meaning: string;
  connection: string;
  examples: GrammarExample[];
}

export interface QuizQuestion {
  id: string;
  type: "kanji" | "vocab" | "grammar";
  question: string;
  promptSub?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DaySchedule {
  dayId: number;
  title: string;
  focus: string;
  kanji: KanjiItem[];
  vocab: VocabItem[];
  grammar: GrammarItem[];
  quiz: QuizQuestion[];
}

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  date: string;
}

export interface StudyStreak {
  current: number;
  longest: number;
  lastStudyDate: string | null;
}

export interface UserProgress {
  completedDays: number[];
  bookmarks: string[];
  quizResults: Record<number, QuizResult>;
  streak: StudyStreak;
}

export type BookmarkType = "all" | "kanji" | "vocab" | "grammar";
