# Reactive Bindings

Reactive bindings in kivi are implemented with a simple `Invalidator` objects, UI Components can subscribe and listen
for invalidation signals with methods `subscribe` and `transientSubscribe`. The difference between subscriptions and
transient subscriptions is that transient subscriptions will be automatically canceled when UI Component is invalidated,
so UI Component should resubscribe each time it updates its representation, transient subscriptions are useful when
subscriptions may change over time.

Invalidator objects are way much simpler than composable streams, or implicit graphs of data dependencies, they
doesn't pass any information except the signal that something is changed. Because all subscriptions are explicit it also
has a predictable performance and it is easier to review code.

It was designed to get rid of data changes over time in as much places as possible, so instead of pushing/pulling
data from streams, we just reevaluate everything and using caches to prevent from unnecessary computations. This
programming model is significantly simpler and provides a better debugging experience, especially when investigating
bugs from stack traces in production builds.

```ts
const mode: "a" | "b" = "a";
const a = 0;
const b = 0;
const modeInvalidator = new Invalidator();
const aInvalidator = new Invalidator();
const bInvalidator = new Invalidator();

const Main = new ComponentDescriptor<void, void>()
  .attached((c) => {
    c.subscribe(modeInvalidator);
  })
  .update((c) => {
    let value: number;
    if (mode === "a") {
      value = a;
      c.transientSubscribe(aInvalidator);
    } else {
      value = b;
      c.transientSubscribe(bInvalidator);
    }
    c.sync(c.createVRoot().children(value.toString()));
  });

function update() {
  if (mode === "a") {
    a++;
    aInvalidator.invalidate();
    if (a === 10) {
      a = 0;
      mode = "b";
      modeInvalidator.invalidate();
    }
  } else {
    b++;
    bInvalidator.invalidate();
    if (b === 10) {
      b = 0;
      mode = "a";
      modeInvalidator.invalidate();
    }
  }
  setTimeout(1000, update);
}
setTimeout(1000, update);

injectComponent(Main, document.body);
```
