Kivi project is all about winning benchmarks, I don't think that many of its benchmark specific "optimizations" are
useful in real projects. It doesn't have really important feature for building reusable components, it is impossible
to return Components as a root node for another component (HOCs that just wrap another components). This tradeoff
was made to implement efficient event delegation because we need to map 1-1 DOM Nodes with Component instances.
Its API is quite ugly, all API decisions were made to squeeze out the latest bits of performance, right now
profiler reports are mostly dominated by "native" code.

This project was an inspiration for many other libraries, if you want to learn how to build a really fast web UI
library, take a look at its source code. Code base are quite ugly, but most of the time it was made this way to win
benchmarks.

I don't think that tradeoffs that were made to win benchmarks are worth it, so I've created
[ivi](https://github.com/ivijs/ivi) library, it is using all the good parts of the kivi library, and is all about
developer productivity without any benchmark specific optimizations, it won't be able to win all benchmarks, but it
really doesn't matter, because winning benchmarks is not just optimizations in a library, benchmark implementations
for the fastest libraries are implemented in non-idiomatic ways, and libraries are mostly optimized for this
non-idiomatic code that nobody would ever write. Some benchmark specific optimizations are actually would hurt
real applications, I've tried to stay away from them in kivi, but I've noticed that other developers are okay with
that and just want to get better numbers in benchmarks.

[ivi](https://github.com/ivijs/ivi) library is optimized for idiomatic code. It also fixes some long-standing issues
that are common to all React-like libraries, like completely broken Contexts.

## Example

```js
import {ComponentDescriptor, injectComponent} from "kivi";

const Main = new ComponentDescriptor()
  .update((c, props) => {
     c.sync(c.createVRoot().child(`Hello ${props.name}`));
  });

injectComponent(Main, document.body, {name: "World"});
```

## Documentation

* [Getting Started](https://localvoid.github.io/kivi/01_getting_started.html)
* Basics
  * [Components](https://localvoid.github.io/kivi/basics/01_components.html)
  * [Virtual DOM](https://localvoid.github.io/kivi/basics/02_virtual_dom.html)
* Advanced
  * [Element Descriptor](https://localvoid.github.io/kivi/advanced/01_element_descriptor.html)
  * [Scheduler](https://localvoid.github.io/kivi/advanced/02_scheduler.html)
  * [Components](https://localvoid.github.io/kivi/advanced/03_components.html)
  * [Virtual DOM](https://localvoid.github.io/kivi/advanced/04_virtual_dom.html)
  * [Events](https://localvoid.github.io/kivi/advanced/05_events.html)
  * [Reactive Bindings](https://localvoid.github.io/kivi/advanced/06_reactive_bindings.html)
* Experimental
  * [Incremental Rendering](https://localvoid.github.io/kivi/experimental/01_incremental_rendering.html)

## Examples

- [Intro](https://github.com/localvoid/kivi/tree/master/examples/intro)
- [Stateful Component](https://github.com/localvoid/kivi/tree/master/examples/stateful_component)
- [Canvas](https://github.com/localvoid/kivi/tree/master/examples/canvas)
- [TodoMVC](https://github.com/localvoid/kivi-todomvc/)

## Performance

Kivi has one of the fastest Virtual DOM implementations, it was designed from the ground up with high performance in
mind.

Benchmarks:

- [uibench](https://cdn.rawgit.com/localvoid/6715c4b23eadc460112e671b4add3710/raw/907901966dd0473f1026d1ff25e244a022eb5ab1/uibench_results.html)
- [dbmonster](https://localvoid.github.io/kivi-dbmonster/)
- [10k components](https://localvoid.github.io/kivi-dbmonster/10k.html)
