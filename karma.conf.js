module.exports = function(config) {
  config.set({
    frameworks: ['systemjs', 'jasmine'],
    files: ['tests/*.spec.ts'],

    colors: true,
    autoWatch: true,

    browsers: ['Chrome'],
    reporters: ['progress'],

    systemjs: {
      config: {
        transpiler: 'typescript',
        packages: {
          'lib': {'defaultExtension': 'ts'},
          'tests': {'defaultExtension': 'ts'}
        },
        paths: {
          'systemjs': 'node_modules/systemjs/dist/system.js',
          'system-polyfills': 'node_modules/systemjs/dist/system-polyfills.js',
          'es6-module-loader': 'node_modules/es6-module-loader/dist/es6-module-loader.js',
          'typescript': 'node_modules/typescript/lib/typescript.js',
        }
      },
      serveFiles: [
        'lib/**/*.ts'
      ]
    }
  })
};
