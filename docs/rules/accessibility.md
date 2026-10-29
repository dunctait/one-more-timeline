# Accessibility and agency

Accessibility is a product requirement, not a later polish pass.

The interface MUST support keyboard navigation, visible focus, readable contrast, text alternatives for meaningful non-text content, and semantic structure compatible with assistive technology. Motion MUST be optional or reducible. Time limits MUST be avoidable or extendable unless a limit is essential to a stated rule.

Periodic updates (such as the per-tick refresh) MUST NOT steal or reset keyboard focus: a control whose content has not changed MUST keep its DOM node. Primary controls MUST be at least 44 CSS pixels in their smaller dimension.

Values that change every tick (resource counts, progress numbers) MUST NOT sit inside live regions; only infrequent, meaningful events (a decision awaiting, a milestone) are announced.

Status changes, errors, and asynchronous results MUST be announced in an accessible way without stealing focus. Controls MUST have names that describe their action. Colour MUST NOT be the only channel for a game state.

Agency rules apply to all players: no deceptive confirmation, no hidden cost, no forced account conversion, no irreversible action without a clear signal, and no punitive interaction pattern that depends on disability, device, or input method.

The section tabs MUST follow the ARIA tabs pattern: a single tab stop, arrow keys, Home and End to move between tabs.

Body text, muted text and dim text MUST reach a 4.5:1 contrast ratio against every card-level surface in every theme; `tests/contrast.test.ts` computes this from the stylesheet.

Sound MUST be optional, off by default, and never the only channel for any game state.

The client MUST honour the system reduced-motion preference and offer a manual reduced-motion switch and a larger-text switch in Settings. Both choices MUST persist locally and MUST NOT affect game rules.

Compliance is a target; the playable client implements the switches above and keyboard-reachable controls, but a full audit has not been completed.

## One screen, no scrolling

Every page of the interface MUST fit the visible screen of a phone of about 412 by 780 CSS pixels, and SHOULD still fit 360 by 700, with no page scroll, no inner scrollbars, no clipped content and no sideways overflow. Long lists MUST be split into pages (with previous and next buttons of at least 44 by 44 CSS pixels) sized from what is measured. The one exception is the Larger Text setting, which MAY let a page scroll so text can be bigger, and developer tools. This is enforced by `tests/mobile-fit.test.ts`, which measures every page in a real browser engine across several game states.
