const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const addScriptPath = path.join(projectRoot, 'scripts', 'add-country.js');
const removeScriptPath = path.join(projectRoot, 'scripts', 'remove-country.js');

const TEST_COUNTRY = 'br';
const TEST_APP_ID = 'com.brasil.meuapp';
const TEST_ACTIVITY = 'BrasilActivity';
const TEST_APP_NAME = 'BrasilApp';
const TEST_API_URL = 'https://api.br.example.com';
const TEST_LOCALE = 'pt-BR';
const TEST_PACKAGE = 'com.test.myapp';

const gradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
const countryDirsPath = path.join(projectRoot, 'eslint-plugin-import-boundary', 'country-dirs.json');

function cleanupCountry(code) {
  const paths = [
    path.join(projectRoot, `src/${code}`),
    path.join(projectRoot, `index.${code}.js`),
    path.join(projectRoot, `android/app/src/${code}`),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) fs.rmSync(p, {recursive: true});
      else fs.unlinkSync(p);
    }
  }

  // Remove from build.gradle
  let content = fs.readFileSync(gradlePath, 'utf8');
  const regex = new RegExp(`\\n    ${code}: \\[.*?\\],?`, 'g');
  content = content.replace(regex, '');
  fs.writeFileSync(gradlePath, content);

  // Remove from country-dirs.json
  if (fs.existsSync(countryDirsPath)) {
    const dirs = JSON.parse(fs.readFileSync(countryDirsPath, 'utf8'));
    const filtered = dirs.filter(d => d !== code);
    fs.writeFileSync(countryDirsPath, JSON.stringify(filtered, null, 2) + '\n');
  }
}

function cleanupAll() {
  for (const code of [TEST_COUNTRY, 'us', 'jp', 'cn']) {
    cleanupCountry(code);
  }
}

function runAddScript(country, appId, activity, appName, apiUrl, locale, packageName) {
  try {
    let cmd = `node "${addScriptPath}" ${country} "${appId}" "${activity}" "${appName}" "${apiUrl}" "${locale}"`;
    if (packageName) cmd += ` --package "${packageName}"`;
    const result = execSync(cmd, {cwd: projectRoot, encoding: 'utf8'});
    return {success: true, output: result};
  } catch (e) {
    return {success: false, output: e.stderr || e.stdout, code: e.status};
  }
}

function runRemoveScript(country) {
  try {
    const result = execSync(`node "${removeScriptPath}" ${country}`, {cwd: projectRoot, encoding: 'utf8'});
    return {success: true, output: result};
  } catch (e) {
    return {success: false, output: e.stderr || e.stdout, code: e.status};
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function getCountryDirs() {
  return JSON.parse(fs.readFileSync(countryDirsPath, 'utf8'));
}

// =====================
// ADD COUNTRY TESTS
// =====================
console.log(`Testing add-country script with country='${TEST_COUNTRY}'...`);

cleanupAll();

const result = runAddScript(TEST_COUNTRY, TEST_APP_ID, TEST_ACTIVITY, TEST_APP_NAME, TEST_API_URL, TEST_LOCALE);
assert(result.success, `Script should succeed: ${result.output}`);

// Test: JS entry file generated
const entryFile = path.join(projectRoot, `index.${TEST_COUNTRY}.js`);
assert(fs.existsSync(entryFile), `Entry file not found: ${entryFile}`);
const entryContent = fs.readFileSync(entryFile, 'utf8');
assert(entryContent.includes(`src/${TEST_COUNTRY}/App`), 'Entry file should reference country App');
console.log('  PASS: JS entry file generated correctly');

// Test: JS country directory generated
const appFile = path.join(projectRoot, `src/${TEST_COUNTRY}/App.tsx`);
assert(fs.existsSync(appFile), `App file not found: ${appFile}`);
const appContent = fs.readFileSync(appFile, 'utf8');
assert(appContent.includes(TEST_API_URL), 'App should contain API BaseUrl');
assert(appContent.includes(TEST_APP_NAME), 'App should contain app name');
assert(appContent.includes(TEST_LOCALE), 'App should contain default locale');
console.log('  PASS: JS country directory generated correctly');

// Test: JS locales placeholder
const localeFile = path.join(projectRoot, `src/${TEST_COUNTRY}/locales/placeholder.ts`);
assert(fs.existsSync(localeFile), `Locale placeholder not found: ${localeFile}`);
console.log('  PASS: JS locales placeholder generated correctly');

// Test: Android source set
const stringsFile = path.join(projectRoot, `android/app/src/${TEST_COUNTRY}/res/values/strings.xml`);
assert(fs.existsSync(stringsFile), `Strings file not found: ${stringsFile}`);
const stringsContent = fs.readFileSync(stringsFile, 'utf8');
assert(stringsContent.includes(TEST_APP_NAME), 'Strings should contain app name');
console.log('  PASS: Android source set generated correctly');

// Test: Android mipmap dirs
for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  const mipmapDir = path.join(projectRoot, `android/app/src/${TEST_COUNTRY}/res/mipmap-${density}`);
  assert(fs.existsSync(mipmapDir), `Mipmap dir not found: ${mipmapDir}`);
}
console.log('  PASS: Android mipmap directories generated correctly');

// Test: Gradle config updated
const gradleContent = fs.readFileSync(gradlePath, 'utf8');
assert(gradleContent.includes(`${TEST_COUNTRY}: [`), 'Gradle should contain country flavor');
assert(gradleContent.includes(TEST_APP_ID), 'Gradle should contain applicationId');
console.log('  PASS: Gradle config updated correctly');

// Test: country-dirs.json updated
const countryDirs = getCountryDirs();
assert(countryDirs.includes(TEST_COUNTRY), 'country-dirs.json should contain new country');
console.log('  PASS: country-dirs.json updated correctly');

// Test: Rejects existing country
const rejectResult = runAddScript(TEST_COUNTRY, TEST_APP_ID, TEST_ACTIVITY, TEST_APP_NAME, TEST_API_URL, TEST_LOCALE);
assert(!rejectResult.success, 'Script should fail for existing country');
assert(rejectResult.output.includes('already exists'), 'Error message should mention "already exists"');
console.log('  PASS: Rejects existing country code');

// =====================
// --PACKAGE TESTS
// =====================
console.log(`\nTesting --package parameter...`);

// Add a second country so we can remove br
runAddScript('us', 'com.us.app', 'UsActivity', 'USApp', 'https://api.us.example.com', 'en-US');
runRemoveScript(TEST_COUNTRY);

const pkgResult = runAddScript(TEST_COUNTRY, TEST_APP_ID, TEST_ACTIVITY, TEST_APP_NAME, TEST_API_URL, TEST_LOCALE, TEST_PACKAGE);
assert(pkgResult.success, `Script with --package should succeed: ${pkgResult.output}`);

// Test: Activity file uses custom package
const activityDir = path.join(projectRoot, `android/app/src/${TEST_COUNTRY}/java/com/test/myapp`);
assert(fs.existsSync(activityDir), `Activity dir should use custom package path: ${activityDir}`);
const activityFile = path.join(activityDir, `${TEST_ACTIVITY}.kt`);
assert(fs.existsSync(activityFile), `Activity file not found: ${activityFile}`);
const activityContent = fs.readFileSync(activityFile, 'utf8');
assert(activityContent.includes(`package ${TEST_PACKAGE}`), 'Activity should have custom package declaration');
assert(activityContent.includes('BaseMainActivity'), 'Activity should extend BaseMainActivity');
assert(activityContent.includes('getMainComponentName'), 'Activity should override getMainComponentName');
console.log('  PASS: --package parameter works correctly');

// Test: MainApplication generated per country
const mainAppFile = path.join(activityDir, 'MainApplication.kt');
assert(fs.existsSync(mainAppFile), `MainApplication not found: ${mainAppFile}`);
const mainAppContent = fs.readFileSync(mainAppFile, 'utf8');
assert(mainAppContent.includes(`package ${TEST_PACKAGE}`), 'MainApplication should have custom package declaration');
assert(mainAppContent.includes('BaseApplication'), 'MainApplication should extend BaseApplication');
console.log('  PASS: MainApplication generated correctly');

// Clean up
cleanupCountry('us');
cleanupCountry(TEST_COUNTRY);

// =====================
// REMOVE COUNTRY TESTS
// =====================
console.log(`\nTesting remove-country script with country='${TEST_COUNTRY}'...`);

// Set up: add br and us
runAddScript(TEST_COUNTRY, TEST_APP_ID, TEST_ACTIVITY, TEST_APP_NAME, TEST_API_URL, TEST_LOCALE);
runAddScript('us', 'com.us.app', 'UsActivity', 'USApp', 'https://api.us.example.com', 'en-US');

const removeResult = runRemoveScript(TEST_COUNTRY);
assert(removeResult.success, `Remove script should succeed: ${removeResult.output}`);

// Test: JS entry file removed
assert(!fs.existsSync(entryFile), `Entry file should be removed: ${entryFile}`);
console.log('  PASS: JS entry file removed');

// Test: JS country directory removed
assert(!fs.existsSync(path.join(projectRoot, `src/${TEST_COUNTRY}`)), 'JS country directory should be removed');
console.log('  PASS: JS country directory removed');

// Test: Android source set removed
assert(!fs.existsSync(path.join(projectRoot, `android/app/src/${TEST_COUNTRY}`)), 'Android source set should be removed');
console.log('  PASS: Android source set removed');

// Test: Gradle config updated
const gradleAfterRemove = fs.readFileSync(gradlePath, 'utf8');
assert(!gradleAfterRemove.includes(`${TEST_COUNTRY}: [`), 'Gradle should not contain removed country flavor');
assert(!gradleAfterRemove.includes(TEST_APP_ID), 'Gradle should not contain removed applicationId');
console.log('  PASS: Gradle config updated correctly');

// Test: country-dirs.json updated
const dirsAfterRemove = getCountryDirs();
assert(!dirsAfterRemove.includes(TEST_COUNTRY), 'country-dirs.json should not contain removed country');
console.log('  PASS: country-dirs.json updated correctly');

// Test: Rejects removing non-existent country
const removeNonExistResult = runRemoveScript('zz');
assert(!removeNonExistResult.success, 'Remove script should fail for non-existent country');
console.log('  PASS: Rejects non-existent country code');

// Test: Allows removing the last country
const removeLastResult = runRemoveScript('us');
assert(removeLastResult.success, 'Should be able to remove the last country');
assert(!fs.existsSync(path.join(projectRoot, 'src/us')), 'Last country directory should be removed');
console.log('  PASS: Allows removing the last country');

cleanupAll();

console.log('\nAll scaffolding tests passed!');
