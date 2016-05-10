[![Build status](https://img.shields.io/travis/localvoid/kivi.svg?maxAge=2592000&style=flat-square)](https://travis-ci.org/localvoid/kivi)
[![Npm version](https://img.shields.io/npm/v/kivi.svg?maxAge=2592000&style=flat-square)](https://www.npmjs.com/package/kivi)
[![Npm downloads](https://img.shields.io/npm/dm/kivi.svg?maxAge=2592000&style=flat-square)](https://www.npmjs.com/package/kivi)
[![License](https://img.shields.io/npm/l/kivi.svg?maxAge=2592000&style=flat-square)](https://www.npmjs.com/package/kivi)

[Kivi](http://github.com/localvoid/kivi) is a javascript (TypeScript) library
for building web user interfaces. It provides Virtual DOM API for DOM
manipulations, Components, and Scheduler tightly integrated with Components. It
doesn't have a router, or anything that is related to application state, kivi
is just a view library.

## Example

```js
import {ComponentDescriptor, injectComponent} from "kivi";

const HelloWorld = new ComponentDescriptor()
  .vRender((c, root) => { root.children(`Hello ${c.props}`); });

injectComponent(Main, document.body, "World");
```

## Documentation

- [kivi guide](http://localvoid.github.io/kivi/)

## Demos

- [Intro](https://github.com/localvoid/kivi/tree/master/examples/intro)
- [Stateful Component](https://github.com/localvoid/kivi/tree/master/examples/stateful_component)
- [Canvas](https://github.com/localvoid/kivi/tree/master/examples/canvas)
- [TodoMVC](https://github.com/localvoid/kivi-todomvc/)

## Performance Benchmarks

- [uibench](https://localvoid.github.io/uibench/)
- [dbmonster](https://localvoid.github.io/kivi-dbmonster/)
- [dbmonster (incremental)](https://localvoid.github.io/kivi-dbmonster/?incremental=5)

## License

MIT