# Game rules

The game rules are a versioned, deterministic contract between inputs and outcomes.

## Turns and time

A turn MUST have an explicit input, a rule version, and an outcome. If elapsed time affects state, the elapsed interval MUST be represented in the input or in a server-issued observation; a client MUST NOT silently invent time.

## Choices

Each action MUST declare its requirements, costs, effects, and failure conditions. An action MUST NOT consume a resource before validation succeeds. Irreversible actions MUST be clearly identified and, where practical, require confirmation.

## Randomness

Random outcomes MUST use a serialisable seed or an equivalent deterministic source. The engine MUST expose enough information for an identical replay under the same ruleset.

## Away progress

When the player returns after an absence, the client MUST advance the timeline by the whole seconds elapsed, bounded at eight hours (24 once Second Wind is unlocked, plus any hours a relic adds), using the same deterministic tick rules as active play. Because no rate is negative, absence MUST NOT cost the player anything. The client MUST tell the player what happened while they were away. Time the page spends throttled in a background tab MUST be treated as absence too. A paused timeline MUST stay paused through absence, and the pause MUST survive a reload. Catch-up MUST be done in slices so the interface stays responsive on a phone, and player actions MUST wait until catch-up finishes.

Remembered or inherited choices (for example Edicts carried by Seasoned Memory) MUST only take effect once the timeline has reached the rung that unlocks them, so no bonus is ever invisible.

## Seasonal events

Events roll once per year from the timeline seed and tick, so the same seed always yields the same events. Events MUST be gifts: they MAY add resources, Stability or people and MUST NOT remove anything.

## Choice events

Some events let the player pick one of two or three gifts. Every option MUST be a gift, so no choice can be wrong in a way that costs anything. A decision MUST wait for the player and show as an actionable Hearth signal; if the player stays away, the first option MUST be taken for them when the next choice event arrives. If a prestige ends the timeline first, the unanswered decision and any running challenge MUST be acknowledged in the Chronicle with a statement that nothing was lost.

## Challenges

Challenges are optional restricted timelines that open after a first Jumpback. Starting one ends the current timeline, pays out the Insight a Jumpback would, and begins a new timeline with every permanent bonus intact; a challenge whose goal the starting head start already reaches MUST NOT be startable; completing one awards a permanent trophy relic. Failing a time limit or abandoning a challenge MUST cost nothing and simply return the timeline to normal play. Automation MUST obey a challenge's restrictions.

## Discoveries

Discoveries are researched with Knowledge, give a stated bonus (production, storage, population room, Stability, or manual-action yield), and are rediscovered each timeline. Every Discovery's cost MUST fit inside the Knowledge storage available at the rung that unlocks it. Some Discoveries additionally require banked Echoes, Resonance or Eternity Marks; the interface MUST state exactly what is needed.

## Automation

Automation that spends (the Steward, Apprentice Scholars) MUST NOT spend below the Food, Materials and Knowledge the next rung requires, except to build the very buildings that rung requires, so automation can never stall progress unseen. Automation MUST obey challenge restrictions.

## Marketplace

From the Walled Town, the player MAY trade one store for another at a stated ratio. Trades are always explicit player actions, MUST show the ratio before commitment, MUST NOT spend more than the destination can hold, and every round trip through the market MUST lose value so trading cannot create resources from nothing. Grand Bazaars improve ratios down to a floor of 1.5 to 1.

A store that has reached its cap MUST say it is full rather than show a rate that silently does nothing.

## Previews

A building's card MUST state what one more would add using the player's real multipliers, and that statement MUST equal the actual change in the production rate (enforced by test). Costs are shown before commitment.

## Wonders

Each rung from the Settled Camp upward offers one Wonder: a building limited to one per timeline that adds a percentage to all production. Wonders are the late-game sink for banked resources, and their cost MUST fit the storage of their rung.

## Relics

Relics are rare, permanent finds that turn up with seasonal events, only from rungs the timeline has reached. They MUST NOT be lost by any reset, MUST each send back a stated small function or bonus, and a locked relic MUST say where it can be found.

## Timeline variation

Each timeline MUST derive its own seed from the base seed and the number of timelines begun, so consecutive timelines do not replay identical events or names while remaining fully reproducible.

## Edicts

Each rung from the Gathering Band upward opens one Edict slot offering three emphasis choices. Edicts MUST be free to change at any time with no cost or lockout, so a choice is never a mistake, and an empty slot is an actionable Settlement signal because it leaves production unused.

## Harmony

Stability only rises, so it MUST matter as an upside: at 90 or more it adds +8% to all production and at 100 it adds +15%. Low Stability MUST NOT reduce anything.

## Seasons

Every season MUST boost something and MUST NOT penalise anything below the base rate. Winter's slower foraging is paired with a Knowledge boost so no season feels like a loss.

## Lifetime statistics

The game keeps lifetime counters (time lived, gathers, buildings built, discoveries made, trades). They MUST only ever increase, MUST survive every reset, MUST be shown in Records, and MAY drive achievements.

## Achievements

Achievements are permanent, shown with their goal before they are earned, and each adds a small Renown production bonus. They MUST NOT be lost by any reset.

## Incremental-game gates

Any incremental mechanic MUST pass all of these gates before implementation:

1. The player can state what is increasing and why.
2. Growth creates new decisions or changes the strategic situation.
3. Offline progress has a bounded, legible rule.
4. The loop does not require compulsive checking or punitive urgency.
5. A reset, prestige, or equivalent loss is optional, explained, and agency-preserving.
6. The mechanic remains meaningful at small and large values without relying on runaway numbers alone.

The deterministic rules are implemented and tested in `src/engine/`; this document defines the ongoing acceptance bar.

## Jumpback gate

The first Jumpback (and a challenge start, which ends the timeline the same way) MUST require the Dawn Village and Year 40. Until a Jumpback has been offered or performed, the Jumpback, Insight, sent-back functions and challenges MUST NOT appear in the interface.

## Progressive disclosure

The interface MUST reveal a mechanic only once the player has come across it: the Marketplace, Edicts and Discoveries from the rung that opens them, the Jumpback when it first becomes possible, sent-back functions, challenges and past timelines after the first Jumpback, relics when the first is found, and each deeper prestige tier once the previous tier has been performed and the realm is reached or its currency banked. Revealed mechanics stay revealed.

## Banner and quiet toasts

A ready goal (a rung within reach, the first Jumpback, a prestige tier) MUST be shown as a banner visible on every page, with a button to the exact sub-page that holds the action. Achievements and seasonal events MUST NOT raise toasts.

## Locked things and page sizes

Locked buildings, wonders, Discoveries and trials MUST NOT be rendered. A sub-menu page exactly one rung from opening is shown greyed out and explains when it opens; further pages are blank. Every full page of a paged list holds between five and ten items on a 412 by 780 phone. Population begins at twelve, and only half of the people (rounded down) can hold a role.

## Events

Events are rolled once a year at summer start and never at an untended Solitary Hearth. About 3% of years bring a tale and 0.8% an urgent event. Tales wait (at most four) on the Events page, which appears when the first one arrives and stays; urgent events open a modal and stop the timeline until chosen. Away progress never brings an urgent event. Every choice states its gains and costs beforehand; costs are paid from held resources and never push one below zero. Deciding an event has a chance to turn up a relic.
