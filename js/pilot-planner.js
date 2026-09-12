/**
 * PrepPilot - Daily Pilot Planner Engine
 * Day-by-day preparation roadmap till the day before the scheduled exam date.
 * Features: Day-wise Lectures, Notes, Practice Problems (DPP), Checkpoint Tests & Downloads.
 */

(function () {
  'use strict';

  // 1. Resolve Mission Data from URL & LocalStorage
  const urlParams = new URLSearchParams(window.location.search);
  let userParam = urlParams.get('user') || urlParams.get('student') || 'guest_pilot';
  let subjectParam = urlParams.get('subject') || 'maths';
  let dateParam = urlParams.get('date') || '';
  let classParam = urlParams.get('class') || '10th';

  const userSanitized = userParam.toLowerCase().replace(/[^a-z0-9]/g, '_');

  let savedMission = null;
  try {
    // Try user key first
    const raw = localStorage.getItem('preppilot_flight_mission_' + userSanitized);
    if (raw) {
      savedMission = JSON.parse(raw);
    } else {
      // Find any flight mission in localStorage
      const anyKey = Object.keys(localStorage).find((k) => k.startsWith('preppilot_flight_mission_'));
      if (anyKey) savedMission = JSON.parse(localStorage.getItem(anyKey));
    }
  } catch (err) {
    console.warn('Could not read saved flight mission:', err);
  }

  const subjectId = savedMission ? savedMission.subjectId : subjectParam;
  const subjectName = savedMission ? savedMission.subjectName : formatSubjectName(subjectId);
  const subjectIcon = savedMission ? savedMission.icon : getSubjectIcon(subjectId);
  const targetExamDate = savedMission ? savedMission.testDate : (dateParam || getOffsetDateIso(4));
  const studentClass = savedMission ? savedMission.class : classParam;
  const chapters = savedMission && savedMission.chapters && savedMission.chapters.length > 0
    ? savedMission.chapters
    : [
        { num: '01', title: 'Foundational Principles & Concepts' },
        { num: '02', title: 'Core Theorems & High-Yield Applications' },
        { num: '03', title: 'Advanced Analysis & Problem Traps' }
      ];

  // 2. Personalize Header & Student Info
  const avatarInitials = document.getElementById('planner-avatar-initials');
  const avatarName = document.getElementById('planner-avatar-name');
  if (avatarInitials) avatarInitials.textContent = getInitials(userParam);
  if (avatarName) avatarName.textContent = userParam.split(' ')[0] || userParam;

  // 3. Timeline Scope Calculation (From Day 1 till Day Before Exam)
  const daysUntilExam = getDaysUntil(targetExamDate);
  // Planner runs till the day before the exam: max(1, daysUntilExam - 1)
  const totalPlannerDays = Math.max(1, daysUntilExam - 1);

  // 4. Populate Hero Summary Card
  const heroSubjectIcon = document.getElementById('planner-subject-icon');
  const heroSubjectTitle = document.getElementById('planner-subject-title');
  const heroClassBadge = document.getElementById('planner-class-badge');
  const heroExamDateBadge = document.getElementById('planner-exam-date-badge');
  const statScopeVal = document.getElementById('stat-scope-val');
  const statTotalDaysVal = document.getElementById('stat-total-days-val');
  const statChaptersCountVal = document.getElementById('stat-chapters-count-val');

  if (heroSubjectIcon) heroSubjectIcon.textContent = subjectIcon;
  if (heroSubjectTitle) heroSubjectTitle.textContent = `${subjectName} Daily Pilot Planner`;
  if (heroClassBadge) {
    heroClassBadge.textContent = studentClass.toLowerCase().includes('drop')
      ? 'Dropper (Class 11 & 12 Combined)'
      : `Class ${studentClass}`;
  }
  if (heroExamDateBadge) heroExamDateBadge.textContent = `🗓️ Exam: ${formatDateHuman(targetExamDate)}`;

  const navKitLink = document.getElementById('nav-btn-download-kit');
  if (navKitLink) {
    navKitLink.href = `download-kit.html?subject=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(targetExamDate)}&class=${encodeURIComponent(studentClass)}&user=${encodeURIComponent(userSanitized)}`;
  }

  if (statScopeVal) {
    statScopeVal.textContent = totalPlannerDays === 1 ? 'Exam Eve Sprint' : `${totalPlannerDays} Days Till Exam Eve`;
  }
  if (statTotalDaysVal) statTotalDaysVal.textContent = `${totalPlannerDays} Day${totalPlannerDays === 1 ? '' : 's'}`;
  if (statChaptersCountVal) statChaptersCountVal.textContent = `${chapters.length} Chapters`;

  // 5. Generate or Retrieve Planner Days & Modules
  // Backend Integration Hook: if backend provided window.PREPPILOT_PLANNER_DATA, use it.
  const plannerSchedule = (typeof window !== 'undefined' && window.PREPPILOT_PLANNER_DATA)
    ? window.PREPPILOT_PLANNER_DATA
    : buildDynamicSchedule(totalPlannerDays, chapters, subjectName);

  // 6. Progress State Management in LocalStorage
  const progressStorageKey = `preppilot_planner_progress_${userSanitized}_${subjectId}_${targetExamDate}`;
  let userProgress = {};
  try {
    const rawProg = localStorage.getItem(progressStorageKey);
    if (rawProg) userProgress = JSON.parse(rawProg);
  } catch (err) {
    userProgress = {};
  }

  // Active Day state
  let activeDayIndex = 0;

  // 7. Render Day Tabs Scroller
  const dayTabsContainer = document.getElementById('day-tabs-container');

  function renderDayTabs() {
    if (!dayTabsContainer) return;

    dayTabsContainer.innerHTML = plannerSchedule.map((day, idx) => {
      const dayTasks = userProgress[day.id] || {};
      const completedCount = ['lectures', 'notes', 'problems', 'test'].filter((k) => !!dayTasks[k]).length;
      const isAllDone = completedCount === 4;
      const statusClass = isAllDone ? 'done' : (completedCount > 0 ? 'partial' : 'todo');
      const statusText = isAllDone ? 'Done ✓' : `${completedCount}/4 Tasks`;

      return `
        <button type="button" class="day-tab-pill ${idx === activeDayIndex ? 'active' : ''}" data-day-idx="${idx}">
          <div class="day-tab-head">
            <span class="day-tab-num">Day ${day.dayNum}</span>
            <span class="day-tab-status ${statusClass}">${statusText}</span>
          </div>
          <span class="day-tab-date">${day.dateLabel}</span>
          <span class="day-tab-progress-text">${day.shortTitle}</span>
        </button>
      `;
    }).join('');

    dayTabsContainer.querySelectorAll('.day-tab-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const idx = parseInt(pill.getAttribute('data-day-idx'), 10);
        selectDay(idx);
      });
    });
  }

  // 8. Select and Render Active Day
  function selectDay(index) {
    if (index < 0 || index >= plannerSchedule.length) return;
    activeDayIndex = index;
    renderDayTabs();
    renderActiveDayContent();
  }

  function renderActiveDayContent() {
    const day = plannerSchedule[activeDayIndex];
    if (!day) return;

    // Day Header
    const numBadge = document.getElementById('active-day-num-badge');
    const dateTag = document.getElementById('active-day-date-tag');
    const statusPill = document.getElementById('active-day-status-pill');
    const titleEl = document.getElementById('active-day-title');
    const chaptersScope = document.getElementById('active-day-chapters-scope');

    const dayTasks = userProgress[day.id] || {};
    const completedCount = ['lectures', 'notes', 'problems', 'test'].filter((k) => !!dayTasks[k]).length;
    const isAllDone = completedCount === 4;

    if (numBadge) numBadge.textContent = `Day ${day.dayNum} of ${plannerSchedule.length}`;
    if (dateTag) dateTag.textContent = `🗓️ ${day.dateLabel} (${day.daysUntilDate})`;
    if (statusPill) {
      statusPill.textContent = isAllDone ? 'Completed (100% Ready) ✓' : `${completedCount} of 4 Modules Completed`;
      statusPill.className = `day-status-pill ${isAllDone ? 'completed' : ''}`;
    }
    if (titleEl) titleEl.textContent = `Day ${day.dayNum}: ${day.title}`;

    if (chaptersScope) {
      chaptersScope.innerHTML = day.targetChapters.map((c) => `
        <span class="day-chapter-tag">
          <span>📚 Ch ${c.num}: ${c.title}</span>
        </span>
      `).join('');
    }

    // Module 1: Lectures
    const modLectureDesc = document.getElementById('mod-lecture-desc');
    const modLectureItems = document.getElementById('mod-lecture-items');
    const chkLectures = document.getElementById('task-chk-lectures');
    const cardLectures = document.querySelector('.card-lectures');

    if (modLectureDesc) modLectureDesc.textContent = day.modules.lectures.description;
    if (modLectureItems) {
      modLectureItems.innerHTML = day.modules.lectures.items.map((it) => `
        <div class="module-item-row">
          <span class="module-item-name">▶️ ${it.title}</span>
          <span class="module-item-meta">${it.duration} • ${it.type}</span>
        </div>
      `).join('');
    }
    if (chkLectures) {
      chkLectures.checked = !!dayTasks.lectures;
      if (cardLectures) cardLectures.classList.toggle('completed', !!dayTasks.lectures);
    }

    // Module 2: Notes
    const modNotesDesc = document.getElementById('mod-notes-desc');
    const modNotesItems = document.getElementById('mod-notes-items');
    const chkNotes = document.getElementById('task-chk-notes');
    const cardNotes = document.querySelector('.card-notes');

    if (modNotesDesc) modNotesDesc.textContent = day.modules.notes.description;
    if (modNotesItems) {
      modNotesItems.innerHTML = day.modules.notes.items.map((it) => `
        <div class="module-item-row">
          <span class="module-item-name">📄 ${it.title}</span>
          <span class="module-item-meta">${it.pages} • ${it.format}</span>
        </div>
      `).join('');
    }
    if (chkNotes) {
      chkNotes.checked = !!dayTasks.notes;
      if (cardNotes) cardNotes.classList.toggle('completed', !!dayTasks.notes);
    }

    // Module 3: Problems
    const modProblemsDesc = document.getElementById('mod-problems-desc');
    const modProblemsItems = document.getElementById('mod-problems-items');
    const chkProblems = document.getElementById('task-chk-problems');
    const cardProblems = document.querySelector('.card-problems');

    if (modProblemsDesc) modProblemsDesc.textContent = day.modules.problems.description;
    if (modProblemsItems) {
      modProblemsItems.innerHTML = day.modules.problems.items.map((it) => `
        <div class="module-item-row">
          <span class="module-item-name">🎯 ${it.title}</span>
          <span class="module-item-meta">${it.count} Questions • ${it.level}</span>
        </div>
      `).join('');
    }
    if (chkProblems) {
      chkProblems.checked = !!dayTasks.problems;
      if (cardProblems) cardProblems.classList.toggle('completed', !!dayTasks.problems);
    }

    // Module 4: Checkpoint Test
    const modTestDesc = document.getElementById('mod-test-desc');
    const modTestItems = document.getElementById('mod-test-items');
    const chkTest = document.getElementById('task-chk-test');
    const cardTest = document.querySelector('.card-test');

    if (modTestDesc) modTestDesc.textContent = day.modules.test.description;
    if (modTestItems) {
      modTestItems.innerHTML = `
        <div class="module-item-row">
          <span class="module-item-name">⏱️ ${day.modules.test.title}</span>
          <span class="module-item-meta">${day.modules.test.questionsCount} MCQs • ${day.modules.test.duration}</span>
        </div>
        <div class="module-item-row">
          <span class="module-item-name">📊 Syllabus Coverage:</span>
          <span class="module-item-meta">${day.targetChapters.map((c) => 'Ch ' + c.num).join(', ')}</span>
        </div>
      `;
    }
    if (chkTest) {
      chkTest.checked = !!dayTasks.test;
      if (cardTest) cardTest.classList.toggle('completed', !!dayTasks.test);
    }

    updateOverallMetrics();
  }

  // 9. Checkbox Task Toggling
  document.querySelectorAll('.task-toggle').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const mod = chk.getAttribute('data-module');
      const day = plannerSchedule[activeDayIndex];
      if (!day) return;

      if (!userProgress[day.id]) userProgress[day.id] = {};
      userProgress[day.id][mod] = chk.checked;

      // Persist in localStorage
      try {
        localStorage.setItem(progressStorageKey, JSON.stringify(userProgress));
      } catch (err) {
        console.warn('Could not save planner progress:', err);
      }

      // Update UI
      const card = chk.closest('.module-card');
      if (card) card.classList.toggle('completed', chk.checked);

      renderDayTabs();
      updateOverallMetrics();

      if (chk.checked) {
        showPlannerToast(`✅ Completed ${mod.toUpperCase()} for Day ${day.dayNum}! +25 XP awarded.`);
      }
    });
  });

  // 10. Update Overall Mission Metrics & Progress Bar
  function updateOverallMetrics() {
    let totalTasks = plannerSchedule.length * 4;
    let completedTasks = 0;

    plannerSchedule.forEach((day) => {
      const dt = userProgress[day.id] || {};
      ['lectures', 'notes', 'problems', 'test'].forEach((m) => {
        if (dt[m]) completedTasks++;
      });
    });

    const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const progressFill = document.getElementById('planner-progress-fill');
    const progressText = document.getElementById('progress-percentage-text');
    const statReadiness = document.getElementById('stat-readiness-val');

    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${completedTasks} of ${totalTasks} preparation tasks completed (${percent}%)`;
    if (statReadiness) statReadiness.textContent = `${percent}%`;
  }

  // 11. Download Handlers & File Synthesis
  function setupDownloadHandlers() {
    // A. Download Full Flight Pack
    const btnFullPack = document.getElementById('btn-download-full-curriculum');
    if (btnFullPack) {
      btnFullPack.addEventListener('click', () => {
        downloadSyntheticFile(
          `PrepPilot_${subjectName}_Complete_Flight_Planner_Pack_${targetExamDate}.zip`,
          generatePlannerManifest()
        );
        showPlannerToast(`📦 Downloading Complete Multi-Day Pack for ${subjectName}!`);
      });
    }

    // B. Download All Day Materials Bundle
    const btnDayBundle = document.getElementById('btn-download-day-bundle');
    if (btnDayBundle) {
      btnDayBundle.addEventListener('click', () => {
        const day = plannerSchedule[activeDayIndex];
        downloadSyntheticFile(
          `PrepPilot_Day_${day.dayNum}_${subjectName}_Bundle.zip`,
          generateDayManifest(day)
        );
        showPlannerToast(`📦 Downloading all study assets for Day ${day.dayNum}!`);
      });
    }

    // C. Module-Level Downloads
    const btnDownLectures = document.getElementById('btn-download-lectures');
    if (btnDownLectures) {
      btnDownLectures.addEventListener('click', () => {
        const day = plannerSchedule[activeDayIndex];
        downloadSyntheticFile(
          `PrepPilot_Day_${day.dayNum}_Lectures_Guide.pdf`,
          `PREPPILOT VIDEO MASTERCLASS SYLLABUS & TRANSCRIPT\nDay ${day.dayNum}: ${day.title}\nSubject: ${subjectName} (${studentClass})\n\nChapters: ${day.targetChapters.map((c) => c.title).join(', ')}\n\nLectures included in this archive:\n1. Core Concepts & Proofs (45 mins)\n2. High-Frequency Exam Problem Solving (35 mins)\n\nBackend Video Streaming URL: https://api.preppilot.flight/streams/${day.id}/master.m3u8`
        );
        showPlannerToast(`📥 Lecture pack download initiated for Day ${day.dayNum}!`);
      });
    }

    const btnStreamLecture = document.getElementById('btn-stream-lecture');
    if (btnStreamLecture) {
      btnStreamLecture.addEventListener('click', () => {
        const day = plannerSchedule[activeDayIndex];
        showPlannerToast(`▶️ Connected to lecture stream for Day ${day.dayNum} (${day.targetChapters[0]?.title || 'Core'}).`);
      });
    }

    const btnDownNotes = document.getElementById('btn-download-notes');
    if (btnDownNotes) {
      btnDownNotes.addEventListener('click', () => {
        const day = plannerSchedule[activeDayIndex];
        downloadSyntheticFile(
          `PrepPilot_Day_${day.dayNum}_Revision_Notes.pdf`,
          `PREPPILOT COMPREHENSIVE REVISION COMPENDIUM\nDay ${day.dayNum} - ${subjectName} (${studentClass})\nChapters: ${day.targetChapters.map((c) => c.title).join(', ')}\n\n1. HIGH-YIELD FORMULA HANDBOOK\n2. DERIVATION ROADMAP\n3. TOPPER HANDWRITTEN MNEMONICS & TRAPS`
        );
        showPlannerToast(`📥 Downloaded Comprehensive Notes for Day ${day.dayNum}!`);
      });
    }

    const btnPreviewNotes = document.getElementById('btn-preview-notes');
    if (btnPreviewNotes) {
      btnPreviewNotes.addEventListener('click', () => {
        const day = plannerSchedule[activeDayIndex];
        showPlannerToast(`📖 Quick Preview opened for Day ${day.dayNum} Revision Notes.`);
      });
    }

    const btnDownDPP = document.getElementById('btn-download-dpp-sheet');
    if (btnDownDPP) {
      btnDownDPP.addEventListener('click', () => {
        const day = plannerSchedule[activeDayIndex];
        downloadSyntheticFile(
          `PrepPilot_Day_${day.dayNum}_DPP_Problems.pdf`,
          `PREPPILOT DAILY PRACTICE PROBLEM (DPP) SHEET\nDay ${day.dayNum} • ${subjectName} (${studentClass})\nCalibrated for: ${day.targetChapters.map((c) => c.title).join(', ')}\n\nPart 1: Foundation (Q1 - Q8)\nPart 2: Exam Standard (Q9 - Q18)\nPart 3: PYQ Traps (Q19 - Q25)`
        );
        showPlannerToast(`📥 Downloaded DPP Problem Sheet for Day ${day.dayNum}!`);
      });
    }

    const btnDownSolutions = document.getElementById('btn-download-dpp-solutions');
    if (btnDownSolutions) {
      btnDownSolutions.addEventListener('click', () => {
        const day = plannerSchedule[activeDayIndex];
        downloadSyntheticFile(
          `PrepPilot_Day_${day.dayNum}_DPP_Solutions.pdf`,
          `PREPPILOT DPP DETAILED STEP-BY-STEP SOLUTIONS\nDay ${day.dayNum} • ${subjectName}\nFull model solutions, alternate shortcuts, and error analysis for all 25 problems.`
        );
        showPlannerToast(`📥 Downloaded DPP Solutions for Day ${day.dayNum}!`);
      });
    }

    const btnDownTest = document.getElementById('btn-download-test-paper');
    if (btnDownTest) {
      btnDownTest.addEventListener('click', () => {
        const day = plannerSchedule[activeDayIndex];
        downloadSyntheticFile(
          `PrepPilot_Day_${day.dayNum}_Milestone_Test_Paper.pdf`,
          `PREPPILOT DAILY MILESTONE RETENTION TEST\nDay ${day.dayNum} Exam Readiness Diagnostic\nDuration: 20 Minutes • Max Marks: 60\nChapters: ${day.targetChapters.map((c) => c.title).join(', ')}`
        );
        showPlannerToast(`📥 Downloaded Day ${day.dayNum} Test Paper & OMR!`);
      });
    }

    // D. Online CBT Test Simulation Modal
    const btnLaunchTest = document.getElementById('btn-launch-online-daily-test');
    const modal = document.getElementById('planner-test-modal');
    const modalBackdrop = document.getElementById('test-modal-backdrop');
    const btnCloseModal = document.getElementById('btn-close-test-modal');
    const btnCancelModal = document.getElementById('btn-cancel-test');
    const btnSubmitTest = document.getElementById('btn-submit-daily-test');

    if (btnLaunchTest && modal) {
      btnLaunchTest.addEventListener('click', () => {
        openDailyTestModal();
      });
    }

    if (btnCloseModal && modal) {
      btnCloseModal.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
    if (modalBackdrop && modal) {
      modalBackdrop.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
    if (btnCancelModal && modal) {
      btnCancelModal.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    if (btnSubmitTest && modal) {
      btnSubmitTest.addEventListener('click', () => {
        const day = plannerSchedule[activeDayIndex];
        modal.style.display = 'none';

        // Auto mark test completed
        if (!userProgress[day.id]) userProgress[day.id] = {};
        userProgress[day.id].test = true;
        try {
          localStorage.setItem(progressStorageKey, JSON.stringify(userProgress));
        } catch (err) {}

        renderActiveDayContent();
        renderDayTabs();
        showPlannerToast(`🎯 Day ${day.dayNum} Milestone Test Submitted! Score: 92% (Accuracy: 100%). Checkpoint passed!`);
      });
    }
  }

  function openDailyTestModal() {
    const modal = document.getElementById('planner-test-modal');
    const title = document.getElementById('test-modal-title');
    const body = document.getElementById('test-modal-body');
    const day = plannerSchedule[activeDayIndex];
    if (!modal || !day) return;

    if (title) title.textContent = `Day ${day.dayNum} Milestone Diagnostic: ${day.targetChapters[0]?.title || subjectName}`;

    if (body) {
      body.innerHTML = `
        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 12px 16px; font-size: 0.85rem; color: #a5b4fc;">
          ⏱️ <strong>Timed Simulation:</strong> 15 Minutes • Single Correct Answers • Marking: +4, -1
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px;">
            <p style="margin: 0 0 10px; font-size: 0.9rem; font-weight: 700; color: #ffffff;">
              1. Based on today's target chapter (${day.targetChapters[0]?.title || 'Core Principles'}), which of the following statements represents the fundamental invariant under standard transformation?
            </p>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem;">
              <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="q1" checked> (A) The magnitude is invariant under uniform coordinate rotation.
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="q1"> (B) The scalar flux diverges linearly with cross-sectional gradient.
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="q1"> (C) The potential energy depends directly on kinetic damping.
              </label>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px;">
            <p style="margin: 0 0 10px; font-size: 0.9rem; font-weight: 700; color: #ffffff;">
              2. Which problem-solving shortcut was emphasized in today's Masterclass lecture to avoid sign convention mistakes?
            </p>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem;">
              <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="q2"> (A) Dimensional homogenization before vector substitution.
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="q2" checked> (B) Fixed Cartesian frame orientation with boundary continuity verification.
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="q2"> (C) Empirical rounding of trigonometric multiples.
              </label>
            </div>
          </div>
        </div>
      `;
    }

    modal.style.display = 'flex';
  }

  // Helper: File Downloader
  function downloadSyntheticFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, 200);
  }

  function generatePlannerManifest() {
    return `=======================================================
PREPPILOT FLIGHT PLANNER MASTER CURRICULUM PACKAGE
=======================================================
Subject: ${subjectName}
Academic Target: Class ${studentClass}
Scheduled Exam Flight: ${targetExamDate} (${formatDateHuman(targetExamDate)})
Total Preparation Days: ${plannerSchedule.length} Days (Till Day Before Exam)
Chapters Targeted: ${chapters.map((c) => 'Ch ' + c.num + ': ' + c.title).join(' | ')}

-------------------------------------------------------
SCHEDULED DAY-WISE ROADMAP:
-------------------------------------------------------
${plannerSchedule.map((d) => `
[DAY ${d.dayNum}] ${d.dateLabel}: ${d.title}
- Target Chapters: ${d.targetChapters.map((c) => 'Ch ' + c.num + ': ' + c.title).join(', ')}
- Masterclass Lectures: 2 Sessions (Concept Deep-Dive & Advanced Problem-Solving)
- High-Yield Notes: Theory Summary & Formula Booklet
- Practice Problems: 25 Graded Problems (DPP) + Full Step-by-Step Solutions
- Milestone Test: 20-Minute Retention Checkpoint Test
`).join('\n')}

=======================================================
Verified by PrepPilot Autonomous Flight Engine
All assets compiled and synced for user: ${userParam}
=======================================================`;
  }

  function generateDayManifest(day) {
    return `=======================================================
PREPPILOT DAILY PREPARATION BUNDLE - DAY ${day.dayNum}
=======================================================
Date: ${day.dateLabel}
Day Scope: ${day.title}
Subject: ${subjectName} (${studentClass})
Target Chapters: ${day.targetChapters.map((c) => 'Ch ' + c.num + ': ' + c.title).join(', ')}

INCLUDED MODULES IN THIS ARCHIVE:
1. Masterclass Lectures (2 Sessions Guide & Video Outlines)
2. Comprehensive Chapter Notes & Formula Cheat Sheet (PDF)
3. Daily Practice Problem Sheet (DPP - 25 Graded Questions)
4. Full Step-by-Step DPP Solutions & Trap Analysis
5. Day Milestone Checkpoint Test Paper & OMR Blueprint

=======================================================`;
  }

  function showPlannerToast(message) {
    const toast = document.getElementById('planner-toast');
    if (!toast) return;
    toast.innerHTML = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  }

  // 12. Helper: Dynamic Schedule Builder
  function buildDynamicSchedule(totalDays, chapterList, subj) {
    const schedule = [];
    const today = new Date();
    const chCount = chapterList.length;

    for (let i = 0; i < totalDays; i++) {
      const dNum = i + 1;
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() + i);
      const isoDate = dayDate.toISOString().split('T')[0];
      const isToday = i === 0;

      // Distribute chapters across the available days
      let dayChapters = [];
      if (chCount <= totalDays) {
        // Less chapters than days: give 1 chapter per day, later days get synthesis/revision
        const chIdx = Math.min(i, chCount - 1);
        dayChapters = [chapterList[chIdx]];
      } else {
        // More chapters than days: distribute chunks
        const start = Math.floor((i * chCount) / totalDays);
        const end = Math.floor(((i + 1) * chCount) / totalDays);
        dayChapters = chapterList.slice(start, Math.max(start + 1, end));
      }

      const isLastDay = i === totalDays - 1;
      const dayTitle = isLastDay && totalDays > 1
        ? 'Exam Eve Consolidation & Formula Recall'
        : (dNum === 1 ? 'Concept Launch & Core Mechanics' : `Deep Dive & Intensive Problem Mastery`);

      schedule.push({
        id: `day-${dNum}`,
        dayNum: dNum,
        isoDate: isoDate,
        dateLabel: formatDateHuman(isoDate),
        daysUntilDate: isToday ? 'Today' : `In ${i} Day${i === 1 ? '' : 's'}`,
        title: dayTitle,
        shortTitle: dayChapters[0] ? `Ch ${dayChapters[0].num}` : `Day ${dNum}`,
        targetChapters: dayChapters,
        modules: {
          lectures: {
            description: `Live concept masterclass & high-yield derivations covering ${dayChapters.map((c) => c.title).join(' and ')}.`,
            items: [
              { title: `${subj}: Concept Fundamentals & Key Proofs`, duration: '45 Mins', type: 'Core Theory' },
              { title: `${subj}: Advanced Problem Solving & Exam Traps`, duration: '35 Mins', type: 'Masterclass' }
            ]
          },
          notes: {
            description: `Topper handwritten revision notes, formula sheets, and mnemonics for ${dayChapters.map((c) => c.title).join(', ')}.`,
            items: [
              { title: `${subj} Chapter Summary & Formula Handbook`, pages: '14 Pages', format: 'PDF' },
              { title: `High-Yield Traps & Derivation Quick-Cards`, pages: '6 Pages', format: 'PDF' }
            ]
          },
          problems: {
            description: `25 Graded problems: Foundation drill, competitive test standards, and past year question patterns.`,
            items: [
              { title: `Day ${dNum} DPP: Multi-Level Question Sheet`, count: '25', level: 'Graded (L1 - L3)' },
              { title: `Annotated Model Solutions & Alternate Methods`, count: '25', level: 'Full Explanations' }
            ]
          },
          test: {
            title: `Day ${dNum} Milestone Retention Diagnostic`,
            questionsCount: 15,
            duration: '20 Mins',
            description: `Timed checkpoint quiz to test your memory retention before moving to the next day's schedule.`
          }
        }
      });
    }

    return schedule;
  }

  // Helper date utilities
  function getOffsetDateIso(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }

  function getDaysUntil(isoStr) {
    if (!isoStr) return 1;
    const parts = isoStr.split('-');
    if (parts.length !== 3) return 1;
    const [yyyy, mm, dd] = parts;
    const target = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  function formatDateHuman(isoStr) {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    const [yyyy, mm, dd] = parts;
    const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getInitials(name) {
    if (!name) return 'AP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatSubjectName(key) {
    if (!key) return 'Maths';
    const map = {
      maths: 'Maths',
      mathematics: 'Maths',
      physics: 'Physics',
      chemistry: 'Chemistry',
      science: 'Science',
      social_science: 'Social Science',
      english: 'English',
      hindi: 'Hindi',
      zoology: 'Zoology',
      anatomy: 'Anatomy',
      physical_education: 'Physical Education'
    };
    return map[key.toLowerCase()] || key.charAt(0).toUpperCase() + key.slice(1);
  }

  function getSubjectIcon(key) {
    const map = {
      maths: '📐',
      mathematics: '📐',
      physics: '⚡',
      chemistry: '🧪',
      science: '🔬',
      social_science: '🌍',
      english: '📖',
      hindi: '🇮🇳',
      zoology: '🐾',
      anatomy: '🫀',
      physical_education: '🏃'
    };
    return map[(key || '').toLowerCase()] || '🎯';
  }

  // Initialize
  renderDayTabs();
  renderActiveDayContent();
  setupDownloadHandlers();

})();
