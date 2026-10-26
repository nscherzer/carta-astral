/* Interfaz: formulario, búsqueda de ciudades, render de resultados, link y PNG. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const K = window.Carta, W = window.Wheel, T = window.TEXTOS;
  const VS = W.VS;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sym = (g, cls = '') => `<span class="sym ${cls}">${g}${VS}</span>`;
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const state = { birth: null, live: null, chart: null };

  /* ---------- Búsqueda de ciudades (Nominatim) ---------- */
  let lastReq = 0;
  const cache = new Map();
  async function searchPlaces(q, signal) {
    const key = q.toLowerCase();
    if (cache.has(key)) return cache.get(key);
    const wait = Math.max(0, lastReq + 1100 - Date.now()); // máx. 1 pedido por segundo
    if (wait) await new Promise((r) => setTimeout(r, wait));
    if (signal.aborted) throw new DOMException('abort', 'AbortError');
    lastReq = Date.now();
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&featureType=settlement&accept-language=es&q=' + encodeURIComponent(q);
    const res = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const seen = new Set();
    const out = [];
    for (const r of data) {
      const a = r.address || {};
      const city = a.city || a.town || a.village || a.municipality || a.hamlet || a.suburb || r.name || (r.display_name || '').split(',')[0];
      const region = a.state || a.region || a.province || a.county || a.state_district || '';
      const country = a.country || '';
      const label = [city, region !== city ? region : '', country].filter(Boolean).join(', ');
      if (seen.has(label)) continue;
      seen.add(label);
      out.push({ city, rest: [region !== city ? region : '', country].filter(Boolean).join(', '), label, lat: +r.lat, lon: +r.lon });
    }
    cache.set(key, out);
    return out;
  }

  function placeInput(root, onChange) {
    const input = $('input', root), list = $('.suggest', root), meta = $('.place-meta', root);
    let timer = null, ctrl = null, items = [], active = -1;
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
    const renderList = (msg) => {
      if (msg) { list.innerHTML = `<li class="empty">${esc(msg)}</li>`; }
      else list.innerHTML = items.map((it, i) => `<li role="option" data-i="${i}" aria-selected="${i === active}"><b>${esc(it.city)}</b><small>${esc(it.rest)}</small></li>`).join('');
      list.hidden = false; input.setAttribute('aria-expanded', 'true');
    };
    const choose = (it) => {
      input.value = it.label;
      onChange(it);
      setMeta(it);
      close();
    };
    const setMeta = (it) => {
      if (!it) { meta.innerHTML = ''; return; }
      const tz = K.lookupTz(it.lat, it.lon);
      meta.innerHTML = `<span class="ok">✓</span> ${Math.abs(it.lat).toFixed(2)}° ${it.lat >= 0 ? 'N' : 'S'}, ${Math.abs(it.lon).toFixed(2)}° ${it.lon >= 0 ? 'E' : 'O'} · ${esc(tz)}`;
    };
    input.addEventListener('input', () => {
      onChange(null); setMeta(null);
      clearTimeout(timer);
      if (ctrl) ctrl.abort();
      const q = input.value.trim();
      if (q.length < 3) { close(); return; }
      timer = setTimeout(async () => {
        ctrl = new AbortController();
        renderList('Buscando…');
        try {
          items = await searchPlaces(q, ctrl.signal);
          active = items.length ? 0 : -1;
          if (items.length) renderList(); else renderList('No encontramos esa ciudad. Probá con otra forma de escribirla.');
        } catch (e) {
          if (e.name !== 'AbortError') renderList('No pudimos buscar ciudades ahora. Probá de nuevo en un ratito.');
        }
      }, 650);
    });
    input.addEventListener('keydown', (e) => {
      if (list.hidden || !items.length) return;
      if (e.key === 'ArrowDown') { active = (active + 1) % items.length; renderList(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = (active - 1 + items.length) % items.length; renderList(); e.preventDefault(); }
      else if (e.key === 'Enter' && active >= 0) { choose(items[active]); e.preventDefault(); }
      else if (e.key === 'Escape') close();
    });
    list.addEventListener('mousedown', (e) => {
      const li = e.target.closest('li[data-i]');
      if (li) { e.preventDefault(); choose(items[+li.dataset.i]); }
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
    return { set(it) { input.value = it ? it.label : ''; setMeta(it); } };
  }

  /* ---------- Formulario ---------- */
  const form = $('#form'), notime = $('#f-notime'), timeInput = $('#f-time');
  const birthPI = placeInput($('[data-place=birth]'), (it) => { state.birth = it; });
  const livePI = placeInput($('[data-place=live]'), (it) => { state.live = it; });

  notime.addEventListener('change', () => {
    timeInput.disabled = notime.checked;
    $('#notime-hint').hidden = !notime.checked;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('#form-error');
    const date = $('#f-date').value, time = notime.checked ? null : timeInput.value;
    const problem =
      !date ? 'Falta la fecha de nacimiento.' :
      (date < '1900-01-01' || date > '2060-12-31') ? 'La fecha tiene que estar entre 1900 y 2060.' :
      (!notime.checked && !time) ? 'Falta la hora (o marcá “No sé la hora”).' :
      !state.birth ? 'Elegí el lugar de nacimiento de la lista de sugerencias.' : null;
    if (problem) { err.textContent = problem; err.hidden = false; return; }
    err.hidden = true;
    const params = {
      name: $('#f-name').value.trim(), date, time,
      birth: state.birth, live: state.live && $('#f-live').value.trim() ? state.live : null,
    };
    location.hash = encodeParams(params);
  });

  /* ---------- URL compartible ---------- */
  function encodeParams(p) {
    const q = new URLSearchParams();
    if (p.name) q.set('n', p.name);
    q.set('d', p.date);
    if (p.time) q.set('h', p.time);
    q.set('p', p.birth.label); q.set('la', p.birth.lat.toFixed(4)); q.set('lo', p.birth.lon.toFixed(4));
    if (p.live) { q.set('v', p.live.label); q.set('vla', p.live.lat.toFixed(3)); q.set('vlo', p.live.lon.toFixed(3)); }
    return q.toString();
  }
  function decodeParams(hash) {
    const q = new URLSearchParams(hash.replace(/^#/, ''));
    const d = q.get('d'), la = parseFloat(q.get('la')), lo = parseFloat(q.get('lo'));
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !isFinite(la) || !isFinite(lo)) return null;
    const h = q.get('h');
    return {
      name: q.get('n') || '', date: d, time: h && /^\d{1,2}:\d{2}$/.test(h) ? h : null,
      birth: { label: q.get('p') || `${la}, ${lo}`, lat: la, lon: lo },
      live: q.get('v') ? { label: q.get('v'), lat: parseFloat(q.get('vla')), lon: parseFloat(q.get('vlo')) } : null,
    };
  }

  function route() {
    const p = location.hash.length > 3 ? decodeParams(location.hash) : null;
    if (p) {
      // rellenar el formulario por si quiere editar
      $('#f-name').value = p.name; $('#f-date').value = p.date;
      timeInput.value = p.time || ''; notime.checked = !p.time; notime.dispatchEvent(new Event('change'));
      state.birth = p.birth; birthPI.set(p.birth);
      state.live = p.live; livePI.set(p.live);
      showChart(p);
    } else {
      $('#chart-view').hidden = true; $('#form-view').hidden = false; $('#btn-new').hidden = true;
      document.title = 'Carta natal';
    }
  }

  /* ---------- Resultado ---------- */
  function fmtDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} de ${MONTHS[m - 1]} de ${y}`;
  }
  const signName = (lon) => K.SIGNS[K.signOf(lon)];
  const signSym = (lon) => sym(W.SIGN_GLYPHS[K.signOf(lon)]);

  function isDst(c) {
    const y = +c.input.date.slice(0, 4);
    const std = Math.min(K.tzOffsetSec(c.tz, Date.UTC(y, 0, 1)), K.tzOffsetSec(c.tz, Date.UTC(y, 6, 1)));
    return c.offsetSec > std;
  }

  function showChart(p) {
    let chart;
    try {
      chart = K.compute({ date: p.date, time: p.time, lat: p.birth.lat, lon: p.birth.lon });
    } catch (e) {
      console.error(e);
      $('#form-error').textContent = 'No pudimos calcular la carta con esos datos.';
      $('#form-error').hidden = false;
      return;
    }
    state.chart = chart; state.params = p;
    $('#form-view').hidden = true; $('#chart-view').hidden = false; $('#btn-new').hidden = false;
    document.title = (p.name ? p.name + ' · ' : '') + 'Carta natal';

    $('#p-name').textContent = p.name || 'Tu carta';
    $('#p-when').textContent = fmtDate(p.date) + (p.time ? ` · ${p.time} h` : ' · hora desconocida');
    $('#p-where').textContent = p.birth.label;
    $('#p-tz').textContent = p.time
      ? `${K.formatOffset(chart.offsetSec)}${isDst(chart) ? ' (horario de verano)' : ''} · ${new Date(chart.utcMs).toISOString().slice(11, 16)} UTC · ${chart.tz.replace(/_/g, ' ')}` + (chart.tzNote ? ' · ' + chart.tzNote : '')
      : 'Carta calculada al mediodía local';
    $('#p-live').textContent = p.live ? `Vive en ${p.live.label}` : '';

    $('#wheel').innerHTML = W.build(chart, { label: 'Carta natal de ' + (p.name || 'la persona') });
    $('#hs-label').textContent = chart.timeKnown ? 'Casas ' + chart.houseSystem : 'Sin casas (falta la hora)';

    renderBig3(chart);
    window.Lectura.render(chart, $('#lectura'));
    if (view === 'sky') mountSky(); else if (sky) { sky.dispose(); sky = null; }
    renderPlanets(chart);
    renderAspects(chart);
    renderBalance(chart);
    renderHouses(chart);
    window.scrollTo({ top: 0 });
  }

  function renderBig3(c) {
    const sun = c.points.find((x) => x.key === 'sun'), moon = c.points.find((x) => x.key === 'moon');
    const card = (g, k, lon, text, extra = '') => `<div class="b3"><div class="g">${g}</div><div>
      <p class="k">${k}</p><p class="t">${signName(lon)}<span class="deg">${K.fmtDeg(lon).text}</span></p><p>${text}</p>${extra}</div></div>`;
    let moonExtra = '';
    if (c.moonRange) {
      const [a, b] = c.moonRange;
      moonExtra = K.signOf(a) !== K.signOf(b)
        ? `<p class="k" style="margin-top:8px">Ojo: ese día la Luna pasó de ${signName(a)} a ${signName(b)}; sin la hora no sabemos en cuál estaba.</p>`
        : `<p class="k" style="margin-top:8px">Ese día recorrió de ${K.fmtDeg(a).text} a ${K.fmtDeg(b).text} de ${signName(b)}</p>`;
    }
    let html = card('☉' + VS, 'Sol · tu esencia', sun.lon, T.sun[K.signOf(sun.lon)]);
    html += card('☽' + VS, 'Luna · tus emociones', moon.lon, T.moon[K.signOf(moon.lon)], moonExtra);
    if (c.timeKnown) html += card('<span class="ac">AC</span>', 'Ascendente · cómo te ven', c.asc, T.asc[K.signOf(c.asc)]);
    else html += `<div class="b3 off"><div class="g"><span class="ac">AC</span></div><div><p class="k">Ascendente</p><p class="t">Sin calcular</p><p>Para el Ascendente y las casas hace falta la hora de nacimiento. Si la conseguís (partida de nacimiento, libreta sanitaria), volvé a generar la carta.</p></div></div>`;
    $('#big3').innerHTML = html;
  }

  function renderPlanets(c) {
    let h = '<thead><tr><th colspan="2">Planeta</th><th>Signo</th><th class="r">Grado</th><th></th>' + (c.timeKnown ? '<th class="r">Casa</th>' : '') + '</tr></thead><tbody>';
    const rows = c.points.slice();
    if (c.timeKnown) {
      rows.push({ key: 'asc', name: 'Ascendente', lon: c.asc, ang: 'AC' });
      rows.push({ key: 'mc', name: 'Medio Cielo', lon: c.mc, ang: 'MC' });
    }
    for (const p of rows) {
      const g = p.ang ? `<span style="font:600 14px var(--serif)">${p.ang}</span>` : `${W.PLANET_GLYPHS[p.key]}${VS}`;
      h += `<tr><td class="pg">${g}</td><td class="pn">${esc(p.name)}</td><td class="sg">${signSym(p.lon)}${signName(p.lon)}</td><td class="dg">${K.fmtDeg(p.lon).text}</td><td class="rx" title="${p.retro ? 'Retrógrado' : ''}">${p.retro ? '℞' + VS : ''}</td>${c.timeKnown ? `<td class="hs">${p.house ? 'Casa ' + p.house : ''}</td>` : ''}</tr>`;
    }
    $('#t-planets').innerHTML = h + '</tbody>';
  }

  function glyphOf(p) {
    if (p.key === 'asc') return '<span style="font:600 13px var(--serif)">AC</span>';
    if (p.key === 'mc') return '<span style="font:600 13px var(--serif)">MC</span>';
    return sym(W.PLANET_GLYPHS[p.key]);
  }

  function renderAspects(c) {
    const order = ['trine', 'sextile', 'square', 'opp', 'conj'];
    let html = '';
    for (const key of order) {
      const a = K.ASPECTS.find((x) => x.key === key);
      const list = c.aspects.filter((x) => x.a.key === key);
      if (!list.length) continue;
      html += `<div class="asp-group ${a.nature}"><h3>${sym(a.glyph)}${a.plural}<span class="n">${list.length}</span></h3><ul class="asp-list">`;
      for (const x of list) {
        const om = Math.round(x.orb * 60);
        html += `<li>${glyphOf(x.p)}<span class="who">${esc(x.p.name)} – ${esc(x.q.name)}</span>${glyphOf(x.q)}<span class="orb">${Math.floor(om / 60)}°${String(om % 60).padStart(2, '0')}′</span></li>`;
      }
      html += '</ul></div>';
    }
    $('#aspects').innerHTML = (html || '<p class="empty-note">No hay aspectos mayores dentro de los orbes.</p>') +
      '<p class="empty-note" style="font-size:13px">Orbes: 8° (10° con Sol o Luna), sextil 6° (8°); nodo, Quirón y ángulos, 5° y 3°. El número es la distancia al aspecto exacto.</p>';
  }

  function renderBalance(c) {
    const el = c.balance.elements, mo = c.balance.modalities;
    const names = ['Fuego', 'Tierra', 'Aire', 'Agua'], cols = ['var(--fuego)', 'var(--tierra)', 'var(--aire)', 'var(--agua)'];
    const max = Math.max(...el, ...mo, 1);
    const bar = (n, v, col) => `<div class="bar"><span>${n}</span><div class="track"><div class="fill" style="width:${(v / max) * 100}%;background:${col}"></div></div><span class="v">${v}</span></div>`;
    const top = el.indexOf(Math.max(...el));
    const mtop = mo.indexOf(Math.max(...mo));
    const modTxt = ['iniciar y empujar', 'sostener y profundizar', 'adaptarte y cambiar de rumbo'][mtop];
    $('#balance').innerHTML =
      `<div class="bal"><h3>Elementos</h3>${names.map((n, i) => bar(n, el[i], cols[i])).join('')}<p class="note">Predomina el elemento ${K.ELEMENTS[top]}: ${T.element[K.ELEMENTS[top]]}</p></div>` +
      `<div class="bal"><h3>Modalidades</h3>${['Cardinal', 'Fijo', 'Mutable'].map((n, i) => bar(n, mo[i], 'var(--ink)')).join('')}<p class="note">Lo tuyo es ${modTxt}. Contamos los 10 planetas, del Sol a Plutón.</p></div>`;
  }

  function renderHouses(c) {
    const blk = $('#houses-block');
    if (!c.timeKnown) { blk.hidden = true; return; }
    blk.hidden = false;
    let h = '';
    for (let i = 0; i < 12; i++) {
      const lon = c.houses[i], fd = K.fmtDeg(lon);
      h += `<div><span class="hn">${i + 1}</span><span class="hv">${signSym(lon)}${signName(lon)} <b>${fd.text}</b></span></div>`;
    }
    $('#houses').innerHTML = h;
    const prev = blk.querySelector('.notice'); if (prev) prev.remove();
    if (c.houseSystem !== 'Placidus') $('#houses').insertAdjacentHTML('beforebegin', '<p class="notice">En latitudes polares el sistema Placidus no funciona; usamos casas iguales desde el Ascendente.</p>');
  }

  /* ---------- Compartir y descargar ---------- */
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 3200);
  }
  $('#btn-share').addEventListener('click', async () => {
    const url = location.href;
    const p = state.params || {};
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title: (p.name ? 'Carta natal de ' + p.name : 'Carta natal'), url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Link copiado. Cualquiera que lo abra ve esta carta.'); }
    catch (e) { prompt('Copiá este link:', url); }
  });
  $('#btn-new').addEventListener('click', () => { history.pushState(null, '', location.pathname); route(); window.scrollTo({ top: 0 }); });

  async function fontDataUrl(path) {
    const buf = await (await fetch(path)).arrayBuffer();
    let bin = ''; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return 'data:font/woff2;base64,' + btoa(bin);
  }

  $('#btn-png').addEventListener('click', async () => {
    const c = state.chart, p = state.params;
    if (!c) return;
    const btn = $('#btn-png'); btn.disabled = true;
    try {
      const [astro, corm, cormI] = await Promise.all(['fonts/noto-astro.woff2', 'fonts/cormorant.woff2', 'fonts/cormorant-italic.woff2'].map(fontDataUrl));
      const fontCss = `@font-face{font-family:Astro;src:url(${astro}) format('woff2')}@font-face{font-family:Cormorant;font-weight:300 700;src:url(${corm}) format('woff2')}@font-face{font-family:Cormorant;font-style:italic;font-weight:300 700;src:url(${cormI}) format('woff2')}`;
      const wheel = W.build(c, {}).replace('<svg ', '<svg x="40" y="190" width="1040" height="1040" ');
      const Wd = 1120, H = 1290;
      const sub = `${fmtDate(p.date)}${p.time ? ' · ' + p.time + ' h' : ''} · ${p.birth.label}`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}"><style>${fontCss}</style>
        <rect width="${Wd}" height="${H}" fill="${W.COLORS.paper}"/>
        <text x="${Wd / 2}" y="78" font-family="Instrument Sans, sans-serif" font-size="17" font-weight="600" letter-spacing="4" fill="${W.COLORS.gold}" text-anchor="middle">CARTA NATAL</text>
        <text x="${Wd / 2}" y="138" font-family="Cormorant, serif" font-size="58" font-weight="500" fill="${W.COLORS.ink}" text-anchor="middle">${esc(p.name || '')}</text>
        <text x="${Wd / 2}" y="${p.name ? 178 : 140}" font-family="Cormorant, serif" font-style="italic" font-size="26" fill="${W.COLORS.soft}" text-anchor="middle">${esc(sub)}</text>
        ${wheel}
        <text x="${Wd / 2}" y="${H - 34}" font-family="Cormorant, serif" font-style="italic" font-size="20" fill="${W.COLORS.soft}" text-anchor="middle">${c.timeKnown ? 'Casas ' + c.houseSystem + ' · zodíaco tropical' : 'Sin hora: carta al mediodía, sin casas'}</text></svg>`;
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      await new Promise((r) => setTimeout(r, 120)); // Safari: dar tiempo a las fuentes embebidas
      const scale = 2, cv = document.createElement('canvas');
      cv.width = Wd * scale; cv.height = H * scale;
      const ctx = cv.getContext('2d'); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0, Wd, H);
      URL.revokeObjectURL(url);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
      const a = document.createElement('a');
      const slug = (p.name || 'carta').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      a.download = `carta-natal-${slug}.png`; a.href = URL.createObjectURL(blob);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      console.error(e); toast('No pudimos generar la imagen en este navegador.');
    } finally { btn.disabled = false; }
  });

  /* ---------- Vista 3D ---------- */
  let view = 'wheel', sky = null, skyMode = 'inside';
  function setView(v) {
    view = v;
    document.querySelectorAll('.view-tabs [data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    $('#wheel').hidden = v !== 'wheel'; $('#wheel-legend').hidden = v !== 'wheel'; $('#sky').hidden = v !== 'sky';
    if (v === 'sky') mountSky();
  }
  function skyCaption() {
    const c = state.chart; if (!c) return;
    const cap = $('#sky-cap');
    if (!c.timeKnown) { cap.textContent = 'Sin hora de nacimiento: es el cielo al mediodía, así que el horizonte es solo orientativo.'; return; }
    const s = K.SIGNS[K.signOf(c.asc)];
    cap.innerHTML = skyMode === 'inside'
      ? `Estás parado en ${esc(state.params.birth.label.split(',')[0])}, mirando al Este. El signo que asoma sobre el horizonte —<b>${s}</b>— es tu Ascendente. Arrastrá para mirar alrededor.`
      : `La esfera celeste con vos en el centro. El disco es tu horizonte: lo que está debajo no se veía. La banda dorada es el zodíaco; ${s} cruza el horizonte por el Este.`;
  }
  async function mountSky() {
    const stage = $('#sky-stage'), loadEl = $('#sky-loading');
    skyCaption();
    if (!window.Sky3D.webglOK()) { loadEl.textContent = 'Tu navegador no puede mostrar gráficos 3D. Te dejamos la rueda.'; loadEl.hidden = false; return; }
    if (sky && sky.chart === state.chart) return;
    if (sky) { sky.dispose(); sky = null; }
    loadEl.hidden = false; loadEl.textContent = 'Cargando el cielo…';
    try {
      await window.Sky3D.load();
      await document.fonts.load('40px Astro', '♈').catch(() => {});
      if (view !== 'sky') return;
      if (sky) sky.dispose();
      sky = window.Sky3D.mount(stage, state.chart, { mode: skyMode });
      sky.chart = state.chart;
      window.__sky = sky;
      loadEl.hidden = true;
    } catch (e) {
      console.error(e); loadEl.textContent = 'No pudimos cargar la vista 3D. Probá de nuevo más tarde.';
    }
  }
  document.querySelectorAll('.view-tabs [data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  document.querySelectorAll('.seg [data-mode]').forEach((b) => b.addEventListener('click', () => {
    skyMode = b.dataset.mode;
    document.querySelectorAll('.seg [data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (sky) sky.setMode(skyMode, true);
    skyCaption();
  }));
  $('#sky-recenter').addEventListener('click', () => sky && sky.recenter());

  /* ---------- Inicio ---------- */
  $('#ornament').innerHTML = W.build(null);
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  const start = () => route();
  if (document.fonts && document.fonts.load) document.fonts.load('34px Astro', '♈').then(start, start); else start();
})();
