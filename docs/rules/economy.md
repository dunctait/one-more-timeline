# Economy

The economy covers resources, prices, rewards, losses, and exchanges.

All economic quantities MUST have named units, bounded precision, and explicit versioned rules. The engine MUST use exact or otherwise deterministic arithmetic; display rounding MUST NOT alter the underlying result.

Costs MUST be visible before commitment. Rewards MUST identify their source. A resource MAY be scarce, but scarcity MUST be part of the stated game rule rather than an undisclosed service intervention.

The economy MUST NOT sell competitive advantage for real money in a way that undermines the experiment thesis. If monetisation is added later, it MUST be documented separately, tested against the anti-goals, and kept outside the deterministic core.

## No passive loss

Per-tick resource rates MUST NOT be negative. Upkeep such as feeding the population MUST be absorbed from production before the surplus is stored, and the displayed rate MUST be the stored surplus. Starvation, decay, population loss, and stability drain MUST NOT exist. The engine MUST clamp any derived rate at zero rather than applying it. This implements the "Number only goes up" pillar.

## Prestige ladder

Prestige is a ladder of four tiers. Each tier resets everything below it, banks one permanent currency, and sends back a function. Tiers 2 to 4 are available only while the final rung (Sovereign Realm) stands, so each is the climax of a run and the banner and Evolution badge MUST announce it. A tier stays hidden until the player first comes across it: it appears once the tier before it has been performed and the player has reached the realm or banked what the tier asks for.

| Tier | Name | Requires | Gain | Currency effect | Functions sent back |
| --- | --- | --- | --- | --- | --- |
| 1 | Time Jump | Dawn Village and Year 30 | Insight from year, rung, population, knowledge | +1% production each (the bonus stops at +50%, but further Insight still counts toward Epoch Shift), starting reserves of up to +20 Food and +15 Materials | Ancestral Hands (1st): newcomers auto-assigned |
| 2 | Epoch Shift | Realm, Year 60, 120 Insight | 1 + 1 per 120 Insight | Echoes: +10% production each | Rising Tide (1st): rungs advance automatically; Inherited Foundations (2nd): start with Hut, Granary, Workshop |
| 3 | Paradigm Shift | Realm, Year 120, 8 Echoes | 1 + 1 per 8 Echoes | Resonance: x1.25 production each; timelines start higher up the rungs | Temporal Foresight (1st): previews every tier's gain |
| 4 | Ascension | Realm, Year 240, 6 Resonance | 1 + 1 per 6 Resonance | Eternity Marks: x2 production each; each also starts timelines two rungs higher (head starts stop at Trade City) | The Steward (1st): builds the cheapest affordable building each tick |

Repeating a tier keeps sending functions back: Seasoned Memory (3rd Time Jump) reissues Edicts each timeline; Lore Keepers (6th Time Jump) starts timelines with early Discoveries; Apprentice Scholars (3rd Epoch Shift) auto-research; Second Wind (2nd Paradigm Shift) extends away progress to 24 hours; Twin Stewards (2nd Ascension) lets the Steward build twice per tick; Chrono Dial (5th Epoch Shift) lets the player run the timeline at 2x or 4x speed. Grand Foundations (10th Time Jump) adds an Obelisk and Fire Pit to every start; Echo Merchants (8th Epoch Shift) open the Marketplace at Dawn Village; Master Scholars (3rd Ascension) cut Discovery costs by a quarter. The Evolution tab MUST show the closest unearned functions and exactly what earns them.

Each deeper tier MUST take clearly longer than the one before. `tests/ladder-pacing.test.ts` plays the whole ladder with an optimal bot and requires each tier's first completion to arrive at least twice as late as the previous tier's. Year requirements are shown as ordinary progress items so the wait is never hidden.

Every building and rung requirement MUST fit within the storage the player has at the preceding rung, and a steady player MUST be able to reach the final rung in a single sitting. These are enforced by `tests/progression.test.ts`.

## Responsiveness over artificial lockouts

In incremental games, manual gathering actions must remain immediately responsive to user input. Never lock or throttle clicks via interaction delays or tick cooldowns to solve pacing; pace through mathematical yield, caps, and opportunity costs, not interaction hostility.

## Continuous progression reachability

Early rungs and building unlocks must be reachable within a normal first-session attention span without requiring divine knowledge or secret developer cheats. The path from gathering to the first settlement must be visibly progressive and unblocked.

## Affordance visibility

Unlocked actions, roles, and buildings must be explicitly discoverable and actionable from the primary surfaces where the player makes decisions. Never hide progression behind unannounced tabs or off-screen states without clear signposts.

## Mathematical reachability and prestige thresholds

Progression requirements across developmental rungs and buildings must be mathematically solvable within the player's available storage and production caps at that rung. The threshold for prestige resets must be explicitly demarcated so players understand when a timeline has achieved its maximum potential and are never left facing an artificial deadlock.

Legacy currency transparency: A persistent currency MUST have a visible formula or breakdown for its current effect, projected gain, and next-cycle benefit.

The resource rules are implemented and tested in `src/engine/`. No hosted economy service or real-money monetisation is currently provided by this repository.
