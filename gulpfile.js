var gulp = require('gulp');
var del = require('del');
var ts = require('gulp-typescript');
var tsConfig = require('./tsconfig.json');
var merge = require('merge2');
var rollup = require('rollup');
var rollupTypeScript = require('rollup-plugin-typescript');
var rollupReplace = require('rollup-plugin-replace');
var rollupBabel = require('rollup-plugin-babel');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

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

gulp.task('dist:umd', ['dist:es6'], function() {
  return rollup.rollup({
    entry: 'dist/es6/kivi.js',
    plugins: [
      rollupReplace({
        delimiters: ['<@', '@>'],
        values: {
          KIVI_DEBUG: 'DEBUG_DISABLED'
        }
      }),
      rollupBabel({
        presets: ['es2015-rollup']
      }),
    ]
  }).then(function(bundle) {
    return bundle.write({
      format: 'umd',
      moduleName: 'kivi',
      dest: 'dist/umd/kivi.js',
    });
  });
});

gulp.task('dist:umd.min', ['dist:umd'], function() {
  return gulp.src('dist/umd/kivi.js')
    .pipe(uglify())
    .pipe(rename('kivi.min.js'))
    .pipe(gulp.dest('dist/umd'));
});

gulp.task('dist', ['dist:cjs', 'dist:es6', 'dist:umd.min']);

gulp.task('build:tests', function() {
  return rollup.rollup({
    entry: 'tests/index.spec.ts',
    plugins: [
      rollupTypeScript(),
      rollupReplace({
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

gulp.task('examples:ts', function() {
  return gulp.src(['examples/**/*.ts'])
    .pipe(ts({
      target: 'es6',
      noImplicitAny: true,
      removeComments: false,
      moduleResolution: 'node'
    }))
    .pipe(gulp.dest('build/examples'));
});

gulp.task('examples:html', function() {
  return gulp.src(['examples/**/*.html'])
    .pipe(gulp.dest('build/examples'));
});

gulp.task('examples', ['examples:html']);