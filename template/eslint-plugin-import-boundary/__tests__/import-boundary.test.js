const {RuleTester} = require('eslint');
const rule = require('../index').rules['import-boundary'];

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const projectRoot = '/project';

ruleTester.run('import-boundary', rule, {
  valid: [
    // Country → Base: allowed
    {
      code: "import {AppShell} from '../base';",
      filename: `${projectRoot}/src/cn/App.tsx`,
      options: [{projectRoot}],
    },
    {
      code: "import {AppShell} from '@base';",
      filename: `${projectRoot}/src/cn/App.tsx`,
      options: [{projectRoot}],
    },
    // Base → Base: allowed
    {
      code: "import {CountryConfig} from './types/CountryConfig';",
      filename: `${projectRoot}/src/base/components/AppShell.tsx`,
      options: [{projectRoot}],
    },
    // External imports: not checked
    {
      code: "import React from 'react';",
      filename: `${projectRoot}/src/cn/App.tsx`,
      options: [{projectRoot}],
    },
  ],

  invalid: [
    // Country → Country: blocked
    {
      code: "import {App} from '../mx/App';",
      filename: `${projectRoot}/src/cn/App.tsx`,
      options: [{projectRoot}],
      errors: [{messageId: 'countryToCountry', data: {fromCountry: 'cn', toCountry: 'mx'}}],
    },
    // Base → Country: blocked
    {
      code: "import {cnConfig} from '../cn/App';",
      filename: `${projectRoot}/src/base/components/AppShell.tsx`,
      options: [{projectRoot}],
      errors: [{messageId: 'baseToCountry', data: {toCountry: 'cn'}}],
    },
  ],
});

console.log('All import-boundary tests passed!');