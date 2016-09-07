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

const Main = new ComponentDescriptor()
  .update((c, props) => {
    c.sync(c.createVRoot().child(`Hello ${props.name}`));
  });

injectComponent(Main, document.body, {name: "World"});
```

## Performance

Kivi has one of the fastest Virtual DOM implementations, it was designed from the ground up with high performance in
mind.

Benchmarks:

- [uibench](https://localvoid.github.io/uibench/)
- [dbmonster](https://localvoid.github.io/kivi-dbmonster/)
- [dbmonster (incremental)](https://localvoid.github.io/kivi-dbmonster/incremental.html)
- [10k components](https://localvoid.github.io/kivi-dbmonster/10k.html)
