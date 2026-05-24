// types.ts — data model for the reliability engine (TS port of schemas.py).
// Three separate source axes on purpose: validity (accuracy, earned from outcomes),
// bias (direction + magnitude of lean), salience (reach/influence).

export interface Validity {
  score: number;          // 0-1, EARNED from resolved-claim track record
  n_resolved: number;
  brier: number | null;
  ceiling_reason: string;
}

export interface Bias {
  direction: string;      // left|right|center|state|... DIRECTION only
  magnitude: number;      // 0..1, orthogonal to validity
  method: string;
}

export interface Salience {
  reach: number;
  citation_count: number;
  influence_rank: number;
}

export interface Edge {
  target: string;
  type: string;           // endorse | cite | corroborate
  weight_raw: number;
  weight_gated: number;   // filled by trustGraph: raw * endorser.validity^2
}

export interface SourceRecord {
  source_id: string;
  aliases: string[];
  owner: string;
  funding: string;
  validity: Validity;
  bias: Bias;
  salience: Salience;
  is_seed: boolean;
  genre: string;                    // news|satire|parody|...
  self_declared_nonfactual: boolean;
  self_declaration: string;
  external_priors: Record<string, number>;
  prior_variance: number;
  edges: Edge[];
  topics: Record<string, { validity: number; n: number }>;
}

// A claim + its annotated evidence dimensions (v0; auto-extraction is a later phase).
export interface ClaimInput {
  text: string;
  source_id?: string;
  section?: string;
  topic?: string;
  genre?: string;                   // factual | satire | parody | comedy | fiction | marketing | opinion
  provenance?: string;              // primary | secondary | tertiary
  cites_evidence?: boolean;
  n_independent_corroborators?: number;
  corroborating_sources?: string[];   // source IDs — deduped by controlling entity (state-media-aware)
  falsifiable?: number;             // 0..1
  incentive_conflict?: number;      // 0..1
  age_days?: number;
  domain_halflife_days?: number;
}

export interface ResolvedClaim {
  source_id: string;
  topic?: string;
  resolution: string;               // true | false | partly
}

export function defaultValidity(): Validity {
  return { score: 0.5, n_resolved: 0, brier: null, ceiling_reason: "" };
}

export function defaultSource(source_id: string): SourceRecord {
  return {
    source_id, aliases: [], owner: "", funding: "",
    validity: defaultValidity(),
    bias: { direction: "unknown", magnitude: 0, method: "" },
    salience: { reach: 0, citation_count: 0, influence_rank: 0 },
    is_seed: false, genre: "news", self_declared_nonfactual: false,
    self_declaration: "", external_priors: {}, prior_variance: 0,
    edges: [], topics: {},
  };
}
