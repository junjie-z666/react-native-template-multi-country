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

function cleanup() {
  const paths = [
    path.join(projectRoot, `src/${TEST_COUNTRY}`),
    path.join(projectRoot, `index.${TEST_COUNTRY}.js`),
    path.join(projectRoot, `android/app/src/${TEST_COUNTRY}`),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) fs.rmSync(p, {recursive: true});
      else fs.unlinkSync(p);
    }
  }

  // Remove br from build.gradle countryFlavors
  const gradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  let content = fs.readFileSync(gradlePath, 'utf8');
  content = content.replace(/\n    br: \[applicationId: "[^"]+", jsEntry: "index\.br", entryFile: "index\.br\.js", activityName: "[^"]+"\],/, '');
  fs.writeFileSync(gradlePath, content);

  // Remove br from ESLint countryDirs
  const eslintPluginPath = path.join(projectRoot, 'eslint-plugin-import-boundary', 'index.js');
  if (fs.existsSync(eslintPluginPath)) {
    let eslintContent = fs.readFileSync(eslintPluginPath, 'utf8');
    eslintContent = eslintContent.replace(
      /const countryDirs = \[([^\]]+)\]/,
      (match, existing) => {
        const dirs = existing.match(/'[^']+'/g) || [];
        const filtered = dirs.filter(d => d !== "'br'");
        return `const countryDirs = [${filtered.join(', ')}]`;
      }
    );
    fs.writeFileSync(eslintPluginPath, eslintContent);
  }
}

function runAddScript(country, appId, activity, appName, apiUrl, locale) {
  try {
    const result = execSync(
      `node "${addScriptPath}" ${country} "${appId}" "${activity}" "${appName}" "${apiUrl}" "${locale}"`,
      {cwd: projectRoot, encoding: 'utf8'}
    );
    return {success: true, output: result};
  } catch (e) {
    return {success: false, output: e.stderr || e.stdout, code: e.status};
  }
}

function runRemoveScript(country) {
  try {
    const result = execSync(
      `node "${removeScriptPath}" ${country}`,
      {cwd: projectRoot, encoding: 'utf8'}
    );
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

// =====================
// ADD COUNTRY TESTS
// =====================
console.log(`Testing add-country script with country='${TEST_COUNTRY}'...`);

cleanup();

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
const gradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
const gradleContent = fs.readFileSync(gradlePath, 'utf8');
assert(gradleContent.includes(`${TEST_COUNTRY}: [`), 'Gradle should contain country flavor');
assert(gradleContent.includes(TEST_APP_ID), 'Gradle should contain applicationId');
console.log('  PASS: Gradle config updated correctly');

// Test: Rejects existing country
const rejectResult = runAddScript(TEST_COUNTRY, TEST_APP_ID, TEST_ACTIVITY, TEST_APP_NAME, TEST_API_URL, TEST_LOCALE);
assert(!rejectResult.success, 'Script should fail for existing country');
assert(rejectResult.output.includes('already exists'), 'Error message should mention "already exists"');
console.log('  PASS: Rejects existing country code');

// Test: Rejects invalid country code
const invalidResult = runAddScript('USA', 'com.test.app', 'Test', 'Test', 'https://api.test.com', 'en-US');
assert(!invalidResult.success, 'Script should fail for invalid country code');
console.log('  PASS: Rejects invalid country code');

// =====================
// REMOVE COUNTRY TESTS
// =====================
console.log(`\nTesting remove-country script with country='${TEST_COUNTRY}'...`);

const removeResult = runRemoveScript(TEST_COUNTRY);
assert(removeResult.success, `Remove script should succeed: ${removeResult.output}`);

// Test: JS entry file removed
assert(!fs.existsSync(entryFile), `Entry file should be removed: ${entryFile}`);
console.log('  PASS: JS entry file removed');

// Test: JS country directory removed
assert(!fs.existsSync(path.join(projectRoot, `src/${TEST_COUNTRY}`)), `JS country directory should be removed`);
console.log('  PASS: JS country directory removed');

// Test: Android source set removed
assert(!fs.existsSync(path.join(projectRoot, `android/app/src/${TEST_COUNTRY}`)), `Android source set should be removed`);
console.log('  PASS: Android source set removed');

// Test: Gradle config updated
const gradleAfterRemove = fs.readFileSync(gradlePath, 'utf8');
assert(!gradleAfterRemove.includes(`${TEST_COUNTRY}: [`), 'Gradle should not contain removed country flavor');
assert(!gradleAfterRemove.includes(TEST_APP_ID), 'Gradle should not contain removed applicationId');
// Existing countries should still be there
assert(gradleAfterRemove.includes('cn: ['), 'Gradle should still contain cn flavor');
assert(gradleAfterRemove.includes('mx: ['), 'Gradle should still contain mx flavor');
console.log('  PASS: Gradle config updated correctly');

// Test: ESLint countryDirs updated
const eslintPluginPath = path.join(projectRoot, 'eslint-plugin-import-boundary', 'index.js');
const eslintContent = fs.readFileSync(eslintPluginPath, 'utf8');
assert(!eslintContent.includes(`'${TEST_COUNTRY}'`), 'ESLint plugin should not contain removed country');
assert(eslintContent.includes("'cn'"), 'ESLint plugin should still contain cn');
assert(eslintContent.includes("'mx'"), 'ESLint plugin should still contain mx');
console.log('  PASS: ESLint countryDirs updated correctly');

// Test: Rejects removing non-existent country
const removeNonExistResult = runRemoveScript('zz');
assert(!removeNonExistResult.success, 'Remove script should fail for non-existent country');
console.log('  PASS: Rejects non-existent country code');

// Test: Rejects removing last country (remove both cn and mx should fail at the second one)
// First add br back so we can test removing the last one
runAddScript(TEST_COUNTRY, TEST_APP_ID, TEST_ACTIVITY, TEST_APP_NAME, TEST_API_URL, TEST_LOCALE);
// Remove br
runRemoveScript(TEST_COUNTRY);
// Now only cn and mx remain - try to remove both
const removeCnResult = runRemoveScript('cn');
assert(removeCnResult.success, 'Should be able to remove cn when mx still exists');
const removeLastResult = runRemoveScript('mx');
assert(!removeLastResult.success, 'Should not be able to remove the last country');
// Restore cn
runAddScript('cn', 'com.zhongguo.app', 'ZhongguoActivity', '中国App', 'https://api.cn.example.com', 'zh-CN');
console.log('  PASS: Prevents removing the last country');

cleanup();

console.log('\nAll scaffolding tests passed!');