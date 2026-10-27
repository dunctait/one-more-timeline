# Player experience

The intended player experience is a sequence of understandable decisions separated by ordinary life. A player can enter as a guest, learn the current situation, choose a direction, and leave without losing control of their progress.

The interface SHOULD make current state, available actions, costs, risks, and recent changes visible. It SHOULD explain why an action is unavailable and SHOULD offer a safe way back from destructive or irreversible actions.

Guest play is a first-class path. A guest MAY begin and play without creating an account, subject to the limits needed for abuse prevention and device-local storage. Account creation MUST NOT be presented as the price of learning whether the game is worth playing.

Authentication is capability-triggered. Google and Apple sign-in MAY be offered when a player asks to sync, recover, share, or use another capability that requires an account. The product MUST explain what capability is being unlocked, MUST preserve the guest state during the transition, and MUST NOT imply that either provider is required for ordinary guest play.

The service and engine are not implemented by this foundation. These statements specify the intended experience, not current availability.
