#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const projectRoot = process.cwd();
const args = process.argv.slice(2);

function ask(question) {
  return new Promise((resolve, reject) => {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(`${question}: `, answer => {
        rl.close();
        resolve(answer.trim());
      });
    } catch (err) {
      reject(err);
    }
  });
}

function getExistingCountries() {
  const countryDirsPath = path.join(projectRoot, 'eslint-plugin-import-boundary', 'country-dirs.json');
  if (!fs.existsSync(countryDirsPath)) return [];
  return JSON.parse(fs.readFileSync(countryDirsPath, 'utf8'));
}

function removeCountry(countryCode) {
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
  const flavorEntryRegex = new RegExp(`\\n    ${countryCode}: \\[applicationId: "[^"]+", jsEntry: "index\\.${countryCode}", entryFile: "index\\.${countryCode}\\.js", activityName: "[^"]+", mainComponentName: "[^"]+"\\],?\\n`);
  updatedGradle = updatedGradle.replace(flavorEntryRegex, '\n');
  fs.writeFileSync(gradlePath, updatedGradle);
  console.log(`  Updated: android/app/build.gradle`);

  // 5. Remove country from ESLint plugin's countryDirs JSON file
  const countryDirsPath = path.join(projectRoot, 'eslint-plugin-import-boundary', 'country-dirs.json');
  if (fs.existsSync(countryDirsPath)) {
    const countryDirs = JSON.parse(fs.readFileSync(countryDirsPath, 'utf8'));
    const filtered = countryDirs.filter(d => d !== countryCode);
    fs.writeFileSync(countryDirsPath, JSON.stringify(filtered, null, 2) + '\n');
    console.log(`  Updated: eslint-plugin-import-boundary/country-dirs.json`);
  }

  console.log('');
  console.log(`Country '${countryCode}' has been removed successfully!`);
}

async function main() {
  let countryCode = args[0];

  if (!countryCode) {
    // Interactive mode
    const countries = getExistingCountries();

    console.log('\n========================================');
    console.log('  Multi-Country RN - Remove Country');
    console.log('========================================\n');

    if (countries.length === 0) {
      console.log('No countries found. Nothing to remove.');
      process.exit(0);
    }

    console.log('Existing countries:');
    countries.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
    console.log('');

    const input = await ask('Enter country code to remove (or number from list)');
    if (!input) {
      console.error('Error: Country code is required');
      process.exit(1);
    }

    // Support selecting by number
    const num = parseInt(input, 10);
    if (!isNaN(num) && num >= 1 && num <= countries.length) {
      countryCode = countries[num - 1];
    } else {
      countryCode = input;
    }

    const confirm = await ask(`Confirm remove '${countryCode}'? (y/n)`);
    if (confirm.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      process.exit(0);
    }
  }

  removeCountry(countryCode);
}

main().catch(err => {
  console.error('[remove-country] Failed:', err.message || err);
  process.exit(1);
});
