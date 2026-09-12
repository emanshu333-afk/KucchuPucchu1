import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

class PrepPilot3D {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.controls = null;
    this.labelRenderer = null;
    this.clock = new THREE.Clock();
    this.particles = [];
    this.floatingObjects = [];
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.intersected = null;
    this.isInitialized = false;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    this.init();
  }

  async init() {
    try {
      await this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      this.setupPostProcessing();
      this.setupLighting();
      this.createEnvironment();
      this.createParticles();
      this.createFloatingObjects();
      this.setupEventListeners();
      this.setupCursor();
      this.animate();
      this.hideLoading();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize 3D scene:', error);
      this.hideLoading();
    }
  }

  async setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020617, 0.0015);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 15);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('three-canvas').appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    document.getElementById('three-canvas').appendChild(this.labelRenderer.domElement);
  }

  setupPostProcessing() {
    const renderPass = new RenderPass(this.scene, this.camera);
    
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5, 0.4, 0.85
    );
    bloomPass.threshold = 0.8;
    bloomPass.strength = 0.6;
    bloomPass.radius = 0.5;
    this.composer.addPass(bloomPass);

    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    this.composer.addPass(fxaaPass);
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0x1e293b, 0.5);
    this.scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0x14b8a6, 1);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    mainLight.shadow.bias = -0.0005;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xf59e0b, 0.5);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x6366f1, 0.3);
    rimLight.position.set(0, -10, -10);
    this.scene.add(rimLight);

    const pointLight1 = new THREE.PointLight(0x14b8a6, 2, 30);
    pointLight1.position.set(-10, 5, -10);
    pointLight1.castShadow = true;
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xf59e0b, 1.5, 25);
    pointLight2.position.set(10, 3, 10);
    this.scene.add(pointLight2);
  }

  createEnvironment() {
    this.createDesk();
    this.createBooks();
    this.createLamp();
    this.createPlant();
    this.createCoffee();
    this.createFloatingNotes();
    this.createParticlesSystem();
  }

  createDesk() {
    const deskGroup = new THREE.Group();

    const topGeo = new THREE.BoxGeometry(12, 0.3, 6);
    const topMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.8, 
      metalness: 0.1,
      envMapIntensity: 0.5
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.5;
    top.receiveShadow = true;
    top.castShadow = true;
    deskGroup.add(top);

    const legGeo = new THREE.BoxGeometry(0.15, 4.5, 0.15);
    const legMat = new THREE.MeshStandardMaterial({ 
      color: 0x0f172a, 
      roughness: 0.6, 
      metalness: 0.3 
    });
    const positions = [
      [-5.5, -2.25, -2.5], [5.5, -2.25, -2.5],
      [-5.5, -2.25, 2.5], [5.5, -2.25, 2.5]
    ];
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      deskGroup.add(leg);
    });

    const drawerGeo = new THREE.BoxGeometry(3, 1, 0.3);
    const drawerMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.7, 
      metalness: 0.1 
    });
    const drawer = new THREE.Mesh(drawerGeo, drawerMat);
    drawer.position.set(-3, 0.5, 2.65);
    drawer.castShadow = true;
    deskGroup.add(drawer);

    this.scene.add(deskGroup);
    this.deskGroup = deskGroup;
  }

  createBooks() {
    const bookData = [
      { pos: [-4, 0.8, -1.5], rot: 0.3, size: [0.8, 1.5, 0.1], color: 0x8b4513, title: 'Physics' },
      { pos: [-3.5, 0.8, -1.5], rot: 0.25, size: [0.8, 1.4, 0.1], color: 0x2d5a87, title: 'Chemistry' },
      { pos: [-3, 0.8, -1.5], rot: 0.35, size: [0.8, 1.6, 0.1], color: 0x5d4e37, title: 'Math' },
      { pos: [2, 0.8, 1.5], rot: -0.5, size: [1.2, 0.8, 0.1], color: 0x8b4513, title: 'Notes', flat: true },
      { pos: [3, 0.8, 1.5], rot: -0.4, size: [1, 0.8, 0.1], color: 0x2d5a87, title: 'Formulas', flat: true },
    ];

    bookData.forEach((data, i) => {
      const book = this.createBook(data.size, data.color, data.title);
      book.position.set(data.pos[0], data.pos[1], data.pos[2]);
      book.rotation.y = data.rot;
      if (data.flat) book.rotation.x = -Math.PI / 2;
      book.castShadow = true;
      book.receiveShadow = true;
      book.userData = { originalY: book.position.y, originalRot: book.rotation.y, index: i, title: data.title };
      this.floatingObjects.push(book);
      this.scene.add(book);
    });
  }

  createBook(size, color, title) {
    const group = new THREE.Group();
    
    const coverGeo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const coverMat = new THREE.MeshStandardMaterial({ 
      color, 
      roughness: 0.7, 
      metalness: 0.1 
    });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    cover.castShadow = true;
    group.add(cover);

    const pagesGeo = new THREE.BoxGeometry(size[0] - 0.02, size[1] - 0.04, size[2] * 0.8);
    const pagesMat = new THREE.MeshStandardMaterial({ 
      color: 0xf5f0e1, 
      roughness: 0.9, 
      metalness: 0 
    });
    const pages = new THREE.Mesh(pagesGeo, pagesMat);
    pages.position.z = size[2] / 2 - size[2] * 0.4;
    group.add(pages);

    const spineGeo = new THREE.BoxGeometry(size[0], size[1], 0.05);
    const spineMat = new THREE.MeshStandardMaterial({ 
      color: this.darkenColor(color, 0.3), 
      roughness: 0.6, 
      metalness: 0.1 
    });
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.position.z = -size[2] / 2 + 0.025;
    group.add(spine);

    return group;
  }

  darkenColor(color, amount) {
    const c = new THREE.Color(color);
    return new THREE.Color(c.r * (1 - amount), c.g * (1 - amount), c.b * (1 - amount));
  }

  createLamp() {
    const lampGroup = new THREE.Group();

    const baseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.2, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.1;
    base.castShadow = true;
    lampGroup.add(base);

    const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.7 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.95;
    stem.castShadow = true;
    lampGroup.add(stem);

    const shadeGeo = new THREE.ConeGeometry(0.5, 0.4, 16);
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.y = 1.8;
    shade.castShadow = true;
    lampGroup.add(shade);

    const light = new THREE.PointLight(0xfef3c7, 2, 8);
    light.position.y = 1.7;
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    lampGroup.add(light);
    this.lampLight = light;

    lampGroup.position.set(4, 0.5, -2);
    this.scene.add(lampGroup);
    this.lampGroup = lampGroup;
  }

  createPlant() {
    const plantGroup = new THREE.Group();

    const potGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.4, 12);
    const potMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9, metalness: 0 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = 0.2;
    pot.castShadow = true;
    pot.receiveShadow = true;
    plantGroup.add(pot);

    const soilGeo = new THREE.CylinderGeometry(0.33, 0.28, 0.1, 12);
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x291b0e, roughness: 1, metalness: 0 });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.45;
    plantGroup.add(soil);

    const leafGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, metalness: 0 });
    
    for (let i = 0; i < 12; i++) {
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      const angle = (i / 12) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.2;
      const height = 0.5 + Math.random() * 0.6;
      leaf.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      leaf.scale.set(
        0.8 + Math.random() * 0.4,
        0.5 + Math.random() * 0.3,
        0.8 + Math.random() * 0.4
      );
      leaf.castShadow = true;
      leaf.userData = { originalY: leaf.position.y, originalX: leaf.position.x, originalZ: leaf.position.z, index: i };
      plantGroup.add(leaf);
      this.floatingObjects.push(leaf);
    }

    plantGroup.position.set(-4, 0.5, 2);
    this.scene.add(plantGroup);
    this.plantGroup = plantGroup;
  }

  createCoffee() {
    const coffeeGroup = new THREE.Group();

    const cupGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.35, 16);
    const cupMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.2 });
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.y = 0.175;
    cup.castShadow = true;
    coffeeGroup.add(cup);

    const coffeeGeo = new THREE.CylinderGeometry(0.23, 0.18, 0.3, 16);
    const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.2, metalness: 0 });
    const coffee = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffee.position.y = 0.175;
    coffeeGroup.add(coffee);

    const steamGeo = new THREE.CylinderGeometry(0.02, 0.05, 0.4, 8);
    const steamMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.3 
    });
    for (let i = 0; i < 3; i++) {
      const steam = new THREE.Mesh(steamGeo, steamMat);
      steam.position.set(
        (Math.random() - 0.5) * 0.1,
        0.5 + i * 0.15,
        (Math.random() - 0.5) * 0.1
      );
      steam.userData = { originalY: steam.position.y, index: i, speed: 0.5 + Math.random() * 0.5 };
      coffeeGroup.add(steam);
      this.floatingObjects.push(steam);
    }

    coffeeGroup.position.set(3.5, 0.5, -1);
    this.scene.add(coffeeGroup);
    this.coffeeGroup = coffeeGroup;
  }

  createFloatingNotes() {
    const noteData = [
      { pos: [-2, 2.5, -1], rot: 0.2, text: 'E=mc²' },
      { pos: [1, 3, 0], rot: -0.3, text: 'F=ma' },
      { pos: [-3, 2, 1.5], rot: 0.5, text: 'PV=nRT' },
      { pos: [2.5, 2.8, -1], rot: -0.1, text: 'ΔG=ΔH-TΔS' },
    ];

    noteData.forEach((data, i) => {
      const note = this.createNote(data.text);
      note.position.set(data.pos[0], data.pos[1], data.pos[2]);
      note.rotation.y = data.rot;
      note.rotation.x = -0.1;
      note.userData = { originalPos: note.position.clone(), originalRot: note.rotation.clone(), index: i, floatOffset: Math.random() * Math.PI * 2 };
      this.floatingObjects.push(note);
      this.scene.add(note);
    });
  }

  createNote(text) {
    const group = new THREE.Group();
    
    const paperGeo = new THREE.PlaneGeometry(0.8, 0.6);
    const paperMat = new THREE.MeshStandardMaterial({ 
      color: 0xfef3c7, 
      roughness: 0.9, 
      metalness: 0,
      side: THREE.DoubleSide
    });
    const paper = new THREE.Mesh(paperGeo, paperMat);
    paper.castShadow = true;
    group.add(paper);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 40px Space Grotesk';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 96);
    
    const texture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true,
      side: THREE.DoubleSide
    });
    const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55), textMat);
    textPlane.position.z = 0.01;
    group.add(textPlane);

    return group;
  }

  createParticlesSystem() {
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x14b8a6);
    const color2 = new THREE.Color(0xf59e0b);
    const color3 = new THREE.Color(0x6366f1);

    for (let i = 0; i < particleCount; i++) {
      const radius = 5 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) + 2;
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      sizes[i] = Math.random() * 2 + 0.5;
      
      const colorChoice = Math.random();
      let color;
      if (colorChoice < 0.33) color = color1;
      else if (colorChoice < 0.66) color = color2;
      else color = color3;
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002 + 0.001;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  createParticles() {
    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.background = `hsl(${180 + Math.random() * 60}, 70%, 50%)`;
      particle.style.animationDelay = Math.random() * 15 + 's';
      particle.style.animationDuration = 10 + Math.random() * 10 + 's';
      particle.style.width = particle.style.height = (2 + Math.random() * 4) + 'px';
      document.body.appendChild(particle);
      this.particles.push(particle);
    }
  }

  createFloatingObjects() {
    const geometry = new THREE.TorusKnotGeometry(0.3, 0.1, 100, 16);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x14b8a6, 
      roughness: 0.3, 
      metalness: 0.7,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.2
    });

    for (let i = 0; i < 5; i++) {
      const obj = new THREE.Mesh(geometry, material.clone());
      obj.position.set(
        (Math.random() - 0.5) * 10,
        3 + Math.random() * 3,
        (Math.random() - 0.5) * 10
      );
      obj.userData = { 
        originalPos: obj.position.clone(),
        rotationSpeed: new THREE.Vector3(
          Math.random() * 0.01,
          Math.random() * 0.01,
          Math.random() * 0.01
        ),
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.5 + Math.random() * 0.5
      };
      obj.castShadow = true;
      this.floatingObjects.push(obj);
      this.scene.add(obj);
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mousedown', () => this.cursorClick(true));
    window.addEventListener('mouseup', () => this.cursorClick(false));
    
    document.addEventListener('mouseover', (e) => {
      if (e.target.matches('a, button, .card, .btn, .nav-link, [data-hover]')) {
        document.querySelector('.cursor-wrapper')?.classList.add('hover');
      }
    });
    
    document.addEventListener('mouseout', (e) => {
      if (e.target.matches('a, button, .card, .btn, .nav-link, [data-hover]')) {
        document.querySelector('.cursor-wrapper')?.classList.remove('hover');
      }
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const cursorWrapper = document.querySelector('.cursor-wrapper');
    if (cursorWrapper) {
      cursorWrapper.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    }
  }

  cursorClick(isDown) {
    const cursorWrapper = document.querySelector('.cursor-wrapper');
    if (cursorWrapper) {
      cursorWrapper.classList.toggle('click', isDown);
    }
  }

  setupCursor() {
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorRing = document.querySelector('.cursor-ring');
    let dotX = 0, dotY = 0;
    let ringX = 0, ringY = 0;

    const animateCursor = () => {
      const ease = 0.2;
      dotX += (this.mouse.x * window.innerWidth / 2 + window.innerWidth / 2 - dotX) * ease;
      dotY += (this.mouse.y * -window.innerHeight / 2 + window.innerHeight / 2 - dotY) * ease;
      ringX += (this.mouse.x * window.innerWidth / 2 + window.innerWidth / 2 - ringX) * 0.1;
      ringY += (this.mouse.y * -window.innerHeight / 2 + window.innerHeight / 2 - ringY) * 0.1;

      if (cursorDot) {
        cursorDot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
      }
      if (cursorRing) {
        cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      }
      requestAnimationFrame(animateCursor);
    };
    animateCursor();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (!this.reducedMotion) {
      this.updateParticles(delta, elapsed);
      this.updateFloatingObjects(delta, elapsed);
      this.updateCamera(delta, elapsed);
      this.updateLamp(elapsed);
    }

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  updateParticles(delta, elapsed) {
    if (this.particleSystem) {
      this.particleSystem.rotation.y += delta * 0.02;
      this.particleSystem.rotation.x += delta * 0.01;

      const positions = this.particleSystem.geometry.attributes.position.array;
      const velocities = this.particleSystem.geometry.attributes.velocity.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        if (positions[i + 1] > 20) positions[i + 1] = -5;
        if (positions[i + 1] < -5) positions[i + 1] = 20;
        
        const dist = Math.sqrt(positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2);
        if (dist > 20) {
          const radius = 5 + Math.random() * 15;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta) + 2;
          positions[i + 2] = radius * Math.cos(phi);
        }
      }
      this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
  }

  updateFloatingObjects(delta, elapsed) {
    this.floatingObjects.forEach(obj => {
      if (obj.userData.floatOffset !== undefined) {
        obj.position.y = obj.userData.originalY + Math.sin(elapsed * (obj.userData.floatSpeed || 1) + obj.userData.floatOffset) * 0.15;
        obj.position.x = obj.userData.originalX + Math.cos(elapsed * (obj.userData.floatSpeed || 1) + obj.userData.floatOffset) * 0.05;
      }
      if (obj.userData.rotationSpeed) {
        obj.rotation.x += obj.userData.rotationSpeed.x;
        obj.rotation.y += obj.userData.rotationSpeed.y;
        obj.rotation.z += obj.userData.rotationSpeed.z;
      }
    });

    if (this.lampGroup) {
      this.lampGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.1;
    }
  }

  updateCamera(delta, elapsed) {
    const targetX = Math.sin(elapsed * 0.1) * 0.5;
    const targetZ = Math.cos(elapsed * 0.1) * 0.5;
    this.camera.position.x += (targetX - this.camera.position.x) * delta * 0.5;
    this.camera.position.z = 15 + (targetZ - this.camera.position.z) * delta * 0.5;
    this.camera.lookAt(0, 2, 0);
  }

  updateLamp(elapsed) {
    if (this.lampLight) {
      this.lampLight.intensity = 2 + Math.sin(elapsed * 2) * 0.3;
    }
  }

  hideLoading() {
    const loading = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    if (loading) {
      loading.style.opacity = '0';
      loading.style.transition = 'opacity 0.5s ease';
      setTimeout(() => loading.remove(), 500);
    }
    if (app) {
      app.style.opacity = '1';
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} text-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'}"></i>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  onSectionChange(section) {
    if (this.reducedMotion) return;
    
    const positions = {
      dashboard: { x: 0, y: 5, z: 15, lookAt: { x: 0, y: 2, z: 0 } },
      exams: { x: -8, y: 6, z: 12, lookAt: { x: -2, y: 1, z: -2 } },
      study: { x: 8, y: 6, z: 12, lookAt: { x: 2, y: 1, z: -2 } },
      analytics: { x: 0, y: 8, z: 15, lookAt: { x: 0, y: 0, z: -3 } }
    };
    
    const pos = positions[section] || positions.dashboard;
    gsap.to(this.camera.position, {
      x: pos.x, y: pos.y, z: pos.z,
      duration: 2, ease: 'power2.inOut'
    });
    gsap.to(this.camera.lookAt, {
      x: pos.lookAt.x, y: pos.lookAt.y, z: pos.lookAt.z,
      duration: 2, ease: 'power2.inOut'
    });
  }
}

window.PrepPilot3D = PrepPilot3D;

document.addEventListener('DOMContentLoaded', () => {
  window.prepPilot3D = new PrepPilot3D();
});

function showToast(message, type) {
  if (window.prepPilot3D) {
    window.prepPilot3D.showToast(message, type);
  }
}

function navigateTo(section) {
  if (window.prepPilot3D) {
    window.prepPilot3D.onSectionChange(section);
  }
}