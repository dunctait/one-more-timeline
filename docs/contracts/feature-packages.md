# Feature packages contract

A feature package is a declarative, versioned description of content or rules that the engine may validate and load. It is not a plugin runtime.

A package MAY contain identifiers, schemas, constants, tables, text keys, asset references, prerequisites, and declarative rule data. It MUST NOT contain executable code, scripts, dynamic imports, arbitrary expressions, hidden network calls, or instructions that bypass validation.

The loader MUST validate a package against its schema before it becomes available. Invalid packages MUST be rejected without partially applying their contents. Package dependencies MUST be explicit, acyclic, and version-constrained.

Packages MUST declare compatibility with the engine and ruleset versions they target. The engine MUST retain enough provenance to identify the package versions that contributed to a result.

This repository defines the boundary only; no package loader or feature package is implemented yet.
