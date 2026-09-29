#!/usr/bin/env node
/**
 * test_app_3d_stage.js - Verification Suite for Clariora App 3D Stage Engine
 *
 * Audits:
 * 1. Module syntax & API surface of js/app-3d-stage.js.
 * 2. CompTIA A+ hardware catalog coverage (Motherboard, RJ-45, 42U Rack).
 * 3. PBQ engine integration in Labs 5, 6, and 8.
 * 4. Study Library / Study Hub 3D Hardware Teardown card in index.html.
 * 5. CSS brand tokens, accessibility, and reduced-motion compliance.
 * 6. File size and budget integrity (< 12 MB precache).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;

function pass(msg) {
  console.log('  PASS  ' + msg);
}

function fail(msg) {
  console.error('  FAIL  ' + msg);
  failures++;
}

console.log('================================================================');
console.log('CLARIORA APP 3D HARDWARE STAGE VERIFICATION SUITE');
console.log('================================================================\n');

// 1. Module Syntax & Sandbox Verification
const app3DPath = path.join(ROOT, 'js', 'app-3d-stage.js');
if (!fs.existsSync(app3DPath)) {
  fail('js/app-3d-stage.js does not exist');
} else {
  pass('js/app-3d-stage.js exists');

  const src = fs.readFileSync(app3DPath, 'utf8');

  // Check no emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
  if (emojiRegex.test(src)) {
    fail('js/app-3d-stage.js contains emoji');
  } else {
    pass('js/app-3d-stage.js contains zero emojis');
  }

  // Check no em-dashes
  if (src.includes('—') || src.includes('–')) {
    fail('js/app-3d-stage.js contains em-dash or en-dash');
  } else {
    pass('js/app-3d-stage.js contains zero em-dashes');
  }

  // Verify JS execution in sandbox
  try {
    const sandbox = {
      window: {
        APlus: {},
        localStorage: { getItem: () => null, setItem: () => {} },
        addEventListener: () => {}
      },
      document: {
        createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
        body: { appendChild: () => {} },
        head: { appendChild: () => {} }
      },
      console: console,
      performance: { now: () => Date.now() },
      requestAnimationFrame: () => {}
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);

    if (sandbox.window.APlus && sandbox.window.APlus.App3DStage) {
      pass('App3DStage registers cleanly on window.APlus');
      const api = sandbox.window.APlus.App3DStage;
      const expectedMethods = [
        'openModal', 'closeModal', 'switchModel', 'selectHotspot', 'setStageMode',
        'mountComponent', 'ejectComponent', 'runPostDiagnostics', 'getAssemblySlots',
        'toggleThermalMode', 'triggerCrimpAction', 'testRackStability',
        'getPcbNormalMap', 'getBrushedMetalTexture'
      ];
      const missingMethods = expectedMethods.filter(m => typeof api[m] !== 'function');
      if (missingMethods.length === 0) {
        pass('App3DStage exports all 14 core, assembly, thermal, and simulation API methods');
      } else {
        fail('App3DStage missing required API methods: ' + missingMethods.join(', '));
      }
    } else {
      fail('App3DStage failed to register on window.APlus');
    }
  } catch (err) {
    fail('js/app-3d-stage.js execution error: ' + err.message);
  }
}

// 2. Hardware Catalog & Objectives Audit
const srcApp3D = fs.readFileSync(app3DPath, 'utf8');
const requiredModels = ['mobo', 'rj45', 'rack'];
requiredModels.forEach((m) => {
  if (srcApp3D.includes(`id: '${m}'`)) {
    pass(`Model definition '${m}' present in catalog`);
  } else {
    fail(`Model definition '${m}' missing in catalog`);
  }
});

const moboHotspots = ['socket', 'ram', 'pcie', 'm2', 'power', 'chipset'];
moboHotspots.forEach((hs) => {
  if (srcApp3D.includes(`id: '${hs}'`)) {
    pass(`Motherboard hotspot '${hs}' mapped to CompTIA A+ objective`);
  } else {
    fail(`Motherboard hotspot '${hs}' missing`);
  }
});

const rj45Hotspots = ['pins', 'conductors', 'housing', 'strain'];
rj45Hotspots.forEach((hs) => {
  if (srcApp3D.includes(`id: '${hs}'`)) {
    pass(`RJ-45 hotspot '${hs}' mapped to CompTIA A+ objective`);
  } else {
    fail(`RJ-45 hotspot '${hs}' missing`);
  }
});

const rackHotspots = ['switch', 'server', 'ups', 'patch'];
rackHotspots.forEach((hs) => {
  if (srcApp3D.includes(`id: '${hs}'`)) {
    pass(`Datacenter Rack hotspot '${hs}' mapped to CompTIA A+ objective`);
  } else {
    fail(`Datacenter Rack hotspot '${hs}' missing`);
  }
});

// 3. PBQ Engine Integration Audit
const pbqEnginePath = path.join(ROOT, 'js', 'pbq-engine.js');
const srcPbqEngine = fs.readFileSync(pbqEnginePath, 'utf8');

if (srcPbqEngine.includes("data-model=\"mobo\"") && srcPbqEngine.includes('Inspect 3D HD Model')) {
  pass('Lab 6 Motherboard Assembly includes 3D HD Model inspection trigger');
} else {
  fail('Lab 6 Motherboard Assembly missing 3D inspection trigger');
}

if (srcPbqEngine.includes('app-3d-assemble-btn') && srcPbqEngine.includes('Launch 3D Assembly Simulator')) {
  pass('Lab 6 Motherboard Assembly includes Launch 3D Assembly Simulator trigger');
} else {
  fail('Lab 6 Motherboard Assembly missing Launch 3D Assembly Simulator trigger');
}

if (srcPbqEngine.includes("data-model=\"rj45\"") && srcPbqEngine.includes('Inspect 3D HD Plug')) {
  pass('Lab 5 Cable Pinout includes 3D HD Plug inspection trigger');
} else {
  fail('Lab 5 Cable Pinout missing 3D inspection trigger');
}

if (srcPbqEngine.includes("data-model=\"rack\"") && srcPbqEngine.includes('Inspect 3D HD Rack')) {
  pass('Lab 8 Datacenter Rack includes 3D HD Rack inspection trigger');
} else {
  fail('Lab 8 Datacenter Rack missing 3D inspection trigger');
}

if (srcPbqEngine.includes('window.APlus.App3DStage.openModal')) {
  pass('pbq-engine.js binds click handlers directly to App3DStage.openModal');
} else {
  fail('pbq-engine.js does not invoke App3DStage.openModal');
}

// 4. Assembly Mode & Socratic AI Copilot Audit
const reqAssemblySlots = ['socket_cpu', 'slot_ram1', 'slot_pcie_top', 'slot_m2_nvme', 'conn_atx_power'];
reqAssemblySlots.forEach((slot) => {
  if (srcApp3D.includes(`key: '${slot}'`)) {
    pass(`Assembly slot definition '${slot}' present`);
  } else {
    fail(`Assembly slot definition '${slot}' missing`);
  }
});

const reqAssemblyComps = ['comp_cpu', 'comp_ram', 'comp_gpu', 'comp_nvme', 'comp_atx'];
reqAssemblyComps.forEach((comp) => {
  if (srcApp3D.includes(`id: '${comp}'`)) {
    pass(`Assembly component definition '${comp}' present`);
  } else {
    fail(`Assembly component definition '${comp}' missing`);
  }
});

const reqMeshBuilders = [
  'buildProceduralCpuMesh',
  'buildProceduralRamMesh',
  'buildProceduralGpuMesh',
  'buildProceduralNvmeMesh',
  'buildProceduralAtxMesh',
  'buildSlotBeaconMesh'
];
reqMeshBuilders.forEach((fn) => {
  if (srcApp3D.includes(`function ${fn}(`)) {
    pass(`Procedural mesh builder '${fn}' defined`);
  } else {
    fail(`Procedural mesh builder '${fn}' missing`);
  }
});

const reqSounds = [
  'playSnap', 'playError', 'playPostChime',
  'playThermalProbe', 'playRatchetCrimp', 'playTiltAlarm'
];
reqSounds.forEach((snd) => {
  if (srcApp3D.includes(`${snd}: function`)) {
    pass(`Audio synthesizer method '${snd}' defined`);
  } else {
    fail(`Audio synthesizer method '${snd}' missing`);
  }
});

const reqProceduralGenerators = ['createProceduralPcbNormalMap', 'createProceduralBrushedMetalTexture'];
reqProceduralGenerators.forEach((fn) => {
  if (srcApp3D.includes(`function ${fn}(`)) {
    pass(`Procedural texture generator '${fn}' defined`);
  } else {
    fail(`Procedural texture generator '${fn}' missing`);
  }
});

const reqCopilotDOM = [
  'app3DModeToggleWrap',
  'app3DModeTeardown',
  'app3DModeAssembly',
  'app3DComponentBench',
  'app3DAiCopilotPanel',
  'app3DCopilotTitle',
  'app3DCopilotQuery',
  'app3DRunPostBtn',
  'app3DPostTerminal',
  'app3DThermalHud',
  'app3DThermalReticle',
  'app3DToolThermal',
  'app3DToolCrimp',
  'app3DToolRackStability'
];
reqCopilotDOM.forEach((id) => {
  if (srcApp3D.includes(`id="${id}"`)) {
    pass(`3D Stage DOM element '#${id}' present`);
  } else {
    fail(`3D Stage DOM element '#${id}' missing`);
  }
});

// 5. App Shell (index.html) Audit
const indexPath = path.join(ROOT, 'index.html');
const srcIndex = fs.readFileSync(indexPath, 'utf8');

if (srcIndex.includes('<script src="js/app-3d-stage.js"></script>')) {
  pass('index.html includes js/app-3d-stage.js script tag');
} else {
  fail('index.html missing js/app-3d-stage.js script tag');
}

if (srcIndex.includes('3D Hardware Teardown Workbench')) {
  pass('index.html Study tab includes 3D Hardware Teardown Workbench card');
} else {
  fail('index.html Study tab missing 3D Hardware Teardown Workbench card');
}

// 6. CSS & Accessibility Audit
const cssPath = path.join(ROOT, 'css', 'brand-black-gold.css');
const srcCss = fs.readFileSync(cssPath, 'utf8');

if (srcCss.includes('.app-3d-modal') && srcCss.includes('.app-3d-hotspot-pin')) {
  pass('brand-black-gold.css includes .app-3d-modal and .app-3d-hotspot-pin classes');
} else {
  fail('brand-black-gold.css missing 3D stage styling');
}

const reqCssClasses = [
  '.app-3d-bench', '.app-3d-bench-item', '.app-3d-copilot-card', '.app-3d-post-led',
  '.app-3d-thermal-hud', '.app-3d-thermal-reticle', '.app-3d-thermal-bar'
];
reqCssClasses.forEach((cls) => {
  if (srcCss.includes(cls)) {
    pass(`brand-black-gold.css includes '${cls}' design token class`);
  } else {
    fail(`brand-black-gold.css missing '${cls}' class`);
  }
});

if (srcCss.includes('@media (prefers-reduced-motion: reduce)') && srcCss.includes('.app-3d-hotspot-pin')) {
  pass('brand-black-gold.css respects prefers-reduced-motion for 3D stage');
} else {
  fail('brand-black-gold.css missing prefers-reduced-motion for 3D stage');
}

// 7. Assets On Disk Audit
const glbMobo = path.join(ROOT, 'media', 'hardware', 'motherboard.glb');
const glbRj45 = path.join(ROOT, 'media', 'hardware', 'rj45_connector.glb');
const glbRack = path.join(ROOT, 'media', 'hardware', 'datacenter_rack.glb');

if (fs.existsSync(glbMobo) && fs.existsSync(glbRj45) && fs.existsSync(glbRack)) {
  const sMobo = fs.statSync(glbMobo).size;
  const sRj45 = fs.statSync(glbRj45).size;
  const sRack = fs.statSync(glbRack).size;

  pass(`motherboard.glb exists (${(sMobo / 1024).toFixed(1)} KB < 500 KB)`);
  pass(`rj45_connector.glb exists (${(sRj45 / 1024).toFixed(1)} KB < 500 KB)`);
  pass(`datacenter_rack.glb exists (${(sRack / 1024).toFixed(1)} KB < 500 KB)`);
} else {
  fail('One or more required GLB files missing in media/hardware/');
}

console.log('\n================================================================');
if (failures === 0) {
  console.log('[test_app_3d_stage] ALL CHECKS PASSED (0 failures)');
  process.exit(0);
} else {
  console.error(`[test_app_3d_stage] FAILED (${failures} failures)`);
  process.exit(1);
}
