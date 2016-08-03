# Getting Started

In this chapter we will create a simple javascript project that will use kivi library.

## Create a new project

Create a new directory for your project.

```sh
$ mkdir kivi-project
$ cd kivi-project
```

Initialize npm package.

```sh
$ npm init
```

Create a project structure:

```
kivi-project
├── web
│   └── index.html
├── src
│   └── main.js
├── rollup.config.js
├── rollup.config.debug.js
└── package.json
```

## Install npm packages

Npm package `kivi` provides commonjs modules, es6 modules and TypeScript typings.

```sh
$ npm install --save kivi
```

In this guide we will be using [Rollup](http://rollupjs.org) and [Babel](https://babeljs.io/) to build
application. But it works perfectly fine with [jspm](http://jspm.io/), [browserify](http://browserify.org/) or
[Webpack](https://webpack.github.io/) bundlers and [Buble](https://gitlab.com/Rich-Harris/buble) or
[Google Closure Compiler](https://github.com/google/closure-compiler) es6 compilers.

```sh
$ npm install --save-dev rollup rollup-plugin-{replace,node-resolve,babel}
                         babel babel-preset-es2015-rollup
```

## Edit `web/index.html` file

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>kivi guide example</title>
  <meta name="description" content="">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
</body>
<script src="bundle.js"></script>
</html>
```

## Edit `src/main.js` file

```js
import {ComponentDescriptor, injectComponent} from "kivi";

const Main = new ComponentDescriptor()
  .update((c, props) => {
    c.element.textContent = `Hello ${props.text}`;
  });

injectComponent(Main, document.body, {text: "World"});
```

## Edit `rollup.config.js` file

Rollup config file for production builds:

```js
import babel from "rollup-plugin-babel";
import npm from "rollup-plugin-node-resolve";
import replace from "rollup-plugin-replace";

export default {
  entry: "src/main.js",
  format: "umd",
  plugins: [
    npm(),
    babel({
      presets: ["es2015-rollup"]
    }),
    replace({
      delimiters: ["<@", "@>"],
      sourceMap: true,
      values: {
        KIVI_DEBUG: "DEBUG_DISABLED"
      }
    }),
  ],
  sourceMap: true,
  moduleName: "app",
};
```

## Edit `rollup.config.debug.js` file

Rollup config file for debug builds:

```js
import babel from "rollup-plugin-babel";
import npm from "rollup-plugin-node-resolve";

export default {
  entry: "src/main.js",
  format: "umd",
  plugins: [
    npm(),
    babel({
      presets: ["es2015-rollup"],
    }),
  ],
  sourceMap: true,
  moduleName: "app",
};
```

## Edit `package.json` file

Add build commands to the `scripts` section:

```json
{
  "scripts": {
    "build:prod": "rollup -c rollup.config.js -o web/bundle.js",
    "build:debug": "rollup -c rollup.config.debug.js -o web/bundle.js"
  }
}
```

## Build application

```sh
$ npm run build:prod
```

## Launch application in a browser

```sh
$ google-chrome ./web/index.html
```
