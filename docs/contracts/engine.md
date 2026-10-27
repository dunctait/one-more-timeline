# Engine contract

The engine is the deterministic authority for game state transitions. The Layer 0 deterministic engine core is implemented and tested in `src/engine/`. Multi-layer and hosted services remain specified and are not implemented yet.

An engine operation MUST accept a versioned state, a versioned ruleset, a declared action, and deterministic context such as a seed or elapsed interval. It MUST return either a validated new state and outcome or a structured failure that leaves the prior state unchanged.

The engine MUST be serialisable at its contract boundary. It MUST NOT read the DOM, depend on rendering order, call arbitrary network services, or use hidden wall-clock state. A view MAY render engine results and collect input, but it MUST NOT decide outcomes.

The same valid input bundle MUST produce the same result. Implementations MAY optimise internally, but optimisations MUST be observationally equivalent and covered by conformance tests.
