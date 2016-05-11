# kivi

[Kivi](http://github.com/localvoid/kivi) is a javascript (TypeScript) library for building web user interfaces. It
provides Virtual DOM API for DOM manipulations, Components, and Scheduler tightly integrated with Components. It doesn't
have a router, or anything that is related to application state, kivi is just a view library.

Virtual DOM in kivi is just another API for DOM manipulations and can be used side by side with direct DOM
manipulations.

## Example

Simple application with a component that prints "Hello World".

```js
import {ComponentDescriptor, injectComponent} from "kivi";

const HelloWorld = new ComponentDescriptor()
  .vRender((c, root) => {
    root.children(`Hello ${c.props}`);
  });

injectComponent(Main, document.body, "World");
```

## Performance

Kivi has one of the fastest Virtual DOM implementations, it was designed from the ground up with high performance in
mind.

Benchmarks:

- [uibench](https://localvoid.github.io/uibench/)
- [dbmonster](https://localvoid.github.io/kivi-dbmonster/)
- [dbmonster (incremental)](https://localvoid.github.io/kivi-dbmonster/?incremental=5)
