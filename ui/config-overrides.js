module.exports = {
    // The Webpack config to use when compiling your react app for development or production.
    webpack: function(config, env) {
        // ...add your webpack config
        config.output.filename = 'test.js';
        config.optimization.splitChunks = {
            cacheGroups: {
                default: false,
            },
        };
        config.watch = true;
        config.optimization.runtimeChunk = false;
        return config;
    },
    devServer: function(configFunction) {
        return function(proxy, allowedHost) {
            // Create the default config by calling configFunction with the proxy/allowedHost parameters
            const config = configFunction(proxy, allowedHost);

            config.writeToDisk = true;
            // Return your customised Webpack Development Server config.
            return config;
        };
    },
}
