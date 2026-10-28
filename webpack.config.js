/* eslint-disable @typescript-eslint/no-var-requires */
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const PLUGIN_NAME = 'BbbPluginArena3d';

module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: `${PLUGIN_NAME}.js`,
    library: PLUGIN_NAME,
    libraryTarget: 'umd',
    // Keeps this bundle's chunk loader apart from the client's and other plugins' webpack runtimes.
    uniqueName: PLUGIN_NAME,
    globalObject: 'this',
  },
  devServer: {
    allowedHosts: 'all',
    port: 4701,
    host: '0.0.0.0',
    hot: false,
    liveReload: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization, ngrok-skip-browser-warning',
    },
    client: {
      overlay: false,
      webSocketURL: {
        hostname: 'localhost',
        port: 4701,
        protocol: 'ws',
      },
    },
    onBeforeSetupMiddleware: (devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Serve manifest.json from the project root when requested at /manifest.json
      devServer.app.get('/manifest.json', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'manifest.json'));
      });
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.tsx', '.ts'],
  },
  performance: {
    // three.js alone is ~600 KB minified, and it ships inside the single bundle.
    maxAssetSize: 2 * 1024 * 1024,
    maxEntrypointSize: 2 * 1024 * 1024,
  },
  plugins: [
    // BBB loads only the manifest's javascriptEntrypointUrl, so a split chunk fails to load.
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: './' },
        { from: 'public/locales/', to: './locales/' },
      ],
    }),
  ],
};
