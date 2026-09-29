/**
 * labs-3d.js - Top 1% Interactive 3D WebGL Hardware Inspection Engine
 * Clariora A+ Luxury Experience Suite
 *
 * Capabilities:
 * 1. Real-time 3D WebGL rendering with Three.js (PBR studio lighting, GLTFLoader).
 * 2. Real models: ATX Motherboard, RJ-45 Connector, 42U Datacenter Rack.
 * 3. 3D-projected dynamic hotspot beacons that track mesh nodes in 3D coordinate space.
 * 4. Raycast surface occlusion detection (hotspots dim when behind hardware geometry).
 * 5. Dynamic cursor specular light (realistic gleam across copper traces and heatsinks).
 * 6. Procedural studio environment map for anisotropic metallic reflections.
 * 7. Cinematic camera transitions (focus, zoom, smooth orbit damping).
 * 8. Multi-mode rendering: Photorealistic PBR Studio vs. Holographic Cyber-Gold Wireframe.
 * 9. Synthesized Web Audio API tactile sound effects (zero audio assets, 100% offline).
 * 10. Defensive fallbacks to 2D WebP perspective tilt when WebGL is unavailable.
 * 11. Performance optimized: pauses off-screen via IntersectionObserver, DPR capped.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Audio Synthesizer (Web Audio API -- zero asset footprint, 100% offline)
  // ---------------------------------------------------------------------------
  var SoundEngine = (function () {
    var ctx = null;
    var isMuted = false;

    try {
      isMuted = localStorage.getItem('clariora_labs_sound_muted') === '1';
    } catch (e) {
      isMuted = false;
    }

    function getContext() {
      if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioCtx();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }
      return ctx;
    }

    return {
      isMuted: function () {
        return isMuted;
      },
      setMuted: function (muted) {
        isMuted = !!muted;
        try {
          localStorage.setItem('clariora_labs_sound_muted', isMuted ? '1' : '0');
        } catch (e) {}
      },
      playClick: function () {
        if (isMuted) return;
        var c = getContext();
        if (!c) return;
        try {
          var now = c.currentTime;
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now);
          osc.stop(now + 0.045);
        } catch (e) {}
      },
      playHover: function () {
        if (isMuted) return;
        var c = getContext();
        if (!c) return;
        try {
          var now = c.currentTime;
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1240, now);
          gain.gain.setValueAtTime(0.02, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now);
          osc.stop(now + 0.025);
        } catch (e) {}
      },
      playEngage: function () {
        if (isMuted) return;
        var c = getContext();
        if (!c) return;
        try {
          var now = c.currentTime;
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.09); // E5
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now);
          osc.stop(now + 0.13);
        } catch (e) {}
      }
    };
  })();

  // ---------------------------------------------------------------------------
  // 2. Hardware Model & Hotspot Definitions
  // ---------------------------------------------------------------------------
  var MODELS = {
    mobo: {
      id: 'mobo',
      name: 'ATX Motherboard (Obj 3.4)',
      glb: 'models/motherboard.glb',
      img1200: 'img/motherboard-1200.webp',
      img600: 'img/motherboard-600.webp',
      alt: '3D ATX Motherboard hardware model with LGA 1700 socket, DDR5 slots, PCIe 4.0 x16, and M.2 NVMe',
      defaultHotspot: 'socket',
      cameraStart: { x: 0, y: 1.35, z: 1.65 },
      targetStart: { x: 0, y: 0, z: 0 },
      hotspots: [
        {
          id: 'socket',
          nodeName: 'CPU_Retention_Frame',
          fallbackPos: { x: -0.15, y: 0.05, z: -0.22 },
          cameraOffset: { x: -0.2, y: 0.65, z: 0.45 },
          label: 'LGA 1700 CPU Socket',
          x: 43,
          y: 36,
          title: 'LGA 1700 CPU Socket and Retention Lever',
          obj: 'CompTIA A+ Core 1 · Obj 3.4',
          desc: 'Land Grid Array (LGA) packages place contact pins directly on the motherboard socket rather than on the processor. Align the Pin 1 gold triangle indicator to avoid pin damage. The Zero Insertion Force (ZIF) lever secures the Integrated Heat Spreader.',
          takeaway: 'Modern Intel desktop processors and AMD AM5 utilize LGA sockets. Contrast with legacy AMD AM4 Pin Grid Array (PGA) where pins were soldered directly on the CPU.'
        },
        {
          id: 'ram',
          nodeName: 'RAM_Slot_0',
          fallbackPos: { x: 0.32, y: 0.08, z: -0.22 },
          cameraOffset: { x: 0.28, y: 0.6, z: 0.4 },
          label: 'DDR5 DIMM Slots',
          x: 69,
          y: 33,
          title: 'DDR5 Dual-Channel DIMM Slots',
          obj: 'CompTIA A+ Core 1 · Obj 3.4',
          desc: 'DDR5 desktop RAM modules feature 288 pins with an off-center keying notch to prevent incorrect insertion. Install modules in alternating matched slots (typically channels A2 and B2) to enable 128-bit dual-channel memory bandwidth.',
          takeaway: 'DDR5 operates at 1.1V and integrates power management (PMIC) on the module itself, reducing motherboard complexity compared to 1.2V DDR4.'
        },
        {
          id: 'pcie',
          nodeName: 'PCIe_x16_1_Body',
          fallbackPos: { x: -0.12, y: 0.06, z: 0.18 },
          cameraOffset: { x: -0.15, y: 0.55, z: 0.45 },
          label: 'PCIe 4.0 x16 Slot',
          x: 41,
          y: 65,
          title: 'Primary PCIe 4.0 x16 Expansion Slot',
          obj: 'CompTIA A+ Core 1 · Obj 3.4',
          desc: 'Full-length 16-lane expansion slot wired directly to CPU lanes for discrete graphics accelerators. Includes an end retention lock bracket to anchor heavy dual-slot and triple-slot video cards against motherboard slot sag.',
          takeaway: 'PCIe 4.0 yields 16 GT/s per lane (~2 GB/s per lane, up to 32 GB/s total full duplex on x16). PCIe slots are backward and forward compatible across all versions.'
        },
        {
          id: 'm2',
          nodeName: 'M2_Heatshield',
          fallbackPos: { x: 0.04, y: 0.05, z: 0.08 },
          cameraOffset: { x: 0.02, y: 0.5, z: 0.35 },
          label: 'M.2 NVMe SSD Slot',
          x: 53,
          y: 57,
          title: 'M.2 NVMe PCIe 4.0 x4 Slot (Key M, 2280)',
          obj: 'CompTIA A+ Core 1 · Obj 3.1 & 3.4',
          desc: 'Key M connector supporting four PCIe lanes directly from the chipset or CPU. Accommodates standard 2280 form factor (22mm wide by 80mm long) high-speed solid-state drives with thermal heat sink standoff mounting.',
          takeaway: 'NVMe protocols run directly over the PCIe bus with 64,000 queues, achieving transfer rates exceeding 7,000 MB/s compared to the 550 MB/s limit of legacy SATA III.'
        },
        {
          id: 'power',
          nodeName: 'ATX_24Pin_Housing',
          fallbackPos: { x: 0.46, y: 0.08, z: -0.05 },
          cameraOffset: { x: 0.42, y: 0.55, z: 0.35 },
          label: '24-Pin ATX Power',
          x: 83,
          y: 45,
          title: '24-Pin ATX Main Power Header (2x12)',
          obj: 'CompTIA A+ Core 1 · Obj 3.4',
          desc: 'Provides main system DC power distribution from the power supply unit (+3.3V, +5V, +12V, and -12V rails). A keyed plastic retention latch ensures correct connection orientation. Often splits into 20+4 pins for legacy motherboard support.',
          takeaway: 'Multimeter diagnostic checks: Yellow wires measure +12V DC, red wires measure +5V DC, and orange wires measure +3.3V DC within +/- 5% operating tolerance.'
        },
        {
          id: 'chipset',
          nodeName: 'Chipset_Heatsink',
          fallbackPos: { x: 0.28, y: 0.05, z: 0.28 },
          cameraOffset: { x: 0.25, y: 0.5, z: 0.38 },
          label: 'Southbridge Chipset PCH',
          x: 74,
          y: 72,
          title: 'Platform Controller Hub (PCH) Chipset',
          obj: 'CompTIA A+ Core 1 · Obj 3.4',
          desc: 'The modern single-chip Southbridge successor controls peripheral I/O, SATA drives, USB buses, PCIe lanes for expansion slots, and high-definition audio routing back to the processor via DMI.',
          takeaway: 'Passive aluminum heat sinks dissipate thermal load from the chipset without requiring failure-prone cooling fans.'
        }
      ]
    },
    rj45: {
      id: 'rj45',
      name: 'RJ-45 Modular Plug (Obj 2.1)',
      glb: 'models/rj45_connector.glb',
      img1200: 'img/rj45-1200.webp',
      img600: 'img/rj45-600.webp',
      alt: '3D RJ-45 Cat6A modular connector with T568B pinout, 8 gold contact pins, and strain relief boot',
      defaultHotspot: 'pins',
      cameraStart: { x: 0.4, y: 0.3, z: 0.8 },
      targetStart: { x: 0, y: 0, z: 0 },
      hotspots: [
        {
          id: 'pins',
          nodeName: 'Gold_Pin_4',
          fallbackPos: { x: 0.22, y: 0.08, z: -0.15 },
          cameraOffset: { x: 0.25, y: 0.2, z: 0.3 },
          label: '8 Gold Contact Pins',
          x: 65,
          y: 28,
          title: '8P8C Gold Contact Pins (Pins 1-8)',
          obj: 'CompTIA A+ Core 1 · Obj 2.1',
          desc: 'Eight phosphor bronze contact blades coated with 50-micron gold plating. When crimped, insulation displacement contacts (IDC) pierce each individual conductor jacket to establish a gas-tight, corrosion-resistant electrical interface.',
          takeaway: 'T568B wiring standard Pin 1 to 8: White/Orange, Orange, White/Green, Blue, White/Blue, Green, White/Brown, Brown. T568A swaps green and orange pairs.'
        },
        {
          id: 'conductors',
          nodeName: 'Conductor_Wire_4',
          fallbackPos: { x: -0.05, y: 0.02, z: 0.02 },
          cameraOffset: { x: -0.05, y: 0.25, z: 0.32 },
          label: 'T568B Conductor Wires',
          x: 42,
          y: 52,
          title: '4-Pair 23 AWG Twisted Conductor Wires',
          obj: 'CompTIA A+ Core 1 · Obj 2.1',
          desc: 'Four differential color-coded twisted pairs (Orange, Green, Blue, Brown). Tight twisting geometry provides high common-mode noise rejection and cancels electromagnetic cross-talk along the transmission path.',
          takeaway: 'Never untwist conductors more than 0.5 inches (13mm) during termination. Excessive untwisting introduces near-end crosstalk (NEXT) and packet drops.'
        },
        {
          id: 'housing',
          nodeName: 'RJ45_Housing_Head',
          fallbackPos: { x: 0.12, y: 0.02, z: -0.08 },
          cameraOffset: { x: 0.15, y: 0.3, z: 0.35 },
          label: 'Polycarbonate Shell',
          x: 58,
          y: 46,
          title: 'Clear Polycarbonate Housing and Latch',
          obj: 'CompTIA A+ Core 1 · Obj 2.1',
          desc: 'Transparent thermoplastic housing allows technician visual verification of wire sequence before applying crimping force. Integrated retention latch clicks into 8P8C keystone jacks to prevent unintended disconnection.',
          takeaway: 'Broken retention clips are a primary cause of physical link drops in field environments. Replace damaged plugs or install snagless boots.'
        },
        {
          id: 'strain',
          nodeName: 'Strain_Boot_Body',
          fallbackPos: { x: -0.32, y: -0.02, z: 0.15 },
          cameraOffset: { x: -0.3, y: 0.22, z: 0.35 },
          label: 'Strain Relief Clamp',
          x: 28,
          y: 68,
          title: 'Cable Jacket Retention and Shielding',
          obj: 'CompTIA A+ Core 1 · Obj 2.1',
          desc: 'The outer cable jacket enters the connector body where an internal bar clamps down on the sheath. Cat6A implementations incorporate internal metallic foil and ground drain wires to support 10GBASE-T operation over 100 meters.',
          takeaway: 'The outer PVC jacket must be secured inside the connector shell behind the strain bar. Exposed conductor pairs outside the plug violate structured cabling standards.'
        }
      ]
    },
    rack: {
      id: 'rack',
      name: '42U Datacenter Rack (Obj 3.4)',
      glb: 'models/datacenter_rack.glb',
      img1200: 'img/rack-1200.webp',
      img600: 'img/rack-600.webp',
      alt: '3D 42U Datacenter Server Rack with Top-of-Rack switch, patch panel, compute servers, and base UPS',
      defaultHotspot: 'switch',
      cameraStart: { x: 0, y: 1.8, z: 3.2 },
      targetStart: { x: 0, y: 1.1, z: 0 },
      hotspots: [
        {
          id: 'switch',
          nodeName: 'Switch_1U_Faceplate',
          fallbackPos: { x: 0, y: 1.95, z: 0.42 },
          cameraOffset: { x: 0, y: 1.95, z: 1.2 },
          label: 'ToR 10GbE Switch',
          x: 50,
          y: 16,
          title: 'Top-of-Rack (ToR) 48-Port Managed Switch (U41-U42)',
          obj: 'CompTIA A+ Core 1 · Obj 2.1 & 3.4',
          desc: 'High-speed 10GbE SFP+ aggregation switch positioned at the top of the enclosure. Aggregates network uplinks from all servers inside the rack using short Direct Attach Copper (DAC) or fiber jumpers.',
          takeaway: 'ToR architectures keep intra-rack cabling short and organized, decreasing cable clutter and improving airflow efficiency between hot and cold aisles.'
        },
        {
          id: 'patch',
          nodeName: 'Cable_Mgmt_1U',
          fallbackPos: { x: 0, y: 1.78, z: 0.42 },
          cameraOffset: { x: 0, y: 1.78, z: 1.2 },
          label: 'Cat6A Patch Panel',
          x: 50,
          y: 24,
          title: '1U 48-Port Cat6A Keystone Patch Panel (U40)',
          obj: 'CompTIA A+ Core 1 · Obj 2.1',
          desc: 'Provides structured cross-connect terminations for backbone and horizontal cabling runs. Protects sensitive switch ports from mechanical wear caused by repeated cable insertion and extraction.',
          takeaway: 'Maintain strict cable bend radius (minimum 4 times outside cable diameter) to avoid micro-fractures in copper and signal degradation.'
        },
        {
          id: 'server',
          nodeName: 'Server_2U_Bezel',
          fallbackPos: { x: 0, y: 1.48, z: 0.42 },
          cameraOffset: { x: 0, y: 1.48, z: 1.2 },
          label: '2U Compute Servers',
          x: 50,
          y: 35,
          title: '2U Dual-Socket Enterprise Compute Servers (U36-U37)',
          obj: 'CompTIA A+ Core 1 · Obj 3.4',
          desc: 'High-density rackmount compute nodes equipped with redundant hot-swap power supplies, dual Xeon/EPYC processors, and front-loading SAS/NVMe drive caddies mounted on telescoping rail kits.',
          takeaway: 'Airflow direction is critical in rack installations: cold ambient intake enters from the front cold aisle (18-27 C) and exhausts out the rear hot aisle.'
        },
        {
          id: 'ups',
          nodeName: 'UPS_3U_Front_Bezel',
          fallbackPos: { x: 0, y: 0.35, z: 0.42 },
          cameraOffset: { x: 0, y: 0.35, z: 1.2 },
          label: '3U Smart-UPS Battery',
          x: 50,
          y: 82,
          title: '3U 3000VA Online Double-Conversion UPS (U1-U3)',
          obj: 'CompTIA A+ Core 1 · Obj 3.4 & Safety',
          desc: 'Heavy battery backup system installed at the lowest rack positions (U1-U3). Conditions incoming AC power, removes surges and sags, and supplies instantaneous battery power during utility failure.',
          takeaway: 'Critical datacenter safety rule: Heavy equipment must always be installed at the base of the rack (U1-U3) to maintain a low center of gravity and eliminate tipping hazards.'
        }
      ]
    }
  };

  // State
  var currentModelKey = 'mobo';
  var currentHotspotId = 'socket';
  var isWireframe = false;
  var isExploded = false;
  var currentExplodeFactor = 0.0;
  var targetExplodeFactor = 0.0;
  var isAutoRotate = true;
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // DOM Elements
  var stage = document.getElementById('labs-stage');
  var canvasWrap = document.getElementById('labs-canvas-wrap');
  var viewport = document.getElementById('labs-viewport');
  var sheen = document.getElementById('labs-sheen');
  var imgEl = document.getElementById('labs-img');
  var hotspotsContainer = document.getElementById('labs-hotspots');
  var pillListContainer = document.getElementById('labs-hotspot-list');
  var objTagEl = document.getElementById('labs-obj-tag');
  var compTitleEl = document.getElementById('labs-comp-title');
  var compDescEl = document.getElementById('labs-comp-desc');
  var compTakeawayEl = document.getElementById('labs-comp-takeaway');
  var tabs = document.querySelectorAll('#labs [role="tab"]');

  if (!viewport || !canvasWrap) {
    return;
  }

  // ---------------------------------------------------------------------------
  // 3. Toolbar & Status Elements
  // ---------------------------------------------------------------------------
  var statusBadge = document.getElementById('labs-stage-badge');
  var loaderHUD = document.getElementById('labs-loader');
  if (!loaderHUD) {
    loaderHUD = document.createElement('div');
    loaderHUD.className = 'labs-loader';
    loaderHUD.id = 'labs-loader';
    loaderHUD.innerHTML = [
      '<div class="labs-loader__spinner"></div>',
      '<div class="labs-loader__label">Streaming 3D Hardware Model</div>',
      '<div class="labs-loader__bar"><div class="labs-loader__progress" id="labs-loader-progress"></div></div>'
    ].join('');
    viewport.appendChild(loaderHUD);
  }

  function setLoaderProgress(pct, visible) {
    if (visible === false) {
      loaderHUD.classList.remove('is-active');
      return;
    }
    loaderHUD.classList.add('is-active');
    var bar = document.getElementById('labs-loader-progress');
    if (bar) bar.style.width = Math.min(100, Math.max(5, pct)) + '%';
  }

  // ---------------------------------------------------------------------------
  // 4. Three.js WebGL Engine Implementation
  // ---------------------------------------------------------------------------
  var hasThree = typeof window.THREE !== 'undefined' && typeof window.THREE.GLTFLoader !== 'undefined';
  var threeCanvas = null;
  var renderer = null;
  var scene = null;
  var camera = null;
  var controls = null;
  var gltfLoader = null;
  var pointerLight = null;
  var raycaster = null;
  var camToTarget = null;
  var loadedModels = {};
  var currentModelRoot = null;
  var pbrMaterialsMap = new Map();
  var wireframeMaterial = null;
  var isRendering = false;
  var targetCamPos = null;
  var targetCamLook = null;
  var tweenDuration = 0;
  var tweenStartTime = 0;
  var startCamPos = null;
  var startCamLook = null;
  var isTweening = false;
  var autoRotateTimeout = null;

  var groundShadowMesh = null;
  var isActionEngaged = false;
  var currentActionLerp = 0.0;
  var targetActionLerp = 0.0;
  var interactiveMechNodes = {
    lever: null,
    loadPlate: null,
    caddy: null,
    clip: null
  };
  var pointerNDC = new THREE.Vector2(-999, -999);
  var hoveredHotspotId = null;
  var hoveredMesh = null;
  var hoveredMeshOrigEmissive = null;

  function createStudioEnvironment(rend) {
    try {
      var c = document.createElement('canvas');
      c.width = 512;
      c.height = 256;
      var cx = c.getContext('2d');

      var bgGrad = cx.createLinearGradient(0, 0, 0, 256);
      bgGrad.addColorStop(0, '#0a0d14');
      bgGrad.addColorStop(0.48, '#181e2b');
      bgGrad.addColorStop(0.52, '#06080d');
      bgGrad.addColorStop(1, '#020305');
      cx.fillStyle = bgGrad;
      cx.fillRect(0, 0, 512, 256);

      var rad1 = cx.createRadialGradient(256, 45, 5, 256, 45, 90);
      rad1.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      rad1.addColorStop(0.4, 'rgba(245, 248, 255, 0.65)');
      rad1.addColorStop(1, 'rgba(24, 30, 43, 0)');
      cx.fillStyle = rad1;
      cx.fillRect(160, 0, 192, 120);

      var rad2 = cx.createRadialGradient(420, 85, 5, 420, 85, 75);
      rad2.addColorStop(0, 'rgba(245, 208, 97, 0.85)');
      rad2.addColorStop(0.5, 'rgba(212, 175, 55, 0.4)');
      rad2.addColorStop(1, 'rgba(10, 13, 20, 0)');
      cx.fillStyle = rad2;
      cx.fillRect(340, 10, 160, 150);

      var rad3 = cx.createRadialGradient(90, 85, 5, 90, 85, 75);
      rad3.addColorStop(0, 'rgba(106, 165, 255, 0.75)');
      rad3.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)');
      rad3.addColorStop(1, 'rgba(10, 13, 20, 0)');
      cx.fillStyle = rad3;
      cx.fillRect(10, 10, 160, 150);

      cx.fillStyle = 'rgba(245, 208, 97, 0.12)';
      cx.fillRect(0, 126, 512, 4);

      var tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      return tex;
    } catch (e) {
      return null;
    }
  }

  function createGroundContactShadow() {
    try {
      var c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      var cx = c.getContext('2d');
      var g = cx.createRadialGradient(128, 128, 10, 128, 128, 120);
      g.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
      g.addColorStop(0.4, 'rgba(0, 0, 0, 0.40)');
      g.addColorStop(0.75, 'rgba(0, 0, 0, 0.12)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      cx.fillStyle = g;
      cx.fillRect(0, 0, 256, 256);

      var tex = new THREE.CanvasTexture(c);
      var geo = new THREE.PlaneGeometry(3.6, 3.6);
      var mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false
      });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -0.01;
      return mesh;
    } catch (e) {
      return null;
    }
  }

  function initThreeEngine() {
    if (!hasThree) {
      if (statusBadge) {
        var txt = document.getElementById('labs-badge-text');
        if (txt) txt.textContent = 'Interactive Perspective';
      }
      initFallbackTilt();
      return;
    }

    try {
      threeCanvas = document.createElement('canvas');
      threeCanvas.className = 'labs-stage__three-canvas';
      threeCanvas.id = 'labs-three-canvas';
      viewport.appendChild(threeCanvas);

      var width = viewport.clientWidth || 800;
      var height = viewport.clientHeight || 533;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      renderer = new THREE.WebGLRenderer({
        canvas: threeCanvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      scene = new THREE.Scene();

      // Studio environment reflection for PBR metallic gleam
      var envMap = createStudioEnvironment(renderer);
      if (envMap) scene.environment = envMap;

      camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
      camera.position.set(0, 1.4, 2.0);

      // Raycaster for 3D surface occlusion detection and direct mesh picking
      raycaster = new THREE.Raycaster();
      camToTarget = new THREE.Vector3();

      // Orbit Controls on the interactive canvas
      controls = new THREE.OrbitControls(camera, threeCanvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = true;
      controls.panSpeed = 0.8;
      controls.rotateSpeed = 0.8;
      controls.minDistance = 0.35;
      controls.maxDistance = 5.5;
      controls.maxPolarAngle = Math.PI * 0.88;
      controls.minPolarAngle = 0.05;
      controls.autoRotate = isAutoRotate && !prefersReducedMotion;
      controls.autoRotateSpeed = 1.0;

      // Lighting Rig
      var ambLight = new THREE.AmbientLight(0x282c35, 1.2);
      scene.add(ambLight);

      var hemiLight = new THREE.HemisphereLight(0xfff6e6, 0x111622, 1.0);
      hemiLight.position.set(0, 5, 0);
      scene.add(hemiLight);

      // Key Light with Soft Directional Shadow
      var keyLight = new THREE.DirectionalLight(0xffeed0, 2.5);
      keyLight.position.set(3, 4, 3);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 12;
      keyLight.shadow.camera.left = -2.2;
      keyLight.shadow.camera.right = 2.2;
      keyLight.shadow.camera.top = 2.2;
      keyLight.shadow.camera.bottom = -2.2;
      keyLight.shadow.bias = -0.0008;
      scene.add(keyLight);

      // Blue Fill Light
      var fillLight = new THREE.DirectionalLight(0x6aa5ff, 1.4);
      fillLight.position.set(-3, -1, 2);
      scene.add(fillLight);

      // Rim Light
      var rimLight = new THREE.DirectionalLight(0xf5d061, 2.0);
      rimLight.position.set(0, 3, -3);
      scene.add(rimLight);

      // Dynamic cursor specular light (tracks pointer to create realistic gleam)
      pointerLight = new THREE.PointLight(0xf5d061, 1.6, 5.0);
      pointerLight.position.set(0, 1.5, 1.5);
      scene.add(pointerLight);

      // Wireframe Material
      wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0xf5d061,
        wireframe: true,
        transparent: true,
        opacity: 0.65
      });

      gltfLoader = new THREE.GLTFLoader();

      // Controls event listeners
      controls.addEventListener('start', function () {
        controls.autoRotate = false;
        if (autoRotateTimeout) clearTimeout(autoRotateTimeout);
      });
      controls.addEventListener('end', function () {
        if (isAutoRotate && !prefersReducedMotion) {
          autoRotateTimeout = setTimeout(function () {
            controls.autoRotate = true;
          }, 3500);
        }
      });

      // Pointer tracking for dynamic specular light + 3D mesh raycasting
      canvasWrap.addEventListener('pointermove', function (e) {
        var rect = canvasWrap.getBoundingClientRect();
        var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        var ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        pointerNDC.set(nx, ny);

        if (pointerLight) {
          pointerLight.position.set(nx * 1.8, ny * 1.8 + 0.6, 1.4);
        }

        // Raycast against interactive 3D components
        if (currentModelRoot && camera && raycaster) {
          raycaster.setFromCamera(pointerNDC, camera);
          var hits = raycaster.intersectObjects(currentModelRoot.children, true);
          var hitHotspotId = null;
          var foundMesh = null;

          if (hits.length > 0) {
            for (var h = 0; h < hits.length; h++) {
              var obj = hits[h].object;
              var cur = obj;
              while (cur && cur !== currentModelRoot) {
                var name = cur.name || '';
                var model = MODELS[currentModelKey];
                if (model && model.hotspots) {
                  for (var i = 0; i < model.hotspots.length; i++) {
                    var hs = model.hotspots[i];
                    if (hs.nodeName && name.indexOf(hs.nodeName) !== -1) {
                      hitHotspotId = hs.id;
                      foundMesh = obj;
                      break;
                    }
                  }
                }
                if (hitHotspotId) break;
                cur = cur.parent;
              }
              if (hitHotspotId) break;
            }
          }

          if (hitHotspotId !== hoveredHotspotId) {
            if (hoveredMesh && hoveredMesh.material && hoveredMeshOrigEmissive !== null) {
              if (hoveredMesh.material.emissive) {
                hoveredMesh.material.emissive.setHex(hoveredMeshOrigEmissive);
              }
            }
            hoveredHotspotId = hitHotspotId;
            hoveredMesh = foundMesh;
            if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
              hoveredMeshOrigEmissive = hoveredMesh.material.emissive.getHex();
              hoveredMesh.material.emissive.setHex(0x553d10);
            } else {
              hoveredMeshOrigEmissive = null;
            }

            threeCanvas.classList.toggle('is-interactive-hover', !!hitHotspotId);
          }
        }
      }, { passive: true });

      // Direct 3D mesh click interaction
      threeCanvas.addEventListener('click', function () {
        if (hoveredHotspotId) {
          SoundEngine.playClick();
          selectHotspot(hoveredHotspotId, true);
        }
      });

      window.addEventListener('resize', onWindowResize, { passive: true });

      // Start render loop
      isRendering = true;
      requestAnimationFrame(renderLoop);

      // Load initial model
      load3DModel('mobo');

      // Observe visibility for power efficiency
      if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            isRendering = e.isIntersecting;
            if (isRendering) requestAnimationFrame(renderLoop);
          });
        }, { threshold: 0.05 });
        obs.observe(viewport);
      }
    } catch (err) {
      console.warn('[labs-3d] WebGL init fallback:', err);
      initFallbackTilt();
    }
  }

  function onWindowResize() {
    if (!renderer || !camera || !viewport) return;
    var w = viewport.clientWidth;
    var h = viewport.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function setupExplodeMetadata(root, modelKey) {
    root.traverse(function (child) {
      if (child.isMesh) {
        var name = child.name || '';
        var init = child.position.clone();
        var offset = new THREE.Vector3(0, 0, 0);

        if (modelKey === 'mobo') {
          if (name.indexOf('VRM') !== -1 || name.indexOf('Heatpipe') !== -1) {
            offset.set(-0.15, 0.45, -0.15);
          } else if (name.indexOf('CPU') !== -1) {
            offset.set(0, 0.55, 0);
          } else if (name.indexOf('RAM') !== -1) {
            offset.set(0.15, 0.40, 0);
          } else if (name.indexOf('M2') !== -1) {
            offset.set(0, 0.35, 0.1);
          } else if (name.indexOf('PCIe') !== -1) {
            offset.set(0, 0.30, 0.2);
          } else if (name.indexOf('Chipset') !== -1) {
            offset.set(0.15, 0.35, 0.2);
          } else if (name.indexOf('ATX') !== -1 || name.indexOf('EPS') !== -1) {
            offset.set(0.2, 0.30, 0);
          } else if (name.indexOf('Cap') !== -1) {
            offset.set(0, 0.25, 0);
          } else if (name.indexOf('IO') !== -1 || name.indexOf('Rear') !== -1) {
            offset.set(-0.35, 0.2, 0);
          }
        } else if (modelKey === 'rj45') {
          if (name.indexOf('Gold_Pin') !== -1) {
            offset.set(0, 0.35, 0);
          } else if (name.indexOf('Housing') !== -1 || name.indexOf('Latch') !== -1) {
            offset.set(0.3, 0.1, 0);
          } else if (name.indexOf('Wire') !== -1 || name.indexOf('Core') !== -1) {
            var pinNum = parseInt(name.replace(/[^0-9]/g, ''), 10) || 4;
            var spreadX = (pinNum - 4.5) * 0.05;
            offset.set(spreadX, 0, 0);
          } else if (name.indexOf('Strain') !== -1 || name.indexOf('Boot') !== -1) {
            offset.set(-0.4, 0, 0);
          } else if (name.indexOf('Jacket') !== -1) {
            offset.set(-0.25, 0, 0);
          }
        } else if (modelKey === 'rack') {
          if (name.indexOf('Switch') !== -1 || name.indexOf('SW_') !== -1) {
            offset.set(0, 0, 0.55);
          } else if (name.indexOf('Cable_Mgmt') !== -1) {
            offset.set(0, 0, 0.45);
          } else if (name.indexOf('Server') !== -1 || name.indexOf('Caddy') !== -1) {
            offset.set(0, 0, 0.85);
          } else if (name.indexOf('UPS') !== -1) {
            offset.set(0, 0, 0.50);
          } else if (name.indexOf('Roof') !== -1) {
            offset.set(0, 0.4, 0);
          } else if (name.indexOf('Side_Panel') !== -1) {
            var isLeft = name.indexOf('Left') !== -1;
            offset.set(isLeft ? -0.5 : 0.5, 0, 0);
          }
        }

        child.userData.initialPos = init;
        child.userData.explodedPos = init.clone().add(offset);
      }
    });
  }

  function load3DModel(modelKey) {
    var model = MODELS[modelKey];
    if (!model || !gltfLoader) return;
    currentModelKey = modelKey;

    setLoaderProgress(20, true);

    if (loadedModels[modelKey]) {
      mountModelScene(loadedModels[modelKey], model);
      setLoaderProgress(100, false);
      return;
    }

    gltfLoader.load(
      model.glb,
      function (gltf) {
        var root = gltf.scene;

        // Auto center bounding box
        var box = new THREE.Box3().setFromObject(root);
        var center = new THREE.Vector3();
        box.getCenter(center);
        root.position.sub(center);

        // Cache original materials
        root.traverse(function (child) {
          if (child.isMesh && child.material) {
            pbrMaterialsMap.set(child, child.material);
          }
        });

        // Setup exploded assembly transforms
        setupExplodeMetadata(root, modelKey);

        // Resolve 3D hotspot coordinates
        resolveHotspotCoordinates(root, model);

        loadedModels[modelKey] = root;
        mountModelScene(root, model);
        setLoaderProgress(100, false);
      },
      function (xhr) {
        if (xhr.lengthComputable && xhr.total > 0) {
          var pct = (xhr.loaded / xhr.total) * 100;
          setLoaderProgress(pct, true);
        }
      },
      function (error) {
        console.warn('[labs-3d] GLTF load fallback to 2D:', error);
        setLoaderProgress(100, false);
        fallbackTo2D(modelKey);
      }
    );
  }

  function resolveHotspotCoordinates(root, model) {
    model.hotspots.forEach(function (hs) {
      var foundNode = null;
      if (hs.nodeName) {
        root.traverse(function (child) {
          if (!foundNode && child.name === hs.nodeName) {
            foundNode = child;
          }
        });
      }
      if (foundNode) {
        var nodeBox = new THREE.Box3().setFromObject(foundNode);
        var nodeCenter = new THREE.Vector3();
        nodeBox.getCenter(nodeCenter);
        hs.worldPos = nodeCenter;
      } else if (hs.fallbackPos) {
        hs.worldPos = new THREE.Vector3(hs.fallbackPos.x, hs.fallbackPos.y, hs.fallbackPos.z);
      } else {
        hs.worldPos = new THREE.Vector3(0, 0, 0);
      }
    });
  }

  function mountModelScene(root, model) {
    if (currentModelRoot) {
      scene.remove(currentModelRoot);
    }
    currentModelRoot = root;
    scene.add(root);

    // Ground Contact Shadow positioning per model
    if (!groundShadowMesh) {
      groundShadowMesh = createGroundContactShadow();
      if (groundShadowMesh) scene.add(groundShadowMesh);
    }
    if (groundShadowMesh) {
      if (currentModelKey === 'rack') {
        groundShadowMesh.position.set(0, -1.55, 0);
        groundShadowMesh.scale.set(1.4, 1.4, 1.4);
      } else if (currentModelKey === 'rj45') {
        groundShadowMesh.position.set(0, -0.30, 0);
        groundShadowMesh.scale.set(0.7, 0.7, 0.7);
      } else {
        groundShadowMesh.position.set(0, -0.06, 0);
        groundShadowMesh.scale.set(1.15, 1.15, 1.15);
      }
    }

    // Shadow mapping & PBR physical enhancements on all child meshes
    root.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.envMapIntensity = 1.35;
          var n = (child.name || '').toLowerCase();
          if (n.indexOf('pin') !== -1 || n.indexOf('gold') !== -1) {
            child.material.metalness = 0.98;
            child.material.roughness = 0.10;
          }
          if (n.indexOf('housing') !== -1 || n.indexOf('polycarbonate') !== -1) {
            child.material.roughness = 0.06;
            child.material.transparent = true;
            child.material.opacity = 0.38;
          }
          if (child.material.emissive && child.material.emissive.getHex() > 0) {
            child.material.emissiveIntensity = 2.5;
          }
        }
      }
    });

    // Discover interactive mechanical micro-nodes
    interactiveMechNodes.lever = null;
    interactiveMechNodes.loadPlate = null;
    interactiveMechNodes.caddy = null;
    interactiveMechNodes.clip = null;

    root.traverse(function (child) {
      var n = child.name || '';
      if (n.indexOf('Lever') !== -1 || n.indexOf('Retention_Frame') !== -1) {
        interactiveMechNodes.lever = child;
        child.userData.origRot = child.rotation.clone();
      }
      if (n.indexOf('Plate') !== -1 || n.indexOf('Load') !== -1) {
        interactiveMechNodes.loadPlate = child;
        child.userData.origRot = child.rotation.clone();
      }
      if (n.indexOf('Caddy') !== -1) {
        if (!interactiveMechNodes.caddy) {
          interactiveMechNodes.caddy = child;
          child.userData.origPos = child.position.clone();
        }
      }
      if (n.indexOf('Latch') !== -1 || n.indexOf('Clip') !== -1) {
        interactiveMechNodes.clip = child;
        child.userData.origRot = child.rotation.clone();
      }
    });

    // Reset interactive mechanical action state
    isActionEngaged = false;
    currentActionLerp = 0.0;
    targetActionLerp = 0.0;
    var actLabel = document.getElementById('btn-tool-action-label');
    var btnToolAct = document.getElementById('btn-tool-action');
    if (btnToolAct) btnToolAct.classList.remove('is-active');
    if (actLabel) {
      if (currentModelKey === 'mobo') actLabel.textContent = 'Socket Lever';
      else if (currentModelKey === 'rj45') actLabel.textContent = 'Flex Latch';
      else if (currentModelKey === 'rack') actLabel.textContent = 'Eject Caddy';
    }

    applyShadingMode(isWireframe);

    var camStart = model.cameraStart || { x: 0, y: 1.4, z: 2.0 };
    var tgtStart = model.targetStart || { x: 0, y: 0, z: 0 };

    camera.position.set(camStart.x, camStart.y, camStart.z);
    controls.target.set(tgtStart.x, tgtStart.y, tgtStart.z);
    controls.update();

    currentExplodeFactor = 0.0;
    targetExplodeFactor = isExploded ? 1.0 : 0.0;

    renderHotspotsDOM(model);

    if (imgEl) imgEl.style.opacity = '0';
    if (threeCanvas) threeCanvas.style.opacity = '1';
  }

  function applyShadingMode(wireframe) {
    isWireframe = wireframe;
    if (!currentModelRoot) return;

    currentModelRoot.traverse(function (child) {
      if (child.isMesh) {
        if (isWireframe) {
          child.material = wireframeMaterial;
        } else {
          var orig = pbrMaterialsMap.get(child);
          if (orig) child.material = orig;
        }
      }
    });
  }

  function renderHotspotsDOM(model) {
    hotspotsContainer.innerHTML = '';
    model.hotspots.forEach(function (hs) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'labs-hotspot';
      btn.id = 'hs-pin-' + hs.id;
      btn.setAttribute('aria-label', hs.title + ' (' + hs.obj + ')');
      btn.setAttribute('data-hotspot-id', hs.id);

      var pulse = document.createElement('span');
      pulse.className = 'labs-hotspot__pulse';
      pulse.setAttribute('aria-hidden', 'true');

      var dot = document.createElement('span');
      dot.className = 'labs-hotspot__dot';
      dot.setAttribute('aria-hidden', 'true');

      var tag = document.createElement('span');
      tag.className = 'labs-hotspot__label';
      tag.textContent = hs.label;

      btn.appendChild(pulse);
      btn.appendChild(dot);
      btn.appendChild(tag);

      btn.addEventListener('click', function () {
        SoundEngine.playClick();
        selectHotspot(hs.id, true);
      });
      btn.addEventListener('mouseenter', function () {
        SoundEngine.playHover();
      });

      hotspotsContainer.appendChild(btn);
    });

    if (pillListContainer) {
      pillListContainer.innerHTML = '';
      model.hotspots.forEach(function (hs) {
        var pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'labs-inspector__pill';
        pill.id = 'hs-pill-' + hs.id;
        pill.setAttribute('data-hotspot-id', hs.id);
        pill.textContent = hs.label;
        pill.addEventListener('click', function () {
          SoundEngine.playClick();
          selectHotspot(hs.id, true);
        });
        pill.addEventListener('mouseenter', function () {
          SoundEngine.playHover();
        });
        pillListContainer.appendChild(pill);
      });
    }

    var targetId = model.defaultHotspot || model.hotspots[0].id;
    selectHotspot(targetId, false);
  }

  function selectHotspot(hotspotId, animateCamera) {
    var model = MODELS[currentModelKey];
    if (!model) return;

    var hs = null;
    for (var i = 0; i < model.hotspots.length; i++) {
      if (model.hotspots[i].id === hotspotId) {
        hs = model.hotspots[i];
        break;
      }
    }
    if (!hs) return;
    currentHotspotId = hotspotId;

    var allPins = hotspotsContainer.querySelectorAll('.labs-hotspot');
    allPins.forEach(function (p) {
      var on = p.getAttribute('data-hotspot-id') === hotspotId;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    if (pillListContainer) {
      var allPills = pillListContainer.querySelectorAll('.labs-inspector__pill');
      allPills.forEach(function (pill) {
        var on = pill.getAttribute('data-hotspot-id') === hotspotId;
        pill.classList.toggle('is-active', on);
        pill.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    if (objTagEl) objTagEl.textContent = hs.obj;
    if (compTitleEl) compTitleEl.textContent = hs.title;
    if (compDescEl) compDescEl.textContent = hs.desc;
    if (compTakeawayEl) compTakeawayEl.textContent = hs.takeaway;

    if (animateCamera && camera && hs.worldPos && !prefersReducedMotion) {
      var offset = hs.cameraOffset || { x: 0, y: 0.4, z: 0.5 };
      flyTo(
        new THREE.Vector3(hs.worldPos.x + offset.x, hs.worldPos.y + offset.y, hs.worldPos.z + offset.z),
        hs.worldPos,
        900
      );
    }
  }

  function flyTo(endPos, endLook, duration) {
    if (!camera || !controls) return;
    startCamPos = camera.position.clone();
    startCamLook = controls.target.clone();
    targetCamPos = endPos.clone();
    targetCamLook = endLook.clone();
    tweenDuration = duration || 800;
    tweenStartTime = performance.now();
    isTweening = true;
    controls.autoRotate = false;
  }

  function renderLoop(time) {
    if (!isRendering) return;

    if (isTweening) {
      var elapsed = time - tweenStartTime;
      var progress = Math.min(1.0, elapsed / tweenDuration);
      var ease = 1 - Math.pow(1 - progress, 4);

      camera.position.lerpVectors(startCamPos, targetCamPos, ease);
      controls.target.lerpVectors(startCamLook, targetCamLook, ease);

      if (progress >= 1.0) {
        isTweening = false;
      }
    }

    controls.update();

    // Exploded View Assembly Lerp
    if (Math.abs(targetExplodeFactor - currentExplodeFactor) > 0.001) {
      currentExplodeFactor += (targetExplodeFactor - currentExplodeFactor) * 0.12;
      if (currentModelRoot) {
        currentModelRoot.traverse(function (child) {
          if (child.isMesh && child.userData && child.userData.initialPos && child.userData.explodedPos) {
            child.position.lerpVectors(child.userData.initialPos, child.userData.explodedPos, currentExplodeFactor);
          }
        });
        if (currentModelKey && MODELS[currentModelKey]) {
          resolveHotspotCoordinates(currentModelRoot, MODELS[currentModelKey]);
        }
      }
    }

    // Interactive Mechanical Action Lerp (Socket lever swing, drive caddy slide, latch flex)
    if (Math.abs(targetActionLerp - currentActionLerp) > 0.001) {
      currentActionLerp += (targetActionLerp - currentActionLerp) * 0.14;
      if (interactiveMechNodes.lever && interactiveMechNodes.lever.userData && interactiveMechNodes.lever.userData.origRot) {
        interactiveMechNodes.lever.rotation.z = interactiveMechNodes.lever.userData.origRot.z - currentActionLerp * 0.72;
      }
      if (interactiveMechNodes.loadPlate && interactiveMechNodes.loadPlate.userData && interactiveMechNodes.loadPlate.userData.origRot) {
        interactiveMechNodes.loadPlate.rotation.x = interactiveMechNodes.loadPlate.userData.origRot.x + currentActionLerp * 0.60;
      }
      if (interactiveMechNodes.caddy && interactiveMechNodes.caddy.userData && interactiveMechNodes.caddy.userData.origPos) {
        interactiveMechNodes.caddy.position.z = interactiveMechNodes.caddy.userData.origPos.z + currentActionLerp * 0.40;
      }
      if (interactiveMechNodes.clip && interactiveMechNodes.clip.userData && interactiveMechNodes.clip.userData.origRot) {
        interactiveMechNodes.clip.rotation.z = interactiveMechNodes.clip.userData.origRot.z - currentActionLerp * 0.30;
      }
    }

    // 3D Hotspot Screen Space Projection + Raycast Occlusion Detection
    if (camera && viewport && currentModelKey && MODELS[currentModelKey]) {
      var w = viewport.clientWidth;
      var h = viewport.clientHeight;
      var model = MODELS[currentModelKey];

      model.hotspots.forEach(function (hs) {
        if (!hs.worldPos) return;
        var pin = document.getElementById('hs-pin-' + hs.id);
        if (!pin) return;

        var v = hs.worldPos.clone();
        v.project(camera);

        // Outside frustum or behind camera plane
        if (v.z > 1.0 || v.x < -1.15 || v.x > 1.15 || v.y < -1.15 || v.y > 1.15) {
          pin.style.display = 'none';
          return;
        }

        // Surface occlusion test
        var isOccluded = false;
        if (currentModelRoot && raycaster && camToTarget) {
          camToTarget.subVectors(hs.worldPos, camera.position);
          var dist = camToTarget.length();
          raycaster.set(camera.position, camToTarget.normalize());
          var hits = raycaster.intersectObjects(currentModelRoot.children, true);
          if (hits.length > 0 && hits[0].distance < dist - 0.05) {
            isOccluded = true;
          }
        }

        pin.style.display = 'flex';
        pin.classList.toggle('is-occluded', isOccluded);

        var px = (v.x * 0.5 + 0.5) * w;
        var py = (-v.y * 0.5 + 0.5) * h;
        pin.style.left = px.toFixed(1) + 'px';
        pin.style.top = py.toFixed(1) + 'px';
      });
    }

    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  }

  // ---------------------------------------------------------------------------
  // 5. Fallback 2D Perspective Tilt Engine (Rock-Solid Resilience)
  // ---------------------------------------------------------------------------
  function initFallbackTilt() {
    if (threeCanvas) threeCanvas.style.display = 'none';
    if (imgEl) imgEl.style.opacity = '1';
    render2DModel(currentModelKey);

    var isHovering = false;
    var targetRotX = 0;
    var targetRotY = 0;
    var curRotX = 0;
    var curRotY = 0;
    var animFrame = null;

    function updateTilt() {
      if (prefersReducedMotion) {
        viewport.style.transform = 'none';
        return;
      }
      curRotX += (targetRotX - curRotX) * 0.12;
      curRotY += (targetRotY - curRotY) * 0.12;
      var scale = isHovering ? 1.02 : 1.0;
      viewport.style.transform = 'perspective(1200px) rotateX(' + curRotX.toFixed(2) + 'deg) rotateY(' + curRotY.toFixed(2) + 'deg) scale3d(' + scale + ',' + scale + ',1)';

      if (isHovering || Math.abs(curRotX) > 0.05 || Math.abs(curRotY) > 0.05) {
        animFrame = requestAnimationFrame(updateTilt);
      } else {
        animFrame = null;
        viewport.style.transform = 'none';
      }
    }

    canvasWrap.addEventListener('mouseenter', function () {
      isHovering = true;
      if (!animFrame) animFrame = requestAnimationFrame(updateTilt);
    });
    canvasWrap.addEventListener('mousemove', function (e) {
      var rect = canvasWrap.getBoundingClientRect();
      var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      var ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetRotY = nx * 8.5;
      targetRotX = -ny * 6.5;
      if (sheen) {
        sheen.style.backgroundPosition = ((nx + 1) * 50) + '% ' + ((ny + 1) * 50) + '%';
        sheen.style.opacity = '1';
      }
      if (!animFrame) animFrame = requestAnimationFrame(updateTilt);
    });
    canvasWrap.addEventListener('mouseleave', function () {
      isHovering = false;
      targetRotX = 0;
      targetRotY = 0;
      if (sheen) sheen.style.opacity = '0';
      if (!animFrame) animFrame = requestAnimationFrame(updateTilt);
    });
  }

  function fallbackTo2D(modelKey) {
    if (statusBadge) {
      var txt = document.getElementById('labs-badge-text');
      if (txt) txt.textContent = 'High-Precision Stage';
    }
    if (threeCanvas) threeCanvas.style.display = 'none';
    if (imgEl) imgEl.style.opacity = '1';
    render2DModel(modelKey);
  }

  function render2DModel(modelKey) {
    var model = MODELS[modelKey];
    if (!model || !imgEl) return;
    imgEl.src = model.img1200;
    imgEl.srcset = model.img600 + ' 600w, ' + model.img1200 + ' 1200w';
    imgEl.alt = model.alt;

    hotspotsContainer.innerHTML = '';
    model.hotspots.forEach(function (hs) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'labs-hotspot';
      btn.id = 'hs-pin-' + hs.id;
      btn.style.left = hs.x + '%';
      btn.style.top = hs.y + '%';
      btn.setAttribute('aria-label', hs.title + ' (' + hs.obj + ')');
      btn.setAttribute('data-hotspot-id', hs.id);

      var pulse = document.createElement('span');
      pulse.className = 'labs-hotspot__pulse';
      pulse.setAttribute('aria-hidden', 'true');

      var dot = document.createElement('span');
      dot.className = 'labs-hotspot__dot';
      dot.setAttribute('aria-hidden', 'true');

      var tag = document.createElement('span');
      tag.className = 'labs-hotspot__label';
      tag.textContent = hs.label;

      btn.appendChild(pulse);
      btn.appendChild(dot);
      btn.appendChild(tag);

      btn.addEventListener('click', function () {
        SoundEngine.playClick();
        selectHotspot(hs.id, false);
      });
      hotspotsContainer.appendChild(btn);
    });

    selectHotspot(model.defaultHotspot || model.hotspots[0].id, false);
  }

  // ---------------------------------------------------------------------------
  // 6. Toolbar & Control Handlers
  // ---------------------------------------------------------------------------
  var btnModePbr = document.getElementById('btn-mode-pbr');
  var btnModeWire = document.getElementById('btn-mode-wire');
  var btnModeExplode = document.getElementById('btn-mode-explode');
  var btnCamHero = document.getElementById('btn-cam-hero');
  var btnCamTop = document.getElementById('btn-cam-top');
  var btnToolAction = document.getElementById('btn-tool-action');
  var btnToolRotate = document.getElementById('btn-tool-rotate');
  var btnToolReset = document.getElementById('btn-tool-reset');
  var btnToolSound = document.getElementById('btn-tool-sound');

  if (btnCamHero) {
    btnCamHero.addEventListener('click', function () {
      SoundEngine.playClick();
      btnCamHero.classList.add('is-active');
      if (btnCamTop) btnCamTop.classList.remove('is-active');
      var model = MODELS[currentModelKey];
      if (model && camera && controls) {
        var c = model.cameraStart || { x: 0, y: 1.4, z: 2.0 };
        var t = model.targetStart || { x: 0, y: 0, z: 0 };
        flyTo(new THREE.Vector3(c.x, c.y, c.z), new THREE.Vector3(t.x, t.y, t.z), 700);
      }
    });
  }

  if (btnCamTop) {
    btnCamTop.addEventListener('click', function () {
      SoundEngine.playClick();
      btnCamTop.classList.add('is-active');
      if (btnCamHero) btnCamHero.classList.remove('is-active');
      var topY = currentModelKey === 'rack' ? 3.4 : 2.5;
      flyTo(new THREE.Vector3(0, topY, 0.001), new THREE.Vector3(0, 0, 0), 700);
    });
  }

  if (btnToolAction) {
    btnToolAction.addEventListener('click', function () {
      SoundEngine.playEngage();
      isActionEngaged = !isActionEngaged;
      targetActionLerp = isActionEngaged ? 1.0 : 0.0;
      btnToolAction.classList.toggle('is-active', isActionEngaged);
      var actLabel = document.getElementById('btn-tool-action-label');
      if (actLabel) {
        if (currentModelKey === 'mobo') actLabel.textContent = isActionEngaged ? 'Close Socket' : 'Socket Lever';
        else if (currentModelKey === 'rj45') actLabel.textContent = isActionEngaged ? 'Release Latch' : 'Flex Latch';
        else if (currentModelKey === 'rack') actLabel.textContent = isActionEngaged ? 'Insert Tray' : 'Eject Caddy';
      }
    });
  }

  if (btnModePbr && btnModeWire) {
    btnModePbr.addEventListener('click', function () {
      SoundEngine.playClick();
      btnModePbr.classList.add('is-active');
      btnModeWire.classList.remove('is-active');
      applyShadingMode(false);
    });

    btnModeWire.addEventListener('click', function () {
      SoundEngine.playClick();
      btnModeWire.classList.add('is-active');
      btnModePbr.classList.remove('is-active');
      applyShadingMode(true);
    });
  }

  if (btnModeExplode) {
    btnModeExplode.addEventListener('click', function () {
      SoundEngine.playClick();
      isExploded = !isExploded;
      targetExplodeFactor = isExploded ? 1.0 : 0.0;
      btnModeExplode.classList.toggle('is-active', isExploded);
      btnModeExplode.setAttribute('aria-pressed', isExploded ? 'true' : 'false');
    });
  }

  if (btnToolRotate) {
    btnToolRotate.addEventListener('click', function () {
      SoundEngine.playClick();
      isAutoRotate = !isAutoRotate;
      if (controls) controls.autoRotate = isAutoRotate && !prefersReducedMotion;
      btnToolRotate.classList.toggle('is-active', isAutoRotate);
      btnToolRotate.setAttribute('aria-pressed', isAutoRotate ? 'true' : 'false');
    });
  }

  if (btnToolReset) {
    btnToolReset.addEventListener('click', function () {
      SoundEngine.playEngage();
      var model = MODELS[currentModelKey];
      if (model && camera && controls) {
        var c = model.cameraStart || { x: 0, y: 1.4, z: 2.0 };
        var t = model.targetStart || { x: 0, y: 0, z: 0 };
        flyTo(new THREE.Vector3(c.x, c.y, c.z), new THREE.Vector3(t.x, t.y, t.z), 700);
      }
    });
  }

  function updateSoundButtonUI(muted) {
    if (!btnToolSound) return;
    btnToolSound.classList.toggle('is-active', !muted);
    btnToolSound.setAttribute('aria-pressed', muted ? 'false' : 'true');
    var onIcon = document.getElementById('icon-sound-on');
    var offIcon = document.getElementById('icon-sound-off');
    if (onIcon && offIcon) {
      onIcon.classList.toggle('is-hidden', muted);
      offIcon.classList.toggle('is-hidden', !muted);
    }
  }

  if (btnToolSound) {
    updateSoundButtonUI(SoundEngine.isMuted());
    btnToolSound.addEventListener('click', function () {
      var muted = !SoundEngine.isMuted();
      SoundEngine.setMuted(muted);
      updateSoundButtonUI(muted);
      if (!muted) SoundEngine.playEngage();
    });
  }

  // Model Tab Switcher
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var modelKey = tab.getAttribute('data-model');
      if (modelKey && MODELS[modelKey] && modelKey !== currentModelKey) {
        SoundEngine.playEngage();
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
        });

        if (renderer && gltfLoader) {
          load3DModel(modelKey);
        } else {
          fallbackTo2D(modelKey);
        }
      }
    });
  });

  // Boot Engine
  initThreeEngine();
})();
