// Progreso y motivación (funciones puras, sin DOM): semanas, meta semanal, racha en SEMANAS e hitos.
// Principio: refuerzo positivo. Una semana sin cumplir la meta no resta nada; solo no suma.

export const weekStart = d => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - wd); return x; };
export const weekKey = d => weekStart(d).getTime();
export const localISO = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const prevWeek = t => { const w = new Date(t); w.setDate(w.getDate() - 7); return w.getTime(); };

// Sesiones de un perfil. Las anteriores a los perfiles (sin `profiles`) son del perfil principal (`firstPid`).
export const entriesOf = (history, pid, firstPid) => (history || []).filter(h => (h.profiles && h.profiles.length ? h.profiles : [firstPid]).includes(pid));

export function weekCounts(entries) {
  const m = new Map();
  entries.forEach(h => { const k = weekKey(h.date); m.set(k, (m.get(k) || 0) + 1); });
  return m;
}

// Semanas seguidas que cumplieron la meta. La semana en curso no rompe nada: si aún no cumple, se cuenta desde la anterior.
export function streakWeeks(entries, goal, now = new Date()) {
  const wc = weekCounts(entries), met = k => (wc.get(k) || 0) >= goal;
  let w = weekKey(now); if (!met(w)) w = prevWeek(w);
  let n = 0; while (met(w)) { n++; w = prevWeek(w); }
  return n;
}

// Mayor número de semanas seguidas cumplidas en todo el historial.
export function bestStreak(entries, goal) {
  const wc = weekCounts(entries), keys = [...wc.keys()].filter(k => wc.get(k) >= goal).sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  keys.forEach(k => { run = prev !== null && prevWeek(k) === prev ? run + 1 : 1; prev = k; best = Math.max(best, run); });
  return best;
}

export function statsOf(all, pid, goal) {
  const entries = all.filter(e => !e.partial || (e.secs || 0) >= 180); // una salida casi inmediata no cuenta para los hitos
  const moves = new Set();
  let secs = 0, kcal = 0;
  entries.forEach(h => {
    secs += h.secs || 0; kcal += (h.kcal && h.kcal[pid]) || 0;
    Object.keys((h.moveSecs && h.moveSecs[pid]) || {}).forEach(id => moves.add(id));
  });
  const wc = weekCounts(entries);
  return { sessions: entries.length, minutes: Math.round(secs / 60), kcal, moves: moves.size, weekMet: [...wc.values()].some(n => n >= goal), best: bestStreak(entries, goal) };
}

// Hitos (orden = importancia creciente; en la pantalla final se muestra uno solo, el último desbloqueado).
export const MILESTONES = [
  { id: 'first', icon: 'sparkle', name: 'Primer entrenamiento', desc: 'El primero siempre cuenta.', test: s => s.sessions >= 1 },
  { id: 'weekgoal', icon: 'check', name: 'Primera meta semanal', desc: 'Cumpliste la meta de una semana.', test: s => s.weekMet },
  { id: 's5', icon: 'flame', name: '5 sesiones', desc: 'Ya es un hábito que empieza.', test: s => s.sessions >= 5 },
  { id: 'moves10', icon: 'grid', name: '10 movimientos distintos', desc: 'Variar también es progreso.', test: s => s.moves >= 10 },
  { id: 's10', icon: 'flame', name: '10 sesiones', desc: 'Dos dígitos de constancia.', test: s => s.sessions >= 10 },
  { id: 'kcal500', icon: 'heart', name: '500 kcal acumuladas', desc: 'Suma estimada de todas tus sesiones.', test: s => s.kcal >= 500 },
  { id: 'streak4', icon: 'calendar', name: '4 semanas seguidas', desc: 'Un mes cumpliendo tu meta.', test: s => s.best >= 4 },
  { id: 's25', icon: 'flame', name: '25 sesiones', desc: 'Un cuarto de centenar.', test: s => s.sessions >= 25 },
  { id: 'moves25', icon: 'grid', name: '25 movimientos distintos', desc: 'Conoces bien tu cuerpo en movimiento.', test: s => s.moves >= 25 },
  { id: 'kcal1000', icon: 'heart', name: '1000 kcal acumuladas', desc: 'Suma estimada de todas tus sesiones.', test: s => s.kcal >= 1000 },
  { id: 's50', icon: 'flame', name: '50 sesiones', desc: 'Medio centenar. Qué constancia.', test: s => s.sessions >= 50 },
  { id: 'kcal5000', icon: 'heart', name: '5000 kcal acumuladas', desc: 'Suma estimada de todas tus sesiones.', test: s => s.kcal >= 5000 },
];
export const MILESTONE_BY_ID = Object.fromEntries(MILESTONES.map(m => [m.id, m]));

// Hitos que se cumplen con estas sesiones y que aún no están en `have` ({id: fecha}).
export const newMilestones = (entries, pid, goal, have = {}) => {
  const s = statsOf(entries, pid, goal);
  return MILESTONES.filter(m => !have[m.id] && m.test(s)).map(m => m.id);
};

// Recorre el historial en orden y devuelve {id: fecha local} (se usa al migrar, para no mostrar hitos viejos como nuevos).
export function replayMilestones(entries, pid, goal) {
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date)), out = {};
  sorted.forEach((e, i) => {
    const s = statsOf(sorted.slice(0, i + 1), pid, goal);
    MILESTONES.forEach(m => { if (!out[m.id] && m.test(s)) out[m.id] = localISO(e.date); });
  });
  return out;
}
