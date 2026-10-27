# Player experience

The intended player experience is a sequence of understandable decisions separated by ordinary life. A player can enter as a guest, learn the current situation, choose a direction, and leave without losing control of their progress.

The interface SHOULD make current state, available actions, costs, risks, and recent changes visible. It SHOULD explain why an action is unavailable and SHOULD offer a safe way back from destructive or irreversible actions.

Guest play is a first-class path. A guest MAY begin and play without creating an account, subject to the limits needed for abuse prevention and device-local storage. Account creation MUST NOT be presented as the price of learning whether the game is worth playing.

Authentication is capability-triggered. Google and Apple sign-in MAY be offered when a player asks to sync, recover, share, or use another capability that requires an account. The product MUST explain what capability is being unlocked, MUST preserve the guest state during the transition, and MUST NOT imply that either provider is required for ordinary guest play.

## Responsiveness over artificial lockouts

In incremental games, manual gathering actions must remain immediately responsive to user input. Never lock or throttle clicks via interaction delays or tick cooldowns to solve pacing; pace through mathematical yield, caps, and opportunity costs, not interaction hostility.

## Continuous progression reachability

Early rungs and building unlocks must be reachable within a normal first-session attention span without requiring divine knowledge or secret developer cheats. The path from gathering to the first settlement must be visibly progressive and unblocked.

## Affordance visibility

Unlocked actions, roles, and buildings must be explicitly discoverable and actionable from the primary surfaces where the player makes decisions. Never hide progression behind unannounced tabs or off-screen states without clear signposts.

## Prestige as climax, not stagnation

When a run reaches a developmental ceiling designed to prompt prestige, the game must never quietly stall, fizzle out, or present mathematically impossible goals as if they were standard tasks. It must celebrate the timeline's culmination as an earned milestone, alerting the player prominently (e.g. via toast notifications) that the temporal horizon has been reached and that a Time Jump is the triumphant next step.

The service and engine are not implemented by this foundation. These statements specify the intended experience, not current availability.
