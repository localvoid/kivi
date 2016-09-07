const Main = new kivi.ComponentDescriptor()
  .init((c) => {
    c.state = {elapsedSeconds: 0};
    const startTime = Date.now();
    setInterval(() => {
      c.state.elapsedSeconds = Date.now() - startTime;
      c.invalidate();
    }, 50);
  })
  .update((c, props, state) => {
    c.sync(c.createVRoot().child(`Elapsed time: ${(state.elapsedSeconds / 1000).toFixed(1)}`));
  });

document.addEventListener("DOMContentLoaded", () => {
  kivi.injectComponent(Main, document.body);
});
