const Main = new kivi.ComponentDescriptor()
  .update((c, props) => {
    c.vSync(c.createVRoot().children(`Hello ${props}`));
  });

document.addEventListener("DOMContentLoaded", () => {
  kivi.injectComponent(Main, document.body, "world");
});
