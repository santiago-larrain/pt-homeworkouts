// Convierte un plan en una lista lineal de pasos para el reproductor.
import { MOVE_BY_ID } from '../data/catalog.js';

export const doseOf = item => item.dose || (MOVE_BY_ID[item.move] || {}).dose || { type: 'time', secs: 30 };

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

// Expande un item en sub-pasos de trabajo (lados, fases)
function workUnits(item, settings) {
  const d = doseOf(item);
  const units = [];
  if (d.type === 'time') {
    const sides = d.perSide ? 2 : 1;
    for (let s = 0; s < sides; s++) units.push({ secs: d.secs, sub: d.perSide ? SIDES[s] : (d.note || ''), pos: null, side: d.perSide ? s + 1 : 0 });
  } else if (d.type === 'reps') {
    const sides = d.perSide ? 2 : 1;
    const auto = settings.repsMode === 'auto';
    for (let s = 0; s < sides; s++) units.push({ secs: auto ? d.max * settings.secsPerRep : null, reps: repsText(d) + (d.alternating ? ' alternadas' : ''), sub: d.perSide ? SIDES[s] : '', pos: null, side: d.perSide ? s + 1 : 0 });
  } else if (d.type === 'phases') {
    d.phases.forEach(ph => {
      const sides = ph.perSide ? 2 : 1;
      for (let s = 0; s < sides; s++) units.push({ secs: ph.secs, sub: ph.label + (ph.perSide ? ` · ${SIDES[s].toLowerCase()}` : ''), pos: ph.pos ?? null, side: ph.perSide ? s + 1 : 0 });
    });
  }
  return units;
}

export function buildSteps(plan, settings, onlySection = null) {
  const steps = [];
  const sections = plan.sections.filter((s, i) => (onlySection == null || i === onlySection) && s.items.length);
  steps.push({ type: 'ready', secs: settings.getReady, title: 'Prepárate' });
  sections.forEach((sec, si) => {
    const rounds = sec.kind === 'circuit' ? Math.max(1, sec.rounds) : 1;
    for (let r = 1; r <= rounds; r++) {
      sec.items.forEach((item, ii) => {
        const move = MOVE_BY_ID[item.move];
        if (!move) return;
        const units = workUnits(item, settings);
        units.forEach((u, ui) => {
          const prev = steps[steps.length - 1];
          if (ui > 0) {
            const switching = u.side === 2 && units[ui - 1].side === 1;
            const t = switching ? settings.switchSides : settings.phaseGap;
            if (t > 0) steps.push({ type: 'switch', secs: t, title: switching ? 'Cambia de lado' : 'Cambia de posición', section: sec, sectionIdx: si, round: r, rounds, move, nextUnit: u });
          } else if (prev && prev.type === 'work' && settings.transition > 0) {
            steps.push({ type: 'transition', secs: settings.transition, title: 'Siguiente', section: sec, sectionIdx: si, round: r, rounds, move, nextUnit: u, dose: doseOf(item) });
          }
          steps.push({ type: 'work', secs: u.secs, reps: u.reps, title: move.name, sub: u.sub, pos: u.pos, side: u.side, section: sec, sectionIdx: si, round: r, rounds, itemIdx: ii, items: sec.items.length, move, dose: doseOf(item) });
        });
      });
      if (r < rounds && sec.rest > 0) steps.push({ type: 'rest', secs: sec.rest, title: 'Descanso', section: sec, sectionIdx: si, round: r, rounds, nextRound: r + 1 });
    }
    if (si < sections.length - 1 && settings.sectionRest > 0) steps.push({ type: 'rest', secs: settings.sectionRest, title: 'Descanso', sub: 'Cambio de bloque', section: sections[si + 1], sectionIdx: si + 1, round: 1, rounds: 1, betweenSections: true });
  });
  steps.push({ type: 'done', title: '¡Lista!' });
  // vínculo al siguiente trabajo (para "a continuación")
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
