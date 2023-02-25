const packageJSON = require('./package.json');

const PACKAGE_NAME = packageJSON.name.replace(/@[^/]+\//, '');

module.exports = {
  devtool: 'source-map',
  externals: [],
  mode: 'production',
  module: {
    rules: [{
      test: /\.jsx?$/,
      use: ['babel-loader'],
      exclude: /node_modules/,
    }],
  },
  output: {
    filename: `${PACKAGE_NAME}.js`,
    library: PACKAGE_NAME,
    libraryTarget: 'umd',
    // Workaround of a webpack bug: <https://github.com/webpack/webpack/issues/6784>.
    globalObject: 'typeof self !== \'undefined\' ? self : this',
  },
};
