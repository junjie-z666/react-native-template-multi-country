#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: remove-country.js <country-code>');
  process.exit(1);
}

const countryCode = args[0];
const projectRoot = path.resolve(__dirname, '..');

// Validate country code
if (!/^[a-z]{2}$/.test(countryCode)) {
  console.error('Error: Country code must be 2 lowercase letters (e.g., br, jp)');
  process.exit(1);
}

// Check if country exists
const srcDir = path.join(projectRoot, 'src', countryCode);
if (!fs.existsSync(srcDir)) {
  console.error(`Error: Country '${countryCode}' does not exist at src/${countryCode}/`);
  process.exit(1);
}

const entryFile = path.join(projectRoot, `index.${countryCode}.js`);
if (!fs.existsSync(entryFile)) {
  console.error(`Error: Entry file 'index.${countryCode}.js' does not exist`);
  process.exit(1);
}

const androidSrcDir = path.join(projectRoot, 'android', 'app', 'src', countryCode);
if (!fs.existsSync(androidSrcDir)) {
  console.error(`Error: Android source set 'android/app/src/${countryCode}/' does not exist`);
  process.exit(1);
}

const gradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
const gradleContent = fs.readFileSync(gradlePath, 'utf8');
if (!gradleContent.includes(`${countryCode}: [`)) {
  console.error(`Error: Flavor '${countryCode}' does not exist in build.gradle`);
  process.exit(1);
}

// Prevent removing the last country
const flavorEntries = gradleContent.match(/\n    [a-z]{2}: \[/g);
if (flavorEntries && flavorEntries.length <= 1) {
  console.error('Error: Cannot remove the last country — at least one country must remain');
  process.exit(1);
}

console.log(`Removing country: ${countryCode}`);

// 1. Remove JS entry file
fs.unlinkSync(entryFile);
console.log(`  Removed: index.${countryCode}.js`);

// 2. Remove JS country directory
fs.rmSync(srcDir, {recursive: true});
console.log(`  Removed: src/${countryCode}/`);

// 3. Remove Android source set
fs.rmSync(androidSrcDir, {recursive: true});
console.log(`  Removed: android/app/src/${countryCode}/`);

// 4. Remove flavor entry from build.gradle
let updatedGradle = gradleContent;
// Match the full flavor entry line including trailing comma and newline
const flavorEntryRegex = new RegExp(`\\n    ${countryCode}: \\[applicationId: "[^"]+", jsEntry: "index\\.${countryCode}", entryFile: "index\\.${countryCode}\\.js", activityName: "[^"]+"\\],?\\n`);
updatedGradle = updatedGradle.replace(flavorEntryRegex, '\n');
fs.writeFileSync(gradlePath, updatedGradle);
console.log(`  Updated: android/app/build.gradle`);

// 5. Remove country from ESLint plugin's countryDirs list
const eslintPluginPath = path.join(projectRoot, 'eslint-plugin-import-boundary', 'index.js');
if (fs.existsSync(eslintPluginPath)) {
  let eslintContent = fs.readFileSync(eslintPluginPath, 'utf8');
  eslintContent = eslintContent.replace(
    /const countryDirs = \[([^\]]+)\]/,
    (match, existing) => {
      const dirs = existing.match(/'[^']+'/g) || [];
      const filtered = dirs.filter(d => d !== `'${countryCode}'`);
      return `const countryDirs = [${filtered.join(', ')}]`;
    }
  );
  fs.writeFileSync(eslintPluginPath, eslintContent);
  console.log(`  Updated: eslint-plugin-import-boundary/index.js`);
}

console.log('');
console.log(`Country '${countryCode}' has been removed successfully!`);