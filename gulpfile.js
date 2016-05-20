const gulp = require("gulp");
const del = require("del");
const tsConfig = require("./tsconfig.json");
const rollup = require("rollup");
const rollupTypeScript = require("rollup-plugin-typescript");
const rollupReplace = require("rollup-plugin-replace");

gulp.task("clean", del.bind(undefined, ["dist", "build"]));

gulp.task("build:es6", () => {
  const ts = require("gulp-typescript");
  const tslint = require("gulp-tslint");
  const merge = require("merge2");

  const result = gulp.src(["lib/**/*.ts"])
    .pipe(tslint())
    .pipe(tslint.report("verbose", {
      emitError: false,
    }))
    .pipe(ts(Object.assign(tsConfig.compilerOptions, {
      typescript: require("typescript"),
      target: "es6",
      declaration: true,
    })));

  return merge([
    result.dts.pipe(gulp.dest("dist/typings")),
    result.js.pipe(gulp.dest("build/es6")),
  ]);
});

gulp.task("dist:es6", gulp.series("build:es6", () => {
  return rollup.rollup({
    entry: "build/es6/kivi.js",
  }).then(function(bundle) {
    return bundle.write({
      format: "es6",
      dest: "dist/es6/kivi.js",
    });
  });
}));

gulp.task("dist:umd", () => {
  return rollup.rollup({
    entry: "lib/kivi.ts",
    plugins: [
      rollupTypeScript(Object.assign(tsConfig.compilerOptions, {
        typescript: require("typescript"),
        target: "es5",
        module: "es6",
        declaration: false,
      })),
    ],
  }).then((bundle) => {
    return bundle.write({
      format: "umd",
      moduleName: "kivi",
      dest: "dist/umd/kivi.js",
    });
  });
});

gulp.task("build:tests", () => {
  return rollup.rollup({
    entry: "tests/index.spec.ts",
    plugins: [
      rollupTypeScript(Object.assign(tsConfig.compilerOptions, {
        typescript: require("typescript"),
        target: "es5",
        module: "es6",
        declaration: false,
      })),
      rollupReplace({
        delimiters: ["<@", "@>"],
        values: {
          KIVI_COMPONENT_RECYCLING: "COMPONENT_RECYCLING_ENABLED"
        }
      }),
    ],
  }).then(function(bundle) {
    return bundle.write({
      format: "iife",
      dest: "build/tests.js",
      sourceMap: "inline",
    });
  });
});

gulp.task("build:random-tests.html", () => {
  return gulp.src("tests/random/children_reconciliation.html")
    .pipe(gulp.dest("build"));
})

gulp.task("build:random-tests", gulp.series("build:random-tests.html", () => {
  return rollup.rollup({
    entry: "tests/random/children_reconciliation.ts",
    plugins: [
      rollupTypeScript(Object.assign(tsConfig.compilerOptions, {
        typescript: require("typescript"),
        target: "es5",
        module: "es6",
        declaration: false,
      })),
    ],
  }).then(function(bundle) {
    return bundle.write({
      format: "iife",
      dest: "build/children_reconciliation.js",
      sourceMap: "inline",
    });
  });
}));

gulp.task("test", gulp.series("build:tests", (done) => {
  const KarmaServer = require("karma").Server;

  new KarmaServer({
    configFile: __dirname + "/karma.conf.js",
    singleRun: true,
  }, done).start();
}));

gulp.task("test:sauce", gulp.series("build:tests", (done) => {
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
}));

gulp.task("docs", (done) => {
  const gitbook = require("gitbook");

  const book = new gitbook.Book("docs", {
    config: {
      output: "gh-pages",
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

  return book.parse().then(() => {
    return book.generate("website");
  });
});

gulp.task("gh-pages", gulp.series("docs", () => {
  const ghPages = require("gulp-gh-pages");

  return gulp.src("gh-pages/**/*")
    .pipe(ghPages());
}));

gulp.task("dist", gulp.series("clean", gulp.parallel(["dist:es6", "dist:umd"])));
