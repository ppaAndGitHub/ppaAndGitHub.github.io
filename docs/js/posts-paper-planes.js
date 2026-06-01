(function () {
  const wrap = document.getElementById("posts-paper-bg");
  const canvas = document.getElementById("posts-paper-canvas");
  if (!wrap || !canvas) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let raf = 0;
  let planes = [];

  const config = {
    count: 14,
    light: { stroke: "rgba(99, 102, 241, 0.42)", fold: "rgba(99, 102, 241, 0.28)" },
    dark: { stroke: "rgba(167, 139, 250, 0.45)", fold: "rgba(167, 139, 250, 0.3)" },
  };

  function getTheme() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function palette() {
    return getTheme() === "dark" ? config.dark : config.light;
  }

  function spawnPlane() {
    const fromLeft = Math.random() > 0.45;
    const angle = (Math.random() * 0.5 - 0.25) + (fromLeft ? 0 : Math.PI);
    const speed = 0.6 + Math.random() * 1.1;
    const scale = 0.65 + Math.random() * 0.9;
    return {
      x: fromLeft ? -60 : w + 60,
      y: Math.random() * h,
      angle,
      speed,
      scale,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.008 + Math.random() * 0.012,
      drift: (Math.random() - 0.5) * 0.35,
    };
  }

  function initPlanes() {
    planes = Array.from({ length: config.count }, () => {
      const p = spawnPlane();
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      return p;
    });
  }

  function drawPaperPlane(scale, pal) {
    const s = scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.15;

    ctx.strokeStyle = pal.stroke;
    ctx.beginPath();
    ctx.moveTo(26 * s, 0);
    ctx.lineTo(-16 * s, -9 * s);
    ctx.lineTo(-2 * s, 0);
    ctx.lineTo(-16 * s, 9 * s);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = pal.fold;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(26 * s, 0);
    ctx.lineTo(-2 * s, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(10 * s, 0);
    ctx.lineTo(-14 * s, -9 * s);
    ctx.moveTo(10 * s, 0);
    ctx.lineTo(-14 * s, 9 * s);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-2 * s, 0);
    ctx.lineTo(-8 * s, -4 * s);
    ctx.moveTo(-2 * s, 0);
    ctx.lineTo(-8 * s, 4 * s);
    ctx.stroke();
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = wrap.clientWidth;
    h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (planes.length === 0) initPlanes();
  }

  function tick() {
    const pal = palette();
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      if (!prefersReduced.matches) {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed + p.drift;
        p.wobble += p.wobbleSpeed;
        p.y += Math.sin(p.wobble) * 0.25;
      }

      const margin = 80;
      if (p.x < -margin || p.x > w + margin || p.y < -margin || p.y > h + margin) {
        planes[i] = spawnPlane();
        if (planes[i].x < 0) planes[i].angle = (Math.random() * 0.4 - 0.2);
        else planes[i].angle = Math.PI + (Math.random() * 0.4 - 0.2);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      drawPaperPlane(p.scale, pal);
      ctx.restore();
    }

    raf = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(raf);
    resize();
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  prefersReduced.addEventListener("change", start);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
