module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: [
      'build/tests.js',
      {pattern: 'lib/**/*.ts', included: false, watched: false},
      {pattern: 'tests/**/*.ts', included: false, watched: false},
    ],

    preprocessors: {
      'build/tests.js': ['sourcemap']
    },

    colors: true,
    autoWatch: true,

    browsers: ['Chrome'],
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 2,
    browserNoActivityTimeout: 30000,

    sauceLabs: {
      testName: 'kivi',
      retryLimit: 3,
      startConnect: true,
      recordVideo: false,
      recordScreenshots: false,
      options: {
        'command-timeout': 600,
        'idle-timeout': 600,
        'max-duration': 5400,
      }
    },

    customLaunchers: {
      sl_chrome: {
        base: 'SauceLabs',
        browserName: 'chrome',
        version: '47',
      },
      sl_firefox: {
        base: 'SauceLabs',
        browserName: 'firefox',
        version: '43'
      },
      sl_safari_9: {
        base: 'SauceLabs',
        browserName: 'safari',
        platform: 'OS X 10.11',
        version: '9'
      },
      sl_ie_11: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows 8.1',
        version: '11'
      },
      sl_ios: {
        base: "SauceLabs",
        browserName: "iphone",
        platform: "OS X 10.10",
        version: "8.1"
      },
    },

    reporters: ['progress', 'saucelabs'],
  });

  if (process.env.TRAVIS) {
    var buildLabel = 'TRAVIS #' + process.env.TRAVIS_BUILD_NUMBER + ' (' + process.env.TRAVIS_BUILD_ID + ')';

    config.logLevel = config.LOG_DEBUG;
    config.browserNoActivityTimeout = 120000;

    config.sauceLabs.build = buildLabel;
    config.sauceLabs.startConnect = false;
    config.sauceLabs.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;
    config.sauceLabs.recordScreenshots = true;

    // Allocating a browser can take pretty long (eg. if we are out of capacity and need to wait
    // for another build to finish) and so the `captureTimeout` typically kills
    // an in-queue-pending request, which makes no sense.
    config.captureTimeout = 0;
  }
};
