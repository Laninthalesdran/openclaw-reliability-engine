// index.ts — OpenClaw plugin entry. Registers reliability tools any agent can call.
// The engine itself (src/) has zero OpenClaw deps; this file is the only SDK adapter.
//
// API per OpenClaw docs (docs.openclaw.ai/plugins/building-plugins):
//   definePluginEntry({ id, name, description, register(api) }) + api.registerTool(def, opts)
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { ReliabilityEngine } from "./src/engine.js";
const engine = new ReliabilityEngine();
function text(obj) {
    return { content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] };
}
export default definePluginEntry({
    id: "reliability-engine",
    name: "Reliability Engine",
    description: "Scores how much a claim should move your beliefs — by evidence and persuasion " +
        "technique, not by the politics of the source. Explainable, non-partisan, auditable.",
    register(api) {
        // 1) Score a claim against its evidence -> epistemic weight 0-10 + breakdown
        api.registerTool({
            name: "reliability_score_claim",
            description: "Score a claim's reliability (0-10) from its evidence: provenance, verifiability, " +
                "corroboration, falsifiability, source track record, and a leading-language discount. " +
                "Returns the weight + an explainable breakdown (which dimensions and which persuasion " +
                "techniques drove it). Reputation cannot rescue an unfalsifiable or self-declared-satire claim.",
            parameters: Type.Object({
                text: Type.String({ description: "The claim text to score." }),
                source_id: Type.Optional(Type.String({ description: "Known source id (e.g. 'the_onion', 'wire_service')." })),
                provenance: Type.Optional(Type.String({ description: "primary | secondary | tertiary" })),
                cites_evidence: Type.Optional(Type.Boolean({ description: "Does the claim cite checkable evidence?" })),
                n_independent_corroborators: Type.Optional(Type.Number({ description: "Count of INDEPENDENT corroborating sources (fallback if IDs unknown)." })),
                corroborating_sources: Type.Optional(Type.Array(Type.String(), { description: "Corroborating source IDs. Preferred over the count: they are deduped by controlling entity, so state-controlled clones (e.g. RT+Sputnik+TASS) collapse to one and can't fake independent confirmation." })),
                falsifiable: Type.Optional(Type.Number({ description: "0 (cannot be wrong) .. 1 (sharply testable)." })),
                genre: Type.Optional(Type.String({ description: "factual | satire | parody | comedy | fiction | marketing | opinion" })),
                incentive_conflict: Type.Optional(Type.Number({ description: "0 (no stake) .. 1 (strong stake in belief)." })),
                age_days: Type.Optional(Type.Number()),
                domain_halflife_days: Type.Optional(Type.Number({ description: "How fast this kind of fact decays." })),
            }),
            async execute(_id, params) {
                const r = engine.scoreClaim(params);
                return text({ epistemic_weight: r.epistemic_weight, explanation: r.explanation, breakdown: r.breakdown });
            },
        });
        // 2) Inspect a source: validity / bias / salience / non-factual flag / effective prior
        api.registerTool({
            name: "reliability_check_source",
            description: "Look up a source's reliability profile: validity (accuracy earned from outcomes), bias " +
                "(direction + magnitude, kept separate from validity), salience (reach), whether it " +
                "self-declares as non-factual (satire/parody), whether it is state-funded/controlled (with " +
                "the controlling entity and an honest control-type framing), and its effective trust prior. " +
                "Optionally pass about_text to scan an unknown source's bio/disclaimer for self-declared-satire phrases.",
            parameters: Type.Object({
                source_id: Type.String({ description: "Source id to inspect." }),
                about_text: Type.Optional(Type.String({ description: "Optional about/bio/disclaimer text to scan." })),
            }),
            async execute(_id, params) {
                return text(engine.checkSource(params.source_id, params.about_text));
            },
        });
        // 3) Scan text for leading/biased language (technique, not position)
        api.registerTool({
            name: "reliability_scan_language",
            description: "Scan text for persuasion TECHNIQUE (loaded language, fear appeals, weasel attribution, " +
                "us-vs-them name-calling, absolutes, clickbait, etc.) — grounded in published research, " +
                "politically symmetric. Returns a 0-1 manipulation score and the techniques detected. " +
                "High manipulation lowers a claim's reliability because it substitutes rhetoric for evidence.",
            parameters: Type.Object({
                text: Type.String({ description: "Text to scan for leading/biased language." }),
            }),
            async execute(_id, params) {
                return text(engine.scanLanguage(params.text));
            },
        });
        // 4) Rate a source's structural bias from a batch of its own claims/headlines
        api.registerTool({
            name: "reliability_rate_bias",
            description: "Rate a source's STRUCTURAL bias magnitude (0-1) from a batch of its own claims/headlines, " +
                "measured by persuasion-technique density — symmetric (it counts technique, not which side the " +
                "technique serves) and kept SEPARATE from validity (it never changes the source's accuracy score). " +
                "A source can be accurate AND slanted; this measures the slant, not whether it's wrong. " +
                "Returns the bias magnitude + method. Unknown source ids are created in memory.",
            parameters: Type.Object({
                source_id: Type.String({ description: "Source id to rate (created in memory if unknown)." }),
                claim_texts: Type.Array(Type.String(), { description: "A batch of the source's claims/headlines; magnitude is the mean persuasion-technique density across them." }),
            }),
            async execute(_id, params) {
                const r = engine.rateBias(params.source_id, params.claim_texts);
                return text(r ?? { error: "Provide at least one claim_text to rate." });
            },
        });
    },
});
