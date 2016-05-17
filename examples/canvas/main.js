const Main = new kivi.ComponentDescriptor()
  .canvas()
  .createState((c) => ({
    x: 0,
    y: 0,
  }))
  .init((c, props, state) => {
    c.element.width = props.width;
    c.element.height = props.height;

    c.element.addEventListener("mousemove", (e) => {
      state.x = e.offsetX;
      state.y = e.offsetY;
      c.invalidate();
    });
  })
  .update((c, props, state) => {
    const ctx = c.get2DContext();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fillRect(0, 0, props.width, props.height);

    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();

    const gradient = ctx.createRadialGradient(state.x, state.y, 0, state.x, state.y, 30);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(0.4, "white");
    gradient.addColorStop(0.4, "red");
    gradient.addColorStop(1, "black");
    ctx.fillStyle = gradient;

    ctx.arc(state.x, state.y , 30, 0, Math.PI * 2, false);
    ctx.fill();
  });

document.addEventListener("DOMContentLoaded", () => {
  kivi.injectComponent(Main, document.body, {width: 600, height: 400});
});
