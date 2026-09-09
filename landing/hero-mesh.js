/**
 * Clariora Landing Page - Luxury Gold WebGL Mesh Shader
 * High-craft ambient background for the hero section.
 * Honors prefers-reduced-motion and pauses via IntersectionObserver when scrolled offscreen.
 */
(function () {
  'use strict';

  if (!window.WebGLRenderingContext) return;

  var DARK_PALETTE = ['#07090E', '#111520', '#261C06', '#59410A', '#B8860B', '#F5D061'];
  var LIGHT_PALETTE = ['#F6F7F9', '#FFFFFF', '#F5EEDB', '#D9BC68', '#B8901E', '#856611'];

  function normalizeColor(hex) {
    var num = parseInt(hex.replace('#', '0x'), 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
  }

  function getActivePalette() {
    var isLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return isLight ? LIGHT_PALETTE : DARK_PALETTE;
  }

  var V_SHADER = [
    'precision highp float;',
    'attribute vec4 position;',
    'attribute vec2 uv;',
    'attribute vec2 uvNorm;',
    'uniform mat4 projectionMatrix;',
    'uniform mat4 modelViewMatrix;',
    'uniform vec2 resolution;',
    'uniform float u_time;',
    'uniform vec2 u_mouse;',
    'uniform vec3 u_colors[6];',
    'varying vec3 v_color;',
    '',
    'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }',
    'vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }',
    '',
    'float snoise(vec3 v) {',
    '  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);',
    '  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);',
    '  vec3 i = floor(v + dot(v, C.yyy));',
    '  vec3 x0 = v - i + dot(i, C.xxx);',
    '  vec3 g = step(x0.yzx, x0.xyz);',
    '  vec3 l = 1.0 - g;',
    '  vec3 i1 = min(g.xyz, l.zxy);',
    '  vec3 i2 = max(g.xyz, l.zxy);',
    '  vec3 x1 = x0 - i1 + C.xxx;',
    '  vec3 x2 = x0 - i2 + C.yyy;',
    '  vec3 x3 = x0 - D.yyy;',
    '  i = mod289(i);',
    '  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));',
    '  float n_ = 0.142857142857;',
    '  vec3 ns = n_ * D.wyz - D.xzx;',
    '  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);',
    '  vec4 x_ = floor(j * ns.z);',
    '  vec4 y_ = floor(j - 7.0 * x_);',
    '  vec4 x = x_ * ns.x + ns.yyyy;',
    '  vec4 y = y_ * ns.x + ns.yyyy;',
    '  vec4 h = 1.0 - abs(x) - abs(y);',
    '  vec4 b0 = vec4(x.xy, y.xy);',
    '  vec4 b1 = vec4(x.zw, y.zw);',
    '  vec4 s0 = floor(b0) * 2.0 + 1.0;',
    '  vec4 s1 = floor(b1) * 2.0 + 1.0;',
    '  vec4 sh = -step(h, vec4(0.0));',
    '  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;',
    '  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;',
    '  vec3 p0 = vec3(a0.xy, h.x);',
    '  vec3 p1 = vec3(a0.zw, h.y);',
    '  vec3 p2 = vec3(a1.xy, h.z);',
    '  vec3 p3 = vec3(a1.zw, h.w);',
    '  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));',
    '  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;',
    '  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);',
    '  m = m * m;',
    '  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));',
    '}',
    '',
    'void main() {',
    '  float time = u_time * 0.000028;',
    '  vec2 noiseCoord = resolution * uvNorm * vec2(0.00010, 0.00014);',
    '  float distToMouse = length(uvNorm - u_mouse);',
    '  float mouseWave = sin(distToMouse * 5.5 - time * 6.0) * smoothstep(1.2, 0.0, distToMouse) * 38.0;',
    '  float baseWave = snoise(vec3(noiseCoord.x * 1.9 + time * 0.9, noiseCoord.y * 1.9, time * 0.6)) * 115.0;',
    '  baseWave *= (1.0 - pow(abs(uvNorm.y), 2.2));',
    '  float wave = baseWave + mouseWave;',
    '',
    '  vec3 pos = vec3(position.x, position.y + wave, position.z);',
    '  vec3 col = u_colors[0];',
    '  for (int i = 1; i < 6; i++) {',
    '    float n = smoothstep(0.14, 0.86, snoise(vec3(noiseCoord * float(i) * 0.65, time * 0.45 + float(i))) * 0.5 + 0.5);',
    '    float mouseGlow = (1.0 - smoothstep(0.0, 0.7, distToMouse)) * 0.22;',
    '    col = mix(col, u_colors[i], pow(n, 2.2) * (0.60 + mouseGlow));',
    '  }',
    '  v_color = col;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
    '}'
  ].join('\n');

  var F_SHADER = [
    'precision highp float;',
    'varying vec3 v_color;',
    'void main() {',
    '  gl_FragColor = vec4(v_color, 1.0);',
    '}'
  ].join('\n');

  function HeroMesh(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' }) ||
              canvas.getContext('experimental-webgl', { antialias: false, powerPreference: 'low-power' });
    if (!this.gl) return;

    this.running = false;
    this.time = 0;
    this.last = 0;
    this.targetMouse = [0, 0];
    this.curMouse = [0, 0];

    this.init();
  }

  HeroMesh.prototype.init = function () {
    var gl = this.gl;
    var prog = gl.createProgram();

    function compile(type, src) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    }

    var vs = compile(gl.VERTEX_SHADER, V_SHADER);
    var fs = compile(gl.FRAGMENT_SHADER, F_SHADER);

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    this.prog = prog;

    this.timeLoc = gl.getUniformLocation(prog, 'u_time');
    this.mouseLoc = gl.getUniformLocation(prog, 'u_mouse');

    this.setupColors();
    this.setupMesh();
    this.resize();

    var self = this;
    window.addEventListener('resize', function () { self.resize(); }, { passive: true });

    // Interactive fluid pointer tracking across hero
    var hero = this.canvas.parentElement;
    var onPointer = function (e) {
      var rect = (hero || self.canvas).getBoundingClientRect();
      var cx = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left + rect.width / 2);
      var cy = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : rect.top + rect.height / 2);
      var nx = ((cx - rect.left) / rect.width) * 2 - 1;
      var ny = 1 - ((cy - rect.top) / rect.height) * 2;
      self.targetMouse[0] = Math.max(-1.5, Math.min(1.5, nx));
      self.targetMouse[1] = Math.max(-1.5, Math.min(1.5, ny));
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('touchmove', onPointer, { passive: true });
    document.addEventListener('mouseleave', function () {
      self.targetMouse[0] = 0;
      self.targetMouse[1] = 0;
    }, { passive: true });

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
        self.setupColors();
      });
    }
  };

  HeroMesh.prototype.setupColors = function () {
    var gl = this.gl;
    gl.useProgram(this.prog);
    var palette = getActivePalette();
    var flat = [];
    for (var i = 0; i < palette.length; i++) {
      var c = normalizeColor(palette[i]);
      flat.push(c[0], c[1], c[2]);
    }
    var loc = gl.getUniformLocation(this.prog, 'u_colors');
    gl.uniform3fv(loc, new Float32Array(flat));
  };

  HeroMesh.prototype.setupMesh = function () {
    var gl = this.gl;
    this.xSegs = 28;
    this.ySegs = 18;
    var count = (this.xSegs + 1) * (this.ySegs + 1);

    this.posBuf = gl.createBuffer();
    this.uvBuf = gl.createBuffer();
    this.idxBuf = gl.createBuffer();

    var uvs = new Float32Array(count * 2);
    var uvNorms = new Float32Array(count * 2);
    var indices = new Uint16Array(this.xSegs * this.ySegs * 6);

    for (var y = 0; y <= this.ySegs; y++) {
      for (var x = 0; x <= this.xSegs; x++) {
        var i = y * (this.xSegs + 1) + x;
        uvs[i * 2] = x / this.xSegs;
        uvs[i * 2 + 1] = 1 - y / this.ySegs;
        uvNorms[i * 2] = (x / this.xSegs) * 2 - 1;
        uvNorms[i * 2 + 1] = 1 - (y / this.ySegs) * 2;

        if (x < this.xSegs && y < this.ySegs) {
          var idx = (y * this.xSegs + x) * 6;
          var a = i;
          var b = i + 1;
          var c = i + 1 + this.xSegs;
          var d = i + 2 + this.xSegs;
          indices[idx] = a;
          indices[idx + 1] = c;
          indices[idx + 2] = b;
          indices[idx + 3] = b;
          indices[idx + 4] = c;
          indices[idx + 5] = d;
        }
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvNorms, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;
  };

  HeroMesh.prototype.resize = function () {
    var parent = this.canvas.parentElement;
    if (!parent) return;

    var w = parent.clientWidth || window.innerWidth || 800;
    var h = parent.clientHeight || window.innerHeight || 600;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    var gl = this.gl;
    gl.useProgram(this.prog);
    gl.uniform2f(gl.getUniformLocation(this.prog, 'resolution'), w, h);

    var pMat = [2 / w, 0, 0, 0, 0, 2 / h, 0, 0, 0, 0, -0.001, 0, 0, 0, 0, 1];
    var mMat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    gl.uniformMatrix4fv(gl.getUniformLocation(this.prog, 'projectionMatrix'), false, pMat);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.prog, 'modelViewMatrix'), false, mMat);

    var count = (this.xSegs + 1) * (this.ySegs + 1);
    var positions = new Float32Array(count * 3);
    var segW = w / this.xSegs;
    var segH = h / this.ySegs;
    var offX = -w / 2;
    var offY = -h / 2;

    for (var y = 0; y <= this.ySegs; y++) {
      for (var x = 0; x <= this.xSegs; x++) {
        var i = (y * (this.xSegs + 1) + x) * 3;
        positions[i] = offX + x * segW;
        positions[i + 1] = -(offY + y * segH);
        positions[i + 2] = 0;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  };

  HeroMesh.prototype.render = function (ts) {
    if (!this.running) return;
    this.time += Math.min(ts - (this.last || ts), 33);
    this.last = ts;

    // Smooth fluid lerp interpolation
    this.curMouse[0] += (this.targetMouse[0] - this.curMouse[0]) * 0.055;
    this.curMouse[1] += (this.targetMouse[1] - this.curMouse[1]) * 0.055;

    var gl = this.gl;
    gl.useProgram(this.prog);
    gl.uniform1f(this.timeLoc, this.time);
    gl.uniform2f(this.mouseLoc, this.curMouse[0], this.curMouse[1]);

    var posLoc = gl.getAttribLocation(this.prog, 'position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    var uvLoc = gl.getAttribLocation(this.prog, 'uvNorm');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuf);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

    var self = this;
    this.rafId = requestAnimationFrame(function (time) { self.render(time); });
  };

  HeroMesh.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this;
    this.rafId = requestAnimationFrame(function (time) { self.render(time); });
  };

  HeroMesh.prototype.stop = function () {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  function boot() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Ensure we do not attach multiple canvases
    if (hero.querySelector('.hero-mesh-canvas')) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'hero-mesh-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);

    var mesh = new HeroMesh(canvas);
    if (!mesh.gl) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            mesh.start();
          } else {
            mesh.stop();
          }
        });
      }, { threshold: 0.05 });
      observer.observe(hero);
    } else {
      mesh.start();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
