# One More Timeline

One More Timeline is an experiment in compact, replayable incremental play. It asks whether a small set of deterministic rules, meaningful choices, and visible long-term consequences can sustain curiosity without demanding constant attention.

This repository is the public foundation. It contains the normative product contracts and the scaffold for future implementation. The playable service, engine, frontend, authentication, and persistence systems are not implemented here yet.

## Experiment thesis

A player should be able to make a consequential choice, leave, return, and understand what changed. Progress must feel earned rather than merely accumulated. The system should reward attention without requiring compulsion, and should make time, reversibility, and uncertainty legible.

## Repository boundary

The public repository contains rules, contracts, governance, and eventually distributable implementation. Private operations, credentials, deployment configuration, user data, moderation records, and non-public experiments do not belong here. The public repository is the release boundary: a change on `main` is treated as eligible for public release only after the repository's checks and review requirements pass.

## Current status

- Normative documentation: established.
- Offline: installable PWA (manifest with PNG and maskable icons, network-first service worker with a 4 second timeout in `public/sw.js`); implemented and asset-checked, not yet tested on hosted Pages.
- Frontend: playable web client implemented and served via GitHub Pages.
- Engine: deterministic core engine implemented and tested, including seven rungs and four prestige tiers (Jumpback, Epoch Shift, Paradigm Shift, Ascension) with sent-back functions.
- Authentication and hosted services: not implemented (feature intake currently in closed incubation mode).
- Save, replay, and migration formats: client local persistence implemented; hosted format specified as contracts.

## What is playable

Status: implemented and tested unless noted.

- Seven rungs from Solitary Hearth to Sovereign Realm, with 19 buildings (five of them one-per-timeline Wonders).
- Lifetime statistics that never reset. Harmony: high Stability boosts production. Optional Challenges (restricted timelines) that award permanent trophy relics. A Marketplace from the Walled Town to turn spare stores into what you need. Relics: rare permanent finds from events that send back functions. Named villagers. Edicts (free-to-swap emphasis choices), Discoveries (Knowledge sinks), seasonal gift events (some with risk-free choices), and achievements with permanent Renown.
- Four prestige tiers: Jumpback, Epoch Shift, Paradigm Shift, Ascension. Each banks a currency and sends back functions such as auto-assign, automatic rung advance, starting buildings, a speed dial, and a steward.
- No resource ever decreases over time. Absence is safe: the timeline keeps growing for up to 8 hours (24 with Second Wind) and the game welcomes you back.
- Save string export and import, achievement-unlocked colour themes, larger-text, reduced-motion and optional sound switches, hold-to-gather, keyboard shortcuts (1, 2, 3), and offline play.

## Development

Run `npm run dev` to play locally, `npm test` for the engine and view-model tests, and `npm run check` for the type check. The Pages workflow runs the type check and the tests before building, so a failing check blocks release. There are no runtime dependencies. Future implementation must preserve the contracts in `docs/` and must not silently turn documentation into a promise that an unimplemented service already exists.

See [AGENTS.md](AGENTS.md) for contribution boundaries and the documentation index for the normative contracts.
