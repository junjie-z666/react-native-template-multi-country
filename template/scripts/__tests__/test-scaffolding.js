const fs = require('fs');
const path = require('path');
const os = require('os');
const {execSync} = require('child_process');

const templateRoot = path.resolve(__dirname, '..', '..');

const TEST_COUNTRY = 'br';
const TEST_APP_ID = 'com.brasil.meuapp';
const TEST_ACTIVITY = 'BrasilActivity';
const TEST_APP_NAME = 'BrasilApp';
const TEST_API_URL = 'https://api.br.example.com';
const TEST_LOCALE = 'pt-BR';
const TEST_PACKAGE = 'com.test.myapp';

function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-test-'));
  const projectRoot = tmpDir;

  // Create minimal project structure
  fs.mkdirSync(path.join(projectRoot, 'scripts'), {recursive: true});
  fs.mkdirSync(path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'mipmap-mdpi'), {recursive: true});
  fs.mkdirSync(path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'mipmap-hdpi'), {recursive: true});
  fs.mkdirSync(path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'mipmap-xhdpi'), {recursive: true});
  fs.mkdirSync(path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'mipmap-xxhdpi'), {recursive: true});
  fs.mkdirSync(path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi'), {recursive: true});
  fs.mkdirSync(path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'multi', 'template'), {recursive: true});
  fs.mkdirSync(path.join(projectRoot, 'eslint-plugin-import-boundary'), {recursive: true});

  // Copy scripts from template
  for (const f of ['add-country.js', 'remove-country.js']) {
    fs.copyFileSync(path.join(templateRoot, 'scripts', f), path.join(projectRoot, 'scripts', f));
  }

  // Copy base source files
  const baseSrc = path.join(templateRoot, 'src', 'base');
  const baseDst = path.join(projectRoot, 'src', 'base');
  copyDirSync(baseSrc, baseDst);

  // Copy Android base classes
  const baseJava = path.join(templateRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'multi', 'template');
  for (const f of fs.readdirSync(baseJava)) {
    fs.copyFileSync(path.join(baseJava, f), path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'multi', 'template', f));
  }

  // Create minimal app.json
  fs.writeFileSync(path.join(projectRoot, 'app.json'), JSON.stringify({name: 'TestProject', displayName: 'TestProject'}, null, 2));

  // Create minimal build.gradle
  fs.writeFileSync(path.join(projectRoot, 'android', 'app', 'build.gradle'), `apply plugin: "com.android.application"

ext.countryFlavors = [
]

android {
    namespace "com.multi.template"
    defaultConfig {
        applicationId "com.multi.template"
    }
    productFlavors {
        project.ext.countryFlavors.each { name, config ->
            create(name) {
                dimension "country"
                applicationId config.applicationId
                buildConfigField "String", "JS_ENTRY", "\"\${config.jsEntry}\""
            }
        }
    }
}
`);

  // Create empty country-dirs.json
  fs.writeFileSync(path.join(projectRoot, 'eslint-plugin-import-boundary', 'country-dirs.json'), '[]\n');

  return projectRoot;
}

function copyDirSync(src, dst) {
  fs.mkdirSync(dst, {recursive: true});
  for (const entry of fs.readdirSync(src, {withFileTypes: true})) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function cleanupCountry(projectRoot, code) {
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

  const gradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  let content = fs.readFileSync(gradlePath, 'utf8');
  const regex = new RegExp(`\\n    ${code}: \\[.*?\\],?`, 'g');
  content = content.replace(regex, '');
  fs.writeFileSync(gradlePath, content);

  const countryDirsPath = path.join(projectRoot, 'eslint-plugin-import-boundary', 'country-dirs.json');
  if (fs.existsSync(countryDirsPath)) {
    const dirs = JSON.parse(fs.readFileSync(countryDirsPath, 'utf8'));
    const filtered = dirs.filter(d => d !== code);
    fs.writeFileSync(countryDirsPath, JSON.stringify(filtered, null, 2) + '\n');
  }
}

function runAddScript(projectRoot, country, appId, activity, appName, apiUrl, locale, packageName) {
  const scriptPath = path.join(projectRoot, 'scripts', 'add-country.js');
  try {
    let cmd = `node "${scriptPath}" ${country} "${appId}" "${activity}" "${appName}" "${apiUrl}" "${locale}"`;
    if (packageName) cmd += ` --package "${packageName}"`;
    const result = execSync(cmd, {cwd: projectRoot, encoding: 'utf8'});
    return {success: true, output: result};
  } catch (e) {
    return {success: false, output: e.stderr || e.stdout, code: e.status};
  }
}

function runRemoveScript(projectRoot, country) {
  const scriptPath = path.join(projectRoot, 'scripts', 'remove-country.js');
  try {
    const result = execSync(`node "${scriptPath}" ${country}`, {cwd: projectRoot, encoding: 'utf8'});
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

function getCountryDirs(projectRoot) {
  const p = path.join(projectRoot, 'eslint-plugin-import-boundary', 'country-dirs.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// =====================
// SETUP
// =====================
const projectRoot = createTempProject();
console.log(`Test project: ${projectRoot}\n`);

const gradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
const countryDirsPath = path.join(projectRoot, 'eslint-plugin-import-boundary', 'country-dirs.json');

try {
  // =====================
  // ADD COUNTRY TESTS
  // =====================
  console.log(`Testing add-country script with country='${TEST_COUNTRY}'...`);

  const result = runAddScript(projectRoot, TEST_COUNTRY, TEST_APP_ID, TEST_ACTIVITY, TEST_APP_NAME, TEST_API_URL, TEST_LOCALE);
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
  assert(gradleContent.includes(`mainComponentName: "${TEST_COUNTRY}App"`), 'Gradle should contain mainComponentName');
  console.log('  PASS: Gradle config updated correctly');

  // Test: country-dirs.json updated
  const countryDirs = getCountryDirs(projectRoot);
  assert(countryDirs.includes(TEST_COUNTRY), 'country-dirs.json should contain new country');
  console.log('  PASS: country-dirs.json updated correctly');

  // Test: Rejects existing country
  const rejectResult = runAddScript(projectRoot, TEST_COUNTRY, TEST_APP_ID, TEST_ACTIVITY, TEST_APP_NAME, TEST_API_URL, TEST_LOCALE);
  assert(!rejectResult.success, 'Script should fail for existing country');
  assert(rejectResult.output.includes('already exists'), 'Error message should mention "already exists"');
  console.log('  PASS: Rejects existing country code');

  // =====================
  // --PACKAGE TESTS
  // =====================
  console.log(`\nTesting --package parameter...`);

  // Add a second country so we can remove br
  runAddScript(projectRoot, 'us', 'com.us.app', 'UsActivity', 'USApp', 'https://api.us.example.com', 'en-US');
  runRemoveScript(projectRoot, TEST_COUNTRY);

  const pkgResult = runAddScript(projectRoot, TEST_COUNTRY, TEST_APP_ID, TEST_ACTIVITY, TEST_APP_NAME, TEST_API_URL, TEST_LOCALE, TEST_PACKAGE);
  assert(pkgResult.success, `Script with --package should succeed: ${pkgResult.output}`);

  // Test: Activity file uses custom package
  const activityDir = path.join(projectRoot, `android/app/src/${TEST_COUNTRY}/java/com/test/myapp`);
  assert(fs.existsSync(activityDir), `Activity dir should use custom package path: ${activityDir}`);
  const activityFile = path.join(activityDir, `${TEST_ACTIVITY}.kt`);
  assert(fs.existsSync(activityFile), `Activity file not found: ${activityFile}`);
  const activityContent = fs.readFileSync(activityFile, 'utf8');
  assert(activityContent.includes(`package ${TEST_PACKAGE}`), 'Activity should have custom package declaration');
  assert(activityContent.includes('BaseMainActivity'), 'Activity should extend BaseMainActivity');
  console.log('  PASS: --package parameter works correctly');

  // Test: MainApplication generated per country
  const mainAppFile = path.join(activityDir, 'MainApplication.kt');
  assert(fs.existsSync(mainAppFile), `MainApplication not found: ${mainAppFile}`);
  const mainAppContent = fs.readFileSync(mainAppFile, 'utf8');
  assert(mainAppContent.includes(`package ${TEST_PACKAGE}`), 'MainApplication should have custom package declaration');
  assert(mainAppContent.includes('BaseApplication'), 'MainApplication should extend BaseApplication');
  console.log('  PASS: MainApplication generated correctly');

  // Clean up
  cleanupCountry(projectRoot, 'us');
  cleanupCountry(projectRoot, TEST_COUNTRY);

  // =====================
  // REMOVE COUNTRY TESTS
  // =====================
  console.log(`\nTesting remove-country script with country='${TEST_COUNTRY}'...`);

  // Set up: add br and us
  runAddScript(projectRoot, TEST_COUNTRY, TEST_APP_ID, TEST_ACTIVITY, TEST_APP_NAME, TEST_API_URL, TEST_LOCALE);
  runAddScript(projectRoot, 'us', 'com.us.app', 'UsActivity', 'USApp', 'https://api.us.example.com', 'en-US');

  const removeResult = runRemoveScript(projectRoot, TEST_COUNTRY);
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
  const dirsAfterRemove = getCountryDirs(projectRoot);
  assert(!dirsAfterRemove.includes(TEST_COUNTRY), 'country-dirs.json should not contain removed country');
  console.log('  PASS: country-dirs.json updated correctly');

  // Test: Rejects removing non-existent country
  const removeNonExistResult = runRemoveScript(projectRoot, 'zz');
  assert(!removeNonExistResult.success, 'Remove script should fail for non-existent country');
  console.log('  PASS: Rejects non-existent country code');

  // Test: Allows removing the last country
  const removeLastResult = runRemoveScript(projectRoot, 'us');
  assert(removeLastResult.success, 'Should be able to remove the last country');
  assert(!fs.existsSync(path.join(projectRoot, 'src/us')), 'Last country directory should be removed');
  console.log('  PASS: Allows removing the last country');

  console.log('\nAll scaffolding tests passed!');

} finally {
  // Always clean up temp directory
  fs.rmSync(projectRoot, {recursive: true, force: true});
  console.log(`\nCleaned up: ${projectRoot}`);
}
