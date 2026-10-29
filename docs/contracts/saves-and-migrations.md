# Saves and migrations contract

A save is a versioned serialisable document. At minimum it MUST identify the document kind, schema version, ruleset version, state payload, and integrity metadata appropriate to the transport.

A migration MUST be a named, deterministic transformation from one supported schema version to the next. Migrations MUST preserve meaning or fail with an actionable error; they MUST NOT silently drop unknown required data. A migration chain MUST be testable from every supported source version to the current version.

The reader MUST distinguish malformed input, unsupported versions, and valid empty state. The writer MUST emit the current schema version and MUST NOT emit a version it does not understand.

## Implemented migration: ruleset 0.1.0 to 0.2.0

Status: implemented and tested (`normalizeState` in `src/engine/engine.ts`, exercised by `tests/away.test.ts` and `tests/review-fixes.test.ts`).

Schema version 1 is unchanged. Ruleset 0.2.0 added fields (prestige currencies, features, automation, prestige counts, achievements, history, relics, discoveries, edicts, pending choice, challenge) and expanded the building set. Every load and import passes through `normalizeState`, which:

- fills each added field with a safe default and drops wrongly typed values;
- backfills the functions that a save's recorded prestige counts have already earned;
- recomputes derived values (storage caps, population cap, year and season) from the primary state rather than trusting them;
- clamps resources to storage and trims population to its cap;
- stamps the current ruleset version.

A save with an unknown schema version MUST still be rejected as unreadable rather than guessed. The local save key and the export string prefix (`OMT1:`) identify the document kind.
