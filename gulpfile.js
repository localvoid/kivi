const gulp = require("gulp");
const series = gulp.series;
const parallel = gulp.parallel;
const del = require("del");
const tsConfig = require("./tsconfig.json");
const ts = require("gulp-typescript");
const rollup = require("rollup");
const rollupReplace = require("rollup-plugin-replace");
const merge = require("merge2");

function clean() {
  return del(["dist", "build"]);
}

function cleanTests() {
  return del("build/tests");
}

function buildES6() {
  const tsProject = ts.createProject("tsconfig.json", {
    typescript: require("typescript"),
    target: "es6",
    declaration: true,
  });

  const tsResult = tsProject.src()
    .pipe(tsProject());

  return merge([
    tsResult.dts.pipe(gulp.dest("build/typings")),
    tsResult.js.pipe(gulp.dest("build/es6"))
  ]);
}

function buildES5() {
  const tsProject = ts.createProject("tsconfig.json", {
    typescript: require("typescript"),
    target: "es5",
    module: "es6",
  });

  const tsResult = tsProject.src()
    .pipe(tsProject());

  return tsResult.js.pipe(gulp.dest("build/es5"));
}

function dist() {
  return rollup.rollup({
    entry: "build/es6/lib/kivi.js",
  }).then((bundle) => Promise.all([
    bundle.write({
      format: "es",
      dest: "dist/es6/kivi.js",
    }),
    bundle.write({
      format: "umd",
      moduleName: "kivi",
      dest: "dist/umd/kivi.js",
    }),
  ]));
}

function typings() {
  return gulp.src("build/typings/lib/**/*.ts")
    .pipe(gulp.dest("dist/typings"));
}

function buildTests() {
  return rollup.rollup({
    entry: "build/es5/tests/index.spec.js",
    plugins: [
      rollupReplace({
        delimiters: ["<@", "@>"],
        values: {
          KIVI_COMPONENT_RECYCLING: "COMPONENT_RECYCLING_ENABLED"
        }
      }),
    ],
  }).then((bundle) => bundle.write({
    format: "iife",
    dest: "build/tests.js",
    sourceMap: "inline",
  }));
}

function buildFuzzyTestsHtml() {
  return gulp.src("tests/random/children_reconciliation.html")
    .pipe(gulp.dest("build"));
}

function buildFuzzyTestsJS() {
  return rollup.rollup({
    entry: "tests/random/children_reconciliation.ts",
    plugins: [
      rollupTypeScript(Object.assign({}, tsConfig.compilerOptions, {
        typescript: require("typescript"),
        target: "es5",
        module: "es6",
        declaration: false,
      })),
    ],
  }).then(function (bundle) {
    return bundle.write({
      format: "iife",
      dest: "build/children_reconciliation.js",
      sourceMap: "inline",
    });
  });
}

function runTests(done) {
  const KarmaServer = require("karma").Server;

  new KarmaServer({
    configFile: __dirname + "/karma.conf.js",
    singleRun: true,
  }, done).start();
}

function runTestsSauce(done) {
  const KarmaServer = require("karma").Server;

  new KarmaServer({
    configFile: __dirname + "/karma.conf.js",
    browsers: [
      "Chrome",
      "sl_chrome",
      "sl_firefox",
      "sl_safari_9",
      "sl_ie_11",
    ],
    reporters: ["progress", "saucelabs"],
    singleRun: true,
  }, done).start();
}

function buildDocs() {
  const gitbook = require("gitbook");

  const book = new gitbook.Book("gitbook", {
    config: {
      output: "docs",
      title: "kivi",
      plugins: ["edit-link", "github", "anker-enable", "ga"],
      pluginsConfig: {
        "edit-link": {
          "base": "https://github.com/localvoid/kivi/tree/master/docs",
          "label": "Edit This Page",
        },
        "github": {
          "url": "https://github.com/localvoid/kivi/",
        },
        "ga": {
          "token": "UA-39594570-5",
        },
      },
    },
  });

  return book.parse().then(() => book.generate("website"));
}

exports.clean = clean;
exports.dist = series(clean, buildES6, dist, typings);
exports.test = series(clean, buildES5, buildTests, runTests);
exports.testSauce = series(clean, buildES5, buildTests, runTestsSauce);
exports.docs = buildDocs;
exports.buildFuzzyTests = parallel(buildFuzzyTestsHtml, buildFuzzyTestsJS);
