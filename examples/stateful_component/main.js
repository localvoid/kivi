const Main = new kivi.ComponentDescriptor()
  .createState((c) => ({elapsedSeconds: 0}))
  .init((c, props, state) => {
    const startTime = Date.now();
    setInterval(() => {
      state.elapsedSeconds = Date.now() - startTime;
      c.invalidate();
    }, 50);
  })
  .update((c, props, state) => {
    c.vSync(c.createVRoot().children(`Elapsed time: ${(state.elapsedSeconds / 1000).toFixed(1)}`));
  });

document.addEventListener("DOMContentLoaded", () => {
  kivi.injectComponent(Main, document.body);
});
