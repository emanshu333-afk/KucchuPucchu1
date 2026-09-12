/**
 * PrepPilot - Student Cockpit Dashboard Engine
 * Handles:
 * 1. Personalization from PrepPilotAccount state & query params
 * 2. Automatic onboarding verification (redirects new accounts to onboarding.html once)
 * 3. Restores & remembers exact progress (XP, streak, completed checklist tasks, subject percentages)
 * 4. Account profile flyout & instant multi-account switcher
 * 5. Interactive CBT Mock Test Simulator modal with live grading
 * 6. Instant AI Doubt Pilot conceptual explanations
 */

(function () {
  'use strict';

  // 1. Account & URL Params Resolution
  const urlParams = new URLSearchParams(window.location.search);
  let rawUser = urlParams.get('student') || urlParams.get('user');

  if (!rawUser && window.PrepPilotAccount) {
    rawUser = window.PrepPilotAccount.getCurrentUserId();
  }
  if (!rawUser) rawUser = 'Arjun Sharma';

  const userSanitized = window.PrepPilotAccount ? window.PrepPilotAccount.sanitizeId(rawUser) : rawUser;

  // Ensure account is initialized as onboarded so student stays on dashboard screen
  if (window.PrepPilotAccount && !window.PrepPilotAccount.isAccountOnboarded(userSanitized)) {
    const acc = window.PrepPilotAccount.getAccount(userSanitized);
    if (acc) {
      acc.onboarded = true;
      window.PrepPilotAccount.saveAccount(acc);
    }
  }

  // Load persistent account data
  let currentAccount = window.PrepPilotAccount ? window.PrepPilotAccount.getAccount(userSanitized) : null;
  if (!currentAccount && window.PrepPilotAccount) {
    currentAccount = window.PrepPilotAccount.createAccount(userSanitized, rawUser);
  }

  const studentName = currentAccount ? currentAccount.name : rawUser;
  localStorage.setItem('preppilot_student_name', studentName);
  if (window.PrepPilotAccount) window.PrepPilotAccount.setCurrentUserId(userSanitized);

  // 2. Personalize Header & Banner UI
  const avatarName = document.getElementById('avatar-name');
  const avatarInitials = document.getElementById('avatar-initials');
  const welcomeHeading = document.getElementById('welcome-student-heading');
  const activeTrackLabel = document.getElementById('dash-active-track-label');
  const missionSubDesc = document.getElementById('mission-sub-desc');
  const avatarCourseBadge = document.getElementById('avatar-course-badge');
  const xpValEl = document.getElementById('student-xp-val');

  // Flyout elements
  const flyoutAvatar = document.getElementById('flyout-avatar');
  const flyoutName = document.getElementById('flyout-name');
  const flyoutCourse = document.getElementById('flyout-course');
  let selectedClass = urlParams.get('class') || localStorage.getItem('preppilot_active_class') || (currentAccount ? currentAccount.selectedClass : '10th');
  let selectedBoard = urlParams.get('board') || localStorage.getItem('preppilot_active_course') || (currentAccount ? currentAccount.selectedBoard : 'CBSE Board');
  let currentXP = currentAccount ? (currentAccount.xp || 4920) : 4920;

  if (avatarName) avatarName.textContent = studentName;
  if (avatarCourseBadge) avatarCourseBadge.textContent = `Class ${selectedClass} • ${selectedBoard}`;
  if (welcomeHeading) welcomeHeading.textContent = `Welcome to Flight Control, ${studentName.split(' ')[0]}!`;
  const plannerHeroTitle = document.getElementById('planner-welcome-title');
  if (plannerHeroTitle) plannerHeroTitle.textContent = `${studentName.split(' ')[0]}'s Custom Chapter Test Flight`;

  const initials = studentName
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'SP';

  if (avatarInitials) avatarInitials.textContent = initials;
  if (flyoutAvatar) flyoutAvatar.textContent = initials;
  if (flyoutName) flyoutName.textContent = studentName;
  if (flyoutCourse) flyoutCourse.textContent = `Class ${selectedClass} • ${selectedBoard}`;

  if (activeTrackLabel) activeTrackLabel.textContent = `Class ${selectedClass} (${selectedBoard})`;
  if (missionSubDesc) {
    missionSubDesc.innerHTML = `Your syllabus radar is calibrated for <strong>Class ${selectedClass} (${selectedBoard})</strong>. Track your flight progress, launch interactive 3D labs, and master CBT drills.`;
  }
  if (xpValEl) xpValEl.textContent = `${currentXP.toLocaleString()} XP`;

  // ==========================================================================
  // 3. SYLLABUS KNOWLEDGE REPOSITORY & CHAPTER REGISTRY
  // ==========================================================================
  const SYLLABUS_DATABASE = {
    maths: {
      id: 'maths',
      name: 'Maths',
      icon: '📐',
      iconBg: 'math-bg',
      chapters: [
        { num: '01', title: 'Real Numbers & Number Systems', topics: 'Euclid’s Division, Fundamental Theorem of Arithmetic, Irrational Numbers' },
        { num: '02', title: 'Polynomials & Algebraic Identities', topics: 'Zeroes of Polynomial, Relationship Between Zeroes & Coefficients' },
        { num: '03', title: 'Pair of Linear Equations in Two Variables', topics: 'Graphical Method, Substitution, Elimination, Consistency' },
        { num: '04', title: 'Quadratic Equations', topics: 'Factorisation, Quadratic Formula, Nature of Roots & Discriminant' },
        { num: '05', title: 'Arithmetic Progressions', topics: 'nth Term of an AP, Sum of First n Terms, Applied Word Problems' },
        { num: '06', title: 'Triangles & Coordinate Geometry', topics: 'Similarity Criteria, Distance Formula, Section Formula' },
        { num: '07', title: 'Trigonometry & Applications', topics: 'Trigonometric Ratios of Specific Angles, Identities, Heights & Distances' },
        { num: '08', title: 'Circles & Tangents', topics: 'Tangent to a Circle, Lengths of Tangents from External Point' },
        { num: '09', title: 'Surface Areas and Volumes', topics: 'Combinations of Solids, Cylinders, Cones, Hemispheres' },
        { num: '10', title: 'Statistics & Probability', topics: 'Mean, Median, Mode of Grouped Data, Classical Probability' },
        { num: '11', title: 'Relations, Functions & Matrices', topics: 'Cartesian Products, Invertible Matrices, Determinants' },
        { num: '12', title: 'Calculus & Differential Equations', topics: 'Limits, Continuity, Differentiation, Indefinite & Definite Integrals' },
        { num: '13', title: 'Vectors & 3D Geometry', topics: 'Dot & Cross Products, Direction Cosines, Straight Lines in Space' }
      ]
    },
    hindi: {
      id: 'hindi',
      name: 'Hindi',
      icon: '📖',
      iconBg: 'hindi-bg',
      chapters: [
        { num: '01', title: 'नेताजी का चश्मा (गद्य खंड)', topics: 'स्वयं प्रकाश - कैप्टन चश्मेवाले की देशभक्ति, मूर्ति पर चश्मा, सामाजिक चेतना' },
        { num: '02', title: 'बालगोबिन भगत (गद्य खंड)', topics: 'रामवृक्ष बेनीपुरी - कबीरपंथी साधु, गृहस्थ संन्यासी, सामाजिक रूढ़ियों का खंडन' },
        { num: '03', title: 'लखनवी अंदाज़ (गद्य खंड)', topics: 'यशपाल - पतनशील सामंती वर्ग पर तीखा व्यंग्य, खीरा खाने की बनावटी शैली' },
        { num: '04', title: 'एक कहानी यह भी (गद्य खंड)', topics: 'मन्नू भंडारी - लेखिका का पारिवारिक परिवेश, स्वतंत्रता आंदोलन, पितृसत्ता से संघर्ष' },
        { num: '05', title: 'पद (काव्य खंड)', topics: 'सूरदास - उद्धव-गोपी संवाद, भ्रमरगीत, अनन्य प्रेम निष्ठा' },
        { num: '06', title: 'राम-लक्ष्मण-परशुराम संवाद (काव्य खंड)', topics: 'तुलसीदास - धनुर्भंग, संवाद सौष्ठव, वीर और रौद्र रस का सुंदर परिपाक' },
        { num: '07', title: 'उत्साह और अट नहीं रही है (काव्य खंड)', topics: 'सूर्यकांत त्रिपाठी निराला - बादलों का क्रांति-स्वर, फागुन की मादक सुंदरता' },
        { num: '08', title: 'यह दंतुरित मुसकान और फसल (काव्य खंड)', topics: 'नागार्जुन - नन्हें शिशु की निश्छल मुस्कान, नदियों और मिट्टी का गुणधर्म' },
        { num: '09', title: 'संगतकार (काव्य खंड)', topics: 'मंगलेश डबराल - मुख्य गायक के सहयोगी की भूमिका, त्याग और मानवीय संवेदनशीलता' },
        { num: '10', title: 'माता का अँचल (कृतिका)', topics: 'शिवपूजन सहाय - ठेठ देहाती जीवन, बचपन के खेल, विपत्ति में माँ की शरण' },
        { num: '11', title: 'साना-साना हाथ जोड़ि (कृतिका)', topics: 'मधु कांकरिया - सिक्किम व हिमालय यात्रा वृतांत, बीहड़ पहाड़ों का प्राकृतिक सौंदर्य' },
        { num: '12', title: 'व्यावहारिक व्याकरण एवं रचनात्मक लेखन', topics: 'रचना के आधार पर वाक्य भेद, वाच्य, पद परिचय, अलंकार, अनुच्छेद व पत्र लेखन' }
      ]
    },
    english: {
      id: 'english',
      name: 'English',
      icon: '🔤',
      iconBg: 'english-bg',
      chapters: [
        { num: '01', title: 'A Letter to God & Dust of Snow', topics: 'Lencho’s Faith, Robert Frost’s Sycamore, Irony and Nature’s Healing' },
        { num: '02', title: 'Nelson Mandela: Long Walk to Freedom', topics: 'Apartheid, Emancipation from Oppression, Courage & Human Dignity' },
        { num: '03', title: 'Two Stories about Flying', topics: 'His First Flight (Liam O’Flaherty) & The Black Aeroplane (Frederick Forsyth)' },
        { num: '04', title: 'From the Diary of Anne Frank & Amanda!', topics: 'Holocaust Memoir, Teenage Solitude, Robin Klein’s Poem on Autonomy' },
        { num: '05', title: 'Glimpses of India', topics: 'A Baker from Goa, Coorg (Coffee Land), Tea from Assam (Rajvir & Pranjol)' },
        { num: '06', title: 'Mijbil the Otter & Fog', topics: 'Camaraderie with Mijbil, Carl Sandburg’s Metaphor of Quiet City Fog' },
        { num: '07', title: 'Madam Rides the Bus & Custard the Dragon', topics: 'Valli’s Bus Journey to Town, Ogden Nash’s Comic Parody Ballad' },
        { num: '08', title: 'The Sermon at Benares & For Anne Gregory', topics: 'Lord Buddha, Kisa Gotami, Mustard Seed Lesson, Yeats on Inner Beauty' },
        { num: '09', title: 'The Proposal (Drama by Anton Chekhov)', topics: 'Russian Farce, Lomov & Natalya, Property Squabbles & Marriage' },
        { num: '10', title: 'A Triumph of Surgery & The Thief’s Story', topics: 'James Herriot & Tricki, Ruskin Bond’s Hari Singh and Anil’s Trust' },
        { num: '11', title: 'The Midnight Visitor & A Question of Trust', topics: 'Ausable’s Sharp Wits, Horace Danby and the Clever Lady in Red' },
        { num: '12', title: 'Applied Grammar & Analytical Writing', topics: 'Tenses, Modals, Subject-Verb Concord, Reported Speech, Analytical Paragraph' }
      ]
    },
    science: {
      id: 'science',
      name: 'Science',
      icon: '🔬',
      iconBg: 'science-bg',
      chapters: [
        { num: '01', title: 'Chemical Reactions and Equations', topics: 'Balancing Equations, Precipitation, Redox, Corrosion, Rancidity' },
        { num: '02', title: 'Acids, Bases and Salts', topics: 'pH Scale, Neutralization, Bleaching Powder, Baking Soda, Plaster of Paris' },
        { num: '03', title: 'Metals and Non-metals', topics: 'Reactivity Series, Ionic Bonds, Metallurgy, Calcination, Roasting, Alloys' },
        { num: '04', title: 'Carbon and its Compounds', topics: 'Covalent Bonding, Homologous Series, Functional Groups, Saponification' },
        { num: '05', title: 'Life Processes: Nutrition & Respiration', topics: 'Autotrophic & Heterotrophic Modes, Glycolysis, Aerobic/Anaerobic Pathways' },
        { num: '06', title: 'Life Processes: Transportation & Excretion', topics: 'Human Circulatory System, Blood Pressure, Nephron Filtration, Hemodialysis' },
        { num: '07', title: 'Control and Coordination', topics: 'Reflex Arc, Brain Anatomy, Plant Auxins/Gibberellins, Endocrine Hormones' },
        { num: '08', title: 'How do Organisms Reproduce?', topics: 'Fission, Budding, Spores, Pollination in Flowers, Human Reproductive Organs' },
        { num: '09', title: 'Heredity and Evolution', topics: 'Mendelian Genetics, Monohybrid & Dihybrid Crosses, Sex Determination in Humans' },
        { num: '10', title: 'Light: Reflection and Refraction', topics: 'Spherical Mirrors, Mirror Formula, Snell’s Law, Thin Lens Formula, Power' },
        { num: '11', title: 'The Human Eye and Colourful World', topics: 'Defects of Vision (Myopia, Hypermetropia), Dispersion by Prism, Tyndall Effect' },
        { num: '12', title: 'Electricity & Circuits', topics: 'Ohm’s Law, Resistance Factors, Series & Parallel Combinations, Joule’s Heating' },
        { num: '13', title: 'Magnetic Effects of Electric Current', topics: 'Magnetic Field Lines, Right Hand Thumb Rule, Solenoid, Motor Principle' },
        { num: '14', title: 'Our Environment & Ecosystems', topics: 'Trophic Levels, 10 Percent Law, Biomagnification, Ozone Layer Depletion' }
      ]
    },
    social_science: {
      id: 'social_science',
      name: 'Social Science',
      icon: '🌍',
      iconBg: 'social-bg',
      chapters: [
        { num: '01', title: 'The Rise of Nationalism in Europe', topics: 'French Revolution, Romanticism, Liberalism, Unification of Germany & Italy' },
        { num: '02', title: 'Nationalism in India', topics: 'Rowlatt Act, Non-Cooperation Movement, Salt March, Poona Pact, Sense of Belonging' },
        { num: '03', title: 'The Making of a Global World', topics: 'Silk Routes, Rinderpest Plague in Africa, Great Depression of 1929' },
        { num: '04', title: 'Resources and Development', topics: 'Classification of Resources, Land Degradation, Soil Profiles & Conservation' },
        { num: '05', title: 'Forest and Wildlife Resources', topics: 'Flora and Fauna Biodiversity, Reserved & Protected Forests, Chipko Movement' },
        { num: '06', title: 'Water Resources & Multipurpose Projects', topics: 'Dams Advantages & Disadvantages, Rainwater Harvesting, Rooftop Methods' },
        { num: '07', title: 'Agriculture & Cropping Seasons', topics: 'Kharif, Rabi, Zaid, Rice, Wheat, Cotton, Technological & Institutional Reforms' },
        { num: '08', title: 'Minerals and Energy Resources', topics: 'Iron Ore, Bauxite, Mica, Conventional (Coal, Oil) & Non-Conventional (Solar, Wind)' },
        { num: '09', title: 'Power Sharing & Federalism', topics: 'Belgium vs Sri Lanka, Majoritarianism, Union List, State List, Decentralization' },
        { num: '10', title: 'Gender, Religion and Caste in Politics', topics: 'Feminist Movements, Secular Constitution, Communalism, Caste Inequalities' },
        { num: '11', title: 'Political Parties & Democratic Reforms', topics: 'Functions, National & State Parties, Challenges Faced, Anti-Defection Law' },
        { num: '12', title: 'Development & Sectors of Indian Economy', topics: 'Per Capita Income, HDI, Primary, Secondary, Tertiary, Organized vs Unorganized' },
        { num: '13', title: 'Money, Credit & Globalization', topics: 'Barter System, Currency, Formal vs Informal Loans, SHGs, MNCs, WTO' }
      ]
    },
    physics: {
      id: 'physics',
      name: 'Physics',
      icon: '⚡',
      iconBg: 'physics-bg',
      chapters: [
        { num: '01', title: 'Units, Dimensions & Errors', topics: 'SI Units, Dimensional Analysis, Error Propagation' },
        { num: '02', title: 'Motion in a Straight Line', topics: 'Kinematic Graphs, Uniform Acceleration, Relative Velocity' },
        { num: '03', title: 'Motion in a Plane & Projectiles', topics: 'Vector Operations, Projectile Trajectory, Circular Motion' },
        { num: '04', title: 'Laws of Motion & Friction', topics: 'Newton’s 3 Laws, Tension, Static & Kinetic Friction, Banking' },
        { num: '05', title: 'Work, Energy and Power', topics: 'Work-Energy Theorem, Conservative Forces, Elastic Collisions' },
        { num: '06', title: 'Rotational Motion & Inertia', topics: 'Center of Mass, Torque, Angular Momentum, Moment of Inertia' },
        { num: '07', title: 'Gravitation & Satellite Orbits', topics: 'Kepler’s Laws, Gravitational Potential, Escape Velocity' },
        { num: '08', title: 'Mechanical Properties of Solids & Fluids', topics: 'Hooke’s Law, Pascal’s Law, Bernoulli’s Principle, Viscosity' },
        { num: '09', title: 'Thermodynamics & Kinetic Theory', topics: 'First & Second Laws, Carnot Engine, P-V Diagrams, RMS Speed' },
        { num: '10', title: 'Oscillations & SHM', topics: 'Simple Harmonic Motion, Spring-Mass System, Simple Pendulum' },
        { num: '11', title: 'Waves & Acoustics', topics: 'Transverse & Longitudinal Waves, Standing Waves, Doppler Effect' },
        { num: '12', title: 'Electrostatics & Gauss Theorem', topics: 'Coulomb’s Law, Electric Dipole, Flux & Equipotential Surfaces' },
        { num: '13', title: 'Capacitance & Dielectrics', topics: 'Parallel Plate Capacitor, Energy Stored, Dielectric Polarization' },
        { num: '14', title: 'Current Electricity & Circuits', topics: 'Ohm’s Law, Drift Velocity, Kirchhoff’s Laws, Wheatstone Bridge' },
        { num: '15', title: 'Magnetic Effects of Current', topics: 'Biot-Savart Law, Ampere’s Law, Lorentz Force, Cyclotron' },
        { num: '16', title: 'Electromagnetic Induction & AC', topics: 'Faraday & Lenz’s Law, LCR Series Circuit, Resonance, Power Factor' },
        { num: '17', title: 'Ray & Wave Optics', topics: 'Refraction, Lenses, Huygens Principle, Young’s Double Slit Experiment' },
        { num: '18', title: 'Modern Physics & Semiconductors', topics: 'Photoelectric Effect, Bohr Atom, PN Junction Diode, Logic Gates' }
      ]
    },
    chemistry: {
      id: 'chemistry',
      name: 'Chemistry',
      icon: '🧪',
      iconBg: 'chem-bg',
      chapters: [
        { num: '01', title: 'Some Basic Concepts of Chemistry', topics: 'Mole Concept, Stoichiometry, Empirical Formulas, Molarity' },
        { num: '02', title: 'Structure of Atom', topics: 'Bohr’s Model, Quantum Numbers, Orbitals, Aufbau Principle' },
        { num: '03', title: 'Periodic Table & Periodicity', topics: 'Ionization Enthalpy, Electron Gain Enthalpy, Electronegativity' },
        { num: '04', title: 'Chemical Bonding & Molecular Structure', topics: 'VSEPR Theory, Hybridization (sp, sp2, sp3), Molecular Orbitals' },
        { num: '05', title: 'Chemical Thermodynamics', topics: 'Enthalpy, Hess’s Law, Entropy, Gibbs Free Energy & Spontaneity' },
        { num: '06', title: 'Chemical & Ionic Equilibrium', topics: 'Le Chatelier’s Principle, pH, Buffer Solutions, Solubility Product' },
        { num: '07', title: 'Redox Reactions & Electrochemistry', topics: 'Oxidation Numbers, Nernst Equation, Galvanic Cells, Kohlrausch Law' },
        { num: '08', title: 'Solutions & Colligative Properties', topics: 'Raoult’s Law, Elevation of Boiling Point, Van’t Hoff Factor' },
        { num: '09', title: 'Chemical Kinetics', topics: 'Rate Law, Order & Molecularity, Integrated Rate Equations, Arrhenius' },
        { num: '10', title: 'Coordination Compounds', topics: 'Werner’s Theory, IUPAC Nomenclature, Valence Bond & Crystal Field' },
        { num: '11', title: 'Haloalkanes & Haloarenes', topics: 'SN1 vs SN2 Mechanisms, Chirality, Nucleophilic Substitution' },
        { num: '12', title: 'Alcohols, Phenols and Ethers', topics: 'Lucas Test, Reimer-Tiemann Reaction, Williamson Ether Synthesis' },
        { num: '13', title: 'Aldehydes, Ketones & Carboxylic Acids', topics: 'Nucleophilic Addition, Aldol Condensation, Cannizzaro Reaction' },
        { num: '14', title: 'Amines & Nitrogen Compounds', topics: 'Hoffmann Bromamide, Diazonium Coupling, Carbylamine Reaction' },
        { num: '15', title: 'Biomolecules & Polymers', topics: 'Carbohydrates, Amino Acids, Peptide Bonds, Nucleic Acids (DNA/RNA)' }
      ]
    },
    zoology: {
      id: 'zoology',
      name: 'Zoology',
      icon: '🐾',
      iconBg: 'zoology-bg',
      chapters: [
        { num: '01', title: 'Animal Kingdom: Non-Chordates', topics: 'Porifera, Coelenterata, Platyhelminthes, Annelida, Arthropoda, Mollusca' },
        { num: '02', title: 'Animal Kingdom: Chordates', topics: 'Vertebrate Classes: Pisces, Amphibia, Reptilia, Aves, Mammalia' },
        { num: '03', title: 'Structural Organisation in Animals', topics: 'Epithelial, Connective, Muscular, Neural Tissues, Cockroach Morphology' },
        { num: '04', title: 'Biomolecules in Animal Physiology', topics: 'Amino Acids, Enzymes, Activation Energy, Co-factors, Inhibition' },
        { num: '05', title: 'Breathing and Exchange of Gases', topics: 'Respiratory Volumes (TV, IRV, ERV, RV), Gas Transport, Regulation of Respiration' },
        { num: '06', title: 'Body Fluids and Circulation', topics: 'ABO & Rh Grouping, Coagulation of Blood, Cardiac Cycle, ECG, Systemic Circulation' },
        { num: '07', title: 'Excretory Products & Elimination', topics: 'Urine Formation, Glomerular Filtration, Counter-Current Mechanism, Micturition' },
        { num: '08', title: 'Locomotion and Movement', topics: 'Types of Movement, Skeletal Muscle Ultrastructure, Sliding Filament Theory, Joints' },
        { num: '09', title: 'Neural Control and Coordination', topics: 'Nerve Impulse Generation & Conduction, Synapses, Reflex Action, Sensory Organs' },
        { num: '10', title: 'Chemical Coordination & Integration', topics: 'Pituitary, Thyroid, Parathyroid, Adrenal, Pancreas Hormones, Action Mechanism' },
        { num: '11', title: 'Human Reproduction', topics: 'Spermatogenesis, Oogenesis, Menstrual Cycle, Fertilization, Embryo Implantation' },
        { num: '12', title: 'Reproductive Health', topics: 'Amniocentesis, Contraceptive Methods, Medical Termination of Pregnancy, IVF, ART' },
        { num: '13', title: 'Human Health and Disease', topics: 'Infectious Agents (Plasmodium, Typhoid), Immunity, Antibodies, AIDS, Cancer' },
        { num: '14', title: 'Evolution & Origin of Life', topics: 'Homologous & Analogous Organs, Natural Selection, Hardy-Weinberg Equilibrium' },
        { num: '15', title: 'Biotechnology in Medicine & Animals', topics: 'Genetically Engineered Insulin, Gene Therapy, Transgenic Animals, Ethical Issues' }
      ]
    },
    anatomy: {
      id: 'anatomy',
      name: 'Anatomy',
      icon: '🫀',
      iconBg: 'anatomy-bg',
      chapters: [
        { num: '01', title: 'Plant Anatomy: Meristems & Tissues', topics: 'Apical, Intercalary, Lateral Meristems, Simple & Complex Permanent Tissues' },
        { num: '02', title: 'Plant Anatomy: The Tissue Systems', topics: 'Epidermal Tissue System, Ground Tissue, Vascular Bundles (Open, Closed, Radial)' },
        { num: '03', title: 'Plant Anatomy: Root Micro-Architecture', topics: 'Anatomy of Dicotyledonous and Monocotyledonous Roots, Endodermis, Pericycle' },
        { num: '04', title: 'Plant Anatomy: Stem Histology', topics: 'Anatomy of Dicot & Monocot Stems, Collenchymatous Hypodermis, Vascular Bundles' },
        { num: '05', title: 'Plant Anatomy: Leaf Histology', topics: 'Dorsiventral & Isobilateral Leaves, Stomata, Mesophyll Differentiation' },
        { num: '06', title: 'Plant Anatomy: Secondary Growth', topics: 'Vascular Cambium Activity, Annual Rings, Heartwood & Sapwood, Cork Cambium' },
        { num: '07', title: 'Human Anatomy: Cardiovascular Architecture', topics: 'Heart Wall Layers, Chambers, Tricuspid/Bicuspid Valves, Great Vessels' },
        { num: '08', title: 'Human Anatomy: Renal & Urinary System', topics: 'Kidney Architecture, Renal Pyramids, Bowman’s Capsule, Glomerular Capillaries' },
        { num: '09', title: 'Human Anatomy: Respiratory Apparatus', topics: 'Nasal Cavity, Pharynx, Larynx Cartilages, Trachea Rings, Bronchial Tree, Alveoli' },
        { num: '10', title: 'Human Anatomy: Neuroanatomy & Brain', topics: 'Forebrain, Midbrain, Hindbrain, Meninges, Cerebrospinal Fluid, Cranial Nerves' },
        { num: '11', title: 'Human Anatomy: Skeletal Framework', topics: 'Cranium, Facial Bones, Vertebral Column, Rib Cage, Pectoral & Pelvic Girdles' },
        { num: '12', title: 'Human Anatomy: Arthrology & Joints', topics: 'Ball & Socket, Hinge, Pivot, Gliding, Saddle Joints, Cartilage Histology' }
      ]
    },
    physical_education: {
      id: 'physical_education',
      name: 'Physical Education',
      icon: '🏃‍♂️',
      iconBg: 'pe-bg',
      chapters: [
        { num: '01', title: 'Management of Sporting Events', topics: 'Planning, Committees, Knock-out & League Tournament Fixtures, Intramural/Extramural' },
        { num: '02', title: 'Children & Women in Sports', topics: 'Motor Development, Postural Deformities (Kyphosis, Lordosis, Scoliosis), Menarche' },
        { num: '03', title: 'Yoga as Preventive Lifestyle Measure', topics: 'Asanas for Obesity, Diabetes, Asthma, Hypertension, Relaxation Techniques' },
        { num: '04', title: 'Physical Education for CWSN', topics: 'Children with Special Needs (Divyang), Special Olympics, Adaptive Equipment' },
        { num: '05', title: 'Sports & Nutrition', topics: 'Balanced Diet, Macro & Micro Nutrients, Nutritive vs Non-Nutritive Components, Food Myths' },
        { num: '06', title: 'Test & Measurement in Sports', topics: 'BMI, Sai Khelo India Fitness Test, Harvard Step Test, Senior Citizen Fitness' },
        { num: '07', title: 'Physiology & Injuries in Sports', topics: 'Cardiorespiratory Endurance, Soft Tissue Injuries (Sprain, Strain), RICER First Aid' },
        { num: '08', title: 'Biomechanics & Sports', topics: 'Newton’s Laws of Motion in Athletics, Equilibrium, Friction, Projectile Trajectory' },
        { num: '09', title: 'Psychology & Sports', topics: 'Personality Traits (Big Five), Motivation, Aggression in Sports, Self-Esteem' },
        { num: '10', title: 'Training in Sports', topics: 'Strength, Endurance, Speed, Flexibility, Agility, Circuit Training & Periodization' }
      ]
    }
  };

  // Backwards compatibility aliases
  SYLLABUS_DATABASE.mathematics = SYLLABUS_DATABASE.maths;
  SYLLABUS_DATABASE.social = SYLLABUS_DATABASE.social_science;
  SYLLABUS_DATABASE.biology = SYLLABUS_DATABASE.zoology;

  // Class Normalizer & Dynamic Syllabus Synchronizer
  function normalizeClassKey(cls) {
    if (!cls) return '10th';
    const c = String(cls).toLowerCase().trim();
    if (c.includes('6')) return '6th';
    if (c.includes('7')) return '7th';
    if (c.includes('8')) return '8th';
    if (c.includes('9')) return '9th';
    if (c.includes('10')) return '10th';
    if (c.includes('11')) return '11th';
    if (c.includes('12')) return '12th';
    if (c.includes('drop')) return 'dropper';
    return '10th';
  }

  function syncClassSyllabus(targetClass) {
    const key = normalizeClassKey(targetClass);
    const registry = (typeof window !== 'undefined' && window.CLASS_SYLLABUS_REGISTRY)
      ? window.CLASS_SYLLABUS_REGISTRY
      : ((typeof CLASS_SYLLABUS_REGISTRY !== 'undefined') ? CLASS_SYLLABUS_REGISTRY : null);

    if (registry && registry[key]) {
      const catalog = registry[key];
      // Clear previous keys from SYLLABUS_DATABASE
      for (const k in SYLLABUS_DATABASE) {
        delete SYLLABUS_DATABASE[k];
      }
      // Populate with new class subjects and their chapters
      for (const subjKey in catalog) {
        SYLLABUS_DATABASE[subjKey] = JSON.parse(JSON.stringify(catalog[subjKey]));
      }
      // Subject aliases for robust lookup
      if (SYLLABUS_DATABASE.maths) SYLLABUS_DATABASE.mathematics = SYLLABUS_DATABASE.maths;
      if (SYLLABUS_DATABASE.social_science) SYLLABUS_DATABASE.social = SYLLABUS_DATABASE.social_science;
      if (SYLLABUS_DATABASE.zoology) SYLLABUS_DATABASE.biology = SYLLABUS_DATABASE.zoology;
    }
  }

  // Initial syllabus synchronization for the active class
  syncClassSyllabus(selectedClass);

  // Date helper functions
  function getTomorrowIso() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getOffsetDateIso(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatDateHuman(isoStr) {
    if (!isoStr) return '';
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

  // State
  let activeSubjectKey = null;
  let selectedChapters = [];
  let activeTestMode = 'cbt-full';
  let activeOriginFilter = 'all';

  // Step 1: Render Subjects
  const subjectsGrid = document.getElementById('planner-subjects-grid');

  function getActiveSubjectsList() {
    const cls = (selectedClass || '10th').toLowerCase();
    const board = (selectedBoard || '').toLowerCase();

    // 1. Classes 6th to 10th: maths, hindi, english, science, social science
    if (cls.includes('6') || cls.includes('7') || cls.includes('8') || cls.includes('9') || cls.includes('10')) {
      return ['maths', 'hindi', 'english', 'science', 'social_science'];
    }

    // 2. 11th, 12th, Dropper - IIT Syllabus: maths, physics, chemistry
    if (board.includes('jee') || board.includes('iit') || board.includes('engineering')) {
      return ['maths', 'physics', 'chemistry'];
    }

    // 3. 11th, 12th, Dropper - NEET Syllabus: physics, chemistry, zoology, anatomy
    if (board.includes('neet') || board.includes('medical')) {
      return ['physics', 'chemistry', 'zoology', 'anatomy'];
    }

    // 4. Normal 11th & 12th Syllabus: physics, chemistry, maths, zoology, anatomy, english, physical education
    if (cls.includes('11') || cls.includes('12')) {
      return ['physics', 'chemistry', 'maths', 'zoology', 'anatomy', 'english', 'physical_education'];
    }

    // 5. Dropper default fallback
    if (cls.includes('drop')) {
      if (board.includes('neet')) {
        return ['physics', 'chemistry', 'zoology', 'anatomy'];
      }
      return ['maths', 'physics', 'chemistry'];
    }

    // Default fallback (Class 6th-10th)
    return ['maths', 'hindi', 'english', 'science', 'social_science'];
  }

  function renderPlannerSubjects() {
    if (!subjectsGrid) return;

    const keys = getActiveSubjectsList();

    // Reset chapter panel if active subject doesn't belong to current course/class
    if (activeSubjectKey && !keys.includes(activeSubjectKey)) {
      activeSubjectKey = null;
      selectedChapters = [];
      const chaptersSec = document.getElementById('section-chapters');
      if (chaptersSec) chaptersSec.style.display = 'none';
      const calendarSec = document.getElementById('section-calendar');
      if (calendarSec) calendarSec.style.display = 'none';
    }

    subjectsGrid.innerHTML = keys
      .map((key) => {
        const subj = SYLLABUS_DATABASE[key];
        if (!subj) return '';
        const isSelected = activeSubjectKey === key;
        const chapterCount = (subj.chapters && subj.chapters.length) ? subj.chapters.length : 0;
        const isDropper = (selectedClass || '').toLowerCase().includes('drop');
        const classLabel = isDropper ? 'Class 11 &amp; 12 Combined' : `Class ${selectedClass} Syllabus`;
        return `
        <button type="button" class="planner-subject-card ${isSelected ? 'selected' : ''}" data-subj="${key}" onclick="window.preppilotSelectSubject &amp;&amp; window.preppilotSelectSubject('${key}')" aria-label="Select ${subj.name}">
          <div class="subj-header">
            <div class="subj-icon ${subj.iconBg || 'physics-bg'}">${subj.icon || '📚'}</div>
            <div class="subj-check-indicator">✓</div>
          </div>
          <h3 class="subj-name">${subj.name}</h3>
          <div class="subj-meta">
            <span>${classLabel}</span>
            <span class="subj-chapters-pill">${chapterCount} Chapters</span>
          </div>
        </button>
      `;
      })
      .join('');
  }

  let lastSelectSubjTime = 0;
  function selectSubject(subjectKey, shouldScroll = true) {
    if (!subjectKey) return;
    const now = Date.now();
    const isSameSubject = activeSubjectKey === subjectKey;
    if (isSameSubject && (now - lastSelectSubjTime < 80)) return;
    lastSelectSubjTime = now;
    activeSubjectKey = subjectKey;
    if (!isSameSubject) {
      selectedChapters = [];
    }

    // Mark visual selection on subject cards
    if (subjectsGrid) {
      subjectsGrid.querySelectorAll('.planner-subject-card').forEach((c) => {
        if (c.getAttribute('data-subj') === subjectKey) c.classList.add('selected');
        else c.classList.remove('selected');
      });
    }

    // Reveal chapters panel
    const subjData = SYLLABUS_DATABASE[subjectKey];
    const chaptersSec = document.getElementById('section-chapters');
    const subjTitle = document.getElementById('selected-subject-title');
    const subjSub = document.getElementById('selected-subject-sub');
    const originFilterRow = document.getElementById('chapter-origin-filter-row');
    const isDropper = (selectedClass || '').toLowerCase().includes('drop');

    if (subjTitle && subjData) {
      if (isDropper) {
        subjTitle.textContent = `${subjData.icon || '📚'} Dropper: Class 11 & 12 Combined ${subjData.name} Chapters (${(subjData.chapters || []).length} Available)`;
      } else {
        subjTitle.textContent = `${subjData.icon || '📚'} Class ${selectedClass} ${subjData.name} Chapters (${(subjData.chapters || []).length} Available)`;
      }
    }
    if (subjSub && subjData) {
      if (isDropper) {
        subjSub.textContent = `Tick any chapters from Class 11 & 12 combined syllabus in ${subjData.name} for your Dropper test flight.`;
      } else {
        subjSub.textContent = `Tick any chapters in Class ${selectedClass} ${subjData.name} you want to cover for your test flight.`;
      }
    }

    // Show/hide dropper class origin filter row
    if (originFilterRow) {
      const hasOrigins = subjData && subjData.chapters && subjData.chapters.some((c) => c.classOrigin);
      if (isDropper && hasOrigins) {
        originFilterRow.style.display = 'flex';
      } else {
        originFilterRow.style.display = 'none';
      }
    }

    if (chaptersSec) {
      chaptersSec.style.display = 'block';
      if (shouldScroll) {
        chaptersSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    // Reset search and origin filter on subject change
    const searchInput = document.getElementById('chapter-search-input');
    if (searchInput && !isSameSubject) searchInput.value = '';
    if (!isSameSubject) {
      activeOriginFilter = 'all';
      const originFilterBtns = document.querySelectorAll('.btn-origin-filter');
      originFilterBtns.forEach((b) => {
        if (b.getAttribute('data-filter') === 'all') b.classList.add('active');
        else b.classList.remove('active');
      });
    }

    renderChaptersChecklist(searchInput ? searchInput.value : '');
    updateChapterSummary();

    if (subjData && !isSameSubject) {
      const classMsg = isDropper ? 'Dropper (Class 11 & 12 Combined)' : `Class ${selectedClass}`;
      showToast(`${subjData.icon || '📚'} <strong>${subjData.name}</strong> selected for ${classMsg}! ${(subjData.chapters || []).length} chapters available below.`);
    }
  }

  // Step 2: Render Chapter Checklist
  function renderChaptersChecklist(filterText = '') {
    const container = document.getElementById('chapters-checklist-container');
    if (!container || !activeSubjectKey) return;

    const subjData = SYLLABUS_DATABASE[activeSubjectKey];
    if (!subjData) return;

    const term = (filterText || '').trim().toLowerCase();
    const filtered = subjData.chapters.filter((ch) => {
      if (activeOriginFilter !== 'all' && ch.classOrigin && ch.classOrigin !== activeOriginFilter) {
        return false;
      }
      if (!term) return true;
      return ch.title.toLowerCase().includes(term) || (ch.topics && ch.topics.toLowerCase().includes(term));
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
          No chapters found matching current filters. Clear search or change syllabus scope.
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((ch) => {
        const isChecked = selectedChapters.some((s) => s.num === ch.num);
        const classBadge = ch.classOrigin
          ? `<span class="chapter-class-badge ${ch.classOrigin.toLowerCase().replace(/\s+/g, '')}">${ch.classOrigin}</span>`
          : '';
        return `
        <div class="chapter-check-item ${isChecked ? 'checked' : ''}" data-num="${ch.num}">
          <div class="chapter-checkbox-box">✓</div>
          <div class="chapter-info-col">
            <div class="chapter-meta-line">
              <span class="chapter-num-badge">Chapter ${ch.num}</span>
              ${classBadge}
            </div>
            <div class="chapter-title-text">${ch.title}</div>
            <div class="chapter-topics-text">${ch.topics || ''}</div>
          </div>
        </div>
      `;
      })
      .join('');

    container.querySelectorAll('.chapter-check-item').forEach((item) => {
      item.addEventListener('click', () => {
        const num = item.getAttribute('data-num');
        const ch = subjData.chapters.find((c) => c.num === num);
        if (!ch) return;

        const existsIdx = selectedChapters.findIndex((s) => s.num === num);
        if (existsIdx >= 0) {
          selectedChapters.splice(existsIdx, 1);
          item.classList.remove('checked');
        } else {
          selectedChapters.push(ch);
          item.classList.add('checked');
        }

        updateChapterSummary();

        // Update modify button live count if in modify mode
        if (typeof isModifyMode !== 'undefined' && isModifyMode && btnScheduleTest) {
          btnScheduleTest.innerHTML = `<span>💾 Save &amp; Update Scheduled Chapters (${selectedChapters.length} Selected)</span>`;
        }
      });
    });
  }

  function updateChapterSummary() {
    const summaryLabel = document.getElementById('chapter-selection-summary');
    const minHint = document.getElementById('chapter-min-hint');
    const countdownMeta = document.getElementById('countdown-meta-text');
    const calendarSec = document.getElementById('section-calendar');

    const count = selectedChapters.length;

    if (summaryLabel) {
      summaryLabel.textContent = `${count} chapter${count === 1 ? '' : 's'} selected`;
    }

    if (minHint) {
      if (count > 0) {
        minHint.textContent = `✓ ${count} chapter${count === 1 ? '' : 's'} selected. Choose your test date below.`;
        minHint.classList.add('ready');
      } else {
        minHint.textContent = 'Tick chapters above to choose test date';
        minHint.classList.remove('ready');
      }
    }

    // Auto-reveal calendar section when user has selected at least 1 chapter!
    if (calendarSec) {
      if (count > 0) {
        calendarSec.style.display = 'block';
      } else {
        calendarSec.style.display = 'none';
      }
    }

    if (countdownMeta) {
      const subjName = activeSubjectKey && SYLLABUS_DATABASE[activeSubjectKey] ? SYLLABUS_DATABASE[activeSubjectKey].name : '';
      countdownMeta.textContent = `Target: ${count} chapter${count === 1 ? '' : 's'} in ${subjName}`;
    }
  }

  // Chapter Search Filter
  const chapterSearchInput = document.getElementById('chapter-search-input');
  if (chapterSearchInput) {
    chapterSearchInput.addEventListener('input', (e) => {
      renderChaptersChecklist(e.target.value);
    });
  }

  // Origin Filter Buttons (Class 11 / Class 12 / All Scope for Droppers)
  const originFilterButtons = document.querySelectorAll('.btn-origin-filter');
  originFilterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      originFilterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeOriginFilter = btn.getAttribute('data-filter') || 'all';
      renderChaptersChecklist(chapterSearchInput ? chapterSearchInput.value : '');
    });
  });

  // Select All / Deselect All
  const btnSelectAll = document.getElementById('btn-select-all-chapters');
  const btnDeselectAll = document.getElementById('btn-deselect-all-chapters');

  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', () => {
      if (!activeSubjectKey) return;
      const subjData = SYLLABUS_DATABASE[activeSubjectKey];
      if (!subjData) return;

      const term = (chapterSearchInput ? chapterSearchInput.value : '').trim().toLowerCase();
      const visible = subjData.chapters.filter((ch) => {
        if (activeOriginFilter !== 'all' && ch.classOrigin && ch.classOrigin !== activeOriginFilter) {
          return false;
        }
        if (!term) return true;
        return ch.title.toLowerCase().includes(term) || (ch.topics && ch.topics.toLowerCase().includes(term));
      });

      visible.forEach((ch) => {
        if (!selectedChapters.some((s) => s.num === ch.num)) {
          selectedChapters.push(ch);
        }
      });

      renderChaptersChecklist(chapterSearchInput ? chapterSearchInput.value : '');
      updateChapterSummary();
      showToast(`✅ Selected ${visible.length} chapters in ${subjData.name}!`);
    });
  }

  if (btnDeselectAll) {
    btnDeselectAll.addEventListener('click', () => {
      if (!activeSubjectKey) return;
      const subjData = SYLLABUS_DATABASE[activeSubjectKey];
      if (!subjData) return;

      const term = (chapterSearchInput ? chapterSearchInput.value : '').trim().toLowerCase();
      const visible = subjData.chapters.filter((ch) => {
        if (activeOriginFilter !== 'all' && ch.classOrigin && ch.classOrigin !== activeOriginFilter) {
          return false;
        }
        if (!term) return true;
        return ch.title.toLowerCase().includes(term) || (ch.topics && ch.topics.toLowerCase().includes(term));
      });

      // Remove visible chapters from selected list
      selectedChapters = selectedChapters.filter((s) => !visible.some((v) => v.num === s.num));
      renderChaptersChecklist(chapterSearchInput ? chapterSearchInput.value : '');
      updateChapterSummary();
    });
  }

  // Step 3: Calendar Date Picker & Scheduling (Min Date = Tomorrow)
  const testDatePicker = document.getElementById('test-date-picker');
  const tomorrowIso = getTomorrowIso();

  // Populate preset labels with formatted dates
  const presetTomorrow = document.getElementById('preset-tomorrow');
  const preset3Days = document.getElementById('preset-3days');
  const preset7Days = document.getElementById('preset-7days');
  const datePills = document.querySelectorAll('.date-preset-pill');

  const presetTomorrowDate = document.getElementById('preset-tomorrow-date');
  const preset3DaysDate = document.getElementById('preset-3days-date');
  const preset7DaysDate = document.getElementById('preset-7days-date');

  if (presetTomorrowDate) presetTomorrowDate.textContent = formatDateHuman(getOffsetDateIso(1));
  if (preset3DaysDate) preset3DaysDate.textContent = formatDateHuman(getOffsetDateIso(3));
  if (preset7DaysDate) preset7DaysDate.textContent = formatDateHuman(getOffsetDateIso(7));

  if (testDatePicker) {
    testDatePicker.min = tomorrowIso;
    testDatePicker.value = tomorrowIso;

    testDatePicker.addEventListener('change', () => {
      if (!testDatePicker.value || testDatePicker.value < tomorrowIso) {
        testDatePicker.value = tomorrowIso;
        showToast('⚠️ Minimum test date is Tomorrow. Today and past dates are locked.');
      }
      updateCountdownPreview(testDatePicker.value);
      datePills.forEach((p) => p.classList.remove('active'));
    });
  }

  datePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      datePills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const offset = parseInt(pill.getAttribute('data-offset'), 10) || 1;
      const targetIso = getOffsetDateIso(offset);
      if (testDatePicker) {
        testDatePicker.value = targetIso;
        updateCountdownPreview(targetIso);
      }
    });
  });

  function updateCountdownPreview(dateStr) {
    const days = getDaysUntil(dateStr);
    const countdownDaysText = document.getElementById('countdown-days-text');
    if (countdownDaysText) {
      if (days === 1) {
        countdownDaysText.textContent = `Tomorrow (In 1 Day)`;
      } else {
        countdownDaysText.textContent = `In ${days} Days (${formatDateHuman(dateStr)})`;
      }
    }
  }

  // Format options
  const formatOptions = document.querySelectorAll('.format-option-card');
  formatOptions.forEach((card) => {
    card.addEventListener('click', () => {
      formatOptions.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        activeTestMode = radio.value;
      }
    });
  });

  // Lock Test Flight & Schedule Mission
  // State for modifying/altering scheduled test flight
  let isModifyMode = false;
  let modifyMissionTarget = null;

  function startModifyMission(mission) {
    if (!mission) return;
    isModifyMode = true;
    modifyMissionTarget = mission;

    // 1. Ensure academic class is active
    if (mission.class && mission.class !== selectedClass) {
      selectedClass = mission.class;
      syncInlineControls();
    }

    // 2. Select the subject
    const subjKey = mission.subjectId;
    activeSubjectKey = subjKey;

    const subjData = SYLLABUS_DATABASE[subjKey];
    if (!subjData) {
      showToast('⚠️ Could not find syllabus data for ' + subjKey);
      return;
    }

    // 3. Mark visual selection on subject cards
    if (subjectsGrid) {
      subjectsGrid.querySelectorAll('.planner-subject-card').forEach((c) => {
        if (c.getAttribute('data-subj') === subjKey) c.classList.add('selected');
        else c.classList.remove('selected');
      });
    }

    // 4. Pre-populate selectedChapters matching mission.chapters
    selectedChapters = [];
    if (mission.chapters && Array.isArray(mission.chapters)) {
      mission.chapters.forEach((mc) => {
        const fullCh = subjData.chapters.find((c) => c.num === mc.num);
        if (fullCh) selectedChapters.push(fullCh);
        else selectedChapters.push({ num: mc.num, title: mc.title, topics: '' });
      });
    }

    // 5. Open chapters panel and update title
    const chaptersSec = document.getElementById('section-chapters');
    const subjTitle = document.getElementById('selected-subject-title');
    if (subjTitle) {
      subjTitle.textContent = `${subjData.icon || '📚'} ${subjData.name} Chapters`;
    }
    if (chaptersSec) {
      chaptersSec.style.display = 'block';
    }

    // 6. Reset search & render checklist with the active selected chapters
    const searchInput = document.getElementById('chapter-search-input');
    if (searchInput) searchInput.value = '';
    renderChaptersChecklist('');
    updateChapterSummary();

    // 7. Configure calendar with saved mission date
    if (testDatePicker && mission.testDate) {
      testDatePicker.value = mission.testDate >= tomorrowIso ? mission.testDate : tomorrowIso;
      updateCountdownPreview(testDatePicker.value);
    }

    // 8. Show Modify Mission Alert Banner
    showModifyAlertBanner(mission);

    // 9. Update schedule button label
    if (btnScheduleTest) {
      btnScheduleTest.innerHTML = `<span>💾 Save &amp; Update Scheduled Chapters (${selectedChapters.length} Selected)</span>`;
    }

    // 10. Scroll smoothly into view
    if (chaptersSec) {
      chaptersSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showToast(`✏️ Modify Mode: You can check or uncheck chapters below for <strong>${subjData.name}</strong>.`);
  }

  function exitModifyMode() {
    isModifyMode = false;
    modifyMissionTarget = null;
    const alertBar = document.getElementById('modify-mission-alert-bar');
    if (alertBar) alertBar.remove();
    if (btnScheduleTest) {
      btnScheduleTest.innerHTML = `<span>🚀 Schedule Test Flight</span>`;
    }
  }

  function showModifyAlertBanner(mission) {
    let alertBar = document.getElementById('modify-mission-alert-bar');
    const chaptersSec = document.getElementById('section-chapters');
    if (!chaptersSec) return;

    if (!alertBar) {
      alertBar = document.createElement('div');
      alertBar.id = 'modify-mission-alert-bar';
      alertBar.className = 'modify-mission-alert-bar';
      const header = chaptersSec.querySelector('.chapters-panel-header');
      if (header) chaptersSec.insertBefore(alertBar, header);
      else chaptersSec.prepend(alertBar);
    }

    alertBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.3rem;">✏️</span>
        <div>
          <strong>Modifying Active Test Flight (${mission.subjectName}):</strong>
          <span style="display: block; font-size: 0.8rem; color: #78350f;">Click any checked chapter to unselect, or select additional chapters. Click Update below when done.</span>
        </div>
      </div>
      <button type="button" class="btn-cancel-modify" id="btn-cancel-modify">✕ Cancel</button>
    `;

    const btnCancel = document.getElementById('btn-cancel-modify');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        exitModifyMode();
        showToast('Modify mode cancelled.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  // ==========================================================================
  // MULTI-SCHEDULE & FLIGHT TO-DO ENGINE
  // ==========================================================================

  const SCHEDULES_LIST_KEY = 'preppilot_schedules_list_' + userSanitized;
  const ACTIVE_SCHEDULE_ID_KEY = 'preppilot_active_schedule_id_' + userSanitized;
  const LEGACY_MISSION_KEY = 'preppilot_flight_mission_' + userSanitized;
  const TODOS_PREFIX_KEY = 'preppilot_todos_' + userSanitized + '_';

  let activeTodoFilter = 'all';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getAllSchedules() {
    try {
      const raw = localStorage.getItem(SCHEDULES_LIST_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error reading schedules list:', e);
      return [];
    }
  }

  function saveAllSchedules(list) {
    try {
      localStorage.setItem(SCHEDULES_LIST_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving schedules list:', e);
    }
  }

  function getActiveScheduleId() {
    return localStorage.getItem(ACTIVE_SCHEDULE_ID_KEY);
  }

  function setActiveScheduleId(id) {
    if (id) {
      localStorage.setItem(ACTIVE_SCHEDULE_ID_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SCHEDULE_ID_KEY);
    }
  }

  function getActiveSchedule() {
    const list = getAllSchedules();
    if (!list || list.length === 0) return null;
    const activeId = getActiveScheduleId();
    let found = list.find((s) => s.id === activeId);
    if (!found) {
      found = list[0];
      setActiveScheduleId(found.id);
    }
    syncActiveScheduleToLegacy(found);
    return found;
  }

  function syncActiveScheduleToLegacy(mission) {
    try {
      if (mission) {
        localStorage.setItem(LEGACY_MISSION_KEY, JSON.stringify(mission));
      } else {
        localStorage.removeItem(LEGACY_MISSION_KEY);
      }
    } catch (e) {
      console.error('Error syncing legacy mission:', e);
    }
  }

  // Generate intelligent day-by-day flight preparation milestones
  // Generate intelligent day-by-day flight preparation milestones (CollectUI-inspired Kanban schema)
  function generateScheduleTodos(mission) {
    if (!mission || !mission.chapters || !mission.chapters.length) return [];
    const daysLeft = Math.max(1, getDaysUntil(mission.testDate));
    const todos = [];
    const chList = mission.chapters;

    chList.forEach((ch, idx) => {
      let dayNum = 1;
      if (daysLeft > 1) {
        dayNum = Math.min(daysLeft - 1, (idx % (daysLeft - 1)) + 1);
      }
      const dayLabel = daysLeft === 1 ? 'Day 1 Sprint' : `Day ${dayNum}`;

      // Milestone 1: Masterclass
      todos.push({
        id: `todo_${mission.id || 'm'}_ch${ch.num}_mc`,
        title: `Concept Masterclass: Ch ${ch.num}`,
        desc: `Watch video masterclass with animated concept breakdowns for ${ch.title}.`,
        text: `Watch Concept Masterclass: Ch ${ch.num} (${ch.title})`,
        category: 'masterclass',
        dayNum: dayNum,
        dayLabel: dayLabel,
        completed: false,
        lane: 'todo',
        progressPercent: 45,
        pillColor: 'indigo',
        isCustom: false,
        createdAt: Date.now() + idx * 3,
      });

      // Milestone 2: High-Yield Notes & Formulae
      todos.push({
        id: `todo_${mission.id || 'm'}_ch${ch.num}_notes`,
        title: `Notes & Formula Sheet: Ch ${ch.num}`,
        desc: `Revise high-yield formula cheatsheet & textbook key derivations.`,
        text: `Revise High-Yield Notes & Formula Sheet for Ch ${ch.num}`,
        category: 'notes',
        dayNum: dayNum,
        dayLabel: dayLabel,
        completed: false,
        lane: 'todo',
        progressPercent: 30,
        pillColor: 'amber',
        isCustom: false,
        createdAt: Date.now() + idx * 3 + 1,
      });

      // Milestone 3: DPP Practice Drills
      todos.push({
        id: `todo_${mission.id || 'm'}_ch${ch.num}_dpp`,
        title: `15 DPP Practice Questions: Ch ${ch.num}`,
        desc: `Solve 15 exam-standard practice drill problems under timed cockpit condition.`,
        text: `Solve 15 Daily Practice Problems (DPP) on Ch ${ch.num}`,
        category: 'dpp',
        dayNum: dayNum,
        dayLabel: dayLabel,
        completed: false,
        lane: 'todo',
        progressPercent: 65,
        pillColor: 'pink',
        isCustom: false,
        createdAt: Date.now() + idx * 3 + 2,
      });
    });

    // Final Day / Exam Eve Milestones
    const finalDayNum = daysLeft;
    const finalLabel = daysLeft === 1 ? 'Exam Sprint' : 'Exam Eve';

    todos.push({
      id: `todo_${mission.id || 'm'}_final_cbt`,
      title: `Full-Length 45-Min CBT Mock`,
      desc: `Simulate actual computer-based test on all ${chList.length} selected chapters with percentile score.`,
      text: `Take 45-Min CBT Practice Mock Test on Selected ${chList.length} Chapters`,
      category: 'cbt',
      dayNum: finalDayNum,
      dayLabel: finalLabel,
      completed: false,
      lane: 'todo',
      progressPercent: 20,
      pillColor: 'pink',
      isCustom: false,
      createdAt: Date.now() + 1000,
    });

    todos.push({
      id: `todo_${mission.id || 'm'}_final_review`,
      title: `Exam Flight Formula Sprint`,
      desc: `Final rapid review of mistake log & high-frequency exam formulas before test day.`,
      text: `Final Rapid Formula & Error Log Review before Exam Flight`,
      category: 'notes',
      dayNum: finalDayNum,
      dayLabel: finalLabel,
      completed: false,
      lane: 'todo',
      progressPercent: 85,
      pillColor: 'emerald',
      isCustom: false,
      createdAt: Date.now() + 1001,
    });

    return todos;
  }

  function getScheduleTodos(scheduleId) {
    if (!scheduleId) return [];
    try {
      const raw = localStorage.getItem(TODOS_PREFIX_KEY + scheduleId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading todos:', e);
    }

    // If not found, look up schedule and auto-generate
    const schedules = getAllSchedules();
    const sched = schedules.find((s) => s.id === scheduleId);
    if (sched) {
      const generated = generateScheduleTodos(sched);
      saveScheduleTodos(scheduleId, generated);
      return generated;
    }
    return [];
  }

  function saveScheduleTodos(scheduleId, todos) {
    if (!scheduleId) return;
    try {
      localStorage.setItem(TODOS_PREFIX_KEY + scheduleId, JSON.stringify(todos));
    } catch (e) {
      console.error('Error saving todos:', e);
    }
  }

  function toggleTodoItem(scheduleId, taskId) {
    const todos = getScheduleTodos(scheduleId);
    const task = todos.find((t) => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;

    if (task.completed) {
      currentXP += 15;
      if (xpValEl) xpValEl.textContent = `${currentXP.toLocaleString()} XP`;
      if (window.PrepPilotAccount) {
        window.PrepPilotAccount.updateProgress(userSanitized, { xp: currentXP });
      }
      showToast(`⭐ <strong>+15 XP Earned!</strong> Completed: <em>${task.text.substring(0, 42)}...</em>`);
    }

    saveScheduleTodos(scheduleId, todos);
    renderFlightTodoList();
    renderScheduleSwitcher();
    renderSchedulesHub();
  }

  function addCustomTodo(scheduleId, text) {
    if (!text || !text.trim()) return;
    const todos = getScheduleTodos(scheduleId);
    const customTask = {
      id: `todo_cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      category: 'custom',
      dayNum: 1,
      dayLabel: 'Custom Goal',
      completed: false,
      isCustom: true,
      createdAt: Date.now(),
    };
    todos.push(customTask);
    saveScheduleTodos(scheduleId, todos);
    showToast(`✅ Added custom task: <strong>${customTask.text}</strong>`);
    renderFlightTodoList();
    renderScheduleSwitcher();
    renderSchedulesHub();
  }

  function deleteTodoItem(scheduleId, taskId) {
    let todos = getScheduleTodos(scheduleId);
    todos = todos.filter((t) => t.id !== taskId);
    saveScheduleTodos(scheduleId, todos);
    showToast('🗑️ Milestone removed from checklist.');
    renderFlightTodoList();
    renderScheduleSwitcher();
    renderSchedulesHub();
  }

  function switchActiveSchedule(scheduleId) {
    const schedules = getAllSchedules();
    const sched = schedules.find((s) => s.id === scheduleId);
    if (!sched) return;

    setActiveScheduleId(sched.id);
    syncActiveScheduleToLegacy(sched);

    // Close flyout if open
    const flyout = document.getElementById('schedules-flyout-dropdown');
    const selectBtn = document.getElementById('btn-active-schedule-dropdown');
    if (flyout) flyout.classList.remove('active');
    if (selectBtn) selectBtn.classList.remove('active');

    // Update active class if needed
    if (sched.class && sched.class !== selectedClass) {
      selectedClass = sched.class;
      syncClassSyllabus(selectedClass);
      syncInlineControls();
    }

    renderActiveMissionCard(sched);
    renderScheduleSwitcher();
    renderSchedulesHub();
    renderFlightTodoList();

    showToast(`✈️ Switched active flight to <strong>${sched.subjectName} (Class ${sched.class})</strong>!`);
  }

  function deleteSchedule(scheduleId) {
    const schedules = getAllSchedules();
    const sched = schedules.find((s) => s.id === scheduleId);
    const schedName = sched ? `${sched.subjectName} (Class ${sched.class})` : 'this schedule';

    if (!confirm(`Are you sure you want to delete ${schedName}?`)) {
      return;
    }

    const updated = schedules.filter((s) => s.id !== scheduleId);
    saveAllSchedules(updated);
    try {
      localStorage.removeItem(TODOS_PREFIX_KEY + scheduleId);
    } catch (e) {}

    const activeId = getActiveScheduleId();
    if (activeId === scheduleId) {
      if (updated.length > 0) {
        setActiveScheduleId(updated[0].id);
        syncActiveScheduleToLegacy(updated[0]);
        renderActiveMissionCard(updated[0]);
      } else {
        setActiveScheduleId(null);
        syncActiveScheduleToLegacy(null);
        const wrap = document.getElementById('active-test-mission-wrap');
        if (wrap) wrap.style.display = 'none';
      }
    }

    renderScheduleSwitcher();
    renderSchedulesHub();
    renderFlightTodoList();

    showToast(`🗑️ Deleted schedule: <strong>${schedName}</strong>`);
  }

  function startNewScheduleCreation() {
    if (isModifyMode) {
      exitModifyMode();
    }
    selectedChapters = [];
    activeSubjectKey = null;

    // Reset date picker
    if (testDatePicker) {
      testDatePicker.value = tomorrowIso;
      updateCountdownPreview(tomorrowIso);
    }

    // Hide calendar section
    const calendarSec = document.getElementById('section-calendar');
    if (calendarSec) calendarSec.style.display = 'none';

    // Deselect subject cards
    if (subjectsGrid) {
      subjectsGrid.querySelectorAll('.planner-subject-card').forEach((c) => {
        c.classList.remove('selected');
      });
    }

    // Hide chapters panel
    const chaptersSec = document.getElementById('section-chapters');
    if (chaptersSec) chaptersSec.style.display = 'none';

    // Reset schedule button
    if (btnScheduleTest) {
      btnScheduleTest.innerHTML = `<span>🚀 Schedule Test Flight</span>`;
    }

    // Scroll smoothly to Step 1
    const s1 = document.getElementById('section-class-select');
    if (s1) s1.scrollIntoView({ behavior: 'smooth', block: 'start' });

    showToast('✨ Ready to configure a new test schedule! Select your academic class &amp; subject.');
  }

  // Render Top Quick Schedule Switcher Bar
  function renderScheduleSwitcher() {
    const switcherSec = document.getElementById('section-schedule-switcher');
    const titleEl = document.getElementById('active-sched-title');
    const dateEl = document.getElementById('active-sched-date');
    const flyoutCountEl = document.getElementById('flyout-schedules-count');
    const btnCountEl = document.getElementById('btn-schedules-count');
    const flyoutListEl = document.getElementById('flyout-schedules-list');

    if (!switcherSec) return;

    const schedules = getAllSchedules();
    const activeSched = getActiveSchedule();

    if (!schedules || schedules.length === 0 || !activeSched) {
      switcherSec.style.display = 'none';
      return;
    }

    switcherSec.style.display = 'block';

    if (titleEl) {
      titleEl.innerHTML = `${activeSched.icon || '✈️'} Class ${activeSched.class} • ${activeSched.subjectName}`;
    }
    if (dateEl) {
      const daysLeft = getDaysUntil(activeSched.testDate);
      const daysText = daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft}d`;
      dateEl.textContent = `🗓️ ${formatDateHuman(activeSched.testDate)} (${daysText})`;
    }
    if (flyoutCountEl) flyoutCountEl.textContent = `${schedules.length}`;
    if (btnCountEl) btnCountEl.textContent = `${schedules.length}`;

    if (flyoutListEl) {
      flyoutListEl.innerHTML = schedules
        .map((s) => {
          const isActive = s.id === activeSched.id;
          const dLeft = getDaysUntil(s.testDate);
          const chCount = (s.chapters || []).length;
          return `
            <div class="flyout-schedule-item ${isActive ? 'active' : ''}" data-switch-id="${s.id}">
              <div>
                <div class="flyout-item-title">${s.icon || '🎯'} Class ${s.class} — ${s.subjectName} ${isActive ? '<span style="color:#6366f1;font-size:0.72rem;font-weight:800;">(Active)</span>' : ''}</div>
                <div class="flyout-item-meta">🗓️ ${formatDateHuman(s.testDate)} • ${chCount} chapters • ${dLeft === 1 ? 'Tomorrow' : 'In ' + dLeft + ' days'}</div>
              </div>
              <span style="font-size:0.8rem; color:#6366f1; font-weight:700;">${isActive ? '✓' : '→'}</span>
            </div>
          `;
        })
        .join('');

      flyoutListEl.querySelectorAll('.flyout-schedule-item').forEach((item) => {
        item.addEventListener('click', () => {
          const sid = item.getAttribute('data-switch-id');
          if (sid) switchActiveSchedule(sid);
        });
      });
    }
  }

  // Render Flight To-Do Checklist Panel
  function renderFlightTodoList() {
    const todoSec = document.getElementById('section-flight-todo');
    const headingEl = document.getElementById('todo-schedule-heading');
    const subtextEl = document.getElementById('todo-schedule-subtext');
    const percentEl = document.getElementById('todo-progress-percent');
    const barEl = document.getElementById('todo-progress-bar');
    const metaTextEl = document.getElementById('todo-progress-text');
    const listEl = document.getElementById('todo-items-list');

    const countAllEl = document.getElementById('todo-count-all');
    const countTodayEl = document.getElementById('todo-count-today');
    const countPendingEl = document.getElementById('todo-count-pending');
    const countCompletedEl = document.getElementById('todo-count-completed');

    if (!todoSec) return;

    const activeSched = getActiveSchedule();
    if (!activeSched) {
      todoSec.style.display = 'none';
      return;
    }

    todoSec.style.display = 'block';

    if (headingEl) {
      headingEl.innerHTML = `${activeSched.icon || '✈️'} ${activeSched.subjectName} — Flight Milestones`;
    }
    if (subtextEl) {
      subtextEl.innerHTML = `Targeting <strong>${activeSched.chapters.length} chapters</strong> for test flight on <strong>${formatDateHuman(activeSched.testDate)}</strong>. Complete tasks to earn XP!`;
    }

    const todos = getScheduleTodos(activeSched.id);
    const allCount = todos.length;
    const completedCount = todos.filter((t) => t.completed).length;
    const pendingCount = todos.filter((t) => !t.completed).length;
    const todayCount = todos.filter((t) => t.dayNum === 1 || !t.completed).length;
    const percent = allCount > 0 ? Math.round((completedCount / allCount) * 100) : 0;

    if (percentEl) percentEl.textContent = `${percent}%`;
    if (barEl) barEl.style.width = `${percent}%`;
    if (metaTextEl) {
      metaTextEl.innerHTML = `<strong>${completedCount} of ${allCount} milestones completed (${percent}%)</strong>`;
    }

    if (countAllEl) countAllEl.textContent = `${allCount}`;
    if (countTodayEl) countTodayEl.textContent = `${todayCount}`;
    if (countPendingEl) countPendingEl.textContent = `${pendingCount}`;
    if (countCompletedEl) countCompletedEl.textContent = `${completedCount}`;

    // Filter items according to activeTodoFilter
    let filtered = todos;
    if (activeTodoFilter === 'today') {
      filtered = todos.filter((t) => t.dayNum === 1 || (!t.completed && t.dayNum <= 2));
    } else if (activeTodoFilter === 'pending') {
      filtered = todos.filter((t) => !t.completed);
    } else if (activeTodoFilter === 'completed') {
      filtered = todos.filter((t) => t.completed);
    }

    if (listEl) {
      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div class="todo-empty-state">
            <span>🎉 No tasks found under "${activeTodoFilter}" filter.</span>
          </div>
        `;
      } else {
        const catBadges = {
          masterclass: { icon: '📺', name: 'Masterclass' },
          notes: { icon: '📝', name: 'Notes & Formulae' },
          dpp: { icon: '⚡', name: 'DPP Practice' },
          cbt: { icon: '🧪', name: 'CBT Mock' },
          custom: { icon: '📌', name: 'Custom Goal' },
        };

        listEl.innerHTML = filtered
          .map((item) => {
            const cat = catBadges[item.category] || { icon: '🎯', name: 'Milestone' };
            return `
              <div class="todo-item ${item.completed ? 'completed' : ''}" data-task-id="${item.id}">
                <div class="todo-item-left">
                  <div class="todo-checkbox" data-check-id="${item.id}" title="Click to mark complete">
                    ${item.completed ? '✓' : ''}
                  </div>
                  <div class="todo-item-content">
                    <span class="todo-item-text">${item.text}</span>
                    <div class="todo-item-meta">
                      <span class="todo-day-tag">${item.dayLabel || 'Day 1'}</span>
                      <span class="todo-cat-tag">${cat.icon} ${cat.name}</span>
                    </div>
                  </div>
                </div>
                ${item.isCustom ? `
                  <button type="button" class="btn-delete-custom-todo" data-delete-id="${item.id}" title="Delete this task">✕</button>
                ` : ''}
              </div>
            `;
          })
          .join('');

        // Attach events
        listEl.querySelectorAll('.todo-checkbox').forEach((chk) => {
          chk.addEventListener('click', (e) => {
            e.stopPropagation();
            const tid = chk.getAttribute('data-check-id');
            if (tid) toggleTodoItem(activeSched.id, tid);
          });
        });

        listEl.querySelectorAll('.todo-item').forEach((item) => {
          item.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete-custom-todo')) return;
            const tid = item.getAttribute('data-task-id');
            if (tid) toggleTodoItem(activeSched.id, tid);
          });
        });

        listEl.querySelectorAll('.btn-delete-custom-todo').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tid = btn.getAttribute('data-delete-id');
            if (tid) deleteTodoItem(activeSched.id, tid);
          });
        });
      }
    }
  }

  // Render Organized Schedules Hub Card Grid
  function renderSchedulesHub() {
    const hubSec = document.getElementById('section-schedules-hub');
    const gridEl = document.getElementById('schedules-cards-grid');

    if (!hubSec) return;

    const schedules = getAllSchedules();
    const activeSched = getActiveSchedule();

    if (!schedules || schedules.length === 0) {
      hubSec.style.display = 'none';
      return;
    }

    hubSec.style.display = 'block';

    if (gridEl) {
      gridEl.innerHTML = schedules
        .map((sched) => {
          const isActive = activeSched && activeSched.id === sched.id;
          const daysLeft = getDaysUntil(sched.testDate);
          const chList = sched.chapters || [];
          const chPreview = chList.slice(0, 3).map((c) => `Ch ${c.num}`).join(', ') + (chList.length > 3 ? ` +${chList.length - 3} more` : '');
          const todos = getScheduleTodos(sched.id);
          const doneTodos = todos.filter((t) => t.completed).length;
          const percent = todos.length > 0 ? Math.round((doneTodos / todos.length) * 100) : 0;

          const downloadKitUrl = `download-kit.html?subject=${encodeURIComponent(sched.subjectId)}&date=${encodeURIComponent(sched.testDate)}&class=${encodeURIComponent(sched.class || selectedClass)}&user=${encodeURIComponent(userSanitized)}`;
          const pilotPlannerUrl = `pilot-planner.html?subject=${encodeURIComponent(sched.subjectId)}&date=${encodeURIComponent(sched.testDate)}&class=${encodeURIComponent(sched.class || selectedClass)}&user=${encodeURIComponent(userSanitized)}`;

          return `
            <div class="schedule-card ${isActive ? 'active-flight' : ''}" data-schedule-id="${sched.id}">
              <div class="schedule-card-top">
                <div class="schedule-card-subject-wrap">
                  <div class="schedule-card-icon">${sched.icon || '🎯'}</div>
                  <div>
                    <div class="schedule-card-title">${sched.subjectName}</div>
                    <div class="schedule-card-class-badge">Class ${sched.class || '10th'}</div>
                  </div>
                </div>
                <div class="schedule-status-pill ${isActive ? 'active' : 'scheduled'}">
                  ${isActive ? 'Active Flight' : 'Scheduled'}
                </div>
              </div>

              <div class="schedule-card-info">
                <div class="schedule-card-date-row">
                  <span>🗓️ ${formatDateHuman(sched.testDate)}</span>
                  <span class="schedule-card-countdown">${daysLeft === 1 ? 'Tomorrow!' : 'In ' + daysLeft + ' Days'}</span>
                </div>
                <div class="schedule-card-chapters-preview">
                  📚 ${chList.length} Chapters: <strong>${chPreview}</strong>
                </div>

                <!-- Progress Bar in Card -->
                <div style="margin-top: 6px;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748b; font-weight: 700; margin-bottom: 3px;">
                    <span>Flight Milestones</span>
                    <span>${doneTodos}/${todos.length} (${percent}%)</span>
                  </div>
                  <div style="height: 5px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                    <div style="height: 100%; width: ${percent}%; background: linear-gradient(90deg, #6366f1, #10b981); border-radius: 999px;"></div>
                  </div>
                </div>
              </div>

              <div class="schedule-card-actions">
                ${!isActive ? `
                  <button type="button" class="btn-schedule-card-action btn-card-switch-active" data-action="switch" data-id="${sched.id}" title="Make this your active test flight">
                    ⚡ Switch
                  </button>
                ` : `
                  <span style="font-size: 0.75rem; font-weight: 800; color: #6366f1; display: inline-flex; align-items: center; gap: 4px; padding: 7px 10px;">
                    ✓ Active
                  </span>
                `}
                <button type="button" class="btn-schedule-card-action btn-card-todo" data-action="todo" data-id="${sched.id}" title="View Flight To-Dos for this schedule">
                  📋 To-Dos
                </button>
                <a href="${pilotPlannerUrl}" class="btn-schedule-card-action btn-card-planner" title="Open Daily Roadmap">
                  🗓️ Planner
                </a>
                <button type="button" class="btn-schedule-card-action btn-card-delete" data-action="delete" data-id="${sched.id}" title="Delete Schedule">
                  🗑️
                </button>
              </div>
            </div>
          `;
        })
        .join('');

      // Wire action buttons inside hub
      gridEl.querySelectorAll('button[data-action="switch"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const sid = btn.getAttribute('data-id');
          if (sid) switchActiveSchedule(sid);
        });
      });

      gridEl.querySelectorAll('button[data-action="todo"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const sid = btn.getAttribute('data-id');
          if (sid) {
            switchActiveSchedule(sid);
            const todoSec = document.getElementById('section-flight-todo');
            if (todoSec) todoSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });

      gridEl.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const sid = btn.getAttribute('data-id');
          if (sid) deleteSchedule(sid);
        });
      });
    }
  }

  // Render Active Scheduled Mission Banner Card (Enhanced with To-Dos & Hub Jumpers)
  function renderActiveMissionCard(mission) {
    const wrap = document.getElementById('active-test-mission-wrap');
    if (!wrap || !mission) return;

    const daysLeft = getDaysUntil(mission.testDate);
    const modeLabels = {
      'cbt-full': 'CBT Full Mock Practice',
      'speed-drill': 'Speed Flight Sprint',
      'concept-mastery': 'Deep Concept Diagnostic',
    };

    const downloadKitUrl = `download-kit.html?subject=${encodeURIComponent(mission.subjectId)}&date=${encodeURIComponent(mission.testDate)}&class=${encodeURIComponent(selectedClass)}&user=${encodeURIComponent(userSanitized)}`;
    const pilotPlannerUrl = `pilot-planner.html?subject=${encodeURIComponent(mission.subjectId)}&date=${encodeURIComponent(mission.testDate)}&class=${encodeURIComponent(selectedClass)}&user=${encodeURIComponent(userSanitized)}`;
    const schedules = getAllSchedules();

    wrap.style.display = 'block';
    wrap.innerHTML = `
      <div class="active-mission-card">
        <div class="active-mission-head">
          <div class="active-mission-badge">
            <span>✈️ Active Scheduled Test Flight</span>
          </div>
          <div style="font-size: 0.82rem; font-weight: 700; color: #38bdf8;">
            🗓️ Test Date: ${formatDateHuman(mission.testDate)} (${daysLeft === 1 ? 'Tomorrow!' : 'In ' + daysLeft + ' Days'})
          </div>
        </div>

        <div class="active-mission-body">
          <div class="active-mission-info">
            <h3>${mission.icon || '🎯'} ${mission.subjectName} — ${modeLabels[mission.testMode] || 'CBT Practice'}</h3>
            <p>Targeting ${mission.chapters.length} chosen chapters for this test flight. (Click ✕ to unselect any chapter)</p>
            <div class="active-chapters-tags">
              ${mission.chapters.map((c) => `
                <span class="active-chapter-tag" data-ch-num="${c.num}">
                  <span>✓ Ch ${c.num}: ${c.title}</span>
                  <button type="button" class="btn-remove-ch-tag" data-remove-num="${c.num}" title="Unselect / Remove Chapter ${c.num}">✕</button>
                </span>
              `).join('')}
            </div>
          </div>

          <div class="active-mission-actions">
            <button type="button" class="btn-open-active-todos" id="btn-active-open-todos" title="Jump to Interactive Flight To-Do Checklist">
              <span>📋 Open Flight To-Do Checklist</span>
            </button>
            <a href="${pilotPlannerUrl}" class="btn-open-pilot-planner" id="btn-open-pilot-planner" title="Open daily preparation roadmap till day before exam">
              <span>🗓️ Daily Pilot Planner</span>
            </a>
            <a href="${downloadKitUrl}" target="_blank" class="btn-download-scheduled-kit" id="btn-open-download-kit" title="Open download center for question papers and revision notes">
              <span>📥 Download Mission Study Kit</span>
            </a>
            <button type="button" class="btn-launch-scheduled-test" id="btn-active-launch-cbt">
              <span>🚀 Launch Practice Test Now</span>
            </button>
            <button type="button" class="btn-open-active-hub" id="btn-active-open-hub" title="View all saved schedules repository">
              <span>📁 All Test Schedules (${schedules.length})</span>
            </button>
            <button type="button" class="btn-edit-scheduled-plan" id="btn-reopen-planner">
              <span>⚙️ Modify Chapters / Change Date</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind ✕ quick-remove buttons on chapter chips
    wrap.querySelectorAll('.btn-remove-ch-tag').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chNum = btn.getAttribute('data-remove-num');
        if (mission.chapters.length <= 1) {
          showToast('⚠️ A test flight must have at least 1 chapter. Click "Modify Chapters" to choose different chapters.');
          return;
        }

        const idx = mission.chapters.findIndex((c) => c.num === chNum);
        if (idx >= 0) {
          const removed = mission.chapters.splice(idx, 1)[0];
          
          // Update in schedules list
          const schedules = getAllSchedules();
          const target = schedules.find((s) => s.id === mission.id);
          if (target) {
            target.chapters = mission.chapters;
            saveAllSchedules(schedules);
          }
          syncActiveScheduleToLegacy(mission);

          // If currently viewing checklist for this subject, uncheck it too
          if (activeSubjectKey === mission.subjectId) {
            const chIdx = selectedChapters.findIndex((c) => c.num === chNum);
            if (chIdx >= 0) selectedChapters.splice(chIdx, 1);
            renderChaptersChecklist('');
            updateChapterSummary();
          }

          renderActiveMissionCard(mission);
          renderScheduleSwitcher();
          renderSchedulesHub();
          renderFlightTodoList();
          showToast(`🗑️ Unselected Chapter ${chNum} (${removed.title}). ${mission.chapters.length} chapters remaining.`);
        }
      });
    });

    const btnLaunch = document.getElementById('btn-active-launch-cbt');
    if (btnLaunch) {
      btnLaunch.addEventListener('click', openCBTModal);
    }

    const btnOpenTodos = document.getElementById('btn-active-open-todos');
    if (btnOpenTodos) {
      btnOpenTodos.addEventListener('click', () => {
        const todoSec = document.getElementById('section-flight-todo');
        if (todoSec) todoSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    const btnOpenHub = document.getElementById('btn-active-open-hub');
    if (btnOpenHub) {
      btnOpenHub.addEventListener('click', () => {
        const hubSec = document.getElementById('section-schedules-hub');
        if (hubSec) hubSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    const btnReopen = document.getElementById('btn-reopen-planner');
    if (btnReopen) {
      btnReopen.addEventListener('click', () => {
        const s1 = document.getElementById('section-step-1');
        if (s1) s1.scrollIntoView({ behavior: 'smooth' });
        startModifyMission(mission);
      });
    }
  }

  // Lock Test Flight & Schedule Mission (Multi-Schedule Aware)
  const btnScheduleTest = document.getElementById('btn-schedule-test');
  if (btnScheduleTest) {
    btnScheduleTest.addEventListener('click', () => {
      if (!activeSubjectKey) {
        showToast('⚠️ Please select a subject first (Step 1)!');
        const s1 = document.getElementById('section-step-1');
        if (s1) s1.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (selectedChapters.length === 0) {
        showToast('⚠️ Please tick at least 1 chapter to cover (Step 2)!');
        const s2 = document.getElementById('section-step-2');
        if (s2) s2.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (!testDatePicker || !testDatePicker.value || testDatePicker.value < tomorrowIso) {
        showToast('⚠️ Minimum test date is Tomorrow. Please choose a valid date on the calendar.');
        return;
      }

      const subjData = SYLLABUS_DATABASE[activeSubjectKey] || { name: activeSubjectKey, icon: '🎯' };

      // Case A: Saving changes in Modify Mode
      if (isModifyMode && modifyMissionTarget) {
        const updatedMission = {
          ...modifyMissionTarget,
          subjectId: activeSubjectKey,
          subjectName: subjData.name,
          icon: subjData.icon,
          class: selectedClass,
          chapters: selectedChapters.map((c) => ({ num: c.num, title: c.title })),
          testDate: testDatePicker.value,
          testMode: activeTestMode,
          updatedAt: Date.now(),
        };

        const schedules = getAllSchedules();
        const sIdx = schedules.findIndex((s) => s.id === updatedMission.id);
        if (sIdx >= 0) {
          schedules[sIdx] = updatedMission;
        } else {
          schedules.push(updatedMission);
        }
        saveAllSchedules(schedules);
        setActiveScheduleId(updatedMission.id);
        syncActiveScheduleToLegacy(updatedMission);

        exitModifyMode();
        renderActiveMissionCard(updatedMission);
        renderScheduleSwitcher();
        renderSchedulesHub();
        renderFlightTodoList();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        showToast(`✅ Test flight updated! Targeting <strong>${selectedChapters.length} chapters</strong> for <strong>${formatDateHuman(updatedMission.testDate)}</strong>.`);
        return;
      }

      // Case B: Scheduling Brand New Test Flight
      const schedId = 'sched_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const scheduledMission = {
        id: schedId,
        subjectId: activeSubjectKey,
        subjectName: subjData.name,
        icon: subjData.icon,
        class: selectedClass,
        chapters: selectedChapters.map((c) => ({ num: c.num, title: c.title })),
        testDate: testDatePicker.value,
        testMode: activeTestMode,
        scheduledAt: Date.now(),
      };

      // Save to schedules list
      const schedules = getAllSchedules();
      schedules.unshift(scheduledMission);
      saveAllSchedules(schedules);
      setActiveScheduleId(schedId);
      syncActiveScheduleToLegacy(scheduledMission);

      // Auto-generate To-Do checklist for this schedule
      const generatedTodos = generateScheduleTodos(scheduledMission);
      saveScheduleTodos(schedId, generatedTodos);

      // Award +100 XP for setting up flight mission
      currentXP += 100;
      if (xpValEl) xpValEl.textContent = `${currentXP.toLocaleString()} XP`;
      if (window.PrepPilotAccount) {
        window.PrepPilotAccount.updateProgress(userSanitized, { xp: currentXP });
      }

      // Mark step 3 pill completed
      const pill3 = document.getElementById('step-pill-3');
      if (pill3) {
        pill3.classList.remove('active');
        pill3.classList.add('completed');
      }

      // Render Active Mission, Switcher, Hub, and To-Do list
      renderActiveMissionCard(scheduledMission);
      renderScheduleSwitcher();
      renderSchedulesHub();
      renderFlightTodoList();

      // Scroll smoothly to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Construct URLs for Pilot Planner and Download Kit
      const downloadKitUrl = `download-kit.html?subject=${encodeURIComponent(activeSubjectKey)}&date=${encodeURIComponent(testDatePicker.value)}&class=${encodeURIComponent(selectedClass)}&user=${encodeURIComponent(userSanitized)}`;
      const pilotPlannerUrl = `pilot-planner.html?subject=${encodeURIComponent(activeSubjectKey)}&date=${encodeURIComponent(testDatePicker.value)}&class=${encodeURIComponent(selectedClass)}&user=${encodeURIComponent(userSanitized)}`;

      // Show Post-Schedule Option Modal
      const scheduleModal = document.getElementById('schedule-success-modal');
      const modalPlannerLink = document.getElementById('modal-link-pilot-planner');
      const modalKitLink = document.getElementById('modal-link-download-kit');
      const modalTodoBtn = document.getElementById('modal-link-flight-todo');
      const btnCloseScheduleModal = document.getElementById('btn-close-schedule-modal');
      const scheduleModalBackdrop = document.getElementById('schedule-modal-backdrop');

      if (modalPlannerLink) modalPlannerLink.href = pilotPlannerUrl;
      if (modalKitLink) modalKitLink.href = downloadKitUrl;

      if (modalTodoBtn) {
        modalTodoBtn.onclick = () => {
          if (scheduleModal) scheduleModal.style.display = 'none';
          const todoSec = document.getElementById('section-flight-todo');
          if (todoSec) todoSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
      }

      if (scheduleModal) {
        scheduleModal.style.display = 'flex';
        const closeMod = () => { scheduleModal.style.display = 'none'; };
        if (btnCloseScheduleModal) btnCloseScheduleModal.onclick = closeMod;
        if (scheduleModalBackdrop) scheduleModalBackdrop.onclick = closeMod;
      }

      showToast(`🎯 Test flight locked for <strong>${subjData.name}</strong> on <strong>${formatDateHuman(scheduledMission.testDate)}</strong>! Flight To-Do Checklist ready.`);
    });
  }

  // Wire Switcher dropdown, buttons & To-Do controls
  function initScheduleControls() {
    // 1. Switcher dropdown toggle
    const selectBtn = document.getElementById('btn-active-schedule-dropdown');
    const flyout = document.getElementById('schedules-flyout-dropdown');
    if (selectBtn && flyout) {
      selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = flyout.classList.toggle('active');
        selectBtn.classList.toggle('active', isOpen);
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#section-schedule-switcher')) {
          flyout.classList.remove('active');
          selectBtn.classList.remove('active');
        }
      });
    }

    // 2. Switcher Top Actions
    const btnBarTodo = document.getElementById('btn-bar-jump-todo');
    if (btnBarTodo) {
      btnBarTodo.addEventListener('click', () => {
        const todoSec = document.getElementById('section-flight-todo');
        if (todoSec) todoSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    const btnBarHub = document.getElementById('btn-bar-view-hub');
    if (btnBarHub) {
      btnBarHub.addEventListener('click', () => {
        const hubSec = document.getElementById('section-schedules-hub');
        if (hubSec) hubSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    const btnStartNew = document.getElementById('btn-start-new-schedule');
    if (btnStartNew) {
      btnStartNew.addEventListener('click', startNewScheduleCreation);
    }

    const btnHubCreateNew = document.getElementById('btn-hub-create-new');
    if (btnHubCreateNew) {
      btnHubCreateNew.addEventListener('click', startNewScheduleCreation);
    }

    // 3. To-Do Filter Pills
    const filterPills = document.querySelectorAll('.todo-filter-btn');
    filterPills.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterPills.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeTodoFilter = btn.getAttribute('data-filter') || 'all';
        renderFlightTodoList();
      });
    });

    // 4. Custom Task Add Form
    const customTodoForm = document.getElementById('todo-add-task-form');
    const customTodoInput = document.getElementById('todo-custom-input');
    if (customTodoForm && customTodoInput) {
      customTodoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = customTodoInput.value.trim();
        if (!val) return;
        const activeSched = getActiveSchedule();
        if (activeSched) {
          addCustomTodo(activeSched.id, val);
          customTodoInput.value = '';
        } else {
          showToast('⚠️ Please schedule or select an active test flight first.');
        }
      });
    }
  }

  // Auto-migration & Initial Setup on Load
  function initSchedulesOnLoad() {
    initScheduleControls();

    try {
      let schedules = getAllSchedules();

      // Migrate single legacy mission if list is empty
      if (schedules.length === 0) {
        const savedMissionRaw = localStorage.getItem(LEGACY_MISSION_KEY);
        if (savedMissionRaw) {
          const savedMission = JSON.parse(savedMissionRaw);
          if (savedMission && savedMission.chapters && savedMission.chapters.length > 0) {
            if (!savedMission.id) {
              savedMission.id = 'sched_' + (savedMission.scheduledAt || Date.now()) + '_migrated';
            }
            schedules = [savedMission];
            saveAllSchedules(schedules);
            setActiveScheduleId(savedMission.id);
            // generate to-dos for migrated mission
            const todos = generateScheduleTodos(savedMission);
            saveScheduleTodos(savedMission.id, todos);
          }
        }
      }

      const activeSched = getActiveSchedule();
      if (activeSched && activeSched.chapters && activeSched.chapters.length > 0) {
        renderActiveMissionCard(activeSched);
        renderScheduleSwitcher();
        renderSchedulesHub();
        renderFlightTodoList();

        // Auto-launch modify mode if ?modify=true in URL
        if (urlParams.get('modify') === 'true') {
          setTimeout(() => {
            startModifyMission(activeSched);
          }, 350);
        }
      }
    } catch (err) {
      console.error('Failed to initialize flight schedules & to-dos:', err);
    }
  }

  // Run initialization
  initSchedulesOnLoad();

  // 4. In-Page Class & Stream Switcher Controller
  const classCardsGrid = document.getElementById('dash-class-cards-grid');
  const streamSelectionBox = document.getElementById('dash-stream-selection-box');
  const streamTitleText = document.getElementById('stream-selection-title-text');
  const streamCardsGrid = document.getElementById('dash-stream-cards-grid');
  const subjectsPanelTitle = document.getElementById('subjects-panel-title');
  const subjectsPanelSub = document.getElementById('subjects-panel-sub');
  const inlineClassPillsWrap = document.getElementById('dash-inline-class-pills');
  const inlineStreamGroup = document.getElementById('dash-inline-stream-group');
  const inlineStreamPillsWrap = document.getElementById('dash-inline-stream-pills');
  const activeStreamStatusText = document.getElementById('active-stream-status-text');

  function syncInlineControls() {
    const clsLower = (selectedClass || '10th').toLowerCase();
    const boardLower = (selectedBoard || '').toLowerCase();

    // 1. Sync Step 1 Class Cards Grid
    if (classCardsGrid) {
      classCardsGrid.querySelectorAll('.class-choice-card').forEach((card) => {
        if (card.getAttribute('data-class').toLowerCase() === clsLower) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
    }

    // Also sync legacy pills if present
    if (inlineClassPillsWrap) {
      inlineClassPillsWrap.querySelectorAll('.dash-class-pill').forEach((pill) => {
        if (pill.getAttribute('data-class').toLowerCase() === clsLower) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    }

    // 2. Sync Stream Group (visible for 11th, 12th, Dropper)
    const isSenior = clsLower.includes('11') || clsLower.includes('12');
    const isDropper = clsLower.includes('drop');

    if (streamSelectionBox && streamCardsGrid) {
      if (isSenior) {
        streamSelectionBox.style.display = 'block';
        if (streamTitleText) {
          streamTitleText.textContent = `Select Target Stream for Class ${selectedClass}:`;
        }

        const isNormal = !boardLower.includes('jee') && !boardLower.includes('iit') && !boardLower.includes('neet');
        const isJEE = boardLower.includes('jee') || boardLower.includes('iit');
        const isNEET = boardLower.includes('neet');

        streamCardsGrid.innerHTML = `
          <button type="button" class="stream-choice-card ${isNormal ? 'active' : ''}" data-stream="Normal 11th & 12th Board" onclick="window.preppilotSwitchClass &amp;&amp; window.preppilotSwitchClass('${selectedClass}', 'Normal 11th & 12th Board')" aria-label="Select Normal Board">
            <div class="stream-card-icon">🎓</div>
            <div class="stream-card-content">
              <div class="stream-card-name">Normal Board (CBSE / State)</div>
              <div class="stream-card-subjects">7 Subjects • Physics, Chemistry, Maths, Zoology, Anatomy, English, Physical Education</div>
            </div>
          </button>
          <button type="button" class="stream-choice-card ${isJEE ? 'active' : ''}" data-stream="IIT-JEE Main & Advanced" onclick="window.preppilotSwitchClass &amp;&amp; window.preppilotSwitchClass('${selectedClass}', 'IIT-JEE Main & Advanced')" aria-label="Select IIT-JEE">
            <div class="stream-card-icon">⚡</div>
            <div class="stream-card-content">
              <div class="stream-card-name">IIT-JEE (Main & Advanced)</div>
              <div class="stream-card-subjects">3 Subjects • Maths, Physics, Chemistry</div>
            </div>
          </button>
          <button type="button" class="stream-choice-card ${isNEET ? 'active' : ''}" data-stream="NEET-UG Medical 360" onclick="window.preppilotSwitchClass &amp;&amp; window.preppilotSwitchClass('${selectedClass}', 'NEET-UG Medical 360')" aria-label="Select NEET-UG Medical">
            <div class="stream-card-icon">🩺</div>
            <div class="stream-card-content">
              <div class="stream-card-name">NEET-UG Medical 360</div>
              <div class="stream-card-subjects">4 Subjects • Physics, Chemistry, Zoology, Anatomy</div>
            </div>
          </button>
        `;
      } else if (isDropper) {
        streamSelectionBox.style.display = 'block';
        if (streamTitleText) {
          streamTitleText.textContent = 'Select Dropper Target Goal:';
        }

        const isNEET = boardLower.includes('neet');

        streamCardsGrid.innerHTML = `
          <button type="button" class="stream-choice-card ${!isNEET ? 'active' : ''}" data-stream="IIT-JEE Dropper Sprint" onclick="window.preppilotSwitchClass &amp;&amp; window.preppilotSwitchClass('${selectedClass}', 'IIT-JEE Dropper Sprint')" aria-label="Select IIT-JEE Dropper Sprint">
            <div class="stream-card-icon">⚡</div>
            <div class="stream-card-content">
              <div class="stream-card-name">IIT-JEE Dropper Sprint</div>
              <div class="stream-card-subjects">3 Subjects • Maths, Physics, Chemistry</div>
            </div>
          </button>
          <button type="button" class="stream-choice-card ${isNEET ? 'active' : ''}" data-stream="NEET Dropper Sprint" onclick="window.preppilotSwitchClass &amp;&amp; window.preppilotSwitchClass('${selectedClass}', 'NEET Dropper Sprint')" aria-label="Select NEET Dropper Sprint">
            <div class="stream-card-icon">🩺</div>
            <div class="stream-card-content">
              <div class="stream-card-name">NEET Dropper Sprint</div>
              <div class="stream-card-subjects">4 Subjects • Physics, Chemistry, Zoology, Anatomy</div>
            </div>
          </button>
        `;
      } else {
        streamSelectionBox.style.display = 'none';
        streamCardsGrid.innerHTML = '';
      }
    }

    // Also update legacy inline stream pills if present
    if (inlineStreamGroup && inlineStreamPillsWrap) {
      if (isSenior) {
        inlineStreamGroup.style.display = 'flex';
        const isNormal = !boardLower.includes('jee') && !boardLower.includes('iit') && !boardLower.includes('neet');
        const isJEE = boardLower.includes('jee') || boardLower.includes('iit');
        const isNEET = boardLower.includes('neet');

        inlineStreamPillsWrap.innerHTML = `
          <button type="button" class="dash-stream-pill ${isNormal ? 'active' : ''}" data-stream="Normal 11th & 12th Board">
            🎓 Normal Board (7 Subjects)
          </button>
          <button type="button" class="dash-stream-pill ${isJEE ? 'active' : ''}" data-stream="IIT-JEE Main & Advanced">
            ⚡ IIT-JEE (3 Subjects)
          </button>
          <button type="button" class="dash-stream-pill ${isNEET ? 'active' : ''}" data-stream="NEET-UG Medical 360">
            🩺 NEET-UG (4 Subjects)
          </button>
        `;
      } else if (isDropper) {
        inlineStreamGroup.style.display = 'flex';
        const isNEET = boardLower.includes('neet');

        inlineStreamPillsWrap.innerHTML = `
          <button type="button" class="dash-stream-pill ${!isNEET ? 'active' : ''}" data-stream="IIT-JEE Dropper Sprint">
            ⚡ IIT-JEE (3 Subjects)
          </button>
          <button type="button" class="dash-stream-pill ${isNEET ? 'active' : ''}" data-stream="NEET Dropper Sprint">
            🩺 NEET (4 Subjects)
          </button>
        `;
      } else {
        inlineStreamGroup.style.display = 'none';
        inlineStreamPillsWrap.innerHTML = '';
      }
    }

    // 3. Update Step 2 Panel Titles & Status Banner Text
    const activeKeys = getActiveSubjectsList();
    const count = activeKeys.length;

    let streamLabel = '';
    if (isSenior) {
      if (boardLower.includes('jee') || boardLower.includes('iit')) {
        streamLabel = ' (IIT-JEE)';
      } else if (boardLower.includes('neet')) {
        streamLabel = ' (NEET-UG)';
      } else {
        streamLabel = ' (Normal Board)';
      }
    } else if (isDropper) {
      if (boardLower.includes('neet')) {
        streamLabel = ' (NEET)';
      } else {
        streamLabel = ' (IIT-JEE)';
      }
    }

    if (subjectsPanelTitle) {
      subjectsPanelTitle.textContent = `Subjects for Class ${selectedClass}${streamLabel}`;
    }
    if (subjectsPanelSub) {
      subjectsPanelSub.textContent = `Showing ${count} subjects for Class ${selectedClass}${streamLabel}. Click any subject to view and tick its chapters.`;
    }
    if (activeStreamStatusText) {
      activeStreamStatusText.textContent = `Class ${selectedClass}${streamLabel} Syllabus • ${count} Subjects (${activeKeys.map((k) => SYLLABUS_DATABASE[k] ? SYLLABUS_DATABASE[k].name : k).join(', ')})`;
    }
  }

  let lastSwitchTime = 0;
  function switchClassAndStream(newClass, newBoard, autoSelectSubject = true) {
    const now = Date.now();
    if (newClass === selectedClass && (!newBoard || newBoard === selectedBoard) && (now - lastSwitchTime < 80)) {
      return;
    }
    lastSwitchTime = now;
    if (newClass) selectedClass = newClass;

    const clsLower = selectedClass.toLowerCase();
    const isSenior = clsLower.includes('11') || clsLower.includes('12');
    const isDropper = clsLower.includes('drop');

    if (newBoard) {
      selectedBoard = newBoard;
    } else {
      // Pick sensible default for the new class
      if (isSenior) {
        const bLower = (selectedBoard || '').toLowerCase();
        if (bLower.includes('neet')) {
          selectedBoard = 'NEET-UG Medical 360';
        } else if (bLower.includes('jee') || bLower.includes('iit')) {
          selectedBoard = 'IIT-JEE Main & Advanced';
        } else {
          selectedBoard = 'Normal 11th & 12th Board';
        }
      } else if (isDropper) {
        const bLower = (selectedBoard || '').toLowerCase();
        if (bLower.includes('neet')) {
          selectedBoard = 'NEET Dropper Sprint';
        } else {
          selectedBoard = 'IIT-JEE Dropper Sprint';
        }
      } else {
        selectedBoard = 'CBSE Board Mastery';
      }
    }

    // Save persistent state
    localStorage.setItem('preppilot_active_class', selectedClass);
    localStorage.setItem('preppilot_active_course', selectedBoard);
    if (window.PrepPilotAccount) {
      window.PrepPilotAccount.updateCourseAndClass(userSanitized, selectedClass, selectedBoard);
    }

    // Synchronize syllabus database to the new class!
    syncClassSyllabus(selectedClass);

    // Determine available subjects list for this class & stream
    const availableKeys = getActiveSubjectsList();

    // Preserve active subject if it still exists in the new class/stream,
    // otherwise pick the first subject of the new class so chapters operate immediately!
    let nextSubject = null;
    if (activeSubjectKey && availableKeys.includes(activeSubjectKey)) {
      nextSubject = activeSubjectKey;
    } else if (autoSelectSubject && availableKeys.length > 0) {
      nextSubject = availableKeys[0];
    }

    // Re-render controls and subject cards
    syncInlineControls();
    renderPlannerSubjects();

    // Operate subject selection immediately so chapters and checkboxes are visible!
    if (nextSubject) {
      selectSubject(nextSubject, false);
    } else {
      activeSubjectKey = null;
      selectedChapters = [];
      const chaptersSec = document.getElementById('section-chapters');
      if (chaptersSec) chaptersSec.style.display = 'none';
      const calendarSec = document.getElementById('section-calendar');
      if (calendarSec) calendarSec.style.display = 'none';
    }

    // Update topbar labels
    if (activeTrackLabel) {
      activeTrackLabel.textContent = `Class ${selectedClass} (${selectedBoard.replace(' Mastery', '').replace(' Excellence', '')})`;
    }
    if (avatarCourseBadge) {
      avatarCourseBadge.textContent = `Class ${selectedClass} • ${selectedBoard}`;
    }
    if (flyoutCourse) {
      flyoutCourse.textContent = `Class ${selectedClass} • ${selectedBoard}`;
    }

    // Smoothly scroll down to Step 2 subjects panel so student sees the updated subjects
    const subjSec = document.getElementById('section-subjects');
    if (subjSec) {
      subjSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showToast(`🎯 Shifted to <strong>Class ${selectedClass} • ${selectedBoard.replace(' Mastery', '').replace(' Excellence', '')}</strong>!`);
  }

  // Expose global methods for direct access
  if (typeof window !== 'undefined') {
    window.preppilotSwitchClass = switchClassAndStream;
    window.preppilotSelectSubject = selectSubject;
  }

  // Universal delegated click listener on document to ensure class, stream & subject buttons ALWAYS operate
  document.addEventListener('click', (e) => {
    // 1. Class Choice Card
    const classBtn = e.target.closest('.class-choice-card');
    if (classBtn) {
      const targetClass = classBtn.getAttribute('data-class');
      if (targetClass) switchClassAndStream(targetClass, null);
      return;
    }

    // 2. Stream Choice Card
    const streamBtn = e.target.closest('.stream-choice-card');
    if (streamBtn) {
      const streamName = streamBtn.getAttribute('data-stream');
      if (streamName) switchClassAndStream(selectedClass, streamName);
      return;
    }

    // 3. Planner Subject Card
    const subjBtn = e.target.closest('.planner-subject-card');
    if (subjBtn) {
      const key = subjBtn.getAttribute('data-subj');
      if (key) selectSubject(key, true);
      return;
    }

    // 4. In-page legacy class & stream pills
    const dashClassPill = e.target.closest('.dash-class-pill');
    if (dashClassPill) {
      const targetClass = dashClassPill.getAttribute('data-class');
      if (targetClass) switchClassAndStream(targetClass, null);
      return;
    }

    const dashStreamPill = e.target.closest('.dash-stream-pill');
    if (dashStreamPill) {
      const streamName = dashStreamPill.getAttribute('data-stream');
      if (streamName) switchClassAndStream(selectedClass, streamName);
      return;
    }
  });

  // Keyboard accessibility: Enter and Space trigger button operation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.matches('.class-choice-card') ||
        activeEl.matches('.stream-choice-card') ||
        activeEl.matches('.planner-subject-card')
      )) {
        e.preventDefault();
        activeEl.click();
      }
    }
  });

  // Initialize planner subjects & inline controls
  syncClassSyllabus(selectedClass);
  syncInlineControls();
  renderPlannerSubjects();

  // Ensure an active subject is selected on load so subject buttons and chapters operate right away
  const initialSubjects = getActiveSubjectsList();
  if (initialSubjects.length > 0) {
    selectSubject(activeSubjectKey || initialSubjects[0], false);
  }

  // Listen for academic course/class changes from topbar
  window.addEventListener('preppilot:course-changed', (e) => {
    if (e.detail) {
      if (e.detail.selectedClass) selectedClass = e.detail.selectedClass;
      if (e.detail.selectedBoard) selectedBoard = e.detail.selectedBoard;
      syncClassSyllabus(selectedClass);
      syncInlineControls();
      renderPlannerSubjects();

      if (avatarCourseBadge) avatarCourseBadge.textContent = `Class ${selectedClass} • ${selectedBoard}`;
      if (flyoutCourse) flyoutCourse.textContent = `Class ${selectedClass} • ${selectedBoard}`;
      if (activeTrackLabel) activeTrackLabel.textContent = `Class ${selectedClass} (${selectedBoard})`;

      const availableKeys = getActiveSubjectsList();
      if (!activeSubjectKey || !availableKeys.includes(activeSubjectKey)) {
        if (availableKeys.length > 0) selectSubject(availableKeys[0], false);
      }
    }
  });

  // 5. Accessible Dark Liquid-Glass User Profile Menu (Matching Reference)
  const profileBtn = document.getElementById('student-profile-btn');
  const darkProfileMenu = document.getElementById('dark-profile-menu');
  const profileWrap = document.getElementById('profile-flyout-wrap');

  // Modals
  const profileDetailModal = document.getElementById('profile-detail-modal');
  const communityModal = document.getElementById('community-modal');
  const subscriptionModal = document.getElementById('subscription-modal');
  const settingsModal = document.getElementById('settings-modal');
  const dialogSavedList = document.getElementById('dialog-saved-list');
  const btnDialogAdd = document.getElementById('btn-dialog-add-account');

  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      const targetModal = document.getElementById(modalId);
      if (targetModal) targetModal.classList.remove('active');
    });
  });

  document.querySelectorAll('.pilot-dialog-backdrop').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  function openDialog(modalEl) {
    if (modalEl) modalEl.classList.add('active');
  }

  function renderSavedAccountsList() {
    if (!dialogSavedList || !window.PrepPilotAccount) return;

    const allAccs = window.PrepPilotAccount.getAllAccounts();
    dialogSavedList.innerHTML = allAccs
      .map((acc) => {
        const isActive = acc.id === userSanitized;
        const initial = (acc.name || 'S').trim().substring(0, 1).toUpperCase();
        return `
        <div class="account-saved-item ${isActive ? 'active' : ''}" data-id="${acc.id}" data-name="${acc.name}" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: ${isActive ? 'var(--accent-orbit)' : '#e2e8f0'}; color: ${isActive ? '#fff' : '#334155'}; font-size: 0.76rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">${initial}</div>
            <div>
              <div style="font-size: 0.84rem; font-weight: 700; color: #1e293b;">${acc.name} ${isActive ? '✓' : ''}</div>
              <div style="font-size: 0.7rem; color: #64748b;">Class ${acc.selectedClass || '10th'} • ${acc.xp || 4920} XP</div>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    const items = dialogSavedList.querySelectorAll('.account-saved-item');
    items.forEach((item) => {
      item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-id');
        const targetName = item.getAttribute('data-name');
        if (targetId === userSanitized) {
          if (profileDetailModal) profileDetailModal.classList.remove('active');
          return;
        }

        window.PrepPilotAccount.switchAccount(targetId);
        window.location.href = `dashboard.html?user=${encodeURIComponent(targetName)}`;
      });
    });
  }

  // Populate Profile Dialog labels
  function syncProfileDialog() {
    const dAvatar = document.getElementById('dialog-avatar');
    const dName = document.getElementById('dialog-name');
    const dCourse = document.getElementById('dialog-course');
    const dXp = document.getElementById('dialog-xp-val');

    if (dAvatar) dAvatar.textContent = initials;
    if (dName) dName.textContent = studentName;
    if (dCourse) dCourse.textContent = `Class ${selectedClass} • ${selectedBoard}`;
    if (dXp) dXp.textContent = `${currentXP.toLocaleString()} XP`;

    renderSavedAccountsList();
  }

  if (btnDialogAdd) {
    btnDialogAdd.addEventListener('click', () => {
      const newName = prompt('Enter new student name or roll number to add an account:', 'Priya Verma');
      if (newName && newName.trim()) {
        if (window.PrepPilotAccount) {
          const newAcc = window.PrepPilotAccount.createAccount(newName.trim(), newName.trim());
          newAcc.onboarded = true;
          window.PrepPilotAccount.saveAccount(newAcc);
          window.PrepPilotAccount.setCurrentUserId(newAcc.id);
        }
        window.location.href = `dashboard.html?user=${encodeURIComponent(newName.trim())}`;
      }
    });
  }

  // Profile Menu Open/Close & Accessibility Controller
  function isMenuOpen() {
    return Boolean(darkProfileMenu && darkProfileMenu.classList.contains('active'));
  }

  function openProfileMenu() {
    if (!darkProfileMenu || !profileBtn) return;
    darkProfileMenu.classList.add('active');
    profileBtn.setAttribute('aria-expanded', 'true');
    // Focus active or first item
    const firstItem = darkProfileMenu.querySelector('.dark-menu-item');
    if (firstItem) firstItem.focus();
  }

  function closeProfileMenu() {
    if (!darkProfileMenu || !profileBtn) return;
    darkProfileMenu.classList.remove('active');
    profileBtn.setAttribute('aria-expanded', 'false');
  }

  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isMenuOpen()) {
        closeProfileMenu();
      } else {
        openProfileMenu();
      }
    });

    profileBtn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openProfileMenu();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        openProfileMenu();
        const items = darkProfileMenu.querySelectorAll('.dark-menu-item');
        if (items.length > 0) items[items.length - 1].focus();
      }
    });
  }

  // Menu Items Click & Keyboard Actions
  const menuItems = darkProfileMenu ? Array.from(darkProfileMenu.querySelectorAll('.dark-menu-item')) : [];

  menuItems.forEach((item, index) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.getAttribute('data-action');
      closeProfileMenu();

      // Highlight active clicked item
      menuItems.forEach((m) => m.classList.remove('active'));
      item.classList.add('active');

      if (action === 'profile') {
        syncProfileDialog();
        openDialog(profileDetailModal);
      } else if (action === 'community') {
        openDialog(communityModal);
      } else if (action === 'subscription') {
        openDialog(subscriptionModal);
      } else if (action === 'settings') {
        openDialog(settingsModal);
      } else if (action === 'help') {
        const doubtSection = document.getElementById('ai-doubt-section');
        if (doubtSection) {
          doubtSection.scrollIntoView({ behavior: 'smooth' });
          const inp = document.getElementById('ai-query-input');
          if (inp) inp.focus();
        }
      } else if (action === 'signout') {
        openSignoutModal();
      }
    });

    // Keyboard navigation within menu
    item.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (index + 1) % menuItems.length;
        menuItems[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (index - 1 + menuItems.length) % menuItems.length;
        menuItems[prevIndex].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        menuItems[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        menuItems[menuItems.length - 1].focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeProfileMenu();
        if (profileBtn) profileBtn.focus();
      } else if (e.key === 'Tab') {
        closeProfileMenu();
      }
    });
  });

  // Global click outside to dismiss profile menu
  document.addEventListener('click', (e) => {
    if (darkProfileMenu && !darkProfileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
      closeProfileMenu();
    }
  });

  // Toast Notification Helper
  function showToast(html) {
    const toast = document.getElementById('cockpit-toast');
    if (!toast) return;
    toast.innerHTML = html;
    toast.classList.add('active');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      toast.classList.remove('active');
    }, 3200);
  }

  // 3.5. Sign Out Confirmation Modal Handlers
  const btnSignout = document.getElementById('btn-cockpit-signout');
  const signoutModal = document.getElementById('signout-modal');
  const btnCancelSignout = document.getElementById('btn-signout-cancel');
  const btnConfirmSignout = document.getElementById('btn-signout-confirm');

  function openSignoutModal() {
    if (signoutModal) signoutModal.classList.add('active');
  }

  function closeSignoutModal() {
    if (signoutModal) signoutModal.classList.remove('active');
  }

  if (btnSignout) btnSignout.addEventListener('click', openSignoutModal);
  if (btnCancelSignout) btnCancelSignout.addEventListener('click', closeSignoutModal);

  if (btnConfirmSignout) {
    btnConfirmSignout.addEventListener('click', () => {
      // Return to cockpit gateway on main page
      window.location.href = 'index.html#auth-cockpit';
    });
  }

  // Dismiss signout modal on clicking backdrop
  if (signoutModal) {
    signoutModal.addEventListener('click', (e) => {
      if (e.target === signoutModal) closeSignoutModal();
    });
  }

  // Dismiss on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSignoutModal();
    }
  });

  // 4. CBT Mock Test Simulator Modal
  const cbtModal = document.getElementById('cbt-modal');
  const btnOpenCBT = document.getElementById('btn-open-cbt-modal');
  const btnQuickLaunch = document.getElementById('btn-quick-launch-test');
  const cbtClose = document.getElementById('cbt-modal-close');
  const cbtOptions = document.querySelectorAll('.cbt-option-item');
  const cbtCheckBtn = document.getElementById('btn-cbt-check');
  const cbtFeedback = document.getElementById('cbt-feedback-box');

  function openCBTModal() {
    if (cbtModal) cbtModal.classList.add('active');
  }

  function closeCBTModal() {
    if (cbtModal) cbtModal.classList.remove('active');
  }

  if (btnOpenCBT) btnOpenCBT.addEventListener('click', openCBTModal);
  if (btnQuickLaunch) btnQuickLaunch.addEventListener('click', openCBTModal);
  if (cbtClose) cbtClose.addEventListener('click', closeCBTModal);

  window.addEventListener('click', (e) => {
    if (e.target === cbtModal) closeCBTModal();
  });

  let selectedOption = null;
  cbtOptions.forEach((opt) => {
    opt.addEventListener('click', () => {
      cbtOptions.forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedOption = opt.getAttribute('data-opt');
    });
  });

  if (cbtCheckBtn) {
    cbtCheckBtn.addEventListener('click', () => {
      if (!selectedOption) {
        alert('Please select an option first (A, B, C, or D)!');
        return;
      }

      if (!cbtFeedback) return;
      cbtFeedback.style.display = 'block';

      if (selectedOption === 'B') {
        cbtFeedback.style.background = '#ecfdf5';
        cbtFeedback.style.border = '1px solid #6ee7b7';
        cbtFeedback.style.color = '#065f46';
        cbtFeedback.innerHTML = `
          <strong>✅ Correct Answer (B: 20 meters)!</strong><br>
          <em>Formula:</em> \(H_{\max} = \frac{u^2 \sin^2 \theta}{2g}\)<br>
          Here \(u = 40\text{ m/s}\), \(\theta = 30^\circ\), \(\sin 30^\circ = 0.5\), and \(g = 10\text{ m/s}^2\).<br>
          \(H_{\max} = \frac{40^2 \times 0.5^2}{2 \times 10} = \frac{1600 \times 0.25}{20} = \frac{400}{20} = \mathbf{20\text{ meters}}\).<br>
          <strong>Problem Solved Correctly | Speed: 18 seconds!</strong>
        `;
        currentXP += 40;
        if (xpValEl) xpValEl.textContent = `${currentXP.toLocaleString()} XP`;
        if (window.PrepPilotAccount) {
          window.PrepPilotAccount.updateProgress(userSanitized, { xp: currentXP });
        }
        showToast('🎯 +40 XP awarded for CBT Mock problem solution!');
      } else {
        cbtFeedback.style.background = '#fef2f2';
        cbtFeedback.style.border = '1px solid #fca5a5';
        cbtFeedback.style.color = '#991b1b';
        cbtFeedback.innerHTML = `
          <strong>❌ Incorrect (You chose Option ${selectedOption}). Correct Answer is (B: 20 meters).</strong><br>
          Remember to square both \(u\) and \(\sin \theta\): \(H_{\max} = \frac{u^2 \sin^2 \theta}{2g}\).<br>
          \(H_{\max} = \frac{1600 \times 0.25}{20} = \mathbf{20\text{ m}}\).
        `;
      }
    });
  }

  // 5. AI Doubt Pilot Instant Answer Generator
  const aiForm = document.getElementById('ai-doubt-form');
  const aiInput = document.getElementById('ai-query-input');
  const aiResponse = document.getElementById('ai-response-box');
  const aiChips = document.querySelectorAll('.ai-query-chip');
  const btnQuickDoubt = document.getElementById('btn-quick-doubt');

  const doubtKnowledgeBase = {
    'lenz': {
      title: "Lenz's Law (Electromagnetic Induction)",
      ans: "<strong>Lenz's Law Statement:</strong> The direction of the induced electromotive force (EMF) and induced current in a circuit always opposes the change in magnetic flux that produces it.<br><strong>Mathematical form:</strong> \(\\mathcal{E} = -N \frac{d\Phi_B}{dt}\). The negative sign explicitly represents Lenz's Law, ensuring conservation of energy!",
    },
    'projectile': {
      title: "Projectile Maximum Height Formula",
      ans: "<strong>Maximum Height Formula:</strong> \(H_{\max} = \frac{u^2 \sin^2 \theta}{2g}\)<br>• At the peak, vertical velocity \(v_y = 0\).<br>• Using kinematics: \(v_y^2 = u_y^2 - 2gH \implies 0 = (u \sin \theta)^2 - 2gH \implies H = \frac{u^2 \sin^2 \theta}{2g}\).",
    },
    'sn': {
      title: "SN1 vs SN2 Nucleophilic Substitution Mechanisms",
      ans: "<strong>Key Differences:</strong><br>• <strong>SN1:</strong> 2 steps (carbocation intermediate), unimolecular rate (\(R = k[\text{RX}]\)), favored by tertiary (3°) alkyl halides and polar protic solvents, gives racemization.<br>• <strong>SN2:</strong> 1 concerted step (transition state), bimolecular rate (\(R = k[\text{RX}][\text{Nu}^-]\)), favored by primary (1°) alkyl halides and polar aprotic solvents, gives Walden inversion.",
    },
  };

  function solveDoubt(queryText) {
    if (!aiResponse) return;
    aiResponse.innerHTML = '<em>⚡ PrepPilot AI is analyzing syllabus concept &amp; compiling step-by-step breakdown...</em>';

    setTimeout(() => {
      const q = queryText.toLowerCase();
      let match = null;

      if (q.includes('lenz') || q.includes('electromagnet')) {
        match = doubtKnowledgeBase['lenz'];
      } else if (q.includes('projectile') || q.includes('height') || q.includes('hmax')) {
        match = doubtKnowledgeBase['projectile'];
      } else if (q.includes('sn1') || q.includes('sn2') || q.includes('substitution')) {
        match = doubtKnowledgeBase['sn'];
      }

      if (match) {
        aiResponse.innerHTML = `<strong>💡 ${match.title}:</strong><br><br>${match.ans}`;
      } else {
        aiResponse.innerHTML = `
          <strong>💡 PrepPilot AI Explanation:</strong><br><br>
          Regarding <em>"${queryText}"</em>:<br>
          This is a foundational concept frequently tested in board examinations and competitive entrance tests. Key approach: Break down into first principles, write down known governing formulas, and verify units! Full interactive 3D video lab is available under the <strong>3D Interactive Labs</strong> tab.
        `;
      }
    }, 350);
  }

  if (aiForm && aiInput) {
    aiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = aiInput.value.trim();
      if (val) solveDoubt(val);
    });
  }

  aiChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-chip');
      if (aiInput) aiInput.value = q;
      solveDoubt(q);
    });
  });

  if (btnQuickDoubt) {
    btnQuickDoubt.addEventListener('click', () => {
      const el = document.getElementById('ai-doubt-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        if (aiInput) aiInput.focus();
      }
    });
  }
})();

