(function () {
  const canvas = document.getElementById("home-bg-canvas");
  const wrap = document.getElementById("home-animated-bg");
  if (!canvas || !wrap) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (prefersReduced.matches) return;

  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let particles = [];
  let raf = 0;
  let themeObserver;

  const config = {
    count: 56,
    maxDist: 140,
    speed: 0.35,
    light: {
      dot: "rgba(99, 102, 241, 0.55)",
      line: "rgba(99, 102, 241, 0.12)",
      dotSize: 2.2,
    },
    dark: {
      dot: "rgba(167, 139, 250, 0.5)",
      line: "rgba(167, 139, 250, 0.14)",
      dotSize: 2,
    },
  };

  function getTheme() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
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
    if (particles.length === 0) initParticles();
  }

  function initParticles() {
    particles = Array.from({ length: config.count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * config.speed,
      vy: (Math.random() - 0.5) * config.speed,
    }));
  }

  function tick() {
    const palette = getTheme() === "dark" ? config.dark : config.light;
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < config.maxDist) {
          ctx.strokeStyle = palette.line;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 1 - dist / config.maxDist;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
    for (const p of particles) {
      ctx.fillStyle = palette.dot;
      ctx.beginPath();
      ctx.arc(p.x, p.y, palette.dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(raf);
    resize();
    tick();
  }

  function stop() {
    cancelAnimationFrame(raf);
  }

  window.addEventListener("resize", resize);
  prefersReduced.addEventListener("change", (e) => {
    if (e.matches) stop();
    else start();
  });

  themeObserver = new MutationObserver(() => {
    /* palette read each frame */
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
