(function () {
  const canvas = document.getElementById("home-bg-canvas");
  const wrap = document.getElementById("home-animated-bg");
  if (!canvas || !wrap) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function revealHome() {
    document.body.classList.remove("home-intro-pending");
    document.body.classList.add("home-revealed");
  }

  if (prefersReduced.matches) {
    revealHome();
    return;
  }

  document.body.classList.add("home-intro-pending");

  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let raf = 0;
  let phase = "intro";
  let startTs = 0;

  const TIMING = {
    approach: 2200,
    collide: 900,
    reveal: 1400,
  };

  let particles = [];
  let debris = [];
  let shockwaves = [];
  let flash = 0;
  let mergeGlow = 0;
  let planets = [];
  let introDone = false;

  const gradientEl = wrap.querySelector(".home-bg-gradient");
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: false };

  const particleConfig = {
    count: 48,
    maxDist: 130,
    speed: 0.32,
    light: {
      dot: "rgba(99, 102, 241, 0.5)",
      line: "rgba(99, 102, 241, 0.1)",
      dotSize: 2,
    },
    dark: {
      dot: "rgba(167, 139, 250, 0.45)",
      line: "rgba(167, 139, 250, 0.12)",
      dotSize: 1.8,
    },
  };

  function getTheme() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function colors() {
    const dark = getTheme() === "dark";
    return dark
      ? {
          p1: ["#a5b4fc", "#4338ca", "#1e1b4b"],
          p2: ["#67e8f9", "#0891b2", "#164e63"],
          ring: "rgba(196, 181, 253, 0.45)",
          flash: "rgba(196, 181, 253, 0.35)",
          core: "rgba(167, 139, 250, 0.75)",
        }
      : {
          p1: ["#c7d2fe", "#6366f1", "#3730a3"],
          p2: ["#a5f3fc", "#0ea5e9", "#0369a1"],
          ring: "rgba(99, 102, 241, 0.4)",
          flash: "rgba(129, 140, 248, 0.45)",
          core: "rgba(99, 102, 241, 0.65)",
        };
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
    initPlanets();
  }

  function initPlanets() {
    const cy = h * 0.46;
    planets = [
      { r: 54, y: cy, side: "left", opacity: 1, scale: 1 },
      { r: 50, y: cy + 8, side: "right", opacity: 1, scale: 1 },
    ];
  }

  function planetX(p, t) {
    const cx = w * 0.5;
    const gap = 8;
    const leftEnd = cx - p.r - gap / 2;
    const rightStart = cx + p.r + gap / 2;
    if (p.side === "left") {
      return -p.r - 40 + (leftEnd + p.r + 40) * easeInOut(Math.min(1, t));
    }
    return w + p.r + 40 - (w + p.r + 40 - rightStart) * easeInOut(Math.min(1, t));
  }

  function drawPlanet(p, x) {
    const c = colors();
    const palette = p.side === "left" ? c.p1 : c.p2;
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(x, p.y);
    ctx.scale(p.scale, p.scale);

    const glow = ctx.createRadialGradient(0, 0, p.r * 0.2, 0, 0, p.r * 1.35);
    glow.addColorStop(0, palette[0] + "99");
    glow.addColorStop(0.55, palette[1] + "cc");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, p.r * 1.35, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(-p.r * 0.35, -p.r * 0.35, 0, 0, 0, p.r);
    body.addColorStop(0, palette[0]);
    body.addColorStop(0.55, palette[1]);
    body.addColorStop(1, palette[2]);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.arc(p.r * 0.25, p.r * 0.15, p.r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-p.r * 0.35, p.r * 0.35, p.r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function triggerCollision() {
    const cx = w * 0.5;
    const cy = h * 0.47;
    flash = 1;
    mergeGlow = 1;
    shockwaves.push({ x: cx, y: cy, r: 20, maxR: Math.min(w, h) * 0.55, life: 1 });
    shockwaves.push({ x: cx, y: cy, r: 10, maxR: Math.min(w, h) * 0.38, life: 0.85 });
    debris = Array.from({ length: 28 }, () => {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 4;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 1.5 + Math.random() * 3,
        life: 0.7 + Math.random() * 0.3,
      };
    });
  }

  function initParticles() {
    particles = Array.from({ length: particleConfig.count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * particleConfig.speed,
      vy: (Math.random() - 0.5) * particleConfig.speed,
      depth: 0.35 + Math.random() * 0.65,
    }));
  }

  function updateMouse() {
    mouse.x += (mouse.tx - mouse.x) * 0.07;
    mouse.y += (mouse.ty - mouse.y) * 0.07;
  }

  function updateGradientParallax() {
    if (!gradientEl) return;
    const dx = (mouse.x - 0.5) * 48;
    const dy = (mouse.y - 0.5) * 40;
    const scale = 1.04 + (mouse.active ? 0.02 : 0);
    gradientEl.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

    const g1x = 20 + (mouse.x - 0.5) * 22;
    const g1y = 20 + (mouse.y - 0.5) * 18;
    const g2x = 80 + (mouse.x - 0.5) * 18;
    const g2y = 30 + (mouse.y - 0.5) * 16;
    const g3x = 50 + (mouse.x - 0.5) * 14;
    const g3y = 90 + (mouse.y - 0.5) * 12;
    const dark = getTheme() === "dark";
    if (dark) {
      gradientEl.style.background = `
        radial-gradient(ellipse 80% 60% at ${g1x}% ${g1y}%, rgba(99, 102, 241, 0.28), transparent 55%),
        radial-gradient(ellipse 70% 50% at ${g2x}% ${g2y}%, rgba(6, 182, 212, 0.2), transparent 50%),
        radial-gradient(ellipse 60% 55% at ${g3x}% ${g3y}%, rgba(192, 132, 252, 0.15), transparent 55%),
        linear-gradient(160deg, #0f1117 0%, #151829 45%, #12141c 100%)`;
    } else {
      gradientEl.style.background = `
        radial-gradient(ellipse 80% 60% at ${g1x}% ${g1y}%, rgba(99, 102, 241, 0.22), transparent 55%),
        radial-gradient(ellipse 70% 50% at ${g2x}% ${g2y}%, rgba(14, 165, 233, 0.18), transparent 50%),
        radial-gradient(ellipse 60% 55% at ${g3x}% ${g3y}%, rgba(236, 72, 153, 0.12), transparent 55%),
        linear-gradient(160deg, #f8fafc 0%, #eef2ff 45%, #f0f9ff 100%)`;
    }
  }

  function drawMouseGlow() {
    if (!mouse.active || phase !== "idle") return;
    const mx = mouse.x * w;
    const my = mouse.y * h;
    const dark = getTheme() === "dark";
    const grd = ctx.createRadialGradient(mx, my, 0, mx, my, 180);
    grd.addColorStop(0, dark ? "rgba(167, 139, 250, 0.16)" : "rgba(99, 102, 241, 0.14)");
    grd.addColorStop(0.45, dark ? "rgba(129, 140, 248, 0.06)" : "rgba(14, 165, 233, 0.07)");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  }

  function drawParticles() {
    const palette =
      getTheme() === "dark" ? particleConfig.dark : particleConfig.light;
    const mx = mouse.x * w;
    const my = mouse.y * h;
    const parallaxX = (mouse.x - 0.5) * 36;
    const parallaxY = (mouse.y - 0.5) * 28;

    for (const p of particles) {
      if (mouse.active) {
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 200) {
          const pull = ((200 - dist) / 200) * 0.022 * p.depth;
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;
        }
      }
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }

    const positions = particles.map((p) => ({
      x: p.x + parallaxX * p.depth,
      y: p.y + parallaxY * p.depth,
      p,
    }));

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < particleConfig.maxDist) {
          ctx.strokeStyle = palette.line;
          ctx.lineWidth = 1;
          ctx.globalAlpha = (1 - dist / particleConfig.maxDist) * 0.85;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    for (const { x, y, p } of positions) {
      ctx.fillStyle = palette.dot;
      ctx.beginPath();
      ctx.arc(x, y, palette.dotSize * (0.85 + p.depth * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawIntro(elapsed) {
    const c = colors();
    const cx = w * 0.5;
    const cy = h * 0.47;

    if (elapsed < TIMING.approach) {
      const t = elapsed / TIMING.approach;
      const parallax = (mouse.x - 0.5) * 18;
      planets.forEach((p) => {
        const baseX = planetX(p, t);
        const offset = p.side === "left" ? -parallax : parallax;
        drawPlanet(p, baseX + offset);
      });
      return;
    }

    const collideT = elapsed - TIMING.approach;

    if (collideT < TIMING.collide) {
      if (flash === 0) triggerCollision();
      const t = collideT / TIMING.collide;
      const fade = 1 - easeOut(t);

      planets.forEach((p) => {
        p.opacity = Math.max(0, 1 - t * 1.2);
        p.scale = 1 + t * 0.15;
        drawPlanet(p, planetX(p, 1));
      });

      if (mergeGlow > 0) {
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120 + t * 80);
        grd.addColorStop(0, c.core);
        grd.addColorStop(0.45, c.ring);
        grd.addColorStop(1, "transparent");
        ctx.globalAlpha = mergeGlow * (1 - t * 0.5);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, 120 + t * 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        mergeGlow = Math.max(0, mergeGlow - 0.02);
      }

      ctx.globalAlpha = flash * (1 - t);
      ctx.fillStyle = c.flash;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      flash = Math.max(0, flash - 0.04);

      shockwaves = shockwaves.filter((s) => {
        s.r += (s.maxR - s.r) * 0.08;
        s.life -= 0.018;
        if (s.life <= 0) return false;
        ctx.strokeStyle = c.ring;
        ctx.lineWidth = 2;
        ctx.globalAlpha = s.life * 0.6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        return true;
      });

      debris = debris.filter((d) => {
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.02;
        d.life -= 0.02;
        if (d.life <= 0) return false;
        ctx.globalAlpha = d.life;
        ctx.fillStyle = c.core;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });
      return;
    }

    if (!introDone) {
      introDone = true;
      revealHome();
      initParticles();
      phase = "idle";
    }
    return;
  }

  function setMouseFromEvent(clientX, clientY) {
    if (!w || !h) return;
    mouse.tx = clientX / w;
    mouse.ty = clientY / h;
    mouse.active = true;
  }

  function tick(ts) {
    if (!startTs) startTs = ts;
    const elapsed = ts - startTs;

    updateMouse();
    updateGradientParallax();

    ctx.clearRect(0, 0, w, h);

    if (phase === "intro") {
      drawIntro(elapsed);
    }

    if (phase === "idle") {
      drawMouseGlow();
      drawParticles();
    }

    raf = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(raf);
    startTs = 0;
    phase = "intro";
    introDone = false;
    flash = 0;
    mergeGlow = 0;
    shockwaves = [];
    debris = [];
    particles = [];
    resize();
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener("mousemove", (e) => setMouseFromEvent(e.clientX, e.clientY));

  window.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      if (t) setMouseFromEvent(t.clientX, t.clientY);
    },
    { passive: true }
  );

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
    mouse.tx = 0.5;
    mouse.ty = 0.5;
  });

  window.addEventListener("resize", () => {
    resize();
    if (introDone) initParticles();
  });

  prefersReduced.addEventListener("change", (e) => {
    if (e.matches) {
      cancelAnimationFrame(raf);
      revealHome();
    } else {
      start();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
