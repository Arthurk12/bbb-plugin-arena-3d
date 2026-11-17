/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: './relay/src/main.ts',
  output: {
    path: path.resolve(__dirname, 'relay/dist'),
    filename: 'arena-relay.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    // `ws` ships an ESM wrapper for the `import` condition that webpack bundles incorrectly;
    // the CommonJS entry is the one that works.
    conditionNames: ['require', 'node', 'default'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: { loader: 'ts-loader', options: { transpileOnly: true } },
        exclude: /node_modules/,
      },
    ],
  },
  // Optional native speedups of `ws`; it falls back to plain JS without them.
  externals: {
    bufferutil: 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate',
  },
  optimization: {
    minimize: false,
  },
};
