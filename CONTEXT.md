# Glossary

## Country

A sovereign-state-level deployment variant of the app. Each country gets its own Android product flavor and its own JS entry point. Examples: `cn`, `mx`. One country maps to exactly one variant — no multi-variant-per-country scenarios.

## Base

The shared code layer that contains logic, components, and native modules common to all countries. Exists in both the Android layer (`main` source set) and the JS layer (`src/base/` directory). Country-specific code imports and extends from Base.

## Flavor

An Android product flavor under the `country` dimension that produces a distinct APK for a given Country. Each flavor can override resources, manifest entries, and native code from the Android main source set.

## Country Entry Point

A JS file (e.g., `index.cn.js`) that bootstraps the React Native app for a specific Country. It registers the country-specific root component, which composes from Base and injects country-specific configuration.

## CountryConfig

A configuration object passed to Base's composable components by each Country. Contains country-specific values such as API BaseUrl, app name, and feature flags. This is the primary mechanism for Country-to-Base customization.

## Import Boundary

An ESLint-enforced rule that prevents cross-country imports and reverse-dependency (Base→Country). Country code may import from Base; Base may not import from any Country; Countries may not import from each other.

## i18n

The internationalization framework (i18next + react-i18next) that provides translated strings for the app. Base provides shared translations and the initialization function. Each Country provides its own translations under `src/<country>/locales/`, which override Base translations for the same key.
