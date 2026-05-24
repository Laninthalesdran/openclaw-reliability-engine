// demo.ts — verifies the TS port reproduces the Python engine's numbers.
// Run:  node test/demo.ts   (Node 24 strips types; no build needed)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ReliabilityEngine } from "../src/engine.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const eng = new ReliabilityEngine();

let pass = 0, fail = 0;
function check(label: string, got: number, want: number, tol = 0.05) {
  const ok = Math.abs(got - want) <= tol;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: got ${got}  (want ~${want})`);
  ok ? pass++ : fail++;
}

console.log("=".repeat(64));
console.log("(A) CLAIM SCORING");
console.log("=".repeat(64));
const wireGdp = eng.scoreClaim({
  text: "Q1 GDP rose 0.7%, per the agency's released data series.",
  source_id: "wire_service", provenance: "primary", cites_evidence: true,
  n_independent_corroborators: 3, falsifiable: 0.95, age_days: 2, domain_halflife_days: 900,
});
console.log(wireGdp.explanation);
check("wire GDP (primary,cited,3-corrob)", wireGdp.epistemic_weight, 9.53);

const anon = eng.scoreClaim({
  text: "Q1 GDP rose 0.7%. (unsourced post)", source_id: "anon_forum",
  provenance: "tertiary", cites_evidence: false, falsifiable: 0.95, age_days: 2, domain_halflife_days: 900,
});
check("anon forum (tertiary,uncited)", anon.epistemic_weight, 3.8, 0.6);

const conspiracy = eng.scoreClaim({
  text: "A shadowy elite secretly controls all world events.",
  source_id: "conspiracy_broadcaster", provenance: "tertiary", cites_evidence: false,
  falsifiable: 0.05, incentive_conflict: 0.8,
});
check("conspiracy (unfalsifiable veto)", conspiracy.epistemic_weight, 2.0, 0.8);

console.log("\n" + "=".repeat(64));
console.log("(B) ANTI-LAUNDERING");
console.log("=".repeat(64));
const anonSrc = eng.checkSource("anon_forum");
console.log("  anon_forum effective prior:", anonSrc.effective_prior);
check("anon_forum effective prior (laundering blocked)", anonSrc.effective_prior!, 0.131, 0.02);

console.log("\n" + "=".repeat(64));
console.log("(C) LEADING-LANGUAGE DISCOUNT (same source/evidence)");
console.log("=".repeat(64));
const base = {
  source_id: "wire_service", provenance: "primary" as const, cites_evidence: true,
  n_independent_corroborators: 2, falsifiable: 0.95, age_days: 2, domain_halflife_days: 900,
};
const neutral = eng.scoreClaim({ ...base, text: "The agency reported Q1 GDP rose 0.7%." });
const loaded = eng.scoreClaim({ ...base,
  text: "SHOCKING betrayal: the corrupt regime's so-called experts say a catastrophic economy is an existential threat — everyone knows it, wake up." });
console.log(neutral.explanation);
console.log(loaded.explanation);
check("neutral wording", neutral.epistemic_weight, 9.29, 0.05);
check("loaded wording (discounted)", loaded.epistemic_weight, 4.17, 0.3);

console.log("\n" + "=".repeat(64));
console.log("(D) SELF-DECLARED-NON-FACTUAL REGISTRY");
console.log("=".repeat(64));
const onion = eng.scoreClaim({
  text: "Congress passes bill requiring all citizens to own at least one goose.",
  source_id: "the_onion", provenance: "secondary", cites_evidence: false, falsifiable: 0.8,
});
console.log(onion.explanation);
check("The Onion (auto-floored)", onion.epistemic_weight, 0.5, 0.2);

const pe = eng.scoreClaim({
  text: "Investigation: firm X overbilled the agency by 4.2M (documents cited).",
  source_id: "private_eye", provenance: "primary", cites_evidence: true,
  n_independent_corroborators: 2, falsifiable: 0.9, genre: "factual",
});
check("Private Eye (mixed, NOT floored)", pe.epistemic_weight, 8.24, 0.3);

const yt = eng.checkSelfDeclaration("THIS CHANNEL IS A PARODY (NOT REAL) AND IS FOR ENTERTAINMENT PURPOSES ONLY.");
console.log(`  long-tail parody scan: hit=${yt.hit} on '${yt.phrase}'`);

console.log("\n" + "=".repeat(64));
console.log("(E) CALIBRATION LOOP");
console.log("=".repeat(64));
const resolved = readFileSync(join(HERE, "..", "data", "resolved_claims.jsonl"), "utf-8")
  .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//")).map((l) => JSON.parse(l));
const changes = eng.calibrate(resolved);
for (const c of changes) {
  console.log(`  ${c.source_id}: ${c.before.score}->${c.after.score} (n ${c.before.n}->${c.after.n}) brier ${c.brier}`);
}
const m = Object.fromEntries(changes.map((c) => [c.source_id, c.after.score]));
check("wire_service validity (robust to small batch)", m["wire_service"], 0.929, 0.01);
check("anon_forum validity (earned)", m["anon_forum"], 0.305, 0.02);
check("indie_newsletter validity (earned from scratch)", m["indie_newsletter"], 0.75, 0.02);

console.log("\n" + "=".repeat(64));
console.log("(F) STATE MEDIA — control graph (Achilles-heel hardening)");
console.log("=".repeat(64));
// RT "corroborated" by Sputnik + TASS — all Russian state → collapse to ZERO independent
const rtCoord = eng.scoreClaim({
  text: "Officials announced the operation was a complete success.",
  source_id: "rt", provenance: "primary", cites_evidence: true,
  corroborating_sources: ["sputnik", "tass"], falsifiable: 0.8,
});
console.log(rtCoord.explanation);
check("RT + state clones: corroboration collapses to ~0", rtCoord.breakdown.dims.corroboration, 0.0, 0.01);

// same claim, genuinely independent corroborators → corroboration counts
const rtIndep = eng.scoreClaim({
  text: "Officials announced the operation was a complete success.",
  source_id: "rt", provenance: "primary", cites_evidence: true,
  corroborating_sources: ["wire_service", "daily_newsdesk"], falsifiable: 0.8,
});
check("RT + independent sources: corroboration counts (2 groups)", rtIndep.breakdown.dims.corroboration, 0.70, 0.05);
console.log(`  coordinated ${rtCoord.epistemic_weight} vs independent ${rtIndep.epistemic_weight} — dedup + incentive penalty bite`);

// control-type gradient: RT (instrument) is NOT lumped with BBC (public-funded-independent)
const rt = eng.checkSource("rt");
const bbc = eng.checkSource("bbc");
console.log(`  rt  -> ${(rt as any).state_media?.control_type}`);
console.log(`  bbc -> ${(bbc as any).state_media?.control_type}`);
check("RT flagged state-instrument", (rt as any).state_media?.control_type === "state-instrument" ? 1 : 0, 1);
check("BBC flagged public-funded-independent (not lumped w/ RT)", (bbc as any).state_media?.control_type === "public-funded-independent" ? 1 : 0, 1);

console.log("\n" + "=".repeat(64));
console.log("(G) BIAS RATING — structural, symmetric, separate from validity");
console.log("=".repeat(64));
const vBefore = eng.sources["wire_service"].validity.score;
const rb = eng.rateBias("wire_service", [
  "SHOCKING betrayal: the corrupt regime's so-called experts destroyed everything — wake up",
  "outrageous: the radical elites slammed patriots in a disgraceful, catastrophic attack",
]);
const vAfter = eng.sources["wire_service"].validity.score;
console.log(`  wire_service bias magnitude (from heavy technique): ${rb.magnitude}`);
check("loaded claims -> high bias magnitude (>0.5)", rb.magnitude > 0.5 ? 1 : 0, 1);
check("rating bias does NOT touch validity (firewall)", Math.abs(vAfter - vBefore) < 1e-9 ? 1 : 0, 1);

eng.rateBias("daily_newsdesk", ["the committee reported a 0.7% increase in output."]);
check("neutral claim -> low bias magnitude (<0.2)", eng.sources["daily_newsdesk"].bias.magnitude < 0.2 ? 1 : 0, 1);

// side-symmetry: same technique aimed at opposite-coded targets -> equal magnitude
const rightT = eng.rateBias("anon_forum", ["the corrupt fascist betrayed everyone, wake up"]);
const leftT = eng.rateBias("indie_newsletter", ["the corrupt woke betrayed everyone, wake up"]);
console.log(`  right-coded target ${rightT.magnitude} vs left-coded target ${leftT.magnitude}`);
check("bias is SIDE-SYMMETRIC (same technique, opposite targets -> equal magnitude)",
      Math.abs(rightT.magnitude - leftT.magnitude) < 0.01 ? 1 : 0, 1);

// coverage-engine selection signal feeds DIRECTION (measured, not assigned)
const sb = eng.setSelectionBias("partisan_blog", "pro-PolY", 0.8);
check("selection-bias sets direction from measured omission, not judgment",
      (sb.direction === "pro-PolY" && sb.magnitude >= 0.8) ? 1 : 0, 1);

console.log("\n" + "=".repeat(64));
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log("=".repeat(64));
process.exit(fail > 0 ? 1 : 0);
