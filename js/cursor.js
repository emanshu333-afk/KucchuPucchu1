/**
 * PrepPilot - Personal Pilot Mouse Cursor Engine
 *
 * Features:
 * 1. Bespoke Pilot Aero-Dart Cursor with Luminous Glass Trail
 * 2. Only visible and active when floating over the website
 * 3. Morphs dynamically based on what it floats over:
 *    - Clickable Actions & Buttons: Magnetic Reticle + '✦'
 *    - Student Mascot & Interactive Tools: Luminous Star Ring + '✨'
 *    - Sliders: Drag Pill + '◀▶'
 *    - Text & Reading Paragraphs: Sleek Vertical Neon Scan Beam
 * 4. Butter-smooth 60–120 FPS performance with zero forced reflows
 */

(function () {
  'use strict';

  // Only run on desktop devices with a mouse
  if (window.matchMedia('(pointer: coarse)').matches) {
    return;
  }

  // 1. Create Personal Cursor Elements
  const cursorDart = document.createElement('div');
  cursorDart.className = 'pilot-cursor-dart cursor-hidden';
  cursorDart.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <defs>
        <linearGradient id="pilotDartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a5b4fc"/>
          <stop offset="50%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#312e81"/>
        </linearGradient>
        <filter id="pilotGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#6366f1" flood-opacity="0.5"/>
        </filter>
      </defs>
      <path d="M 1 1 L 21 8.5 L 12 11.5 L 8.5 21 Z" fill="url(#pilotDartGrad)" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" filter="url(#pilotGlow)"/>
      <polygon points="1,1 12,11.5 7.5,10" fill="rgba(255, 255, 255, 0.5)"/>
    </svg>
  `;

  const cursorRing = document.createElement('div');
  cursorRing.className = 'pilot-cursor-ring cursor-hidden';
  cursorRing.innerHTML = `<span class="cursor-badge-text" id="cursor-badge-text"></span>`;

  document.body.appendChild(cursorDart);
  document.body.appendChild(cursorRing);

  const badgeText = cursorRing.querySelector('#cursor-badge-text');

  const mouse = { x: -100, y: -100, visible: false };
  const ring = { x: -100, y: -100, scale: 1, angle: 0, stretch: 1 };
  let isClicking = false;
  let currentMode = 'default';

  // Elements for 3D perspective
  const mascotCard = document.getElementById('mascot-3d-card');
  const mascotContainer = document.querySelector('.mascot-character-container');
  const speechBubble = document.getElementById('mascot-speech');
  const floatingCubes = document.querySelectorAll('.floating-cube');

  // Cached Geometries (Eliminates layout reflows!)
  let mascotCenterX = window.innerWidth * 0.5;
  let mascotCenterY = window.innerHeight * 0.5;
  let cachedCubeMetrics = [];

  function updateCachedMetrics() {
    if (mascotContainer) {
      const rect = mascotContainer.getBoundingClientRect();
      mascotCenterX = rect.left + rect.width / 2;
      mascotCenterY = rect.top + rect.height * 0.45;
    }
    cachedCubeMetrics = [];
    floatingCubes.forEach((cube) => {
      const crect = cube.getBoundingClientRect();
      cachedCubeMetrics.push({
        el: cube,
        cx: crect.left + crect.width / 2,
        cy: crect.top + crect.height / 2,
      });
    });
  }

  updateCachedMetrics();
  window.addEventListener('resize', updateCachedMetrics, { passive: true });
  window.addEventListener('scroll', updateCachedMetrics, { passive: true });

  // Floating Activation: Only show and change when floating over website
  function showCursor() {
    if (!mouse.visible) {
      mouse.visible = true;
      cursorDart.classList.remove('cursor-hidden');
      cursorRing.classList.remove('cursor-hidden');
    }
  }

  function hideCursor() {
    mouse.visible = false;
    cursorDart.classList.add('cursor-hidden');
    cursorRing.classList.add('cursor-hidden');
  }

  document.addEventListener('mouseleave', hideCursor, { passive: true });
  document.addEventListener('mouseenter', showCursor, { passive: true });

  window.addEventListener(
    'mousemove',
    (e) => {
      showCursor();
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      cursorDart.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    },
    { passive: true }
  );

  // Dynamic Cursor Morphing: Detects what element cursor floats over
  function setCursorMode(mode, badge) {
    if (currentMode === mode) return;
    currentMode = mode;

    cursorDart.classList.remove('cursor-mode-action', 'cursor-mode-mascot', 'cursor-mode-text', 'cursor-mode-drag');
    cursorRing.classList.remove('cursor-mode-action', 'cursor-mode-mascot', 'cursor-mode-text', 'cursor-mode-drag');

    if (mode !== 'default') {
      cursorDart.classList.add(`cursor-mode-${mode}`);
      cursorRing.classList.add(`cursor-mode-${mode}`);
    }

    if (badgeText) {
      badgeText.textContent = badge || '';
    }
  }

  document.addEventListener(
    'mouseover',
    (e) => {
      const target = e.target;
      if (!target || !target.closest) return;

      if (target.closest('.mascot-3d-card, .kid-interactive-rig, .kid-book-zone, .kid-hand-target, .kid-head-target, .kid-sneaker-target')) {
        setCursorMode('mascot', '✨');
      } else if (target.closest('button, a, [role="button"], .btn-store-style, .btn-nav-action, .track-minimal-card, .track-select-btn, .btn-id-submit, .btn-subject-resume, .btn-launch-cbt, .lab-tile, .task-item, .brand-icon-box')) {
        setCursorMode('action', '✦');
      } else if (target.closest('input[type="range"]')) {
        setCursorMode('drag', '◀▶');
      } else if (target.closest('p, h1, h2, h3, .proof-text, .track-card-desc, .mission-sub, input[type="text"]')) {
        setCursorMode('text', '');
      } else {
        setCursorMode('default', '');
      }
    },
    { passive: true }
  );

  // Mascot Click Micro-Interaction
  if (mascotCard) {
    mascotCard.addEventListener('click', (e) => {
      mascotCard.style.transform = 'scale(0.94)';
      setTimeout(() => {
        mascotCard.style.transform = 'scale(1.06)';
        setTimeout(() => (mascotCard.style.transform = ''), 180);
      }, 120);

      const originX = e.clientX || mascotCenterX;
      const originY = e.clientY || mascotCenterY;
      const symbols = ['✦', '⚛️', '⚡', '⭐', '📚', '💡', '🎓', '✨'];

      for (let i = 0; i < 7; i++) {
        const p = document.createElement('div');
        p.className = 'mascot-burst-particle';
        p.textContent = symbols[i % symbols.length];
        const angle = (i / 7) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 60 + Math.random() * 60;
        const bx = Math.cos(angle) * dist;
        const by = Math.sin(angle) * dist;
        p.style.setProperty('--bx', `${bx}px`);
        p.style.setProperty('--by', `${by}px`);
        p.style.setProperty('--br', `${(Math.random() - 0.5) * 60}deg`);
        p.style.left = `${originX}px`;
        p.style.top = `${originY}px`;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 650);
      }

      if (speechBubble) {
        const clickQuotes = [
          '🚀 Ready for AIR 1!',
          '✨ 100% Concept Mastery!',
          '⚡ Fast Track Active!',
          '🎯 Full Score in Boards!',
          '💡 AI Doubt Cleared in 10s!',
        ];
        speechBubble.textContent = clickQuotes[Math.floor(Math.random() * clickQuotes.length)];
        speechBubble.style.transform = 'scale(1.15) translateY(-6px)';
        setTimeout(() => (speechBubble.style.transform = ''), 400);
      }
    });
  }

  // Click Shockwave
  window.addEventListener(
    'mousedown',
    (e) => {
      isClicking = true;
      createClickShockwave(e.clientX, e.clientY);
    },
    { passive: true }
  );

  window.addEventListener(
    'mouseup',
    () => {
      isClicking = false;
    },
    { passive: true }
  );

  function createClickShockwave(x, y) {
    const wave = document.createElement('div');
    wave.className = 'cursor-shockwave';
    wave.style.left = `${x}px`;
    wave.style.top = `${y}px`;
    document.body.appendChild(wave);
    setTimeout(() => wave.remove(), 500);
  }

  // High-Performance Smooth RAF Loop
  let currentRotX = 0;
  let currentRotY = 0;

  function renderCursor() {
    if (mouse.visible) {
      const dx = mouse.x - ring.x;
      const dy = mouse.y - ring.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      ring.x += dx * 0.18;
      ring.y += dy * 0.18;

      const speed = Math.min(dist, 35);
      ring.stretch = 1 + speed * 0.005;
      ring.angle = Math.atan2(dy, dx);

      let targetScale = isClicking ? 0.8 : 1;
      ring.scale += (targetScale - ring.scale) * 0.22;

      const scaleX = ring.scale * ring.stretch;
      const scaleY = ring.scale / ring.stretch;

      cursorRing.style.transform = `translate3d(${ring.x.toFixed(1)}px, ${ring.y.toFixed(1)}px, 0) rotate(${ring.angle.toFixed(2)}rad) scale(${scaleX.toFixed(2)}, ${scaleY.toFixed(2)})`;
    }

    // Smooth mascot 3D tilt
    if (mascotCard) {
      const mdx = (mouse.x - mascotCenterX) / (window.innerWidth * 0.5);
      const mdy = (mouse.y - mascotCenterY) / (window.innerHeight * 0.5);
      const targetRotY = Math.max(-14, Math.min(14, mdx * 14));
      const targetRotX = Math.max(-12, Math.min(12, -mdy * 12));

      currentRotX += (targetRotX - currentRotX) * 0.12;
      currentRotY += (targetRotY - currentRotY) * 0.12;

      mascotCard.style.transform = `perspective(900px) rotateX(${currentRotX.toFixed(2)}deg) rotateY(${currentRotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
    }

    // Smooth 3D parallax for 4 floating cubes
    for (let i = 0; i < cachedCubeMetrics.length; i++) {
      const c = cachedCubeMetrics[i];
      const cdx = (mouse.x - c.cx) / window.innerWidth;
      const cdy = (mouse.y - c.cy) / window.innerHeight;
      c.el.style.transform = `perspective(600px) rotateY(${(cdx * 18).toFixed(1)}deg) rotateX(${(-cdy * 18).toFixed(1)}deg) translateZ(10px)`;
    }

    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);
})();
