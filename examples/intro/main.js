const Main = new kivi.ComponentDescriptor()
  .update((c) => {
    c.sync(kivi.createVRoot().children(`Hello ${c.data}`));
  });

document.addEventListener('DOMContentLoaded', () => {
  kivi.scheduler.start(() => {
    kivi.injectComponent(Main, 'world', document.body);
  });
});
