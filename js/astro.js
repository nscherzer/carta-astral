/* Cálculos de la carta natal: hora → UTC, posiciones, casas y aspectos.
   Depende de astronomy-engine (window.Astronomy), tz-lookup (window.tzlookup)
   y la tabla de Quirón (window.CHIRON_TABLE). */
(function () {
  'use strict';
  const A = window.Astronomy;
  const RAD = Math.PI / 180;
  const norm = (x) => ((x % 360) + 360) % 360;
  const rad = (d) => d * RAD;
  const deg = (r) => r / RAD;
  // diferencia angular con signo en (-180, 180]
  const diff = (a, b) => { let d = norm(a - b); return d > 180 ? d - 360 : d; };

  const SIGNS = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'];
  const ELEMENTS = ['fuego', 'tierra', 'aire', 'agua'];
  const MODALITIES = ['cardinal', 'fijo', 'mutable'];

  const BODIES = [
    { key: 'sun', name: 'Sol', astro: 'Sun', kind: 'planet', lum: true },
    { key: 'moon', name: 'Luna', astro: 'Moon', kind: 'planet', lum: true },
    { key: 'mercury', name: 'Mercurio', astro: 'Mercury', kind: 'planet' },
    { key: 'venus', name: 'Venus', astro: 'Venus', kind: 'planet' },
    { key: 'mars', name: 'Marte', astro: 'Mars', kind: 'planet' },
    { key: 'jupiter', name: 'Júpiter', astro: 'Jupiter', kind: 'planet' },
    { key: 'saturn', name: 'Saturno', astro: 'Saturn', kind: 'planet' },
    { key: 'uranus', name: 'Urano', astro: 'Uranus', kind: 'planet' },
    { key: 'neptune', name: 'Neptuno', astro: 'Neptune', kind: 'planet' },
    { key: 'pluto', name: 'Plutón', astro: 'Pluto', kind: 'planet' },
    { key: 'node', name: 'Nodo Norte', kind: 'point' },
    { key: 'chiron', name: 'Quirón', kind: 'point' },
  ];

  /* ---------- Zona horaria ---------- */

  // Offset (segundos, local − UTC) de la zona `tz` en el instante `utcMs`.
  function tzOffsetSec(tz, utcMs) {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', era: 'short',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    const p = {};
    for (const x of dtf.formatToParts(new Date(utcMs))) p[x.type] = x.value;
    let year = +p.year; if (p.era === 'BC' || p.era === 'B') year = 1 - year;
    const d = new Date(0);
    d.setUTCFullYear(year, +p.month - 1, +p.day);
    d.setUTCHours(+p.hour % 24, +p.minute, +p.second, 0);
    const base = Math.floor(utcMs / 1000) * 1000;
    return Math.round((d.getTime() - base) / 1000);
  }

  // Hora civil local (en la zona `tz`) → instante UTC. Maneja horario de verano histórico.
  function localToUtc(y, mo, d, h, mi, tz) {
    const w = new Date(0); w.setUTCFullYear(y, mo - 1, d); w.setUTCHours(h, mi, 0, 0);
    const wall = w.getTime();
    const o1 = tzOffsetSec(tz, wall);
    let utc = wall - o1 * 1000;
    const o2 = tzOffsetSec(tz, utc);
    let note = null;
    if (o2 !== o1) {
      const utc2 = wall - o2 * 1000;
      if (tzOffsetSec(tz, utc2) === o2) utc = utc2;
      else note = 'Esa hora no existió en ese lugar (cambio de horario); usamos la más cercana.';
    }
    const off = tzOffsetSec(tz, utc);
    // hora ambigua (se repite al atrasar el reloj)
    if (!note) {
      for (const alt of [utc - 3600e3, utc + 3600e3]) {
        const oa = tzOffsetSec(tz, alt);
        if (oa !== off && alt + oa * 1000 === wall) { note = 'Esa hora se repitió ese día (cambio de horario); usamos la primera.'; utc = Math.min(utc, alt); break; }
      }
    }
    return { utcMs: utc, offsetSec: tzOffsetSec(tz, utc), note };
  }

  function formatOffset(sec) {
    const s = sec < 0 ? '−' : '+';
    const a = Math.abs(sec);
    const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), r = a % 60;
    return 'UTC' + s + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + (r ? ':' + String(r).padStart(2, '0') : '');
  }

  function lookupTz(lat, lon) {
    try { return window.tzlookup(lat, lon); } catch (e) { return 'UTC'; }
  }

  /* ---------- Posiciones ---------- */

  function eclipticOfDate(vecEqj) {
    return A.Ecliptic(vecEqj); // eclíptica verdadera de la fecha (con nutación)
  }

  function bodyLon(b, t) {
    if (b.key === 'node') return meanNode(t);
    if (b.key === 'chiron') return chironLon(t);
    if (b.astro === 'Moon') return eclipticOfDate(A.GeoMoon(t)).elon;
    return eclipticOfDate(A.GeoVector(A.Body[b.astro], t, true)).elon;
  }

  // Nodo lunar medio (Meeus 47.7) + nutación en longitud.
  function meanNode(t) {
    const T = t.tt / 36525;
    const om = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000;
    const dpsi = A.e_tilt(t).dpsi / 3600;
    return norm(om + dpsi);
  }

  // Quirón: tabla heliocéntrica (Swiss Ephemeris) interpolada + Tierra de astronomy-engine.
  function chironHelioEcl(tt) {
    const C = window.CHIRON_TABLE;
    if (!C) return null;
    const n = C.xyz.length / 3;
    const f = (tt - C.start) / C.step;
    const i = Math.floor(f);
    if (i < 1 || i > n - 3) return null;
    const u = f - i;
    // Lagrange de 4 puntos (i-1, i, i+1, i+2)
    const w = [
      -u * (u - 1) * (u - 2) / 6,
      (u + 1) * (u - 1) * (u - 2) / 2,
      -(u + 1) * u * (u - 2) / 2,
      (u + 1) * u * (u - 1) / 6,
    ];
    const out = [0, 0, 0];
    for (let k = 0; k < 4; k++) for (let c = 0; c < 3; c++) out[c] += w[k] * C.xyz[(i - 1 + k) * 3 + c] * C.scale;
    return out;
  }
  function chironLon(t) {
    const earth = A.HelioVector(A.Body.Earth, t);
    const rot = A.Rotation_ECL_EQJ();
    let lt = 0, geo = null;
    for (let k = 0; k < 2; k++) {
      const h = chironHelioEcl(t.tt - lt);
      if (!h) return null;
      const v = A.RotateVector(rot, new A.Vector(h[0], h[1], h[2], t));
      geo = new A.Vector(v.x - earth.x, v.y - earth.y, v.z - earth.z, t);
      lt = Math.hypot(geo.x, geo.y, geo.z) * 0.0057755183; // días-luz por UA
    }
    return eclipticOfDate(geo).elon;
  }

  /* ---------- Casas ---------- */

  function trueObliquity(t) { return A.e_tilt(t).tobl; }

  function ascMc(ramc, eps, phi) {
    const r = rad(ramc), e = rad(eps), f = rad(phi);
    const mc = norm(deg(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e))));
    const asc = norm(deg(Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(f) * Math.sin(e)))));
    return { asc, mc };
  }

  function placidus(ramc, eps, phi) {
    const e = rad(eps), f = rad(phi);
    const lonFromRA = (ra) => norm(deg(Math.atan2(Math.sin(rad(ra)), Math.cos(rad(ra)) * Math.cos(e))));
    const sda = (lon) => {
      const dec = Math.asin(Math.sin(e) * Math.sin(rad(lon)));
      const x = -Math.tan(f) * Math.tan(dec);
      if (Math.abs(x) > 1) return NaN;
      return deg(Math.acos(x));
    };
    // raOf(D) da la ascensión recta de la cúspide en función del semiarco diurno D del punto.
    const solve = (start, raOf) => {
      let ra = start, lon = lonFromRA(ra);
      for (let k = 0; k < 60; k++) {
        const D = sda(lon);
        if (isNaN(D)) return NaN;
        const nra = norm(raOf(D));
        const nl = lonFromRA(nra);
        if (Math.abs(diff(nl, lon)) < 1e-10) { lon = nl; break; }
        ra = nra; lon = nl;
      }
      return lon;
    };
    const c11 = solve(ramc + 30, (D) => ramc + D / 3);
    const c12 = solve(ramc + 60, (D) => ramc + 2 * D / 3);
    const c2 = solve(ramc + 120, (D) => ramc + 180 - 2 * (180 - D) / 3);
    const c3 = solve(ramc + 150, (D) => ramc + 180 - (180 - D) / 3);
    if ([c11, c12, c2, c3].some(isNaN)) return null;
    const { asc, mc } = ascMc(ramc, eps, phi);
    const c = [asc, c2, c3, norm(mc + 180), norm(c11 + 180), norm(c12 + 180), norm(asc + 180), norm(c2 + 180), norm(c3 + 180), mc, c11, c12];
    return c;
  }

  function equalHouses(asc) { return Array.from({ length: 12 }, (_, i) => norm(asc + 30 * i)); }

  function houseOf(lon, cusps) {
    for (let i = 0; i < 12; i++) {
      const a = cusps[i], b = cusps[(i + 1) % 12];
      const span = norm(b - a), off = norm(lon - a);
      if (off < span) return i + 1;
    }
    return 1;
  }

  /* ---------- Aspectos ---------- */

  const ASPECTS = [
    { key: 'conj', name: 'Conjunción', plural: 'Conjunciones', angle: 0, orb: 8, nature: 'neutral', glyph: '☌' },
    { key: 'opp', name: 'Oposición', plural: 'Oposiciones', angle: 180, orb: 8, nature: 'tense', glyph: '☍' },
    { key: 'trine', name: 'Trígono', plural: 'Trígonos', angle: 120, orb: 8, nature: 'soft', glyph: '△' },
    { key: 'square', name: 'Cuadratura', plural: 'Cuadraturas', angle: 90, orb: 8, nature: 'tense', glyph: '□' },
    { key: 'sextile', name: 'Sextil', plural: 'Sextiles', angle: 60, orb: 6, nature: 'soft', glyph: '⚹' },
  ];

  function allowedOrb(asp, p, q) {
    const isPoint = (x) => x.kind !== 'planet';
    if (isPoint(p) || isPoint(q)) return asp.angle === 60 ? 3 : 5;
    return asp.orb + ((p.lum || q.lum) ? 2 : 0);
  }

  function findAspects(points) {
    const out = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p = points[i], q = points[j];
        if (p.lon == null || q.lon == null) continue;
        if ((p.key === 'asc' && q.key === 'mc') || (p.key === 'mc' && q.key === 'asc')) continue;
        if ((p.key === 'node' && q.key === 'chiron') || (p.key === 'chiron' && q.key === 'node')) continue;
        const sep = Math.abs(diff(p.lon, q.lon));
        for (const a of ASPECTS) {
          const orb = Math.abs(sep - a.angle);
          if (orb <= allowedOrb(a, p, q)) { out.push({ a, p, q, orb }); break; }
        }
      }
    }
    out.sort((x, y) => x.orb - y.orb);
    return out;
  }

  /* ---------- Carta completa ---------- */

  function signOf(lon) { return Math.floor(norm(lon) / 30); }

  function compute(input) {
    // input: {date:'YYYY-MM-DD', time:'HH:MM'|null, lat, lon, tz?}
    const [y, mo, d] = input.date.split('-').map(Number);
    const timeKnown = !!input.time;
    const [h, mi] = timeKnown ? input.time.split(':').map(Number) : [12, 0];
    const tz = input.tz || lookupTz(input.lat, input.lon);
    const conv = localToUtc(y, mo, d, h, mi, tz);
    const t = A.MakeTime(new Date(conv.utcMs));

    const points = [];
    for (const b of BODIES) {
      const lon = bodyLon(b, t);
      if (lon == null) continue;
      let speed = null;
      if (b.key !== 'node') {
        const l1 = bodyLon(b, t.AddDays(-0.5)), l2 = bodyLon(b, t.AddDays(0.5));
        speed = diff(l2, l1);
      } else speed = -0.053;
      points.push({ ...b, lon, speed, retro: b.key !== 'node' && b.key !== 'sun' && b.key !== 'moon' && speed < 0 });
    }

    let houses = null, asc = null, mc = null, houseSystem = null;
    const eps = trueObliquity(t);
    const ramc = norm(A.SiderealTime(t) * 15 + input.lon);
    if (timeKnown) {
      ({ asc, mc } = ascMc(ramc, eps, input.lat));
      if (Math.abs(input.lat) < 66) houses = placidus(ramc, eps, input.lat);
      if (houses) houseSystem = 'Placidus';
      else { houses = equalHouses(asc); houseSystem = 'Iguales (latitud polar)'; }
      for (const p of points) p.house = houseOf(p.lon, houses);
    }

    const aspectPoints = points.slice();
    if (timeKnown) {
      aspectPoints.push({ key: 'asc', name: 'Ascendente', kind: 'angle', lon: asc });
      aspectPoints.push({ key: 'mc', name: 'Medio Cielo', kind: 'angle', lon: mc });
    }
    const aspects = findAspects(aspectPoints);

    // balance (Sol a Plutón)
    const el = [0, 0, 0, 0], mod = [0, 0, 0];
    for (const p of points) {
      if (p.kind !== 'planet') continue;
      const s = signOf(p.lon);
      el[s % 4]++; mod[s % 3]++;
    }

    // Luna: rango del día si no hay hora
    let moonRange = null;
    if (!timeKnown) {
      const moon = BODIES[1];
      const t0 = A.MakeTime(new Date(localToUtc(y, mo, d, 0, 0, tz).utcMs));
      const t1 = A.MakeTime(new Date(localToUtc(y, mo, d, 23, 59, tz).utcMs));
      moonRange = [bodyLon(moon, t0), bodyLon(moon, t1)];
    }

    return {
      input, tz, utcMs: conv.utcMs, offsetSec: conv.offsetSec, tzNote: conv.note,
      timeKnown, points, asc, mc, houses, houseSystem, aspects, eps, ramc,
      balance: { elements: el, modalities: mod }, moonRange,
    };
  }

  function fmtDeg(lon) {
    const inSign = norm(lon) % 30;
    let d = Math.floor(inSign), m = Math.floor((inSign - d) * 60 + 1e-9);
    return { sign: signOf(lon), d, m, text: d + '°' + String(m).padStart(2, '0') + '′' };
  }

  window.Carta = { compute, localToUtc, tzOffsetSec, formatOffset, lookupTz, fmtDeg, signOf, norm, diff,
    SIGNS, ELEMENTS, MODALITIES, ASPECTS, BODIES, _internal: { ascMc, placidus, meanNode, chironLon } };
})();
