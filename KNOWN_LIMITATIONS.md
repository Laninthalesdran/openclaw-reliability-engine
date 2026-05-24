# Known Limitations & Vulnerabilities

This engine is a **confidence-weighting aid, not a truth oracle and not a censor.** Its value is the *explainable breakdown* — why a claim scored what it did — not the number itself. It raises the cost of deception; it does not make deception impossible. The honest failure modes below ship *with* the engine on purpose. Read them before trusting a score.

---

## 1. State media — the headline vulnerability (partially mitigated, not solved)

**State-controlled media is the hardest adversary for this engine, because it passes the signals while being systematically unreliable.** It does not fail the way crude misinformation fails. Four reasons:

1. **It stays accurate enough to keep its validity high.** Outlets like RT, Sputnik, CGTN, Xinhua, Press TV report large volumes of true, checkable facts and slip distortion in only on topics the state cares about. The calibration loop earns them decent validity from the majority-true claims; the distortion is diluted. **Accuracy is the camouflage.**
2. **They game corroboration.** Multiple state-controlled outlets push the same line; naïvely they look like independent confirmation when they are **one controller wearing many masks.**
3. **Their propaganda is calm and professional** — framing, selection, and omission, not the loaded/clickbait language the leading-language detector catches. They can score *low* on manipulation while being highly manipulative.
4. **Their incentive is structural** — a state organ has the strongest possible stake, but that isn't visible in the text of any single claim.

**What this engine now does about it** (see `data/state_media_registry.jsonl` + `src/stateMedia.ts`):
- A **control-keyed registry** maps outlets to their controlling/funding entity, applied **symmetrically across all governments** — this is a documented funding/control *fact*, never a judgment about which government is good.
- **Corroboration dedupes by controller:** N outlets sharing one controller collapse to **one** corroborator (defeats the biggest exploit — when corroborator identities are supplied).
- **State control auto-raises the incentive-conflict** discount and attaches a **`state_controlled` flag** with the honest framing: *"primary source for what this government is saying; weak as an independent factual authority."*
- A **control gradient** distinguishes *direct state instruments* (e.g., RT, Xinhua) from *publicly-funded, editorially-independent* outlets (e.g., BBC, Deutsche Welle) — lumping those together would itself be a bias. The flag's strength scales with the control type.

**What still gets through** (the unsolved residual):
- **Distortion *within* true facts** — selective true statements arranged to mislead. The engine scores the claims that are made; it cannot easily detect that true claims were *chosen* to create a false impression.
- **Framing** with no loaded words — see §3.
- **Omission** — see §2.
- If corroborator **identities aren't supplied** (only a count), the dedup can't run; the source-level flag/incentive penalty still applies, but coordinated-corroboration inflation isn't caught.

Treat any `state_controlled`-flagged source as a **primary source for the state's position, not as independent fact.** The flag is the load-bearing output here, more than the number.

## 2. Omission & agenda-setting — structurally undetectable per-claim
The engine evaluates the claims that are *made*. It cannot see the universe of claims that *should have been* covered. What a source chooses **not** to report — the core of agenda-setting and the most powerful propaganda technique — is invisible to a per-claim scorer. Catching it requires **cross-source coverage comparison** (a corpus-level layer), which this engine does not implement. This is a fundamental limit, not a tuning gap.

## 3. Sophisticated framing dodges the leading-language detector
The detector catches *technique* — loaded words, fear appeals, weasel attribution, absolutes, clickbait. It underperforms on **calm, professional framing** that achieves the same persuasion through sentence structure, selection, and implication without any flagged markers. Low manipulation score ≠ unbiased.

## 4. Registries are not exhaustive
The satire registry (71 outlets) and state-media registry are **starter sets**, English-centric, skewed to well-documented Western/major-power outlets. Long-tail, regional, and non-English sources are under-covered; the self-declaration *patterns* catch some long tail but not all. An unknown source gets a cautious default prior, not a verdict.

## 5. The accuracy numbers are eval-relative
Reported lexical/scoring accuracy comes from a **projection-built eval** that biases toward literal, common, verbatim-matched cases. It under-tests rare, idiomatic, and adversarial inputs. Don't read the benchmark as field accuracy.

## 6. Calibration cold-start
A source's `validity` is earned from **resolved** claims. New or rarely-resolved sources have weak, prior-dominated scores until outcomes accrue. Topic-scoped validity needs resolved claims *per sensitive topic* to be meaningful — and those are exactly the topics hardest to resolve.

## 7. It can be gamed by an actor who knows the rubric
A sophisticated source that cites evidence, avoids loaded words, states falsifiable-looking claims, and earns validity on easy topics can optimize *to* the engine. The rubric is transparent on purpose (auditability), which also means it's learnable. The engine increases the *cost* and *visibility* of deception; it does not guarantee detection.

## 8. Not a substitute for human judgment, and not a gatekeeper
Use the score to *weight* confidence and to *surface why*, never to decide what a person is allowed to read. A low score means "corroborate before relying on this," not "this is forbidden." Keeping bias (direction) separate from validity (accuracy) is deliberate — disagreeing with a lean is not the same as the source being wrong.

---

*If you find a failure mode not listed here, that's a contribution — open an issue. An honest limitations list is a feature, not an admission of weakness.*
