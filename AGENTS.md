# Contribution rules

This repository is the public source of truth for One More Timeline's normative rules and distributable implementation.

## Scope

- Keep public material free of credentials, private operations, local machine paths, user data, and internal decision transcripts.
- Treat `main` as the release boundary. Do not describe work as released until it is present on `main` and the repository checks pass.
- Do not add executable feature packages. Feature proposals are declarative data reviewed under the governance contracts.
- Do not add engine code, service integrations, or authentication claims without updating the relevant contract and marking implementation status honestly.
- Preserve deterministic engine/view separation: rules must not depend on rendering, wall-clock UI behaviour, or hidden client state.

## Documentation

Normative documents use MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in their ordinary requirements sense. Every rule should identify its scope and observable consequence. Historical rationale may be summarized, but decision transcripts and review archives do not belong in this repository.

## Protected paths

Changes to release, contract, governance, persistence, and accessibility documents require review by the owners listed in `.github/CODEOWNERS`. Protected boundaries are defined in `docs/governance/protected-boundaries.md`.

## Implementation status

Use explicit status language: “specified”, “scaffolded”, “not implemented”, or “implemented and tested”. Do not imply that an API, service, engine, or hosted feature exists merely because its contract is documented.

## Feedback codification protocol

Feedback Codification Protocol: Whenever user feedback is received or an operational fix is delivered, extract the underlying game design or engineering philosophy into our normative documents (docs/philosophy/, docs/rules/, docs/contracts/) and AGENTS.md. Never treat feedback as merely a local bug fix; derive and codify the general invariant so agents do not repeat the failure mode.

- Never allow soft wall fizzles: When an incremental phase culminates, alert the player that prestige is ready rather than letting progress stall into an unexplained bottleneck.
- Prestige must send back a function: every prestige tier unlocks at least one automation, starting structure, or information feature, never only a percentage buff. Functions must be explained, listed, and switchable.
- Never punish absence or time: no rate may be negative and no resource may decay; frame scarcity as slower growth, caps, or costs.
- Quietly notified when it can be done, clearly when it is new: pills always show a number; a filled orange pill means something novel (a first of its kind), a hollow ring means more of the familiar.
- Badges are for actionable state, not logs: navigation indicators MUST point to attention-required work, not historical or log-only views.
- Progressive disclosure of complexity: never show a mechanic, currency, tier or preview until the player first comes across it; once met it stays. Hidden mechanics must not be named in goals, banners, badges or header pills.
- Only half the people work (rounded down): jobs, not headcount, gate roles; explain it where roles are assigned and never unassign anyone from an old save.
- Nothing moves under the player's thumb: manual buttons stay at the top, headers use fixed widths, notices live in a bottom banner row above the sub-menu, and toasts measure the screen and sit above all of it.
- Events are decisions in two kinds: timeless tales that wait on their own page, and rare urgent lesser-evil events that stop the timeline in a modal (about one in five); never free gifts, never time pressure on a tale, costs shown in icons beforehand.
- Show only what is unlocked: never render a locked building, wonder, idea or trial; a sub-menu page exactly one rung from opening MAY show greyed out with when it opens, otherwise the cell is blank.
- The first of anything is an event: the first purchase, rung or unlock must be a short earned slog followed by clear relief; do not let players plough through purchases until each feels unimportant.
- Pages hold a handful: five to ten items on every full page of a paged list; condense cards to icons and numbers (board-game style, `src/ui/icons.ts`) rather than sentences.
- Every Jumpback creates a reward: scripted for the first three, then a choice of boons.
- Everything fits on one screen: navigation is two-tier (bottom bar plus a visually distinct sub-menu directly above it, five pages per section), every page fits a phone viewport (412x780, and 360x700 where possible) with no scrolling, and long lists are paged to fit rather than scrolled.
- Quiet by default: toasts are only for the result of something the player just did. Achievements and events are never toasts, and anything the player must act on is a banner every page shows.
- Game currencies need plain-language mechanical explanations: explain what a currency changes now, what it changes next run, and how it is earned where it first appears.

## Delivery

Once a change is complete and validated (type check, tests including `tests/mobile-fit.test.ts`, and a clean build), commit it and push it to `main` without waiting to be asked. Unvalidated or half-finished work MUST NOT be pushed. This repository's owner has standing approval for this, which overrides any general "wait for direction after a push" habit.

## Verification and ergonomics

Engine changes MUST keep `tests/fuzz.test.ts` (random play across every action, checking invariants such as no negative or non-finite numbers, storage caps, and roles summing to population) and `tests/ladder-pacing.test.ts` passing; raise the fuzz run count locally when changing the engine.

UI wiring MUST be covered by the jsdom page tests (`tests/dom.test.ts`, `tests/dom-late.test.ts`, `tests/dom-away.test.ts`, plus the random-click `tests/dom-fuzz.test.ts`), which boot the real `index.html` and `src/main.ts` and drive them through complete journeys.

Layout MUST be verified in a real browser engine: `tests/mobile-fit.test.ts` drives the system Chrome at phone sizes through every main section and sub-page in several game states, and fails on any overflow, clipping, scrollbar or small tap target. CI sets `OMT_REQUIRE_BROWSER=1` so a missing browser fails instead of skipping. Any new page, list or card MUST pass it.

CI passing is not proof of game feel or mobile layout ergonomics; tests must exercise complete-state journeys and mobile viewport geometry.
