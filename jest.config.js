module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    'test/**/*.test.{js,jsx}',
  ],
  coverageDirectory: 'test/specs/coverage/',
  coverageReporters: [
    'json',
    'text-summary',
  ],
  rootDir: process.cwd(),
  setupFilesAfterEnv: [
    '<rootDir>/test/jest-setup.js',
  ],
  testPathIgnorePatterns: [
    'node_modules/',
    'src/',
    'dist/',
  ],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  verbose: true,
};
