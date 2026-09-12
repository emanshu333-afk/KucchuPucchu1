/**
 * PrepPilot - Social Auth Handlers, Interactive Student Simulator & Track Manager
 */

(function () {
  'use strict';

  const authModal = document.getElementById('auth-modal');
  const modalClose = document.getElementById('modal-close-btn');
  const modalTitle = document.getElementById('modal-title');
  const modalStatus = document.getElementById('modal-status');
  const modalProgress = document.getElementById('modal-progress');
  const modalProviderIcon = document.getElementById('modal-provider-icon');
  const modalUserPreview = document.getElementById('modal-user-preview');
  const modalUserName = document.getElementById('modal-user-name');
  const modalUserSub = document.getElementById('modal-user-sub');

  const mascotContainer = document.getElementById('mascot-container');
  const trackBanner = document.getElementById('track-perks-banner');
  const speechBubble = document.getElementById('mascot-speech');
  const fParticle1 = document.getElementById('f-particle-1');
  const fParticle2 = document.getElementById('f-particle-2');
  const fParticle3 = document.getElementById('f-particle-3');

  let activeTrack = 'Class 6th–10th (CBSE & ICSE)';

  // Track Selector inside Auth Card with Mascot Sync
  const trackBtns = document.querySelectorAll('.track-select-btn');
  const trackConfigs = {
    'Class 6th–10th (CBSE & ICSE)': {
      glow: 'glow-junior',
      banner: '📘 CBSE & ICSE Foundation • Animated 3D Labs • Class 10 Board Booster',
      speech: '📘 Class 6–10 Foundation Ready!',
      formulas: ['E=mc²', '∫ x·dx', 'F = m·a'],
    },
    'Class 11th–12th & Boards': {
      glow: 'glow-senior',
      banner: '⚡ JEE Main/Adv & NEET-UG • 12th Board 95%+ Blueprint • CBT Mocks',
      speech: '🚀 JEE & NEET Rocket Launch!',
      formulas: ['Δx·Δp ≥ ℏ/2', '∮ B·dl = μ₀I', 'lim (sin x)/x'],
    },
    'Droppers Competitive Batch': {
      glow: 'glow-dropper',
      banner: '🎯 180-Day Hyper Sprint • Daily 100-Q Drills • AI Error Healer',
      speech: '⚡ Droppers Rank Accelerator Online!',
      formulas: ['AIR < 100', '180-Day Sprint', '100 Qs/Day'],
    },
  };

  trackBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      trackBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTrack = btn.getAttribute('data-track');

      let mappedClass = '10th';
      let mappedBoard = 'CBSE Board Mastery';
      if (activeTrack.includes('11')) {
        mappedClass = '12th';
        mappedBoard = 'IIT-JEE Main & Advanced';
      } else if (activeTrack.toLowerCase().includes('drop')) {
        mappedClass = 'Dropper';
        mappedBoard = 'IIT-JEE Dropper Sprint';
      }
      localStorage.setItem('preppilot_active_class', mappedClass);
      localStorage.setItem('preppilot_active_course', mappedBoard);

      const conf = trackConfigs[activeTrack];
      if (conf) {
        if (mascotContainer) {
          mascotContainer.classList.remove('glow-junior', 'glow-senior', 'glow-dropper');
          mascotContainer.classList.add(conf.glow);
        }
        if (trackBanner) {
          trackBanner.textContent = conf.banner;
          trackBanner.style.animation = 'none';
          void trackBanner.offsetWidth; // trigger reflow
          trackBanner.style.animation = 'fadeIn 0.3s ease';
        }
        if (speechBubble) {
          speechBubble.textContent = conf.speech;
          speechBubble.style.transform = 'scale(1.1) translateY(-4px)';
          setTimeout(() => {
            speechBubble.style.transform = '';
          }, 350);
        }
        if (fParticle1) fParticle1.textContent = conf.formulas[0];
        if (fParticle2) fParticle2.textContent = conf.formulas[1];
        if (fParticle3) fParticle3.textContent = conf.formulas[2];
      }
    });
  });

  // Interactive Target Score Simulator
  const prepSlider = document.getElementById('prep-target-slider');
  const scoreBadge = document.getElementById('sim-score-badge');
  const hoursVal = document.getElementById('sim-hours-val');
  const drillsVal = document.getElementById('sim-drills-val');

  if (prepSlider && scoreBadge && hoursVal && drillsVal) {
    prepSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      scoreBadge.textContent = `Target: ${val.toFixed(1)}%`;

      const hours = Math.round((val - 75) * 8.5);
      const drills = Math.round((val - 75) * 2.8);

      hoursVal.textContent = `${hours} hrs`;
      drillsVal.textContent = `${drills} Qs/day`;

      scoreBadge.style.transform = 'scale(1.08)';
      setTimeout(() => {
        scoreBadge.style.transform = 'scale(1)';
      }, 150);
    });
  }

  // Provider SVG Icons
  const providerSVGs = {
    google: `<svg viewBox="0 0 24 24" width="32" height="32">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>`,
    github: `<svg viewBox="0 0 24 24" width="32" height="32" fill="#0f172a">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>`,
    twitter: `<svg viewBox="0 0 24 24" width="30" height="30" fill="#0f172a">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>`,
    email: `<svg viewBox="0 0 24 24" width="32" height="32" fill="#0284c7">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>`,
  };

  // Direct Dashboard Navigation (Routes new accounts to onboarding, returning to dashboard)
  function navigateToDashboard(provider, customUser) {
    localStorage.setItem('preppilot_active_track', activeTrack);
    let defaultUser = 'Arjun Sharma';
    if (provider === 'github') defaultUser = 'dev-student-pilot';
    else if (provider === 'twitter') defaultUser = 'pilot_topper';

    const finalUser = customUser || defaultUser;
    localStorage.setItem('preppilot_student_name', finalUser);

    const trackParam = activeTrack.toLowerCase().includes('6') ? 'junior' : activeTrack.toLowerCase().includes('drop') ? 'dropper' : 'senior';

    // Ensure account is created and marked onboarded so student enters dashboard screen directly
    if (window.PrepPilotAccount) {
      let acc = window.PrepPilotAccount.getAccount(finalUser);
      if (!acc) {
        acc = window.PrepPilotAccount.createAccount(finalUser, finalUser, provider);
      }
      acc.onboarded = true;
      window.PrepPilotAccount.saveAccount(acc);
      window.PrepPilotAccount.setCurrentUserId(finalUser);
    }

    const targetClass = localStorage.getItem('preppilot_active_class') || (trackParam === 'junior' ? '10th' : trackParam === 'dropper' ? 'Dropper' : '12th');
    const targetCourse = localStorage.getItem('preppilot_active_course') || '';
    window.location.href = `dashboard.html?track=${trackParam}&class=${encodeURIComponent(targetClass)}&board=${encodeURIComponent(targetCourse)}&user=${encodeURIComponent(finalUser)}`;
  }

  // Social Login Triggers -> Check onboarding & route
  const socialBtns = document.querySelectorAll('[data-provider]');
  socialBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const provider = btn.getAttribute('data-provider');
      navigateToDashboard(provider);
    });
  });

  // Quick ID Form Submit -> Check onboarding & route
  const quickAuthForm = document.getElementById('quick-auth-form');
  if (quickAuthForm) {
    quickAuthForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idInput = document.getElementById('student-id-input');
      const idVal = idInput && idInput.value.trim() ? idInput.value.trim() : 'Arjun Sharma';
      navigateToDashboard('id', idVal);
    });
  }

  // Add New Account Button Listener
  const btnNewAccount = document.getElementById('btn-create-new-account');
  if (btnNewAccount) {
    btnNewAccount.addEventListener('click', () => {
      const newName = prompt('Enter new student name or roll number to add account:', 'Priya Verma');
      if (newName && newName.trim()) {
        const idInput = document.getElementById('student-id-input');
        if (idInput) idInput.value = newName.trim();
        navigateToDashboard('manual_new', newName.trim());
      }
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      authModal.classList.remove('active');
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === authModal) {
      authModal.classList.remove('active');
    }
  });

  // Custom Logo Replacer & Persistent Storage
  const logoElements = document.querySelectorAll('.preppilot-logo');
  const logoFileInput = document.getElementById('logo-file-input');
  const logoToolBtn = document.getElementById('btn-logo-tool');

  const savedLogo = localStorage.getItem('preppilot_custom_logo');
  if (savedLogo) {
    applyLogo(savedLogo);
  }

  function applyLogo(src) {
    logoElements.forEach((img) => {
      img.src = src;
    });
  }

  if (logoToolBtn && logoFileInput) {
    logoToolBtn.addEventListener('click', () => {
      logoFileInput.click();
    });

    logoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const data = ev.target.result;
          applyLogo(data);
          localStorage.setItem('preppilot_custom_logo', data);
        };
        reader.readAsDataURL(file);
      }
    });
  }
})();
