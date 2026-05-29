const assert = require('assert');
const {Linter} = require('eslint');
const rule = require('../index').rules['import-boundary'];

const projectRoot = '/project';

function lint(code, filename) {
  const linter = new Linter();
  linter.defineRule('import-boundary', rule);
  return linter.verify(code, {
    parserOptions: {ecmaVersion: 2022, sourceType: 'module'},
    rules: {'import-boundary': ['error', {projectRoot}]},
  }, {filename});
}

describe('import-boundary', () => {
  it('allows Country → Base', () => {
    const errors = lint("import {AppShell} from '../base';", `${projectRoot}/src/cn/App.tsx`);
    assert.strictEqual(errors.length, 0);
  });

  it('allows @base alias', () => {
    const errors = lint("import {AppShell} from '@base';", `${projectRoot}/src/cn/App.tsx`);
    assert.strictEqual(errors.length, 0);
  });

  it('allows Base → Base', () => {
    const errors = lint("import {CountryConfig} from './types/CountryConfig';", `${projectRoot}/src/base/components/AppShell.tsx`);
    assert.strictEqual(errors.length, 0);
  });

  it('allows external imports', () => {
    const errors = lint("import React from 'react';", `${projectRoot}/src/cn/App.tsx`);
    assert.strictEqual(errors.length, 0);
  });

  it('blocks Country → Country', () => {
    const errors = lint("import {App} from '../mx/App';", `${projectRoot}/src/cn/App.tsx`);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].messageId, 'countryToCountry');
  });

  it('blocks Base → Country', () => {
    const errors = lint("import {cnConfig} from '../../cn/App';", `${projectRoot}/src/base/components/AppShell.tsx`);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].messageId, 'baseToCountry');
  });
});
