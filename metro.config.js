const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [path.resolve(projectRoot, 'src')],
  resolver: {
    extraNodeModules: {
      '@base': path.resolve(projectRoot, 'src/base'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
