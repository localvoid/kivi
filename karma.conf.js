module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['closure', 'mocha', 'chai'],

    files: [
      'node_modules/google-closure-library/closure/goog/base.js',
      'tests/*.spec.js',
      {pattern: 'src/*.js', included: false}
    ],

    preprocessors: {
      'tests/*.spec.js': ['closure'],
      'src/*.js': ['closure']
    },

    reporters: ['progress'],

    port: 9876,
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    autoWatch: true,
    browsers: ['Chrome'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
