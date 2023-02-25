module.exports = {
  env: {
    browser: true,
    es6: true,
    'jest/globals': true,
  },
  extends: [
    'airbnb',
  ],
  globals: {
    document: 'readonly',
    window: 'readonly',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 2022,
  },
  plugins: [
    'jest',
  ],
  rules: {
    'class-methods-use-this': 0,
    'no-underscore-dangle': 0,
    'guard-for-in': 0,
    'no-param-reassign': 0,
    'no-restricted-syntax': 0,
    'no-use-before-define': 0,
    'no-useless-constructor': 0,
    'object-curly-newline': 0,
  },
};
