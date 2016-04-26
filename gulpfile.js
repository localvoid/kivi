var gulp = require('gulp');
var ts = require('gulp-typescript');
var tsConfig = require('./tsconfig.json');

gulp.task('dist:cjs', function() {
  return gulp.src(['index.ts', 'lib/**/*.ts', 'typings/browser.d.ts'])
    .pipe(ts(Object.assign(tsConfig.compilerOptions, {
      target: 'es5',
      module: 'commonjs'
    })))
    .pipe(gulp.dest('dist/cjs'));
});

gulp.task('dist:es6', function() {
  return gulp.src(['index.ts', 'lib/**/*.ts'])
    .pipe(ts(Object.assign(tsConfig.compilerOptions, {
      target: 'es6',
      module: undefined,
    })))
    .pipe(gulp.dest('dist/es6'));
});

gulp.task('dist', ['dist:cjs', 'dist:es6']);

gulp.task('test', function(done) {
  var KarmaServer = require('karma').Server;

  new KarmaServer({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done).start();
});
