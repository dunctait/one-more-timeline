# Product pillars

These pillars are normative. Future implementation and content MUST preserve them.

## Legible consequence

Choices MUST have consequences a player can understand. The game MAY preserve uncertainty, but it MUST NOT hide the rules that determine whether a choice matters.

## Calm continuity

The experience SHOULD support short sessions and safe absence. Progress MUST NOT depend on manipulative interruption, forced attention, or a requirement to remain online.

## Number only goes up

No resource, stability meter, or population count MAY decrease as a result of passage of time or player absence. Per-tick rates MUST be zero or positive. Resources MAY be spent only by explicit, validated player actions with costs shown beforehand. Scarcity MUST be expressed as slower growth, caps, or unaffordable costs, never as loss. A player MUST be able to step away at any moment without worrying that things get worse.

## Prestige sends back functions, not only numbers

Every prestige tier MUST permanently unlock at least one new function (automation, a starting structure, or new information) in addition to any percentage bonus. A tier whose only reward is a multiplier is incomplete. Each function MUST be explained where it is granted, listed where it is active, and, if it acts on the player's behalf, MUST be switchable off. Automation MUST remain simple: it replaces repetitive taps, not decisions about what the settlement should become.

## Meaningful agency

Players MUST be able to make decisions that change their situation. A choice that cannot alter an outcome SHOULD be presented as flavour, not as agency.

## Deterministic possibility

The same versioned inputs and rules MUST produce the same engine result. Randomness MUST be explicit, seeded, and serialisable.

## Durable trust

The player MUST be able to inspect, save, export, and replay their state without relying on private service behaviour. The public contracts are more authoritative than any particular interface.

## Progressive disclosure of complexity

A mechanic MUST NOT appear in the interface until the player first comes across it. Later prestige tiers, the functions they send back, challenges, the Marketplace, Edicts, Discoveries and the currencies that go with them stay out of sight until the player has done what leads to them, and once met they stay available. A hidden mechanic MUST NOT be named in goals, banners, badges, header pills or "next up" previews. The first moment a mechanic appears MUST be an explained, actionable one, never a wall of options.

## Everything fits on one screen

Navigation is two-tier: a bottom bar picks a main section, and a smaller sub-menu directly above it picks one page of it. Every section has the same number of pages (five), so the sub-menu always lines up with the main bar; a page one rung away from opening is shown greyed out with a lock and, when tapped, says which rung opens it; any page further away is a blank cell that reveals nothing. The sub-menu MUST look clearly different from the bottom bar (its own cool colour, smaller pills with padding around each icon), while its tap targets stay at least 44 pixels tall. Every page MUST fit the visible screen of a typical phone without scrolling, clipping, or side-scrolling. A list too long for the room MUST be split into pages that fit what is measured, never made to scroll. When something needs the player's attention it MUST be a banner that every page shows, not a toast, and the sub-menu MUST mark which page holds the waiting work.

## Show only what is unlocked

Interface lists MUST NOT draw things the player cannot use yet. A locked building, wonder, Discovery or trial is not rendered at all (no greyed card, no "unlocks at" row); it appears the moment it opens. The one exception is a whole sub-menu page that is exactly one rung from opening, which is shown greyed out as a promise. Fewer things on screen is the point: each new thing that appears is an event, not part of a wall.

## The first of anything is an event

The first purchase, rung, building or unlock of anything MUST feel difficult to achieve, eventful, and highly rewarding: a short slog that the player earns by their own hands, then a clear moment of relief. Costs and requirements MUST make the first of each thing take real effort (the opening minutes are spent tapping, not waiting), and the player's own action that completes a first MUST be acknowledged with a toast and a Chronicle entry. Buying many things quickly until each is unimportant is a failure of pacing; the economy is tuned so every building has a purpose.

## Pages hold a handful

A paged list MUST aim for between five and ten items on every full page. Cards are condensed so that this holds on a 412 by 780 phone (and four or more on 360 by 700), never two or three. A list of fewer than ten items SHOULD fit in at most two pages. A page that is a single rich card, such as a whole prestige tier, is the exception. `tests/mobile-fit.test.ts` measures the items on each page.

## Condensed information

Say it the way a board game does: icons and numbers instead of sentences. A building card is its name, one line of flavour, a few icon-and-number chips for what it adds, and a button that carries the price as icons and numbers (for example a pip row of cost chips with what is still short marked). Resources, storage, population, stability and "everything" each have one icon, used identically everywhere (`src/ui/icons.ts`). Plain sentences are kept for things the player must read once (what a currency does, what a function sends back) and each chip carries its full wording in its tooltip and accessible name.

## Every Jumpback creates a reward

A Jumpback gives more than Insight: it MUST send back something the player can feel in the next timeline. The first three Jumpbacks send back scripted rewards (hold to gather; helping hands that assign newcomers; remembered Edicts). From the fourth on, each Jumpback offers a choice of three lasting boons (Lore Keepers, Grand Foundations, Packed Provisions, Founders, Cartographers) and the player takes one. An offer waits until it is taken, is announced by the banner, and is never lost. Boons are quality-of-life and starting-position functions, never only a percentage.
