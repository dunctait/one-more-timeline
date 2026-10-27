# Economy

The economy covers resources, prices, rewards, losses, and exchanges.

All economic quantities MUST have named units, bounded precision, and explicit versioned rules. The engine MUST use exact or otherwise deterministic arithmetic; display rounding MUST NOT alter the underlying result.

Costs MUST be visible before commitment. Rewards MUST identify their source. A resource MAY be scarce, but scarcity MUST be part of the stated game rule rather than an undisclosed service intervention.

The economy MUST NOT sell competitive advantage for real money in a way that undermines the experiment thesis. If monetisation is added later, it MUST be documented separately, tested against the anti-goals, and kept outside the deterministic core.

## Responsiveness over artificial lockouts

In incremental games, manual gathering actions must remain immediately responsive to user input. Never lock or throttle clicks via interaction delays or tick cooldowns to solve pacing; pace through mathematical yield, caps, and opportunity costs, not interaction hostility.

## Continuous progression reachability

Early rungs and building unlocks must be reachable within a normal first-session attention span without requiring divine knowledge or secret developer cheats. The path from gathering to the first settlement must be visibly progressive and unblocked.

## Affordance visibility

Unlocked actions, roles, and buildings must be explicitly discoverable and actionable from the primary surfaces where the player makes decisions. Never hide progression behind unannounced tabs or off-screen states without clear signposts.

## Mathematical reachability and prestige thresholds

Progression requirements across developmental rungs and buildings must be mathematically solvable within the player's available storage and production caps at that rung. The threshold for prestige resets must be explicitly demarcated so players understand when a timeline has achieved its maximum potential and are never left facing an artificial deadlock.

Layer 0 resource rules are implemented and tested in `src/engine/`. No hosted economy service or real-money monetisation is currently provided by this repository.
