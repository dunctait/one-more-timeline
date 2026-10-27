# Persistence

Persistence stores a player's serialisable game state without changing the rules that produced it.

A save MUST include a schema version, ruleset version, player state, and sufficient metadata to validate the payload. Unknown fields MUST be ignored only when the contract explicitly marks them as forward-compatible; unknown required versions MUST fail clearly rather than being guessed.

Local guest saves SHOULD be exportable. Account-backed saves MAY be synchronised when the player requests the capability. Sync conflicts MUST be visible and MUST NOT silently discard the more recent or more complete state.

Deletion and export are player-controlled operations. A service MAY retain security and abuse-prevention records where law or safety requires it, but those records are not game state and MUST NOT be represented as such.

Persistence is specified, not implemented.
