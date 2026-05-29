# ADR 0001: Unrelated Application IDs per Country

## Status

Accepted

## Context

Each Country flavor produces a separate APK. We need to decide how to name the `applicationId` for each flavor.

Options:

1. **Shared base + suffix** (e.g., `com.example.app` → `com.example.app.cn`, `com.example.app.mx`) — uses `applicationIdSuffix` in Gradle, simple to configure.
2. **Completely unrelated IDs** (e.g., `com.someco.zhongguo`, `com.otherco.mexicoapp`) — each flavor declares its own `applicationId` with no shared prefix.

## Decision

Use completely unrelated application IDs per Country.

## Consequences

- **No `applicationIdSuffix`** — each flavor must declare `applicationId` explicitly in `build.gradle`.
- **No discoverable association** — the package names alone do not reveal that the apps share a codebase. This is intentional.
- **More manual work when adding a Country** — the automation script must prompt for or generate a unique, unrelated applicationId.
- **App store presence is decoupled** — each Country's app can have a completely independent brand identity.
