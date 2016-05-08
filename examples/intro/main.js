const Main = new kivi.ComponentDescriptor()
  .vRender((c, root) => { root.children(`Hello ${c.data}`); });

document.addEventListener("DOMContentLoaded", () => {
  kivi.injectComponent(Main, document.body, "world");
});
