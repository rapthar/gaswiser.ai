const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch monorepo root so Metro sees packages/api-client and root node_modules
config.watchFolders = [monorepoRoot];

// Resolve packages from app node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.unstable_enableSymlinks = false;

// Expo CLI overrides projectRoot to the monorepo root in pnpm workspaces.
// Intercept Metro's attempt to resolve ./index from the monorepo root
// and redirect it to expo-router/entry (the correct Expo Router entry point).
const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isEntryResolution =
    moduleName === './index' &&
    context.originModulePath.replace(/\\/g, '/').endsWith('gaswiser/.');

  if (isEntryResolution) {
    return {
      filePath: path.resolve(monorepoRoot, 'node_modules/expo-router/entry.js'),
      type: 'sourceFile',
    };
  }

  if (originalResolve) {
    return originalResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
