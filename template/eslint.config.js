const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const importBoundaryPlugin = require('./eslint-plugin-import-boundary');

const projectRoot = require('path').resolve(__dirname);

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'import-boundary': importBoundaryPlugin,
    },
    rules: {
      'import-boundary/import-boundary': ['error', {projectRoot}],
    },
  },
);
