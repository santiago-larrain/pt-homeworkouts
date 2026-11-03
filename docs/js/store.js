// Estado persistente en el dispositivo (localStorage). Sin servidor ni cuentas.
import { DEFAULT_PLANS } from '../data/plans.js';

const KEY = 'ptw.state.v1';

export const DEFAULT_SETTINGS = {
  name: 'Anita',
  sound: true,
  volume: 0.8,
  beepLast: 3,          // pitidos en los últimos N segundos (0 = apagado)
  ignoreSilent: false,  // sonar aunque el iPhone esté en silencio
  voice: false,         // voz guía (anuncia ejercicios)
  getReady: 5,          // cuenta regresiva inicial
  transition: 10,       // pausa entre ejercicios
  switchSides: 5,       // cambio de lado
  phaseGap: 3,          // cambio de posición dentro de un ejercicio
  sectionRest: 60,      // descanso entre bloques
  repsMode: 'manual',   // 'manual' (botón Hecho) | 'auto' (temporizado)
  secsPerRep: 3,
  repSecondsEstimate: 30,  // estimación (solo para calcular la duración total)
  wakeLock: true,
  animate: true,        // alterna posición 1 ↔ 2 como animación
  animSpeed: 1.6,       // segundos por posición
  theme: 'auto',
};

const clone = o => JSON.parse(JSON.stringify(o));

function initial() {
  return { settings: { ...DEFAULT_SETTINGS }, plans: clone(DEFAULT_PLANS), activePlanId: DEFAULT_PLANS[0].id, history: [], hiddenBuiltins: [] };
}

export const store = {
  state: null,
  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s || !Array.isArray(s.plans)) s = initial();
    s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
    s.history = s.history || [];
    s.hiddenBuiltins = s.hiddenBuiltins || [];
    // agrega planes nuevos que vengan con la app (sin pisar los editados)
    for (const p of DEFAULT_PLANS) if (!s.plans.some(x => x.id === p.id) && !s.hiddenBuiltins.includes(p.id)) s.plans.push(clone(p));
    if (!s.plans.some(p => p.id === s.activePlanId)) s.activePlanId = s.plans[0] ? s.plans[0].id : null;
    this.state = s;
    return s;
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { console.warn(e); } },
  plan(id) { return this.state.plans.find(p => p.id === id); },
  restoreBuiltin(id) {
    const orig = DEFAULT_PLANS.find(p => p.id === id); if (!orig) return;
    const i = this.state.plans.findIndex(p => p.id === id);
    if (i >= 0) this.state.plans[i] = clone(orig); else this.state.plans.push(clone(orig));
    this.save();
  },
  isBuiltin(id) { return DEFAULT_PLANS.some(p => p.id === id); },
  exportJSON() { return JSON.stringify({ app: 'pt-homeworkouts', version: 1, exportedAt: new Date().toISOString(), ...this.state }, null, 2); },
  importJSON(txt) {
    const d = JSON.parse(txt);
    if (!Array.isArray(d.plans)) throw new Error('Archivo no válido');
    this.state = { settings: { ...DEFAULT_SETTINGS, ...d.settings }, plans: d.plans, activePlanId: d.activePlanId, history: d.history || [], hiddenBuiltins: d.hiddenBuiltins || [] };
    this.save(); this.load();
  },
  reset() { localStorage.removeItem(KEY); this.load(); this.save(); },
};

export const uid = () => Math.random().toString(36).slice(2, 9);
export { clone };
