module.exports = function(config) {
  config.set({
    browsers: ['Chrome'],
    frameworks: ['mocha', 'chai'],

    files: [
      'build/tests/*.spec.js'
    ],

    preprocessors: {
      '**/*.js': ['sourcemap']
    },

    reporters: ['mocha'],

    mochaReporter: {
      colors: {
        success: 'green',
        info: 'bgYellow',
        warning: 'cyan',
        error: 'bgRed'
      },
      divider: ''
    },

    port: 9876,
    colors: true
  });
};
