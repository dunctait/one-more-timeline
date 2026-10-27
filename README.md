# One More Timeline

One More Timeline is an experiment in compact, replayable incremental play. It asks whether a small set of deterministic rules, meaningful choices, and visible long-term consequences can sustain curiosity without demanding constant attention.

This repository is the public foundation. It contains the normative product contracts and the scaffold for future implementation. The playable service, engine, frontend, authentication, and persistence systems are not implemented here yet.

## Experiment thesis

A player should be able to make a consequential choice, leave, return, and understand what changed. Progress must feel earned rather than merely accumulated. The system should reward attention without requiring compulsion, and should make time, reversibility, and uncertainty legible.

## Repository boundary

The public repository contains rules, contracts, governance, and eventually distributable implementation. Private operations, credentials, deployment configuration, user data, moderation records, and non-public experiments do not belong here. The public repository is the release boundary: a change on `main` is treated as eligible for public release only after the repository's checks and review requirements pass.

## Current status

- Normative documentation: established.
- Frontend: Layer 0 playable web client implemented and served via GitHub Pages.
- Engine: Layer 0 deterministic core engine implemented and tested.
- Authentication and hosted services: not implemented (feature intake currently in closed incubation mode).
- Save, replay, and migration formats: client local persistence implemented; hosted format specified as contracts.

## Development

The package manifest and TypeScript configuration are intentionally minimal. There are no runtime dependencies yet. Future implementation must preserve the contracts in `docs/` and must not silently turn documentation into a promise that an unimplemented service already exists.

See [AGENTS.md](AGENTS.md) for contribution boundaries and the documentation index for the normative contracts.
