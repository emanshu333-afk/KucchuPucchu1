/**
 * PrepPilot - Main Menu Course & Class Switcher Controller
 * Enables students to seamlessly change their academic class and course stream
 * directly from the main navigation menu across both the Landing Page and Dashboard Cockpit.
 */

(function () {
  'use strict';

  // Master Course Catalog
  const courseCatalog = {
    junior: [
      {
        id: 'CBSE Board Mastery',
        icon: '📘',
        title: 'CBSE Board (6th–10th)',
        desc: 'Maths, Hindi, English, Science, and Social Science.',
      },
      {
        id: 'ICSE Board Excellence',
        icon: '🏛️',
        title: 'ICSE Council (6th–10th)',
        desc: 'Maths, Hindi, English, Science, and Social Science.',
      },
      {
        id: 'Foundation & Olympiads',
        icon: '🏆',
        title: 'Foundation + Olympiad (6th–10th)',
        desc: 'Maths, Hindi, English, Science, and Social Science.',
      },
    ],
    senior: [
      {
        id: 'Normal 11th & 12th Board',
        icon: '🎓',
        title: 'Normal 11th & 12th Board',
        desc: 'Physics, Chemistry, Maths, Zoology, Anatomy, English, Physical Education.',
      },
      {
        id: 'IIT-JEE Main & Advanced',
        icon: '⚡',
        title: 'IIT-JEE (11th & 12th)',
        desc: 'Maths, Physics, and Chemistry.',
      },
      {
        id: 'NEET-UG Medical 360',
        icon: '🩺',
        title: 'NEET-UG Medical (11th & 12th)',
        desc: 'Physics, Chemistry, Zoology, and Anatomy.',
      },
    ],
    dropper: [
      {
        id: '180-Day Hyper Sprint (JEE)',
        icon: '🚀',
        title: 'IIT-JEE Dropper Sprint',
        desc: 'Maths, Physics, and Chemistry.',
      },
      {
        id: '180-Day Hyper Sprint (NEET)',
        icon: '🩺',
        title: 'NEET Dropper Sprint',
        desc: 'Physics, Chemistry, Zoology, and Anatomy.',
      },
    ],
  };

  function getCourseCategory(cls) {
    if (!cls) return 'junior';
    if (cls.toLowerCase().includes('drop')) return 'dropper';
    const num = parseInt(cls, 10);
    if (!isNaN(num) && num >= 11) return 'senior';
    return 'junior';
  }

  function setupSwitcher({
    triggerBtnId,
    dropdownId,
    wrapperId,
    labelId,
    classPillsContainerId,
    streamsGridId,
    applyBtnId,
    isDashboard = false,
  }) {
    const triggerBtn = document.getElementById(triggerBtnId);
    const dropdown = document.getElementById(dropdownId);
    const wrapper = document.getElementById(wrapperId);
    const labelEl = document.getElementById(labelId);
    const classContainer = document.getElementById(classPillsContainerId);
    const streamsGrid = document.getElementById(streamsGridId);
    const applyBtn = document.getElementById(applyBtnId);

    if (!triggerBtn || !dropdown || !classContainer || !streamsGrid || !applyBtn) {
      return;
    }

    // Determine current user
    const currentUserId = window.PrepPilotAccount ? window.PrepPilotAccount.getCurrentUserId() : 'arjun_sharma';
    const account = window.PrepPilotAccount ? window.PrepPilotAccount.getAccount(currentUserId) : null;

    let selectedClass = account ? account.selectedClass : (localStorage.getItem('preppilot_active_class') || '10th');
    let selectedBoard = account ? account.selectedBoard : (localStorage.getItem('preppilot_active_course') || 'CBSE Board Mastery');

    function updateLabel() {
      if (labelEl) {
        labelEl.textContent = `Class ${selectedClass} • ${selectedBoard.replace(' Mastery', '').replace(' Excellence', '')}`;
      }
    }

    updateLabel();

    // Render Streams for Chosen Class
    function renderStreams() {
      const category = getCourseCategory(selectedClass);
      const list = courseCatalog[category] || courseCatalog.junior;

      // Ensure valid selection within category
      const found = list.some((item) => item.id === selectedBoard);
      if (!found && list.length > 0) {
        selectedBoard = list[0].id;
      }

      streamsGrid.innerHTML = list
        .map(
          (c) => `
        <div class="nav-stream-card ${c.id === selectedBoard ? 'active' : ''}" data-stream-id="${c.id}">
          <div class="nav-stream-icon">${c.icon}</div>
          <div class="nav-stream-info">
            <span class="nav-stream-title">${c.title}</span>
            <span class="nav-stream-desc">${c.desc}</span>
          </div>
        </div>
      `
        )
        .join('');

      // Card clicks
      const cards = streamsGrid.querySelectorAll('.nav-stream-card');
      cards.forEach((card) => {
        card.addEventListener('click', () => {
          cards.forEach((c) => c.classList.remove('active'));
          card.classList.add('active');
          selectedBoard = card.getAttribute('data-stream-id');
          applySelection(false);
        });
      });
    }

    // Set active class pill
    function syncClassPills() {
      const pills = classContainer.querySelectorAll('.nav-class-btn');
      pills.forEach((p) => {
        if (p.getAttribute('data-class').toLowerCase() === (selectedClass || '10th').toLowerCase()) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    }

    function applySelection(shouldClose = false) {
      if (shouldClose) {
        dropdown.classList.remove('active');
        if (wrapper) wrapper.classList.remove('active');
      }

      updateLabel();

      // Save to localStorage
      localStorage.setItem('preppilot_active_class', selectedClass);
      localStorage.setItem('preppilot_active_course', selectedBoard);

      // Update in PrepPilotAccount
      if (window.PrepPilotAccount) {
        window.PrepPilotAccount.updateCourseAndClass(currentUserId, selectedClass, selectedBoard);
      }

      // Sync across landing page if on index.html
      if (!isDashboard) {
        // Sync word flipper pill
        const rotatingText = document.getElementById('rotating-word-text');
        if (rotatingText) {
          if (selectedClass.toLowerCase().includes('drop')) {
            rotatingText.textContent = 'Dropper Sprint';
          } else if (parseInt(selectedClass, 10) >= 11) {
            rotatingText.textContent = selectedBoard.includes('NEET') ? 'NEET 360' : 'JEE Main/Adv';
          } else {
            rotatingText.textContent = selectedBoard.includes('ICSE') ? 'ICSE Council' : 'CBSE Board';
          }
        }

        // Sync simulator track button
        const trackButtons = document.querySelectorAll('.track-select-btn');
        if (trackButtons.length > 0) {
          const cat = getCourseCategory(selectedClass);
          trackButtons.forEach((b) => {
            const trackAttr = b.getAttribute('data-track').toLowerCase();
            if (
              (cat === 'junior' && trackAttr.includes('6')) ||
              (cat === 'senior' && (trackAttr.includes('11') || trackAttr.includes('board'))) ||
              (cat === 'dropper' && trackAttr.includes('drop'))
            ) {
              b.click();
            }
          });
        }

        if (shouldClose) {
          showNotificationToast(`🎓 Switched to <strong>Class ${selectedClass} • ${selectedBoard}</strong>! Saved to active profile.`);
        }
      } else {
        // Dispatch event for dashboard to reload syllabus deck immediately!
        window.dispatchEvent(
          new CustomEvent('preppilot:course-changed', {
            detail: {
              selectedClass,
              selectedBoard,
            },
          })
        );
      }
    }

    // Class pill clicks
    const pills = classContainer.querySelectorAll('.nav-class-btn');
    pills.forEach((p) => {
      p.addEventListener('click', () => {
        pills.forEach((btn) => btn.classList.remove('active'));
        p.classList.add('active');
        selectedClass = p.getAttribute('data-class');
        renderStreams();
        applySelection(false);
      });
    });

    // Toggle Dropdown
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = dropdown.classList.toggle('active');
      if (wrapper) wrapper.classList.toggle('active', isActive);
      if (isActive) {
        syncClassPills();
        renderStreams();
      }
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !triggerBtn.contains(e.target)) {
        dropdown.classList.remove('active');
        if (wrapper) wrapper.classList.remove('active');
      }
    });

    // Apply Button
    applyBtn.addEventListener('click', () => {
      applySelection(true);
    });

    // Listen for external course changes (e.g. from in-page dashboard pills)
    window.addEventListener('preppilot:course-changed', (e) => {
      if (e.detail) {
        if (e.detail.selectedClass) selectedClass = e.detail.selectedClass;
        if (e.detail.selectedBoard) selectedBoard = e.detail.selectedBoard;
        updateLabel();
        syncClassPills();
        renderStreams();
      }
    });

    // Initial render of streams
    renderStreams();
    syncClassPills();
  }

  // Toast Helper
  function showNotificationToast(msg) {
    const toast = document.getElementById('site-toast') || document.getElementById('cockpit-toast');
    if (!toast) return;
    toast.innerHTML = msg;
    toast.classList.add('active');
    clearTimeout(window._mainToastTimeout);
    window._mainToastTimeout = setTimeout(() => {
      toast.classList.remove('active');
    }, 3400);
  }

  // Initialize on Landing Page
  setupSwitcher({
    triggerBtnId: 'btn-nav-course',
    dropdownId: 'nav-course-dropdown',
    wrapperId: 'nav-course-selector',
    labelId: 'nav-active-course-label',
    classPillsContainerId: 'nav-class-pills',
    streamsGridId: 'nav-streams-grid',
    applyBtnId: 'btn-nav-apply-course',
    isDashboard: false,
  });

  // Initialize on Dashboard Cockpit
  setupSwitcher({
    triggerBtnId: 'dash-track-dropdown',
    dropdownId: 'dash-course-dropdown',
    wrapperId: 'dash-course-selector-wrap',
    labelId: 'dash-active-track-label',
    classPillsContainerId: 'dash-class-pills',
    streamsGridId: 'dash-streams-grid',
    applyBtnId: 'btn-dash-apply-course',
    isDashboard: true,
  });
})();
