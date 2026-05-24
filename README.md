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

## What it does (3 tools)

| Tool | What it answers |
|---|---|
| `reliability_score_claim` | How much should this claim move my beliefs? (0–10 + breakdown) |
| `reliability_check_source` | What's this source's validity / bias / salience / non-factual status? |
| `reliability_scan_language` | What persuasion techniques is this text using? (0–1 + techniques) |

## How it scores (no magic, all auditable)

**8 evidence primitives**, each 0–1, transparently weighted: provenance · verifiability · corroboration (independent only) · falsifiability · transparency · incentive-alignment · recency · source-prior.

**Vetoes** reputation can't override: an **unfalsifiable** claim or one with **no checkable origin** is floored. A source that **self-declares as satire/parody** (The Onion, etc.) is floored — but mixed outlets that also do real journalism (Private Eye, Cracked) are judged **per claim**, never blanket-zeroed.

**Leading-language discount** (up to −60%): detects persuasion *technique*, grounded in real research and **politically symmetric** by design (the us-vs-them lexicon carries left- and right-coded pejoratives equally). Categories cite: Da San Martino et al. 2019 (propaganda techniques), Brady et al. 2017 *PNAS* (moral-emotional diffusion), Tversky & Kahneman 1981 / Entman 1993 (framing), Ganter & Strube 2009 (weasel words), Cialdini 1984 (social proof), Blom & Hansen 2015 (clickbait), MPQA subjectivity lexicon.

**Anti-laundering trust:** a low-validity source **cannot** vouch another up — endorsements are gated by the endorser's own validity squared, cliques collapse, and validity is **earned from resolved-claim outcomes**, not assigned. (InfoWars vouching for a source moves ≈0.0025.)

## Install

```bash
openclaw plugins install clawhub:tntholley/reliability-engine
```

## Verify it locally (no build needed; Node 24+ runs TypeScript directly)

```bash
node test/demo.ts      # reproduces every number above — 11/11 checks
```

## Layout

```
index.ts                 OpenClaw plugin entry (registers the 3 tools)
openclaw.plugin.json      plugin manifest
src/                      the engine (zero OpenClaw deps — reusable, testable)
  engine.ts  claimScorer.ts  rhetoric.ts  trustGraph.ts  calibrate.ts  registry.ts  types.ts
data/                     the knowledge: leading-language lexicon (cited), self-declared-
                          non-factual registry (71 outlets) + patterns, seed source memory
test/demo.ts              verification harness
```

## License & ethos

Apache-2.0. Built by **Travis Edward Holley** (TNT Holley Inc.) **and Claude Opus 4.7 (1M context, Anthropic)**. The engine refuses to be a partisan referee: it scores evidence and technique, keeps **bias** (which way it leans) separate from **validity** (whether it's accurate), and every score is explainable so you can argue with it. That's the point.
