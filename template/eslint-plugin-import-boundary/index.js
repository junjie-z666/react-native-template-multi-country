const path = require('path');

function getCountryFromFilePath(filePath, projectRoot) {
  const srcDir = path.join(projectRoot, 'src');
  const relative = path.relative(srcDir, filePath);
  const parts = relative.split(path.sep);
  if (parts.length < 2) return null;

  const countryDirs = ['mx', 'cn'];

  if (countryDirs.includes(parts[0])) {
    return parts[0];
  }
  if (parts[0] === 'base') {
    return 'base';
  }
  return null;
}

function isImportFromSrc(importPath, projectRoot) {
  if (importPath.startsWith('@base')) {
    return 'base';
  }
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }
  const resolved = path.resolve(path.dirname(importPath), importPath);
  return getCountryFromFilePath(resolved, projectRoot);
}

const importBoundaryRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce import boundaries between countries and base',
      category: 'Architecture',
    },
    messages: {
      countryToCountry:
        'Import from "{{fromCountry}}" to "{{toCountry}}" is not allowed. Countries cannot import from other countries.',
      baseToCountry:
        'Import from "base" to "{{toCountry}}" is not allowed. Base cannot depend on country-specific code.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          projectRoot: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const projectRoot = options.projectRoot || process.cwd();

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const filePath = context.filename || context.getFilename();
        const fromCountry = getCountryFromFilePath(filePath, projectRoot);
        if (!fromCountry) return;

        const toCountry = isImportFromSrc(importPath, projectRoot);
        if (!toCountry) return;

        if (fromCountry !== 'base' && toCountry !== 'base' && fromCountry !== toCountry) {
          context.report({
            node,
            messageId: 'countryToCountry',
            data: {
              fromCountry,
              toCountry,
            },
          });
        }

        if (fromCountry === 'base' && toCountry !== 'base') {
          context.report({
            node,
            messageId: 'baseToCountry',
            data: {
              toCountry,
            },
          });
        }
      },
    };
  },
};

module.exports = {
  rules: {
    'import-boundary': importBoundaryRule,
  },
};
