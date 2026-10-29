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

Actionable navigation signals: Navigation chrome may surface a small, quiet indicator only when the destination contains an immediately actionable decision. Never use noisy unread indicators for historical/log-only views; distinguish attention-required work from optional reading.

Explain persistent progression currencies: Any prestige/legacy currency must be explained in the first place it appears, including what it changes now, what it changes next run, and how it is earned. Names alone are not affordances.

## Prestige as climax, not stagnation

When a run reaches a developmental ceiling designed to prompt prestige, the game must never quietly stall, fizzle out, or present mathematically impossible goals as if they were standard tasks. It must celebrate the timeline's culmination as an earned milestone, alerting the player prominently, with a banner that every page shows rather than a toast, that the temporal horizon has been reached and that a Jumpback is the triumphant next step.

## Safe absence and risk-free choices

The player must be able to leave at any moment and return to a timeline that is the same or better. Decisions the game offers (events, edicts, trades) are emphasis choices between gifts, never gambles, and a decision left unanswered must resolve in the player's favour on its own. Spare resources are never silently wasted: a full store says it is full, and the marketplace offers a way to use the overflow.

## Ask for the why

Every multiplier the player earns must be nameable in the interface. A player who wonders why a rate is what it is must be able to open one place that lists each source and its size.

## Cosmetic rewards

Cosmetic unlocks (themes) are rewarded for achievements, never sold, never required, and never change the rules.

The hosted service is not implemented. The local client and engine are implemented; see the README for current status. These statements specify the intended experience.

## A quiet screen

Toasts are for the result of something the player just did (an export, an import, a completed prestige, a welcome back). Achievements, seasonal events and other passing news MUST NOT interrupt the player: they live in the Chronicle. Anything the player must act on is a banner, shown on every page, that names the page to go to and stops pointing once the player is there.

## The first prestige is earned

The first Jumpback MUST wait until the timeline has a real settlement behind it (the Dawn Village at Year 40 or later), so it arrives as a milestone and not a reflex. Until then the Jumpback, Insight and everything they lead to stay hidden.
