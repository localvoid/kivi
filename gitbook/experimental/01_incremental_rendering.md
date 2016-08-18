# Incremental Rendering

Incremental rendering was removed because in real applications it caused significant increase in frame drops.

It is a nice idea and in simple demo applications it can show amazing results, but when it is done in a complicated
document with an average stylesheet, it is way much better to apply all DOM changes as fast as possible instead of
triggering long-running style recalculations, layout, etc on several consecutive frames, kivi is quite fast and it
isn't worth to apply changes incrementally, because it probably won't be a bottleneck. Even with newest features like
[css containment](https://developers.google.com/web/updates/2016/06/css-containment), incremental rendering didn't
showed a good results in real applications.

Incremental rendering in kivi was implemented in a way that it incrementally performed diffs and applied DOM changes. It
is possible that incremental rendering that just performs diffs incrementally and then atomically applies all DOM
changes will not increase frame drops, but it isn't possible to implement it this way with kivi architecture,
virtual dom implementation with such architecture works significantly slower, so instead of incremental rendering it
is better to have a fast virtual dom implementation.
