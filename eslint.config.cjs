const { defineConfig } = require('eslint/config');
const universe = require('eslint-config-universe/flat/native');

module.exports = defineConfig([
  { ignores: ['build', 'coverage', 'example/ios', 'example/android'] },
  ...universe,
  {
    rules: {
      'import/order': 'off',
    },
  },
  {
    // CommonJS tooling files run in Node, not in the app runtime.
    files: ['**/*.config.js', '**/*.config.cjs', 'internal/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        console: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
]);
