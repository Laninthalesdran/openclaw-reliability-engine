---
name: reliability-check
description: >
  Use when evaluating how much to trust a claim, source, or piece of text — fact-checking,
  weighing evidence, spotting biased/leading language, deciding how much a statement should
  move your conclusions, or judging whether a source is reliable or self-declared satire.
  Triggers on "is this true / reliable / trustworthy", "check this source", "is this biased",
  "fact-check", "how confident should I be in this claim".
tools: [reliability_score_claim, reliability_check_source, reliability_scan_language]
---

# Reliability check

You have a Reliability Engine. Use it instead of judging credibility from the source's
reputation or your own priors. It scores **evidence and persuasion technique, not politics**,
and it explains every score.

## When to reach for which tool

- **Weighing a specific statement?** → `reliability_score_claim`. Pass the claim `text` plus
  whatever you know: `source_id`, `provenance` (primary/secondary/tertiary), `cites_evidence`,
  `n_independent_corroborators`, `falsifiable` (0–1), `genre` (satire/opinion/factual…). You get
  a 0–10 weight and a breakdown. **Use the weight to size your confidence, not to censor** —
  a low score means "corroborate before relying on this," not "this is forbidden."

- **Judging a source?** → `reliability_check_source` with `source_id` (and `about_text` if it's
  an unknown site/channel — it scans the bio/disclaimer for self-declared satire). Returns
  validity (accuracy), bias (direction + magnitude, kept SEPARATE from validity), salience, and
  whether it self-declares as non-factual.

- **Suspect spin?** → `reliability_scan_language` with the `text`. Returns a 0–1 manipulation
  score and the techniques present (loaded language, fear appeal, weasel attribution, us-vs-them,
  absolutes, clickbait…).

## How to read the results honestly

- **Bias ≠ wrong.** A source can be accurate AND slanted. Report both; don't treat a lean as a
  factual error.
- **Leading language lowers the score but doesn't make a claim false** — it means the source is
  persuading rather than informing. Say so, and look for the underlying evidence.
- **Vetoes are hard:** an unfalsifiable claim or a self-declared-satire source is floored no
  matter how confident it sounds. Surface the veto reason to the user.
- **Always pass through the explanation.** The value is the *why*, not the number. Tell the user
  which dimensions and which techniques drove the score so they can disagree with it.

## What NOT to do

- Don't use it to decide what a user is "allowed" to read. It's a confidence-weighting aid, not a
  gatekeeper.
- Don't substitute the source's political reputation for the engine's evidence-based score.
