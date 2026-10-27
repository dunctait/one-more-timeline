# Saves and migrations contract

A save is a versioned serialisable document. At minimum it MUST identify the document kind, schema version, ruleset version, state payload, and integrity metadata appropriate to the transport.

A migration MUST be a named, deterministic transformation from one supported schema version to the next. Migrations MUST preserve meaning or fail with an actionable error; they MUST NOT silently drop unknown required data. A migration chain MUST be testable from every supported source version to the current version.

The reader MUST distinguish malformed input, unsupported versions, and valid empty state. The writer MUST emit the current schema version and MUST NOT emit a version it does not understand.

This contract does not claim that save storage or migration code exists.
