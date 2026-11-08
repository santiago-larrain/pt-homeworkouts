// Convierte un plan en una lista lineal de pasos para el reproductor.
// Planes individuales (mode 'solo') y en pareja (mode 'duo': cada item tiene `move`/`dose` para la
// persona 1 y `b: {move, dose}` para la persona 2; ambas comparten un solo ritmo).
import { MOVE_BY_ID } from '../data/catalog.js';

export const doseOf = item => (item && item.dose) || ((MOVE_BY_ID[item && item.move] || {}).dose) || { type: 'time', secs: 30 };
export const isDuo = plan => plan && plan.mode === 'duo';

export function repsText(d) {
  const n = d.min === d.max ? `${d.min}` : `${d.min}–${d.max}`;
  return `${n} ${d.unit || 'reps'}`;
}

export function doseText(d) {
  if (d.type === 'reps') return repsText(d) + (d.perSide ? ' c/lado' : '') + (d.alternating ? ' alternadas' : '');
  if (d.type === 'time') return `${fmtSecs(d.secs)}${d.perSide ? ' c/lado' : ''}`;
  if (d.type === 'phases') return d.phases.map(p => `${fmtSecs(p.secs)}${p.perSide ? ' c/lado' : ''}`).join(' + ');
  return '';
}

export function fmtSecs(s) {
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}:${String(r).padStart(2, '0')} min` : `${m} min`;
}
export const clock = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;

const SIDES = ['Lado derecho', 'Lado izquierdo'];

// Expande una dosis en unidades de trabajo (lados, fases). secs = null → repeticiones manuales.
function unitsFor(d, settings) {
  const units = [];
  if (d.type === 'time') {
    const sides = d.perSide ? 2 : 1;
    for (let s = 0; s < sides; s++) units.push({ secs: d.secs, sub: d.perSide ? SIDES[s] : (d.note || ''), pos: null, side: d.perSide ? s + 1 : 0 });
  } else if (d.type === 'reps') {
    const sides = d.perSide ? 2 : 1;
    const auto = settings.repsMode === 'auto';
    for (let s = 0; s < sides; s++) units.push({ secs: auto ? d.max * settings.secsPerRep : null, repsMax: d.max, reps: repsText(d) + (d.alternating ? ' alternadas' : ''), sub: d.perSide ? SIDES[s] : '', pos: null, side: d.perSide ? s + 1 : 0 });
  } else if (d.type === 'phases') {
    d.phases.forEach(ph => {
      const sides = ph.perSide ? 2 : 1;
      for (let s = 0; s < sides; s++) units.push({ secs: ph.secs, sub: ph.label + (ph.perSide ? ` · ${SIDES[s].toLowerCase()}` : ''), pos: ph.pos ?? null, side: ph.perSide ? s + 1 : 0 });
    });
  }
  return units;
}

// Une las unidades de las dos personas en un solo ritmo.
// govern 'time': manda el tiempo (las repeticiones se convierten a segundos y se toma el mayor).
// govern 'reps': si alguna hace repeticiones, el paso espera a que ambas toquen "Hecho".
function duoUnits(item, settings) {
  const ua = unitsFor(doseOf(item), settings), ub = unitsFor(doseOf(item.b), settings);
  const n = Math.max(ua.length, ub.length), out = [];
  const secsOf = u => u.secs != null ? u.secs : u.repsMax * settings.secsPerRep;
  for (let k = 0; k < n; k++) {
    const a = ua[Math.min(k, ua.length - 1)], b = ub[Math.min(k, ub.length - 1)];
    const anyReps = a.secs == null || b.secs == null;
    const secs = settings.duoGovern === 'reps' && anyReps ? null : Math.max(secsOf(a), secsOf(b));
    out.push({ secs, a, b, side: Math.max(a.side, b.side), sub: '' });
  }
  return out;
}

export function buildSteps(plan, settings, onlySection = null) {
  const steps = [];
  const duo = isDuo(plan);
  const sections = plan.sections.map((s, i) => ({ s, i })).filter(({ s, i }) => (onlySection == null || i === onlySection) && s.items.length);
  steps.push({ type: 'ready', secs: settings.getReady, title: 'Prepárate', key: 'ready' });
  sections.forEach(({ s: sec, i: secIdx }, k) => {
    const rounds = sec.kind === 'circuit' ? Math.max(1, sec.rounds) : 1;
    const restRound = settings.roundRest > 0 ? settings.roundRest : sec.rest;
    for (let r = 1; r <= rounds; r++) {
      sec.items.forEach((item, ii) => {
        const move = MOVE_BY_ID[item.move];
        if (!move || (duo && (!item.b || !MOVE_BY_ID[item.b.move]))) return;
        const moveB = duo ? MOVE_BY_ID[item.b.move] : null;
        const units = duo ? duoUnits(item, settings) : unitsFor(doseOf(item), settings);
        units.forEach((u, ui) => {
          const prev = steps[steps.length - 1];
          const base = { section: sec, sectionIdx: secIdx, round: r, rounds, move, moveB };
          if (ui > 0) {
            const switching = u.side === 2 && units[ui - 1].side === 1;
            const t = switching ? settings.switchSides : settings.phaseGap;
            if (t > 0) steps.push({ ...base, type: 'switch', secs: t, title: switching ? 'Cambia de lado' : 'Cambia de posición', nextUnit: u, key: `${secIdx}|${r}|${ii}|${ui}|switch` });
          } else if (prev && prev.type === 'work' && settings.transition > 0) {
            steps.push({ ...base, type: 'transition', secs: settings.transition, title: 'Siguiente', nextUnit: u, key: `${secIdx}|${r}|${ii}|${ui}|trans` });
          }
          const w = { ...base, type: 'work', secs: u.secs, title: move.name, itemIdx: ii, items: sec.items.length, key: `${secIdx}|${r}|${ii}|${ui}|work` };
          if (duo) Object.assign(w, { duo: true, a: { ...u.a, move, dose: doseOf(item) }, b: { ...u.b, move: moveB, dose: doseOf(item.b) }, side: u.side });
          else Object.assign(w, { reps: u.reps, sub: u.sub, pos: u.pos, side: u.side, dose: doseOf(item) });
          steps.push(w);
        });
      });
      if (r < rounds && restRound > 0) steps.push({ type: 'rest', secs: restRound, title: 'Descanso', section: sec, sectionIdx: secIdx, round: r, rounds, nextRound: r + 1, key: `${secIdx}|${r}|rest` });
    }
    if (k < sections.length - 1 && settings.sectionRest > 0) steps.push({ type: 'rest', secs: settings.sectionRest, title: 'Descanso', sub: 'Cambio de bloque', section: sections[k + 1].s, sectionIdx: sections[k + 1].i, round: 1, rounds: 1, betweenSections: true, key: `${secIdx}|end|rest` });
  });
  steps.push({ type: 'done', title: '¡Lista!', key: 'done' });
  let nextWork = null;
  for (let i = steps.length - 1; i >= 0; i--) { steps[i].nextWork = nextWork; if (steps[i].type === 'work') nextWork = steps[i]; }
  return steps;
}

export function estimateSecs(steps, settings) {
  return steps.reduce((a, s) => a + (s.secs != null ? s.secs : (s.type === 'work' ? settings.repSecondsEstimate : 0)), 0);
}

export function sectionEstimate(plan, idx, settings) {
  return estimateSecs(buildSteps(plan, settings, idx), settings) - settings.getReady;
}
