/**
 * PrepPilot - Motion Graphics & Dynamic Rotators (Inspired by Reference)
 * Features:
 * 1. Animated Word Rotator with 3D Flip
 * 2. Dynamic Speech Bubble Messenger
 * 3. Curriculum Tab Controller
 */

(function () {
  'use strict';

  // 1. Dynamic Word Rotator (Identical to reference video word flip!)
  const wordFlipper = document.getElementById('rotating-word-pill');
  const wordText = document.getElementById('rotating-word-text');

  const learningWords = [
    'CBSE & ICSE',
    'JEE Advanced',
    'NEET Medical',
    '10th & 12th Boards',
    'Dropper Sprint',
  ];
  let currentWordIndex = 0;

  function cycleWord() {
    if (!wordFlipper || !wordText) return;

    wordFlipper.classList.add('word-flipping');

    setTimeout(() => {
      currentWordIndex = (currentWordIndex + 1) % learningWords.length;
      wordText.textContent = learningWords[currentWordIndex];
      wordFlipper.classList.remove('word-flipping');
    }, 280);
  }

  setInterval(cycleWord, 2600);

  // 2. Interactive Speech Bubble Messenger (Like "Hola" in reference video!)
  const speechBubble = document.getElementById('mascot-speech');
  const speechMessages = [
    '✨ Concept Cleared!',
    '🚀 AIR 1 Target Set',
    '💡 Doubt Solved 24/7',
    '🎯 99.8% Board Score',
    '⚡ NCERT Decoded',
  ];
  let speechIndex = 0;

  function cycleSpeech() {
    if (!speechBubble) return;
    speechBubble.style.transform = 'scale(0.8) translateY(5px)';
    speechBubble.style.opacity = '0';

    setTimeout(() => {
      speechIndex = (speechIndex + 1) % speechMessages.length;
      speechBubble.innerHTML = speechMessages[speechIndex];
      speechBubble.style.transform = 'scale(1) translateY(0)';
      speechBubble.style.opacity = '1';
    }, 300);
  }

  setInterval(cycleSpeech, 4500);

  if (speechBubble) {
    speechBubble.addEventListener('click', () => {
      cycleSpeech();
    });
  }

  // 3. Curriculum Tabs Switcher
  const tabBtns = document.querySelectorAll('.tab-pill-btn');
  const tabContents = document.querySelectorAll('.segment-tab-content');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
})();
