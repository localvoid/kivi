var gulp = require("gulp");
var del = require("del");
var ts = require("gulp-typescript");
var tslint = require("gulp-tslint");
var tsConfig = require("./tsconfig.json");
var merge = require("merge2");
var rollup = require("rollup");
var rollupTypeScript = require("rollup-plugin-typescript");
var rollupReplace = require("rollup-plugin-replace");
var rollupBabel = require("rollup-plugin-babel");

gulp.task("clean", del.bind(null, ["dist", "build"]));

gulp.task("build:es6", function() {
  var result = gulp.src(["lib/**/*.ts"])
    .pipe(tslint())
    .pipe(tslint.report("verbose", {
      emitError: false
    }))
    .pipe(ts(Object.assign(tsConfig.compilerOptions, {
      target: "es6",
      module: undefined,
      declaration: true,
    })));

  return merge([
    result.dts.pipe(gulp.dest("dist/typings")),
    result.js.pipe(gulp.dest("build/es6"))
  ]);
});

gulp.task("dist:es6", ["build:es6"], function() {
  return rollup.rollup({
    entry: "build/es6/kivi.js",
  }).then(function(bundle) {
    return bundle.write({
      format: "es6",
      dest: "dist/es6/kivi.js",
    });
  });
});

gulp.task("dist:umd", ["build:es6"], function() {
  return rollup.rollup({
    entry: "build/es6/kivi.js",
    plugins: [
      rollupBabel({
        presets: ["es2015-rollup"]
      }),
    ]
  }).then(function(bundle) {
    return bundle.write({
      format: "umd",
      moduleName: "kivi",
      dest: "dist/umd/kivi.js",
    });
  });
});

gulp.task("dist", ["dist:es6", "dist:umd"]);

gulp.task("build:tests", function() {
  return rollup.rollup({
    entry: "tests/index.spec.ts",
    plugins: [
      rollupTypeScript(),
      rollupReplace({
        delimiters: ["<@", "@>"],
        values: {
          KIVI_COMPONENT_RECYCLING: "COMPONENT_RECYCLING_ENABLED"
        }
      }),
    ]
  }).then(function(bundle) {
    return bundle.write({
      format: "iife",
      dest: "build/tests.js",
      sourceMap: "inline",
    });
  });
});

gulp.task("test", ["build:tests"], function(done) {
  var KarmaServer = require("karma").Server;

  new KarmaServer({
    configFile: __dirname + "/karma.conf.js",
    singleRun: true,
  }, done).start();
});

gulp.task("examples:ts", function() {
  return gulp.src(["examples/**/*.ts"])
    .pipe(ts({
      target: "es6",
      noImplicitAny: true,
      removeComments: false,
      moduleResolution: "node"
    }))
    .pipe(gulp.dest("build/examples"));
});

gulp.task("examples:html", function() {
  return gulp.src(["examples/**/*.html"])
    .pipe(gulp.dest("build/examples"));
});

gulp.task("examples", ["examples:html"]);
