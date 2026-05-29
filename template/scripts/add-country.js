#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: add-country.js <country-code> <application-id> <activity-class-name> [app-name] [api-base-url] [default-locale]');
  process.exit(1);
}

const countryCode = args[0];
const applicationId = args[1];
const activityClassName = args[2];
const appName = args[3] || `${countryCode.toUpperCase()} App`;
const apiBaseUrl = args[4] || `https://api.${countryCode}.example.com`;
const defaultLocale = args[5] || `en-${countryCode.toUpperCase()}`;

const projectRoot = path.resolve(__dirname, '..');

// Validate country code
if (!/^[a-z]{2}$/.test(countryCode)) {
  console.error('Error: Country code must be 2 lowercase letters (e.g., br, jp)');
  process.exit(1);
}

// Check if country already exists
const srcDir = path.join(projectRoot, 'src', countryCode);
if (fs.existsSync(srcDir)) {
  console.error(`Error: Country '${countryCode}' already exists at src/${countryCode}/`);
  process.exit(1);
}

const entryFile = path.join(projectRoot, `index.${countryCode}.js`);
if (fs.existsSync(entryFile)) {
  console.error(`Error: Entry file 'index.${countryCode}.js' already exists`);
  process.exit(1);
}

const gradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
const gradleContent = fs.readFileSync(gradlePath, 'utf8');
if (gradleContent.includes(`${countryCode}: [`)) {
  console.error(`Error: Flavor '${countryCode}' already exists in build.gradle`);
  process.exit(1);
}

console.log(`Adding country: ${countryCode}`);
console.log(`  ApplicationId: ${applicationId}`);
console.log(`  Activity: ${activityClassName}`);
console.log(`  App name: ${appName}`);
console.log(`  API BaseUrl: ${apiBaseUrl}`);
console.log(`  Default locale: ${defaultLocale}`);

// 1. Create JS entry point
fs.writeFileSync(entryFile, `import {AppRegistry} from 'react-native';
import {App} from './src/${countryCode}/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
`);

// 2. Create JS country directory and App.tsx
const countryDir = path.join(projectRoot, 'src', countryCode, 'locales');
fs.mkdirSync(countryDir, {recursive: true});

fs.writeFileSync(path.join(projectRoot, 'src', countryCode, 'App.tsx'), `import React from 'react';
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
`);

// 3. Create placeholder locale file
fs.writeFileSync(path.join(countryDir, 'placeholder.ts'), `// TODO: Replace with actual translations for ${countryCode}
export const ${countryCode}Translations: Record<string, string> = {};
`);

// 4. Create Android source set directories
const androidSrcDir = path.join(projectRoot, 'android', 'app', 'src', countryCode, 'res');
const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
for (const density of densities) {
  fs.mkdirSync(path.join(androidSrcDir, `mipmap-${density}`), {recursive: true});
}
fs.mkdirSync(path.join(androidSrcDir, 'values'), {recursive: true});

// 4b. Create Android Activity class
const activityJavaDir = path.join(projectRoot, 'android', 'app', 'src', countryCode, 'java', 'com', 'helloworld');
fs.mkdirSync(activityJavaDir, {recursive: true});
fs.writeFileSync(path.join(activityJavaDir, `${activityClassName}.kt`), `package com.helloworld

class ${activityClassName} : BaseActivity()
`);

// 4c. Create Android AndroidManifest.xml with launcher Activity
fs.writeFileSync(path.join(projectRoot, 'android', 'app', 'src', countryCode, 'AndroidManifest.xml'), `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application>
        <activity
            android:name=".${activityClassName}"
            android:label="@string/app_name"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`);

// 5. Create Android strings.xml
fs.writeFileSync(path.join(androidSrcDir, 'values', 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${appName}</string>
</resources>
`);

// 6. Copy placeholder launcher icons from main source set
const mainResDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
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
const newFlavorEntry = `    ${countryCode}: [applicationId: "${applicationId}", jsEntry: "index.${countryCode}", entryFile: "index.${countryCode}.js", activityName: "${activityClassName}"],`;

// Find the countryFlavors map closing bracket and insert before it
const flavorMapRegex = /ext\.countryFlavors\s*=\s*\[/;
const match = flavorMapRegex.exec(updatedGradle);
if (match) {
  // Find the closing bracket of the map
  const startIdx = match.index;
  let bracketCount = 1;
  let i = startIdx + match[0].length;
  while (i < updatedGradle.length && bracketCount > 0) {
    if (updatedGradle[i] === '[') bracketCount++;
    if (updatedGradle[i] === ']') bracketCount--;
    i++;
  }
  // Insert new entry before the closing bracket
  updatedGradle = updatedGradle.slice(0, i - 1) + newFlavorEntry + '\n' + updatedGradle.slice(i - 1);
}

fs.writeFileSync(gradlePath, updatedGradle);

// 8. Update ESLint plugin's countryDirs list
const eslintPluginPath = path.join(projectRoot, 'eslint-plugin-import-boundary', 'index.js');
if (fs.existsSync(eslintPluginPath)) {
  let eslintContent = fs.readFileSync(eslintPluginPath, 'utf8');
  eslintContent = eslintContent.replace(
    /const countryDirs = \[([^\]]+)\]/,
    (match, existing) => {
      const dirs = existing.match(/'[^']+'/g) || [];
      if (!dirs.includes(`'${countryCode}'`)) {
        return `const countryDirs = [${existing}, '${countryCode}']`;
      }
      return match;
    }
  );
  fs.writeFileSync(eslintPluginPath, eslintContent);
}

console.log('');
console.log(`Country '${countryCode}' has been added successfully!`);
console.log('');
console.log('Next steps:');
console.log(`  1. Replace placeholder launcher icons in android/app/src/${countryCode}/res/mipmap-*/`);
console.log(`  2. Add actual translations in src/${countryCode}/locales/`);
console.log('  3. Run: yarn install');
console.log(`  4. Build: cd android && ./gradlew assemble${countryCode.charAt(0).toUpperCase() + countryCode.slice(1)}Debug`);
console.log('');
console.log('To verify, run:');
console.log(`  npx react-native run-android --variant ${countryCode}Debug`);