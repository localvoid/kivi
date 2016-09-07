const Main = new kivi.ComponentDescriptor()
  .update((c, props) => {
    c.sync(c.createVRoot().child(`Hello ${props}`));
  });

document.addEventListener("DOMContentLoaded", () => {
  kivi.injectComponent(Main, document.body, "world");
});
