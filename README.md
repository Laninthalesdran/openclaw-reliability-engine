> **Two ways to use the Reliability Engine** — 🤖 **OpenClaw agent plugin** (this repo) · 🧩 **Browser extension** → [Reliability-Web-Extension](https://github.com/Laninthalesdran/Reliability-Web-Extension). Same engine, two front-ends.

# Reliability Engine — an OpenClaw plugin

**Scores how much a claim should move your beliefs — by evidence and persuasion technique, not by the politics of the source.** Explainable, non-partisan, auditable. No censor in the basement.

Most "reliability" tools ship a list that says one outlet is good and another is bad. That bakes in a worldview and calls it objectivity. This one does the opposite: it scores **the claim and its evidence**, detects **persuasion technique** (not position), and earns source reputation from **outcomes** — and it shows its work every time.

---

## The 10-second demo

Same fact. Same source. Same evidence. Only the wording changes:

```
"The agency reported Q1 GDP rose 0.7%."                                  -> 9.29 / 10
"SHOCKING betrayal: the corrupt regime's so-called experts say a
 catastrophic economy is an existential threat — everyone knows it,
 wake up."                                                                -> 4.17 / 10
        ~ leading language 0.918  [loaded_language, appeal_to_fear,
          us_vs_them_namecalling, moral_emotional_outrage]
```

The language alone cost it 5 points — and the tool names exactly which techniques did it.

```
The Onion: "Congress passes bill requiring all citizens to own a goose"  -> 0.5 / 10
        !! VETO: non-factual (source self-declares non-factual)
A conspiracy claim that can't be falsified                               -> 2.0 / 10
        !! VETO: unfalsifiable (reputation cannot rescue this)
```

## What it does (4 tools)

| Tool | What it answers |
|---|---|
| `reliability_score_claim` | How much should this claim move my beliefs? (0–10 + breakdown) |
| `reliability_check_source` | What's this source's validity / bias / salience / non-factual status? |
| `reliability_scan_language` | What persuasion techniques is this text using? (0–1 + techniques) |
| `reliability_rate_bias` | How slanted is this source? Rate its structural bias (0–1) from a batch of its claims — symmetric, kept separate from validity |

## How it scores (no magic, all auditable)

**8 evidence primitives**, each 0–1, transparently weighted: provenance · verifiability · corroboration (independent only) · falsifiability · transparency · incentive-alignment · recency · source-prior.

**Vetoes** reputation can't override: an **unfalsifiable** claim or one with **no checkable origin** is floored. A source that **self-declares as satire/parody** (The Onion, etc.) is floored — but mixed outlets that also do real journalism (Private Eye, Cracked) are judged **per claim**, never blanket-zeroed.

**Leading-language discount** (up to −60%): detects persuasion *technique*, grounded in real research and **politically symmetric** by design (the us-vs-them lexicon carries left- and right-coded pejoratives equally). Categories cite: Da San Martino et al. 2019 (propaganda techniques), Brady et al. 2017 *PNAS* (moral-emotional diffusion), Tversky & Kahneman 1981 / Entman 1993 (framing), Ganter & Strube 2009 (weasel words), Cialdini 1984 (social proof), Blom & Hansen 2015 (clickbait), MPQA subjectivity lexicon.

**Anti-laundering trust:** a low-validity source **cannot** vouch another up — endorsements are gated by the endorser's own validity squared, cliques collapse, and validity is **earned from resolved-claim outcomes**, not assigned. (InfoWars vouching for a source moves ≈0.0025.)

**State-media control graph:** outlets sharing a controlling/funding entity (e.g. RT + Sputnik + TASS = Russian state) **collapse to one corroborator** so coordinated state outlets can't fake independent confirmation; state control raises the incentive-conflict floor and attaches an honest, **control-type-scaled** flag (a direct state instrument is framed differently from a publicly-funded independent broadcaster like the BBC). Applied symmetrically across all governments — it's a documented funding/control fact, not a political judgment. See `data/state_media_registry.jsonl`.

**Bias rating — structural, symmetric, firewalled from validity:** every source carries a `bias` (direction + magnitude) that the engine **never** lets bleed into `validity` — a source can be accurate *and* slanted, and the two are always reported separately. Magnitude is measured from **persuasion-technique density** (the same symmetric leading-language detector), so it counts *technique*, not which side it serves; direction can be fed by the Coverage Engine's **measured** selection/omission asymmetry, never assigned by hand. `reliability_check_source` returns it. Honest caveat: because magnitude rides on the leading-language detector, a calm-but-slanted source can read low — see `KNOWN_LIMITATIONS.md` §3.

## Install

```bash
openclaw plugins install clawhub:tntholley/reliability-engine
```

## Verify it locally (no build needed; Node 24+ runs TypeScript directly)

```bash
node test/demo.ts      # reproduces every number above — 20/20 checks
                       # (claim-scoring, anti-laundering, leading-language, satire,
                       #  calibration, state-media, and bias rating)
```

## Layout

```
index.ts                 OpenClaw plugin entry (registers the 3 tools)
openclaw.plugin.json      plugin manifest
src/                      the engine (zero OpenClaw deps — reusable, testable)
  engine.ts  claimScorer.ts  rhetoric.ts  trustGraph.ts  stateMedia.ts  calibrate.ts  registry.ts  types.ts
data/                     the knowledge: leading-language lexicon (cited), self-declared-
                          non-factual registry (71 outlets) + patterns, state-media control
                          graph, seed source memory
test/demo.ts              verification harness
```

## Known limitations — read them

This is a confidence-weighting aid, not a truth oracle and not a censor. Its hardest adversary is **state media** (accurate enough to keep its validity high while distorting through framing, coordinated corroboration, and omission), and **omission/agenda-setting** is structurally beyond a per-claim scorer. The control graph above mitigates the corroboration-gaming and flags state control, but the residual is real. The full, honest list is in **[`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md)** — read it before trusting a score. An engine that hides its blind spots is worse than one that names them.

## License & ethos

Apache-2.0. Built by **Travis Edward Holley** (TNT Holley Inc.) **and Claude Opus 4.7 (1M context, Anthropic)**. The engine refuses to be a partisan referee: it scores evidence and technique, keeps **bias** (which way it leans) separate from **validity** (whether it's accurate), and every score is explainable so you can argue with it. That's the point.
