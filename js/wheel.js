/* Dibujo de la rueda de la carta en SVG. */
(function () {
  'use strict';
  const C = () => window.Carta;
  const VS = '︎'; // fuerza presentación de texto (sin emoji en iOS)

  const COLORS = {
    paper: '#F6F1E7', ink: '#1F2433', soft: '#6B6A66', hair: '#BDB29D', faint: '#DDD4C2',
    gold: '#9C7428', tense: '#B4452E', harm: '#2D6479', conj: '#9C7428',
    el: ['#B9572F', '#5F6E3A', '#A8842F', '#356A8A'], // fuego, tierra, aire, agua
  };
  const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const PLANET_GLYPHS = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', node: '☊', chiron: '⚷' };

  const R = { out: 468, zin: 404, hnOut: 286, asp: 244 };
  const FONT_SERIF = "Cormorant, 'Cormorant Garamond', Georgia, serif";
  const FONT_SYM = "Astro, 'Noto Sans Symbols', 'Segoe UI Symbol', serif";

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f1 = (n) => Math.round(n * 10) / 10;

  function build(chart, opts = {}) {
    const rot = chart && chart.timeKnown ? chart.asc : 0; // ASC a la izquierda
    const P = (r, lon) => {
      const a = (180 + lon - rot) * Math.PI / 180;
      return [f1(r * Math.cos(a)), f1(-r * Math.sin(a))];
    };
    const line = (r1, l1, r2, l2, attrs) => {
      const [x1, y1] = P(r1, l1), [x2, y2] = P(r2, l2);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;
    };
    const s = [];
    const pad = 60;
    const vb = R.out + pad;
    s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-vb} ${-vb} ${2 * vb} ${2 * vb}" role="img" aria-label="${esc(opts.label || 'Carta natal')}">`);
    s.push(`<style>${opts.fontCss || ''}text{font-variant-numeric:lining-nums}</style>`);
    if (opts.background) s.push(`<rect x="${-vb}" y="${-vb}" width="${2 * vb}" height="${2 * vb}" fill="${COLORS.paper}"/>`);

    // Banda zodiacal con tinte por elemento
    for (let i = 0; i < 12; i++) {
      const a0 = i * 30, a1 = a0 + 30;
      const [x0, y0] = P(R.out, a0), [x1, y1] = P(R.out, a1), [x2, y2] = P(R.zin, a1), [x3, y3] = P(R.zin, a0);
      s.push(`<path d="M${x0} ${y0} A${R.out} ${R.out} 0 0 0 ${x1} ${y1} L${x2} ${y2} A${R.zin} ${R.zin} 0 0 1 ${x3} ${y3}Z" fill="${COLORS.el[i % 4]}" fill-opacity="0.075"/>`);
      const [gx, gy] = P((R.out + R.zin) / 2, a0 + 15);
      s.push(`<text x="${gx}" y="${gy}" font-family="${FONT_SYM}" font-size="34" fill="${COLORS.el[i % 4]}" text-anchor="middle" dominant-baseline="central">${SIGN_GLYPHS[i]}${VS}</text>`);
      s.push(line(R.zin, a0, R.out, a0, `stroke="${COLORS.ink}" stroke-width="1" stroke-opacity="0.55"`));
    }
    // Marcas de grados
    for (let d = 0; d < 360; d++) {
      const len = d % 10 === 0 ? 15 : d % 5 === 0 ? 10 : 5;
      s.push(line(R.zin, d, R.zin - len, d, `stroke="${COLORS.ink}" stroke-width="${d % 5 === 0 ? 0.9 : 0.6}" stroke-opacity="${d % 5 === 0 ? 0.6 : 0.4}"`));
    }
    s.push(`<circle r="${R.out}" fill="none" stroke="${COLORS.ink}" stroke-width="1.6"/>`);
    s.push(`<circle r="${R.out + 7}" fill="none" stroke="${COLORS.ink}" stroke-width="0.6" stroke-opacity="0.5"/>`);
    s.push(`<circle r="${R.zin}" fill="none" stroke="${COLORS.ink}" stroke-width="1.1"/>`);
    s.push(`<circle r="${R.asp}" fill="${opts.background ? COLORS.paper : 'none'}" stroke="${COLORS.ink}" stroke-width="1"/>`);

    if (!chart) { s.push('</svg>'); return s.join(''); }

    // Casas
    if (chart.timeKnown && chart.houses) {
      s.push(`<circle r="${R.hnOut}" fill="none" stroke="${COLORS.ink}" stroke-width="0.7" stroke-opacity="0.6"/>`);
      const cusps = chart.houses;
      for (let i = 0; i < 12; i++) {
        const angular = i % 3 === 0;
        if (!angular) s.push(line(R.asp, cusps[i], R.zin, cusps[i], `stroke="${COLORS.ink}" stroke-width="0.7" stroke-opacity="0.45"`));
        const next = cusps[(i + 1) % 12];
        const mid = cusps[i] + C().norm(next - cusps[i]) / 2;
        const [nx, ny] = P((R.asp + R.hnOut) / 2, mid);
        s.push(`<text x="${nx}" y="${ny}" font-family="${FONT_SERIF}" font-size="21" font-weight="600" fill="${COLORS.soft}" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`);
      }
      // Ejes AC–DC y MC–IC
      const axes = [[chart.asc, 'AC'], [chart.asc + 180, 'DC'], [chart.mc, 'MC'], [chart.mc + 180, 'IC']];
      for (const [lon, lab] of axes) {
        const strong = lab === 'AC' || lab === 'MC';
        s.push(line(R.asp, lon, R.out + 20, lon, `stroke="${COLORS.ink}" stroke-width="${strong ? 2 : 1.3}"`));
        const [lx, ly] = P(R.out + 42, lon);
        s.push(`<text x="${lx}" y="${ly}" font-family="${FONT_SERIF}" font-size="22" font-weight="600" letter-spacing="1" fill="${COLORS.ink}" text-anchor="middle" dominant-baseline="central">${lab}</text>`);
      }
      const [ax, ay] = P(R.out + 20, chart.asc);
      s.push(`<circle cx="${ax}" cy="${ay}" r="3.5" fill="${COLORS.ink}"/>`);
    }

    // Aspectos
    for (const asp of chart.aspects) {
      if (asp.a.key === 'conj') continue;
      const [x1, y1] = P(R.asp, asp.p.lon), [x2, y2] = P(R.asp, asp.q.lon);
      const col = asp.a.nature === 'tense' ? COLORS.tense : COLORS.harm;
      const w = asp.orb < 1 ? 1.9 : asp.orb < 3 ? 1.35 : 0.9;
      const op = asp.orb < 1 ? 0.95 : asp.orb < 3 ? 0.8 : 0.55;
      const dash = asp.a.key === 'sextile' ? ' stroke-dasharray="6 5"' : '';
      s.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-opacity="${op}"${dash}/>`);
    }

    // Planetas con anti-colisión
    const pts = chart.points.map((p) => ({ p, lon: p.lon, disp: p.lon }));
    spread(pts, 11.5);
    const rG = 352, rDeg = 306;
    for (const o of pts) {
      const { p } = o;
      s.push(line(R.zin, p.lon, R.zin - 22, p.lon, `stroke="${COLORS.ink}" stroke-width="1.4"`));
      const [tx, ty] = P(R.zin - 22, p.lon), [gx2, gy2] = P(rG + 24, o.disp);
      if (Math.abs(C().diff(o.disp, p.lon)) > 0.6) s.push(`<line x1="${tx}" y1="${ty}" x2="${gx2}" y2="${gy2}" stroke="${COLORS.ink}" stroke-width="0.6" stroke-opacity="0.55"/>`);
      const [dx, dy] = P(R.asp, p.lon);
      s.push(`<circle cx="${dx}" cy="${dy}" r="3" fill="${COLORS.ink}"/>`);
      const [gx, gy] = P(rG, o.disp);
      const col = p.key === 'node' || p.key === 'chiron' ? COLORS.soft : COLORS.ink;
      s.push(`<text x="${gx}" y="${gy}" font-family="${FONT_SYM}" font-size="44" fill="${col}" text-anchor="middle" dominant-baseline="central">${PLANET_GLYPHS[p.key]}${VS}</text>`);
      const fd = C().fmtDeg(p.lon);
      const [lx, ly] = P(rDeg, o.disp);
      s.push(`<text x="${lx}" y="${ly}" font-family="${FONT_SERIF}" font-size="25" font-weight="700" fill="${COLORS.ink}" text-anchor="middle" dominant-baseline="central">${fd.d}°<tspan font-size="18" font-weight="600" fill="${COLORS.soft}" dx="1">${String(fd.m).padStart(2, '0')}</tspan>${p.retro ? `<tspan font-family="${FONT_SYM}" font-size="19" font-weight="400" fill="${COLORS.tense}" dx="2">℞${VS}</tspan>` : ''}</text>`);
    }
    if (!chart.timeKnown) {
      s.push(`<text x="0" y="-8" font-family="${FONT_SERIF}" font-style="italic" font-size="22" fill="${COLORS.soft}" text-anchor="middle">Carta sin hora</text>`);
      s.push(`<text x="0" y="20" font-family="${FONT_SERIF}" font-style="italic" font-size="18" fill="${COLORS.soft}" text-anchor="middle">calculada al mediodía</text>`);
    }
    s.push('</svg>');
    return s.join('');
  }

  // Separa glifos superpuestos manteniendo el orden zodiacal: agrupa en clústeres
  // y reparte cada uno alrededor de su centro, fusionando hasta que no se pisen.
  function spread(items, minSep) {
    const n = items.length;
    if (n < 2) return;
    items.sort((a, b) => a.lon - b.lon);
    // empezar después del hueco más grande para no lidiar con el cruce 360→0
    let best = 0, gapMax = -1;
    for (let i = 0; i < n; i++) {
      const g = C().norm(items[(i + 1) % n].lon - items[i].lon);
      if (g > gapMax) { gapMax = g; best = (i + 1) % n; }
    }
    const seq = [];
    for (let k = 0; k < n; k++) {
      const it = items[(best + k) % n];
      let x = it.lon;
      if (k > 0) while (x < seq[k - 1].x) x += 360;
      seq.push({ it, x });
    }
    let clusters = seq.map((o) => ({ m: [o], c: o.x }));
    const first = (cl) => cl.c - (cl.m.length - 1) * minSep / 2;
    const last = (cl) => cl.c + (cl.m.length - 1) * minSep / 2;
    let merged = true;
    while (merged && clusters.length > 1) {
      merged = false;
      for (let i = 0; i < clusters.length - 1; i++) {
        if (last(clusters[i]) + minSep > first(clusters[i + 1])) {
          const m = clusters[i].m.concat(clusters[i + 1].m);
          const lo = m[0].x, hi = m[m.length - 1].x;
          clusters.splice(i, 2, { m, c: (lo + hi) / 2 });
          merged = true; break;
        }
      }
      // el último y el primero pueden pisarse dando la vuelta
      if (!merged && clusters.length > 1) {
        const a = clusters[clusters.length - 1], b = clusters[0];
        if (last(a) + minSep > first(b) + 360) {
          const m = a.m.concat(b.m.map((o) => ({ it: o.it, x: o.x + 360 })));
          clusters.splice(clusters.length - 1, 1);
          clusters[0] = { m, c: (m[0].x + m[m.length - 1].x) / 2 };
          merged = true;
        }
      }
    }
    if (clusters.length === 1 && clusters[0].m.length * minSep > 360) minSep = 360 / clusters[0].m.length;
    for (const cl of clusters) cl.m.forEach((o, j) => { o.it.disp = C().norm(first(cl) + j * minSep); });
  }

  window.Wheel = { build, COLORS, SIGN_GLYPHS, PLANET_GLYPHS, VS };
})();
