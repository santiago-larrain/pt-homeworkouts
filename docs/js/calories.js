// Motor de calorías (estimación). Funciones puras, sin DOM ni estado: ver project/RESEARCH_CALORIES.md.
//   kcal/min = MET × 3,5 × kg / 200 × k      (k = corrección individual por metabolismo en reposo, Byrne 2005)
//   RMR      = Mifflin-St Jeor (1990)        k = RMR / (25,2 · kg), acotado a 0,75–1,10
// Siempre es una ESTIMACIÓN: se redondea a múltiplos de 5 y se muestra con «≈».

export const REST_MET = 1.5;                       // pausas, transiciones y cambios de lado (heurística propia)
export const DEFAULT_MET = 3.5;                    // movimiento sin `met` (p. ej. añadido sin metadatos)
export const DEFAULTS = { kg: { f: 62, m: 75 }, cm: { f: 160, m: 172 }, age: 30 };
export const K_MIN = 0.75, K_MAX = 1.10;
export const LOAD_CAP = 0.15;                      // el ajuste por carga nunca pasa de +15 % del MET base
export const LOAD_SLOPE = 3;                       // dMET = 3 × (carga / peso corporal), heurística propia

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const round5 = n => Math.round(n / 5) * 5;

// Último peso registrado (por fecha), o null.
export function lastWeight(profile) {
  const w = ((profile && profile.weights) || []).filter(x => x && x.kg > 0 && x.date).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  return w.length ? w[w.length - 1].kg : null;
}

// Datos del perfil con valores por defecto donde falten. `defaults` lista qué se completó («peso», «estatura», «edad»).
export function bodyOf(profile, year = new Date().getFullYear()) {
  const p = profile || {}, g = p.gender === 'm' ? 'm' : p.gender === 'f' ? 'f' : null, gg = g || 'f';
  const defaults = [];
  let kg = lastWeight(p); if (!kg) { kg = DEFAULTS.kg[gg]; defaults.push('peso'); }
  let cm = p.heightCm > 0 ? p.heightCm : (defaults.push('estatura'), DEFAULTS.cm[gg]);
  let age = p.birthYear > 1900 && p.birthYear <= year ? year - p.birthYear : (defaults.push('edad'), DEFAULTS.age);
  return { kg, cm, age, gender: g, defaults };
}

// Mifflin-St Jeor (kcal/día). Sin género conocido: promedio de las dos constantes (−78).
export function rmr({ kg, cm, age, gender }) {
  return 10 * kg + 6.25 * cm - 5 * age + (gender === 'm' ? 5 : gender === 'f' ? -161 : -78);
}

// Factor de corrección k (1 = fórmula estándar sin corregir).
export function kFactor(body, corrected = true) {
  if (!corrected) return 1;
  return clamp(rmr(body) / (25.2 * body.kg), K_MIN, K_MAX);
}

// MET del movimiento con un pequeño ajuste por la carga que usa el perfil (mancuernas o kettlebell; un solo implemento).
export function loadedMet(met, equipment, loads, kg) {
  const eq = equipment || [], L = loads || {};
  const load = eq.includes('mancuernas') ? L.dumbbellKg : eq.includes('kettlebell') ? L.kettlebellKg : 0;
  if (!(load > 0) || !(kg > 0)) return met;
  return met + Math.min(LOAD_CAP * met, LOAD_SLOPE * load / kg);
}

export const kcalPerMin = (met, kg, k = 1) => met * 3.5 * kg / 200 * k;

// items: [{ secs, kind: 'work'|'rest'|'switch', moveId? }] con segundos REALES. lookup(id) → movimiento del catálogo.
// opts: { corrected = true, load = true, year }
export function sessionKcal(profile, items, lookup, opts = {}) {
  const { corrected = true, load = true, year } = opts;
  const body = bodyOf(profile, year), k = kFactor(body, corrected), loads = profile && profile.loads;
  let raw = 0, secs = 0;
  for (const it of items) {
    if (!(it.secs > 0)) continue;
    let met = REST_MET;
    if (it.kind === 'work') {
      const m = (lookup && it.moveId && lookup(it.moveId)) || null;
      met = m && m.met > 0 ? m.met : DEFAULT_MET;
      if (load && m) met = loadedMet(met, m.equipment, loads, body.kg);
    }
    raw += kcalPerMin(met, body.kg, k) * it.secs / 60; secs += it.secs;
  }
  return { kcal: round5(raw), raw, secs, k, kg: body.kg, defaults: body.defaults, estimated: body.defaults.length > 0 };
}

// Texto «≈ 120 kcal» (menos de 3 kcal → null: no se muestra)
export const kcalText = n => (n == null || n < 3) ? null : `≈ ${n} kcal`;
