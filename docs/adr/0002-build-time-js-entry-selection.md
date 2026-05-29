# ADR 0002: Build-time JS Entry Point Selection via Gradle

## Status

Accepted

## Context

Each Country needs its own JS entry point (e.g., `index.cn.js`, `index.mx.js`). The Android app must load the correct entry file for the flavor being built.

Options:

1. **Per-flavor MainApplication override** — each flavor's source set contains a `MainApplication.java` that overrides `getJSMainModuleName()`. Explicit and self-contained, but duplicates boilerplate per Country.
2. **Build-time Gradle configuration** — use `project.ext.react` in Gradle to set the JS entry based on the active flavor. The `MainApplication` reads this value at runtime. Single point of configuration, no per-flavor Java files needed.

## Decision

Use build-time Gradle configuration to select the JS entry point.

## Consequences

- **Single MainApplication** — only one `MainApplication.java` in `main`, no per-flavor overrides needed.
- **Gradle logic required** — the `build.gradle` must contain logic to map flavor name to entry file name (e.g., `cn` → `index.cn`).
- **Adding a Country** requires updating the Gradle mapping, not creating a new Java file.
- **Metro dev server** runs once and serves all entry points; the running app requests its specific entry file.
