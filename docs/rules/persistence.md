# Persistence

Persistence stores a player's serialisable game state without changing the rules that produced it.

A save MUST include a schema version, ruleset version, player state, and sufficient metadata to validate the payload. Unknown fields MUST be ignored only when the contract explicitly marks them as forward-compatible; unknown required versions MUST fail clearly rather than being guessed.

Local guest saves SHOULD be exportable. Account-backed saves MAY be synchronised when the player requests the capability. Sync conflicts MUST be visible and MUST NOT silently discard the more recent or more complete state.

Deletion and export are player-controlled operations. A service MAY retain security and abuse-prevention records where law or safety requires it, but those records are not game state and MUST NOT be represented as such.

Players MUST be able to export their timeline as a single text string and import it again; an import MUST be validated and MUST NOT change the current timeline if validation fails. Loaded and imported saves MUST be sanitised: wrongly typed fields are dropped to safe defaults and derived values such as storage caps are recomputed, so a hand-edited string cannot crash the game. Older saves MUST be normalised on load so that fields added later receive safe defaults.

The local save MUST be written after every player action, every few ticks while playing, and whenever the page is hidden or closed; a blocked or full store MUST degrade to a visible notice and MUST NOT break play.

Client local persistence is implemented in `src/ui/storage.ts`. Hosted sync persistence is specified, not implemented.
