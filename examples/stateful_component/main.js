const Main = new kivi.ComponentDescriptor()
  .init((c) => {
    c.state = {
      elapsedSeconds: 0
    };

    const startTime = Date.now();
    setInterval(() => {
      c.state.elapsedSeconds = Date.now() - startTime;
      c.invalidate();
    }, 50);
  })
  .update((c) => {
    c.sync(kivi.createVRoot().children(`Elapsed time: ${(c.state.elapsedSeconds / 1000).toFixed(1)}`));
  });

document.addEventListener('DOMContentLoaded', () => {
  kivi.scheduler.start(() => {
    kivi.injectComponent(Main, null, document.body);
  });
});
