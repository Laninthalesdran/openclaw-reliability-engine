// engine.ts — public API. Loads the data files and ties scorer + trust graph +
// rhetoric + registry + calibration together. Zero OpenClaw deps (so it's testable
// and reusable); the plugin entry (index.ts) is the only file that imports the SDK.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { defaultSource } from "./types.js";
import { gateEdges, effectivePrior } from "./trustGraph.js";
import * as rhetoric from "./rhetoric.js";
import { scoreClaim, explain } from "./claimScorer.js";
import { applyToSources, matchesSelfDeclaration } from "./registry.js";
import { calibrate } from "./calibrate.js";
// Walk up from this module to find the data/ folder. Works whether running from
// source (src/engine.ts) or compiled output (dist/src/engine.js) — the data/ dir
// lives at the package root in both cases.
function findDataDir(start) {
    let dir = start;
    for (let i = 0; i < 6; i++) {
        const candidate = join(dir, "data");
        if (existsSync(join(candidate, "leading_language.json")))
            return candidate;
        const parent = dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return join(start, "..", "data");
}
const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA = findDataDir(HERE);
function readJsonl(path) {
    return readFileSync(path, "utf-8").split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("//"))
        .map((l) => JSON.parse(l));
}
function mergeSource(raw) {
    const s = defaultSource(raw.source_id);
    for (const k of Object.keys(raw)) {
        if (k === "validity" || k === "bias" || k === "salience") {
            Object.assign(s[k], raw[k]);
        }
        else {
            s[k] = raw[k];
        }
    }
    return s;
}
export class ReliabilityEngine {
    sources = {};
    patterns = [];
    registry = {};
    constructor(dataDir = DEFAULT_DATA) {
        // 1. leading-language lexicon -> rhetoric detector
        rhetoric.loadLexicon(JSON.parse(readFileSync(join(dataDir, "leading_language.json"), "utf-8")));
        // 2. seed source memory
        for (const raw of readJsonl(join(dataDir, "sources.seed.jsonl"))) {
            const s = mergeSource(raw);
            this.sources[s.source_id] = s;
        }
        // 3. self-declared-non-factual registry + patterns
        for (const e of readJsonl(join(dataDir, "non_factual_registry.jsonl"))) {
            this.registry[e.source_id] = e;
        }
        this.patterns = JSON.parse(readFileSync(join(dataDir, "non_factual_patterns.json"), "utf-8")).patterns;
        applyToSources(this.sources, this.registry);
        gateEdges(this.sources);
    }
    /** Score a claim against its evidence. */
    scoreClaim(input) {
        const r = scoreClaim(input, this.sources);
        return { ...r, explanation: explain(input.text, r) };
    }
    /** Inspect a source: validity / bias / salience / non-factual flag / effective prior. */
    checkSource(sourceId, aboutText) {
        const s = this.sources[sourceId];
        const patternHit = aboutText ? matchesSelfDeclaration(aboutText, this.patterns) : { hit: false, phrase: null };
        if (!s) {
            return {
                found: false, source_id: sourceId,
                self_declared_nonfactual: patternHit.hit,
                self_declaration_match: patternHit.phrase,
                effective_prior: aboutText && patternHit.hit ? 0.05 : 0.3,
                note: "unknown source; cautious default prior",
            };
        }
        return {
            found: true, source_id: sourceId,
            validity: s.validity, bias: s.bias, salience: s.salience,
            genre: s.genre, self_declared_nonfactual: s.self_declared_nonfactual || patternHit.hit,
            self_declaration: s.self_declaration, self_declaration_match: patternHit.phrase,
            effective_prior: Math.round(effectivePrior(this.sources, sourceId) * 1000) / 1000,
        };
    }
    /** Scan text for leading/biased language (technique, not position). */
    scanLanguage(text) {
        return rhetoric.analyze(text);
    }
    /** Long-tail self-declaration check (e.g. a parody channel's About text). */
    checkSelfDeclaration(text) {
        return matchesSelfDeclaration(text, this.patterns);
    }
    /** Calibration loop: resolved claims -> earned validity. */
    calibrate(resolved) {
        return calibrate(this.sources, resolved);
    }
}
