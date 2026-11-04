const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.includes('wasm/index') ||
    moduleName.includes('#wasm-') ||
    (context.originModulePath.includes('satellite.js') && moduleName.includes('wasm'))
  ) {
    return {
      type: 'empty',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
