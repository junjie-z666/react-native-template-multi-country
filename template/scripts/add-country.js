#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

// Parse --package flag
let packageName = "com.helloworld";
const packageIdx = args.indexOf("--package");
if (packageIdx !== -1) {
  packageName = args[packageIdx + 1];
  args.splice(packageIdx, 2);
}

if (args.length < 3) {
  console.error(
    "Usage: add-country.js <country-code> <application-id> <activity-class-name> [app-name] [api-base-url] [default-locale] [--package com.xxx.xxx]"
  );
  process.exit(1);
}

const countryCode = args[0];
const applicationId = args[1];
const activityClassName = args[2];
const appName = args[3] || `${countryCode.toUpperCase()} App`;
const apiBaseUrl = args[4] || `https://api.${countryCode}.example.com`;
const defaultLocale = args[5] || `en-${countryCode.toUpperCase()}`;

const projectRoot = process.cwd();
const componentName = `${countryCode}App`;

// Check if country already exists
const srcDir = path.join(projectRoot, "src", countryCode);
if (fs.existsSync(srcDir)) {
  console.error(
    `Error: Country '${countryCode}' already exists at src/${countryCode}/`
  );
  process.exit(1);
}

const entryFile = path.join(projectRoot, `index.${countryCode}.js`);
if (fs.existsSync(entryFile)) {
  console.error(`Error: Entry file 'index.${countryCode}.js' already exists`);
  process.exit(1);
}

const gradlePath = path.join(projectRoot, "android", "app", "build.gradle");
const gradleContent = fs.readFileSync(gradlePath, "utf8");
if (gradleContent.includes(`${countryCode}: [`)) {
  console.error(
    `Error: Flavor '${countryCode}' already exists in build.gradle`
  );
  process.exit(1);
}

// Derive package path (com.mycompany.app -> com/mycompany/app)
const packagePath = packageName.replace(/\./g, path.sep);

console.log(`Adding country: ${countryCode}`);
console.log(`  ApplicationId: ${applicationId}`);
console.log(`  Activity: ${activityClassName}`);
console.log(`  App name: ${appName}`);
console.log(`  API BaseUrl: ${apiBaseUrl}`);
console.log(`  Default locale: ${defaultLocale}`);
console.log(`  Package: ${packageName}`);

// 1. Create JS entry point
fs.writeFileSync(
  entryFile,
  `import {AppRegistry} from 'react-native';
import {App} from './src/${countryCode}/App';

AppRegistry.registerComponent('${componentName}', () => App);
`
);

// 2. Create JS country directory and App.tsx
const countryDir = path.join(projectRoot, "src", countryCode, "locales");
fs.mkdirSync(countryDir, { recursive: true });

fs.writeFileSync(
  path.join(projectRoot, "src", countryCode, "App.tsx"),
  `import React from 'react';
import {BaseApp, type CountryConfig} from '../base';
import {initI18n} from '../base/locales/i18n';

const ${countryCode}Config: CountryConfig = {
  apiBaseUrl: '${apiBaseUrl}',
  appName: '${appName}',
  appIcon: 'ic_launcher_${countryCode}',
  defaultLocale: '${defaultLocale}',
};

// TODO: Add country-specific translations
initI18n({}, ${countryCode}Config.defaultLocale);

export function App(): React.JSX.Element {
  return <BaseApp config={${countryCode}Config} />;
}
`
);

// 3. Create placeholder locale file
fs.writeFileSync(
  path.join(countryDir, "placeholder.ts"),
  `// TODO: Replace with actual translations for ${countryCode}
export const ${countryCode}Translations: Record<string, string> = {};
`
);

// 4. Create Android source set directories
const androidSrcDir = path.join(
  projectRoot,
  "android",
  "app",
  "src",
  countryCode,
  "res"
);
const densities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
for (const density of densities) {
  fs.mkdirSync(path.join(androidSrcDir, `mipmap-${density}`), {
    recursive: true,
  });
}
fs.mkdirSync(path.join(androidSrcDir, "values"), { recursive: true });

// 4b. Create Android Activity class
const activityJavaDir = path.join(
  projectRoot,
  "android",
  "app",
  "src",
  countryCode,
  "java",
  ...packageName.split(".")
);
fs.mkdirSync(activityJavaDir, { recursive: true });
fs.writeFileSync(
  path.join(activityJavaDir, `${activityClassName}.kt`),
  `package ${packageName}

import com.multi.template.BaseMainActivity

class ${activityClassName} : BaseMainActivity()
`
);

// 4c. Create MainApplication for this country
fs.writeFileSync(
  path.join(activityJavaDir, "MainApplication.kt"),
  `package ${packageName}

import com.multi.template.BaseApplication

class MainApplication : BaseApplication()
`
);

// 4d. Create Android AndroidManifest.xml with launcher Activity
fs.writeFileSync(
  path.join(
    projectRoot,
    "android",
    "app",
    "src",
    countryCode,
    "AndroidManifest.xml"
  ),
  `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:name="${packageName}.MainApplication">
        <activity
            android:name="${packageName}.${activityClassName}"
            android:label="@string/app_name"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`
);

// 5. Create Android strings.xml
fs.writeFileSync(
  path.join(androidSrcDir, "values", "strings.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${appName}</string>
</resources>
`
);

// 6. Copy placeholder launcher icons from main source set
const mainResDir = path.join(
  projectRoot,
  "android",
  "app",
  "src",
  "main",
  "res"
);
for (const density of densities) {
  const srcMipmap = path.join(mainResDir, `mipmap-${density}`);
  const dstMipmap = path.join(androidSrcDir, `mipmap-${density}`);
  if (fs.existsSync(srcMipmap)) {
    for (const file of fs.readdirSync(srcMipmap)) {
      fs.copyFileSync(path.join(srcMipmap, file), path.join(dstMipmap, file));
    }
  }
}

// 7. Update build.gradle — add entry to countryFlavors map
let updatedGradle = gradleContent;
const newFlavorEntry = `    ${countryCode}: [applicationId: "${applicationId}", jsEntry: "index.${countryCode}", entryFile: "index.${countryCode}.js", activityName: "${activityClassName}", mainComponentName: "${componentName}"],`;

// Find the countryFlavors map closing bracket and insert before it
const flavorMapRegex = /ext\.countryFlavors\s*=\s*\[/;
const match = flavorMapRegex.exec(updatedGradle);
if (match) {
  // Find the closing bracket of the map
  const startIdx = match.index;
  let bracketCount = 1;
  let i = startIdx + match[0].length;
  while (i < updatedGradle.length && bracketCount > 0) {
    if (updatedGradle[i] === "[") bracketCount++;
    if (updatedGradle[i] === "]") bracketCount--;
    i++;
  }
  // Insert new entry before the closing bracket
  updatedGradle =
    updatedGradle.slice(0, i - 1) +
    newFlavorEntry +
    "\n" +
    updatedGradle.slice(i - 1);
}

fs.writeFileSync(gradlePath, updatedGradle);

// 8. Update ESLint plugin's countryDirs JSON file
const countryDirsPath = path.join(
  projectRoot,
  "eslint-plugin-import-boundary",
  "country-dirs.json"
);
if (fs.existsSync(countryDirsPath)) {
  const countryDirs = JSON.parse(fs.readFileSync(countryDirsPath, "utf8"));
  if (!countryDirs.includes(countryCode)) {
    countryDirs.push(countryCode);
    fs.writeFileSync(
      countryDirsPath,
      JSON.stringify(countryDirs, null, 2) + "\n"
    );
  }
}

console.log("");
console.log(`Country '${countryCode}' has been added successfully!`);
console.log("");
console.log("Next steps:");
console.log(
  "  1. yarn init-country ( optional: add your country configuration)"
);
console.log("  2. yarn start");
console.log(`  3. npx react-native run-android --variant ${countryCode}Debug`);
