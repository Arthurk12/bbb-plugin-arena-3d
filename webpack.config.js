/* eslint-disable @typescript-eslint/no-var-requires */
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

const PLUGIN_NAME = 'BbbPluginArena3d';

module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: `${PLUGIN_NAME}.js`,
    // The game (three.js) is a separate chunk, fetched only by people who open the arena.
    chunkFilename: `${PLUGIN_NAME}.[name].[contenthash:8].js`,
    library: PLUGIN_NAME,
    libraryTarget: 'umd',
    // Chunks load from wherever the bundle was loaded from (read from its <script> at startup).
    publicPath: 'auto',
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
  optimization: {
    // The game and three.js download together, in one request.
    splitChunks: false,
  },
  performance: {
    // three.js alone is ~600 KB minified, in the game's chunk.
    maxAssetSize: 2 * 1024 * 1024,
    maxEntrypointSize: 2 * 1024 * 1024,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: './' },
        { from: 'public/locales/', to: './locales/' },
      ],
    }),
  ],
};
