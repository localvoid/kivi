# kivi [Work in progress]

Experimental library to build Web UIs.

## Introduction

kivi is heavily influenced by the React library, Flux/Relay
architecture, and other ideas that floating around in the React
community.

The key difference in the architecture of applications built with kivi
is that instead of pushing data to the UI components/internal
services, they will pull data to prevent any unnecessary computations,
overfetching data for server-side rendering, and other problems.

If you aren't sure why you should choose this library to build UI, it
would be better if you choose React, or any other library.

## TOC

- Message Queue
- Scheduler
- Store
- Cache
- Service
- UI Component

## Message Queue

Just simple message queue with publishers and subscribers.

## Scheduler

Scheduler is used to run `Service`s and UI `Component`s.

For UI `Component`s it has a complex task queue with proper read,
write batching, priorities and interdependencies.

## Store

Stores are used to store raw data. They can have any internal
representation: simple values, lists, or any complex graph. Stores
shouldn't have interdependencies with other stores.

Each store should provide methods to get `Value` objects that defined
in the `values` property, and methods to modify internal
representation. Whenever `Value` object is modified, it should be
invalidated.

```javascript
var ExampleStore = kivi.declareStore({
  values: {
    exampleValue: {
      init: function() {
        this.data = {
          counter: 0
        };
      }
    }
  },

  init: function() {
    this.data = kivi.createValue(this.values.exampleValue);
  },

  get: function() {
    return this.data;
  },

  increment: function() {
    this.data.data.counter++;
    this.data.invalidate();
  }
});

var store = kivi.createStore(ExampleStore);
```

## Cache

Caches are used to store results of some computations. Results of this
computations represented by `Value` objects that should be defined in
the `values` property.

```javascript
function _compute(value) {
  return value * value;
}

var ExampleCache = kivi.declareCache({
  values: {
    result: {
      init: function(value) {
        this.data = {
          result: _compute(value),
          _value: value
        };
        this.subscribe(value);
      },

      update: function() {
        var newResult = _compute(this.data._value);
        if (this.data.result !== newResult) {
          this.data.result = newResult;
          return true;
        }
        return false;
      },

      disposed: function() {
        this.ctx.data = null;
      }
    }
  },

  get: function() {
    if (this.data == null) {
      this.data = kivi.createValue(store.get());
    }
    return this.data;
  }
});

var cache = kivi.createCache(ExampleCache);
```

## Service

Services are used to perform any internal work.

## UI Component

Each UI Component is just a service that throttled by the Scheduler to
perform any internal work when new frame is rendered.

To make it easy to perform updates to the DOM, kivi implements some
form of "Virtual DOM". The term "Virtual DOM" is now used in so many
places and it is hard to tell what people actually mean when they're using
this term. In the kivi library it is just a handy tool to perform updates
to the DOM, it isn't some form of DOM abstraction or anything else.

```javascript
var ExampleComponent = kivi.declareComponent({
  createState: function() {
    this.state = cache.get();
    this.subscribe(this.state);
  },
  
  build: function() {
    var root = kivi.root();
    root.children = [kivi.text(this.state.data.result.toString())];
    return root;
  }
});
```
