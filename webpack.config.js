const config = {
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'source-map-loader',
        ]
      }
    ],
  }
};

export default config;
