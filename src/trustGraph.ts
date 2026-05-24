// trustGraph.ts — anti-laundering trust propagation (TS port of trust_graph.py).
// A low-validity source cannot vouch another up: weight_gated = weight_raw * validity^2.

import type { SourceRecord } from "./types.ts";

export const ENDORSE_CAP = 0.15;
export const NO_RECORD_THRESHOLD = 5;

export type Sources = Record<string, SourceRecord>;

export function gateEdges(sources: Sources): Sources {
  for (const s of Object.values(sources)) {
    for (const e of s.edges) {
      e.weight_gated = e.type === "endorse" ? e.weight_raw * s.validity.score ** 2 : 0;
    }
  }
  return sources;
}

function cliqueFactor(sources: Sources, targetId: string): number {
  const endorsers = Object.values(sources).filter(
    (s) => s.edges.some((e) => e.target === targetId && e.type === "endorse"),
  );
  if (endorsers.length === 0) return 1.0;
  const tgt = sources[targetId];
  const tgtTargets = new Set(tgt ? tgt.edges.map((e) => e.target) : []);
  let independent = 0;
  for (const s of endorsers) {
    const mutual = tgtTargets.has(s.source_id);
    const sharedOwner = !!s.owner && !!tgt && s.owner === tgt.owner;
    if (!mutual && !sharedOwner) independent++;
  }
  return (independent + 1) / (endorsers.length + 1);
}

export function endorsementNudge(sources: Sources, targetId: string): number {
  const tgt = sources[targetId];
  if (!tgt) return 0;
  if (tgt.validity.n_resolved >= NO_RECORD_THRESHOLD) return 0; // outcomes dominate
  let gatedSum = 0;
  for (const s of Object.values(sources)) {
    for (const e of s.edges) {
      if (e.target === targetId && e.type === "endorse") gatedSum += e.weight_gated;
    }
  }
  const nudge = gatedSum * cliqueFactor(sources, targetId);
  return Math.min(nudge, ENDORSE_CAP);
}

export function effectivePrior(sources: Sources, sourceId: string): number {
  const s = sources[sourceId];
  if (!s) return 0.3; // unknown source: cautious default
  const nudge = endorsementNudge(sources, sourceId);
  const ceiling = s.validity.n_resolved < NO_RECORD_THRESHOLD ? 0.6 : 1.0;
  return Math.min(s.validity.score + nudge, ceiling);
}
