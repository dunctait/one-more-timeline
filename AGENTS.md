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
- Badges are for actionable state, not logs: navigation indicators MUST point to attention-required work, not historical or log-only views.
- Game currencies need plain-language mechanical explanations: explain what a currency changes now, what it changes next run, and how it is earned where it first appears.

## Verification and ergonomics

CI passing is not proof of game feel or mobile layout ergonomics; tests must exercise complete-state journeys and mobile viewport geometry.
