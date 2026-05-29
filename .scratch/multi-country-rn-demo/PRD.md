# PRD: Multi-Country React Native Demo

## Problem Statement

We need a single React Native repository that produces separate Android apps for different countries. Each country app must appear completely independent (unrelated package name, distinct branding), while sharing a common codebase for business logic and UI components. Currently there is no project structure that supports this multi-country deployment model.

## Solution

Build a React Native 0.81.6 demo app (Android only, New Architecture) that uses Android product flavors to produce per-country APKs and separate JS entry points to isolate per-country bundles. A shared Base layer in both Android and JS provides common functionality, while each Country layer injects its specific configuration via composition. An automation script scaffolds new countries, and ESLint rules with git hooks enforce import boundaries to prevent cross-country coupling.

## User Stories

1. As a developer, I want to initialize a React Native 0.81.6 project with New Architecture enabled, so that I have a modern foundation for the multi-country app.
2. As a developer, I want to define Android product flavors under a `country` dimension (cn, mx), so that each country produces a distinct APK.
3. As a developer, I want each Country flavor to have a completely unrelated applicationId, so that the apps cannot be associated by package name.
4. As a developer, I want a single MainApplication in the Android main source set, so that I don't duplicate boilerplate per country.
5. As a developer, I want Gradle to map the active flavor to the correct JS entry file at build time (per ADR-0002), so that each APK bundles only its country's JS.
6. As a developer, I want a JS Base module with a composable BaseApp component and CountryConfig type, so that countries can inject their specific configuration without modifying shared code.
7. As a developer, I want a CountryConfig type that includes apiBaseUrl, appName, appIcon, and defaultLocale fields, so that each country can declare its runtime configuration including locale preference.
8. As a developer, I want each Country to have its own JS entry point (e.g., `index.cn.js`), so that Metro produces separate bundles per country.
9. As a developer, I want each Country's App component to compose from Base's BaseApp by passing a CountryConfig, so that customization follows the composition pattern.
10. As a developer, I want each Country to have its own directory under `src/` (e.g., `src/cn/`, `src/mx/`), so that country-specific code is cleanly separated.
11. As a developer, I want each Country's Android source set to contain its own app icon and string resources, so that each APK has distinct branding.
12. As a developer, I want each Country's Android source set to contain a `strings.xml` with the country-specific app name, so that the installed app shows the correct name without needing a per-flavor AndroidManifest override.
13. As a developer, I want Metro to serve multiple entry points from a single dev server, so that I can run different country apps simultaneously against one Metro instance.
14. As a developer, I want ESLint rules that prevent cross-country imports, so that `src/cn/` cannot import from `src/mx/` and vice versa.
15. As a developer, I want ESLint rules that prevent Base from importing from any Country, so that the shared layer has no reverse dependencies.
16. As a developer, I want ESLint rules that allow Country code to import from Base, so that countries can reuse shared functionality.
17. As a developer, I want a git pre-commit hook (via Husky + lint-staged) that runs prettier and ESLint import boundary check on staged files only, so that violations are caught before they enter the repository without enforcing `eslint --fix`.
18. As a developer, I want a Node-based scaffolding script (`scripts/add-country.js`) that generates a new Country's full skeleton from command-line arguments (country code, applicationId, activity class name, optional app name, API BaseUrl, default locale), so that adding a country is a one-command operation without needing Python or shell environments.
19. As a developer, I want the scaffolding script to require an unrelated applicationId as a command-line argument, so that the anti-association requirement (ADR-0001) is enforced by default.
20. As a developer, I want the scaffolding script to require an activity class name as a command-line argument, so that each country's Android launcher Activity has a unique, country-specific class name.
21. As a developer, I want the scaffolding script to update the single `ext.countryFlavors` data source in `build.gradle`, so that both productFlavors and release bundle entryFile selection work for the new country automatically.
22. As a developer, I want the scaffolding script to generate an Android Activity class and AndroidManifest.xml for the new country, so that the country has a complete, launchable Android source set.
23. As a developer, I want the scaffolding script to copy placeholder launcher icons from the main source set to the new country's mipmap directories, so that the new country can build immediately without missing resources.
24. As a developer, I want the scaffolding script to update the ESLint plugin's `countryDirs` list, so that import boundary rules automatically cover the new country.
25. As a developer, I want a single tsconfig.json with a `@base/*` path alias pointing to `src/base/`, so that all countries share one TypeScript configuration.
26. As a developer, I want to use Yarn (with node-modules linker) as the package manager, so that dependency management is consistent across the team and Gradle can resolve node_modules correctly.
27. As a developer, I want to run a specific country's app via `npx react-native run-android --variant cnDebug`, so that the development workflow is straightforward.
28. As a developer, I want the initial demo to include cn and mx countries, so that the multi-country architecture is validated with two sufficiently different variants.
29. As a developer, I want each Country's home screen to display its app name, API BaseUrl, default locale, and localized welcome text from CountryConfig and i18n, so that I can visually verify the configuration and i18n wiring is correct.
30. As a developer, I want each Country to have its own i18n translation files under its directory (e.g., `src/cn/locales/zh.ts`), so that country-specific text is co-located with country code.
31. As a developer, I want the Base module to provide an `initI18n()` function that each Country calls with its own translations and locale, so that the translation framework is shared but content is country-specific.
32. As a developer, I want each Country's i18n to fall back to Base's shared translations when a key is not found in the country-specific file, so that common strings don't need to be duplicated per country.
33. As a developer, I want the BaseApp component to accept optional `children` props, so that countries can extend the base UI with country-specific content.

## Implementation Decisions

### Modules

1. **Android Gradle Configuration** — Defines `flavorDimensions = ["country"]`, declares `cn` and `mx` flavors with explicit unrelated applicationIds. A single `ext.countryFlavors` map serves as the data source for both `productFlavors` (setting `applicationId` and `BuildConfig.JS_ENTRY`) and the `afterEvaluate` block (setting `entryFile` for release bundle tasks). Each flavor entry also includes `activityName` for the country-specific launcher Activity. `MainApplication.kt` reads `BuildConfig.JS_ENTRY` at runtime via `getJSMainModuleName()`, and the `afterEvaluate` block overrides the `entryFile` property on `createBundle*JsAndAssets` tasks based on the active flavor name extracted from the task name.

2. **JS Base Module** (`src/base/`) — Contains:

   - `CountryConfig` type definition (TypeScript interface with fields: `apiBaseUrl`, `appName`, `appIcon`, `defaultLocale`)
   - Composable `BaseApp` component that accepts a `CountryConfig` prop and optional `children`, uses `useTranslation()` from react-i18next, and renders the app's root UI (app name, localized welcome text, API BaseUrl, locale)
   - `initI18n()` function in `src/base/locales/i18n.ts` that accepts country translations and locale, merges Base translations as fallback, and initializes i18next
   - Barrel export in `src/base/index.ts` re-exporting `BaseApp`, `CountryConfig` type, `initI18n`, and `i18n` instance
   - Shared components, services, and utilities that all countries import

3. **JS Country Module** (per Country, e.g., `src/cn/`) — Contains:

   - `App.tsx` that imports `BaseApp` from Base and passes a country-specific `CountryConfig`
   - Country-specific translations (e.g., `src/cn/locales/zh.ts`) passed to `initI18n()`
   - Entry file at root: `index.cn.js` that registers the country's `App` component with AppRegistry

4. **Android Country Source Sets** (per Country, e.g., `android/app/src/cn/`) — Contains:

   - Country-specific Activity class (e.g., `ZhongguoActivity.kt`) extending `BaseActivity`, declared as the launcher activity in AndroidManifest.xml
   - `AndroidManifest.xml` declaring the launcher activity with MAIN/LAUNCHER intent filter
   - `res/mipmap-*` with country-specific app icons (all 5 densities)
   - `res/values/strings.xml` with country-specific `app_name` string

5. **ESLint Import Boundary Plugin** (`eslint-plugin-import-boundary/`) — A custom ESLint rule implemented as a local plugin that enforces:

   - Country→Country imports: **blocked**
   - Base→Country imports: **blocked**
   - Country→Base imports: **allowed** (via `@base` alias or relative paths)
   - Base→Base imports: **allowed**
     The rule matches import paths against `src/cn/`, `src/mx/`, `src/base/` directory structure. The `countryDirs` list is automatically updated by the scaffolding script when adding a new country.

6. **Git Hook** — Husky pre-commit hook runs `npx lint-staged`, which executes prettier (with `--write`) and eslint (without `--fix`) only on staged `src/**/*.{ts,tsx,js,jsx}` files, and prettier on `*.{json,md,yml,yaml}` files.

7. **Country Scaffolding Script** (`scripts/add-country.js`) — A Node.js script accepting command-line arguments: `<country-code> <application-id> <activity-class-name> [app-name] [api-base-url] [default-locale]`. It generates: JS entry file (`index.<code>.js`), JS country directory with `App.tsx` and placeholder locale, Android source set with Activity class, AndroidManifest.xml, `strings.xml` and placeholder mipmap icons, updates `ext.countryFlavors` in `build.gradle`, and updates the ESLint plugin's `countryDirs` list. Validates that the country code is 2 lowercase letters and that no existing country/flavor/entry conflicts.

8. **Country Removal Script** (`scripts/remove-country.js`) — A Node.js script accepting a single argument: `<country-code>`. It removes: JS entry file (`index.<code>.js`), JS country directory (`src/<code>/`), Android source set (`android/app/src/<code>/`), the flavor entry from `ext.countryFlavors` in `build.gradle`, and the country from the ESLint plugin's `countryDirs` list. Validates that the country code is 2 lowercase letters, that the country exists, and prevents removing the last remaining country.

9. **Metro Configuration** (`metro.config.js`) — Adds `src/` to `watchFolders` and registers `@base` as an `extraNodeModules` alias pointing to `src/base/`. No multi-bundle config needed for development; each app requests its own entry file (e.g., `index.cn.bundle`). Production builds use the Gradle `afterEvaluate`-specified entry file.

10. **Babel Configuration** (`babel.config.js`) — Uses `babel-plugin-module-resolver` with `@base` alias pointing to `./src/base`, ensuring the alias works at build time as well as in TypeScript.

11. **i18n Module** — Uses i18next + react-i18next. Base provides the `initI18n()` function and shared English translations in `src/base/locales/en.ts`. Each Country provides its own translations under `src/<country>/locales/`. Country translations override Base translations for the same key via a merge in `initI18n()`. Each Country's `App.tsx` calls `initI18n()` with its translations map and locale before rendering.

### Key interfaces

- **CountryConfig**: TypeScript interface in `src/base/types/CountryConfig.ts`

  ```typescript
  interface CountryConfig {
    apiBaseUrl: string;
    appName: string;
    appIcon: string;
    defaultLocale: string;
  }
  ```

- **BaseApp**: React component in `src/base/components/BaseApp.tsx`
  Props: `{ config: CountryConfig; children?: React.ReactNode }`
  Renders the app's root UI (app name, localized welcome text, API BaseUrl, locale) using the provided configuration and `useTranslation()` for localized text. Accepts optional `children` for country-specific UI extensions.

- **initI18n**: Function in `src/base/locales/i18n.ts`
  Signature: `initI18n(countryTranslations: Record<string, Record<string, string>>, locale: string)`
  Merges Base translations as fallback, initializes i18next with react-i18next. Returns the i18n instance.

- **ext.countryFlavors**: Gradle ext property in `app/build.gradle`
  A map of flavor name → `{applicationId, jsEntry, entryFile, activityName}` serving as single data source for both `productFlavors` (BuildConfig fields) and `afterEvaluate` (release bundle entryFile).

### Architectural decisions

- The project must be initialized using the official React Native CLI command (`npx @react-native/community/cli init`), not manually scaffolded. All multi-country customizations are applied on top of the official template.
- Per ADR-0001: applicationIds are completely unrelated across countries. No `applicationIdSuffix`.
- Per ADR-0002: JS entry selection is done at build time via Gradle. `BuildConfig.JS_ENTRY` provides the runtime module name, and `afterEvaluate` overrides the `entryFile` property on release bundle tasks. Both read from the same `ext.countryFlavors` data source.
- Country overrides Base behavior through Composition (passing CountryConfig + calling initI18n), not Inheritance or Module Replacement.
- The shared component is named `BaseApp` (not `AppShell`), reflecting its role as the base app shell that countries compose into.
- Each country has its own Android Activity class (e.g., `ZhongguoActivity`, `MexicoMainActivity`) declared in its source set's AndroidManifest.xml, extending the shared `BaseActivity`.
- Single Metro dev server serves all entry points; each app requests its own entry file.
- Single tsconfig.json with `@base/*` path alias; import boundaries enforced by ESLint, not TypeScript project references.
- Yarn with `nodeLinker: node-modules` ensures Gradle can resolve `node_modules` correctly.
- Scaffolding script is pure Node.js (no Python/shell dependency) for environment consistency.

## Testing Decisions

### What makes a good test

Tests should verify external behavior and configuration correctness, not implementation details. A test is good when it would still pass after an internal refactor that doesn't change the public interface.

### Modules to test

1. **JS Base Module** — Test that `BaseApp` renders correctly with a given `CountryConfig`. Test that `CountryConfig` type enforces required fields (via TypeScript compilation). Test that missing or malformed config is surfaced clearly.

2. **JS Country Module** (per Country) — Test that each country's `App` component passes a valid `CountryConfig` to `BaseApp`. Test that the rendered output includes the country-specific app name, API BaseUrl, and locale.

3. **ESLint Import Boundary** — Test the four import scenarios:

   - Country→Country import → error reported
   - Base→Country import → error reported
   - Country→Base import → no error
   - Base→Base import → no error
     These tests run against the custom ESLint rule directly using ESLint RuleTester.

4. **Scaffolding Script** — Test that running the add script with a country code generates all expected files (JS entry, JS App, Android source set with Activity and AndroidManifest, mipmap directories) and that the Gradle config is updated correctly. Test that it rejects a country code that already exists. Test that it requires valid 2-letter lowercase country code. Tests use `br` as the test country and clean up after themselves.

5. **Removal Script** — Test that running the remove script deletes all expected files (JS entry, JS country directory, Android source set), removes the Gradle flavor entry, and removes the country from ESLint countryDirs. Test that it rejects a non-existent country code. Test that it prevents removing the last remaining country. Tests use `br` as the test country (added then removed) and clean up after themselves.

6. **Real-device Verification** — Build cnDebug and mxDebug APKs, install on a physical Android device, and verify that each app displays its correct CountryConfig values (app name, API BaseUrl, locale) and localized welcome text.

### Prior art

No existing tests in this greenfield project. The ESLint rule tests use ESLint RuleTester. The scaffolding and removal tests use a custom test runner with filesystem assertions. The JS module tests use Jest + ReactTestRenderer, which is the default for React Native projects.

## Out of Scope

- iOS support (Android only for this demo)
- CI/CD pipeline configuration
- Production signing key management
- Code push / OTA update configuration
- Third-party SDK integration (WeChat Pay, Line, etc.)
- Navigation library setup
- State management library setup
- Performance profiling or optimization
- App store deployment workflow
- E2E testing framework setup
- Dark mode / theming system beyond basic CountryConfig

## Further Notes

- The project uses React Native 0.81.6 with New Architecture (Fabric + TurboModules) enabled by default.
- The demo's home screen displays CountryConfig values (app name, API BaseUrl, locale) and localized welcome text via i18n to visually confirm the multi-country and i18n wiring works.
- The scaffolding script is the primary mechanism for adding new countries after the initial cn + mx setup. It should be the first thing a developer reaches for when onboarding a new country. The removal script provides a symmetric operation for removing countries that are no longer needed.
- This is a demo/proof-of-concept. The architecture is designed to be extensible, but the implementation should stay minimal — only enough to prove the multi-country model works end-to-end.
- Real-device verification confirmed both cn (中国 App, API: https://api.cn.example.com, Locale: zh-CN, 欢迎来到中国) and mx (MexicoApp, API: https://api.mx.example.com, Locale: es-MX, Bienvenido a Mexico) work correctly.
