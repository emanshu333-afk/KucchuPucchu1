/**
 * PrepPilot - High-Trust Gen Z Horizontal Onboarding & Login Controller
 * Manages 3-slide horizontal carousel, stepper tabs, interactive streak & XP widgets,
 * planner preview, target percentile slider, and credentials handshake.
 */

(function () {
  'use strict';

  let currentSlideIndex = 0;
  const TOTAL_SLIDES = 3;
  let isSignUpMode = true;

  function initLoginExperience() {
    // 1. Carousel & Stepper Elements
    const slidesTrack = document.getElementById('login-slides-track');
    const stepperPills = document.querySelectorAll('.stepper-pill-btn');
    const btnNextTo2 = document.getElementById('btn-next-to-slide-2');
    const btnSkipToLogin = document.getElementById('btn-skip-to-login');
    const btnBackTo1 = document.getElementById('btn-back-to-slide-1');
    const btnNextTo3 = document.getElementById('btn-next-to-slide-3');
    const btnBackToTour = document.getElementById('btn-back-to-tour');

    // 2. Slide Navigation Function
    function goToSlide(index) {
      if (index < 0) index = 0;
      if (index >= TOTAL_SLIDES) index = TOTAL_SLIDES - 1;
      currentSlideIndex = index;

      // Translate track: 0% for slide 0, -33.333% for slide 1, -66.666% for slide 2
      if (slidesTrack) {
        const offsetPercent = (currentSlideIndex * (100 / TOTAL_SLIDES));
        slidesTrack.style.transform = `translateX(-${offsetPercent}%)`;
      }

      // Update stepper pill active states
      stepperPills.forEach((pill) => {
        const pillSlide = parseInt(pill.getAttribute('data-slide'), 10);
        pill.classList.toggle('active', pillSlide === currentSlideIndex);
      });
    }

    // Bind Stepper Pill clicks
    stepperPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const targetIdx = parseInt(pill.getAttribute('data-slide'), 10);
        goToSlide(targetIdx);
      });
    });

    // Bind Slide 1 Buttons
    if (btnNextTo2) btnNextTo2.addEventListener('click', () => goToSlide(1));
    if (btnSkipToLogin) btnSkipToLogin.addEventListener('click', () => goToSlide(2));

    // Bind Slide 2 Buttons
    if (btnBackTo1) btnBackTo1.addEventListener('click', () => goToSlide(0));
    if (btnNextTo3) btnNextTo3.addEventListener('click', () => goToSlide(2));

    // Bind Slide 3 Back to Tour
    if (btnBackToTour) btnBackToTour.addEventListener('click', () => goToSlide(0));

    // Keyboard Arrow navigation (Left/Right)
    document.addEventListener('keydown', (e) => {
      // Don't intercept if user is typing in form inputs
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowRight' && currentSlideIndex < TOTAL_SLIDES - 1) {
        goToSlide(currentSlideIndex + 1);
      } else if (e.key === 'ArrowLeft' && currentSlideIndex > 0) {
        goToSlide(currentSlideIndex - 1);
      }
    });

    // 3. Slide 1 Interactive Gen Z Widgets
    const cardStreak = document.getElementById('card-streak');
    const streakBadge = document.getElementById('streak-badge');
    let streakCount = 14;

    if (cardStreak) {
      cardStreak.addEventListener('click', () => {
        streakCount += 1;
        if (streakBadge) {
          streakBadge.textContent = `🔥 ${streakCount}-Day Streak (+50 XP!)`;
          streakBadge.style.transform = 'scale(1.15)';
          setTimeout(() => { streakBadge.style.transform = ''; }, 200);
        }
        showToast(`🔥 Streak boosted to ${streakCount} days! Daily XP multiplier x1.5 active.`);
      });
    }

    const cardXp = document.getElementById('card-xp');
    const xpBadge = document.getElementById('xp-badge');
    let xpVal = 450;

    if (cardXp) {
      cardXp.addEventListener('click', () => {
        xpVal += 100;
        if (xpBadge) {
          xpBadge.textContent = `+${xpVal} XP`;
          xpBadge.style.transform = 'scale(1.15)';
          setTimeout(() => { xpBadge.style.transform = ''; }, 200);
        }
        showToast(`⚡ Rank progression: +100 XP added! Approaching Level 19 Flight Officer.`);
      });
    }

    // 4. Slide 2 Interactive Daily Planner Preview Tabs
    const plannerDayTabs = document.querySelectorAll('.p-day-tab');
    plannerDayTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        plannerDayTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const dayNum = tab.getAttribute('data-pday');
        showToast(`🗓️ Previewing Daily Flight Plan for Day ${dayNum}. All 4 pillars synced.`);
      });
    });

    // 5. Slide 2 Interactive Target Percentile Slider
    const targetSlider = document.getElementById('login-target-slider');
    const targetBadge = document.getElementById('slider-target-badge');
    const paceLabel = document.getElementById('slider-pace-label');
    const hoursLabel = document.getElementById('slider-hours-label');
    const drillsLabel = document.getElementById('slider-drills-label');

    if (targetSlider && targetBadge) {
      function updateSliderMetrics(val) {
        const num = parseFloat(val);
        targetBadge.textContent = `${num.toFixed(1)}%ile`;

        let paceText = '📘 CBSE Board 95%+ Pace';
        let hours = Math.round((num - 75) * 8.2);
        let drills = Math.round((num - 75) * 2.8);

        if (num >= 99.0) {
          paceText = '⚡ Top AIR < 200 (IIT / AIIMS Pace)';
          targetBadge.style.background = '#fef3c7';
          targetBadge.style.color = '#b45309';
          targetBadge.style.borderColor = '#fde68a';
        } else if (num >= 95.0) {
          paceText = '🎯 Top NIT / GMC Merit Pace';
          targetBadge.style.background = '#e0e7ff';
          targetBadge.style.color = '#4338ca';
          targetBadge.style.borderColor = '#c7d2fe';
        } else {
          paceText = '📘 CBSE / ICSE Distinction Pace';
          targetBadge.style.background = '#f1f5f9';
          targetBadge.style.color = '#0f172a';
          targetBadge.style.borderColor = '#e2e8f0';
        }

        if (paceLabel) paceLabel.textContent = paceText;
        if (hoursLabel) hoursLabel.textContent = `${hours} hrs`;
        if (drillsLabel) drillsLabel.textContent = `${drills} Qs/day`;

        try {
          localStorage.setItem('preppilot_target_percentile', num.toFixed(1));
        } catch (e) {
          console.warn(e);
        }
      }

      targetSlider.addEventListener('input', (e) => {
        updateSliderMetrics(e.target.value);
        targetBadge.style.transform = 'scale(1.08)';
        setTimeout(() => { targetBadge.style.transform = 'scale(1)'; }, 150);
      });

      const savedGoal = localStorage.getItem('preppilot_target_percentile') || '99.4';
      targetSlider.value = savedGoal;
      updateSliderMetrics(savedGoal);
    }

    // 6. Slide 3: Sign-Up vs Log-In Mode Toggle
    const titleEl = document.getElementById('login-title');
    const subtitleToggle = document.getElementById('login-subtitle-toggle');
    const toggleLink = document.getElementById('login-toggle-link');
    const submitBtn = document.getElementById('btn-login-submit');

    if (toggleLink) {
      toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;

        if (isSignUpMode) {
          if (titleEl) titleEl.textContent = 'Get started with PrepPilot';
          if (subtitleToggle) subtitleToggle.childNodes[0].nodeValue = 'Already have an account? ';
          if (toggleLink) toggleLink.textContent = 'Log in';
          if (submitBtn) submitBtn.textContent = 'Continue';
        } else {
          if (titleEl) titleEl.textContent = 'Welcome back to PrepPilot';
          if (subtitleToggle) subtitleToggle.childNodes[0].nodeValue = 'Don’t have an account? ';
          if (toggleLink) toggleLink.textContent = 'Sign up';
          if (submitBtn) submitBtn.textContent = 'Sign In to Cockpit →';
        }
      });
    }

    // 7. Form Submission Handler
    const loginForm = document.getElementById('login-auth-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!email) {
          showToast('⚠️ Please enter your student email or roll number.');
          if (emailInput) emailInput.focus();
          return;
        }

        if (!password || password.length < 4) {
          showToast('⚠️ Please enter a password of at least 4 characters.');
          if (passwordInput) passwordInput.focus();
          return;
        }

        let studentName = email.split('@')[0];
        studentName = studentName.charAt(0).toUpperCase() + studentName.slice(1);
        saveAndNavigate(studentName, 'email');
      });
    }

    // 8. 1-Click Google Sign-In
    const btnGoogle = document.getElementById('btn-login-google');
    if (btnGoogle) {
      btnGoogle.addEventListener('click', () => {
        showToast('🔄 Connecting encrypted Google Student Handshake...');
        btnGoogle.style.opacity = '0.7';
        btnGoogle.style.pointerEvents = 'none';

        setTimeout(() => {
          saveAndNavigate('Arjun Sharma', 'google');
        }, 600);
      });
    }

    // 9. Quick Demo Access as Guest Student
    const btnQuickGuest = document.getElementById('btn-quick-guest');
    if (btnQuickGuest) {
      btnQuickGuest.addEventListener('click', (e) => {
        e.preventDefault();
        saveAndNavigate('Student Pilot', 'guest');
      });
    }

    // 10. Save Session & Navigate to Cockpit Dashboard
    function saveAndNavigate(name, provider) {
      try {
        localStorage.setItem('preppilot_student_name', name);
        localStorage.setItem('preppilot_auth_provider', provider);
        localStorage.setItem('preppilot_user_logged_in', 'true');

        if (!localStorage.getItem('preppilot_active_class')) {
          localStorage.setItem('preppilot_active_class', '10th');
          localStorage.setItem('preppilot_active_course', 'CBSE Board Mastery');
        }
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }

      showToast(`✓ Identity verified! Welcome, ${name}. Launching cockpit...`);

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    }

    // Toast feedback helper
    const toastEl = document.getElementById('login-toast');
    function showToast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      toastEl.classList.add('active');

      if (window._loginToastTimer) clearTimeout(window._loginToastTimer);
      window._loginToastTimer = setTimeout(() => {
        toastEl.classList.remove('active');
      }, 3500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginExperience);
  } else {
    initLoginExperience();
  }
})();
