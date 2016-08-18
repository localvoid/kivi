# Scheduler

Kivi scheduler is responsible for executing frame tasks like updating components, reading from DOM, executing
microtasks and macrotasks.

## Frame tasks

Frame tasks will be executed in batches, starting with updating components sorted by their depth in components tree,
and then switching between read and write tasks until there are no tasks left.

There are two functions for accesing frame tasks: `currentFrame()` to get task group for the current frame, and
`nextFrame()` for the next frame.

Each frame task group provides different queues for components, DOM read and write tasks, and tasks that will be
executed after all other tasks are finished:

```
currentFrame().updateComponent(c: Component<any, any>);
currentFrame().read(task: () => void);
currentFrame().write(task: () => void);
currentFrame().after(task: () => void);
```

## Microtasks and Macrotasks

Scheduler also provides interface for adding microtasks and macrotasks into browser event loop.

```
scheduleMicrotask(cb: () => void)`
scheduleMacrotask(cb: () => void)`
```

## Monotonically increasing clock

Each time scheduler finishes executing tasks from one of the queues, it increments internal clock. This clock can be
used to implement efficient checks in components to detect which input parameter has been changed since the last
update.

For example:

```ts
import {clock} from "kivi";

class Data {
  mtime: number;
  value: number;

  constructor(value: number) {
    this.mtime = clock();
    this.value = value;
  }

  setValue(newValue: number) {
    if (this.value !== newValue) {
      this.value = newValue;
      this.mtime = clock();
    }
  }
}

const MyComponent = new ComponentDescriptor<Data, any>()
  .newPropsReceived((c, oldProps, newProps) => {
    if (c.mtime < newProps.mtime) {
      c.markDirty();
    }
  });
```

Here we need to check if component's `mtime` property is older than `mtime` in a data object, and if it is older,
we are marking component as dirty. When component finishes update, it will automatically set its `mtime` to the current
`clock()` value.
