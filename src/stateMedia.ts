// stateMedia.ts — control/ownership graph for state-funded & state-controlled outlets.
// Hardens the engine against its documented Achilles heel (see KNOWN_LIMITATIONS.md §1):
//   1. corroboration dedupes by controlling_entity (state-controlled clones collapse to one);
//   2. state control raises the incentive-conflict floor;
//   3. a control-type-scaled flag is surfaced (RT and the BBC get DIFFERENT framing — a
//      direct state instrument is not the same as a publicly-funded independent broadcaster).
// Everything here is a documented funding/control FACT, applied symmetrically across all
// governments — never a judgment about which government is good.

export interface StateMediaEntry {
  source_id: string;
  name: string;
  controlling_entity: string;   // the dedup key
  country: string;
  control_type: string;         // state-instrument | state-funded | state-funded-firewalled | public-funded-independent
  incentive_floor: number;      // min incentive-conflict applied to claims from this source
}

let REGISTRY: Record<string, StateMediaEntry> = {};

export function load(entries: StateMediaEntry[]): void {
  REGISTRY = {};
  for (const e of entries) REGISTRY[e.source_id] = e;
}

export function info(sourceId: string): StateMediaEntry | null {
  return REGISTRY[sourceId] ?? null;
}

export function controllerOf(sourceId: string): string | null {
  return REGISTRY[sourceId]?.controlling_entity ?? null;
}

/** Control-type-scaled, honest flag text. A direct state instrument is framed differently
 *  from a publicly-funded, editorially-independent broadcaster. */
export function flagText(e: StateMediaEntry): string {
  switch (e.control_type) {
    case "state-instrument":
      return `state-controlled (${e.controlling_entity}) — primary source for what this entity wants communicated, weak as an independent factual authority`;
    case "state-funded":
      return `state-funded (${e.controlling_entity}), editorial independence contested — weight the funder's stake`;
    case "state-funded-firewalled":
      return `government-funded with a statutory editorial firewall (${e.controlling_entity}) — independence is legally protected, but note the funder`;
    case "public-funded-independent":
      return `publicly funded, editorially independent by charter (${e.controlling_entity}) — note the public-funding relationship`;
    default:
      return `funding/control: ${e.controlling_entity}`;
  }
}
