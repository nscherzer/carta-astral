/* Lectura de la carta: dignidades, regente, fase lunar, configuraciones, énfasis y dominantes.
   Textos originales y breves. */
(function () {
  'use strict';
  const K = () => window.Carta;

  const TX = {
    mercury: [
      'Pensás rápido y hablás directo; decidís antes de terminar de escuchar.',
      'Pensás despacio y seguro: lo que aprendés, lo aprendés para siempre.',
      'Mente ágil y curiosa; te encanta conversar, leer y saltar de tema en tema.',
      'Pensás con la memoria y el corazón; recordás cómo te hicieron sentir las palabras.',
      'Hablás con convicción y algo de escena; sabés contar una historia.',
      'Mente analítica y precisa: ves el error que nadie ve y lo corregís.',
      'Pensás en diálogo, sopesando los dos lados antes de opinar.',
      'Mente de detective: preguntás lo incómodo y vas al fondo.',
      'Pensás en grande y con entusiasmo; te interesan las ideas que dan sentido.',
      'Pensás con método y sentido práctico; tus palabras tienen peso.',
      'Mente original e independiente; te atraen las ideas nuevas y raras.',
      'Pensás por imágenes e intuiciones; entendés más de lo que podés explicar.',
    ],
    venus: [
      'Amás con impulso y franqueza: si te gusta alguien, se nota enseguida.',
      'Disfrutás del cuerpo, la comida rica y la lealtad; el amor se demuestra con hechos.',
      'Te enamora una buena charla; necesitás juego, humor y variedad.',
      'Amás cuidando; buscás un vínculo que se sienta como casa.',
      'Amás a lo grande, con gestos y generosidad; querés admirar y ser admirado.',
      'Mostrás el cariño en los detalles y en estar cuando hace falta.',
      'Buscás armonía y reciprocidad; te atraen la elegancia y el buen trato.',
      'Amás con intensidad total: todo o nada, y con una lealtad feroz.',
      'Necesitás libertad y aventura en el amor; te enamora quien te hace crecer.',
      'Amás en serio y a largo plazo; la confianza se construye con tiempo.',
      'Querés un amor que sea también amistad, con espacio para cada uno.',
      'Amás con ternura y entrega; a veces idealizás al otro.',
    ],
    mars: [
      'Tu energía es explosiva y directa: arrancás primero y preguntás después.',
      'Actuás con paciencia y aguante; cuesta moverte, pero no te detiene nadie.',
      'Tu energía va en muchas direcciones; peleás con palabras e ingenio.',
      'Actuás para proteger; tu enojo es emocional y a veces indirecto.',
      'Actuás con orgullo y pasión; te mueve lo que te hace sentir vivo.',
      'Tu energía es eficiente y metódica; sabés trabajar con precisión.',
      'Actuás buscando acuerdos; te cuesta la confrontación directa.',
      'Energía intensa y estratégica: no te rendís y sabés esperar tu momento.',
      'Actuás con entusiasmo y fe; te mueven las causas y los horizontes lejanos.',
      'Energía disciplinada y ambiciosa; avanzás paso a paso hasta la cima.',
      'Actuás a tu manera y por tus ideales; te rebelás contra lo impuesto.',
      'Tu energía fluye con la intuición; actuás mejor inspirado que presionado.',
    ],
    sunHouse: [
      'Brillás siendo vos mismo: tu presencia y tu iniciativa son tu marca.',
      'Te realizás construyendo seguridad, recursos y valor propio.',
      'Brillás comunicando, aprendiendo y moviéndote en tu entorno cercano.',
      'Tu centro está en la familia, las raíces y el hogar que armás.',
      'Te realizás creando, jugando y expresándote; también en el amor y los hijos.',
      'Brillás en el trabajo bien hecho, el servicio y el cuidado de tu cuerpo.',
      'Te descubrís a través de los otros: pareja y socios son tu espejo.',
      'Brillás en lo profundo: crisis, intimidad y recursos compartidos te transforman.',
      'Te realizás viajando, estudiando y buscando un sentido amplio.',
      'Tu sol está en lo alto: vocación, carrera y reconocimiento público.',
      'Brillás en grupo: amigos, comunidades y proyectos a futuro.',
      'Tu luz trabaja tras bambalinas: introspección, espiritualidad y servicio silencioso.',
    ],
    moonHouse: [
      'Tus emociones se ven a flor de piel; se te nota todo lo que sentís.',
      'Te da calma tener tus cosas, tu plata y tu bienestar en orden.',
      'Procesás lo que sentís charlando, escribiendo o yendo y viniendo.',
      'El hogar y la familia son tu refugio emocional más fuerte.',
      'Necesitás crear y divertirte para sentirte bien.',
      'Te ordena emocionalmente la rutina, el trabajo y cuidar de otros.',
      'Te sentís completo en pareja; las relaciones te mueven mucho.',
      'Emociones profundas y privadas; vivís todo con intensidad.',
      'Te alimentan los viajes, las ideas grandes y lo diferente.',
      'Tu vida emocional se mezcla con tu vocación y tu imagen pública.',
      'Te sentís en casa entre amigos y en causas compartidas.',
      'Necesitás soledad para recargarte; mundo interior rico y sensible.',
    ],
    phases: [
      ['Luna nueva', 'Naciste en un comienzo: instinto, frescura y ganas de sembrar algo propio.'],
      ['Luna creciente', 'Empuje para salir del molde y abrirte camino contra la inercia.'],
      ['Cuarto creciente', 'Energía de acción y decisión: crecés enfrentando desafíos.'],
      ['Gibosa creciente', 'Afán de perfeccionar: analizás y ajustás hasta que las cosas funcionen.'],
      ['Luna llena', 'Naciste con la Luna iluminada: conciencia de los vínculos y necesidad de equilibrio.'],
      ['Diseminante', 'Ganas de compartir lo que aprendiste; algo de maestro o de divulgador.'],
      ['Cuarto menguante', 'Mirada crítica y madura: soltás lo que ya no sirve para dar lugar a lo nuevo.'],
      ['Balsámica', 'Sensibilidad para los cierres y lo invisible; intuición y visión de futuro.'],
    ],
    patterns: {
      grandTrine: 'Tres planetas en trígono forman un triángulo: un talento natural que fluye solo, a veces tanto que se da por sentado.',
      tSquare: 'Una oposición tensionada por un tercer planeta: un motor de esfuerzo; el planeta del vértice marca dónde se juega.',
      grandCross: 'Dos oposiciones cruzadas: mucha tensión y también mucha fuerza para sostener cosas difíciles.',
      yod: 'El "dedo de Dios": dos planetas en sextil apuntan con quincuncios a un tercero, que pide ajustes constantes y suele marcar una misión.',
      stellium: 'Tres o más planetas juntos concentran tu energía en un mismo tema.',
    },
    hemi: {
      south: 'La mayoría de tus planetas está sobre el horizonte: vida orientada hacia afuera, lo público y los demás.',
      north: 'La mayoría de tus planetas está bajo el horizonte: vida orientada hacia adentro, lo íntimo y lo propio.',
      east: 'Predomina el hemisferio oriental: tendés a iniciar y a decidir por tu cuenta.',
      west: 'Predomina el hemisferio occidental: te realizás en relación y en respuesta a los otros.',
      balanced: 'Tus planetas están bastante repartidos entre los hemisferios.',
    },
    dignity: {
      domicile: 'Domicilio', exaltation: 'Exaltación', exile: 'Exilio', fall: 'Caída', peregrine: '—',
    },
    dignityNote: {
      domicile: 'está en su propio signo y se expresa con soltura',
      exaltation: 'está exaltado: da lo mejor de sí',
      exile: 'está en exilio: tiene que esforzarse para expresarse',
      fall: 'está en caída: su energía cuesta más',
    },
  };

  // Regentes (moderno primero, tradicional después)
  const RULERS = [['mars'], ['venus'], ['mercury'], ['moon'], ['sun'], ['mercury'], ['venus'], ['pluto', 'mars'], ['jupiter'], ['saturn'], ['uranus', 'saturn'], ['neptune', 'jupiter']];
  const EXALT = { sun: 0, moon: 1, mercury: 5, venus: 11, mars: 9, jupiter: 3, saturn: 6 };
  const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const WEIGHT = { sun: 3, moon: 3, mercury: 2, venus: 2, mars: 2, jupiter: 1, saturn: 1, uranus: 0.5, neptune: 0.5, pluto: 0.5 };

  function dignities(key, sign) {
    const out = [];
    if (RULERS[sign].includes(key)) out.push('domicile');
    if (EXALT[key] === sign) out.push('exaltation');
    if (RULERS[(sign + 6) % 12].includes(key)) out.push('exile');
    if (EXALT[key] != null && (EXALT[key] + 6) % 12 === sign) out.push('fall');
    return out;
  }

  function compute(chart) {
    const C = K();
    const by = Object.fromEntries(chart.points.map((p) => [p.key, p]));
    const sgn = (k) => C.signOf(by[k].lon);
    const res = {};

    // Dignidades
    res.dignities = PLANETS.map((k) => ({ key: k, name: by[k].name, sign: sgn(k), list: dignities(k, sgn(k)) }));

    // Regente de la carta
    if (chart.timeKnown) {
      const s = C.signOf(chart.asc), rs = RULERS[s];
      const r = by[rs[0]];
      res.ruler = { key: rs[0], name: r.name, sign: C.signOf(r.lon), house: r.house, lon: r.lon, trad: rs[1] ? by[rs[1]] : null, ascSign: s };
    }

    // Fase lunar
    const el = C.norm(by.moon.lon - by.sun.lon);
    res.phase = { angle: el, idx: Math.floor(el / 45) % 8, illum: (1 - Math.cos(el * Math.PI / 180)) / 2 };

    // Configuraciones (solo planetas)
    const asp = {};
    for (const a of chart.aspects) if (PLANETS.includes(a.p.key) && PLANETS.includes(a.q.key)) asp[a.p.key + '|' + a.q.key] = asp[a.q.key + '|' + a.p.key] = a.a.key;
    const is = (a, b, k) => asp[a + '|' + b] === k;
    const quincunx = (a, b) => Math.abs(Math.abs(C.diff(by[a].lon, by[b].lon)) - 150) <= 3;
    const pats = [];
    const P = PLANETS;
    const crosses = [];
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      if (!is(P[i], P[j], 'opp')) continue;
      for (let k = 0; k < P.length; k++) for (let l = k + 1; l < P.length; l++) {
        if (k === i || k === j || l === i || l === j) continue;
        if (is(P[k], P[l], 'opp') && is(P[i], P[k], 'square') && is(P[i], P[l], 'square') && is(P[j], P[k], 'square') && is(P[j], P[l], 'square')) {
          const set = [P[i], P[j], P[k], P[l]].sort().join();
          if (!crosses.includes(set)) { crosses.push(set); pats.push({ type: 'grandCross', name: 'Gran Cruz', members: [P[i], P[j], P[k], P[l]] }); }
        }
      }
    }
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) for (let k = j + 1; k < P.length; k++) {
      const [a, b, c] = [P[i], P[j], P[k]];
      if (is(a, b, 'trine') && is(b, c, 'trine') && is(a, c, 'trine')) pats.push({ type: 'grandTrine', name: 'Gran Trígono', members: [a, b, c], element: C.ELEMENTS[sgn(a) % 4] });
      for (const [x, y, apex] of [[a, b, c], [a, c, b], [b, c, a]]) {
        if (is(x, y, 'opp') && is(x, apex, 'square') && is(y, apex, 'square')) {
          const inCross = crosses.some((s) => [x, y, apex].every((m) => s.includes(m)));
          if (!inCross) pats.push({ type: 'tSquare', name: 'T-Cuadrada', members: [x, y, apex], apex });
        }
        if (is(x, y, 'sextile') && quincunx(x, apex) && quincunx(y, apex)) pats.push({ type: 'yod', name: 'Yod', members: [x, y, apex], apex });
      }
    }
    const signGroups = {};
    for (const k of P) (signGroups[sgn(k)] = signGroups[sgn(k)] || []).push(k);
    for (const s in signGroups) if (signGroups[s].length >= 3) pats.push({ type: 'stellium', name: 'Stellium en ' + C.SIGNS[s], members: signGroups[s] });
    if (chart.timeKnown) {
      const hg = {};
      for (const k of P) (hg[by[k].house] = hg[by[k].house] || []).push(k);
      for (const h in hg) if (hg[h].length >= 3 && !Object.values(signGroups).some((g) => g.join() === hg[h].join())) pats.push({ type: 'stellium', name: 'Stellium en casa ' + h, members: hg[h] });
    }
    res.patterns = pats;

    // Hemisferios y cuadrantes
    if (chart.timeKnown) {
      const hs = P.map((k) => by[k].house);
      const south = hs.filter((h) => h >= 7).length, east = hs.filter((h) => h >= 10 || h <= 3).length;
      const quads = [0, 0, 0, 0]; hs.forEach((h) => quads[Math.floor((h - 1) / 3)]++);
      res.hemi = { south, north: 10 - south, east, west: 10 - east, quads };
    }

    // Dominantes
    const signScore = new Array(12).fill(0), elScore = [0, 0, 0, 0];
    const addSign = (s, w) => { signScore[s] += w; elScore[s % 4] += w; };
    for (const k of P) addSign(sgn(k), WEIGHT[k]);
    if (chart.timeKnown) { addSign(C.signOf(chart.asc), 3); addSign(C.signOf(chart.mc), 1); }
    const planetScore = {};
    for (const k of P) {
      let s = (k === 'sun' || k === 'moon') ? 1 : 0;
      const d = dignities(k, sgn(k));
      if (d.includes('domicile')) s += 2; if (d.includes('exaltation')) s += 1;
      if (d.includes('exile')) s -= 1; if (d.includes('fall')) s -= 1;
      if (RULERS[sgn('sun')][0] === k) s += 1;
      if (RULERS[sgn('moon')][0] === k) s += 1;
      s += 0.5 * chart.aspects.filter((a) => a.p.key === k || a.q.key === k).length;
      if (chart.timeKnown) {
        if (res.ruler && res.ruler.key === k) s += 3;
        if ([1, 4, 7, 10].includes(by[k].house)) s += 1;
        if ([chart.asc, chart.mc, chart.asc + 180, chart.mc + 180].some((a) => Math.abs(C.diff(by[k].lon, a)) <= 8)) s += 2;
      }
      planetScore[k] = s;
    }
    const argmax = (arr) => arr.indexOf(Math.max(...arr));
    const topPlanet = Object.entries(planetScore).sort((a, b) => b[1] - a[1])[0][0];
    res.dominant = { element: argmax(elScore), elScore, sign: argmax(signScore), planet: topPlanet, planetName: by[topPlanet].name, missing: elScore.map((v, i) => v === 0 ? i : -1).filter((i) => i >= 0) };
    return res;
  }

  /* ---------- Render ---------- */
  function render(chart, el) {
    const C = K(), W = window.Wheel, T = window.TEXTOS;
    const r = compute(chart);
    const by = Object.fromEntries(chart.points.map((p) => [p.key, p]));
    const sym = (g) => `<span class="sym">${g}${W.VS}</span>`;
    const pg = (k) => sym(W.PLANET_GLYPHS[k]);
    const signTxt = (s) => `${sym(W.SIGN_GLYPHS[s])} ${C.SIGNS[s]}`;
    const digBadge = (list) => list.map((d) => `<span class="badge ${d}">${TX.dignity[d]}</span>`).join('');
    const ELN = ['fuego', 'tierra', 'aire', 'agua'];

    // Tarjetas destacadas
    let head = '<div class="lx-cards">';
    if (r.ruler) {
      const ru = r.ruler;
      head += `<article class="lx-card"><p class="k">Regente de la carta</p><p class="lx-big">${pg(ru.key)} ${ru.name}</p>
        <p class="lx-sub">en ${signTxt(ru.sign)} · casa ${ru.house}</p>
        <p>Tu Ascendente en ${C.SIGNS[ru.ascSign]} lo hace el planeta guía de la carta${ru.trad ? ` (en la astrología tradicional, ${ru.trad.name})` : ''}. Lo que haga en casa ${ru.house} tiñe todo lo demás.</p></article>`;
    }
    const ph = TX.phases[r.phase.idx];
    head += `<article class="lx-card"><p class="k">Fase lunar al nacer</p><div class="lx-phase">${moonSvg(r.phase.angle)}<div><p class="lx-big">${ph[0]}</p><p class="lx-sub">${Math.round(r.phase.illum * 100)}% iluminada · ${Math.round(r.phase.angle)}° del Sol</p></div></div><p>${ph[1]}</p></article>`;
    const d = r.dominant;
    head += `<article class="lx-card"><p class="k">Dominantes</p>
      <dl class="lx-dl"><dt>Elemento</dt><dd>${ELN[d.element][0].toUpperCase() + ELN[d.element].slice(1)}</dd><dt>Signo</dt><dd>${signTxt(d.sign)}</dd><dt>Planeta</dt><dd>${pg(d.planet)} ${d.planetName}</dd></dl>
      ${d.missing.length ? `<p>Falta ${d.missing.map((i) => ELN[i]).join(' y ')}: ${d.missing.length > 1 ? 'son terrenos' : 'es un terreno'} que se trabaja a conciencia.</p>` : ''}
      <p class="method">Método: Sol, Luna y Ascendente suman 3 puntos a su signo; Mercurio, Venus y Marte 2; Júpiter y Saturno 1; los transpersonales ½; el MC 1. El planeta dominante suma por dignidad, por ser regente, por estar en un ángulo y por cantidad de aspectos.</p></article>`;
    head += '</div>';

    // Planetas personales
    let pers = '<h3 class="lx-h">Planetas personales</h3><div class="lx-list">';
    const persRows = [
      ['sun', T.sun], ['moon', T.moon], ['mercury', TX.mercury], ['venus', TX.venus], ['mars', TX.mars],
    ];
    for (const [k, arr] of persRows) {
      const p = by[k], s = C.signOf(p.lon);
      const dg = dignities(k, s);
      let extra = '';
      if (chart.timeKnown && k === 'sun') extra = `<p class="lx-house"><b>Casa ${p.house}.</b> ${TX.sunHouse[p.house - 1]}</p>`;
      if (chart.timeKnown && k === 'moon') extra = `<p class="lx-house"><b>Casa ${p.house}.</b> ${TX.moonHouse[p.house - 1]}</p>`;
      pers += `<article class="lx-item"><div class="lx-g">${W.PLANET_GLYPHS[k]}${W.VS}</div><div>
        <h4>${p.name} en ${C.SIGNS[s]}${p.retro ? ' <span class="badge retro">℞ retrógrado</span>' : ''}${digBadge(dg)}</h4>
        <p>${arr[s]}</p>${extra}</div></article>`;
    }
    if (chart.timeKnown) {
      const s = C.signOf(chart.asc);
      pers += `<article class="lx-item"><div class="lx-g lx-ac">AC</div><div><h4>Ascendente en ${C.SIGNS[s]}</h4><p>${T.asc[s]}</p></div></article>`;
    }
    pers += '</div>';

    // Configuraciones
    let pat = '<h3 class="lx-h">Configuraciones</h3>';
    if (r.patterns.length) {
      pat += '<div class="lx-list">';
      for (const x of r.patterns) {
        const mem = x.members.map((m) => `${pg(m)} ${by[m].name}`).join(' · ');
        const apex = x.apex ? ` Vértice: <b>${by[x.apex].name}</b>.` : '';
        const elx = x.element ? ` De ${x.element}.` : '';
        pat += `<article class="lx-pat"><h4>${x.name}</h4><p class="lx-mem">${mem}</p><p>${TX.patterns[x.type]}${elx}${apex}</p></article>`;
      }
      pat += '</div>';
    } else pat += '<p class="lx-none">No hay grandes figuras (Gran Trígono, T-Cuadrada, Gran Cruz, Yod ni stellium): la energía está repartida.</p>';

    // Énfasis
    let emph = '';
    if (r.hemi) {
      const h = r.hemi;
      const txt = [];
      if (h.south >= 6) txt.push(TX.hemi.south); else if (h.north >= 6) txt.push(TX.hemi.north);
      if (h.east >= 6) txt.push(TX.hemi.east); else if (h.west >= 6) txt.push(TX.hemi.west);
      if (!txt.length) txt.push(TX.hemi.balanced);
      emph = `<h3 class="lx-h">Énfasis por hemisferios</h3><div class="lx-hemi">${quadSvg(h)}<div><p class="lx-sub">Arriba ${h.south} · abajo ${h.north} · este ${h.east} · oeste ${h.west}</p>${txt.map((t) => `<p>${t}</p>`).join('')}</div></div>`;
    }

    // Dignidades
    let dig = '<h3 class="lx-h">Dignidades esenciales</h3><div class="lx-dig">';
    for (const x of r.dignities) {
      dig += `<div class="lx-drow"><span class="pgl">${pg(x.key)}</span><span class="nm">${x.name}</span><span class="sg">${signTxt(x.sign)}</span><span class="st">${x.list.length ? digBadge(x.list) : '<span class="badge none">Peregrino</span>'}</span></div>`;
    }
    dig += '</div><p class="method">Domicilio y exilio según regentes modernos y tradicionales; exaltación y caída, solo para los siete planetas clásicos.</p>';
    el.innerHTML = head + pers + pat + emph + dig;
    return r;
  }

  function moonSvg(angle) {
    // Disco lunar visto desde la Tierra (hemisferio sur no se invierte: dibujo simbólico)
    const a = angle * Math.PI / 180;
    const k = Math.cos(a); // 1 nueva, −1 llena
    const waxing = angle < 180;
    const rx = Math.abs(k) * 20;
    const lit = '#E9DDBF', dark = '#2A2F3E';
    // mitad iluminada + elipse terminadora
    const side = waxing ? 1 : 0;
    const half = `M24 4 A20 20 0 0 ${side} 24 44 Z`;
    const ell = `<ellipse cx="24" cy="24" rx="${rx.toFixed(2)}" ry="20" fill="${k > 0 ? dark : lit}"/>`;
    return `<svg class="moon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="${dark}"/><path d="${half}" fill="${lit}"/>${ell}<circle cx="24" cy="24" r="20" fill="none" stroke="#1F2433" stroke-width="1"/></svg>`;
  }

  function quadSvg(h) {
    // Cuadrantes: I (casas 1-3) abajo-izquierda, II abajo-derecha, III arriba-derecha, IV arriba-izquierda
    const max = Math.max(...h.quads, 1);
    const q = (i, d) => `<path d="${d}" fill="#9C7428" fill-opacity="${(0.08 + 0.55 * h.quads[i] / max).toFixed(2)}" stroke="#1F2433" stroke-width="0.8"/>`;
    const lab = (x, y, i) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Cormorant, serif" font-weight="600" font-size="13" fill="#1F2433">${h.quads[i]}</text>`;
    return `<svg class="quad" viewBox="0 0 80 80" aria-hidden="true">
      ${q(0, 'M40 40 L4 40 A36 36 0 0 0 40 76 Z')}${q(1, 'M40 40 L40 76 A36 36 0 0 0 76 40 Z')}${q(2, 'M40 40 L76 40 A36 36 0 0 0 40 4 Z')}${q(3, 'M40 40 L40 4 A36 36 0 0 0 4 40 Z')}
      ${lab(26, 54, 0)}${lab(54, 54, 1)}${lab(54, 26, 2)}${lab(26, 26, 3)}
      <text x="0" y="40" font-size="8" dominant-baseline="central" font-family="Instrument Sans, sans-serif" fill="#7A766D">AC</text></svg>`;
  }

  window.Lectura = { compute, render, dignities, RULERS };
})();
