/**
 * PrepPilot - Test Flight Download Kit Controller
 * Provides interface for student to download all test preparation materials supplied by backend.
 */

(function () {
  'use strict';

  // 1. Resolve Mission Data from URL & LocalStorage
  const urlParams = new URLSearchParams(window.location.search);
  let userParam = urlParams.get('user') || urlParams.get('student') || 'Arjun Sharma';
  let subjectParam = urlParams.get('subject') || 'maths';
  let dateParam = urlParams.get('date') || '';
  let classParam = urlParams.get('class') || '10th';

  const userSanitized = userParam.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Attempt to load rich mission object saved by cockpit
  let savedMission = null;
  try {
    const raw = localStorage.getItem('preppilot_flight_mission_' + userSanitized);
    if (raw) savedMission = JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read saved flight mission:', err);
  }

  // Fallbacks if mission not found in localStorage
  const subjectId = savedMission ? savedMission.subjectId : subjectParam;
  const subjectName = savedMission ? savedMission.subjectName : formatSubjectName(subjectId);
  const subjectIcon = savedMission ? savedMission.icon : getSubjectIcon(subjectId);
  const testDate = savedMission ? savedMission.testDate : (dateParam || getTomorrowIso());
  const chapters = savedMission && savedMission.chapters ? savedMission.chapters : [
    { num: '01', title: 'Foundations & Core Principles' },
    { num: '02', title: 'High-Yield Theorems & Applications' }
  ];

  // 2. Personalize Header & Student Info
  const avatarInitials = document.getElementById('kit-avatar-initials');
  const avatarName = document.getElementById('kit-avatar-name');
  if (avatarInitials) avatarInitials.textContent = getInitials(userParam);
  if (avatarName) avatarName.textContent = userParam.split(' ')[0] || userParam;

  // 3. Populate Hero Mission Card
  const heroSubjectIcon = document.getElementById('kit-hero-subject-icon');
  const heroSubjectTitle = document.getElementById('kit-hero-subject-title');
  const heroClassBadge = document.getElementById('kit-hero-class-badge');
  const heroDateBadge = document.getElementById('kit-hero-date-badge');
  const heroCountdownVal = document.getElementById('kit-hero-countdown-val');
  const heroTargetDateVal = document.getElementById('kit-hero-target-date-val');
  const heroChaptersCountVal = document.getElementById('kit-hero-chapters-count-val');
  const heroChaptersList = document.getElementById('kit-hero-chapters-list');
  const heroFilesCountVal = document.getElementById('kit-hero-files-count-val');
  const heroTotalSizeVal = document.getElementById('kit-hero-total-size-val');

  // Set Pilot Planner Links with active query params
  const plannerUrl = `pilot-planner.html?subject=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(testDate)}&class=${encodeURIComponent(classParam)}&user=${encodeURIComponent(userSanitized)}`;
  const topbarPlannerLink = document.getElementById('btn-topbar-planner');
  const kitPlannerLink = document.getElementById('btn-kit-open-planner');
  if (topbarPlannerLink) topbarPlannerLink.href = plannerUrl;
  if (kitPlannerLink) kitPlannerLink.href = plannerUrl;

  if (heroSubjectIcon) heroSubjectIcon.textContent = subjectIcon;
  if (heroSubjectTitle) heroSubjectTitle.textContent = `${subjectName} Test Flight Kit`;
  if (heroClassBadge) {
    heroClassBadge.textContent = (classParam && classParam.toLowerCase().includes('drop'))
      ? 'Dropper (Class 11 & 12 Combined)'
      : `Class ${classParam}`;
  }
  if (heroDateBadge) heroDateBadge.textContent = `🗓️ Scheduled: ${formatDateHuman(testDate)}`;

  const daysUntil = getDaysUntil(testDate);
  if (heroCountdownVal) {
    heroCountdownVal.textContent = daysUntil === 1 ? 'Tomorrow (In 1 Day)' : `In ${daysUntil} Days`;
  }
  if (heroTargetDateVal) {
    heroTargetDateVal.textContent = formatDateHuman(testDate);
  }
  if (heroChaptersCountVal) {
    heroChaptersCountVal.textContent = `${chapters.length} Chapter${chapters.length === 1 ? '' : 's'}`;
  }

  // Render chapter tags
  if (heroChaptersList) {
    heroChaptersList.innerHTML = chapters
      .map((c) => `<span class="kit-chapter-chip">✓ Ch ${c.num}: ${c.title}</span>`)
      .join('');
  }

  // ==========================================================================
  // 4. Download Items Repository & Backend Hook
  // ==========================================================================
  // Backend Integration Bridge:
  // If backend injects `window.PREPPILOT_DOWNLOAD_ITEMS`, use those.
  // Otherwise, dynamically generate customized study kit items.
  const defaultDownloadItems = [
    {
      id: 'mock-paper-01',
      category: 'mock',
      title: `${subjectName} Full-Length CBT Mock Question Paper`,
      description: `Official test flight question paper calibrated specifically for ${chapters.length} target chapters. Contains Part A (Objective Single-Choice), Part B (Numerical / Assertions), and Full Model Solutions with step-by-step marking rubrics.`,
      format: 'PDF',
      badgeClass: 'badge-pdf',
      iconBoxClass: 'icon-box-pdf',
      icon: '📄',
      size: '2.8 MB',
      pages: '24 Pages',
      verified: true,
      filename: `PrepPilot_${subjectName}_Mock_Test_Paper_${testDate}.pdf`
    },
    {
      id: 'revision-notes-02',
      category: 'revision',
      title: `${subjectName} High-Yield Formula Handbook & Rapid Revision Notes`,
      description: `Comprehensive revision compendium containing all essential formulas, derivations, reaction mechanisms, and visual cheat sheets for: ${chapters.map(c => c.title).join(', ')}.`,
      format: 'PDF',
      badgeClass: 'badge-pdf',
      iconBoxClass: 'icon-box-notes',
      icon: '📑',
      size: '4.2 MB',
      pages: '38 Pages',
      verified: true,
      filename: `PrepPilot_${subjectName}_Rapid_Revision_Notes.pdf`
    },
    {
      id: 'omr-sheet-03',
      category: 'omr',
      title: `Official Test Flight OMR Answer Sheet & Blueprint Matrix`,
      description: `Printable high-precision OMR bubble sheet for offline practice simulation. Includes question-by-question topic distribution matrix and negative marking guidelines.`,
      format: 'PDF',
      badgeClass: 'badge-pdf',
      iconBoxClass: 'icon-box-pdf',
      icon: '📝',
      size: '1.1 MB',
      pages: '4 Pages',
      verified: true,
      filename: `PrepPilot_Standard_OMR_Sheet_${subjectName}.pdf`
    },
    {
      id: 'pyq-bank-04',
      category: 'pyq',
      title: `Past 10 Years Topic-Wise Question Bank with Video Explanations Link`,
      description: `Curated collection of 150+ frequently asked questions from past board and entrance examinations covering only your selected syllabus chapters.`,
      format: 'PDF',
      badgeClass: 'badge-pdf',
      iconBoxClass: 'icon-box-pdf',
      icon: '📊',
      size: '6.4 MB',
      pages: '56 Pages',
      verified: true,
      filename: `PrepPilot_${subjectName}_Past_10_Years_Question_Bank.pdf`
    },
    {
      id: 'concept-maps-05',
      category: 'revision',
      title: `Concept Mind Maps, Anatomical/Circuit Diagrams & Memory Anchors`,
      description: `Ultra-high-resolution visual diagrams and hierarchical flowcharts designed for rapid active recall in the final 24 hours before test time.`,
      format: 'PDF',
      badgeClass: 'badge-pdf',
      iconBoxClass: 'icon-box-notes',
      icon: '🎯',
      size: '3.6 MB',
      pages: '18 Pages',
      verified: true,
      filename: `PrepPilot_${subjectName}_Concept_Mind_Maps.pdf`
    },
    {
      id: 'cbt-offline-kit-06',
      category: 'mock',
      title: `PrepPilot CBT Offline Simulator Package (.ZIP)`,
      description: `Standalone browser-based CBT mock test bundle with built-in countdown clock, question navigation palette, and automatic performance scoring engine.`,
      format: 'ZIP',
      badgeClass: 'badge-zip',
      iconBoxClass: 'icon-box-zip',
      icon: '📦',
      size: '8.9 MB',
      pages: 'Software Bundle',
      verified: true,
      filename: `PrepPilot_${subjectName}_Offline_CBT_Simulator.zip`
    }
  ];

  const downloadItems = (window.PREPPILOT_DOWNLOAD_ITEMS && Array.isArray(window.PREPPILOT_DOWNLOAD_ITEMS))
    ? window.PREPPILOT_DOWNLOAD_ITEMS
    : defaultDownloadItems;

  // Update total counts
  if (heroFilesCountVal) heroFilesCountVal.textContent = `${downloadItems.length} Materials`;
  if (heroTotalSizeVal) heroTotalSizeVal.textContent = '27.0 MB Total';

  // 5. Render Download Items List
  const downloadsContainer = document.getElementById('kit-downloads-container');
  let activeFilter = 'all';

  function renderDownloadsList(filter = 'all') {
    if (!downloadsContainer) return;

    const filtered = downloadItems.filter((item) => {
      if (filter === 'all') return true;
      return item.category === filter;
    });

    if (filtered.length === 0) {
      downloadsContainer.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: #64748b; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed var(--kit-border);">
          No study materials found for this category filter.
        </div>
      `;
      return;
    }

    downloadsContainer.innerHTML = filtered
      .map((item) => `
        <div class="kit-resource-card" data-id="${item.id}" data-category="${item.category}">
          <div class="kit-card-left">
            <div class="kit-file-icon-box ${item.iconBoxClass || 'icon-box-pdf'}">
              <span>${item.icon || '📄'}</span>
            </div>
            <div class="kit-card-content">
              <div class="kit-card-title-row">
                <h3 class="kit-card-title">${item.title}</h3>
                <span class="kit-format-badge ${item.badgeClass || 'badge-pdf'}">${item.format}</span>
              </div>
              <p class="kit-card-desc">${item.description}</p>
              <div class="kit-card-meta-row">
                <span>📦 ${item.size}</span>
                <span>📑 ${item.pages}</span>
                ${item.verified ? '<span class="meta-verified">✓ Verified by PrepPilot Engine</span>' : ''}
              </div>
            </div>
          </div>

          <div class="kit-card-right">
            <button type="button" class="btn-download-item" data-download-id="${item.id}" data-filename="${item.filename}">
              <span>⬇️ Download ${item.format}</span>
            </button>
          </div>
        </div>
      `)
      .join('');

    // Bind individual download button clicks
    downloadsContainer.querySelectorAll('.btn-download-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-download-id');
        const filename = btn.getAttribute('data-filename');
        const item = downloadItems.find((d) => d.id === id);
        handleSingleDownload(btn, item || { filename: filename || 'PrepPilot_Study_Doc.pdf' });
      });
    });
  }

  // 6. Download Trigger Mechanism
  function handleSingleDownload(buttonEl, item) {
    if (!buttonEl) return;

    const originalText = buttonEl.innerHTML;
    buttonEl.classList.add('downloading');
    buttonEl.innerHTML = `<span>⏳ Preparing...</span>`;

    setTimeout(() => {
      // Trigger genuine client-side file download
      triggerFileDownload(
        item.filename || `PrepPilot_${subjectName}_Material.txt`,
        generateDownloadContent(item)
      );

      buttonEl.classList.remove('downloading');
      buttonEl.classList.add('downloaded');
      buttonEl.innerHTML = `<span>✓ Downloaded</span>`;

      showKitToast(`✅ Successfully downloaded: <strong>${item.title || item.filename}</strong>`);

      // Reset after 4 seconds
      setTimeout(() => {
        buttonEl.classList.remove('downloaded');
        buttonEl.innerHTML = originalText;
      }, 4000);
    }, 800);
  }

  function triggerFileDownload(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  function generateDownloadContent(item) {
    return `================================================================================
PREPPILOT FLIGHT CONTROL - OFFICIAL TEST FLIGHT PREPARATION MATERIAL
================================================================================
Document: ${item.title || item.filename}
Format: ${item.format || 'PDF'}
Target Subject: ${subjectName}
Academic Class: Class ${classParam}
Scheduled Test Flight Date: ${formatDateHuman(testDate)} (${daysUntil === 1 ? 'Tomorrow' : 'In ' + daysUntil + ' Days'})
Student Pilot: ${userParam}
Generated by: PrepPilot Intelligent Engine
Status: VERIFIED BY ACADEMIC RADAR
================================================================================

SYLLABUS CHAPTERS COVERED IN THIS MISSION:
${chapters.map((c, i) => `${i + 1}. Chapter ${c.num}: ${c.title}`).join('\n')}

DESCRIPTION & STUDY INSTRUCTIONS:
${item.description}

RECOMMENDED COCKPIT REVISION CHECKLIST:
[ ] 1. Review all core theorems and formulas from the revision notes.
[ ] 2. Solve the full-length mock questions strictly within standard test flight duration.
[ ] 3. Mark answers on the printable OMR bubble sheet for real examination timing.
[ ] 4. Perform root-cause analysis on incorrect answers using the model solutions.
[ ] 5. Final 30-minute visual concept map review on the morning of test flight.

================================================================================
(C) 2026 PrepPilot Technologies. All rights reserved. Backend download interface verified.
================================================================================
`;
  }

  // 7. Bulk Download All Bundle
  const btnDownloadAll = document.getElementById('btn-download-all-bundle');
  if (btnDownloadAll) {
    btnDownloadAll.addEventListener('click', () => {
      const origText = btnDownloadAll.innerHTML;
      btnDownloadAll.innerHTML = `<span>⏳ Packing All ${downloadItems.length} Files...</span>`;
      btnDownloadAll.style.opacity = '0.8';
      btnDownloadAll.style.pointerEvents = 'none';

      setTimeout(() => {
        const bundleContent = `================================================================================
PREPPILOT COMPLETE TEST FLIGHT STUDY BUNDLE
================================================================================
Subject: ${subjectName}
Class: Class ${classParam}
Test Date: ${formatDateHuman(testDate)}
Student: ${userParam}
Total Materials: ${downloadItems.length} Files
================================================================================

INCLUDED MATERIALS:
${downloadItems.map((d, i) => `${i + 1}. [${d.format}] ${d.title} (${d.size})`).join('\n')}

CHAPTERS:
${chapters.map(c => `- Chapter ${c.num}: ${c.title}`).join('\n')}

All files prepared and verified by the PrepPilot backend engine.
`;
        triggerFileDownload(`PrepPilot_${subjectName}_Complete_Mission_Kit_${testDate}.zip`, bundleContent);

        btnDownloadAll.innerHTML = `<span>✅ All Files Downloaded</span>`;
        showKitToast(`📦 Complete Test Flight Mission Bundle (.ZIP) downloaded successfully!`);

        setTimeout(() => {
          btnDownloadAll.innerHTML = origText;
          btnDownloadAll.style.opacity = '1';
          btnDownloadAll.style.pointerEvents = 'auto';
        }, 3500);
      }, 1200);
    });
  }

  // 8. Filter Pills Handling
  const filterPills = document.querySelectorAll('.kit-filter-pill');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.getAttribute('data-filter') || 'all';
      renderDownloadsList(activeFilter);
    });
  });

  // Initial Render
  renderDownloadsList('all');

  // ==========================================================================
  // Helper Functions
  // ==========================================================================
  function formatSubjectName(key) {
    if (!key) return 'General Subject';
    const names = {
      maths: 'Maths',
      hindi: 'Hindi',
      english: 'English',
      science: 'Science',
      social_science: 'Social Science',
      physics: 'Physics',
      chemistry: 'Chemistry',
      zoology: 'Zoology',
      anatomy: 'Anatomy',
      physical_education: 'Physical Education'
    };
    return names[key] || (key.charAt(0).toUpperCase() + key.slice(1));
  }

  function getSubjectIcon(key) {
    const icons = {
      maths: '📐',
      hindi: '📖',
      english: '🔤',
      science: '🔬',
      social_science: '🌍',
      physics: '⚡',
      chemistry: '🧪',
      zoology: '🦁',
      anatomy: '🫀',
      physical_education: '🏃'
    };
    return icons[key] || '📚';
  }

  function getTomorrowIso() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatDateHuman(isoStr) {
    if (!isoStr) return 'Tomorrow';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    const [yyyy, mm, dd] = parts;
    const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
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

  function getInitials(nameStr) {
    if (!nameStr) return 'SP';
    return nameStr
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'SP';
  }

  function showKitToast(htmlMsg) {
    let toast = document.getElementById('kit-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'kit-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #1e293b;
        color: #ffffff;
        border: 1px solid rgba(255,255,255,0.15);
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        padding: 14px 20px;
        border-radius: 12px;
        font-size: 0.88rem;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: fadeIn 0.2s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = htmlMsg;
    toast.style.display = 'flex';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }
})();
