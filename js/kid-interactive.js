/**
 * PrepPilot - Interactive Kid Mascot Engine
 * Handles:
 * 1. Lifelike eye tracking (pupils follow cursor), periodic natural blinking, and click winking
 * 2. Interactive Book with 3D Page Flip, chapter cycling, formula updates, and Holographic Projector Beam
 * 3. Interactive Hands with proximity lift, wiggle, and high-five / quick-notes reactions
 * 4. Interactive Head with petting nod, glasses glint, and brainpower sparks
 * 5. Interactive Sneakers with bounce sprint practice mode
 */

(function () {
  'use strict';

  // Book elements
  const interactiveBook = document.getElementById('kid-interactive-book');
  const bookHoloBeam = document.getElementById('kid-holo-beam');
  const bookChapterTag = document.getElementById('kid-book-chapter');
  const speechBubble = document.getElementById('mascot-speech');

  // Hands elements
  const handLeft = document.getElementById('kid-hand-left');
  const handRight = document.getElementById('kid-hand-right');

  // Head & Glasses elements
  const headZone = document.getElementById('kid-head-zone');

  // Sneaker elements
  const sneakerLeft = document.getElementById('kid-sneaker-left');
  const sneakerRight = document.getElementById('kid-sneaker-right');

  // 4. Interactive Book Actions (Click to Turn Page & Cycle Knowledge Tracks)
  const bookChapters = [
    { title: 'Ch. 4: Physics Mechanics', formulas: ['v = u + at', 'E = mc²', 'p = mv'] },
    { title: 'Ch. 7: Calculus & Derivatives', formulas: ['∫ x·dx', 'dy/dx', 'lim (sin x)/x'] },
    { title: 'Ch. 12: Organic Chemistry', formulas: ['C₆H₆ Benzene', 'SN1 vs SN2', 'H₂O + CO₂'] },
    { title: 'Ch. 9: Genetics & DNA', formulas: ['DNA Helix', 'ATP Synthesis', 'Gregor Mendel'] },
  ];
  let chapterIndex = 0;

  if (interactiveBook) {
    interactiveBook.addEventListener('click', (e) => {
      e.stopPropagation();

      // Page flip soundless visual reaction
      interactiveBook.classList.add('page-flipping');
      setTimeout(() => interactiveBook.classList.remove('page-flipping'), 420);

      // Cycle chapter
      chapterIndex = (chapterIndex + 1) % bookChapters.length;
      const currentCh = bookChapters[chapterIndex];

      if (bookChapterTag) {
        bookChapterTag.textContent = currentCh.title;
        bookChapterTag.style.transform = 'translateX(-50%) scale(1.15)';
        setTimeout(() => (bookChapterTag.style.transform = ''), 220);
      }

      // Update flying formula particles
      const f1 = document.getElementById('f-particle-1');
      const f2 = document.getElementById('f-particle-2');
      const f3 = document.getElementById('f-particle-3');
      if (f1) f1.textContent = currentCh.formulas[0];
      if (f2) f2.textContent = currentCh.formulas[1];
      if (f3) f3.textContent = currentCh.formulas[2];

      // Spawn science sparkles
      spawnBurstSparks(e.clientX, e.clientY, ['✦', '✨', '⚡', '💡', '📐', '⚛️', '📘']);

      // Speech reaction
      if (speechBubble) {
        speechBubble.textContent = `📖 Opened ${currentCh.title.split(':')[1]}!`;
        speechBubble.style.transform = 'scale(1.15) translateY(-5px)';
        setTimeout(() => (speechBubble.style.transform = ''), 400);
      }
    });

    // Hover reveals holographic projection
    interactiveBook.addEventListener('mouseenter', () => {
      if (bookHoloBeam) bookHoloBeam.classList.add('active');
    });

    interactiveBook.addEventListener('mouseleave', () => {
      if (bookHoloBeam) bookHoloBeam.classList.remove('active');
    });
  }

  // 5. Interactive Hands Actions (High-Five & Speed Notes)
  if (handLeft) {
    handLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      handLeft.classList.add('hand-wiggle');
      setTimeout(() => handLeft.classList.remove('hand-wiggle'), 450);

      if (speechBubble) {
        const leftQuotes = [
          '🖐️ High Five, Pilot! Ready for Class 10 Boards!',
          '🖐️ Awesome job! Consistency is key!',
          '🖐️ High Five! Let\'s crack JEE Main today!',
        ];
        speechBubble.textContent = leftQuotes[Math.floor(Math.random() * leftQuotes.length)];
        speechBubble.style.transform = 'scale(1.15) translateY(-6px)';
        setTimeout(() => (speechBubble.style.transform = ''), 400);
      }
      spawnBurstSparks(e.clientX, e.clientY, ['🖐️', '⭐', '✨', '🔥', '🚀']);
    });
  }

  if (handRight) {
    handRight.addEventListener('click', (e) => {
      e.stopPropagation();
      handRight.classList.add('hand-wiggle');
      setTimeout(() => handRight.classList.remove('hand-wiggle'), 450);

      if (speechBubble) {
        const rightQuotes = [
          '✍️ Formula Sheet updated in your library!',
          '✍️ Quick revision notes generated!',
          '✍️ 5 high-yield tricks written down!',
        ];
        speechBubble.textContent = rightQuotes[Math.floor(Math.random() * rightQuotes.length)];
        speechBubble.style.transform = 'scale(1.15) translateY(-6px)';
        setTimeout(() => (speechBubble.style.transform = ''), 400);
      }
      spawnBurstSparks(e.clientX, e.clientY, ['✍️', '📝', '💡', '📐', '⚡']);
    });
  }

  // 6. Interactive Head Petting & Glasses Glint
  if (headZone) {
    headZone.addEventListener('click', (e) => {
      e.stopPropagation();

      // Trigger glasses glint sweep
      headZone.classList.add('glasses-glint');
      setTimeout(() => headZone.classList.remove('glasses-glint'), 550);

      // Cute head nod
      const mascotCard = document.getElementById('mascot-3d-card');
      if (mascotCard) {
        mascotCard.style.transform = 'translateY(-14px) rotate(2.5deg) scale(1.05)';
        setTimeout(() => {
          mascotCard.style.transform = 'translateY(4px) rotate(-1.5deg) scale(0.98)';
          setTimeout(() => (mascotCard.style.transform = ''), 200);
        }, 180);
      }

      const headQuotes = [
        '🧠 Full Brainpower Activated: 100% Focus Mode!',
        '💡 Conceptual Clarity: Solved in 30 seconds!',
        '⭐ ICSE & CBSE Distinction Guaranteed!',
        '🚀 Aiming straight for AIR 1 in JEE & NEET!',
      ];
      const q = headQuotes[Math.floor(Math.random() * headQuotes.length)];
      if (speechBubble) {
        speechBubble.textContent = q;
        speechBubble.style.transform = 'scale(1.18) translateY(-6px)';
        setTimeout(() => (speechBubble.style.transform = ''), 400);
      }
      spawnBurstSparks(e.clientX, e.clientY, ['🧠', '💡', '⭐', '✨', '🎓']);
    });
  }

  // 7. Interactive Sneakers (Sprint Practice Mode)
  function handleSneakerClick(e) {
    e.stopPropagation();
    const target = e.currentTarget;
    target.classList.add('sneaker-bounce');
    setTimeout(() => target.classList.remove('sneaker-bounce'), 450);

    const sneakerQuotes = [
      '👟 Sprint Practice: 10 Rapid MCQs in 5 mins!',
      '⚡ Speed Boost: Solving physics numericals 2x faster!',
      '🏃 Speedrun syllabus mode engaged!',
    ];
    if (speechBubble) {
      speechBubble.textContent = sneakerQuotes[Math.floor(Math.random() * sneakerQuotes.length)];
      speechBubble.style.transform = 'scale(1.15) translateY(-6px)';
      setTimeout(() => (speechBubble.style.transform = ''), 400);
    }
    spawnBurstSparks(e.clientX, e.clientY, ['👟', '⚡', '🔥', '💨', '🏁']);
  }

  if (sneakerLeft) sneakerLeft.addEventListener('click', handleSneakerClick);
  if (sneakerRight) sneakerRight.addEventListener('click', handleSneakerClick);

  // Spark Particle Generator
  function spawnBurstSparks(x, y, symbols) {
    const list = symbols || ['✦', '✨', '⚡', '💡', '📐', '⚛️'];
    for (let i = 0; i < 7; i++) {
      const spark = document.createElement('div');
      spark.className = 'mascot-burst-particle';
      spark.textContent = list[i % list.length];
      const angle = (i / 7) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 55 + Math.random() * 55;
      const bx = Math.cos(angle) * dist;
      const by = Math.sin(angle) * dist;
      spark.style.setProperty('--bx', `${bx}px`);
      spark.style.setProperty('--by', `${by}px`);
      spark.style.setProperty('--br', `${(Math.random() - 0.5) * 60}deg`);
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 700);
    }
  }

  // Re-bind hover states for custom cursor if cursor script is ready
  if (window.bindInteractiveElements) {
    window.bindInteractiveElements();
  }
})();
