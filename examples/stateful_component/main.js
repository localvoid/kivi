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
  .vRender((c, root) => {
    root.children(`Elapsed time: ${(c.state.elapsedSeconds / 1000).toFixed(1)}`);
  });

document.addEventListener("DOMContentLoaded", () => {
  kivi.injectComponent(Main, document.body);
});
