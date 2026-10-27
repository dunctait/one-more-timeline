# Proposal lifecycle

A change follows this lifecycle:

1. **Propose** — state the player problem, intended outcome, affected contracts, and implementation status.
2. **Classify** — assign a risk tier and identify protected boundaries.
3. **Review** — maintainers check rules, agency, accessibility, determinism, persistence, and public/private separation.
4. **Validate** — run the checks relevant to the changed material; executable changes MUST include tests that exercise the contract.
5. **Accept** — merge only when required review and checks pass.
6. **Release** — treat the resulting `main` revision as the release boundary; publish only from an identified revision.
7. **Observe** — monitor user-facing consequences and record follow-up changes as new proposals.

A proposal MAY be rejected, revised, or paused at any stage. A merged document is not evidence that an implementation exists.
