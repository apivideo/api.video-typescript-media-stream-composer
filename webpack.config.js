const webpack = require('webpack');

module.exports = {
    entry: {
        uploader: ['core-js/stable/promise', './src/index.ts']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        libraryTarget: 'umd',
        filename: 'index.js',
        globalObject: 'this'
    },
    plugins: [
        new webpack.DefinePlugin({
            __PACKAGE_VERSION__: JSON.stringify(require('./package.json').version),
        })
    ]
};
