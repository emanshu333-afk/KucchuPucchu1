# PrepPilot - Liquid Glass Educational Platform

A futuristic, high-performance web frontend for **PrepPilot**, designed with a **Liquid Glassmorphism** theme, real-time motion graphics, multi-provider social authentication (Google, GitHub, Twitter/X), and comprehensive academic wings.

---

## 🌟 Key Features

1. **Liquid Glass Aesthetic**:
   - Deep obsidian space background with dynamic fluid canvas simulation (`canvas#liquid-bg-canvas`).
   - Frosted glass cards with `backdrop-filter: blur(24px) saturate(190%)`.
   - Iridescent specular highlights and glowing neon borders that respond to mouse motion.
   - 3D card tilt physics with dynamic light glare following your cursor.

2. **Proprietary Motion Graphics**:
   - **Interactive Orbit Cockpit Engine**: Rotating dashed rings and floating subject satellites (Physics Mechanics, Calculus & Algebra, Organic/Physical Chemistry, NEET Biology, Class 6–10 Logic).
   - Dynamic telemetry updates when clicking any satellite.
   - Fluid particle ripples generated on pointer movement.

3. **1-Click Social Sign-In & Student Cockpit**:
   - Direct authentication buttons for:
     - **Google** (with official multi-color SVG icon)
     - **GitHub** (with official developer SVG icon)
     - **Twitter / X** (with modern vector icon)
   - Student Roll Number / Email quick portal fallback.
   - Interactive glass authorization modal simulating secure OAuth handshaking and student profile loading.

4. **Academic Wings (Targeted Curriculum Explorer)**:
   - **Junior Wing (Classes 6th–10th)**:
     - CBSE Board Foundation & NCERT line-by-line concept visuals.
     - ICSE Board Mastery (Selina, Concise Science, Literature & analytical Math).
     - Class 10 Board Rank Booster & early Olympiad (NTSE, PRMO, NSO, IMO) tracks.
   - **Senior Wing (Classes 11th–12th)**:
     - 12th Board Score Booster (CBSE & ISC 95%+ blueprint).
     - JEE Main & Advanced Pinnacle Track (Irodov, HC Verma, CBT mocks).
     - NEET-UG 360/360 Medical Mastery (NCERT Biology line-by-line).
   - **Droppers & Repeaters Wing**:
     - 180-day hyper-sprint covering full 11th + 12th syllabus.
     - AI diagnostic weakness identifier & error-log healing.
     - Board marks improvement batch (75% criteria booster).

5. **Logo Integration & Live Preview Tool**:
   - Your uploaded logo is integrated at `assets/logo.png`.
   - A floating **"Change Logo"** tool at the bottom-right allows you to test or swap logos directly in the browser with instant live preview.

---

## 🚀 How to Run

### Option 1: Direct File Open
Simply double-click `index.html` in your file explorer to open it directly in Chrome, Edge, Safari, or Firefox!

### Option 2: Local Web Server (Python)
Run the following in PowerShell or terminal inside this folder:
```powershell
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.

---

## 📁 File Hierarchy

```
kucchu pucchu/
├── index.html              # Main HTML5 landing and authentication portal
├── css/
│   └── styles.css          # Liquid glassmorphism, iridescent glows, 3D tilt styles
├── js/
│   ├── liquid-canvas.js    # Interactive fluid background canvas & ripples
│   ├── motion.js           # 3D card tilt glare, counters, and cockpit telemetry
│   └── auth-portal.js      # Social login handlers, simulated OAuth modal, logo tool
└── assets/
    ├── logo.png            # PrepPilot official logo
    └── logo.jpg            # PrepPilot logo copy
```
