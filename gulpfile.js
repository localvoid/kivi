var gulp = require('gulp');
var del = require('del');
var sourcemaps = require('gulp-sourcemaps');
var closureCompiler = require('google-closure-compiler').gulp();
var KarmaServer = require('karma').Server;

var DEST = './build';
var CLOSURE_OPTS = {
  define: [
    'kivi.DEBUG=true'
  ],
  dependency_mode: 'STRICT',
  entry_point: 'goog:tests',
  compilation_level: 'SIMPLE_OPTIMIZATIONS',
  formatting: 'PRETTY_PRINT',
  language_in: 'ECMASCRIPT6_STRICT',
  language_out: 'ECMASCRIPT5_STRICT',
  externs: ['./node_modules/closure-externs-mocha/mocha.js'],
  output_wrapper: '(function(){%output%}).call();',
  summary_detail_level: 3
};

gulp.task('clean', del.bind(null, [DEST]));

gulp.task('js:tests:vdom', function() {
  var opts = Object.create(CLOSURE_OPTS);
  opts['js_output_file'] = 'vdom.spec.js';

  return gulp.src(['tests/vdom.spec.js', 'src/**/*.js'])
      .pipe(sourcemaps.init())
      .pipe(closureCompiler(opts))
      .pipe(sourcemaps.write(DEST + '/tests/'))
      .pipe(gulp.dest(DEST + '/tests/'));
});

gulp.task('test', ['js:tests:vdom'], function(done) {
  new KarmaServer({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done).start();
});
