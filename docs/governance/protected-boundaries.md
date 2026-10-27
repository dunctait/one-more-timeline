# Protected boundaries

The following boundaries are protected:

- **Public/private boundary:** private operations, credentials, user records, moderation data, and deployment secrets MUST NOT enter this repository.
- **Release boundary:** `main` is the source revision eligible for public release. Local branches and unreviewed commits are not releases.
- **Engine/view boundary:** presentation code MUST NOT alter deterministic outcomes; the engine MUST NOT depend on a particular renderer.
- **Contract boundary:** save, replay, feature-package, and API representations MUST be versioned and validated.
- **Executable-content boundary:** feature packages are declarative and data-only; they MUST NOT contain arbitrary code, scripts, or hidden network actions.
- **Agency boundary:** authentication, purchases, irreversible actions, and data deletion MUST remain explicit and player-controlled.

A change crossing a protected boundary is Tier 4. It requires a written proposal, owner review, validation, and a clear implementation-status statement.
