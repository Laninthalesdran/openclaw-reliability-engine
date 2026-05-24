// types.ts — data model for the reliability engine (TS port of schemas.py).
// Three separate source axes on purpose: validity (accuracy, earned from outcomes),
// bias (direction + magnitude of lean), salience (reach/influence).
export function defaultValidity() {
    return { score: 0.5, n_resolved: 0, brier: null, ceiling_reason: "" };
}
export function defaultSource(source_id) {
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
