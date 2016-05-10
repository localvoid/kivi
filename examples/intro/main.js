const Main = new kivi.ComponentDescriptor()
  .vRender((c, root) => { root.children(`Hello ${c.props}`); });

document.addEventListener("DOMContentLoaded", () => {
  kivi.injectComponent(Main, document.body, "world");
});
