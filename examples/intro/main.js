const Main = new kivi.ComponentDescriptor()
  .update((c, props) => {
    c.sync(c.createVRoot().children(`Hello ${props}`));
  });

document.addEventListener("DOMContentLoaded", () => {
  kivi.injectComponent(Main, document.body, "world");
});
