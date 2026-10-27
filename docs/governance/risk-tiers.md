# Risk tiers

Every proposed change MUST have a risk tier.

## Tier 1 — editorial

Typos, clarifications, formatting, and non-normative examples that cannot change player behaviour. One maintainer review is normally sufficient.

## Tier 2 — contained behaviour

A change to a rule, interface, presentation, or declarative content package that affects a bounded area and is reversible. It requires contract review, validation, and accessibility consideration.

## Tier 3 — durable or player-impacting

Changes to progression, economy, save formats, replays, authentication triggers, privacy, or anything that can strand or materially disadvantage a player. It requires maintainers for the affected boundary, explicit migration or rollback reasoning, and tests or fixtures demonstrating the changed contract.

## Tier 4 — protected boundary

Changes to release mechanics, authentication and identity, persistence compatibility, executable capability, protected files, or public/private separation. Tier 4 requires explicit owner approval and MUST NOT be merged on automated checks alone.

When uncertain, use the higher tier.
