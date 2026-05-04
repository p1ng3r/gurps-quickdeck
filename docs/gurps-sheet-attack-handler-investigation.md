# GURPS Sheet Attack Handler Investigation

## Scope
Investigate how the **GURPS system actor sheet** executes melee/ranged attacks so QuickDeck can mirror behavior (especially target-side effect-panel modifiers).

## What I could verify directly

### 1) Actor sheet click handler wiring
From `module/actor/actor-sheet.js` in `crnormand/gurps`:

- `activateListeners(html)` binds:
  - `.rollable` click -> `this._onClickRoll.bind(this)`
  - then runs `GurpsWiring.hookupAllEvents(html)` for OTF/data-otf links.

This indicates there are **two sheet click paths**:
1. `.rollable` fields handled by `_onClickRoll` (special sheet path).
2. OTF-style links handled by `GurpsWiring` (generic link path).

### 2) Generic OTF link path
From `module/gurps-wiring.js` in `crnormand/gurps`:

- `hookupAllEvents` binds click handlers for `.gurpslink`, `.gmod`, `.glinkmod*`, `.pdflink`, and `[data-otf]`.
- `handleGurpslink(event, actor, desc, options)` does:
  - decode `data-action` if present, else parse text/`data-otf` via `parselink`.
  - call `GURPS.performAction(action, actor, event, options?.targets)`.

This confirms sheet links can bypass text parsing when `data-action` is pre-encoded and pass an actual `event` object into `performAction`.

## Answers to requested items

## 1) Actor sheet click handler for melee/ranged
- **Confirmed**: `GurpsActorSheet.activateListeners()` wiring includes `.rollable` -> `_onClickRoll`.
- **Likely**: melee/ranged rows/buttons on the sheet use `.rollable` and therefore call `_onClickRoll`.

## 2) Selector/data attributes for attack rows/buttons
- **Confirmed selector**: `.rollable` (special roll path).
- **Confirmed generic selectors**: `.gurpslink` and/or `[data-otf]` for OTF path.
- **Not fully confirmed in this pass**: exact melee/ranged template attributes (e.g. exact `data-path` / `data-key`) because template file lookup was blocked in this environment.

## 3) Function called by handler
- `.rollable` path: `_onClickRoll`.
- OTF/link path: `GurpsWiring.handleGurpslink` -> `GURPS.performAction(...)`.

## 4) Exact action object / event data / path / obj passed
- **Confirmed for OTF path**: `GURPS.performAction(action, actor, event, options?.targets)` where:
  - `action` comes from `data-action` (preferred) or `parselink(...)`.
  - `event` is the original click event.
- **Not fully confirmed for `_onClickRoll` path**: exact object shape built by `_onClickRoll` (needs full source extraction of that function + template attributes).

## 5) Special sheet method vs parselink/executeOTF
- **Yes**. Actor sheet has a **special method path** via `.rollable` -> `_onClickRoll` that is distinct from simple `executeOTF` use.
- This is the strongest explanation for effect-panel parity differences: QuickDeck currently succeeds through `executeOTF`, but sheet parity likely depends on `_onClickRoll`-built context and/or `performAction` invocation with sheet event semantics.

## 6) Fields required for target-side effect-panel modifiers
Based on confirmed wiring and your test results, the likely minimum parity requirements are:

1. Use `GURPS.performAction(...)` (or whichever method `_onClickRoll` uses internally), not only `executeOTF`.
2. Provide a genuine click-like `event` context (the sheet path passes it).
3. Ensure `actor` is explicit (not only `LastActor`).
4. Prefer a full encoded `data-action` style action payload rather than reparsed shorthand where possible.
5. Preserve target context (`game.user.targets`) at execution time.

## Recommended QuickDeck implementation (no behavior change in this pass)
1. Add instrumentation-only logging around QuickDeck attack execution to capture:
   - current actor id
   - sourcePath
   - constructed action (if any)
   - whether call site is `executeOTF` or `performAction`
   - target ids count
2. Add a compatibility spike (behind debug flag) that calls the same lower-level API as sheet `_onClickRoll` once exact payload is confirmed.
3. Prefer replicating **sheet-generated action object** rather than re-parsing `@system.melee.<key>` strings.

## Unknowns / follow-up required
- Exact `_onClickRoll` implementation body and the precise object it builds.
- Exact melee/ranged template markup and data attributes used by attack row/button elements.
- Whether `_onClickRoll` calls `performAction`, `doRoll`, or another intermediate helper.

Because direct GitHub clone/download is blocked in this container, I could only partially extract source via raw file endpoints and could not fully enumerate templates/functions.

## References used
- https://github.com/crnormand/gurps/blob/main/module/actor/actor-sheet.js
- https://raw.githubusercontent.com/crnormand/gurps/master/module/actor/actor-sheet.js
- https://raw.githubusercontent.com/crnormand/gurps/master/module/gurps-wiring.js
