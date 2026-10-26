/* Cielo 3D: la esfera celeste en el momento y lugar de nacimiento (Three.js, carga diferida).
   Marco de la escena = horizonte local: +x Este, +y cénit, −z Norte. */
(function () {
  'use strict';
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
  const R = 10;
  const DEG = Math.PI / 180;
  const COL = {
    ink: '#141824', ivory: '#F3EBDD', gold: '#C9A24E', goldSoft: '#9C7428', tense: '#D0694F', teal: '#7FA7B5',
  };
  const STAR_NAMES = { Sirius: 'Sirio', Canopus: 'Canopo', Arcturus: 'Arturo', 'Rigil Kentaurus': 'Alfa Centauri', Vega: 'Vega', Capella: 'Capella', Rigel: 'Rigel', Procyon: 'Proción', Achernar: 'Achernar', Betelgeuse: 'Betelgeuse', Hadar: 'Hadar', Altair: 'Altair', Acrux: 'Acrux', Aldebaran: 'Aldebarán', Spica: 'Espiga', Antares: 'Antares', Pollux: 'Pólux', Fomalhaut: 'Fomalhaut', Deneb: 'Deneb', Regulus: 'Régulo' };

  let THREE = null;
  let loading = null;

  function webglOK() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[data-src="${src}"]`)) return res();
      const s = document.createElement('script'); s.src = src; s.dataset.src = src;
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }

  function load() {
    if (!loading) loading = Promise.all([import(THREE_URL), window.SKY_DATA ? null : loadScript('js/sky-data.js')]).then(([m]) => { THREE = m; });
    return loading;
  }

  /* ---------- Coordenadas ---------- */
  function frames(chart) {
    const A = window.Astronomy;
    const t = A.MakeTime(new Date(chart.utcMs));
    const obs = new A.Observer(chart.input.lat, chart.input.lon, 0);
    const eqj2hor = A.Rotation_EQJ_HOR(t, obs);
    const ect2hor = A.CombineRotation(A.Rotation_ECT_EQJ(t), eqj2hor);
    const eqd2hor = A.Rotation_EQD_HOR(t, obs);
    const toScene = (rot, x, y, z) => {
      const v = A.RotateVector(rot, new A.Vector(x, y, z, t));
      const n = Math.hypot(v.x, v.y, v.z);
      return [-v.y / n * R, v.z / n * R, -v.x / n * R];
    };
    return {
      t, obs, A,
      eqj: (raDeg, decDeg) => { const ra = raDeg * DEG, de = decDeg * DEG; return toScene(eqj2hor, Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)); },
      eqjVec: (v) => toScene(eqj2hor, v.x, v.y, v.z),
      ecl: (lonDeg, latDeg = 0) => { const l = lonDeg * DEG, b = latDeg * DEG; return toScene(ect2hor, Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)); },
      eqd: (raDeg, decDeg) => { const ra = raDeg * DEG, de = decDeg * DEG; return toScene(eqd2hor, Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)); },
      // inversa: punto de la escena → longitud eclíptica de la fecha (para verificar)
      sceneToEcl: (p) => {
        const hor = new A.Vector(-p[2], -p[0], p[1], t);
        const v = A.RotateVector(A.InverseRotation(ect2hor), hor);
        return { lon: ((Math.atan2(v.y, v.x) / DEG) + 360) % 360, lat: Math.asin(v.z / Math.hypot(v.x, v.y, v.z)) / DEG };
      },
    };
  }

  /* ---------- Materiales ---------- */
  const FADE_GLSL = `
    uniform float uOutside; uniform float uGround;
    float skyFade(vec3 p) {
      vec3 n = normalize(p);
      float g = mix(uGround, 1.0, smoothstep(-0.015, 0.02, n.y));
      float f = dot(n, normalize(cameraPosition));
      float b = mix(1.0, mix(0.1, 1.0, smoothstep(-0.2, 0.25, f)), uOutside);
      return g * b;
    }`;

  function lineMat(shared, color, opacity) {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uOutside: shared.uOutside, uGround: shared.uGround },
      vertexShader: FADE_GLSL + `varying float vF; void main(){ vF = skyFade(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vF; void main(){ gl_FragColor = vec4(uColor, uOpacity * vF); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
  }

  function pointsMat(shared, opacity) {
    return new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: opacity }, uPR: shared.uPR, uZoom: shared.uZoom, uOutside: shared.uOutside, uGround: shared.uGround },
      vertexShader: FADE_GLSL + `attribute float size; attribute vec3 color; uniform float uPR; uniform float uZoom; varying vec3 vC; varying float vF;
        void main(){ vC = color; vF = skyFade(position); gl_PointSize = size * uPR * uZoom; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uOpacity; varying vec3 vC; varying float vF;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.12, d); if (a < 0.01) discard; gl_FragColor = vec4(vC, a * vF * uOpacity); }`,
      transparent: true, depthWrite: false,
    });
  }

  function circlePoints(fn, n = 240) {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(...fn(i * 360 / n));
    return pts;
  }
  function lineObj(shared, pts, color, opacity, segments = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const m = lineMat(shared, color, opacity);
    return segments ? new THREE.LineSegments(g, m) : new THREE.Line(g, m);
  }

  /* ---------- Etiquetas (sprites con canvas) ---------- */
  function makeLabel(text, { font = 'Astro', size = 64, weight = 400, color = COL.ivory, italic = false, ring = false } = {}) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const f = `${italic ? 'italic ' : ''}${weight} ${size}px ${font === 'Astro' ? "Astro, 'Noto Sans Symbols', serif" : "Cormorant, Georgia, serif"}`;
    ctx.font = f;
    const w = Math.ceil(ctx.measureText(text).width) + size * 0.5;
    const h = Math.ceil(size * 1.5);
    c.width = Math.max(w, ring ? h : 0); c.height = h;
    ctx.font = f; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(10,12,20,0.85)'; ctx.shadowBlur = size * 0.18;
    ctx.fillText(text, c.width / 2, h / 2 + size * 0.04);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false });
    const s = new THREE.Sprite(mat);
    s.userData.aspect = c.width / c.height;
    s.userData.px = 22;
    return s;
  }

  /* ---------- Escena ---------- */
  function mount(container, chart, opts = {}) {
    const W = window.Wheel, K = window.Carta;
    const F = frames(chart);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    const PR = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(PR);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.className = 'sky-canvas';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 2000);
    const shared = { uOutside: { value: 0 }, uGround: { value: 0.2 }, uPR: { value: PR }, uZoom: { value: 1 } };
    const sprites = []; // {s, pos, base, px}

    const addSprite = (s, pos, base = 1, px = 22, cy = 0.5) => {
      s.position.set(pos[0], pos[1], pos[2]);
      s.center.set(0.5, cy);
      s.userData.px = px; s.userData.base = base; s.userData.pos = new THREE.Vector3(...pos);
      scene.add(s); sprites.push(s); return s;
    };

    // Suelo (hemisferio inferior) y plano del horizonte
    const ground = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.995, 64, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x2a2419, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    ground.renderOrder = -2; scene.add(ground);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshBasicMaterial({ color: 0xF3EBDD, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.renderOrder = -1; scene.add(disc);

    // Estrellas
    const D = window.SKY_DATA;
    {
      const n = D.stars.length / 4, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
      const ivory = [0.96, 0.93, 0.86];
      for (let i = 0; i < n; i++) {
        const ra = D.stars[i * 4] / 100, de = D.stars[i * 4 + 1] / 100, mag = D.stars[i * 4 + 2] / 100, bv = D.stars[i * 4 + 3] / 100;
        const p = F.eqj(ra, de); pos.set(p, i * 3);
        size[i] = Math.max(1.4, 1.5 + (5.2 - mag) * 1.15);
        // tinte sutil según B−V
        const k = Math.max(-0.3, Math.min(1.8, bv));
        const tint = k < 0.6 ? [0.72 + 0.4 * (k + 0.3), 0.84 + 0.15 * (k + 0.3), 1.0] : [1.0, 0.95 - 0.13 * (k - 0.6), 0.86 - 0.25 * (k - 0.6)];
        for (let c = 0; c < 3; c++) col[i * 3 + c] = ivory[c] * 0.45 + Math.min(1, tint[c]) * 0.55;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('size', new THREE.BufferAttribute(size, 1));
      scene.add(new THREE.Points(g, pointsMat(shared, 0.95)));
    }
    // Constelaciones
    {
      const pts = [];
      for (let i = 0; i < D.lines.length; i += 4) pts.push(...F.eqj(D.lines[i] / 100, D.lines[i + 1] / 100), ...F.eqj(D.lines[i + 2] / 100, D.lines[i + 3] / 100));
      scene.add(lineObj(shared, pts, COL.ivory, 0.16, true));
    }
    // Ecuador celeste y eje del mundo
    scene.add(lineObj(shared, circlePoints((a) => F.eqd(a, 0)), COL.teal, 0.32));
    {
      const np = F.eqd(0, 90), sp = F.eqd(0, -90);
      scene.add(lineObj(shared, [...sp, ...np], COL.teal, 0.22, true));
    }
    // Horizonte y puntos cardinales
    scene.add(lineObj(shared, circlePoints((a) => [R * Math.cos(a * DEG), 0, R * Math.sin(a * DEG)]), COL.gold, 0.75));
    for (const [txt, az] of [['N', 0], ['E', 90], ['S', 180], ['O', 270]]) {
      const alt = 2.6 * DEG;
      const p = [R * Math.sin(az * DEG) * Math.cos(alt), R * Math.sin(alt), -R * Math.cos(az * DEG) * Math.cos(alt)];
      addSprite(makeLabel(txt, { font: 'serif', size: 64, weight: 600, color: COL.gold }), p, 0.95, 20, 0.2).userData.noFade = true;
    }

    // Eclíptica: banda por signo, bordes, divisiones y glifos
    const ascSign = chart.timeKnown ? K.signOf(chart.asc) : -1;
    for (let s = 0; s < 12; s++) {
      const verts = [], idx = [];
      for (let k = 0; k <= 15; k++) {
        const l = s * 30 + k * 2;
        verts.push(...F.ecl(l, -6), ...F.ecl(l, 6));
        if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, lineMat(shared, COL.gold, s === ascSign ? 0.26 : (s % 2 ? 0.07 : 0.04)));
      m.renderOrder = 0; scene.add(m);
      scene.add(lineObj(shared, [...F.ecl(s * 30, -6), ...F.ecl(s * 30, 6)], COL.gold, 0.55, true));
      const gl = makeLabel(W.SIGN_GLYPHS[s] + W.VS, { size: 72, color: s === ascSign ? '#E9C878' : 'rgba(214,180,110,0.85)' });
      addSprite(gl, F.ecl(s * 30 + 15, 9.5), s === ascSign ? 1 : 0.8, s === ascSign ? 24 : 19);
    }
    scene.add(lineObj(shared, circlePoints((l) => F.ecl(l, 0), 360), COL.gold, 0.9));
    scene.add(lineObj(shared, circlePoints((l) => F.ecl(l, 6), 180), COL.gold, 0.22));
    scene.add(lineObj(shared, circlePoints((l) => F.ecl(l, -6), 180), COL.gold, 0.22));

    // Nombres de estrellas brillantes
    for (const [name, ra, de] of D.names) {
      if (!STAR_NAMES[name]) continue;
      const p = F.eqj(ra, de);
      const s = addSprite(makeLabel(STAR_NAMES[name], { font: 'serif', size: 44, italic: true, color: 'rgba(243,235,221,0.62)' }), p, 0.85, 13, 1.25);
      s.userData.starName = true;
    }

    // Planetas: posición real (vector geocéntrico aparente) y glifo
    const A = F.A;
    const planetPos = {};
    {
      const order = chart.points.slice().sort((a, b) => a.lon - b.lon);
      const stack = {};
      let prev = null, lvl = 0;
      for (const p of order) { lvl = prev && K.diff(p.lon, prev.lon) < 6 ? lvl + 1 : 0; stack[p.key] = lvl; prev = p; }
      const pp = [], pc = [], ps = [];
      for (const p of chart.points) {
        let pos;
        if (p.key === 'node' || p.key === 'chiron') pos = F.ecl(p.lon, 0);
        else if (p.key === 'moon') pos = F.eqjVec(A.GeoMoon(F.t));
        else pos = F.eqjVec(A.GeoVector(A.Body[p.astro], F.t, true));
        planetPos[p.key] = pos;
        const isSun = p.key === 'sun';
        pp.push(...pos);
        const c = new THREE.Color(isSun ? '#E9C878' : p.kind === 'point' ? '#B9B2A4' : '#FFF8EC');
        pc.push(c.r, c.g, c.b); ps.push(isSun ? 13 : p.key === 'moon' ? 11 : p.kind === 'point' ? 5 : 7.5);
        const lab = makeLabel(W.PLANET_GLYPHS[p.key] + W.VS + (p.retro ? '℞' : ''), { size: 76, color: isSun ? '#EFCF86' : p.kind === 'point' ? '#CFC7B6' : '#FFF8EC' });
        addSprite(lab, pos, 1, p.kind === 'point' ? 21 : 26, -0.25 - stack[p.key] * 0.95);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(pc, 3));
      g.setAttribute('size', new THREE.Float32BufferAttribute(ps, 1));
      const pts = new THREE.Points(g, pointsMat(shared, 1)); pts.renderOrder = 3; scene.add(pts);
    }

    // Ángulos
    const angles = {};
    if (chart.timeKnown) {
      for (const [key, lon, txt] of [['asc', chart.asc, 'AC'], ['mc', chart.mc, 'MC'], ['dc', chart.asc + 180, 'DC'], ['ic', chart.mc + 180, 'IC']]) {
        const p = F.ecl(lon, 0);
        angles[key] = p;
        const strong = key === 'asc' || key === 'mc';
        const ring = makeLabel('◯', { font: 'serif', size: 64, color: strong ? '#E9C878' : 'rgba(233,200,120,0.6)' });
        addSprite(ring, p, 1, strong ? 20 : 14, 0.5).userData.noFade = key === 'asc';
        const fd = K.fmtDeg(lon);
        const label = strong ? `${txt} ${fd.d}° ${K.SIGNS[fd.sign]}` : txt;
        addSprite(makeLabel(label, { font: 'serif', size: 52, weight: 600, color: strong ? '#E9C878' : 'rgba(233,200,120,0.7)' }), p, 1, strong ? 17 : 13, 1.5).userData.noFade = key === 'asc';
      }
    }
    // El observador en el centro (vista desde afuera)
    const you = addSprite(makeLabel('●', { font: 'serif', size: 40, color: '#E9C878' }), [0, 0, 0], 1, 10, 0.5);
    const youLabel = addSprite(makeLabel('vos', { font: 'serif', size: 46, italic: true, color: 'rgba(243,235,221,0.85)' }), [0, 0, 0], 1, 14, -0.35);

    /* ---------- Cámara y controles ---------- */
    const ascAz = chart.timeKnown ? Math.atan2(angles.asc[0], -angles.asc[2]) : 90 * DEG;
    const st = { mode: opts.mode || 'inside', yaw: ascAz, pitch: 14 * DEG, fov: 72, dist: 36, oyaw: ascAz + 35 * DEG, opitch: 18 * DEG };
    let anim = null, raf = 0, w = 0, h = 0, fitDist = 36;
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

    function applyCamera() {
      if (st.mode === 'inside') {
        camera.fov = st.fov; camera.position.set(0, 0, 0);
        const d = [Math.sin(st.yaw) * Math.cos(st.pitch), Math.sin(st.pitch), -Math.cos(st.yaw) * Math.cos(st.pitch)];
        camera.up.set(0, 1, 0); camera.lookAt(d[0], d[1], d[2]);
        shared.uOutside.value = 0; shared.uGround.value = 0.16; shared.uZoom.value = clamp(72 / st.fov, 0.8, 2.2);
        ground.material.opacity = 0.62; disc.visible = false;
      } else {
        camera.fov = 38;
        camera.position.set(st.dist * Math.sin(st.oyaw) * Math.cos(st.opitch), st.dist * Math.sin(st.opitch), -st.dist * Math.cos(st.oyaw) * Math.cos(st.opitch));
        camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0);
        shared.uOutside.value = 1; shared.uGround.value = 0.45; shared.uZoom.value = clamp(fitDist / st.dist, 0.6, 1.8) * 0.8;
        ground.material.opacity = 0.4; disc.visible = true;
      }
      you.visible = youLabel.visible = st.mode === 'outside';
      camera.updateProjectionMatrix();
    }

    const tmp = new THREE.Vector3();
    function updateSprites() {
      const k = 2 * Math.tan(camera.fov * DEG / 2) / Math.max(h, 1) * clamp(Math.min(w, h) / 380, 1, 1.45);
      const camDir = tmp.copy(camera.position).normalize();
      for (const s of sprites) {
        const px = s.userData.px;
        s.scale.set(px * k * s.userData.aspect, px * k, 1);
        let op = s.userData.base;
        const p = s.userData.pos;
        if (p.lengthSq() > 0.01 && !s.userData.noFade) {
          const n = p.clone().normalize();
          if (n.y < -0.01) op *= st.mode === 'inside' ? 0.28 : 0.5;
          if (st.mode === 'outside') { const f = n.dot(camDir); if (f < 0.1) op *= f < -0.25 ? 0 : 0.25; }
        }
        if (s.userData.starName && st.mode === 'outside') op = 0;
        s.material.opacity = op;
      }
    }

    function render() {
      raf = 0;
      if (anim) {
        const u = Math.min(1, (performance.now() - anim.t0) / anim.ms);
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        for (const k in anim.to) st[k] = anim.from[k] + (anim.to[k] - anim.from[k]) * e;
        if (u >= 1) anim = null;
      }
      applyCamera(); updateSprites();
      renderer.render(scene, camera);
      if (anim) request();
    }
    function request() { if (!raf) raf = requestAnimationFrame(render); }
    function animate(to, ms) {
      if (reduced) { Object.assign(st, to); anim = null; request(); return; }
      const from = {}; for (const k in to) from[k] = st[k];
      anim = { from, to, t0: performance.now(), ms }; request();
    }

    function resize() {
      const r = container.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      // distancia para que el globo entre con margen en la dimensión más chica
      const half = Math.atan(Math.tan(19 * DEG) * Math.min(1, w / h));
      fitDist = R / Math.sin(half) * 1.3;
      request();
    }
    const ro = new ResizeObserver(resize); ro.observe(container);

    // Puntero: arrastrar para rotar, pellizcar / rueda para zoom
    const el = renderer.domElement;
    const ptrs = new Map(); let pinch0 = 0, pinchFov = 0, pinchDist = 0;
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); anim = null;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); pinchFov = st.fov; pinchDist = st.dist; } });
    el.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId); const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch0 > 0) { st.fov = clamp(pinchFov * pinch0 / d, 25, 100); st.dist = clamp(pinchDist * pinch0 / d, 13, 90); }
      } else if (st.mode === 'inside') {
        const k = st.fov * DEG / h;
        st.yaw -= dx * k; st.pitch = clamp(st.pitch + dy * k, -35 * DEG, 89 * DEG);
      } else {
        st.oyaw -= dx * 0.006; st.opitch = clamp(st.opitch + dy * 0.006, -80 * DEG, 85 * DEG);
      }
      request();
    });
    const up = (e) => { ptrs.delete(e.pointerId); pinch0 = 0; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      e.preventDefault(); anim = null;
      const f = Math.exp(e.deltaY * 0.0012);
      if (st.mode === 'inside') st.fov = clamp(st.fov * f, 25, 100); else st.dist = clamp(st.dist * f, 13, 90);
      request();
    }, { passive: false });

    function setMode(mode, intro = true) {
      st.mode = mode;
      if (mode === 'inside') {
        if (intro) { st.yaw = ascAz - 50 * DEG; st.pitch = 62 * DEG; st.fov = 90; animate({ yaw: ascAz, pitch: 14 * DEG, fov: 72 }, 2600); }
        else { st.yaw = ascAz; st.pitch = 14 * DEG; st.fov = 72; }
      } else {
        if (intro) { st.dist = fitDist * 1.9; st.oyaw = ascAz - 40 * DEG; st.opitch = 50 * DEG; animate({ dist: fitDist, oyaw: ascAz + 35 * DEG, opitch: 18 * DEG }, 2400); }
        else { st.dist = fitDist; st.oyaw = ascAz + 35 * DEG; st.opitch = 18 * DEG; }
      }
      request();
    }
    resize();
    st.dist = fitDist;
    setMode(st.mode, opts.intro !== false);

    return {
      setMode,
      recenter: () => setMode(st.mode, true),
      get mode() { return st.mode; },
      dispose() { ro.disconnect(); cancelAnimationFrame(raf); renderer.dispose(); scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); el.remove(); },
      // Verificación: lleva los objetos de la escena de vuelta a coordenadas eclípticas / horizontales
      debug() {
        const out = { angles: {}, planets: {}, stars: {} };
        for (const k in angles) { const p = angles[k]; out.angles[k] = { alt: Math.asin(p[1] / R) / DEG, az: (Math.atan2(p[0], -p[2]) / DEG + 360) % 360, ecl: F.sceneToEcl(p).lon }; }
        for (const k in planetPos) out.planets[k] = F.sceneToEcl(planetPos[k]);
        for (const [name, ra, de] of D.names) out.stars[name] = F.sceneToEcl(F.eqj(ra, de));
        out.render = { w, h, PR };
        return out;
      },
      _st: st, _render: () => { request(); },
    };
  }

  window.Sky3D = { webglOK, load, mount };
})();
