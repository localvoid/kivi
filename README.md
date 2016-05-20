[![Build status](https://img.shields.io/travis/localvoid/kivi.svg?style=flat-square)](https://travis-ci.org/localvoid/kivi)
[![Npm version](https://img.shields.io/npm/v/kivi.svg?style=flat-square)](https://www.npmjs.com/package/kivi)
[![Npm downloads](https://img.shields.io/npm/dm/kivi.svg?style=flat-square)](https://www.npmjs.com/package/kivi)
[![License](https://img.shields.io/npm/l/kivi.svg?style=flat-square)](https://www.npmjs.com/package/kivi)

[Kivi](http://github.com/localvoid/kivi) is a javascript (TypeScript) library for building web user interfaces. It
provides an Actor model for application state, Virtual DOM API for DOM manipulations, UI Components, and Scheduler
tightly integrated with Actors and UI Components.

[Kivi JSFiddle](https://jsfiddle.net/localvoid/42ofn4ud/)

## Example

```js
import {ComponentDescriptor, injectComponent} from "kivi";

const Main = new ComponentDescriptor()
  .update((c, props) => {
     c.vSync(c.createVRoot.children(`Hello ${props.name}`));
  });

injectComponent(Main, document.body, {name: "World"});
```

## Documentation

* [Getting Started](https://localvoid.github.io/kivi/01_getting_started.html)
* Basics
  * [Components](https://localvoid.github.io/kivi/basics/01_components.html)
  * [Virtual DOM](https://localvoid.github.io/kivi/basics/02_virtual_dom.html)
* Advanced
  * [VModel](https://localvoid.github.io/kivi/advanced/01_vmodel.html)
  * [Scheduler](https://localvoid.github.io/kivi/advanced/02_scheduler.html)
  * [Components](https://localvoid.github.io/kivi/advanced/03_components.html)
  * [Virtual DOM](https://localvoid.github.io/kivi/advanced/04_virtual_dom.html)
  * [Container Manager](https://localvoid.github.io/kivi/advanced/05_container_manager.html)

## Examples

- [Intro](https://github.com/localvoid/kivi/tree/master/examples/intro)
- [Stateful Component](https://github.com/localvoid/kivi/tree/master/examples/stateful_component)
- [Canvas](https://github.com/localvoid/kivi/tree/master/examples/canvas)
- [TodoMVC](https://github.com/localvoid/kivi-todomvc/)

## Performance

Kivi has one of the fastest Virtual DOM implementations, it was designed from the ground up with high performance in
mind.

Benchmarks:

- [uibench](https://localvoid.github.io/uibench/)
- [dbmonster](https://localvoid.github.io/kivi-dbmonster/)
- [dbmonster (incremental)](https://localvoid.github.io/kivi-dbmonster/?incremental=5)
