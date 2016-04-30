var gulp = require('gulp');
var gutil = require('gulp-util');
var del = require('del');
var ts = require('gulp-typescript');
var tsConfig = require('./tsconfig.json');
var merge = require('merge2');
var rollup = require('rollup');

gulp.task('clean', del.bind(null, ['dist']));

gulp.task('dist:cjs', function() {
  return gulp.src(['lib/**/*.ts', 'typings/browser.d.ts'])
    .pipe(ts(Object.assign(tsConfig.compilerOptions, {
      target: 'es5',
      module: 'commonjs',
    })))
    .pipe(gulp.dest('dist/cjs'));
});

gulp.task('dist:es6', function() {
  var result = gulp.src(['lib/**/*.ts'])
    .pipe(ts(Object.assign(tsConfig.compilerOptions, {
      target: 'es6',
      module: undefined,
      declaration: true,
    })));

  return merge([
    result.dts.pipe(gulp.dest('dist/typings')),
    result.js.pipe(gulp.dest('dist/es6'))
  ]);
});

gulp.task('dist', ['dist:cjs', 'dist:es6']);

gulp.task('build:tests', function() {
  return rollup.rollup({
    entry: 'tests/index.spec.ts',
    plugins: [
      require('rollup-plugin-typescript')(),
      require('rollup-plugin-replace')({
        delimiters: ['<@', '@>'],
        values: {
          KIVI_COMPONENT_RECYCLING: 'COMPONENT_RECYCLING_ENABLED'
        }
      }),
    ]
  }).then(function(bundle) {
    return bundle.write({
      format: 'iife',
      dest: 'build/tests.js',
      sourceMap: 'inline',
    });
  });
});

gulp.task('test', ['build:tests'], function(done) {
  var KarmaServer = require('karma').Server;

  new KarmaServer({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
  }, done).start();
});
