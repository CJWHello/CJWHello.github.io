/**
 * Lightweight particle background.
 * Canvas is intentionally small and adaptive to keep animation smooth on GitHub Pages.
 */
(() => {
  "use strict";

  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;
  if (window.getComputedStyle(canvas).display === "none") return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context || prefersReducedMotion) return;

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    particles: [],
    pointer: { x: -9999, y: -9999, active: false },
    frame: 0
  };

  const random = (min, max) => Math.random() * (max - min) + min;

  function particleCount() {
    const area = window.innerWidth * window.innerHeight;
    return Math.max(44, Math.min(118, Math.floor(area / 15000)));
  }

  function createParticle() {
    return {
      x: random(0, state.width),
      y: random(0, state.height),
      vx: random(-0.18, 0.18),
      vy: random(-0.15, 0.18),
      size: random(0.8, 2.2),
      alpha: random(0.28, 0.78),
      hue: random(205, 270)
    };
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    const count = particleCount();
    if (state.particles.length < count) {
      while (state.particles.length < count) state.particles.push(createParticle());
    } else {
      state.particles.length = count;
    }
  }

  function drawParticle(particle) {
    const gradient = context.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      particle.size * 6
    );
    gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 72%, ${particle.alpha})`);
    gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 72%, 0)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size * 6, 0, Math.PI * 2);
    context.fill();
  }

  function drawConnections() {
    const maxDistance = Math.min(145, Math.max(90, state.width / 10));
    for (let i = 0; i < state.particles.length; i += 1) {
      for (let j = i + 1; j < state.particles.length; j += 1) {
        const a = state.particles[i];
        const b = state.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);
        if (distance < maxDistance) {
          const alpha = (1 - distance / maxDistance) * 0.18;
          context.strokeStyle = `rgba(91, 140, 255, ${alpha})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }
    }
  }

  function updateParticle(particle) {
    particle.x += particle.vx;
    particle.y += particle.vy;

    if (state.pointer.active) {
      const dx = particle.x - state.pointer.x;
      const dy = particle.y - state.pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 140 && distance > 0.1) {
        const force = (1 - distance / 140) * 0.42;
        particle.x += (dx / distance) * force;
        particle.y += (dy / distance) * force;
      }
    }

    if (particle.x < -20) particle.x = state.width + 20;
    if (particle.x > state.width + 20) particle.x = -20;
    if (particle.y < -20) particle.y = state.height + 20;
    if (particle.y > state.height + 20) particle.y = -20;
  }

  function render() {
    context.clearRect(0, 0, state.width, state.height);
    context.globalCompositeOperation = "lighter";

    state.particles.forEach((particle) => {
      updateParticle(particle);
      drawParticle(particle);
    });

    context.globalCompositeOperation = "source-over";
    drawConnections();
    state.frame = window.requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", (event) => {
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    state.pointer.active = true;
  }, { passive: true });
  window.addEventListener("pointerleave", () => {
    state.pointer.active = false;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(state.frame);
    } else {
      render();
    }
  });

  resize();
  render();
})();
