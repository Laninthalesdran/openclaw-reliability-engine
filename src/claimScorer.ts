// claimScorer.ts — score one claim against its evidence (TS port of claim_scorer.py).
// 8 reliability primitives -> epistemic weight (0-10) + explainable breakdown.
// Falsifiability/provenance veto + genre floor + leading-language discount.

import type { ClaimInput, SourceRecord } from "./types.ts";
import type { Sources } from "./trustGraph.ts";
import { effectivePrior } from "./trustGraph.ts";
import * as rhetoric from "./rhetoric.ts";
import * as stateMedia from "./stateMedia.ts";

const PROVENANCE: Record<string, number> = { primary: 1.0, secondary: 0.6, tertiary: 0.3 };

const HARD_NONFACTUAL = new Set(
  ["satire", "parody", "comedy", "fiction", "marketing", "advertisement"]);
const NONFACTUAL_FLOOR = 0.05;
const OPINION_FLOOR = 0.35;

// dimension weights (v0; v1 learns these from outcomes). Sum = 1.0
export const W: Record<string, number> = {
  provenance: 0.16, verifiability: 0.16, corroboration: 0.18, falsifiability: 0.12,
  transparency: 0.10, incentive: 0.10, recency: 0.06, source_prior: 0.12,
};

function corroboration(n: number): number {
  return 1 - Math.exp(-0.6 * Math.max(0, n));
}

// A source's "independence key" = its controlling state (if state media), else its owner,
// else itself. Used to dedupe corroborators so state-controlled clones don't fake independence.
function controllerKey(sourceId: string, sources: Sources): string {
  return stateMedia.controllerOf(sourceId) || sources[sourceId]?.owner || sourceId;
}

// Effective independent corroborator count: if corroborator IDs are supplied, count DISTINCT
// controlling entities that differ from the source's own. Else fall back to the raw count.
function effectiveCorroborators(claim: ClaimInput, sources: Sources): number {
  if (claim.corroborating_sources && claim.corroborating_sources.length) {
    const selfKey = claim.source_id ? controllerKey(claim.source_id, sources) : "__self__";
    const groups = new Set<string>();
    for (const cs of claim.corroborating_sources) {
      const k = controllerKey(cs, sources);
      if (k !== selfKey) groups.add(k);
    }
    return groups.size;
  }
  return claim.n_independent_corroborators ?? 0;
}

export interface ScoreResult {
  epistemic_weight: number;
  breakdown: {
    dims: Record<string, number>;
    weights: Record<string, number>;
    raw_evidence: number;
    manipulation: rhetoric.RhetoricResult;
    raw: number;
    vetoes: string[];
    flags: string[];
    state_media: stateMedia.StateMediaEntry | null;
  };
}

export function scoreClaim(claim: ClaimInput, sources: Sources): ScoreResult {
  const s: SourceRecord | undefined = claim.source_id ? sources[claim.source_id] : undefined;

  let transparency = 0.5;
  if (s) {
    transparency = 0.5 + 0.25 * (s.funding ? 1 : 0) + 0.25 * (s.owner ? 1 : 0);
    transparency = Math.max(0, transparency - 0.5 * s.prior_variance);
  }

  // state-media control: a state organ has a structural stake → raise the incentive-conflict
  // floor; and corroboration dedupes by controlling entity (KNOWN_LIMITATIONS.md §1).
  const sm = claim.source_id ? stateMedia.info(claim.source_id) : null;
  let incentiveConflict = claim.incentive_conflict ?? 0;
  if (sm) incentiveConflict = Math.max(incentiveConflict, sm.incentive_floor);

  const halflife = claim.domain_halflife_days ?? 3650;
  const dims: Record<string, number> = {
    provenance: PROVENANCE[claim.provenance ?? "secondary"] ?? 0.4,
    verifiability: claim.cites_evidence ? 1.0 : 0.2,
    corroboration: corroboration(effectiveCorroborators(claim, sources)),
    falsifiability: claim.falsifiable ?? 0.5,
    transparency: Math.min(1.0, transparency),
    incentive: 1 - incentiveConflict,
    recency: Math.exp(-(claim.age_days ?? 0) / Math.max(halflife, 1)),
    source_prior: claim.source_id ? effectivePrior(sources, claim.source_id) : 0.3,
  };

  let raw = 0;
  for (const k of Object.keys(W)) raw += W[k] * dims[k];

  const vetoes: string[] = [];
  if (dims.falsifiability < 0.15) { raw = Math.min(raw, 0.20); vetoes.push("unfalsifiable"); }
  if ((dims.provenance + dims.verifiability) / 2 < 0.15) {
    raw = Math.min(raw, 0.25); vetoes.push("no checkable origin");
  }

  // genre floor: a source that ANNOUNCES it isn't factual, or a non-factual claim, is floored
  const genre = claim.genre ?? "factual";
  const srcNonfactual = !!(s && s.self_declared_nonfactual);
  if (HARD_NONFACTUAL.has(genre) || srcNonfactual) {
    raw = Math.min(raw, NONFACTUAL_FLOOR);
    const why = HARD_NONFACTUAL.has(genre) ? genre : "source self-declares non-factual";
    vetoes.push(`non-factual (${why})`);
  } else if (genre === "opinion") {
    raw = Math.min(raw, OPINION_FLOOR);
    vetoes.push("opinion (not a factual assertion)");
  }

  // leading-language discount
  const manip = rhetoric.analyze(claim.text);
  const preManip = raw;
  raw *= rhetoric.discountFactor(manip.score);

  // advisory flags (not vetoes — these caveat, they don't floor)
  const flags: string[] = [];
  if (sm) flags.push(stateMedia.flagText(sm));

  const round3 = (x: number) => Math.round(x * 1000) / 1000;
  const dimsR: Record<string, number> = {};
  for (const k of Object.keys(dims)) dimsR[k] = round3(dims[k]);

  return {
    epistemic_weight: Math.round(raw * 10 * 100) / 100,
    breakdown: {
      dims: dimsR, weights: W, raw_evidence: round3(preManip),
      manipulation: manip, raw: round3(raw), vetoes, flags, state_media: sm,
    },
  };
}

export function explain(text: string, r: ScoreResult): string {
  const b = r.breakdown;
  const lines = [
    `CLAIM: ${text}`,
    `  EPISTEMIC WEIGHT: ${r.epistemic_weight}/10`,
  ];
  if (b.vetoes.length) lines.push(`  !! VETO: ${b.vetoes.join(", ")} (reputation cannot rescue this)`);
  if (b.flags.length) lines.push(`  ~ flag: ${b.flags.join("; ")}`);
  const m = b.manipulation;
  if (m.score > 0.05) {
    const techs = m.top.map((t) => `${t.id}(${t.hits})`).join(", ");
    lines.push(`  ~ leading language: score ${m.score} -> evidence ${(b.raw_evidence * 10).toFixed(1)} `
      + `discounted to ${(b.raw * 10).toFixed(1)}/10  [${techs}]`);
  }
  const drivers = Object.keys(W).sort((a, c) => W[c] * b.dims[c] - W[a] * b.dims[a]);
  lines.push("  drivers (weight*dim): " + drivers.map((k) => `${k}=${b.dims[k].toFixed(2)}`).join(", "));
  return lines.join("\n");
}
