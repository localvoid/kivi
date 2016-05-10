const Main = new kivi.ComponentDescriptor()
  .canvas()
  .init((c) => {
    c.state = {
      x: 0,
      y: 0,
    };

    c.element.width = c.props.width;
    c.element.height = c.props.height;

    c.element.addEventListener("mousemove", (e) => {
      c.setState({
        x: e.offsetX,
        y: e.offsetY
      });
      c.invalidate();
    });
  })
  .update((c) => {
    const ctx = c.get2DContext();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fillRect(0, 0, c.props.width, c.props.height);

    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();

    const gradient = ctx.createRadialGradient(c.state.x, c.state.y, 0, c.state.x, c.state.y, 30);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(0.4, "white");
    gradient.addColorStop(0.4, "red");
    gradient.addColorStop(1, "black");
    ctx.fillStyle = gradient;

    ctx.arc(c.state.x, c.state.y , 30, 0, Math.PI*2, false);
    ctx.fill();
  });

document.addEventListener("DOMContentLoaded", () => {
  kivi.injectComponent(Main, document.body, {width: 600, height: 400});
});
