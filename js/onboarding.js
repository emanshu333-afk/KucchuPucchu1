/**
 * PrepPilot - First-Time Course Onboarding & Calibration Controller
 */

(function () {
  'use strict';

  const urlParams = new URLSearchParams(window.location.search);
  const rawUser = urlParams.get('user') || localStorage.getItem('preppilot_student_name') || 'Arjun Sharma';
  const userId = window.PrepPilotAccount ? window.PrepPilotAccount.sanitizeId(rawUser) : rawUser;

  // Never ask again: If this account has already completed onboarding, route directly to dashboard
  if (window.PrepPilotAccount && window.PrepPilotAccount.isAccountOnboarded(userId)) {
    window.location.href = `dashboard.html?user=${encodeURIComponent(rawUser)}`;
    return;
  }

  // Title Welcome
  const welcomeTitle = document.getElementById('onboard-welcome-title');
  if (welcomeTitle && rawUser) {
    const firstName = rawUser.split(' ')[0];
    welcomeTitle.textContent = `Tailor Your Flight Path, ${firstName}!`;
  }

  // State
  let selectedClass = '10th';
  let selectedBoard = 'CBSE Board Mastery';
  let selectedHours = 3.0;
  let targetScore = 98.5;

  // Course Definitions per Class Category
  const coursesJunior = [
    {
      id: 'CBSE Board Mastery',
      icon: '📘',
      title: 'CBSE Board Excellence',
      tag: 'Most Popular',
      desc: 'NCERT line-by-line concept visualizers, Class 10 board question banks, and animated 3D science practicals.',
    },
    {
      id: 'ICSE Board Excellence',
      icon: '🏛️',
      title: 'ICSE Council Track',
      tag: 'Comprehensive',
      desc: 'Analytical Selina & Concise mastery, rigorous answer-writing clinics, and literature breakdown.',
    },
    {
      id: 'Foundation & Olympiads',
      icon: '🏆',
      title: 'Foundation + Olympiads',
      tag: 'Competitive',
      desc: 'Advanced problem solving and mental agility for PRMO, NSO, IMO, and future JEE/NEET building blocks.',
    },
  ];

  const coursesSenior = [
    {
      id: 'IIT-JEE Main & Advanced',
      icon: '⚡',
      title: 'IIT-JEE Main & Advanced',
      tag: 'Top Rank Track',
      desc: 'Deep conceptual physics, HC Verma / Irodov numerical solvers, calculus drills, and 12th board sync.',
    },
    {
      id: 'NEET-UG Medical 360/360',
      icon: '🩺',
      title: 'NEET-UG Medical 360/360',
      tag: 'Medical Goal',
      desc: 'NCERT Biology 360 decoders, high-speed physics numerical shortcuts, and CBT mock test simulation.',
    },
    {
      id: '12th Board 95%+ Distinction',
      icon: '🎓',
      title: '12th Board Distinction Track',
      tag: 'Boards Only',
      desc: 'Guaranteed scoring blueprint for CBSE & ISC 12th board examinations with step-marking clinics.',
    },
  ];

  const coursesDropper = [
    {
      id: '180-Day Hyper Sprint (JEE)',
      icon: '🚀',
      title: '180-Day JEE Hyper Sprint',
      tag: 'Rank Accelerator',
      desc: 'High-yield problem drills, full syllabus marathon, daily 100-Q timed sets, and AI error diagnostic healing.',
    },
    {
      id: '180-Day Hyper Sprint (NEET)',
      icon: '🩺',
      title: '180-Day NEET Hyper Sprint',
      tag: 'Rank Accelerator',
      desc: 'Rapid revision cycles, NCERT line-by-line bio mocks, high-accuracy chemistry numerical workouts.',
    },
  ];

  const courseContainer = document.getElementById('course-options-list');

  function renderCourseOptions() {
    if (!courseContainer) return;

    let list = coursesJunior;
    const classNum = parseInt(selectedClass, 10);

    if (selectedClass.toLowerCase().includes('drop')) {
      list = coursesDropper;
    } else if (classNum >= 11) {
      list = coursesSenior;
    }

    courseContainer.innerHTML = list
      .map((c, idx) => {
        const isSelected = idx === 0 || c.id === selectedBoard;
        if (idx === 0) selectedBoard = c.id;

        return `
        <div class="course-choice-card ${isSelected ? 'selected' : ''}" data-course="${c.id}">
          <div class="course-icon-badge">${c.icon}</div>
          <div class="course-info">
            <div class="course-header-row">
              <span class="course-title">${c.title}</span>
              <span class="course-tag">${c.tag}</span>
            </div>
            <p class="course-desc">${c.desc}</p>
          </div>
        </div>
      `;
      })
      .join('');

    // Bind click handlers to newly rendered cards
    const cards = courseContainer.querySelectorAll('.course-choice-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        cards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedBoard = card.getAttribute('data-course');
      });
    });
  }

  // 1. Class Selection Listener
  const classPills = document.querySelectorAll('.class-choice-pill');
  classPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      classPills.forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedClass = pill.getAttribute('data-class');
      renderCourseOptions();
    });
  });

  // Initial render
  renderCourseOptions();

  // 2. Target Score Slider
  const slider = document.getElementById('onboard-slider');
  const targetBadge = document.getElementById('target-score-badge');
  if (slider && targetBadge) {
    slider.addEventListener('input', (e) => {
      targetScore = parseFloat(e.target.value);
      targetBadge.textContent = `Target: ${targetScore.toFixed(1)}%`;
    });
  }

  // 3. Daily Hours Pills
  const hourPills = document.querySelectorAll('.hours-pill');
  hourPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      hourPills.forEach((h) => h.classList.remove('selected'));
      pill.classList.add('selected');
      selectedHours = parseFloat(pill.getAttribute('data-hours'));
    });
  });

  // 4. Form Submit
  const form = document.getElementById('onboarding-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (window.PrepPilotAccount) {
        window.PrepPilotAccount.completeOnboarding(userId, {
          name: rawUser,
          selectedClass: selectedClass,
          selectedBoard: selectedBoard,
          targetScore: targetScore,
          dailyHours: selectedHours,
        });
      }

      // Redirect directly to dashboard with user handle
      window.location.href = `dashboard.html?user=${encodeURIComponent(rawUser)}&onboarded=true`;
    });
  }
})();
