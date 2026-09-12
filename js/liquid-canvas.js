/**
 * PrepPilot - Liquid Background Canvas Engine
 * Renders smooth floating fluid orbs with harmonic motion,
 * interactive cursor displacement ripples, and shimmering caustic waves.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('liquid-bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Responsive resize handler
  function handleResize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initBlobs();
  }
  window.addEventListener('resize', handleResize, { passive: true });

  // Mouse & Touch Tracker (Lightweight)
  const mouse = {
    x: width * 0.5,
    y: height * 0.3,
    targetX: width * 0.5,
    targetY: height * 0.3,
    active: false,
    radius: 140,
  };

  let lastRippleX = -100;
  let lastRippleY = -100;

  window.addEventListener(
    'pointermove',
    (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;

      // Throttle ripples to prevent lag (only fire if mouse moved > 55px)
      const distSq = (e.clientX - lastRippleX) ** 2 + (e.clientY - lastRippleY) ** 2;
      if (distSq > 3025) {
        lastRippleX = e.clientX;
        lastRippleY = e.clientY;
        addRipple(e.clientX, e.clientY);
      }
    },
    { passive: true }
  );

  window.addEventListener(
    'pointerleave',
    () => {
      mouse.active = false;
    },
    { passive: true }
  );

  // Ripple Waves collection (capped at 3 for max performance)
  const ripples = [];
  function addRipple(x, y) {
    if (ripples.length >= 3) ripples.shift();
    ripples.push({
      x,
      y,
      radius: 6,
      maxRadius: 140,
      opacity: 0.28,
      speed: 3,
    });
  }

  // Fluid Organic Blobs (Optimized to 3 smooth harmonic orbs)
  let blobs = [];
  const blobColors = [
    { r: 157, g: 155, b: 246, baseAlpha: 0.2 }, // Lilac Orbit
    { r: 99, g: 102, b: 241, baseAlpha: 0.18 }, // Indigo Glow
    { r: 56, g: 189, b: 248, baseAlpha: 0.16 }, // Electric Cyan
  ];

  function initBlobs() {
    blobs = [];
    const count = 3;
    for (let i = 0; i < count; i++) {
      const color = blobColors[i % blobColors.length];
      blobs.push({
        x: (width * (i + 1)) / (count + 1),
        y: height * (0.3 + i * 0.2),
        baseRadius: Math.min(width, height) * 0.22,
        radius: 0,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        angle: (i * Math.PI) / 1.5,
        angleSpeed: 0.006,
        pulseSpeed: 0.012,
        color,
      });
    }
  }
  initBlobs();

  // Floating Micro Dust Particles (Optimized to 16 subtle stars)
  const stars = [];
  const starCount = 16;
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.5 + 0.2,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02,
      vy: -(0.25 + Math.random() * 0.2),
    });
  }

  // Animation Loop
  let lastTime = 0;
  function animate(timestamp) {
    // Smooth mouse interpolation
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Liquid Blobs with Soft Multi-Layer Blending
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];

      // Oscillate radius and position
      b.angle += b.angleSpeed;
      b.x += b.vx + Math.sin(b.angle) * 0.4;
      b.y += b.vy + Math.cos(b.angle) * 0.4;

      // Wrap around bounds softly
      if (b.x < -b.baseRadius) b.x = width + b.baseRadius;
      if (b.x > width + b.baseRadius) b.x = -b.baseRadius;
      if (b.y < -b.baseRadius) b.y = height + b.baseRadius;
      if (b.y > height + b.baseRadius) b.y = -b.baseRadius;

      // Mouse interactive push / liquid viscosity
      if (mouse.active) {
        const dx = mouse.x - b.x;
        const dy = mouse.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius * 2) {
          const force = (1 - dist / (mouse.radius * 2)) * 3;
          b.x -= (dx / dist) * force;
          b.y -= (dy / dist) * force;
        }
      }

      b.radius = b.baseRadius + Math.sin(timestamp * 0.001 * b.pulseSpeed * 100) * (b.baseRadius * 0.15);

      // Liquid radial gradient
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
      const c = b.color;
      grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${c.baseAlpha})`);
      grad.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, ${c.baseAlpha * 0.5})`);
      grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Draw Interactive Liquid Ripples
    if (ripples.length > 0) {
      ctx.save();
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.opacity -= 0.006;

        if (r.opacity <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = `rgba(157, 155, 246, ${r.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner secondary soft wave
        ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity * 0.4})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0, r.radius - 15), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Draw PrepPilot Floating Starlight Dust
    ctx.save();
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.pulse += s.pulseSpeed;
      s.y += s.vy;
      if (s.y < 0) {
        s.y = height;
        s.x = Math.random() * width;
      }

      const currentAlpha = s.alpha * (0.6 + Math.sin(s.pulse) * 0.4);
      ctx.fillStyle = `rgba(196, 181, 253, ${currentAlpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
