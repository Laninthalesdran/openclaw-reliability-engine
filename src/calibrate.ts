// calibrate.ts — the calibration loop (TS port of calibrate.py). Validity is EARNED.
// Resolved claims (true/false/partly) -> Bayesian update, ACCUMULATING with the prior
// record so a few new claims can't wipe a long track record.

import { defaultSource } from "./types.ts";
import type { ResolvedClaim } from "./types.ts";
import { gateEdges, NO_RECORD_THRESHOLD } from "./trustGraph.ts";
import type { Sources } from "./trustGraph.ts";

const OUTCOME: Record<string, number> = { true: 1.0, partly: 0.5, false: 0.0 };

export interface CalibrationChange {
  source_id: string;
  before: { score: number; n: number };
  after: { score: number; n: number };
  brier: number;
}

export function calibrate(sources: Sources, resolved: ResolvedClaim[]): CalibrationChange[] {
  const bySrc: Record<string, number[]> = {};
  const bySrcTopic: Record<string, Record<string, number[]>> = {};
  for (const r of resolved) {
    const o = OUTCOME[r.resolution];
    (bySrc[r.source_id] ??= []).push(o);
    const t = r.topic ?? "general";
    ((bySrcTopic[r.source_id] ??= {})[t] ??= []).push(o);
  }

  const changes: CalibrationChange[] = [];
  for (const [sid, outs] of Object.entries(bySrc)) {
    let s = sources[sid];
    if (!s) { s = defaultSource(sid); sources[sid] = s; }
    const before = { score: s.validity.score, n: s.validity.n_resolved };

    // ACCUMULATE: treat prior validity*n as implied prior successes
    const n0 = s.validity.n_resolved || 0;
    const true0 = (s.validity.score || 0) * n0;
    const nNew = outs.length;
    const trueNew = outs.reduce((a, b) => a + b, 0);
    const nTot = n0 + nNew;
    const trueTot = true0 + trueNew;
    const score = (trueTot + 1.0) / (nTot + 2.0); // Beta(1,1) posterior mean
    const brier = outs.reduce((a, o) => a + (1 - o) ** 2, 0) / nNew;

    s.validity = {
      score: Math.round(score * 1e4) / 1e4,
      n_resolved: nTot,
      brier: Math.round(brier * 1e4) / 1e4,
      ceiling_reason: nTot >= NO_RECORD_THRESHOLD ? "" : "no track record",
    };
    s.topics = {};
    for (const [t, vs] of Object.entries(bySrcTopic[sid])) {
      const sum = vs.reduce((a, b) => a + b, 0);
      s.topics[t] = { validity: Math.round(((sum + 1) / (vs.length + 2)) * 1e4) / 1e4, n: vs.length };
    }
    changes.push({ source_id: sid, before, after: { score: s.validity.score, n: nTot }, brier: s.validity.brier! });
  }
  gateEdges(sources);
  return changes;
}
