/**
 * app-3d-stage.js - 10x Interactive 3D WebGL Hardware Inspection Suite for Clariora App
 * File: js/app-3d-stage.js
 *
 * Capabilities:
 * 1. On-demand dynamic Three.js & GLTF loader (zero impact on initial app bundle size).
 * 2. Photorealistic PBR Studio Lighting Rig (Key, Fill, Rim, Ambient, Hemisphere).
 * 3. Procedural HDR Studio Reflection Environment for realistic metallic gleam.
 * 4. PCF Soft Directional Shadows & procedural ground contact occlusion disc.
 * 5. Direct 3D Mesh Hover Raycasting (gold emissive highlight & pointer cursor).
 * 6. Interactive mechanical micro-animations (socket lever/plate, server caddy, cable latch).
 * 7. Exploded assembly layering and Cyber-Gold wireframe inspection mode.
 * 8. Camera Director presets: Hero perspective vs Top blueprint plan view.
 * 9. Built-in Web Audio API tactile feedback synthesizer (100% offline).
 * 10. Resilient 2D perspective tilt fallback if WebGL is unavailable or disabled.
 */

(function (window) {
  'use strict';

  window.APlus = window.APlus || {};

  var escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || function (s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  // ---------------------------------------------------------------------------
  // 1. Audio Synthesizer (Web Audio API - 100% offline, zero asset footprint)
  // ---------------------------------------------------------------------------
  var Sound = (function () {
    var ctx = null;
    var isMuted = false;

    try {
      isMuted = localStorage.getItem('clariora_app_3d_muted') === '1';
    } catch (_) {
      isMuted = false;
    }

    function getCtx() {
      if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
        var AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
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
      toggleMute: function () {
        isMuted = !isMuted;
        try {
          localStorage.setItem('clariora_app_3d_muted', isMuted ? '1' : '0');
        } catch (_) {}
        return isMuted;
      },
      playClick: function () {
        if (isMuted) return;
        var c = getCtx();
        if (!c) return;
        try {
          var t = c.currentTime;
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, t);
          osc.frequency.exponentialRampToValueAtTime(320, t + 0.04);
          gain.gain.setValueAtTime(0.06, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(t);
          osc.stop(t + 0.045);
        } catch (_) {}
      },
      playHover: function () {
        if (isMuted) return;
        var c = getCtx();
        if (!c) return;
        try {
          var t = c.currentTime;
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1240, t);
          gain.gain.setValueAtTime(0.02, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(t);
          osc.stop(t + 0.025);
        } catch (_) {}
      },
      playEngage: function () {
        if (isMuted) return;
        var c = getCtx();
        if (!c) return;
        try {
          var t = c.currentTime;
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, t);
          osc.frequency.exponentialRampToValueAtTime(659.25, t + 0.09);
          gain.gain.setValueAtTime(0.05, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(t);
          osc.stop(t + 0.13);
        } catch (_) {}
      },
      playSnap: function () {
        if (isMuted) return;
        var c = getCtx();
        if (!c) return;
        try {
          var t = c.currentTime;
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1400, t);
          osc.frequency.exponentialRampToValueAtTime(180, t + 0.05);
          gain.gain.setValueAtTime(0.09, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(t);
          osc.stop(t + 0.06);
        } catch (_) {}
      },
      playError: function () {
        if (isMuted) return;
        var c = getCtx();
        if (!c) return;
        try {
          var t = c.currentTime;
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, t);
          osc.frequency.setValueAtTime(140, t + 0.08);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(t);
          osc.stop(t + 0.18);
        } catch (_) {}
      },
      playPostChime: function () {
        if (isMuted) return;
        var c = getCtx();
        if (!c) return;
        try {
          var t = c.currentTime;
          var osc1 = c.createOscillator();
          var gain1 = c.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(987.77, t);
          gain1.gain.setValueAtTime(0.06, t);
          gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          osc1.connect(gain1);
          gain1.connect(c.destination);
          osc1.start(t);
          osc1.stop(t + 0.24);

          var osc2 = c.createOscillator();
          var gain2 = c.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1318.51, t + 0.12);
          gain2.gain.setValueAtTime(0.07, t + 0.12);
          gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
          osc2.connect(gain2);
          gain2.connect(c.destination);
          osc2.start(t + 0.12);
          osc2.stop(t + 0.48);
        } catch (_) {}
      },
      playThermalProbe: function () {
        if (isMuted) return;
        var c = getCtx();
        if (!c) return;
        try {
          var t = c.currentTime;
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1760, t);
          osc.frequency.exponentialRampToValueAtTime(2637, t + 0.04);
          gain.gain.setValueAtTime(0.04, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(t);
          osc.stop(t + 0.055);
        } catch (_) {}
      },
      playRatchetCrimp: function () {
        if (isMuted) return;
        var c = getCtx();
        if (!c) return;
        try {
          var t = c.currentTime;
          [0, 0.05, 0.11].forEach(function (dt, idx) {
            var osc = c.createOscillator();
            var gain = c.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520 + idx * 110, t + dt);
            osc.frequency.exponentialRampToValueAtTime(180, t + dt + 0.035);
            gain.gain.setValueAtTime(0.08, t + dt);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.04);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(t + dt);
            osc.stop(t + dt + 0.045);
          });
        } catch (_) {}
      },
      playTiltAlarm: function () {
        if (isMuted) return;
        var c = getCtx();
        if (!c) return;
        try {
          var t = c.currentTime;
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, t);
          osc.frequency.setValueAtTime(660, t + 0.09);
          osc.frequency.setValueAtTime(880, t + 0.18);
          gain.gain.setValueAtTime(0.07, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(t);
          osc.stop(t + 0.30);
        } catch (_) {}
      }
    };
  })();

  // ---------------------------------------------------------------------------
  // 2. Hardware Catalog Definitions
  // ---------------------------------------------------------------------------
  var MODELS = {
    mobo: {
      id: 'mobo',
      title: 'ATX Workstation Motherboard',
      obj: 'CompTIA A+ Core 1 · Obj 3.4',
      glbCandidates: ['media/hardware/motherboard.glb', 'landing/models/motherboard.glb'],
      fallbackImg: 'media/hardware/motherboard.png',
      defaultHotspot: 'socket',
      cameraStart: { x: 0, y: 1.35, z: 1.65 },
      targetStart: { x: 0, y: 0, z: 0 },
      actionLabel: 'Socket Lever',
      actionActiveLabel: 'Close Socket',
      hotspots: [
        {
          id: 'socket',
          nodeName: 'CPU_Retention_Frame',
          label: 'LGA 1700 CPU Socket',
          subsystem: 'CPU Socket Architecture',
          desc: 'Land Grid Array (LGA) package with contact pins situated on the motherboard socket rather than on the processor package. Pin 1 golden triangle alignment is mandatory to protect pins. ZIF retention lever clamps the Integrated Heat Spreader.',
          takeaway: 'Intel LGA 1700 and AMD AM5 use LGA sockets. Contrast with legacy AMD AM4 Pin Grid Array (PGA) where pins were soldered onto the CPU substrate.',
          troubleshooting: 'Inspect for bent pins with magnifying lens and oblique light. A bent pin causes memory channel dropouts or no-POST error codes (e.g. 00 or 55).'
        },
        {
          id: 'ram',
          nodeName: 'RAM_Slot_0',
          label: 'DDR5 DIMM Slots',
          subsystem: 'Memory Architecture',
          desc: 'DDR5 288-pin DIMM slot with off-center keying notch. To enable 128-bit dual-channel bandwidth, modules must be installed in alternating matched channels (typically A2 and B2).',
          takeaway: 'DDR5 operates at 1.1V and integrates on-module Power Management ICs (PMIC) and on-die ECC for internal bit-flip correction.',
          troubleshooting: 'Reseat modules with firm downward pressure until both retention clips snap shut. Uneven seating triggers continuous beep codes.'
        },
        {
          id: 'pcie',
          nodeName: 'PCIe_x16_1_Body',
          label: 'PCIe 4.0 x16 Primary Slot',
          subsystem: 'Expansion Bus',
          desc: 'Full-length 16-lane serial bus wired directly to CPU lanes for discrete graphics accelerators. Features steel shielding armor and an end retention lock bracket.',
          takeaway: 'PCIe 4.0 delivers 16 GT/s per lane (~2 GB/s per lane, up to 32 GB/s bidirectional throughput across 16 lanes). Full backward and forward compatibility.',
          troubleshooting: 'Ensure the rear chassis expansion bracket screw is firmly secured. Slot sag can shear PCIe lane solder contacts under heavy GPU thermal cycles.'
        },
        {
          id: 'm2',
          nodeName: 'M2_Heatshield',
          label: 'M.2 NVMe SSD Slot (2280)',
          subsystem: 'High-Speed Storage',
          desc: 'Key M socket supporting 4 PCIe lanes direct to CPU/chipset. Accommodates standard 2280 form factor (22mm wide by 80mm long) with thick extruded aluminum heatshield.',
          takeaway: 'NVMe protocol communicates directly over PCIe with 64,000 queues of 64,000 commands each, far outstripping legacy AHCI/SATA III 550 MB/s ceilings.',
          troubleshooting: 'Always remove the blue plastic protective film from the underside thermal pad before securing the M.2 thumbscrew to prevent thermal throttling.'
        },
        {
          id: 'power',
          nodeName: 'ATX_24Pin_Housing',
          label: '24-Pin ATX Main Power',
          subsystem: 'Power Delivery',
          desc: 'Primary DC system voltage header from the power supply unit (+3.3V, +5V, +12V, -12V, and +5VSB standby rails). Keyed plastic latch prevents reversed insertion.',
          takeaway: 'Standard operating voltages: Yellow wires measure +12V DC, Red wires measure +5V DC, and Orange wires measure +3.3V DC within +/- 5% tolerance.',
          troubleshooting: 'Use a digital multimeter or 24-pin PSU paperclip jump test (Green PS_ON to Black Ground) to verify cooling fan spin-up and standby rails.'
        },
        {
          id: 'chipset',
          nodeName: 'Chipset_Heatsink',
          label: 'Platform Controller Hub (PCH)',
          subsystem: 'Chipset Architecture',
          desc: 'Single-chip Southbridge successor controlling SATA ports, USB hubs, audio codecs, Gigabit Ethernet, and secondary PCIe slots, communicating with CPU over DMI.',
          takeaway: 'Modern motherboards merge Northbridge memory controllers into the CPU die, leaving secondary peripheral multiplexing to the PCH.',
          troubleshooting: 'PCH overheating causes sporadic USB disconnects and SATA drive dropouts under sustained I/O load. Ensure adequate case airflow.'
        }
      ]
    },

    rj45: {
      id: 'rj45',
      title: 'RJ-45 Modular Connector (8P8C)',
      obj: 'CompTIA A+ Core 1 · Obj 2.1',
      glbCandidates: ['media/hardware/rj45_connector.glb', 'landing/models/rj45_connector.glb'],
      fallbackImg: 'media/hardware/rj45_connector.png',
      defaultHotspot: 'pins',
      cameraStart: { x: 0.4, y: 0.3, z: 0.8 },
      targetStart: { x: 0, y: 0, z: 0 },
      actionLabel: 'Flex Latch',
      actionActiveLabel: 'Release Latch',
      hotspots: [
        {
          id: 'pins',
          nodeName: 'Gold_Pin_4',
          label: '8 Gold Contact Blades',
          subsystem: 'Physical Interface',
          desc: 'Eight phosphor bronze contact blades plated with 50-micron gold. Crimping forces insulation-displacement contact (IDC) prongs through wire insulation to create gas-tight seals.',
          takeaway: 'T568B pinout sequence (Pin 1 to 8): White/Orange, Orange, White/Green, Blue, White/Blue, Green, White/Brown, Brown. T568A transposes green and orange pairs.',
          troubleshooting: 'Check pins with a wire map cable tester. A misaligned blade causes intermittent gigabit autonegotiation drops down to 100 Mbps.'
        },
        {
          id: 'conductors',
          nodeName: 'Conductor_Wire_4',
          label: 'Twisted Conductor Pairs',
          subsystem: 'Differential Signaling',
          desc: 'Four differential twisted pairs (23 AWG solid copper). Strict twisting geometry ensures electromagnetic common-mode noise cancellation across the run.',
          takeaway: 'ANSI/TIA-568 standard: Never untwist pairs more than 0.5 inches (13mm) during termination. Excessive untwisting creates catastrophic Near-End Crosstalk (NEXT).',
          troubleshooting: 'Split-pair wiring mistakes occur when pins 3 & 6 or 4 & 5 are mixed across pairs. Continuity testers pass split pairs, but packet loss destroys link quality.'
        },
        {
          id: 'housing',
          nodeName: 'RJ45_Housing_Head',
          label: 'Clear Polycarbonate Shell',
          subsystem: 'Connector Body',
          desc: 'Optical-grade transparent thermoplastic housing allows the technician to verify wire sequence and jacket depth before applying crimp pressure.',
          takeaway: 'The outer cable jacket must penetrate inside the connector body past the strain relief wedge. Exposed bare twisted pairs violate commercial cabling specs.',
          troubleshooting: 'A snapped retention clip is the #1 physical cause of drops in patch panels. Replace connector or deploy a snagless protective boot.'
        },
        {
          id: 'strain',
          nodeName: 'Strain_Boot_Body',
          label: 'Snagless Strain Relief Boot',
          subsystem: 'Mechanical Protection',
          desc: 'Flexible molded rubber boot that prevents tight bend radiuses at the termination point and guards the cantilever latch from snagging during cable pulls.',
          takeaway: 'Minimum bend radius rule: Cat6/6A cables must maintain a bend radius at least 4 times the outer cable diameter to avoid impedance bumps.',
          troubleshooting: 'Do not yank patch cords by the cable jacket. Pull strictly by the connector body with the latch depressed.'
        }
      ]
    },

    rack: {
      id: 'rack',
      title: '42U Datacenter Equipment Rack',
      obj: 'CompTIA A+ Core 1 · Obj 3.3',
      glbCandidates: ['media/hardware/datacenter_rack.glb', 'landing/models/datacenter_rack.glb'],
      fallbackImg: 'media/hardware/datacenter_rack.png',
      defaultHotspot: 'switch',
      cameraStart: { x: 0, y: 1.8, z: 3.2 },
      targetStart: { x: 0, y: 1.1, z: 0 },
      actionLabel: 'Eject Caddy',
      actionActiveLabel: 'Insert Tray',
      hotspots: [
        {
          id: 'switch',
          nodeName: 'Switch_1U_Faceplate',
          label: 'Top-of-Rack (ToR) Switch',
          subsystem: 'Rack Aggregation',
          desc: '48-port 10GbE SFP+ managed network switch mounted at U41-U42. Aggregates short intra-rack DAC copper or optical jumpers from each server chassis.',
          takeaway: 'ToR network topologies minimize cable runs between racks, eliminating heavy cable bundles traversing overhead ladders or raised floors.',
          troubleshooting: 'Verify port activity LEDs: solid green denotes link established; blinking amber denotes active traffic; dark denotes disconnected cable or shut port.'
        },
        {
          id: 'server',
          nodeName: 'Server_2U_Bezel',
          label: '2U Compute Server & Drive Caddies',
          subsystem: 'Server Architecture',
          desc: 'Dual-socket compute chassis equipped with redundant hot-swap power supplies, sliding rail kit, and front-accessible 2.5-inch SAS/NVMe drive bays.',
          takeaway: '1U equals 1.75 inches (44.45mm). Equipment mounting rails comply with the EIA-310 standard with standardized 19-inch width.',
          troubleshooting: 'Hot-swap drive failure: Identify blinking amber fault LED. Never pull an unfailed drive from a rebuilding RAID array.'
        },
        {
          id: 'ups',
          nodeName: 'UPS_3U_Front_Bezel',
          label: '3U Online UPS Battery Unit',
          subsystem: 'Power Continuity',
          desc: 'Double-conversion uninterruptible power supply providing battery backup and line conditioning. Heavy lead-acid or Li-ion battery pack mounted at the base (U1-U3).',
          takeaway: 'Safety Rule: Always install heaviest equipment (UPS, SAN disk arrays) at the lowest rack units (U1-U3) to maintain a low center of gravity and prevent tipping hazards.',
          troubleshooting: 'Audible alarm beep patterns denote utility power loss or dead battery cells requiring hot-swap module replacement.'
        },
        {
          id: 'patch',
          nodeName: 'Cable_Mgmt_1U',
          label: 'Horizontal Cable Management',
          subsystem: 'Airflow & Cabling',
          desc: '1U horizontal brush/finger duct maintaining orderly patch cord routing and preventing cable strain from blocking front-to-back chassis cooling airflow.',
          takeaway: 'Datacenters separate cold aisles (equipment front air intake) from hot aisles (equipment rear exhaust). Blanking panels must be installed in unused slots.',
          troubleshooting: 'Unmanaged cabling dangling across exhaust louvers causes server thermal throttling and emergency fan spin-up.'
        }
      ]
    }
  };

  // ---------------------------------------------------------------------------
  // 2B. Direct 3D Spatial Assembly Simulator Definitions (Motherboard Lab 6)
  // ---------------------------------------------------------------------------
  var ASSEMBLY_SLOTS = {
    socket_cpu: {
      key: 'socket_cpu',
      hotspotId: 'socket',
      label: 'LGA 1700 CPU Socket',
      requiredComp: 'comp_cpu',
      pos: { x: -0.16, y: 0.04, z: 0.08 },
      beaconSize: { x: 0.32, y: 0.06, z: 0.32 },
      socraticQuery: 'Pin 1 alignment is mandatory. Where is the golden triangle on the CPU substrate located, and what happens if an LGA socket is clamped reversed?',
      socraticCorrect: 'Intel LGA 1700 CPU seated into 1,700 gold spring pin contacts. Zero pin damage confirmed. Clamp the socket retention frame to secure the thermal package.',
      socraticMismatched: 'Pin 1 alignment mismatch: The golden triangle must register precisely with the socket corner index (0 deg rotation) to prevent crushing 1,700 LGA spring contacts.'
    },
    slot_ram1: {
      key: 'slot_ram1',
      hotspotId: 'ram',
      label: 'DIMM Slot A2 (DDR5)',
      requiredComp: 'comp_ram',
      pos: { x: 0.28, y: 0.05, z: 0.08 },
      beaconSize: { x: 0.08, y: 0.24, z: 0.90 },
      socraticQuery: 'Why does the motherboard manufacturer mandate installing memory into Slot A2 first when configuring dual-channel DDR5 architecture?',
      socraticCorrect: 'DDR5 32GB module locked in Slot A2. End retention latches clicked shut. On-die ECC and 1.1V PMIC active.',
      socraticMismatched: 'Memory keying error: DDR5 modules feature an off-center notch that prevents reversed insertion. Seat firmly into Slot A2.'
    },
    slot_pcie_top: {
      key: 'slot_pcie_top',
      hotspotId: 'pcie',
      label: 'Primary PCIe 4.0 x16 Slot',
      requiredComp: 'comp_gpu',
      pos: { x: -0.06, y: 0.06, z: -0.32 },
      beaconSize: { x: 0.14, y: 0.38, z: 1.12 },
      socraticQuery: 'Why must high-performance discrete GPUs connect to the top full-length PCIe slot instead of lower mechanical x16 slots routed through the chipset?',
      socraticCorrect: 'PCIe 4.0 x16 discrete GPU seated in steel-armored slot. 16 direct CPU lanes engaged for 32 GB/s bidirectional throughput.',
      socraticMismatched: 'Slot mismatch: High-performance discrete GPUs require the primary full-length PCIe x16 slot with direct CPU lane allocation.'
    },
    slot_m2_nvme: {
      key: 'slot_m2_nvme',
      hotspotId: 'm2',
      label: 'M.2 NVMe Slot (PCIe 4.0 x4)',
      requiredComp: 'comp_nvme',
      pos: { x: -0.02, y: 0.03, z: -0.08 },
      beaconSize: { x: 0.22, y: 0.04, z: 0.52 },
      socraticQuery: 'Before securing the M.2 standoff thumbscrew and heatshield, what must you remove from the pre-applied thermal pad on the underside?',
      socraticCorrect: 'M.2 2280 NVMe SSD locked into Key-M socket with 64,000 queue depth directly over PCIe 4.0 x4.',
      socraticMismatched: 'Storage socket mismatch: M.2 NVMe drives must be inserted at a 30-degree angle into Key-M sockets and secured flat with the standoff screw.'
    },
    conn_atx_power: {
      key: 'conn_atx_power',
      hotspotId: 'power',
      label: '24-Pin ATX Main Power Header',
      requiredComp: 'comp_atx',
      pos: { x: 0.52, y: 0.05, z: 0.16 },
      beaconSize: { x: 0.18, y: 0.18, z: 0.42 },
      socraticQuery: 'Which wire color carries the primary +12V DC rail to motherboard VRMs according to ATX12V specifications?',
      socraticCorrect: '24-Pin ATX main power harness seated with nylon retention clip locked. +12V, +5V, and +3.3V power rails energized.',
      socraticMismatched: 'Power connection mismatch: Ensure 24-Pin ATX connector orientation matches the keyed plastic housing.'
    }
  };

  var ASSEMBLY_COMPONENTS = [
    { id: 'comp_cpu', name: 'Intel Core i7 LGA 1700 CPU', slotKey: 'socket_cpu', type: 'CPU', pin1Rotatable: true },
    { id: 'comp_ram', name: 'DDR5 32GB 6000MHz DIMM', slotKey: 'slot_ram1', type: 'RAM', pin1Rotatable: false },
    { id: 'comp_gpu', name: 'PCIe 4.0 x16 Discrete GPU', slotKey: 'slot_pcie_top', type: 'Expansion', pin1Rotatable: false },
    { id: 'comp_nvme', name: 'M.2 2280 NVMe SSD (PCIe x4)', slotKey: 'slot_m2_nvme', type: 'Storage', pin1Rotatable: false },
    { id: 'comp_atx', name: '24-Pin ATX Main Power Cable', slotKey: 'conn_atx_power', type: 'Power', pin1Rotatable: false }
  ];

  // ---------------------------------------------------------------------------
  // 3. Dynamic Three.js Vendor Script Loader
  // ---------------------------------------------------------------------------
  var isVendorLoading = false;
  var vendorLoaded = false;
  var vendorCallbacks = [];

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = function () {
      cb(null);
    };
    s.onerror = function () {
      cb(new Error('Failed to load script: ' + src));
    };
    document.head.appendChild(s);
  }

  function ensureThreeVendor(callback) {
    if (window.THREE && window.THREE.GLTFLoader && window.THREE.OrbitControls) {
      vendorLoaded = true;
      return callback(null);
    }
    if (vendorLoaded) return callback(null);

    vendorCallbacks.push(callback);
    if (isVendorLoading) return;
    isVendorLoading = true;

    // Search vendor scripts under landing/vendor/
    loadScript('landing/vendor/three.min.js', function (err) {
      if (err) {
        isVendorLoading = false;
        var cbs = vendorCallbacks.slice();
        vendorCallbacks = [];
        cbs.forEach(function (fn) { fn(err); });
        return;
      }

      var pending = 2;
      var failed = null;
      function checkDone(e) {
        if (e && !failed) failed = e;
        pending--;
        if (pending === 0) {
          isVendorLoading = false;
          vendorLoaded = !failed;
          var cbs = vendorCallbacks.slice();
          vendorCallbacks = [];
          cbs.forEach(function (fn) { fn(failed); });
        }
      }

      loadScript('landing/vendor/GLTFLoader.js', checkDone);
      loadScript('landing/vendor/OrbitControls.js', checkDone);
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Procedural Studio Reflection & Contact Shadows
  // ---------------------------------------------------------------------------
  function createStudioEnvironment(renderer) {
    if (!renderer || !window.THREE) return null;
    try {
      var w = 512, h = 256;
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var ctx = c.getContext('2d');
      if (!ctx) return null;

      // Dark baseline
      ctx.fillStyle = '#0b0d13';
      ctx.fillRect(0, 0, w, h);

      // Studio horizon
      var horiz = ctx.createLinearGradient(0, h * 0.45, 0, h * 0.65);
      horiz.addColorStop(0, '#10141f');
      horiz.addColorStop(0.5, '#1e2638');
      horiz.addColorStop(1, '#080a0f');
      ctx.fillStyle = horiz;
      ctx.fillRect(0, h * 0.45, w, h * 0.2);

      // Overhead softbox
      var topGrad = ctx.createRadialGradient(w * 0.5, h * 0.2, 5, w * 0.5, h * 0.2, w * 0.35);
      topGrad.addColorStop(0, '#ffffff');
      topGrad.addColorStop(0.3, '#d8e4f8');
      topGrad.addColorStop(0.8, '#253047');
      topGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, h * 0.55);

      // Gold rim reflector
      var goldGrad = ctx.createRadialGradient(w * 0.82, h * 0.45, 2, w * 0.82, h * 0.45, w * 0.2);
      goldGrad.addColorStop(0, '#f5d061');
      goldGrad.addColorStop(0.5, '#ca8a04');
      goldGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = goldGrad;
      ctx.fillRect(w * 0.6, h * 0.25, w * 0.4, h * 0.4);

      // Cyan fill reflector
      var cyanGrad = ctx.createRadialGradient(w * 0.18, h * 0.45, 2, w * 0.18, h * 0.45, w * 0.2);
      cyanGrad.addColorStop(0, '#6aa5ff');
      cyanGrad.addColorStop(0.6, '#1e3a8a');
      cyanGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = cyanGrad;
      ctx.fillRect(0, h * 0.25, w * 0.4, h * 0.4);

      var tex = new window.THREE.CanvasTexture(c);
      tex.mapping = window.THREE.EquirectangularReflectionMapping;
      return tex;
    } catch (_) {
      return null;
    }
  }

  function createGroundContactShadow() {
    if (!window.THREE) return null;
    try {
      var sz = 256;
      var c = document.createElement('canvas');
      c.width = sz; c.height = sz;
      var ctx = c.getContext('2d');
      if (!ctx) return null;

      var rad = ctx.createRadialGradient(sz / 2, sz / 2, 8, sz / 2, sz / 2, sz / 2 - 4);
      rad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
      rad.addColorStop(0.35, 'rgba(0, 0, 0, 0.55)');
      rad.addColorStop(0.7, 'rgba(0, 0, 0, 0.18)');
      rad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, sz, sz);

      var tex = new window.THREE.CanvasTexture(c);
      var geo = new window.THREE.PlaneGeometry(3.6, 3.6);
      var mat = new window.THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false
      });
      var mesh = new window.THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -0.01;
      return mesh;
    } catch (_) {
      return null;
    }
  }

  var pcbNormalMapCache = null;
  var brushedMetalCache = null;

  function createProceduralPcbNormalMap() {
    if (pcbNormalMapCache) return pcbNormalMapCache;
    if (!window.THREE) return null;
    try {
      var sz = 512;
      var c = document.createElement('canvas');
      c.width = sz; c.height = sz;
      var ctx = c.getContext('2d');
      if (!ctx) return null;

      var imgData = ctx.createImageData(sz, sz);
      var data = imgData.data;

      for (var y = 0; y < sz; y++) {
        for (var x = 0; x < sz; x++) {
          var idx = (y * sz + x) * 4;
          var weave1 = (x + y) % 8;
          var weave2 = (x - y + sz) % 8;
          var isWeave = (weave1 < 2 || weave2 < 2);

          var bus1 = (x % 32 < 6) && (y > 64 && y < 448);
          var bus2 = (y % 32 < 6) && (x > 64 && x < 448);
          var bus45 = ((x + y) % 64 < 6) && (x > 128 && x < 384);
          var isTrace = bus1 || bus2 || bus45;

          var gridX = x % 64 - 32;
          var gridY = y % 64 - 32;
          var distSq = gridX * gridX + gridY * gridY;
          var isPad = (distSq >= 64 && distSq <= 144);
          var isHole = (distSq < 36);

          var nx = 0.0;
          var ny = 0.0;

          if (isTrace) {
            var edgeX = (x % 32);
            if (edgeX === 0) nx = -0.55;
            else if (edgeX === 5) nx = 0.55;
            var edgeY = (y % 32);
            if (edgeY === 0) ny = -0.55;
            else if (edgeY === 5) ny = 0.55;
          } else if (isPad) {
            var rad = Math.sqrt(distSq);
            nx = (gridX / (rad || 1)) * 0.45;
            ny = (gridY / (rad || 1)) * 0.45;
          } else if (isHole) {
            nx = 0.0; ny = 0.0;
          } else if (isWeave) {
            nx = (weave1 < 2 ? 0.12 : -0.12);
            ny = (weave2 < 2 ? 0.12 : -0.12);
          }

          var nz = Math.sqrt(Math.max(0.01, 1.0 - (nx * nx + ny * ny)));
          data[idx] = Math.round(128 + 127 * nx);
          data[idx + 1] = Math.round(128 + 127 * ny);
          data[idx + 2] = Math.round(128 + 127 * nz);
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      var tex = new window.THREE.CanvasTexture(c);
      tex.wrapS = window.THREE.RepeatWrapping;
      tex.wrapT = window.THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      pcbNormalMapCache = tex;
      return tex;
    } catch (_) {
      return null;
    }
  }

  function createProceduralBrushedMetalTexture() {
    if (brushedMetalCache) return brushedMetalCache;
    if (!window.THREE) return null;
    try {
      var sz = 256;
      var c = document.createElement('canvas');
      c.width = sz; c.height = sz;
      var ctx = c.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#b0b5be';
      ctx.fillRect(0, 0, sz, sz);

      for (var i = 0; i < 350; i++) {
        var y = Math.random() * sz;
        var h = 1 + Math.random() * 2;
        var brightness = 140 + Math.floor(Math.random() * 95);
        ctx.fillStyle = 'rgba(' + brightness + ',' + brightness + ',' + (brightness + 10) + ', 0.18)';
        ctx.fillRect(0, y, sz, h);
      }

      var tex = new window.THREE.CanvasTexture(c);
      tex.wrapS = window.THREE.RepeatWrapping;
      tex.wrapT = window.THREE.RepeatWrapping;
      tex.repeat.set(2, 6);
      brushedMetalCache = tex;
      return tex;
    } catch (_) {
      return null;
    }
  }

  // Thermal vision telemetry database
  var isThermalMode = false;
  var thermalHudEl = null;
  var thermalReticleEl = null;
  var thermalMaterialsMap = new WeakMap();

  var THERMAL_DB = {
    'VRM_Top_Base': { temp: 86.4, name: 'VRM Top Phase Inductors', status: 'CRITICAL THROTTLING RISK', delta: '+61.4C', spec: '16-Phase DrMOS VRM. Throttles at 95C; high load induces PROCHOT# CPU down-stepping.' },
    'VRM_Left_Base': { temp: 84.1, name: 'VRM Left Phase Heatsink', status: 'ELEVATED HEAT', delta: '+59.1C', spec: 'Primary Vcore power stages under heavy all-core synthetic load.' },
    'CPU_Socket_Base': { temp: 74.2, name: 'LGA 1700 CPU Die / IHS', status: 'NOMINAL LOAD', delta: '+49.2C', spec: 'TDP 125W dissipation through copper heatpipes. Safe junction limit: 100C (Tjunction Max).' },
    'CPU_Load_Plate': { temp: 72.8, name: 'CPU ILM Retention Plate', status: 'NOMINAL LOAD', delta: '+47.8C', spec: 'Integrated Loading Mechanism conductive heat spread from processor substrate.' },
    'CPU_Socket_Lever': { temp: 65.5, name: 'CPU Socket Lever', status: 'NOMINAL', delta: '+40.5C', spec: 'Steel retention lever heat soak from socket housing.' },
    'M2_Heatshield': { temp: 82.5, name: 'PCIe 4.0 M.2 NVMe SSD', status: 'HIGH THERMAL SOAK', delta: '+57.5C', spec: 'NAND flash thrives at 40-50C, but memory controller throttles at 80C without heatsink.' },
    'Chipset_Heatsink': { temp: 58.1, name: 'Southbridge PCH Chipset', status: 'NOMINAL', delta: '+33.1C', spec: 'DMI 4.0 x8 link controller routing SATA, USB 3.2, and chipset PCIe lanes.' },
    'RAM_Slot_0': { temp: 48.0, name: 'DDR5 32GB RAM DIMM', status: 'NOMINAL', delta: '+23.0C', spec: 'On-die PMIC thermal dissipation at 1.25V EXPO profile.' },
    'PCIe_x16_1_Body': { temp: 42.0, name: 'PCIe 5.0 x16 Primary Slot', status: 'NOMINAL', delta: '+17.0C', spec: 'High-speed differential signaling bus heat dissipation.' },
    'ATX_24Pin_Housing': { temp: 34.5, name: '24-Pin ATX Main Power', status: 'OPTIMAL', delta: '+9.5C', spec: '+12V/+5V/+3.3V power harness current draw under 15A rating.' },
    'PCB_Substrate': { temp: 31.0, name: 'FR4 Multi-Layer PCB Ground Plane', status: 'AMBIENT', delta: '+6.0C', spec: '8-layer 2oz copper ground plane passive thermal conduction.' },
    'Gold_Pin_4': { temp: 46.8, name: 'PoE 802.3bt Type 4 Conductor Pin', status: 'POE ACTIVE HEATING', delta: '+21.8C', spec: '90W PoE DC current delivery generates I^2*R copper resistance heating.' },
    'Gold_Pin_1': { temp: 45.9, name: 'PoE Conductor Pin 1 (Tx+)', status: 'POE ACTIVE HEATING', delta: '+20.9C', spec: 'PoE power carrying contact pair.' },
    'Conductor_Wire_4': { temp: 41.2, name: 'AWG 23 Twisted Pair Conductor', status: 'NOMINAL', delta: '+16.2C', spec: 'Solid bare copper wire bundle heat accumulation inside conduit.' },
    'RJ45_Housing_Head': { temp: 28.5, name: 'Polycarbonate Plug Housing', status: 'AMBIENT', delta: '+3.5C', spec: 'Dielectric transparent housing insulation.' },
    'Strain_Boot_Body': { temp: 27.2, name: 'Snagless Strain Relief Boot', status: 'AMBIENT', delta: '+2.2C', spec: 'Flexible PVC boot nominal temperature.' },
    'Server_2U_Bezel': { temp: 64.8, name: '2U Dual-Socket Xeon Server Exhaust', status: 'HOT AISLE EXHAUST', delta: '+39.8C', spec: 'Rear exhaust air discharge (ASHRAE TC 9.9 Hot Aisle boundary).' },
    'Server_Drive_Caddy_0': { temp: 44.0, name: 'Hot-Swap SAS 15K RPM HDD Tray', status: 'NOMINAL INTAKE', delta: '+19.0C', spec: 'Cold aisle front intake ventilation across magnetic spindle bearings.' },
    'UPS_3U_Front_Bezel': { temp: 45.2, name: '3U Online Double-Conversion UPS', status: 'NOMINAL INVERTER', delta: '+20.2C', spec: 'IGBT high-frequency inverter transformer and valve-regulated lead-acid batteries.' },
    'Switch_1U_Faceplate': { temp: 36.5, name: '48-Port Gigabit Enterprise Switch', status: 'OPTIMAL FABRIC', delta: '+11.5C', spec: 'Front-to-back cooling airflow maintaining ASIC junction below 70C.' },
    'EIA_Rail_Front_L': { temp: 23.5, name: 'EIA-310-E Galvanized Mounting Rail', status: 'COLD AISLE INLET', delta: '-1.5C', spec: 'Inlet air temperature complying with ASHRAE A1 Cold Aisle envelope (18C-27C).' }
  };

  function getIronbowColor(tempC) {
    var t = Math.max(0, Math.min(1, (tempC - 20) / 70));
    var r, g, b;
    if (t < 0.25) {
      var f = t / 0.25;
      r = Math.round(3 + f * 85);
      g = Math.round(5 + f * 8);
      b = Math.round(30 + f * 100);
    } else if (t < 0.5) {
      var f = (t - 0.25) / 0.25;
      r = Math.round(88 + f * 113);
      g = Math.round(13 + f * 43);
      b = Math.round(130 - f * 52);
    } else if (t < 0.75) {
      var f = (t - 0.5) / 0.25;
      r = Math.round(201 + f * 46);
      g = Math.round(56 + f * 160);
      b = Math.round(78 - f * 22);
    } else {
      var f = (t - 0.75) / 0.25;
      r = Math.round(247 + f * 8);
      g = Math.round(216 + f * 39);
      b = Math.round(56 + f * 199);
    }
    return (r << 16) | (g << 8) | b;
  }

  // Crimp and Stability Physics Simulation State
  var isCrimped = false;
  var currentCrimpLerp = 0.0;
  var targetCrimpLerp = 0.0;
  var crimpedPinsList = [];

  var isStabilityTesting = false;
  var currentRackTilt = 0.0;
  var targetRackTilt = 0.0;
  var rackStabilityPhase = 0;

  // ---------------------------------------------------------------------------
  // 5. App 3D Stage Core Controller
  // ---------------------------------------------------------------------------
  var modalEl = null;
  var viewportEl = null;
  var threeCanvas = null;
  var fallbackImg = null;
  var hotspotsWrap = null;

  var renderer = null;
  var scene = null;
  var camera = null;
  var controls = null;
  var gltfLoader = null;
  var groundShadow = null;
  var pointerLight = null;
  var wireframeMat = null;

  var currentModelKey = 'mobo';
  var currentModelRoot = null;
  var loadedRoots = {};
  var pbrMaterialCache = new WeakMap();

  var isRendering = false;
  var isAutoRotate = true;
  var isWireframe = false;
  var isExploded = false;
  var isActionEngaged = false;
  var currentActionLerp = 0.0;
  var targetActionLerp = 0.0;
  var currentExplodeFactor = 0.0;
  var targetExplodeFactor = 0.0;

  var activeHotspotId = null;
  var hoveredHotspotId = null;
  var hoveredMesh = null;
  var hoveredMeshOrigEmissive = null;

  var camAnim = { active: false, startPos: null, endPos: null, startTgt: null, endTgt: null, startTime: 0, duration: 600 };
  var interactiveNodes = { lever: null, loadPlate: null, caddy: null, clip: null };
  var pointerNDC = null;
  var raycaster = null;

  // Direct 3D Spatial Assembly Simulator State
  var currentStageMode = 'teardown'; // 'teardown' | 'assembly'
  var assemblySlots = {
    socket_cpu: null,
    slot_ram1: null,
    slot_pcie_top: null,
    slot_m2_nvme: null,
    conn_atx_power: null
  };
  var heldCompId = null;
  var compRotations = {
    comp_cpu: 0,
    comp_ram: 0,
    comp_gpu: 0,
    comp_nvme: 0,
    comp_atx: 0
  };
  var assemblyMountedMeshes = {};
  var assemblyBeacons = {};
  var hoveredBeaconKey = null;
  var assemblyGhostPulse = 0.0;
  var onSlotUpdateCallback = null;
  var isPostRunning = false;
  var postStatus = 'idle'; // 'idle' | 'running' | 'passed' | 'failed'

  // ---------------------------------------------------------------------------
  // 2C. Procedural Three.js Hardware Meshes for Assembly Lab
  // ---------------------------------------------------------------------------
  function buildProceduralCpuMesh(rotDeg) {
    var group = new window.THREE.Group();
    group.name = 'Procedural_CPU_Group';

    // Green PCB substrate
    var pcbGeo = new window.THREE.BoxGeometry(0.28, 0.015, 0.28);
    var pcbMat = new window.THREE.MeshStandardMaterial({
      color: 0x163516,
      roughness: 0.5,
      metalness: 0.1,
      normalMap: createProceduralPcbNormalMap()
    });
    var pcbMesh = new window.THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.castShadow = true;
    pcbMesh.receiveShadow = true;
    group.add(pcbMesh);

    // Nickel-plated IHS Heatspreader
    var ihsGeo = new window.THREE.BoxGeometry(0.23, 0.018, 0.23);
    var ihsMat = new window.THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.18,
      metalness: 0.95,
      roughnessMap: createProceduralBrushedMetalTexture()
    });
    var ihsMesh = new window.THREE.Mesh(ihsGeo, ihsMat);
    ihsMesh.position.y = 0.014;
    ihsMesh.castShadow = true;
    ihsMesh.receiveShadow = true;
    group.add(ihsMesh);

    // Gold Pin 1 Triangle Marker at corner (-0.088, 0.024, 0.088)
    var triGeo = new window.THREE.ConeGeometry(0.016, 0.005, 3);
    var triMat = new window.THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.1,
      metalness: 0.98
    });
    var triMesh = new window.THREE.Mesh(triGeo, triMat);
    triMesh.rotation.x = -Math.PI / 2;
    triMesh.position.set(-0.088, 0.024, 0.088);
    group.add(triMesh);

    group.rotation.y = (rotDeg || 0) * (Math.PI / 180);
    return group;
  }

  function buildProceduralRamMesh() {
    var group = new window.THREE.Group();
    group.name = 'Procedural_RAM_Group';

    // Black PCB
    var pcbGeo = new window.THREE.BoxGeometry(0.02, 0.22, 0.84);
    var pcbMat = new window.THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.4,
      normalMap: createProceduralPcbNormalMap()
    });
    var pcbMesh = new window.THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.position.y = 0.11;
    group.add(pcbMesh);

    // Aluminum Heatsink Armor
    var hsGeo = new window.THREE.BoxGeometry(0.028, 0.19, 0.82);
    var hsMat = new window.THREE.MeshStandardMaterial({
      color: 0x2d3748,
      roughness: 0.25,
      metalness: 0.85,
      roughnessMap: createProceduralBrushedMetalTexture()
    });
    var hsMesh = new window.THREE.Mesh(hsGeo, hsMat);
    hsMesh.position.y = 0.12;
    hsMesh.castShadow = true;
    group.add(hsMesh);

    // Top RGB Lightbar
    var rgbGeo = new window.THREE.BoxGeometry(0.02, 0.025, 0.80);
    var rgbMat = new window.THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.2,
      roughness: 0.1
    });
    var rgbMesh = new window.THREE.Mesh(rgbGeo, rgbMat);
    rgbMesh.position.y = 0.225;
    group.add(rgbMesh);

    // Gold Pins along bottom
    var goldGeo = new window.THREE.BoxGeometry(0.018, 0.02, 0.80);
    var goldMat = new window.THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.1,
      metalness: 0.98
    });
    var goldMesh = new window.THREE.Mesh(goldGeo, goldMat);
    goldMesh.position.y = 0.01;
    group.add(goldMesh);

    return group;
  }

  function buildProceduralGpuMesh() {
    var group = new window.THREE.Group();
    group.name = 'Procedural_GPU_Group';

    // PCB Backplate
    var pcbGeo = new window.THREE.BoxGeometry(0.02, 0.36, 1.05);
    var pcbMat = new window.THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      normalMap: createProceduralPcbNormalMap()
    });
    var pcbMesh = new window.THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.position.y = 0.18;
    group.add(pcbMesh);

    // Dual-fan Shroud
    var shrGeo = new window.THREE.BoxGeometry(0.12, 0.34, 1.02);
    var shrMat = new window.THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.7
    });
    var shrMesh = new window.THREE.Mesh(shrGeo, shrMat);
    shrMesh.position.set(0.06, 0.18, 0);
    shrMesh.castShadow = true;
    group.add(shrMesh);

    // Dual axial fan discs
    [-0.25, 0.25].forEach(function (zOff) {
      var fanGeo = new window.THREE.CylinderGeometry(0.13, 0.13, 0.015, 16);
      var fanMat = new window.THREE.MeshStandardMaterial({
        color: 0x0b0d13,
        roughness: 0.4
      });
      var fanMesh = new window.THREE.Mesh(fanGeo, fanMat);
      fanMesh.rotation.z = Math.PI / 2;
      fanMesh.position.set(0.125, 0.18, zOff);
      group.add(fanMesh);

      var hubGeo = new window.THREE.CylinderGeometry(0.04, 0.04, 0.02, 12);
      var hubMat = new window.THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.15,
        metalness: 0.95
      });
      var hubMesh = new window.THREE.Mesh(hubGeo, hubMat);
      hubMesh.rotation.z = Math.PI / 2;
      hubMesh.position.set(0.13, 0.18, zOff);
      group.add(hubMesh);
    });

    // Steel Expansion Bracket
    var brkGeo = new window.THREE.BoxGeometry(0.015, 0.42, 0.08);
    var brkMat = new window.THREE.MeshStandardMaterial({
      color: 0xd0d5dd,
      roughness: 0.15,
      metalness: 0.95,
      roughnessMap: createProceduralBrushedMetalTexture()
    });
    var brkMesh = new window.THREE.Mesh(brkGeo, brkMat);
    brkMesh.position.set(0.02, 0.20, -0.54);
    group.add(brkMesh);

    // PCIe Gold Contacts
    var pcieGoldGeo = new window.THREE.BoxGeometry(0.018, 0.03, 0.55);
    var pcieGoldMat = new window.THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.1,
      metalness: 0.98
    });
    var pcieGold = new window.THREE.Mesh(pcieGoldGeo, pcieGoldMat);
    pcieGold.position.set(0, 0.015, -0.15);
    group.add(pcieGold);

    return group;
  }

  function buildProceduralNvmeMesh() {
    var group = new window.THREE.Group();
    group.name = 'Procedural_NVME_Group';

    // Blue PCB (2280)
    var pcbGeo = new window.THREE.BoxGeometry(0.18, 0.012, 0.48);
    var pcbMat = new window.THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.4,
      normalMap: createProceduralPcbNormalMap()
    });
    var pcbMesh = new window.THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.position.y = 0.006;
    group.add(pcbMesh);

    // NAND flash ICs
    [-0.10, 0.05].forEach(function (zOff) {
      var icGeo = new window.THREE.BoxGeometry(0.13, 0.012, 0.13);
      var icMat = new window.THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.5
      });
      var icMesh = new window.THREE.Mesh(icGeo, icMat);
      icMesh.position.set(0, 0.016, zOff);
      group.add(icMesh);
    });

    // Memory controller IC
    var ctrlGeo = new window.THREE.BoxGeometry(0.09, 0.014, 0.09);
    var ctrlMat = new window.THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.3,
      metalness: 0.8
    });
    var ctrlMesh = new window.THREE.Mesh(ctrlGeo, ctrlMat);
    ctrlMesh.position.set(0, 0.016, 0.16);
    group.add(ctrlMesh);

    // Key-M gold edge connector
    var mKeyGeo = new window.THREE.BoxGeometry(0.16, 0.008, 0.04);
    var mKeyMat = new window.THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.1,
      metalness: 0.98
    });
    var mKeyMesh = new window.THREE.Mesh(mKeyGeo, mKeyMat);
    mKeyMesh.position.set(0, 0.006, 0.24);
    group.add(mKeyMesh);

    // Standoff Thumbscrew
    var scrGeo = new window.THREE.CylinderGeometry(0.02, 0.02, 0.016, 12);
    var scrMat = new window.THREE.MeshStandardMaterial({
      color: 0xd0d5dd,
      roughness: 0.2,
      metalness: 0.92
    });
    var scrMesh = new window.THREE.Mesh(scrGeo, scrMat);
    scrMesh.position.set(0, 0.015, -0.23);
    group.add(scrMesh);

    return group;
  }

  function buildProceduralAtxMesh() {
    var group = new window.THREE.Group();
    group.name = 'Procedural_ATX_Group';

    // White nylon housing
    var hsgGeo = new window.THREE.BoxGeometry(0.12, 0.14, 0.36);
    var hsgMat = new window.THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.05
    });
    var hsgMesh = new window.THREE.Mesh(hsgGeo, hsgMat);
    hsgMesh.position.y = 0.07;
    hsgMesh.castShadow = true;
    group.add(hsgMesh);

    // Wire harness bundle arching out
    var wireColors = [0xeab308, 0xef4444, 0xf97316, 0x111111];
    for (var w = 0; w < 4; w++) {
      var wGeo = new window.THREE.CylinderGeometry(0.012, 0.012, 0.20, 8);
      var wMat = new window.THREE.MeshStandardMaterial({
        color: wireColors[w % wireColors.length],
        roughness: 0.6
      });
      var wMesh = new window.THREE.Mesh(wGeo, wMat);
      wMesh.position.set((w - 1.5) * 0.025, 0.22, 0);
      group.add(wMesh);
    }

    return group;
  }

  function buildSlotBeaconMesh(slotDef) {
    var sz = slotDef.beaconSize || { x: 0.2, y: 0.1, z: 0.2 };
    var geo = new window.THREE.BoxGeometry(sz.x, sz.y, sz.z);
    var mat = new window.THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.55
    });
    var mesh = new window.THREE.Mesh(geo, mat);
    mesh.position.set(slotDef.pos.x, slotDef.pos.y + sz.y * 0.5, slotDef.pos.z);
    mesh.userData.isAssemblyBeacon = true;
    mesh.userData.slotKey = slotDef.key;
    return mesh;
  }

  function getComponentName(compId) {
    for (var i = 0; i < ASSEMBLY_COMPONENTS.length; i++) {
      if (ASSEMBLY_COMPONENTS[i].id === compId) return ASSEMBLY_COMPONENTS[i].name;
    }
    return compId;
  }

  function flashBeaconError(slotKey) {
    var beacon = assemblyBeacons[slotKey];
    if (!beacon) return;
    beacon.material.color.setHex(0xef4444);
    beacon.material.opacity = 0.95;
    setTimeout(function () {
      if (beacon && beacon.material) {
        beacon.material.color.setHex(0x38bdf8);
        beacon.material.opacity = 0.45;
      }
    }, 450);
  }

  function flyToSlot(slotKey) {
    var slotDef = ASSEMBLY_SLOTS[slotKey];
    if (!slotDef || !camera || !controls) return;
    var target = new window.THREE.Vector3(slotDef.pos.x, slotDef.pos.y, slotDef.pos.z);
    var offset = new window.THREE.Vector3(0.12, 0.42, 0.38);
    flyTo(target.clone().add(offset), target.clone(), 650);
  }

  function handleBeaconClick(slotKey) {
    var slotDef = ASSEMBLY_SLOTS[slotKey];
    if (!slotDef) return;

    if (assemblySlots[slotKey]) {
      Sound.playClick();
      updateCopilotQuery(
        slotDef.label + ' Status',
        'Component currently mounted: ' + slotDef.socraticCorrect + ' Click [✕ Eject] in the bench tray if you wish to remove or reseat.'
      );
      flyToSlot(slotKey);
      return;
    }

    if (!heldCompId) {
      heldCompId = slotDef.requiredComp;
      Sound.playClick();
      renderComponentBench();
      flyToSlot(slotKey);
      updateCopilotQuery(
        'Selected: ' + getComponentName(heldCompId),
        slotDef.socraticQuery
      );
      return;
    }

    if (heldCompId === slotDef.requiredComp) {
      if (slotKey === 'socket_cpu') {
        var rot = compRotations.comp_cpu || 0;
        if (rot !== 0) {
          Sound.playError();
          flashBeaconError(slotKey);
          updateCopilotQuery(
            'Pin 1 Alignment Error',
            slotDef.socraticMismatched + ' (Currently rotated ' + rot + ' degrees. Click [↻ Rotate] on the bench tray to align Pin 1 to 0 degrees before seating).'
          );
          return;
        }
      }

      mountComponent(slotKey, heldCompId, compRotations[heldCompId] || 0);
    } else {
      Sound.playError();
      flashBeaconError(slotKey);
      updateCopilotQuery(
        'Physical Form Factor Mismatch',
        'Cannot install ' + getComponentName(heldCompId) + ' into ' + slotDef.label + '. ' + slotDef.socraticMismatched
      );
    }
  }

  function mountComponent(slotKey, compId, rotDeg) {
    var slotDef = ASSEMBLY_SLOTS[slotKey];
    if (!slotDef || !currentModelRoot) return;

    assemblySlots[slotKey] = compId;
    Sound.playSnap();

    var mesh = null;
    if (compId === 'comp_cpu') mesh = buildProceduralCpuMesh(rotDeg);
    else if (compId === 'comp_ram') mesh = buildProceduralRamMesh();
    else if (compId === 'comp_gpu') mesh = buildProceduralGpuMesh();
    else if (compId === 'comp_nvme') mesh = buildProceduralNvmeMesh();
    else if (compId === 'comp_atx') mesh = buildProceduralAtxMesh();

    if (mesh) {
      mesh.position.set(slotDef.pos.x, slotDef.pos.y, slotDef.pos.z);
      currentModelRoot.add(mesh);
      assemblyMountedMeshes[slotKey] = mesh;
    }

    if (assemblyBeacons[slotKey]) {
      assemblyBeacons[slotKey].visible = false;
    }

    heldCompId = null;
    renderComponentBench();
    updateCopilotTelemetry();

    var installedCount = Object.values(assemblySlots).filter(Boolean).length;
    if (installedCount === 5) {
      updateCopilotQuery(
        'All Core Subsystems Mounted',
        'All 5 motherboard components seated and locked. Proceed to run the Diagnostic POST Test to verify electrical and bus continuity.'
      );
    } else {
      updateCopilotQuery(
        slotDef.label + ' Installed',
        slotDef.socraticCorrect + ' (' + installedCount + ' of 5 subsystems mounted).'
      );
    }

    if (typeof onSlotUpdateCallback === 'function') {
      onSlotUpdateCallback(assemblySlots);
    }
  }

  function ejectComponent(slotKey) {
    if (!assemblySlots[slotKey]) return;
    Sound.playEngage();

    if (assemblyMountedMeshes[slotKey] && currentModelRoot) {
      currentModelRoot.remove(assemblyMountedMeshes[slotKey]);
      delete assemblyMountedMeshes[slotKey];
    }

    assemblySlots[slotKey] = null;
    if (assemblyBeacons[slotKey]) {
      assemblyBeacons[slotKey].visible = true;
    }

    heldCompId = null;
    postStatus = 'idle';
    renderComponentBench();
    updateCopilotTelemetry();

    updateCopilotQuery(
      'Component Ejected',
      'Hardware unmounted from ' + (ASSEMBLY_SLOTS[slotKey] ? ASSEMBLY_SLOTS[slotKey].label : slotKey) + '. Slot ready for new installation.'
    );

    if (typeof onSlotUpdateCallback === 'function') {
      onSlotUpdateCallback(assemblySlots);
    }
  }

  function updateCopilotQuery(title, text) {
    var titEl = document.getElementById('app3DCopilotTitle');
    var txtEl = document.getElementById('app3DCopilotQuery');
    if (titEl) titEl.textContent = title;
    if (txtEl) txtEl.textContent = text;
  }

  function updateCopilotTelemetry() {
    var prg = document.getElementById('app3DCopilotProgress');
    var count = Object.values(assemblySlots).filter(Boolean).length;
    if (prg) prg.textContent = count + ' of 5 Subsystems Installed';

    var postBtn = document.getElementById('app3DRunPostBtn');
    if (postBtn) {
      postBtn.disabled = (count < 5);
      if (count === 5 && postStatus !== 'passed') {
        postBtn.classList.add('is-active');
      } else {
        postBtn.classList.remove('is-active');
      }
    }

    var list = [
      { id: 'app3DTelem_cpu', val: assemblySlots.socket_cpu ? 'LGA 1700 Clamped' : 'Empty Socket', ok: !!assemblySlots.socket_cpu },
      { id: 'app3DTelem_ram', val: assemblySlots.slot_ram1 ? 'DDR5 Channel A2 (128-bit)' : 'No DIMM', ok: !!assemblySlots.slot_ram1 },
      { id: 'app3DTelem_gpu', val: assemblySlots.slot_pcie_top ? 'Gen 4 x16 (32 GB/s)' : 'Disconnected', ok: !!assemblySlots.slot_pcie_top },
      { id: 'app3DTelem_m2', val: assemblySlots.slot_m2_nvme ? 'PCIe 4.0 x4 (3500 MB/s)' : 'Open Socket', ok: !!assemblySlots.slot_m2_nvme },
      { id: 'app3DTelem_pwr', val: assemblySlots.conn_atx_power ? '+12V/+5V/+3.3V Active' : 'De-energized', ok: !!assemblySlots.conn_atx_power }
    ];

    list.forEach(function (item) {
      var el = document.getElementById(item.id);
      if (el) {
        el.style.color = item.ok ? 'var(--color-success, #58A177)' : 'var(--text-secondary, #A3ADC2)';
        el.textContent = item.val;
      }
    });
  }

  function runPostDiagnostics() {
    if (isPostRunning) return;
    isPostRunning = true;
    postStatus = 'running';

    var term = document.getElementById('app3DPostTerminal');
    var postBtn = document.getElementById('app3DRunPostBtn');
    if (postBtn) {
      postBtn.disabled = true;
      postBtn.textContent = 'Testing POST...';
    }

    ['cpu', 'dram', 'vga', 'boot'].forEach(function (sub) {
      var led = document.getElementById('app3DPostLed_' + sub);
      if (led) {
        led.className = 'app-3d-post-led is-amber';
      }
    });

    if (term) term.innerHTML = '<div style="color: var(--gold-light);">[UEFI] Initializing Power-On Self-Test (POST)...</div>';
    Sound.playClick();

    setTimeout(function () {
      var ledCpu = document.getElementById('app3DPostLed_cpu');
      if (assemblySlots.socket_cpu === 'comp_cpu') {
        if (ledCpu) ledCpu.className = 'app-3d-post-led is-green';
        if (term) term.innerHTML += '<div style="color: var(--color-success, #58A177);">[PASS] CPU: Intel Core i7 LGA 1700 (20 Cores) OK</div>';
        Sound.playClick();
      } else {
        if (ledCpu) ledCpu.className = 'app-3d-post-led is-red';
        if (term) term.innerHTML += '<div style="color: var(--color-danger, #CB6E63);">[FAIL] CPU ERROR: Socket empty or bent pins (Code 00)</div>';
        Sound.playError();
        finishPost(false);
        return;
      }

      setTimeout(function () {
        var ledDram = document.getElementById('app3DPostLed_dram');
        if (assemblySlots.slot_ram1 === 'comp_ram') {
          if (ledDram) ledDram.className = 'app-3d-post-led is-green';
          if (term) term.innerHTML += '<div style="color: var(--color-success, #58A177);">[PASS] DRAM: 32GB DDR5-6000 Slot A2 Synchronized</div>';
          Sound.playClick();
        } else {
          if (ledDram) ledDram.className = 'app-3d-post-led is-red';
          if (term) term.innerHTML += '<div style="color: var(--color-danger, #CB6E63);">[FAIL] DRAM ERROR: No memory detected in Channel A2 (Code 55)</div>';
          Sound.playError();
          finishPost(false);
          return;
        }

        setTimeout(function () {
          var ledVga = document.getElementById('app3DPostLed_vga');
          if (assemblySlots.slot_pcie_top === 'comp_gpu') {
            if (ledVga) ledVga.className = 'app-3d-post-led is-green';
            if (term) term.innerHTML += '<div style="color: var(--color-success, #58A177);">[PASS] VGA: PCIe 4.0 x16 Primary Accelerator (32 GB/s) OK</div>';
            Sound.playClick();
          } else {
            if (ledVga) ledVga.className = 'app-3d-post-led is-red';
            if (term) term.innerHTML += '<div style="color: var(--color-danger, #CB6E63);">[FAIL] VGA ERROR: Discrete GPU missing from PCIe x16 (Code 94)</div>';
            Sound.playError();
            finishPost(false);
            return;
          }

          setTimeout(function () {
            var ledBoot = document.getElementById('app3DPostLed_boot');
            if (assemblySlots.slot_m2_nvme === 'comp_nvme' && assemblySlots.conn_atx_power === 'comp_atx') {
              if (ledBoot) ledBoot.className = 'app-3d-post-led is-green';
              if (term) term.innerHTML += '<div style="color: var(--color-success, #58A177);">[PASS] BOOT: M.2 NVMe PCIe x4 + 24-Pin ATX Main Power OK</div>';
              Sound.playPostChime();
              if (term) term.innerHTML += '<div style="color: var(--gold-light); font-weight: 700; margin-top: 4px;">POST CODE 00: SYSTEM READY. UEFI HANDOFF VERIFIED.</div>';
              finishPost(true);
            } else {
              if (ledBoot) ledBoot.className = 'app-3d-post-led is-red';
              if (term) term.innerHTML += '<div style="color: var(--color-danger, #CB6E63);">[FAIL] BOOT/POWER ERROR: Storage or 24-Pin ATX missing (Code 99)</div>';
              Sound.playError();
              finishPost(false);
            }
          }, 300);
        }, 300);
      }, 300);
    }, 250);
  }

  function finishPost(success) {
    isPostRunning = false;
    postStatus = success ? 'passed' : 'failed';
    var postBtn = document.getElementById('app3DRunPostBtn');
    if (postBtn) {
      postBtn.disabled = false;
      postBtn.textContent = success ? 'POST Verified (Code 00)' : 'Re-run Diagnostic POST';
    }

    if (success) {
      updateCopilotQuery(
        'POST Verification Passed',
        'CompTIA A+ Domain 3.4 objective mastered: All 5 hardware subsystems verified with active bus telemetry and BIOS handoff. Click [Apply to Lab 6 & Return] to submit your work for full exam credit.'
      );
    } else {
      updateCopilotQuery(
        'POST Diagnostic Fault',
        'One or more required hardware subsystems failed POST initialization. Review the error code above and mount missing components.'
      );
    }
  }

  function setStageMode(mode) {
    currentStageMode = mode;
    Sound.playClick();

    var btnTeardown = document.getElementById('app3DModeTeardown');
    var btnAssembly = document.getElementById('app3DModeAssembly');
    var teardownPanel = document.getElementById('app3DTeardownPanel');
    var copilotPanel = document.getElementById('app3DAiCopilotPanel');
    var benchTray = document.getElementById('app3DComponentBench');

    if (btnTeardown) {
      btnTeardown.style.background = mode === 'teardown' ? 'var(--gold-primary, #d4af37)' : 'transparent';
      btnTeardown.style.color = mode === 'teardown' ? '#000' : 'var(--text-secondary, #a3adc2)';
      btnTeardown.style.fontWeight = mode === 'teardown' ? '700' : '600';
    }
    if (btnAssembly) {
      btnAssembly.style.background = mode === 'assembly' ? 'var(--gold-primary, #d4af37)' : 'transparent';
      btnAssembly.style.color = mode === 'assembly' ? '#000' : 'var(--text-secondary, #a3adc2)';
      btnAssembly.style.fontWeight = mode === 'assembly' ? '700' : '600';
    }

    if (teardownPanel) teardownPanel.style.display = mode === 'teardown' ? 'flex' : 'none';
    if (copilotPanel) copilotPanel.style.display = mode === 'assembly' ? 'flex' : 'none';
    if (benchTray) benchTray.style.display = mode === 'assembly' ? 'flex' : 'none';

    if (hotspotsWrap) {
      hotspotsWrap.style.display = mode === 'teardown' ? 'block' : 'none';
    }

    Object.keys(assemblyBeacons).forEach(function (k) {
      var b = assemblyBeacons[k];
      if (b) {
        b.visible = (mode === 'assembly' && !assemblySlots[k]);
      }
    });

    if (mode === 'assembly') {
      renderComponentBench();
      updateCopilotTelemetry();
      if (camera && controls) {
        flyTo(new window.THREE.Vector3(0, 1.25, 1.5), new window.THREE.Vector3(0, 0, 0), 600);
      }
    }
  }

  function renderComponentBench() {
    var bench = document.getElementById('app3DComponentBench');
    if (!bench) return;
    bench.innerHTML = '';

    ASSEMBLY_COMPONENTS.forEach(function (comp) {
      var isInstalled = (assemblySlots[comp.slotKey] === comp.id);
      var isSelected = (heldCompId === comp.id);

      var item = document.createElement('div');
      item.className = 'app-3d-bench-item' + (isSelected ? ' is-selected' : '') + (isInstalled ? ' is-installed' : '');
      item.id = 'app3DBench_' + comp.id;

      var rot = compRotations[comp.id] || 0;
      var rotHtml = '';
      if (comp.pin1Rotatable && !isInstalled) {
        rotHtml = '<button type="button" class="btn btn-secondary app-3d-rot-btn" data-comp="' + comp.id + '" style="font-size: 0.62rem; padding: 2px 6px; margin-top: 3px; border-color: rgba(212,175,55,0.4); color: var(--gold-light); cursor: pointer;">↻ Rotate (' + rot + '°)</button>';
      }

      var actionBtnHtml = '';
      if (isInstalled) {
        actionBtnHtml = '<button type="button" class="btn btn-secondary app-3d-eject-btn" data-slot="' + comp.slotKey + '" style="font-size: 0.62rem; padding: 2px 6px; margin-top: 3px; border-color: rgba(239,68,68,0.5); color: #fca5a5; cursor: pointer;">✕ Eject</button>';
      } else {
        actionBtnHtml = '<button type="button" class="btn btn-secondary app-3d-mount-btn" data-slot="' + comp.slotKey + '" data-comp="' + comp.id + '" style="font-size: 0.62rem; padding: 2px 6px; margin-top: 3px; border-color: rgba(56,189,248,0.5); color: var(--accent-cyan); cursor: pointer;">' + (isSelected ? '▶ Click 3D Target' : 'Select to Mount') + '</button>';
      }

      item.innerHTML = [
        '<div style="display: flex; justify-content: space-between; align-items: center;">',
        '  <span style="font-size: 0.62rem; font-weight: 700; color: ' + (isInstalled ? '#10b981' : 'var(--gold-primary)') + ';">' + escapeHTML(comp.type) + '</span>',
        '  <span style="font-size: 0.58rem; color: #94a3b8;">' + (isInstalled ? 'Mounted' : (isSelected ? 'Held' : 'Bench')) + '</span>',
        '</div>',
        '<div style="font-size: 0.72rem; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHTML(comp.name) + '</div>',
        '<div style="display: flex; gap: 4px; align-items: center; justify-content: space-between;">',
        rotHtml,
        actionBtnHtml,
        '</div>'
      ].join('');

      item.addEventListener('click', function (e) {
        if (e.target.closest('.app-3d-rot-btn') || e.target.closest('.app-3d-eject-btn')) return;
        if (isInstalled) {
          flyToSlot(comp.slotKey);
        } else {
          heldCompId = (heldCompId === comp.id) ? null : comp.id;
          Sound.playClick();
          renderComponentBench();
          if (heldCompId) {
            flyToSlot(comp.slotKey);
            var sDef = ASSEMBLY_SLOTS[comp.slotKey];
            if (sDef) updateCopilotQuery('Selected: ' + comp.name, sDef.socraticQuery);
          }
        }
      });

      var rotBtn = item.querySelector('.app-3d-rot-btn');
      if (rotBtn) {
        rotBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          Sound.playClick();
          compRotations[comp.id] = ((compRotations[comp.id] || 0) + 90) % 360;
          renderComponentBench();
          var curRot = compRotations[comp.id];
          if (curRot === 0) {
            updateCopilotQuery('Pin 1 Aligned', 'Golden triangle aligned with Socket Pin 1 corner index (0°). Ready for insertion.');
          } else {
            updateCopilotQuery('Pin 1 Misaligned', 'Substrate is rotated ' + curRot + '°. Golden triangle must match 0° before clamping.');
          }
        });
      }

      var ejectBtn = item.querySelector('.app-3d-eject-btn');
      if (ejectBtn) {
        ejectBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          ejectComponent(comp.slotKey);
        });
      }

      var mountBtn = item.querySelector('.app-3d-mount-btn');
      if (mountBtn) {
        mountBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          heldCompId = comp.id;
          handleBeaconClick(comp.slotKey);
        });
      }

      bench.appendChild(item);
    });
  }

  function buildModalDOM() {
    if (modalEl) return;

    modalEl = document.createElement('div');
    modalEl.id = 'app3DModal';
    modalEl.className = 'app-3d-modal modal-overlay';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'app3DModalTitle');

    modalEl.innerHTML = [
      '<div class="app-3d-modal-card" style="position: relative; width: 95vw; max-width: 1200px; height: 88vh; max-height: 840px; background: var(--surface-1, #0f131b); border: 1px solid var(--border-gold, #d4af37); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.85);">',
      '  <!-- Top Header Bar -->',
      '  <div class="app-3d-header" style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(11, 11, 15, 0.95); flex-wrap: wrap; gap: 0.5rem;">',
      '    <div style="display: flex; align-items: center; gap: 0.75rem;">',
      '      <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(212, 175, 55, 0.15); color: var(--gold-light, #e4c558); font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(212, 175, 55, 0.3);">3D</span>',
      '      <div>',
      '        <h3 id="app3DModalTitle" style="font-size: 1.05rem; color: var(--text-primary, #f3f4f6); margin: 0; font-weight: 700;">Hardware Digital Twin</h3>',
      '        <div id="app3DModalSubtitle" style="font-size: 0.72rem; color: var(--gold-light, #e4c558); font-family: monospace;">CompTIA A+ Core 1 · Physical Teardown</div>',
      '      </div>',
      '    </div>',
      '    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">',
      '      <!-- Mode Selector (Teardown vs Assembly Lab) -->',
      '      <div id="app3DModeToggleWrap" style="display: flex; gap: 4px; background: rgba(255,255,255,0.05); padding: 2px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08);">',
      '        <button type="button" id="app3DModeTeardown" class="app-3d-tab is-active" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 999px; border: none; background: var(--gold-primary, #d4af37); color: #000; font-weight: 700; cursor: pointer;">3D Teardown</button>',
      '        <button type="button" id="app3DModeAssembly" class="app-3d-tab" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 999px; border: none; background: transparent; color: var(--text-secondary, #a3adc2); font-weight: 600; cursor: pointer;">Assembly Lab</button>',
      '      </div>',
      '      <!-- Model Selector Pills -->',
      '      <div id="app3DModelTabsWrap" style="display: flex; gap: 4px; background: rgba(255,255,255,0.05); padding: 2px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08);">',
      '        <button type="button" id="app3DTabMobo" class="app-3d-tab is-active" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 999px; border: none; background: var(--gold-primary, #d4af37); color: #000; font-weight: 700; cursor: pointer;">Motherboard</button>',
      '        <button type="button" id="app3DTabRj45" class="app-3d-tab" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 999px; border: none; background: transparent; color: var(--text-secondary, #a3adc2); font-weight: 600; cursor: pointer;">RJ-45 Plug</button>',
      '        <button type="button" id="app3DTabRack" class="app-3d-tab" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 999px; border: none; background: transparent; color: var(--text-secondary, #a3adc2); font-weight: 600; cursor: pointer;">42U Rack</button>',
      '      </div>',
      '      <button type="button" id="app3DCloseBtn" aria-label="Close 3D hardware inspector" style="background: none; border: none; color: var(--text-secondary, #a3adc2); font-size: 1.6rem; cursor: pointer; line-height: 1; padding: 2px 6px;">&times;</button>',
      '    </div>',
      '  </div>',
      '',
      '  <!-- Body Split: 3D Stage on Left, Technical Inspector Card on Right -->',
      '  <div style="display: grid; grid-template-columns: 1fr 340px; flex: 1; overflow: hidden; position: relative;">',
      '    ',
      '    <!-- Left: 3D Viewport Stage -->',
      '    <div id="app3DViewport" class="app-3d-stage__viewport" style="position: relative; background: radial-gradient(circle at center, #111726 0%, #06080e 100%); width: 100%; height: 100%; overflow: hidden;">',
      '      <img id="app3DFallbackImg" alt="Hardware Render" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />',
      '      <div id="app3DHotspots" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;"></div>',
      '',
      '      <!-- FLIR Thermal Imaging Telemetry HUD Overlay -->',
      '      <div id="app3DThermalHud" class="app-3d-thermal-hud" style="display: none;">',
      '        <div class="app-3d-thermal-hud-header">',
      '          <span style="font-weight: 800; color: #ef4444; letter-spacing: 0.5px;">FLIR T540 TELEMETRY</span>',
      '          <span id="app3DThermalEmissivity" style="color: #94a3b8; font-size: 0.62rem;">e = 0.95</span>',
      '        </div>',
      '        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.65rem;">',
      '          <div>Spot Temp: <span id="app3DThermalSpot" style="color: #fca5a5; font-weight: 700;">31.0 C</span></div>',
      '          <div>Delta Amb: <span id="app3DThermalDelta" style="color: #fca5a5;">+6.0 C</span></div>',
      '        </div>',
      '        <div>Target: <span id="app3DThermalTarget" style="color: #fff; font-weight: 600;">PCB Ground Plane</span></div>',
      '        <div id="app3DThermalStatus" style="font-weight: 700; color: #34d399; font-size: 0.62rem;">STATUS: NOMINAL AMBIENT</div>',
      '        <div class="app-3d-thermal-legend">',
      '          <span style="font-size: 0.6rem; color: #94a3b8;">20 C</span>',
      '          <div class="app-3d-thermal-bar"></div>',
      '          <span style="font-size: 0.6rem; color: #fca5a5;">90 C</span>',
      '        </div>',
      '      </div>',
      '      <div id="app3DThermalReticle" class="app-3d-thermal-reticle"></div>',
      '',
      '      <!-- In-Stage Control Toolbar (Teardown Mode) -->',
      '      <div class="app-3d-toolbar" style="position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; background: rgba(15, 19, 27, 0.88); border: 1px solid rgba(212, 175, 55, 0.35); padding: 5px 10px; border-radius: 999px; backdrop-filter: blur(8px); z-index: 20; box-shadow: 0 4px 20px rgba(0,0,0,0.5); flex-wrap: wrap; justify-content: center;">',
      '        <button type="button" id="app3DToolAction" class="btn btn-secondary" style="font-size: 0.72rem; padding: 4px 10px; height: 28px; display: inline-flex; align-items: center; gap: 4px; border-color: rgba(212,175,55,0.4); color: var(--gold-light, #e4c558);"><span id="app3DToolActionLabel">Socket Lever</span></button>',
      '        <button type="button" id="app3DToolThermal" class="btn btn-secondary" style="font-size: 0.72rem; padding: 4px 10px; height: 28px; display: inline-flex; align-items: center; gap: 4px; border-color: rgba(239, 68, 68, 0.45); color: #f87171;">Thermal</button>',
      '        <button type="button" id="app3DToolCrimp" class="btn btn-secondary" style="display: none; font-size: 0.72rem; padding: 4px 10px; height: 28px; border-color: rgba(212, 175, 55, 0.4); color: var(--gold-light, #e4c558);">Ratchet Crimp</button>',
      '        <button type="button" id="app3DToolRackStability" class="btn btn-secondary" style="display: none; font-size: 0.72rem; padding: 4px 10px; height: 28px; border-color: rgba(212, 175, 55, 0.4); color: var(--gold-light, #e4c558);">CoG Stability</button>',
      '        <button type="button" id="app3DToolExplode" class="btn btn-secondary" style="font-size: 0.72rem; padding: 4px 10px; height: 28px;">Explode</button>',
      '        <button type="button" id="app3DToolCamHero" class="btn btn-secondary is-active" style="font-size: 0.72rem; padding: 4px 10px; height: 28px;">Hero View</button>',
      '        <button type="button" id="app3DToolCamTop" class="btn btn-secondary" style="font-size: 0.72rem; padding: 4px 10px; height: 28px;">Top Plan</button>',
      '        <button type="button" id="app3DToolShading" class="btn btn-secondary" style="font-size: 0.72rem; padding: 4px 10px; height: 28px;">Wireframe</button>',
      '        <button type="button" id="app3DToolRotate" class="btn btn-secondary is-active" style="font-size: 0.72rem; padding: 4px 10px; height: 28px;">Rotate</button>',
      '        <button type="button" id="app3DToolMute" class="btn btn-secondary" aria-label="Toggle tactile audio" style="font-size: 0.72rem; padding: 4px 8px; height: 28px;">Sound</button>',
      '      </div>',
      '',
      '      <!-- 3D Hardware Component Bench Tray (Assembly Mode) -->',
      '      <div id="app3DComponentBench" class="app-3d-bench" style="display: none;"></div>',
      '',
      '      <!-- Loading spinner -->',
      '      <div id="app3DLoader" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; z-index: 30;">',
      '        <div style="width: 32px; height: 32px; border: 3px solid rgba(212, 175, 55, 0.2); border-top-color: var(--gold-primary, #d4af37); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>',
      '        <span style="font-size: 0.72rem; color: var(--gold-light, #e4c558); font-family: monospace;">Loading 3D Hardware...</span>',
      '      </div>',
      '    </div>',
      '',
      '    <!-- Right: Inspector Details Panel -->',
      '    <div id="app3DInspector" style="background: var(--surface-2, #151a25); border-left: 1px solid rgba(255,255,255,0.08); padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto;">',
      '      ',
      '      <!-- Panel 1: Teardown Inspection Panel -->',
      '      <div id="app3DTeardownPanel" style="display: flex; flex-direction: column; gap: 1rem;">',
      '        <div>',
      '          <div id="app3DInspSubsystem" style="font-size: 0.7rem; color: var(--accent-cyan, #38bdf8); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Subsystem</div>',
      '          <h4 id="app3DInspTitle" style="font-size: 1.15rem; color: var(--gold-primary, #d4af37); margin: 0.2rem 0 0 0; font-weight: 700;">Select a Component</h4>',
      '        </div>',
      '        <div id="app3DHotspotPills" style="display: flex; flex-wrap: wrap; gap: 4px;"></div>',
      '        <div style="background: rgba(11, 11, 15, 0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 0.85rem;">',
      '          <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 700; margin-bottom: 0.35rem; text-transform: uppercase;">Technical Specification</div>',
      '          <p id="app3DInspDesc" style="font-size: 0.82rem; color: var(--text-primary, #f3f4f6); line-height: 1.45; margin: 0;">Click any 3D node or hotspot pin to inspect technical parameters.</p>',
      '        </div>',
      '        <div style="background: rgba(212, 175, 55, 0.08); border-left: 3px solid var(--gold-primary, #d4af37); padding: 0.75rem 0.85rem; border-radius: 0 6px 6px 0;">',
      '          <div style="font-size: 0.68rem; color: var(--gold-light, #e4c558); font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">Exam Takeaway</div>',
      '          <p id="app3DInspTakeaway" style="font-size: 0.8rem; color: #e2e8f0; line-height: 1.4; margin: 0;">Key test concepts will appear here.</p>',
      '        </div>',
      '        <div style="background: rgba(56, 189, 248, 0.08); border-left: 3px solid var(--accent-cyan, #38bdf8); padding: 0.75rem 0.85rem; border-radius: 0 6px 6px 0;">',
      '          <div style="font-size: 0.68rem; color: var(--accent-cyan, #38bdf8); font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">Domain 5.0 Diagnostic Checks</div>',
      '          <p id="app3DInspTroubleshoot" style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.4; margin: 0;">Diagnostic procedures and multimeter readings.</p>',
      '        </div>',
      '      </div>',
      '',
      '      <!-- Panel 2: Socratic AI Copilot & Assembly Controller -->',
      '      <div id="app3DAiCopilotPanel" style="display: none; flex-direction: column; gap: 0.85rem;">',
      '        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">',
      '          <div>',
      '            <div style="font-size: 0.68rem; color: var(--gold-light); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Clariora AI Socratic Mentor</div>',
      '            <h4 style="font-size: 1.05rem; color: #fff; margin: 0.15rem 0 0 0; font-weight: 700;">Spatial Hardware Lab</h4>',
      '          </div>',
      '          <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.62rem; color: #10b981; background: rgba(16,185,129,0.15); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.3);">',
      '            <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span> Telemetry Live',
      '          </span>',
      '        </div>',
      '',
      '        <!-- Socratic Guidance Box -->',
      '        <div class="app-3d-copilot-card">',
      '          <div id="app3DCopilotTitle" style="font-size: 0.74rem; font-weight: 700; color: var(--gold-primary);">LGA 1700 Socket Alignment</div>',
      '          <p id="app3DCopilotQuery" style="font-size: 0.78rem; color: var(--text-primary); line-height: 1.4; margin: 0;">Select a component from the bench below to begin. Notice how Pin 1 orientation and keying notches dictate component seating.</p>',
      '        </div>',
      '',
      '        <!-- Progress Counter & Focus Buttons -->',
      '        <div>',
      '          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">',
      '            <span style="font-size: 0.68rem; color: #94a3b8; font-weight: 600;">Assembly Progress</span>',
      '            <span id="app3DCopilotProgress" style="font-size: 0.68rem; color: var(--gold-light); font-weight: 700;">0 of 5 Subsystems Installed</span>',
      '          </div>',
      '          <div style="display: flex; flex-wrap: wrap; gap: 4px;">',
      '            <button type="button" class="btn btn-secondary app-3d-focus-btn" data-slot="socket_cpu" style="font-size: 0.64rem; padding: 2px 6px;">CPU Socket</button>',
      '            <button type="button" class="btn btn-secondary app-3d-focus-btn" data-slot="slot_ram1" style="font-size: 0.64rem; padding: 2px 6px;">DIMM A2</button>',
      '            <button type="button" class="btn btn-secondary app-3d-focus-btn" data-slot="slot_pcie_top" style="font-size: 0.64rem; padding: 2px 6px;">PCIe x16</button>',
      '            <button type="button" class="btn btn-secondary app-3d-focus-btn" data-slot="slot_m2_nvme" style="font-size: 0.64rem; padding: 2px 6px;">M.2 NVMe</button>',
      '            <button type="button" class="btn btn-secondary app-3d-focus-btn" data-slot="conn_atx_power" style="font-size: 0.64rem; padding: 2px 6px;">24-Pin ATX</button>',
      '          </div>',
      '        </div>',
      '',
      '        <!-- Real-Time Hardware Subsystem Telemetry Card -->',
      '        <div style="background: rgba(11, 11, 15, 0.65); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 0.65rem;">',
      '          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 0.4rem;">Subsystem Telemetry Bus</div>',
      '          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.68rem;">',
      '            <div>CPU: <span id="app3DTelem_cpu" style="color: #94a3b8;">Empty Socket</span></div>',
      '            <div>RAM: <span id="app3DTelem_ram" style="color: #94a3b8;">No DIMM</span></div>',
      '            <div>GPU: <span id="app3DTelem_gpu" style="color: #94a3b8;">Disconnected</span></div>',
      '            <div>M.2: <span id="app3DTelem_m2" style="color: #94a3b8;">Open Socket</span></div>',
      '            <div style="grid-column: span 2;">PWR: <span id="app3DTelem_pwr" style="color: #94a3b8;">De-energized</span></div>',
      '          </div>',
      '        </div>',
      '',
      '        <!-- Motherboard POST Self-Test Unit -->',
      '        <div style="background: rgba(15, 19, 27, 0.85); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 6px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;">',
      '          <div style="display: flex; justify-content: space-between; align-items: center;">',
      '            <span style="font-size: 0.68rem; font-weight: 700; color: var(--gold-light);">Motherboard POST Unit</span>',
      '            <div style="display: flex; gap: 6px; align-items: center;">',
      '              <span title="CPU Status" id="app3DPostLed_cpu" class="app-3d-post-led"></span>',
      '              <span title="DRAM Status" id="app3DPostLed_dram" class="app-3d-post-led"></span>',
      '              <span title="VGA Status" id="app3DPostLed_vga" class="app-3d-post-led"></span>',
      '              <span title="BOOT Status" id="app3DPostLed_boot" class="app-3d-post-led"></span>',
      '            </div>',
      '          </div>',
      '',
      '          <div id="app3DPostTerminal" style="background: #05070a; border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; padding: 6px 8px; font-family: monospace; font-size: 0.66rem; color: #a3adc2; min-height: 52px; max-height: 80px; overflow-y: auto;">',
      '            <div>Ready for diagnostic power-on self-test. Mount all 5 components to initialize.</div>',
      '          </div>',
      '',
      '          <button type="button" id="app3DRunPostBtn" class="btn btn-secondary" style="font-size: 0.72rem; padding: 4px 10px; width: 100%; border-color: rgba(212,175,55,0.5); color: var(--gold-light); cursor: pointer;" disabled>',
      '            Run Diagnostic POST Test',
      '          </button>',
      '        </div>',
      '',
      '        <!-- Sync to Lab 6 Button -->',
      '        <button type="button" id="app3DApplyPbqBtn" class="btn btn-primary" style="background: var(--gold-primary, #d4af37); color: #000; font-weight: 700; font-size: 0.75rem; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 12px rgba(212,175,55,0.3); margin-top: auto;">',
      '          ✔ Apply Assembly to Lab 6 &amp; Return',
      '        </button>',
      '      </div>',
      '',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(modalEl);

    viewportEl = document.getElementById('app3DViewport');
    fallbackImg = document.getElementById('app3DFallbackImg');
    hotspotsWrap = document.getElementById('app3DHotspots');
    thermalHudEl = document.getElementById('app3DThermalHud');
    thermalReticleEl = document.getElementById('app3DThermalReticle');

    bindEvents();
  }

  function bindEvents() {
    var closeBtn = document.getElementById('app3DCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeModal();
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl && modalEl.classList.contains('active')) {
        closeModal();
      }
    });

    var tabMobo = document.getElementById('app3DTabMobo');
    var tabRj45 = document.getElementById('app3DTabRj45');
    var tabRack = document.getElementById('app3DTabRack');

    var modeTeardown = document.getElementById('app3DModeTeardown');
    var modeAssembly = document.getElementById('app3DModeAssembly');
    if (modeTeardown) modeTeardown.addEventListener('click', function () { setStageMode('teardown'); });
    if (modeAssembly) modeAssembly.addEventListener('click', function () { setStageMode('assembly'); });

    var runPostBtn = document.getElementById('app3DRunPostBtn');
    if (runPostBtn) runPostBtn.addEventListener('click', runPostDiagnostics);

    var applyPbqBtn = document.getElementById('app3DApplyPbqBtn');
    if (applyPbqBtn) applyPbqBtn.addEventListener('click', function () {
      if (typeof onSlotUpdateCallback === 'function') {
        onSlotUpdateCallback(assemblySlots);
      }
      closeModal();
    });

    modalEl.querySelectorAll('.app-3d-focus-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sKey = btn.getAttribute('data-slot');
        if (sKey) flyToSlot(sKey);
      });
    });

    if (tabMobo) tabMobo.addEventListener('click', function () { switchModel('mobo'); });
    if (tabRj45) tabRj45.addEventListener('click', function () { switchModel('rj45'); });
    if (tabRack) tabRack.addEventListener('click', function () { switchModel('rack'); });

    var toolAct = document.getElementById('app3DToolAction');
    if (toolAct) toolAct.addEventListener('click', toggleAction);

    var toolThermal = document.getElementById('app3DToolThermal');
    if (toolThermal) toolThermal.addEventListener('click', toggleThermalMode);

    var toolCrimp = document.getElementById('app3DToolCrimp');
    if (toolCrimp) toolCrimp.addEventListener('click', triggerCrimpAction);

    var toolStability = document.getElementById('app3DToolRackStability');
    if (toolStability) toolStability.addEventListener('click', testRackStability);

    var toolExplode = document.getElementById('app3DToolExplode');
    if (toolExplode) toolExplode.addEventListener('click', toggleExplode);

    var toolHero = document.getElementById('app3DToolCamHero');
    if (toolHero) toolHero.addEventListener('click', function () { setCameraPreset('hero'); });

    var toolTop = document.getElementById('app3DToolCamTop');
    if (toolTop) toolTop.addEventListener('click', function () { setCameraPreset('top'); });

    var toolShading = document.getElementById('app3DToolShading');
    if (toolShading) toolShading.addEventListener('click', toggleShading);

    var toolRotate = document.getElementById('app3DToolRotate');
    if (toolRotate) toolRotate.addEventListener('click', toggleRotate);

    var toolMute = document.getElementById('app3DToolMute');
    if (toolMute) toolMute.addEventListener('click', function () {
      var m = Sound.toggleMute();
      toolMute.style.opacity = m ? '0.5' : '1.0';
    });
  }

  function setLoader(show) {
    var l = document.getElementById('app3DLoader');
    if (l) l.style.display = show ? 'flex' : 'none';
  }

  function closeModal() {
    if (modalEl) modalEl.classList.remove('active');
    isRendering = false;
    Sound.playClick();
  }

  function switchModel(key) {
    if (!MODELS[key]) return;
    currentModelKey = key;
    Sound.playClick();

    // Update active tab buttons
    ['Mobo', 'Rj45', 'Rack'].forEach(function (t) {
      var btn = document.getElementById('app3DTab' + t);
      if (btn) {
        var isThis = (t.toLowerCase() === key || (t === 'Mobo' && key === 'mobo') || (t === 'Rj45' && key === 'rj45') || (t === 'Rack' && key === 'rack'));
        btn.style.background = isThis ? 'var(--gold-primary, #d4af37)' : 'transparent';
        btn.style.color = isThis ? '#000' : 'var(--text-secondary, #a3adc2)';
        btn.style.fontWeight = isThis ? '700' : '600';
      }
    });

    var modeToggleWrap = document.getElementById('app3DModeToggleWrap');
    if (modeToggleWrap) {
      modeToggleWrap.style.display = (key === 'mobo') ? 'flex' : 'none';
    }
    if (key !== 'mobo') {
      setStageMode('teardown');
    }

    var model = MODELS[key];
    var titleEl = document.getElementById('app3DModalTitle');
    var subEl = document.getElementById('app3DModalSubtitle');
    if (titleEl) titleEl.textContent = model.title;
    if (subEl) subEl.textContent = model.obj;

    // Reset action tool button label
    isActionEngaged = false;
    targetActionLerp = 0.0;
    currentActionLerp = 0.0;
    var actBtn = document.getElementById('app3DToolAction');
    var actLbl = document.getElementById('app3DToolActionLabel');
    if (actBtn) actBtn.classList.remove('is-active');
    if (actLbl) actLbl.textContent = model.actionLabel;

    // Toggle model-specific simulation buttons
    var crimpBtn = document.getElementById('app3DToolCrimp');
    if (crimpBtn) {
      crimpBtn.style.display = (key === 'rj45') ? 'inline-flex' : 'none';
      crimpBtn.classList.remove('is-active');
      crimpBtn.textContent = 'Ratchet Crimp';
    }
    isCrimped = false;
    currentCrimpLerp = 0.0;
    targetCrimpLerp = 0.0;

    var stabBtn = document.getElementById('app3DToolRackStability');
    if (stabBtn) {
      stabBtn.style.display = (key === 'rack') ? 'inline-flex' : 'none';
      stabBtn.classList.remove('is-active');
      stabBtn.textContent = 'CoG Stability';
    }
    isStabilityTesting = false;
    currentRackTilt = 0.0;
    targetRackTilt = 0.0;

    renderHotspotPills(model);

    if (window.THREE && renderer && scene) {
      load3DModel(key);
    } else {
      render2DFallback(model);
    }
  }

  function renderHotspotPills(model) {
    var pillsWrap = document.getElementById('app3DHotspotPills');
    if (!pillsWrap) return;
    pillsWrap.innerHTML = '';

    model.hotspots.forEach(function (hs) {
      var pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'btn btn-secondary';
      pill.id = 'app3DPill_' + hs.id;
      pill.style = 'font-size: 0.68rem; padding: 3px 8px; border-radius: 4px;';
      pill.textContent = hs.label;
      pill.addEventListener('click', function () {
        selectHotspot(hs.id, true);
      });
      pill.addEventListener('mouseenter', function () {
        Sound.playHover();
      });
      pillsWrap.appendChild(pill);
    });

    selectHotspot(model.defaultHotspot, false);
  }

  function selectHotspot(hotspotId, animateCamera) {
    var model = MODELS[currentModelKey];
    if (!model) return;
    var hs = model.hotspots.find(function (h) { return h.id === hotspotId; }) || model.hotspots[0];
    if (!hs) return;

    activeHotspotId = hs.id;
    Sound.playClick();

    // Update inspector
    var sub = document.getElementById('app3DInspSubsystem');
    var tit = document.getElementById('app3DInspTitle');
    var desc = document.getElementById('app3DInspDesc');
    var take = document.getElementById('app3DInspTakeaway');
    var trbl = document.getElementById('app3DInspTroubleshoot');

    if (sub) sub.textContent = hs.subsystem;
    if (tit) tit.textContent = hs.label;
    if (desc) desc.textContent = hs.desc;
    if (take) take.textContent = hs.takeaway;
    if (trbl) trbl.textContent = hs.troubleshooting;

    // Update pill highlights
    model.hotspots.forEach(function (h) {
      var p = document.getElementById('app3DPill_' + h.id);
      if (p) {
        var isSel = h.id === hs.id;
        p.style.borderColor = isSel ? 'var(--gold-primary, #d4af37)' : 'rgba(255,255,255,0.08)';
        p.style.background = isSel ? 'rgba(212, 175, 55, 0.2)' : '';
        p.style.color = isSel ? 'var(--gold-light, #e4c558)' : '';
      }
      var pin = document.getElementById('app3DPin_' + h.id);
      if (pin) pin.classList.toggle('is-active', h.id === hs.id);
    });

    // Animate camera if in 3D
    if (animateCamera && camera && controls && hs.worldPos) {
      var offset = new window.THREE.Vector3(0.15, 0.45, 0.45);
      if (currentModelKey === 'rj45') offset.set(0.1, 0.2, 0.3);
      if (currentModelKey === 'rack') offset.set(0, 0.2, 1.2);

      flyTo(hs.worldPos.clone().add(offset), hs.worldPos.clone(), 650);
    }
  }

  function flyTo(endPos, endTarget, duration) {
    if (!camera || !controls) return;
    camAnim.active = true;
    camAnim.startPos = camera.position.clone();
    camAnim.endPos = endPos;
    camAnim.startTgt = controls.target.clone();
    camAnim.endTgt = endTarget;
    camAnim.startTime = performance.now();
    camAnim.duration = duration || 600;
  }

  // ---------------------------------------------------------------------------
  // 6. Three.js Engine Lifecycle
  // ---------------------------------------------------------------------------
  function initThreeEngine(callback) {
    ensureThreeVendor(function (err) {
      if (err || !window.THREE) {
        console.warn('[app-3d] Three.js vendor script unavailable, using 2D fallback');
        return callback(false);
      }

      try {
        if (!threeCanvas) {
          threeCanvas = document.createElement('canvas');
          threeCanvas.className = 'app-3d-canvas';
          threeCanvas.style = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; outline: none;';
          viewportEl.appendChild(threeCanvas);
        }

        var w = viewportEl.clientWidth || 800;
        var h = viewportEl.clientHeight || 533;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);

        renderer = new window.THREE.WebGLRenderer({
          canvas: threeCanvas,
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h);
        renderer.outputEncoding = window.THREE.sRGBEncoding;
        renderer.toneMapping = window.THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = window.THREE.PCFSoftShadowMap;

        scene = new window.THREE.Scene();

        var env = createStudioEnvironment(renderer);
        if (env) scene.environment = env;

        camera = new window.THREE.PerspectiveCamera(38, w / h, 0.1, 50);
        camera.position.set(0, 1.4, 2.0);

        controls = new window.THREE.OrbitControls(camera, threeCanvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 0.35;
        controls.maxDistance = 5.5;
        controls.autoRotate = isAutoRotate;
        controls.autoRotateSpeed = 1.0;

        // Lighting Rig
        var amb = new window.THREE.AmbientLight(0x282c35, 1.2);
        scene.add(amb);

        var hemi = new window.THREE.HemisphereLight(0xfff6e6, 0x111622, 1.0);
        hemi.position.set(0, 5, 0);
        scene.add(hemi);

        var keyLight = new window.THREE.DirectionalLight(0xffeed0, 2.5);
        keyLight.position.set(3, 4, 3);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 12;
        keyLight.shadow.bias = -0.0008;
        scene.add(keyLight);

        var fillLight = new window.THREE.DirectionalLight(0x6aa5ff, 1.4);
        fillLight.position.set(-3, -1, 2);
        scene.add(fillLight);

        var rimLight = new window.THREE.DirectionalLight(0xf5d061, 2.0);
        rimLight.position.set(0, 3, -3);
        scene.add(rimLight);

        pointerLight = new window.THREE.PointLight(0xf5d061, 1.6, 5.0);
        pointerLight.position.set(0, 1.5, 1.5);
        scene.add(pointerLight);

        wireframeMat = new window.THREE.MeshBasicMaterial({
          color: 0xf5d061,
          wireframe: true,
          transparent: true,
          opacity: 0.65
        });

        pointerNDC = new window.THREE.Vector2();
        raycaster = new window.THREE.Raycaster();
        gltfLoader = new window.THREE.GLTFLoader();

        // Mouse pointer raycasting for specular light and mesh selection
        viewportEl.addEventListener('pointermove', function (e) {
          var rect = viewportEl.getBoundingClientRect();
          var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          var ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
          pointerNDC.set(nx, ny);

          if (pointerLight) pointerLight.position.set(nx * 1.8, ny * 1.8 + 0.6, 1.4);

          if (currentModelRoot && camera && raycaster) {
            raycaster.setFromCamera(pointerNDC, camera);
            var hits = raycaster.intersectObjects(currentModelRoot.children, true);
            var foundId = null;
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
                        foundId = hs.id;
                        foundMesh = obj;
                        break;
                      }
                    }
                  }
                  if (foundId) break;
                  cur = cur.parent;
                }
                if (foundId) break;
              }
            }

            if (foundId !== hoveredHotspotId) {
              if (hoveredMesh && hoveredMesh.material && hoveredMeshOrigEmissive !== null && hoveredMesh.material.emissive) {
                hoveredMesh.material.emissive.setHex(hoveredMeshOrigEmissive);
              }
              hoveredHotspotId = foundId;
              hoveredMesh = foundMesh;
              if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
                hoveredMeshOrigEmissive = hoveredMesh.material.emissive.getHex();
                hoveredMesh.material.emissive.setHex(0x553d10);
              } else {
                hoveredMeshOrigEmissive = null;
              }
              threeCanvas.style.cursor = foundId ? 'pointer' : 'grab';
            }

            if (isThermalMode && hits.length > 0) {
              var hitObj = hits[0].object;
              var curName = hitObj.name || '';
              var curP = hitObj.parent;
              while (curP && curP !== currentModelRoot && (!THERMAL_DB[curName])) {
                if (curP.name && THERMAL_DB[curP.name]) {
                  curName = curP.name;
                  break;
                }
                curP = curP.parent;
              }

              var tInfo = THERMAL_DB[curName];
              if (!tInfo) {
                var dbKeys = Object.keys(THERMAL_DB);
                for (var kIdx = 0; kIdx < dbKeys.length; kIdx++) {
                  if (curName.indexOf(dbKeys[kIdx]) !== -1 || dbKeys[kIdx].indexOf(curName) !== -1) {
                    tInfo = THERMAL_DB[dbKeys[kIdx]];
                    break;
                  }
                }
              }

              if (tInfo) {
                var sSpot = document.getElementById('app3DThermalSpot');
                var sDelta = document.getElementById('app3DThermalDelta');
                var sTgt = document.getElementById('app3DThermalTarget');
                var sStat = document.getElementById('app3DThermalStatus');
                if (sSpot) sSpot.textContent = tInfo.temp.toFixed(1) + ' C / ' + ((tInfo.temp * 9 / 5) + 32).toFixed(1) + ' F';
                if (sDelta) sDelta.textContent = tInfo.delta;
                if (sTgt) sTgt.textContent = tInfo.name;
                if (sStat) {
                  sStat.textContent = 'STATUS: ' + tInfo.status;
                  sStat.style.color = tInfo.temp > 80 ? '#ef4444' : (tInfo.temp > 60 ? '#f59e0b' : '#34d399');
                }
                if (viewportEl && thermalReticleEl) {
                  var vRect = viewportEl.getBoundingClientRect();
                  thermalReticleEl.style.left = (e.clientX - vRect.left) + 'px';
                  thermalReticleEl.style.top = (e.clientY - vRect.top) + 'px';
                }
                Sound.playThermalProbe();
              }
            }
          }
        }, { passive: true });

        threeCanvas.addEventListener('click', function () {
          if (currentStageMode === 'assembly' && raycaster && camera) {
            raycaster.setFromCamera(pointerNDC, camera);
            var bObjects = Object.values(assemblyBeacons).filter(function (b) { return b && b.visible; });
            var hits = raycaster.intersectObjects(bObjects, false);
            if (hits.length > 0 && hits[0].object && hits[0].object.userData.slotKey) {
              handleBeaconClick(hits[0].object.userData.slotKey);
              return;
            }
          }
          if (hoveredHotspotId && currentStageMode === 'teardown') {
            selectHotspot(hoveredHotspotId, true);
          }
        });

        window.addEventListener('resize', onResize, { passive: true });

        callback(true);
      } catch (err) {
        console.warn('[app-3d] WebGL initialization failure:', err);
        callback(false);
      }
    });
  }

  function onResize() {
    if (!renderer || !camera || !viewportEl) return;
    var w = viewportEl.clientWidth;
    var h = viewportEl.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function load3DModel(key) {
    var model = MODELS[key];
    if (!model || !gltfLoader) return;

    setLoader(true);

    if (loadedRoots[key]) {
      mountScene(loadedRoots[key], model);
      setLoader(false);
      return;
    }

    var urls = model.glbCandidates.slice();
    function tryNext() {
      if (urls.length === 0) {
        setLoader(false);
        render2DFallback(model);
        return;
      }
      var url = urls.shift();
      gltfLoader.load(
        url,
        function (gltf) {
          var root = gltf.scene;

          // Auto-center
          var box = new window.THREE.Box3().setFromObject(root);
          var center = new window.THREE.Vector3();
          box.getCenter(center);
          root.position.sub(center);

          // Cache materials & apply procedural textures
          var pcbNorm = createProceduralPcbNormalMap();
          var brushedTex = createProceduralBrushedMetalTexture();

          root.traverse(function (child) {
            if (child.isMesh && child.material) {
              pbrMaterialCache.set(child, child.material);
              child.castShadow = true;
              child.receiveShadow = true;
              child.material.envMapIntensity = 1.35;

              var nodeName = child.name || '';
              if (pcbNorm && (nodeName.indexOf('PCB') !== -1 || nodeName.indexOf('Substrate') !== -1 || nodeName.indexOf('Bed') !== -1)) {
                child.material.normalMap = pcbNorm;
                if (child.material.normalScale) child.material.normalScale.set(0.65, 0.65);
                child.material.needsUpdate = true;
              }

              if (brushedTex && (nodeName.indexOf('Heatsink') !== -1 || nodeName.indexOf('Heatshield') !== -1 || nodeName.indexOf('Armor') !== -1 || nodeName.indexOf('Bezel') !== -1 || nodeName.indexOf('Plate') !== -1 || nodeName.indexOf('Lever') !== -1 || nodeName.indexOf('Caddy') !== -1)) {
                child.material.roughnessMap = brushedTex;
                child.material.metalness = Math.max(child.material.metalness || 0, 0.88);
                child.material.roughness = Math.min(child.material.roughness || 0.5, 0.26);
                child.material.needsUpdate = true;
              }
            }
          });

          // Resolve hotspots 3D coordinates
          resolveHotspots(root, model);

          loadedRoots[key] = root;
          mountScene(root, model);
          setLoader(false);
        },
        undefined,
        function () {
          tryNext();
        }
      );
    }

    tryNext();
  }

  function resolveHotspots(root, model) {
    model.hotspots.forEach(function (hs) {
      var foundNode = null;
      if (hs.nodeName) {
        root.traverse(function (child) {
          if (!foundNode && child.name && child.name.indexOf(hs.nodeName) !== -1) {
            foundNode = child;
          }
        });
      }
      if (foundNode) {
        var box = new window.THREE.Box3().setFromObject(foundNode);
        var center = new window.THREE.Vector3();
        box.getCenter(center);
        hs.worldPos = center;
      } else {
        hs.worldPos = new window.THREE.Vector3(0, 0, 0);
      }
    });
  }

  function mountScene(root, model) {
    if (currentModelRoot) scene.remove(currentModelRoot);
    currentModelRoot = root;
    scene.add(root);

    // Ground contact shadow
    if (!groundShadow) {
      groundShadow = createGroundContactShadow();
      if (groundShadow) scene.add(groundShadow);
    }
    if (groundShadow) {
      if (currentModelKey === 'rack') {
        groundShadow.position.set(0, -1.55, 0);
        groundShadow.scale.set(1.4, 1.4, 1.4);
      } else if (currentModelKey === 'rj45') {
        groundShadow.position.set(0, -0.30, 0);
        groundShadow.scale.set(0.7, 0.7, 0.7);
      } else {
        groundShadow.position.set(0, -0.06, 0);
        groundShadow.scale.set(1.15, 1.15, 1.15);
      }
    }

    // Discover interactive nodes for mechanical actions
    interactiveNodes.lever = null;
    interactiveNodes.loadPlate = null;
    interactiveNodes.caddy = null;
    interactiveNodes.clip = null;
    crimpedPinsList = [];

    root.traverse(function (child) {
      var n = child.name || '';
      if (n.indexOf('Lever') !== -1 || n.indexOf('Retention_Frame') !== -1) {
        interactiveNodes.lever = child;
        child.userData.origRot = child.rotation.clone();
      }
      if (n.indexOf('Plate') !== -1 || n.indexOf('Load') !== -1) {
        interactiveNodes.loadPlate = child;
        child.userData.origRot = child.rotation.clone();
      }
      if (n.indexOf('Caddy') !== -1 && !interactiveNodes.caddy) {
        interactiveNodes.caddy = child;
        child.userData.origPos = child.position.clone();
      }
      if (n.indexOf('Latch') !== -1 || n.indexOf('Clip') !== -1) {
        interactiveNodes.clip = child;
        child.userData.origRot = child.rotation.clone();
      }
      if (n.indexOf('Gold_Pin') !== -1 || n.indexOf('Pin_') !== -1) {
        child.userData.origPosY = child.position.y;
        crimpedPinsList.push(child);
      }
    });

    if (isThermalMode) {
      applyThermalMode(true);
    } else {
      applyShadingMode(isWireframe);
    }

    var c = model.cameraStart || { x: 0, y: 1.4, z: 2.0 };
    var t = model.targetStart || { x: 0, y: 0, z: 0 };
    camera.position.set(c.x, c.y, c.z);
    controls.target.set(t.x, t.y, t.z);
    controls.update();

    renderHotspotDOMPins(model);

    if (fallbackImg) fallbackImg.style.display = 'none';
    if (threeCanvas) threeCanvas.style.display = 'block';

    if (!isRendering) {
      isRendering = true;
      requestAnimationFrame(renderLoop);
    }
  }

  function renderHotspotDOMPins(model) {
    hotspotsWrap.innerHTML = '';
    model.hotspots.forEach(function (hs) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'app3DPin_' + hs.id;
      btn.className = 'app-3d-hotspot-pin';
      btn.setAttribute('aria-label', hs.label);
      btn.style = 'position: absolute; transform: translate(-50%, -50%); border: none; background: none; cursor: pointer; pointer-events: auto;';

      btn.innerHTML = [
        '<span style="display: flex; align-items: center; gap: 6px; background: rgba(11, 11, 15, 0.85); border: 1px solid rgba(212, 175, 55, 0.6); padding: 2px 6px; border-radius: 999px; box-shadow: 0 2px 8px rgba(0,0,0,0.6);">',
        '  <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--gold-primary, #d4af37);"></span>',
        '  <span style="font-size: 0.65rem; color: #fff; font-weight: 700; white-space: nowrap;">' + escapeHTML(hs.label) + '</span>',
        '</span>'
      ].join('');

      btn.addEventListener('click', function () {
        selectHotspot(hs.id, true);
      });
      hotspotsWrap.appendChild(btn);
    });
  }

  function updateHotspotsProjection() {
    if (!camera || !currentModelRoot || !viewportEl) return;
    var model = MODELS[currentModelKey];
    if (!model) return;

    var w = viewportEl.clientWidth;
    var h = viewportEl.clientHeight;

    model.hotspots.forEach(function (hs) {
      var pin = document.getElementById('app3DPin_' + hs.id);
      if (!pin || !hs.worldPos) return;

      var v = hs.worldPos.clone().project(camera);
      // Behind camera check
      if (v.z > 1.0) {
        pin.style.display = 'none';
        return;
      }

      var px = (v.x * 0.5 + 0.5) * w;
      var py = (-v.y * 0.5 + 0.5) * h;
      pin.style.display = 'block';
      pin.style.left = px.toFixed(1) + 'px';
      pin.style.top = py.toFixed(1) + 'px';
    });
  }

  function renderLoop() {
    if (!isRendering) return;
    requestAnimationFrame(renderLoop);

    // Camera animation
    if (camAnim.active) {
      var elapsed = performance.now() - camAnim.startTime;
      var progress = Math.min(elapsed / camAnim.duration, 1.0);
      var ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
      controls.target.lerpVectors(camAnim.startTgt, camAnim.endTgt, ease);

      if (progress >= 1.0) camAnim.active = false;
    }

    // Mechanical animation interpolation
    currentActionLerp += (targetActionLerp - currentActionLerp) * 0.12;
    if (interactiveNodes.lever && interactiveNodes.lever.userData.origRot) {
      interactiveNodes.lever.rotation.x = interactiveNodes.lever.userData.origRot.x - currentActionLerp * 0.73;
    }
    if (interactiveNodes.loadPlate && interactiveNodes.loadPlate.userData.origRot) {
      interactiveNodes.loadPlate.rotation.x = interactiveNodes.loadPlate.userData.origRot.x + currentActionLerp * 0.61;
    }
    if (interactiveNodes.caddy && interactiveNodes.caddy.userData.origPos) {
      interactiveNodes.caddy.position.z = interactiveNodes.caddy.userData.origPos.z + currentActionLerp * 0.40;
    }
    if (interactiveNodes.clip && interactiveNodes.clip.userData.origRot) {
      interactiveNodes.clip.rotation.x = interactiveNodes.clip.userData.origRot.x - currentActionLerp * 0.28;
    }

    // Crimp interpolation (descend 8 gold IDC blades into conductor channels)
    currentCrimpLerp += (targetCrimpLerp - currentCrimpLerp) * 0.14;
    if (currentModelKey === 'rj45' && crimpedPinsList.length > 0) {
      crimpedPinsList.forEach(function (pin) {
        if (pin.userData && pin.userData.origPosY !== undefined) {
          pin.position.y = pin.userData.origPosY - currentCrimpLerp * 0.08;
        }
      });
    }

    // 42U Datacenter Rack Tipping & Stability Physics
    if (currentModelKey === 'rack' && currentModelRoot) {
      if (isStabilityTesting) {
        rackStabilityPhase += 0.08;
        var decay = Math.exp(-rackStabilityPhase * 0.14);
        var wobble = Math.sin(rackStabilityPhase * 3.2) * 0.032 * decay;
        currentRackTilt += (targetRackTilt - currentRackTilt) * 0.10;
        currentModelRoot.rotation.x = currentRackTilt + wobble;
      } else {
        currentRackTilt += (0.0 - currentRackTilt) * 0.12;
        currentModelRoot.rotation.x = currentRackTilt;
      }
    }

    // Explode interpolation
    currentExplodeFactor += (targetExplodeFactor - currentExplodeFactor) * 0.08;

    // Pulse active beacons in assembly mode
    if (currentStageMode === 'assembly' && window.THREE) {
      assemblyGhostPulse += 0.06;
      var pulseVal = 0.45 + 0.35 * Math.sin(assemblyGhostPulse);
      Object.keys(assemblyBeacons).forEach(function (k) {
        var beacon = assemblyBeacons[k];
        if (beacon && beacon.visible) {
          var slotDef = ASSEMBLY_SLOTS[k];
          var isHeldTarget = (heldCompId && slotDef && slotDef.requiredComp === heldCompId);
          if (isHeldTarget) {
            beacon.material.color.setHex(0xd4af37);
            beacon.material.opacity = pulseVal;
          } else {
            beacon.material.color.setHex(0x38bdf8);
            beacon.material.opacity = 0.45;
          }
        }
      });
    }

    controls.update();
    renderer.render(scene, camera);
    updateHotspotsProjection();
  }

  function applyShadingMode(wireframe) {
    isWireframe = wireframe;
    if (!currentModelRoot) return;
    currentModelRoot.traverse(function (c) {
      if (c.isMesh) {
        if (isWireframe && wireframeMat) {
          c.material = wireframeMat;
        } else {
          var orig = pbrMaterialCache.get(c);
          if (orig) c.material = orig;
        }
      }
    });
  }

  function toggleShading() {
    isWireframe = !isWireframe;
    applyShadingMode(isWireframe);
    Sound.playClick();
    var b = document.getElementById('app3DToolShading');
    if (b) {
      b.classList.toggle('is-active', isWireframe);
      b.textContent = isWireframe ? 'PBR Studio' : 'Wireframe';
    }
  }

  function toggleExplode() {
    isExploded = !isExploded;
    targetExplodeFactor = isExploded ? 1.0 : 0.0;
    Sound.playClick();
    var b = document.getElementById('app3DToolExplode');
    if (b) b.classList.toggle('is-active', isExploded);
  }

  function toggleAction() {
    isActionEngaged = !isActionEngaged;
    targetActionLerp = isActionEngaged ? 1.0 : 0.0;
    Sound.playEngage();

    var model = MODELS[currentModelKey];
    var actBtn = document.getElementById('app3DToolAction');
    var actLbl = document.getElementById('app3DToolActionLabel');
    if (actBtn) actBtn.classList.toggle('is-active', isActionEngaged);
    if (actLbl && model) {
      actLbl.textContent = isActionEngaged ? model.actionActiveLabel : model.actionLabel;
    }
  }

  function applyThermalMode(enable) {
    isThermalMode = enable;
    if (thermalHudEl) thermalHudEl.style.display = enable ? 'flex' : 'none';
    if (thermalReticleEl) thermalReticleEl.style.display = enable ? 'block' : 'none';

    var btn = document.getElementById('app3DToolThermal');
    if (btn) btn.classList.toggle('is-active', enable);

    if (!currentModelRoot) return;

    if (enable) {
      currentModelRoot.traverse(function (child) {
        if (child.isMesh && child.material) {
          if (!thermalMaterialsMap.has(child)) {
            thermalMaterialsMap.set(child, child.material);
          }
          var n = child.name || '';
          var info = THERMAL_DB[n];
          if (!info) {
            var keys = Object.keys(THERMAL_DB);
            for (var i = 0; i < keys.length; i++) {
              if (n.indexOf(keys[i]) !== -1 || keys[i].indexOf(n) !== -1) {
                info = THERMAL_DB[keys[i]];
                break;
              }
            }
          }
          var temp = info ? info.temp : (currentModelKey === 'rack' ? 24.0 : 31.0);
          var colorHex = getIronbowColor(temp);

          var tMat = new window.THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 0.35,
            roughness: 0.45,
            metalness: 0.15
          });
          child.material = tMat;
        }
      });
    } else {
      currentModelRoot.traverse(function (child) {
        if (child.isMesh) {
          var orig = thermalMaterialsMap.get(child) || pbrMaterialCache.get(child);
          if (orig) child.material = orig;
        }
      });
    }
  }

  function toggleThermalMode() {
    Sound.playClick();
    applyThermalMode(!isThermalMode);
  }

  function triggerCrimpAction() {
    if (currentModelKey !== 'rj45') return;
    isCrimped = !isCrimped;
    targetCrimpLerp = isCrimped ? 1.0 : 0.0;
    Sound.playRatchetCrimp();

    var b = document.getElementById('app3DToolCrimp');
    if (b) {
      b.classList.toggle('is-active', isCrimped);
      b.textContent = isCrimped ? 'Release Crimp' : 'Ratchet Crimp';
    }

    var tit = document.getElementById('app3DInspTitle');
    var desc = document.getElementById('app3DInspDesc');
    var take = document.getElementById('app3DInspTakeaway');
    var trbl = document.getElementById('app3DInspTroubleshoot');

    if (isCrimped) {
      if (tit) tit.textContent = '8P8C Ratchet Crimp: VERIFIED';
      if (desc) desc.textContent = 'All 8 gold IDC blades pressed down into AWG 23 solid copper conductors. Gas-tight connection established with 0.018 Ohm contact resistance compliant with ANSI/TIA-568.2-D.';
      if (take) take.textContent = 'CompTIA Core 1 Obj 3.1 & 5.3: Ratchet crimpers guarantee uniform pressure until full cycle stroke completion. Incomplete crimps create intermittent Gigabit link drops and open wire pairs on continuity testers.';
      if (trbl) trbl.textContent = 'Continuity test indicates 8/8 conductors pinned straight-through. Pin pairs 1-2, 3-6, 4-5, 7-8 maintain specified twist ratios right up to IDC contacts (within 0.5 inches of termination).';
    } else {
      if (tit) tit.textContent = 'IDC Blades Retracted';
      if (desc) desc.textContent = 'Gold contact blades retracted. Conductor wires resting in pre-crimp alignment channels.';
    }
  }

  function testRackStability() {
    if (currentModelKey !== 'rack') return;
    isStabilityTesting = !isStabilityTesting;
    Sound.playClick();

    var b = document.getElementById('app3DToolRackStability');
    if (b) {
      b.classList.toggle('is-active', isStabilityTesting);
      b.textContent = isStabilityTesting ? 'Reset Stability' : 'CoG Stability';
    }

    var tit = document.getElementById('app3DInspTitle');
    var desc = document.getElementById('app3DInspDesc');
    var take = document.getElementById('app3DInspTakeaway');
    var trbl = document.getElementById('app3DInspTroubleshoot');

    if (isStabilityTesting) {
      targetRackTilt = 0.13;
      rackStabilityPhase = 0;
      Sound.playTiltAlarm();

      if (tit) tit.textContent = 'CRITICAL TIPPING HAZARD: High Center of Gravity';
      if (desc) desc.textContent = 'Cabinet Center-of-Gravity calculated at 28.4U (critical threshold: 15.0U). Heavy 38kg Online UPS placed in upper bays causes overturning moment when server chassis telescoping slide rails extend forward during hot-swap maintenance.';
      if (take) take.textContent = 'CompTIA Core 1 Obj 3.4 & Server+: OSHA and EIA-310 standard requires heaviest equipment (battery UPS, power conditioners, disk shelves) to be anchored in bottom U-slots (U01-U06) to maintain low center of mass.';
      if (trbl) trbl.textContent = 'Corrective Action: De-rack UPS from U28. Mount UPS in bottom U01-U03 bays. Anchor cabinet base plinth to concrete slab with seismic expansion bolts and extend anti-tip stabilizer kickplates.';
    } else {
      targetRackTilt = 0.0;
      if (tit) tit.textContent = 'Datacenter Rack Restored';
      if (desc) desc.textContent = 'Cabinet returned to vertical EIA-310 reference baseline.';
    }
  }

  function setCameraPreset(preset) {
    var model = MODELS[currentModelKey];
    if (!model || !camera || !controls) return;
    Sound.playClick();

    var bHero = document.getElementById('app3DToolCamHero');
    var bTop = document.getElementById('app3DToolCamTop');
    if (bHero) bHero.classList.toggle('is-active', preset === 'hero');
    if (bTop) bTop.classList.toggle('is-active', preset === 'top');

    if (preset === 'top') {
      var topY = currentModelKey === 'rack' ? 3.4 : 2.5;
      flyTo(new window.THREE.Vector3(0, topY, 0.001), new window.THREE.Vector3(0, 0, 0), 650);
    } else {
      var c = model.cameraStart || { x: 0, y: 1.4, z: 2.0 };
      var t = model.targetStart || { x: 0, y: 0, z: 0 };
      flyTo(new window.THREE.Vector3(c.x, c.y, c.z), new window.THREE.Vector3(t.x, t.y, t.z), 650);
    }
  }

  function toggleRotate() {
    isAutoRotate = !isAutoRotate;
    if (controls) controls.autoRotate = isAutoRotate;
    Sound.playClick();
    var b = document.getElementById('app3DToolRotate');
    if (b) b.classList.toggle('is-active', isAutoRotate);
  }

  function render2DFallback(model) {
    if (threeCanvas) threeCanvas.style.display = 'none';
    if (fallbackImg) {
      fallbackImg.src = model.fallbackImg;
      fallbackImg.style.display = 'block';
    }
    renderHotspotDOMPins(model);
    selectHotspot(model.defaultHotspot, false);
  }

  // ---------------------------------------------------------------------------
  // 7. Public API Export
  // ---------------------------------------------------------------------------
  var App3DStage = {
    openModal: function (modelKey, targetHotspotId, options) {
      options = options || {};
      buildModalDOM();
      modalEl.classList.add('active');

      if (options.slots) {
        assemblySlots = Object.assign({}, options.slots);
      }
      if (typeof options.onSlotUpdate === 'function') {
        onSlotUpdateCallback = options.onSlotUpdate;
      } else {
        onSlotUpdateCallback = null;
      }

      switchModel(modelKey || 'mobo');
      var targetMode = (options.assemblyMode && (modelKey === 'mobo' || !modelKey)) ? 'assembly' : 'teardown';

      initThreeEngine(function (supported) {
        if (supported) {
          load3DModel(modelKey || 'mobo');
          setTimeout(function () {
            setStageMode(targetMode);
            if (targetHotspotId && targetMode === 'teardown') {
              selectHotspot(targetHotspotId, true);
            }
          }, 350);
        } else {
          render2DFallback(MODELS[modelKey || 'mobo']);
          setStageMode(targetMode);
        }
      });
    },

    closeModal: function () {
      closeModal();
    },

    switchModel: function (key) {
      switchModel(key);
    },

    selectHotspot: function (id) {
      selectHotspot(id, true);
    },

    setStageMode: function (mode) {
      setStageMode(mode);
    },

    mountComponent: function (slotKey, compId, rotDeg) {
      mountComponent(slotKey, compId, rotDeg);
    },

    ejectComponent: function (slotKey) {
      ejectComponent(slotKey);
    },

    runPostDiagnostics: function () {
      runPostDiagnostics();
    },

    getAssemblySlots: function () {
      return Object.assign({}, assemblySlots);
    },

    toggleThermalMode: function () {
      toggleThermalMode();
    },

    triggerCrimpAction: function () {
      triggerCrimpAction();
    },

    testRackStability: function () {
      testRackStability();
    },

    getPcbNormalMap: function () {
      return createProceduralPcbNormalMap();
    },

    getBrushedMetalTexture: function () {
      return createProceduralBrushedMetalTexture();
    },

    isSupported: function () {
      return !!(window.WebGLRenderingContext && (document.createElement('canvas').getContext('webgl') || document.createElement('canvas').getContext('experimental-webgl')));
    }
  };

  window.APlus.App3DStage = App3DStage;

})(window);
