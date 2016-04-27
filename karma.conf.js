module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: [
      'build/tests.js',
      {pattern: 'lib/**/*.ts', included: false, watched: false},
      {pattern: 'tests/**/*.ts', included: false, watched: false},
    ],

    colors: true,
    autoWatch: true,

    browsers: ['Chrome'],
    reporters: ['progress'],
  });
};
