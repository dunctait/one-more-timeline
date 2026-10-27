# Replays contract

A replay is an ordered, versioned record of the inputs needed to reproduce an engine session.

A replay MUST include the initial state or a reference to a complete initial state, the ruleset version, deterministic seed or context, and each accepted action in order. Rejected actions MAY be retained for diagnostics but MUST be distinguishable from inputs that changed state.

A replay reader MUST report divergence with the first mismatching step, expected result, and observed result. It MUST NOT silently continue after divergence and call the output valid.

Replays SHOULD be portable without a live service. They MUST NOT contain credentials, private operational metadata, or arbitrary executable payloads.

Replay support is specified, not implemented.
