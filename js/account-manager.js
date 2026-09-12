/**
 * PrepPilot - Centralized Account & Progress State Manager
 * Handles:
 * 1. Persistent storage of student accounts in localStorage
 * 2. Checks if an account has completed first-time course onboarding
 * 3. Remembers subjects, completion percentages, XP, streak, and daily flight tasks
 */

(function (window) {
  'use strict';

  const STORAGE_PREFIX = 'preppilot_acc_';
  const ACTIVE_USER_KEY = 'preppilot_current_user';

  const defaultSubjectTemplates = {
    'junior': [
      { name: 'Maths', icon: '📐', iconClass: 'math-bg', pct: 85, next: 'Real Numbers & Polynomials', fillClass: 'fill-math' },
      { name: 'Hindi', icon: '📖', iconClass: 'hindi-bg', pct: 82, next: 'नेताजी का चश्मा & व्याकरण', fillClass: 'fill-chem' },
      { name: 'English', icon: '🔤', iconClass: 'english-bg', pct: 88, next: 'A Letter to God & Grammar', fillClass: 'fill-physics' },
      { name: 'Science', icon: '🔬', iconClass: 'science-bg', pct: 84, next: 'Chemical Reactions & Life Processes', fillClass: 'fill-chem' },
      { name: 'Social Science', icon: '🌍', iconClass: 'social-bg', pct: 80, next: 'Nationalism in Europe & Resources', fillClass: 'fill-math' },
    ],
    'senior_jee': [
      { name: 'Maths', icon: '📐', iconClass: 'math-bg', pct: 85, next: 'Calculus, Vectors & 3D Geometry', fillClass: 'fill-math' },
      { name: 'Physics', icon: '⚡', iconClass: 'physics-bg', pct: 80, next: 'Mechanics, Electrodynamics & Optics', fillClass: 'fill-physics' },
      { name: 'Chemistry', icon: '🧪', iconClass: 'chem-bg', pct: 83, next: 'Thermodynamics & Organic Chemistry', fillClass: 'fill-chem' },
    ],
    'senior_neet': [
      { name: 'Physics', icon: '⚡', iconClass: 'physics-bg', pct: 78, next: 'Units, Thermodynamics & Ray Optics', fillClass: 'fill-physics' },
      { name: 'Chemistry', icon: '🧪', iconClass: 'chem-bg', pct: 84, next: 'Equilibrium & Coordination Chemistry', fillClass: 'fill-chem' },
      { name: 'Zoology', icon: '🐾', iconClass: 'zoology-bg', pct: 90, next: 'Animal Kingdom & Human Physiology', fillClass: 'fill-chem' },
      { name: 'Anatomy', icon: '🫀', iconClass: 'anatomy-bg', pct: 88, next: 'Plant Anatomy & Human Organ Systems', fillClass: 'fill-physics' },
    ],
    'senior_normal': [
      { name: 'Physics', icon: '⚡', iconClass: 'physics-bg', pct: 80, next: 'Mechanics & Electrostatics', fillClass: 'fill-physics' },
      { name: 'Chemistry', icon: '🧪', iconClass: 'chem-bg', pct: 82, next: 'Physical, Inorganic & Organic Chem', fillClass: 'fill-chem' },
      { name: 'Maths', icon: '📐', iconClass: 'math-bg', pct: 85, next: 'Relations, Calculus & Vectors', fillClass: 'fill-math' },
      { name: 'Zoology', icon: '🐾', iconClass: 'zoology-bg', pct: 88, next: 'Animal Tissues & Human Health', fillClass: 'fill-chem' },
      { name: 'Anatomy', icon: '🫀', iconClass: 'anatomy-bg', pct: 86, next: 'Flowering Plant & Human Anatomy', fillClass: 'fill-physics' },
      { name: 'English', icon: '🔤', iconClass: 'english-bg', pct: 90, next: 'Literature, Reading & Advanced Grammar', fillClass: 'fill-physics' },
      { name: 'Physical Education', icon: '🏃‍♂️', iconClass: 'pe-bg', pct: 92, next: 'Sports Events, Yoga & Biomechanics', fillClass: 'fill-math' },
    ],
    'dropper_jee': [
      { name: 'Maths', icon: '📐', iconClass: 'math-bg', pct: 88, next: 'Advanced Calculus & Coordinate Geometry', fillClass: 'fill-math' },
      { name: 'Physics', icon: '⚡', iconClass: 'physics-bg', pct: 86, next: 'Rotational Dynamics & Wave Optics', fillClass: 'fill-physics' },
      { name: 'Chemistry', icon: '🧪', iconClass: 'chem-bg', pct: 89, next: 'Reaction Mechanisms & Electrochemistry', fillClass: 'fill-chem' },
    ],
    'dropper_neet': [
      { name: 'Physics', icon: '⚡', iconClass: 'physics-bg', pct: 85, next: 'High-Speed Numerical Drills', fillClass: 'fill-physics' },
      { name: 'Chemistry', icon: '🧪', iconClass: 'chem-bg', pct: 88, next: 'NCERT Line-by-Line Chemistry Sprint', fillClass: 'fill-chem' },
      { name: 'Zoology', icon: '🐾', iconClass: 'zoology-bg', pct: 94, next: 'Complete Animal Physiology Rapid Review', fillClass: 'fill-chem' },
      { name: 'Anatomy', icon: '🫀', iconClass: 'anatomy-bg', pct: 92, next: 'Structural Anatomy High-Yield Booster', fillClass: 'fill-physics' },
    ],
  };

  const AccountManager = {
    // Sanitize user handle / ID
    sanitizeId(id) {
      if (!id || typeof id !== 'string') return 'arjun_sharma';
      return id.trim().toLowerCase().replace(/[^a-z0-9_@.-]/g, '_');
    },

    // Get current active user ID
    getCurrentUserId() {
      return localStorage.getItem(ACTIVE_USER_KEY) || 'arjun_sharma';
    },

    // Set current active user
    setCurrentUserId(id) {
      const sanitized = this.sanitizeId(id);
      localStorage.setItem(ACTIVE_USER_KEY, sanitized);
      return sanitized;
    },

    // Check if account exists & has completed onboarding
    isAccountOnboarded(id) {
      const account = this.getAccount(id);
      return Boolean(account && account.onboarded);
    },

    // Get account object from localStorage
    getAccount(id) {
      const sanitized = this.sanitizeId(id);
      try {
        const data = localStorage.getItem(STORAGE_PREFIX + sanitized);
        if (data) {
          return JSON.parse(data);
        }
      } catch (e) {
        console.error('Failed to parse account data:', e);
      }
      return null;
    },

    // Save or update account object
    saveAccount(accountData) {
      if (!accountData || !accountData.id) return false;
      const sanitized = this.sanitizeId(accountData.id);
      accountData.id = sanitized;
      accountData.lastActive = Date.now();

      try {
        localStorage.setItem(STORAGE_PREFIX + sanitized, JSON.stringify(accountData));
        this.setCurrentUserId(sanitized);
        return true;
      } catch (e) {
        console.error('Failed to save account data:', e);
        return false;
      }
    },

    // Initialize a new account profile
    createAccount(id, displayName, provider) {
      const sanitized = this.sanitizeId(id);
      const name = displayName || id.replace(/[_.-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const newAccount = {
        id: sanitized,
        name: name,
        provider: provider || 'email',
        onboarded: true, // Default to onboarded so user reaches dashboard screen directly
        selectedClass: '10th',
        selectedBoard: 'CBSE',
        courseKey: 'junior',
        targetScore: 98.5,
        dailyHours: 2.5,
        xp: 4920,
        streakDays: 14,
        subjects: defaultSubjectTemplates['junior'],
        completedTaskIndices: [0, 1], // remembers which daily checklist tasks were checked
        createdDate: Date.now(),
        lastActive: Date.now(),
      };

      this.saveAccount(newAccount);
      return newAccount;
    },

    // Complete onboarding for an account
    completeOnboarding(id, choices) {
      let account = this.getAccount(id);
      if (!account) {
        account = this.createAccount(id, choices.name);
      }

      account.onboarded = true;
      account.selectedClass = choices.selectedClass || '10th';
      account.selectedBoard = choices.selectedBoard || 'CBSE';
      account.targetScore = parseFloat(choices.targetScore) || 98.5;
      account.dailyHours = parseFloat(choices.dailyHours) || 2.5;

      // Assign template subjects based on class & course
      const classNum = parseInt(account.selectedClass, 10);
      const bLower = (account.selectedBoard || '').toLowerCase();
      if (account.selectedClass.toLowerCase().includes('drop')) {
        if (bLower.includes('neet')) {
          account.courseKey = 'dropper_neet';
          account.subjects = defaultSubjectTemplates['dropper_neet'];
        } else {
          account.courseKey = 'dropper_jee';
          account.subjects = defaultSubjectTemplates['dropper_jee'];
        }
      } else if (classNum >= 11) {
        if (bLower.includes('neet') || bLower.includes('med')) {
          account.courseKey = 'senior_neet';
          account.subjects = defaultSubjectTemplates['senior_neet'];
        } else if (bLower.includes('jee') || bLower.includes('iit') || bLower.includes('eng')) {
          account.courseKey = 'senior_jee';
          account.subjects = defaultSubjectTemplates['senior_jee'];
        } else {
          account.courseKey = 'senior_normal';
          account.subjects = defaultSubjectTemplates['senior_normal'];
        }
      } else {
        account.courseKey = 'junior';
        account.subjects = defaultSubjectTemplates['junior'];
      }

      this.saveAccount(account);
      return account;
    },

    // Update course & class for an existing account
    updateCourseAndClass(id, selectedClass, selectedBoard) {
      let account = this.getAccount(id);
      if (!account) return null;

      account.selectedClass = selectedClass || '10th';
      account.selectedBoard = selectedBoard || 'CBSE Board Mastery';

      const classNum = parseInt(account.selectedClass, 10);
      const bLower = (account.selectedBoard || '').toLowerCase();
      if (account.selectedClass.toLowerCase().includes('drop')) {
        if (bLower.includes('neet')) {
          account.courseKey = 'dropper_neet';
          account.subjects = JSON.parse(JSON.stringify(defaultSubjectTemplates['dropper_neet']));
        } else {
          account.courseKey = 'dropper_jee';
          account.subjects = JSON.parse(JSON.stringify(defaultSubjectTemplates['dropper_jee']));
        }
      } else if (classNum >= 11) {
        if (bLower.includes('neet') || bLower.includes('med')) {
          account.courseKey = 'senior_neet';
          account.subjects = JSON.parse(JSON.stringify(defaultSubjectTemplates['senior_neet']));
        } else if (bLower.includes('jee') || bLower.includes('iit') || bLower.includes('eng')) {
          account.courseKey = 'senior_jee';
          account.subjects = JSON.parse(JSON.stringify(defaultSubjectTemplates['senior_jee']));
        } else {
          account.courseKey = 'senior_normal';
          account.subjects = JSON.parse(JSON.stringify(defaultSubjectTemplates['senior_normal']));
        }
      } else {
        account.courseKey = 'junior';
        account.subjects = JSON.parse(JSON.stringify(defaultSubjectTemplates['junior']));
      }

      this.saveAccount(account);
      return account;
    },

    // Update ongoing progress (tasks, xp, etc.)
    updateProgress(id, updates) {
      const account = this.getAccount(id);
      if (!account) return false;

      if (typeof updates.xp === 'number') account.xp = updates.xp;
      if (Array.isArray(updates.completedTaskIndices)) account.completedTaskIndices = updates.completedTaskIndices;
      if (Array.isArray(updates.subjects)) account.subjects = updates.subjects;
      if (updates.targetScore) account.targetScore = updates.targetScore;

      return this.saveAccount(account);
    },

    // Retrieve all saved accounts
    getAllAccounts() {
      const accounts = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            const acc = JSON.parse(localStorage.getItem(key));
            if (acc && acc.id) accounts.push(acc);
          }
        }
      } catch (e) {
        console.error('Error fetching accounts:', e);
      }
      return accounts;
    },

    // Switch active account
    switchAccount(id) {
      return this.setCurrentUserId(id);
    }
  };

  // Seed default demo account 'arjun_sharma' as pre-onboarded
  try {
    if (!localStorage.getItem(STORAGE_PREFIX + 'arjun_sharma')) {
      const demoAccount = {
        id: 'arjun_sharma',
        name: 'Arjun Sharma',
        provider: 'email',
        onboarded: true,
        selectedClass: '10th',
        selectedBoard: 'CBSE Board Mastery',
        courseKey: 'junior',
        targetScore: 98.5,
        dailyHours: 2.5,
        xp: 4920,
        streakDays: 14,
        subjects: defaultSubjectTemplates['junior'],
        completedTaskIndices: [0, 1],
        createdDate: Date.now(),
        lastActive: Date.now(),
      };
      localStorage.setItem(STORAGE_PREFIX + 'arjun_sharma', JSON.stringify(demoAccount));
    }
  } catch (err) {
    console.warn('LocalStorage unavailable or disabled:', err);
  }

  window.PrepPilotAccount = AccountManager;
})(window);
