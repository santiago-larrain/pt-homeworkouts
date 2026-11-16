// Estado persistente en el dispositivo (localStorage). Sin servidor ni cuentas.
import { DEFAULT_PLANS } from '../data/plans.js';

const KEY = 'ptw.state.v1';   // no cambiar: el esquema se versiona con `state.version`
export const VERSION = 4;     // 2 = perfiles (v1.4) · 3 = tema/apariencia, meta semanal, hápticos (v1.5) · 4 = calorías, cuerpo, hitos (v1.6)

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
  roundRest: 0,         // descanso entre rondas: 0 = el de cada bloque del plan
  duoGovern: 'time',    // planes en pareja: 'time' (manda el tiempo) | 'reps' (mandan las repeticiones)
  model: 'f',           // (obsoleto desde v1.4: el modelo sale del género del perfil) se conserva por compatibilidad
  lastBackup: null,
  repsMode: 'manual',   // 'manual' (botón Hecho) | 'auto' (temporizado)
  secsPerRep: 3,
  repSecondsEstimate: 30,  // estimación (solo para calcular la duración total)
  wakeLock: true,
  animate: true,        // alterna posición 1 ↔ 2 como animación
  animSpeed: 1.6,       // segundos por posición
  theme: 'auto',        // 'auto' (rosa si el perfil activo es mujer, estándar si es hombre) | 'rosa' | 'estandar'
  appearance: 'auto',   // modo claro/oscuro: 'auto' | 'light' | 'dark'
  weeklyGoal: 3,        // sesiones por semana
  haptics: true,        // vibración breve (Android; iOS Safari la ignora)
  kcalCorrected: true,  // calorías: corrige el MET con el metabolismo en reposo (Mifflin); apagado = fórmula estándar
  kcalLoad: true,       // calorías: pequeño ajuste por la carga de mancuernas/kettlebell del perfil
  reminders: { on: false, days: [1, 3, 5], time: '19:00' }, // fase 6 (sin uso todavía)
};

const clone = o => JSON.parse(JSON.stringify(o));
export const newProfile = (id, name, gender) => ({ id, name, gender, weights: [], loads: { dumbbellKg: 0, kettlebellKg: 0, band: 'media', miniBand: 'media' } });
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// v1 → v2: perfiles. Perfil 1 sale de settings.model/name; perfil 2 = pareja (del primer plan en pareja, si existe).
function migrate(s) {
  if (!Array.isArray(s.profiles) || !s.profiles.length) {
    const g1 = s.settings.model === 'm' ? 'm' : 'f', nm = (s.settings.name || '').trim();
    const duo = s.plans.find(p => p.mode === 'duo' && Array.isArray(p.people) && p.people[1] && p.people[1].name !== undefined);
    const q = duo ? duo.people[1] : null;
    s.profiles = [newProfile('p1', nm && nm !== 'Anita' ? nm : (g1 === 'f' ? 'Anita' : 'Perfil 1'), g1),
      newProfile('p2', (q && q.name && String(q.name).trim()) || 'Pareja', q && q.model === 'f' ? 'f' : 'm')];
  }
  s.profiles.forEach(pr => { pr.gender = pr.gender === 'm' ? 'm' : 'f'; pr.weights = pr.weights || []; pr.loads = { ...newProfile('', '', 'f').loads, ...(pr.loads || {}) }; });
  if (!s.profiles.some(p => p.id === s.activeProfile)) s.activeProfile = s.profiles[0].id;
  const [a, b] = s.profiles;
  s.plans.forEach(p => { if (p.mode === 'duo' && !(p.people && p.people.length === 2 && p.people.every(x => x && x.profile))) p.people = [{ profile: a.id }, { profile: (b || a).id }]; });
}

// v2 → v3: antes `theme` era 'auto'|'light'|'dark' (modo); ahora `theme` es el tema visual y `appearance` el modo.
function migrateSettings(st) {
  if (st.theme === 'light' || st.theme === 'dark') { st.appearance = st.theme; st.theme = 'auto'; }
  if (!['auto', 'rosa', 'estandar'].includes(st.theme)) st.theme = 'auto';
  if (!['auto', 'light', 'dark'].includes(st.appearance)) st.appearance = 'auto';
  st.weeklyGoal = Math.min(7, Math.max(1, Math.round(+st.weeklyGoal) || 3));
  st.haptics = st.haptics !== false;
  st.kcalCorrected = st.kcalCorrected !== false; st.kcalLoad = st.kcalLoad !== false;
  st.reminders = { ...DEFAULT_SETTINGS.reminders, ...(st.reminders || {}) };
}

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
    const settingsOld = (s.version || 1) < VERSION;
    migrateSettings(s.settings);
    s.history = s.history || [];
    s.hiddenBuiltins = s.hiddenBuiltins || [];
    s.plans.forEach(p => { if (!p.mode) p.mode = 'solo'; });
    const migrated = settingsOld || !Array.isArray(s.profiles);
    if (migrated) migrate(s);
    s.version = VERSION;
    // agrega planes nuevos que vengan con la app (sin pisar los editados)
    for (const p of DEFAULT_PLANS) if (!s.plans.some(x => x.id === p.id) && !s.hiddenBuiltins.includes(p.id)) s.plans.push(clone(p));
    if (!s.plans.some(p => p.id === s.activePlanId)) s.activePlanId = s.plans[0] ? s.plans[0].id : null;
    this.state = s;
    if (migrated) this.save();
    return s;
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { console.warn(e); } },
  profile(id) { return this.state.profiles.find(p => p.id === id) || this.state.profiles[0]; },
  get active() { return this.profile(this.state.activeProfile); },
  plan(id) { return this.state.plans.find(p => p.id === id); },
  restoreBuiltin(id) {
    const orig = DEFAULT_PLANS.find(p => p.id === id); if (!orig) return;
    const i = this.state.plans.findIndex(p => p.id === id);
    if (i >= 0) this.state.plans[i] = clone(orig); else this.state.plans.push(clone(orig));
    this.save();
  },
  isBuiltin(id) { return DEFAULT_PLANS.some(p => p.id === id); },
  exportJSON() { return JSON.stringify({ app: 'pt-homeworkouts', exportedAt: new Date().toISOString(), ...this.state }, null, 2); },
  importJSON(txt) {
    const d = JSON.parse(txt);
    if (!Array.isArray(d.plans)) throw new Error('Archivo no válido');
    this.state = { version: d.version === VERSION ? VERSION : 1, settings: { ...DEFAULT_SETTINGS, ...d.settings }, plans: d.plans, activePlanId: d.activePlanId, history: d.history || [], hiddenBuiltins: d.hiddenBuiltins || [], profiles: d.profiles, activeProfile: d.activeProfile };
    this.save(); this.load();
  },
  // Pide al navegador no borrar los datos (Safari puede borrar datos de sitios no usados en 7 días;
  // la app instalada en la pantalla de inicio no tiene ese límite).
  async persist() {
    try { if (navigator.storage && navigator.storage.persist) { const already = await navigator.storage.persisted(); return already || await navigator.storage.persist(); } } catch (e) { }
    return false;
  },
  reset() { localStorage.removeItem(KEY); this.load(); this.save(); },
};

export const uid = () => Math.random().toString(36).slice(2, 9);
export { clone };
