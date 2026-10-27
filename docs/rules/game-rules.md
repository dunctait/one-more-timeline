# Game rules

The game rules are a versioned, deterministic contract between inputs and outcomes.

## Turns and time

A turn MUST have an explicit input, a rule version, and an outcome. If elapsed time affects state, the elapsed interval MUST be represented in the input or in a server-issued observation; a client MUST NOT silently invent time.

## Choices

Each action MUST declare its requirements, costs, effects, and failure conditions. An action MUST NOT consume a resource before validation succeeds. Irreversible actions MUST be clearly identified and, where practical, require confirmation.

## Randomness

Random outcomes MUST use a serialisable seed or an equivalent deterministic source. The engine MUST expose enough information for an identical replay under the same ruleset.

## Incremental-game gates

Any incremental mechanic MUST pass all of these gates before implementation:

1. The player can state what is increasing and why.
2. Growth creates new decisions or changes the strategic situation.
3. Offline progress has a bounded, legible rule.
4. The loop does not require compulsive checking or punitive urgency.
5. A reset, prestige, or equivalent loss is optional, explained, and agency-preserving.
6. The mechanic remains meaningful at small and large values without relying on runaway numbers alone.

The Layer 0 deterministic rules are implemented and tested in `src/engine/`; this document defines the ongoing acceptance bar.
