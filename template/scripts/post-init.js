#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const readline = require('readline');

const projectRoot = process.cwd();

function ask(question, defaultVal) {
  return new Promise((resolve, reject) => {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const suffix = defaultVal ? ` (${defaultVal})` : '';
      rl.question(`${question}${suffix}: `, answer => {
        rl.close();
        resolve(answer.trim() || defaultVal || '');
      });
    } catch (err) {
      reject(err);
    }
  });
}

function fixPlaceholders() {
  const dirName = path.basename(projectRoot);
  const replacements = [
    path.join(projectRoot, 'package.json'),
    path.join(projectRoot, 'app.json'),
    path.join(projectRoot, 'android', 'settings.gradle'),
  ];

  for (const filePath of replacements) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('{{APP_NAME}}')) {
      fs.writeFileSync(filePath, content.replaceAll('{{APP_NAME}}', dirName));
      console.log(`  Fixed ${path.relative(projectRoot, filePath)} -> ${dirName}`);
    }
  }
}

async function promptCountry() {
  console.log('\n--- Add a country ---\n');

  const applicationId = await ask('Application ID (e.g. com.mycompany.app.cn)');
  if (!applicationId) {
    console.error('Error: Application ID is required');
    process.exit(1);
  }

  const countryCode = await ask('Country code (e.g. cn, us, jp)');
  const apiBaseUrl = await ask('API base URL', `https://api.${countryCode}.example.com`);
  const defaultLocale = await ask('Default locale', 'zh-CN');

  return {countryCode, applicationId, activityName: 'MainActivity', appName: countryCode, apiBaseUrl, defaultLocale};
}

function isInitMode() {
  const countryDirsPath = path.join(projectRoot, 'eslint-plugin-import-boundary', 'country-dirs.json');
  if (!fs.existsSync(countryDirsPath)) return true;
  const dirs = JSON.parse(fs.readFileSync(countryDirsPath, 'utf8'));
  return dirs.length === 0;
}

function addCountry(info) {
  const scriptPath = path.join(projectRoot, 'scripts', 'add-country.js');
  const cmd = `node "${scriptPath}" ${info.countryCode} "${info.applicationId}" "${info.activityName}" "${info.appName}" "${info.apiBaseUrl}" "${info.defaultLocale}" --package "${info.applicationId}"`;
  execSync(cmd, {cwd: projectRoot, stdio: 'inherit'});
}

async function main() {
  const initMode = isInitMode();

  console.log('\n========================================');
  console.log(initMode ? '  Multi-Country RN - Project Setup' : '  Multi-Country RN - Add Country');
  console.log('========================================\n');

  if (initMode) {
    console.log('[init] Project root:', projectRoot);
    fixPlaceholders();
  }

  const info = await promptCountry();
  addCountry(info);

  while (true) {
    const answer = await ask('\nAdd another country? (y/n)', 'n');
    if (answer.toLowerCase() !== 'y') break;
    const next = await promptCountry();
    addCountry(next);
  }

  console.log('\n========================================');
  console.log(initMode ? '  Setup complete!' : '  Country added!');
  console.log('========================================');
  console.log('\nNext steps:');
  console.log('  1. Replace placeholder launcher icons');
  console.log('  2. Add translations in src/<country>/locales/');
  console.log('  3. yarn start');
  console.log('  4. npx react-native run-android --variant <country>Debug\n');
}

main().catch(err => {
  console.error('[post-init] Failed:', err.message || err);
  process.exit(1);
});
