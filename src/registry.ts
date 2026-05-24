// registry.ts — apply the self-declared-non-factual core memory (TS port of registry.py).
// Named outlets with blanket_floor get self_declared_nonfactual=true; MIXED outlets
// (Private Eye, Cracked) are listed but NOT floored (per-claim). matchesSelfDeclaration
// catches the long tail (parody YouTube/X accounts) via about/bio phrases.

import { defaultSource } from "./types.ts";
import type { Sources } from "./trustGraph.ts";

export interface RegistryEntry {
  source_id: string;
  name: string;
  genre: string;
  blanket_floor: boolean;
  mixed: boolean;
  self_declaration: string;
}

export function applyToSources(
  sources: Sources, registry: Record<string, RegistryEntry>,
): { floored: number; mixed: number } {
  let floored = 0;
  let mixed = 0;
  for (const r of Object.values(registry)) {
    let s = sources[r.source_id];
    if (!s) { s = defaultSource(r.source_id); sources[r.source_id] = s; }
    s.genre = r.genre || "satire";
    s.self_declaration = r.self_declaration || "";
    if (r.blanket_floor) { s.self_declared_nonfactual = true; floored++; }
    else { s.self_declared_nonfactual = false; mixed++; }
  }
  return { floored, mixed };
}

export function matchesSelfDeclaration(
  text: string, patterns: string[],
): { hit: boolean; phrase: string | null } {
  const low = (text || "").toLowerCase();
  for (const p of patterns) {
    if (low.includes(p)) return { hit: true, phrase: p };
  }
  return { hit: false, phrase: null };
}
