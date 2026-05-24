// registry.ts — apply the self-declared-non-factual core memory (TS port of registry.py).
// Named outlets with blanket_floor get self_declared_nonfactual=true; MIXED outlets
// (Private Eye, Cracked) are listed but NOT floored (per-claim). matchesSelfDeclaration
// catches the long tail (parody YouTube/X accounts) via about/bio phrases.
import { defaultSource } from "./types.js";
export function applyToSources(sources, registry) {
    let floored = 0;
    let mixed = 0;
    for (const r of Object.values(registry)) {
        let s = sources[r.source_id];
        if (!s) {
            s = defaultSource(r.source_id);
            sources[r.source_id] = s;
        }
        s.genre = r.genre || "satire";
        s.self_declaration = r.self_declaration || "";
        if (r.blanket_floor) {
            s.self_declared_nonfactual = true;
            floored++;
        }
        else {
            s.self_declared_nonfactual = false;
            mixed++;
        }
    }
    return { floored, mixed };
}
export function matchesSelfDeclaration(text, patterns) {
    const low = (text || "").toLowerCase();
    for (const p of patterns) {
        if (low.includes(p))
            return { hit: true, phrase: p };
    }
    return { hit: false, phrase: null };
}
