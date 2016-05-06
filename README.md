[Kivi](http://github.com/localvoid/kivi) is a javascript (TypeScript) library
for building web user interfaces. It provides Virtual DOM API for DOM
manipulations, Components, and Scheduler tightly integrated with Components. It
doesn't have a router, or anything that is related to application state, kivi
is just a view library.

[Kivi Guide](https://localvoid.gitbooks.io/kivi-guide/content/).

## Example

```js
import {ComponentDescriptor, createVRoot, injectComponent} from 'kivi';

const HelloWorld = new ComponentDescriptor()
  .update((c) => {
    c.sync(createVRoot().children(`Hello ${c.data}`));
  });

injectComponent(Main, document.body, 'World');
```

## Demos

- [Intro](https://github.com/localvoid/kivi/tree/master/examples/intro)
- [Stateful Component](https://github.com/localvoid/kivi/tree/master/examples/stateful_component)
- [Canvas](https://github.com/localvoid/kivi/tree/master/examples/canvas)

## Performance Benchmarks

- [uibench](https://localvoid.github.io/uibench/)
- [dbmonster](https://localvoid.github.io/kivi-dbmonster/)
- [dbmonster (incremental)](https://localvoid.github.io/kivi-dbmonster/?incremental=5)

## License

MIT