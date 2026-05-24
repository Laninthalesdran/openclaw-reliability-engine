// rhetoric.ts — leading/biased-language detector (TS port of rhetoric.py).
// Detects persuasion TECHNIQUE (not political position), grounded in real studies
// (citations in data/leading_language.json). Returns a manipulation score used to
// DISCOUNT the evidence-based weight.

interface Category {
  id: string;
  name: string;
  weight: number;
  cap: number;
  double_edged: boolean;
  markers: string[];
}

export interface RhetoricResult {
  score: number;
  load: number;
  per100: number;
  words: number;
  techniques: Record<string, { hits: number; contrib: number }>;
  top: Array<{ id: string; hits: number; contrib: number }>;
}

export const DISCOUNT_MAX = 0.6; // heavy manipulation costs up to 60% of evidence weight

let CATS: Category[] = [];

export function loadLexicon(data: { categories: Category[] }): void {
  CATS = data.categories;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(haystack: string, needle: string): number {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

export function analyze(text: string): RhetoricResult {
  const low = " " + (text || "").toLowerCase().replace(/\s+/g, " ") + " ";
  const words = Math.max((low.match(/[a-z']+/g) || []).length, 1);

  const techniques: Record<string, { hits: number; contrib: number }> = {};
  let load = 0;
  for (const cat of CATS) {
    let hits = 0;
    for (const m of cat.markers) {
      if (m.includes(" ")) {
        hits += countOccurrences(low, " " + m + " ")
              + countOccurrences(low, " " + m + ",")
              + countOccurrences(low, " " + m + ".");
      } else {
        const re = new RegExp("(?<![a-z])" + escapeRe(m) + "(?![a-z])", "g");
        hits += (low.match(re) || []).length;
      }
    }
    if (hits > 0) {
      const contrib = Math.min(cat.cap, hits * cat.weight);
      load += contrib;
      techniques[cat.id] = { hits, contrib: Math.round(contrib * 100) / 100 };
    }
  }

  const per100 = (load * 100) / Math.max(words, 30);
  const score = 1 - Math.exp(-0.08 * per100);
  const top = Object.entries(techniques)
    .sort((a, b) => b[1].contrib - a[1].contrib)
    .slice(0, 4)
    .map(([id, v]) => ({ id, ...v }));

  return {
    score: Math.round(score * 1000) / 1000,
    load: Math.round(load * 100) / 100,
    per100: Math.round(per100 * 10) / 10,
    words, techniques, top,
  };
}

export function discountFactor(score: number): number {
  return 1 - DISCOUNT_MAX * score;
}
