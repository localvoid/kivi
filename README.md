# kivi

kivi is an **EXPERIMENTAL** library to build Web UIs in javascript.

UI app state in kivi applications is always generated in a lazy way
when UI components requests it. And it is updated only when UI
Component asks for the updated value, this way it is possible to
prevent many unnecessary computations, or overfetching data in case of
server rendering. It also simplifies architecture of applications, no
need to build complex dependencies between "data stores", just rebuild
app state from scratch the same way as view state.

To update view state, kivi uses
[highly-optimized](http://vdom-benchmark.github.io/vdom-benchmark/)
virtual dom implementation.

# Examples

- [Hello](https://github.com/localvoid/kivi-examples/tree/master/web/hello)
- [Basic](https://github.com/localvoid/kivi-examples/tree/master/web/basic)
- [Form](https://github.com/localvoid/kivi-examples/tree/master/web/form)
- [Todo](https://github.com/localvoid/kivi-examples/tree/master/web/todo)
- [Anim](https://github.com/localvoid/kivi-examples/tree/master/web/anim)
- [Value Diff](https://github.com/localvoid/kivi-examples/tree/master/web/value-diff)

# DBMonster Benchmark

- [View](http://localvoid.github.io/kivi-dbmonster/)
- [Source Code](https://github.com/localvoid/kivi-dbmonster)
