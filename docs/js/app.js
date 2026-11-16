import { MOVES, MOVE_BY_ID, CATEGORIES, EQUIPMENT } from '../data/catalog.js';
import { DEFAULT_PLANS } from '../data/plans.js';
import { store, uid, clone, todayISO } from './store.js';
import { buildSteps, estimateSecs, sectionEstimate, doseOf, doseText, fmtSecs, clock, isDuo, unitText } from './engine.js';
import { configure as configureAudio, unlock as unlockAudio, sfx, say } from './audio.js';
import { I } from './icons.js';
import { Animator, stillURL } from './rig/anim.js';
import { FrameAnimator, hasFrames, frameURL, posFrame } from './frames.js';
import { sessionKcal, kcalText } from './calories.js';
import { entriesOf, localISO, streakWeeks as streakWeeksOf, weekCounts, newMilestones, MILESTONES, MILESTONE_BY_ID } from './progress.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = () => store.state;
const set = () => S().settings;
const APP_VERSION = '1.6';
const BADGE = ['A', '1', '2', '3', '4', '5', '6', '7', '8'];
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

store.load();
configureAudio(set());

// ───────────────────────── navegación
const TABS = [
  { id: 'train', name: 'Entrenar', icon: I.flame, root: 'home' },
  { id: 'moves', name: 'Movimientos', icon: I.grid, root: 'catalog' },
  { id: 'history', name: 'Historial', icon: I.calendar, root: 'history' },
  { id: 'settings', name: 'Ajustes', icon: I.gear, root: 'settings' },
];
const nav = { tab: 'train', stacks: Object.fromEntries(TABS.map(t => [t.id, [{ v: t.root }]])) };
const ui = { histTab: 'act', histPid: null, bodyDraft: null, q: '', f: { g: [], e: [], l: [] }, editing: {}, cal: null, moveShow: {}, dismissedInstall: sessionStorage.getItem('ptw.noinstall') === '1', persisted: null };
let anim = null;

const top = () => nav.stacks[nav.tab][nav.stacks[nav.tab].length - 1];
function push(v, params = {}) { nav.stacks[nav.tab].push({ v, ...params }); render('push'); }
function back() { if (nav.stacks[nav.tab].length > 1) { nav.stacks[nav.tab].pop(); render('pop'); } }
function switchTab(id) {
  if (nav.tab === id) { nav.stacks[id] = nav.stacks[id].slice(0, 1); render(); return; }
  nav.tab = id; render();
}

// ───────────────────────── render
function render(mode) {
  const t = top();
  const view = VIEWS[t.v](t);
  const scr = $('#screens');
  const prevScroll = mode ? 0 : (scr.firstElementChild ? scr.firstElementChild.scrollTop : 0);
  const depth = nav.stacks[nav.tab].length;
  const left = depth > 1 ? `<button class="navbtn back" data-a="back">${I.chevL}<span>${esc(view.backLabel || 'Atrás')}</span></button>` : '';
  scr.innerHTML = `<section class="screen ${mode ? 'anim-' + mode : ''}" data-view="${t.v}">
    <div class="navbar ${view.large ? 'is-large' : ''}"><div class="nb-left">${left}</div><div class="nb-title">${esc(view.title || '')}</div><div class="nb-right">${view.right || ''}</div></div>
    <div class="content">${view.large ? `<header class="large-title">${view.kicker ? `<p class="kicker">${view.kicker}</p>` : ''}<h1>${esc(view.title)}</h1></header>` : ''}${view.html}</div></section>`;
  const el = scr.firstElementChild;
  el.scrollTop = prevScroll;
  el.addEventListener('scroll', () => el.classList.toggle('scrolled', el.scrollTop > (view.large ? 44 : 4)), { passive: true });
  el.classList.toggle('scrolled', el.scrollTop > (view.large ? 44 : 4));
  $('#tabbar').innerHTML = TABS.map(tb => `<button class="tab ${tb.id === nav.tab ? 'on' : ''}" data-a="tab" data-id="${tb.id}" aria-label="${tb.name}">${tb.icon}<span>${tb.name}</span></button>`).join('');
  if (view.after) view.after(el);
}

// ───────────────────────── helpers de UI
const group = (rows, { header = '', footer = '', cls = '' } = {}) => `${header ? `<h3 class="gh">${header}</h3>` : ''}<div class="group ${cls}">${rows.join('')}</div>${footer ? `<p class="gf">${footer}</p>` : ''}`;
const row = ({ icon = '', title, sub = '', right = '', chev = false, a = '', data = '', cls = '' }) =>
  `<${a ? 'button' : 'div'} class="row ${cls}" ${a ? `data-a="${a}"` : ''} ${data}>${icon ? `<span class="ri">${icon}</span>` : ''}<span class="rt"><span class="rtt">${title}</span>${sub ? `<span class="rts">${sub}</span>` : ''}</span><span class="rr">${right}</span>${chev ? `<span class="chev">${I.chevR}</span>` : ''}</${a ? 'button' : 'div'}>`;
const toggle = (k, on, extra = '') => `<label class="switch"><input type="checkbox" data-in="${k}" ${extra} ${on ? 'checked' : ''}><span></span></label>`;
const stepper = (a, data, val) => `<span class="stepper"><button data-a="${a}" ${data} data-d="-1" aria-label="menos">−</button><b>${val}</b><button data-a="${a}" ${data} data-d="1" aria-label="más">+</button></span>`;
const seg = (a, data, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button data-a="${a}" ${data} data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const fmtMin = secs => `${Math.max(1, Math.round(secs / 60))} min`;
const planMins = p => fmtMin(estimateSecs(buildSteps(p, set()), set()));
// ── calorías: opciones del motor según Ajustes, y estimación de un plan para un perfil (con los tiempos planeados)
const kcalOpts = () => ({ corrected: set().kcalCorrected !== false, load: set().kcalLoad !== false });
const moveLookup = id => MOVE_BY_ID[id];
function stepItems(steps, who = 0) {
  const rep = set().repSecondsEstimate;
  return steps.filter(s => s.type !== 'done').map(s => ({ secs: s.secs != null ? s.secs : (s.type === 'work' ? rep : 0), kind: s.type === 'work' ? 'work' : 'rest', moveId: s.type === 'work' ? (s.duo ? (who ? s.b.move.id : s.a.move.id) : s.move.id) : null }));
}
// kcal estimadas de un plan para el perfil activo (en planes en pareja, para su lugar en el plan; si no participa, la persona 1)
function planKcal(p, onlySection = null) {
  let who = 0, pr = store.active;
  if (isDuo(p)) { const ids = people(p).map(x => x.profile), k = ids.indexOf(pr.id); who = k < 0 ? 0 : k; pr = store.profile(ids[who]); }
  return sessionKcal(pr, stepItems(buildSteps(p, set(), onlySection), who), moveLookup, kcalOpts());
}
const kcalChip = r => `<span class="mchip" title="Estimación">${I.flame}${kcalText(r.kcal) || '—'}${r.estimated ? ' · estimado' : ''}</span>`;
const today = () => new Date();
const EQ = { silla: 'Silla', kettlebell: 'Kettlebell', ...EQUIPMENT };
const equipOf = p => [...new Set(p.sections.flatMap(sec => sec.items.flatMap(it => [it.move, it.b && it.b.move]))).values()].filter(Boolean).flatMap(id => (MOVE_BY_ID[id] || { equipment: [] }).equipment).filter(e => e !== 'ninguno').filter((e, i, a) => a.indexOf(e) === i).map(e => EQ[e] || e);
const firstPid = () => S().profiles[0].id;
const profEntries = pid => entriesOf(S().history, pid, firstPid());
const weekSessions = (pid = S().activeProfile) => { const ws = weekStart(today()); return profEntries(pid).filter(h => new Date(h.date) >= ws); };
const histPid = () => (S().profiles.some(p => p.id === ui.histPid) ? ui.histPid : S().activeProfile);
const fmt1 = n => (+n).toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dShort = (iso, y = false) => new Date(iso + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', ...(y ? { year: 'numeric' } : {}) });
const dayKey = d => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
const weekStart = d => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - wd); return x; };

// ── animación: fotogramas del mismo personaje (js/frames.js, data/anim.js); el modelo vectorial de js/rig/
//    queda solo como respaldo para movimientos sin fotogramas.
const modelOf = model => model || store.active.gender || 'f';
const keyIdx = m => m.positions.map((p, i) => p.mid ? -1 : i).filter(i => i >= 0);
const imgOf = (m, i, model) => hasFrames(m.id) ? frameURL(m.id, modelOf(model), posFrame(m.id, i, m.positions.length)) : stillURL(m.id, modelOf(model), i);
const thumb = (m, n = 1, model) => `<span class="thumb"><img src="${imgOf(m, keyIdx(m)[n - 1] ?? 0, model)}" alt="" loading="lazy"></span>`;
const breathHTML = ps => `${ps.breath === 'in' ? I.inhale : I.exhale}<b>${ps.breath === 'in' ? 'INHALA' : 'EXHALA'}</b><span>${esc(ps.verb)}</span>`;
// caja del modelo animado + borde que indica la respiración
function mediaHTML(m, cur, { id = '', cls = 'p-media', extra = '' } = {}) {
  const ps = m.positions[cur];
  return `<div class="${cls} rigbox" ${id ? `id="${id}"` : ''}><div class="glow ${ps.breath}"></div><div class="p-breath ${ps.breath}">${breathHTML(ps)}</div>${extra}</div>`;
}
function setBreath(box, m, i) {
  if (!box) return;
  const ps = m.positions[i]; if (!ps) return;
  const g = box.querySelector('.glow'); if (g) g.className = `glow ${ps.breath}`;
  const b = box.querySelector('.p-breath'); if (b) { b.className = `p-breath ${ps.breath}`; b.innerHTML = breathHTML(ps); }
}
function mountRig(box, m, { model, fixed = null, play = true, isPaused, mirror = false } = {}) {
  if (!box) return () => {};
  const opts = { fixed, play: play && fixed == null, speed: set().animSpeed, isPaused, onPos: i => setBreath(box, m, i) };
  const an = hasFrames(m.id) ? new FrameAnimator(box, m.id, modelOf(model), { ...opts, nPos: m.positions.length }) : new Animator(box, m.id, modelOf(model), opts);
  if (mirror && box.firstElementChild) box.firstElementChild.classList.add('flip'); // solo la imagen, nunca el texto ni la respiración
  return () => an.destroy();
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 1800);
}
function undoToast(msg, undo) {
  const t = $('#toast'); t.innerHTML = `${esc(msg)} <button data-a="undo">Deshacer</button>`; t.classList.add('on');
  A.undo = () => { t.classList.remove('on'); undo(); };
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 4000);
}

// ───────────────────────── sheets
function openSheet(html, { cls = '', onClose = null } = {}) {
  const layer = $('#sheet-layer');
  layer.innerHTML = `<div class="scrim" data-a="closeSheet"></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="grabber"></div>${html}</div>`;
  layer.classList.add('on');
  layer._onClose = onClose;
  requestAnimationFrame(() => layer.classList.add('show'));
}
function refreshSheet(html) { const sh = $('#sheet-layer .sheet'); if (sh) { const st = sh.scrollTop; sh.innerHTML = `<div class="grabber"></div>${html}`; sh.scrollTop = st; } }
function closeSheet() {
  const layer = $('#sheet-layer');
  layer.classList.remove('show');
  setTimeout(() => { if (!layer.classList.contains('show')) { layer.classList.remove('on'); layer.innerHTML = ''; } }, 260);
  const cb = layer._onClose; layer._onClose = null; if (cb) cb();
}
const sheetOpen = cls => !!$(`#sheet-layer.show .sheet.${cls}`);
function actionSheet(title, actions) {
  openSheet(`<div class="actions">${title ? `<p class="as-title">${esc(title)}</p>` : ''}${actions.map((a, i) => `<button class="as-btn ${a.destructive ? 'destructive' : ''}" data-a="asPick" data-i="${i}">${esc(a.label)}</button>`).join('')}</div><button class="as-btn cancel" data-a="closeSheet">Cancelar</button>`, { cls: 'action' });
  actionSheet.actions = actions;
}
function confirmSheet(title, label, fn) { actionSheet(title, [{ label, destructive: true, fn }]); }

// ───────────────────────── participantes (planes en pareja)
// participantes de un plan en pareja: cada persona referencia un perfil ({profile:id}); el modelo sale de su género
const people = p => {
  const pr = S().profiles, ids = (p.people && p.people.length === 2 && p.people.every(x => x.profile)) ? p.people.map(x => x.profile) : [S().activeProfile, (pr.find(x => x.id !== S().activeProfile) || pr[0]).id];
  return ids.map(id => { const x = store.profile(id); return { profile: x.id, name: x.name, model: x.gender }; });
};
const defaultPeople = () => { const pr = S().profiles, a = store.active; return [{ profile: a.id }, { profile: (pr.find(x => x.id !== a.id) || a).id }]; };
const GENDER = { f: 'Mujer', m: 'Hombre' }, LEVEL = [['suave', 'Suave'], ['media', 'Media'], ['fuerte', 'Fuerte']];
const profSub = pr => [GENDER[pr.gender], pr.birthYear && `${new Date().getFullYear() - pr.birthYear} años`, pr.heightCm && `${pr.heightCm} cm`, pr.weights.length && `${pr.weights[pr.weights.length - 1].kg} kg`].filter(Boolean).join(' · ');

// ───────────────────────── VISTAS
const VIEWS = {
  home() {
    const s = S(), p = store.plan(s.activePlanId) || s.plans[0];
    const now = today(), goal = goalOf(s.activeProfile);
    const week = weekSessions(), trainedDays = new Set(week.map(h => (new Date(h.date).getDay() + 6) % 7));
    const dateStr = now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    let html = '';
    if (!standalone() && !ui.dismissedInstall) html += `<div class="card install">${I.share}<div><b>Instala la app</b><p>Así tus datos no se borran. Toca <b>Compartir → Agregar a inicio</b>.</p></div><button class="iconbtn" data-a="dismissInstall" aria-label="Cerrar">${I.x}</button></div>`;
    const daysSinceBackup = s.settings.lastBackup ? (Date.now() - new Date(s.settings.lastBackup)) / 864e5 : Infinity;
    if (standalone() && s.history.length >= 3 && daysSinceBackup > 30) html += `<div class="card install">${I.shield}<div><b>Guarda un respaldo</b><p>Tus datos viven solo en este teléfono. Exporta un respaldo por si cambias o pierdes el teléfono.</p><button class="btn tinted small" data-a="exportData">Exportar respaldo</button></div></div>`;
    if (p) {
      const nSec = p.sections.filter(x => x.items.length).length, eq = equipOf(p), shown = eq.slice(0, 3);
      const thumbs = [...new Set(p.sections.flatMap(x => x.items.map(it => it.move)))].map(id => MOVE_BY_ID[id]).filter(Boolean).slice(0, 4);
      const pp0 = isDuo(p) ? people(p) : null;
      html += `<div class="card today"><div class="today-top"><p class="eyebrow">${s.history.length ? 'Tu entrenamiento' : 'Para empezar'}${isDuo(p) ? ' · en pareja' : ''}</p><div class="thumbstack">${thumbs.map(m => thumb(m, 1, pp0 ? pp0[0].model : undefined)).join('')}</div></div>
        <h2>${esc(p.name)}</h2><p class="sub">${esc(isDuo(p) ? people(p).map(x => x.name).join(' + ') : (p.subtitle || ''))}</p>
        <div class="mchips"><span class="mchip">${I.clock}${planMins(p)}</span>${kcalChip(planKcal(p))}<span class="mchip">${I.grid}${nSec} ${nSec === 1 ? 'bloque' : 'bloques'}</span>${shown.map(e => `<span class="mchip eq">${esc(e)}</span>`).join('')}${eq.length > 3 ? `<span class="mchip eq">+${eq.length - 3}</span>` : ''}${eq.length ? '' : '<span class="mchip eq">Sin implementos</span>'}</div>
        <button class="btn primary cta big" data-a="start" data-id="${p.id}">${I.play}Comenzar</button>
        <button class="btn plain" data-a="openPlan" data-id="${p.id}">Ver plan</button></div>`;
    }
    const left = Math.max(0, goal - week.length);
    html += `<div class="card week"><div class="wk-top"><p class="wk-num"><b>${week.length}</b> de ${goal} esta semana</p><span class="wk-msg">${week.length >= goal ? '¡Meta cumplida!' : week.length ? `Te ${left === 1 ? 'falta 1' : `faltan ${left}`}` : 'Cuando quieras'}</span></div>
      <div class="wk-bar" role="img" aria-label="${week.length} de ${goal} sesiones esta semana"><i style="width:${Math.min(100, Math.round(week.length / goal * 100))}%"></i></div>
      <div class="days">${DAYS.map((d, i) => `<span class="day ${trainedDays.has(i) ? 'on' : ''} ${i === (now.getDay() + 6) % 7 ? 'today-d' : ''}"><i>${trainedDays.has(i) ? I.check : ''}</i>${d}</span>`).join('')}</div>${streakLine(s.activeProfile)}</div>`;
    const others = s.plans.filter(pl => !p || pl.id !== p.id);
    html += group([...others.map(pl => row({ icon: `<span class="ri-dot">${I.play}</span>`, title: esc(pl.name) + (isDuo(pl) ? ' <span class="pill">Dúo</span>' : ''), sub: `${pl.sections.length} ${pl.sections.length === 1 ? 'bloque' : 'bloques'} · ${planMins(pl)}`, chev: true, a: 'openPlan', data: `data-id="${pl.id}"` })),
      row({ icon: `<span class="ri-plus">${I.plus}</span>`, title: '<span class="accent">Crear plan nuevo</span>', a: 'newPlan' })], { header: others.length ? 'Otros planes' : 'Tus planes' });
    const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
    return { title: `Hola, ${store.active.name || ''}`.trim(), kicker: cap(dateStr), large: true, html };
  },

  plan(t) {
    const p = store.plan(t.id);
    if (!p) return { title: 'Plan', html: '<p class="empty">Este plan ya no existe.</p>' };
    const editing = !!ui.editing[p.id], duo = isDuo(p), pp = people(p);
    const right = `<button class="navbtn strong" data-a="toggleEdit" data-id="${p.id}">${editing ? 'Listo' : 'Editar'}</button>`;
    let html;
    if (editing) {
      html = `<div class="plan-head edit-head"><input class="t" data-in="planName" data-p="${p.id}" value="${esc(p.name)}" placeholder="Nombre del plan" maxlength="40" aria-label="Nombre del plan" autocomplete="off"><input class="s" data-in="planSub" data-p="${p.id}" value="${esc(p.subtitle || '')}" placeholder="Descripción (opcional)" maxlength="60" aria-label="Descripción" autocomplete="off"></div>`;
    } else {
      html = `<div class="plan-head"><h1>${esc(p.name)}</h1>${duo ? `<p class="muted">${I.figure} ${esc(pp[0].name)} + ${esc(pp[1].name)}</p>` : (p.subtitle ? `<p class="muted">${esc(p.subtitle)}</p>` : '')}
      <div class="meta"><span>${I.clock}${planMins(p)}</span><button class="kchip" data-a="kcalInfo" aria-label="Cómo se estiman las calorías">${I.flame}${kcalText(planKcal(p).kcal) || '—'}${planKcal(p).estimated ? ' · estimado' : ''}</button>${p.frequency ? `<span>${I.calendar}${esc(p.frequency)}</span>` : ''}${duo ? '<span class="pill">En pareja</span>' : ''}</div>
      <div class="btnrow"><button class="btn primary cta" data-a="start" data-id="${p.id}">${I.play}Comenzar</button><button class="btn tinted icon" data-a="planMenu" data-id="${p.id}" aria-label="Más opciones" style="min-height:60px;border-radius:20px">${I.more}</button></div>
      ${p.goal ? `<p class="goal">${esc(p.goal)}</p>` : ''}</div>`;
    }
    p.sections.forEach((sec, si) => {
      const head = `<span class="gh-row"><span class="badge sm">${BADGE[si] || si + 1}</span><span class="gh-name">${esc(sec.name)}</span><span class="gh-meta">${secShort(sec)}</span>${editing ? '' : `<button class="mini" data-a="startSection" data-p="${p.id}" data-s="${si}" aria-label="Comenzar solo este bloque">${I.play}</button>`}</span>`;
      const rows = [];
      if (editing) rows.push(row({ icon: `<span class="ri-plus">${I.gear}</span>`, title: 'Bloque, rondas y descanso', sub: esc(secSub(sec)), a: 'editSection', data: `data-p="${p.id}" data-s="${si}"`, chev: true }));
      sec.items.forEach((it, ii) => {
        const m = MOVE_BY_ID[it.move]; if (!m) return;
        const mb = duo && it.b ? MOVE_BY_ID[it.b.move] : null;
        const d = doseOf(it);
        const icon = duo && mb ? `<span class="duo-th">${thumb(m, 1, pp[0].model)}${thumb(mb, 1, pp[1].model)}</span>` : thumb(m);
        const title = duo && mb ? (mb.id === m.id ? esc(m.name) : `${esc(m.name)} <span class="muted">/</span> ${esc(mb.name)}`) : esc(m.name);
        const dtxt = esc(doseText(d)), sub = duo && mb ? `${esc(pp[0].name)}: ${dtxt} · ${esc(pp[1].name)}: ${esc(doseText(doseOf(it.b)))}` : (d.note ? esc(d.note) : '');
        const base = `data-p="${p.id}" data-s="${si}" data-i="${ii}"`;
        if (editing) rows.push(`<div class="row edit withthumb ${duo ? 'duorow' : ''}"><button class="del" data-a="delItem" ${base} aria-label="Quitar">${I.minusCircle}</button>${icon}<button class="rt plain" data-a="editItem" ${base}><span class="rtt">${title}</span><span class="rts accent">${duo && mb ? sub : dtxt}${!duo && d.note ? ' · ' + esc(d.note) : ''}</span></button><span class="reorder"><button data-a="moveItem" ${base} data-d="-1" ${ii === 0 ? 'disabled' : ''} aria-label="Subir">${I.up}</button><button data-a="moveItem" ${base} data-d="1" ${ii === sec.items.length - 1 ? 'disabled' : ''} aria-label="Bajar">${I.down}</button></span></div>`);
        else rows.push(row({ icon, title: `${sec.kind === 'circuit' && BADGE[si] !== 'A' ? `<span class="ord">${BADGE[si]}.${ii + 1}</span>` : ''}${title}`, sub: duo && mb ? sub : sub, right: duo && mb ? '' : `<span class="dose">${dtxt}</span>`, chev: true, a: duo ? 'editItem' : 'openMove', data: duo ? base : `data-id="${m.id}"`, cls: 'withthumb' + (duo ? ' duorow' : '') }));
      });
      if (editing) rows.push(row({ icon: `<span class="ri-plus">${I.plus}</span>`, title: '<span class="accent">Añadir movimiento</span>', a: 'addMoves', data: `data-p="${p.id}" data-s="${si}"` }));
      if (!sec.items.length && !editing) rows.push(row({ title: '<span class="muted">Sin movimientos</span>' }));
      html += group(rows, { header: head, footer: !editing && sec.note ? esc(sec.note) : '' });
    });
    if (editing) html += group([row({ icon: `<span class="ri-plus">${I.plus}</span>`, title: '<span class="accent">Añadir bloque</span>', a: 'addSection', data: `data-p="${p.id}"` })]);
    if (editing) html += `<p class="gf center">Toca un ejercicio para cambiar su dosis. Usa las flechas para ordenar.</p>`;
    return { title: p.name, backLabel: 'Entrenar', right, html };
  },

  catalog() {
    const nF = ui.f.g.length + ui.f.e.length + ui.f.l.length;
    const active = [...ui.f.g.map(v => ['g', v, GROUP_NAME[v] || v]), ...ui.f.e.map(v => ['e', v, EQ[v] || v]), ...ui.f.l.map(v => ['l', v, LEVEL_NAME[v] || v])];
    const html = `<div class="searchbar">${I.search}<input type="search" placeholder="Buscar movimiento o músculo" value="${esc(ui.q)}" data-in="search" autocomplete="off" aria-label="Buscar"></div>
      <div class="chips"><button class="chip filter ${nF ? 'on' : ''}" data-a="openFilters">${I.sliders}Filtros${nF ? `<span class="n">${nF}</span>` : ''}</button>${active.map(([k, v, n]) => `<button class="chip removable" data-a="fRemove" data-k="${k}" data-v="${esc(v)}" aria-label="Quitar filtro ${esc(n)}">${esc(n)}${I.x}</button>`).join('')}</div>
      <div id="catList">${catalogList()}</div>`;
    return { title: 'Movimientos', large: true, right: `<button class="navbtn" data-a="muscleMap">Músculos</button>`, html };
  },

  move(t) {
    const m = MOVE_BY_ID[t.id];
    const keys = keyIdx(m);
    const cur = ui.moveShow[m.id] ?? 0;
    const inPlans = [];
    S().plans.forEach(p => p.sections.forEach(sec => sec.items.forEach(it => { if (it.move === m.id || (it.b && it.b.move === m.id)) inPlans.push(`${p.name} · ${sec.name}`); })));
    if (ui.moveAuto !== m.id) { ui.moveAuto = m.id; stopAnim(); anim = { id: m.id }; } // al abrir, se anima solo
    const playing = anim && anim.id === m.id;
    let html = mediaHTML(m, cur, { id: 'mv', cls: 'viewer' });
    html += `<div class="viewer-ctl">${seg('showPos', `data-id="${m.id}"`, keys.map((k, n) => [k, `${n + 1} · ${esc(m.positions[k].label)}`]), playing ? -1 : cur)}<button class="iconbtn tinted" data-a="animMove" data-id="${m.id}" aria-label="${playing ? 'Detener animación' : 'Ver animación'}">${playing ? I.pause : I.play}</button></div>
      <h1 class="detail-title">${esc(m.name)}</h1>${m.alias ? `<p class="muted center">${esc(m.alias)}</p>` : ''}
      <div class="keycue">${I.check}<span>${esc(m.cue)}</span></div>`;
    html += group([row({ title: 'En foco', right: `<span class="tags">${m.focus.map(f => `<span class="tag"><u></u>${esc(f)}</span>`).join('')}</span>`, cls: 'tall' }),
      ...(m.support.length ? [row({ title: 'Apoyo', right: `<span class="tags">${m.support.map(f => `<span class="tag"><u class="s"></u>${esc(f)}</span>`).join('')}</span>`, cls: 'tall' })] : []),
      row({ title: 'Implementos', right: `<span class="muted">${m.equipment.map(e => EQUIPMENT[e]).join(', ')}${m.load ? ` · ${esc(m.load)}` : ''}</span>` }),
      row({ title: 'Dosis sugerida', right: `<span class="muted">${esc(doseText(m.dose))}</span>` })], { header: 'Detalles' });
    html += group(m.tips.map((tp, i) => `<div class="row tip"><span class="num">${i + 1}</span><span class="rt"><span class="rtt">${esc(tp)}</span></span></div>`), { header: 'Técnica' });
    html += group(keys.map((k, n) => { const ps = m.positions[k]; return row({ icon: `<span class="badge sm">${n + 1}</span>`, title: esc(ps.label), right: `<span class="breath-txt ${ps.breath}">${ps.breath === 'in' ? 'Inhala' : 'Exhala'} · ${esc(ps.verb)}</span>` }); }), { header: 'Respiración', footer: 'Indica cómo respirar para llegar a cada posición. El borde de la imagen es azul, con un brillo que se expande, al inhalar (flecha ↑), y rojo, con una línea doble fina y un brillo suave, al exhalar (flecha ↓).' });
    html += group([...inPlans.map(x => row({ title: esc(x) })), row({ icon: `<span class="ri-plus">${I.plus}</span>`, title: '<span class="accent">Añadir a un plan</span>', a: 'addToPlan', data: `data-id="${m.id}"` })], { header: 'En tus planes' });
    return { title: m.name, backLabel: nav.tab === 'moves' ? 'Movimientos' : 'Atrás', html, after: () => startAnim(m.id, playing ? null : cur) };
  },

  history() {
    const pid = histPid(), pr = store.profile(pid), body = ui.histTab === 'body';
    const many = S().profiles.length > 1;
    let html = `<div class="histctl">${seg('histTab', '', [['act', 'Actividad'], ['body', 'Cuerpo']], ui.histTab)}${many ? seg('histProf', '', S().profiles.map(x => [x.id, esc(x.name)]), pid) : ''}</div>`;
    html += body ? bodyHTML(pr) : activityHTML(pr);
    return { title: 'Historial', large: true, html, right: body ? `<button class="navbtn strong" data-a="bodyAdd" data-id="${pid}">Registrar</button>` : '' };
  },

  settings() {
    const st = set();
    const g = n => `${n} ${n === 1 ? 'sesión' : 'sesiones'}`;
    let html = '';
    html += group(S().profiles.map(pr => row({ icon: `<span class="avatar ${pr.gender}">${esc((pr.name || '?').trim().charAt(0).toUpperCase())}</span>`, title: esc(pr.name), sub: esc(profSub(pr)), right: pr.id === S().activeProfile ? '<span class="pill">Activo</span>' : '', chev: true, a: 'editProfile', data: `data-id="${pr.id}"` })),
      { header: 'Perfiles', footer: 'El perfil activo es quien entrena en los planes individuales. Su género define los dibujos y el tema automático.' });
    html += group([
      row({ title: 'Meta semanal', sub: `Sesiones por semana${S().profiles.length > 1 ? ' · ' + esc(store.active.name) : ''}`, right: stepper('goalStep', '', g(goalOf(S().activeProfile))) }),
      row({ title: 'Preparación', sub: 'Cuenta regresiva antes de empezar', right: stepper('setStep', 'data-k="getReady" data-min="0" data-max="30" data-st="1"', `${st.getReady} s`) }),
      row({ title: 'Descanso entre ejercicios', right: stepper('setStep', 'data-k="transition" data-min="0" data-max="60" data-st="5"', `${st.transition} s`) }),
      row({ title: 'Descanso entre bloques', right: stepper('setStep', 'data-k="sectionRest" data-min="0" data-max="180" data-st="15"', `${st.sectionRest} s`) }),
      segRow('Ritmo en pareja', st.duoGovern === 'time' ? 'Las repeticiones se pasan a segundos y se usa el ejercicio más largo.' : 'Si alguien hace repeticiones, el reloj espera a que ambas toquen «Hecho».', 'duoGovern', [['time', 'Manda el tiempo'], ['reps', 'Mandan las reps']], st.duoGovern),
      row({ title: 'Más opciones', sub: 'Cambio de lado, repeticiones, pantalla', a: 'openMore', chev: true }),
    ], { header: 'Entrenamiento', footer: 'Los cambios se aplican de inmediato, también durante un entrenamiento (botón ⚙︎ del reproductor).' });
    html += soundGroup(st);
    html += group([
      segRow('Tema', 'Auto usa rosa para perfiles de mujer y estándar para hombres.', 'theme', [['auto', 'Auto'], ['rosa', 'Rosa'], ['estandar', 'Estándar']], st.theme),
      segRow('Modo', null, 'appearance', [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']], st.appearance),
      row({ title: 'Animar movimientos', sub: 'Alterna las posiciones durante el ejercicio', right: toggle('set:animate', st.animate) }),
      row({ title: 'Velocidad', sub: 'Segundos por posición en la animación', right: stepper('setStep', 'data-k="animSpeed" data-min="0.8" data-max="4" data-st="0.4"', `${st.animSpeed.toFixed(1)} s`) }),
    ], { header: 'Apariencia' });
    html += `<span id="kcalGroup"></span>` + group([
      row({ title: 'Ajustar por mi metabolismo', sub: 'Cálculo más conservador con tu peso, estatura y edad. Apagado usa la fórmula estándar.', right: toggle('set:kcalCorrected', st.kcalCorrected) }),
      row({ title: 'Ajustar por la carga', sub: 'Suma un poco si usas mancuernas o kettlebell (según tus cargas en el perfil).', right: toggle('set:kcalLoad', st.kcalLoad) }),
      row({ title: 'Cómo se calcula', a: 'kcalInfo', chev: true }),
    ], { header: 'Calorías', footer: 'Siempre son una estimación, nunca una medida exacta.' });
    html += group([
      row({ title: 'Exportar respaldo', sub: st.lastBackup ? `Último: ${new Date(st.lastBackup).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Aún no has exportado uno', a: 'exportData', chev: true }),
      row({ title: 'Importar respaldo', a: 'importData', chev: true }),
      row({ title: 'Almacenamiento', sub: 'Dónde se guardan tus datos', a: 'openStorage', chev: true }),
      row({ title: 'Restaurar planes originales', a: 'restorePlans', chev: true }),
      row({ title: '<span class="danger">Borrar todos los datos</span>', a: 'resetAll' }),
    ], { header: 'Datos', footer: 'Todo se guarda solo en este teléfono, sin cuentas. Exporta un respaldo de vez en cuando.' });
    html += group([row({ title: 'Cómo instalar en el iPhone', a: 'installHelp', chev: true }), row({ title: 'Versión', right: `<span class="muted">${APP_VERSION}</span>` })], { header: 'Acerca de' });
    return { title: 'Ajustes', large: true, html };
  },

  settingsMore() {
    const st = set();
    let html = group([
      row({ title: 'Cambio de lado', right: stepper('setStep', 'data-k="switchSides" data-min="0" data-max="20" data-st="1"', `${st.switchSides} s`) }),
      row({ title: 'Cambio de posición', sub: 'Entre fases de un mismo ejercicio', right: stepper('setStep', 'data-k="phaseGap" data-min="0" data-max="15" data-st="1"', `${st.phaseGap} s`) }),
      row({ title: 'Descanso entre rondas', sub: st.roundRest ? 'Igual para todos los bloques' : 'El de cada bloque del plan', right: stepper('setStep', 'data-k="roundRest" data-min="0" data-max="180" data-st="15"', st.roundRest ? `${st.roundRest} s` : 'Plan') }),
    ], { header: 'Tiempos' });
    html += group([
      segRow('Ejercicios por repeticiones', st.repsMode === 'manual' ? 'Haces tus repeticiones a tu ritmo y tocas «Hecho».' : 'El reloj avanza solo (repeticiones máximas × segundos).', 'repsMode', [['manual', 'Manual'], ['auto', 'Con tiempo']], st.repsMode),
      row({ title: 'Segundos por repetición', sub: 'Para «Con tiempo» y para planes en pareja', right: stepper('setStep', 'data-k="secsPerRep" data-min="1" data-max="8" data-st="1"', `${st.secsPerRep} s`) }),
    ], { header: 'Repeticiones' });
    html += group([
      row({ title: 'Mantener pantalla encendida', sub: 'Durante el entrenamiento', right: toggle('set:wakeLock', st.wakeLock) }),
      row({ title: 'Sonar en modo silencio', sub: 'Apagado: los sonidos se mezclan con tu música y respetan el silencio', right: toggle('set:ignoreSilent', st.ignoreSilent) }),
    ], { header: 'Pantalla y sonido' });
    return { title: 'Más opciones', backLabel: 'Ajustes', html };
  },

  settingsStorage() {
    const st = set(), persisted = ui.persisted;
    const html = group([
      row({ title: 'Dónde se guardan', right: `<span class="muted">${standalone() ? 'App instalada' : 'Navegador'}</span>` }),
      row({ title: 'Protección contra borrado', right: `<span class="${persisted ? 'ok' : 'muted'}">${persisted == null ? '…' : persisted ? 'Activa' : (standalone() ? 'Instalada (sin límite)' : 'No')}</span>` }),
      row({ title: 'Último respaldo', right: `<span class="muted">${st.lastBackup ? new Date(st.lastBackup).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Nunca'}</span>` }),
    ], { footer: 'Todo se guarda solo en este teléfono, sin cuentas, y no caduca mientras uses la app instalada en la pantalla de inicio. En Safari (sin instalar), el iPhone puede borrar los datos tras 7 días sin abrirla. Safari y la app instalada no comparten datos.' });
    return { title: 'Almacenamiento', backLabel: 'Ajustes', html };
  },
};

// fila con título (y ayuda) y un control segmentado a todo el ancho debajo
const segRow = (title, sub, k, opts, cur) => `<div class="row stack"><span class="rt"><span class="rtt">${title}</span>${sub ? `<span class="rts">${sub}</span>` : ''}</span>${seg('setSeg', `data-k="${k}"`, opts, cur)}</div>`;

function soundGroup(st) {
  return group([
    row({ title: 'Sonidos', right: toggle('set:sound', st.sound) }),
    row({ title: 'Volumen', right: `<input type="range" min="0.1" max="1" step="0.1" value="${st.volume}" data-in="set:volume" class="slider" aria-label="Volumen">` }),
    row({ title: 'Pitidos finales', sub: 'Últimos segundos de cada ejercicio y descanso', right: stepper('setStep', 'data-k="beepLast" data-min="0" data-max="10" data-st="1"', st.beepLast ? `${st.beepLast} s` : 'No') }),
    row({ title: 'Voz guía', sub: 'Anuncia cada ejercicio en voz alta', right: toggle('set:voice', st.voice) }),
    row({ title: 'Hápticos', sub: 'Vibración breve en los cambios. En iPhone el navegador no la permite.', right: toggle('set:haptics', st.haptics) }),
    row({ title: 'Probar sonido', a: 'testSound', right: I.speaker, cls: 'accent-row' }),
  ], { header: 'Sonido y voz' });
}
function timesGroup(st) {
  return group([
    row({ title: 'Cuenta regresiva inicial', right: stepper('setStep', 'data-k="getReady" data-min="0" data-max="30" data-st="1"', `${st.getReady} s`) }),
    row({ title: 'Pausa entre ejercicios', right: stepper('setStep', 'data-k="transition" data-min="0" data-max="60" data-st="5"', `${st.transition} s`) }),
    row({ title: 'Cambio de lado', right: stepper('setStep', 'data-k="switchSides" data-min="0" data-max="20" data-st="1"', `${st.switchSides} s`) }),
    row({ title: 'Cambio de posición', sub: 'Entre fases de un mismo ejercicio', right: stepper('setStep', 'data-k="phaseGap" data-min="0" data-max="15" data-st="1"', `${st.phaseGap} s`) }),
    row({ title: 'Descanso entre rondas', sub: st.roundRest ? 'Igual para todos los bloques' : 'El de cada bloque del plan', right: stepper('setStep', 'data-k="roundRest" data-min="0" data-max="180" data-st="15"', st.roundRest ? `${st.roundRest} s` : 'Plan') }),
    row({ title: 'Descanso entre bloques', right: stepper('setStep', 'data-k="sectionRest" data-min="0" data-max="180" data-st="15"', `${st.sectionRest} s`) }),
  ], { header: 'Tiempos' });
}

// ── filtros del catálogo: grupo muscular (`group`), implementos (`equipment`) y nivel (`level`); tolera movimientos sin esos campos
const GROUP_ORDER = ['piernas', 'gluteos', 'core', 'pecho', 'espalda', 'hombros', 'brazos', 'cardio', 'movilidad', 'torso', 'elongacion', 'otros'];
const GROUP_NAME = { piernas: 'Piernas', gluteos: 'Glúteos', core: 'Core', pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', brazos: 'Brazos', cardio: 'Cardio', movilidad: 'Movilidad', torso: 'Torso y hombros', elongacion: 'Elongación', otros: 'Otros' };
const CAT_GROUP = Object.fromEntries((CATEGORIES || []).map(c => [c.id, c.id === 'core' ? 'core' : c.id]));
const LEVEL_NAME = { 1: 'Principiante', 2: 'Intermedio', 3: 'Avanzado' };
const EQUIP_ORDER = ['ninguno', 'mat', 'mancuernas', 'kettlebell', 'banda', 'mini-banda', 'aro', 'silla', 'puerta'];
const groupOf = m => m.group || CAT_GROUP[m.category] || 'otros';
const searchText = m => [m.name, m.alias, ...(m.focus || []), ...(m.support || []), GROUP_NAME[groupOf(m)], ...(m.equipment || []).map(e => EQ[e])].join(' ').toLowerCase();
function moveOk(m, q, f, skip) {
  if (q && !searchText(m).includes(q)) return false;
  if (skip !== 'g' && f.g.length && !f.g.includes(groupOf(m))) return false;
  if (skip !== 'e' && f.e.length && !(m.equipment || []).some(e => f.e.includes(e))) return false;
  if (skip !== 'l' && f.l.length && !f.l.includes(String(m.level))) return false;
  return true;
}
const filterMoves = (q, f) => MOVES.filter(m => moveOk(m, (q || '').trim().toLowerCase(), f));
const groupsPresent = () => GROUP_ORDER.filter(g => MOVES.some(m => groupOf(m) === g));
const equipPresent = () => [...new Set([...EQUIP_ORDER, ...MOVES.flatMap(m => m.equipment || [])])].filter(e => MOVES.some(m => (m.equipment || []).includes(e)));
const levelsPresent = () => [1, 2, 3].filter(l => MOVES.some(m => m.level === l));
const mcard = m => `<button class="mcard" data-a="openMove" data-id="${m.id}"><span class="mimg"><img src="${imgOf(m, 0)}" alt="" loading="lazy"></span><span class="mname">${esc(m.name)}</span><span class="mfocus">${esc((m.focus || []).join(' · '))}</span>${m.level ? `<span class="mlevel" role="img" aria-label="Nivel: ${LEVEL_NAME[m.level]}">${[1, 2, 3].map(l => `<i class="${l <= m.level ? 'on' : ''}"></i>`).join('')}</span>` : ''}</button>`;
function catalogList() {
  const q = ui.q.trim().toLowerCase(), list = filterMoves(q, ui.f), nF = ui.f.g.length + ui.f.e.length + ui.f.l.length;
  if (!list.length) return '<p class="empty">Sin resultados.<br><span class="hint">Prueba con menos filtros.</span></p>';
  if (nF || q) return `<div class="grid">${list.map(mcard).join('')}</div><p class="gf center">${list.length} ${list.length === 1 ? 'movimiento' : 'movimientos'}</p>`;
  // sin filtros: la galería se separa por grupo muscular
  return groupsPresent().map(g => { const ms = list.filter(m => groupOf(m) === g); return ms.length ? `<div class="sec-title"><h3>${GROUP_NAME[g]}</h3><span>${ms.length}</span></div><div class="grid">${ms.map(mcard).join('')}</div>` : ''; }).join('');
}
function filtersHTML() {
  const q = ui.q.trim().toLowerCase(), f = ui.f, total = filterMoves(q, f).length;
  const opt = (k, v, label, cur) => {
    const n = MOVES.filter(m => moveOk(m, q, f, k) && (k === 'g' ? groupOf(m) === v : k === 'e' ? (m.equipment || []).includes(v) : String(m.level) === String(v))).length;
    const on = cur.includes(String(v));
    return row({ title: esc(label), right: `<span class="opt-n">${n}</span><span class="checkc sq ${on ? 'on' : ''}">${on ? I.check : ''}</span>`, a: 'fToggle', data: `data-k="${k}" data-v="${esc(v)}"`, cls: 'opt' + (!n && !on ? ' dim' : '') });
  };
  const lv = levelsPresent();
  return `<div class="sheet-head"><button class="navbtn" data-a="fClear" ${f.g.length + f.e.length + f.l.length ? '' : 'disabled'}>Borrar</button><h2>Filtros</h2><button class="navbtn strong" data-a="closeSheet">Ver ${total}</button></div>
    <div class="sheet-body">${group(groupsPresent().map(g => opt('g', g, GROUP_NAME[g], f.g)), { header: 'Grupo muscular' })}
    ${group(equipPresent().map(e => opt('e', e, EQ[e] || e, f.e)), { header: 'Implementos', footer: 'Muestra los movimientos que usan cualquiera de los implementos elegidos.' })}
    ${lv.length ? group(lv.map(l => opt('l', l, LEVEL_NAME[l], f.l)), { header: 'Nivel' }) : ''}</div>`;
}

const secShort = sec => sec.kind === 'circuit' ? `${sec.rounds} ${sec.rounds === 1 ? 'ronda' : 'rondas'} · ${sec.items.length} ej.` : `Secuencia · ${sec.items.length} ej.`;
function secSub(sec) {
  const n = sec.items.length, rest = set().roundRest || sec.rest;
  return sec.kind === 'circuit' ? `Circuito · ${sec.rounds} rondas · ${n} ej.${rest ? ` · descanso ${rest} s` : ''}` : `Secuencia · ${n} ejercicios`;
}

function activityHTML(pr) {
  const h = [...profEntries(pr.id)].sort((a, b) => new Date(b.date) - new Date(a.date));
  const now = today();
  const month = h.filter(x => { const d = new Date(x.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const mins = Math.round(h.reduce((a, x) => a + (x.secs || 0), 0) / 60);
  if (!ui.cal) ui.cal = { y: now.getFullYear(), m: now.getMonth() };
  let html = `<div class="stats"><div><b>${h.length}</b><span>Sesiones</span></div><div><b>${month.length}</b><span>Este mes</span></div><div><b>${mins}</b><span>Minutos</span></div><div><b>${streakWeeks(pr.id)}</b><span>Semanas seguidas</span></div></div>`;
  html += calendarHTML(h);
  html += achievementsHTML(pr);
  if (!h.length) return html + `<div class="emptystate"><img src="img/cover.webp" alt=""><p><b>Aún no hay sesiones</b></p><p class="muted">Cuando termines un entrenamiento aparecerá aquí.</p></div>`;
  const byMonth = {};
  h.forEach(x => { const k = new Date(x.date).toLocaleDateString('es', { month: 'long', year: 'numeric' }); (byMonth[k] = byMonth[k] || []).push(x); });
  Object.entries(byMonth).forEach(([k, xs]) => {
    html += group(xs.map(x => { const kc = kcalText(x.kcal && x.kcal[pr.id]); return row({ icon: `<span class="mood">${x.mood || '✓'}</span>`, title: esc(x.planName), sub: `${new Date(x.date).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtMin(x.secs)}${kc ? ' · ' + kc : ''}${x.people ? ' · ' + esc(x.people.join(' + ')) : ''}${x.partial ? ' · parcial' : ''}`, chev: true, a: 'openSession', data: `data-id="${x.id}"` }); }), { header: k });
  });
  return html;
}

function achievementsHTML(pr) {
  const have = pr.milestones || {}, ids = MILESTONES.filter(m => have[m.id]).reverse();
  if (!ids.length) return '';
  return group(ids.map(m => row({ icon: `<span class="ri-ms">${I[m.icon] || I.sparkle}</span>`, title: esc(m.name), sub: esc(m.desc), right: `<span class="muted">${dShort(have[m.id])}</span>` })), { header: `Logros · ${ids.length} de ${MILESTONES.length}` });
}

// ── Cuerpo: peso con fecha (y estatura opcional), gráfico, IMC discreto y totales
const wlog = pr => [...(pr.weights || [])].filter(w => w && w.kg > 0 && w.date).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
function totalsOf(pid) {
  const ws = weekStart(today()), now = today(), all = profEntries(pid);
  const sum = es => ({ n: es.length, mins: Math.round(es.reduce((a, x) => a + (x.secs || 0), 0) / 60), kcal: es.reduce((a, x) => a + ((x.kcal && x.kcal[pid]) || 0), 0), hasK: es.some(x => x.kcal && x.kcal[pid] != null) });
  return { week: sum(all.filter(x => new Date(x.date) >= ws)), month: sum(all.filter(x => { const d = new Date(x.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })) };
}
function weightChart(ws) {
  const W = 340, H = 196, L = 40, R = 16, T = 22, B = 30, pw = W - L - R, ph = H - T - B;
  const ts = ws.map(w => new Date(w.date + 'T12:00:00').getTime()), vs = ws.map(w => w.kg);
  let t0 = Math.min(...ts), t1 = Math.max(...ts);
  if (t1 - t0 < 6 * 864e5) { const mid = (t0 + t1) / 2; t0 = mid - 3.5 * 864e5; t1 = mid + 3.5 * 864e5; } // pocos días: la línea no se aprieta
  let lo = Math.min(...vs), hi = Math.max(...vs);
  const span = Math.max(hi - lo, 2), pad = span * 0.25, mid = (hi + lo) / 2;
  lo = mid - span / 2 - pad; hi = mid + span / 2 + pad;
  const step = [0.5, 1, 2, 5, 10, 20].find(s => (hi - lo) / s <= 4) || 20;
  const yMin = Math.floor(lo / step) * step, yMax = Math.ceil(hi / step) * step;
  const X = ts_ => L + (ts_ - t0) / (t1 - t0) * pw, Y = v => T + (1 - (v - yMin) / (yMax - yMin)) * ph;
  const grid = []; for (let v = yMin; v <= yMax + 1e-9; v += step) grid.push(v);
  const pts = ws.map((w, i) => [X(ts[i]), Y(w.kg)]);
  const line = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('');
  const area = pts.length > 1 ? `${line}L${pts[pts.length - 1][0].toFixed(1)} ${T + ph}L${pts[0][0].toFixed(1)} ${T + ph}Z` : '';
  const many = ws.length > 30, last = pts[pts.length - 1];
  const yr = (t1 - t0) > 300 * 864e5, lab = iso => yr ? new Date(iso + 'T12:00:00').toLocaleDateString('es', { month: 'short', year: '2-digit' }) : dShort(iso);
  const midI = ws.length > 2 ? ts.reduce((bi, v, i) => Math.abs(v - (t0 + t1) / 2) < Math.abs(ts[bi] - (t0 + t1) / 2) ? i : bi, 0) : -1;
  const midOk = midI > 0 && midI < ws.length - 1 && Math.abs(X(ts[midI]) - X(ts[0])) > 85 && Math.abs(X(ts[ws.length - 1]) - X(ts[midI])) > 85;
  const xs = ws.length === 1 ? [[0]] : [[0], ...(midOk ? [[midI]] : []), [ws.length - 1]];
  const lastX = Math.min(Math.max(last[0], L + 18), W - R - 18);
  return `<svg class="wchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de peso: ${ws.length} ${ws.length === 1 ? 'registro' : 'registros'}, el último ${fmt1(vs[vs.length - 1])} kg">
    <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${grid.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="wgrid"/><text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="wtxt">${step < 1 ? fmt1(v) : v}</text>`).join('')}
    ${area ? `<path d="${area}" fill="url(#wg)"/>` : ''}
    ${pts.length > 1 ? `<path d="${line}" class="wline"/>` : ''}
    ${(many ? [last] : pts).map(q => `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3.5" class="wdot"/>`).join('')}
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="6" class="wlast"/>
    <text x="${lastX.toFixed(1)}" y="${(last[1] - 12).toFixed(1)}" text-anchor="middle" class="wval">${fmt1(vs[vs.length - 1])}</text>
    ${xs.map(([i]) => { const x = ws.length === 1 ? L + pw / 2 : pts[i][0], an = ws.length === 1 ? 'middle' : x < L + 34 ? 'start' : x > W - R - 34 ? 'end' : 'middle'; return `<text x="${(an === 'start' ? Math.max(x, L) : an === 'end' ? Math.min(x, W - R) : x).toFixed(1)}" y="${H - 8}" text-anchor="${an}" class="wtxt">${lab(ws[i].date)}</text>`; }).join('')}
  </svg>`;
}
function bodyHTML(pr) {
  const ws = wlog(pr), tot = totalsOf(pr.id), cm = pr.heightCm, many = S().profiles.length > 1;
  let html = '';
  if (!ws.length) {
    html += `<div class="card bodycard empty"><p><b>Peso y medidas</b></p><p class="muted">Es opcional. Si quieres, registra tu peso para ver su evolución y afinar las calorías estimadas.</p><button class="btn tinted" data-a="bodyAdd" data-id="${pr.id}">${I.plus}Registrar peso</button></div>`;
  } else {
    const last = ws[ws.length - 1], first = ws[0], d = last.kg - first.kg;
    const delta = ws.length > 1 ? `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt1(Math.abs(d))} kg desde el ${dShort(first.date, true)}` : `Registrado el ${dShort(last.date, true)}`;
    html += `<div class="card bodycard"><div class="bc-top"><div><p class="bc-k">Peso</p><p class="bc-v"><b>${fmt1(last.kg)}</b> kg</p></div><p class="bc-d">${delta}</p></div>${weightChart(ws)}</div>`;
    if (cm) { const bmi = last.kg / ((cm / 100) ** 2); html += group([row({ title: 'IMC', sub: 'Referencia general; no distingue músculo de grasa.', right: `<span class="muted">${fmt1(bmi)}</span>` })]); }
  }
  const T = x => `${x.n} ${x.n === 1 ? 'sesión' : 'sesiones'} · ${x.mins} min · ${x.hasK ? kcalText(x.kcal) || '—' : '—'}`;
  html += group([row({ title: 'Esta semana', right: `<span class="muted">${T(tot.week)}</span>`, cls: 'tall' }), row({ title: 'Este mes', right: `<span class="muted">${T(tot.month)}</span>`, cls: 'tall' })], { header: `Totales${many ? ' · ' + esc(pr.name) : ''}`, footer: 'Las calorías son una estimación y suman solo las sesiones que las registraron.' });
  if (ws.length) html += group([...ws.slice().reverse().map(w => row({ title: `${fmt1(w.kg)} kg`, sub: dShort(w.date, true) + (w.cm ? ` · ${w.cm} cm` : ''), chev: true, a: 'bodyEdit', data: `data-id="${pr.id}" data-date="${w.date}"` }))], { header: 'Registros' });
  return html;
}
function bodySheetHTML() {
  const d = ui.bodyDraft, pr = store.profile(d.pid), edit = !!d.orig;
  return `<div class="sheet-head"><button class="navbtn" data-a="closeSheet">Cancelar</button><h2>${edit ? 'Editar registro' : 'Nuevo registro'}</h2><button class="navbtn strong" data-a="bodySave">Guardar</button></div><div class="sheet-body">
    ${group([row({ title: 'Fecha', right: `<input class="inline short" type="date" data-in="bodyDraft" data-k="date" value="${esc(d.date)}" max="${todayISO()}">` }),
      row({ title: 'Peso (kg)', right: `<input class="inline short" type="number" inputmode="decimal" step="0.1" min="20" max="400" data-in="bodyDraft" data-k="kg" value="${esc(d.kg)}" placeholder="Ej. 62,5">` }),
      row({ title: 'Estatura (cm)', sub: 'Opcional', right: `<input class="inline short" type="number" inputmode="decimal" min="80" max="250" data-in="bodyDraft" data-k="cm" value="${esc(d.cm)}" placeholder="Opcional">` })], { footer: `Para ${esc(pr.name)}. Se usa solo en este teléfono y para afinar las calorías estimadas.` })}
    ${d.err ? `<p class="gf err">${esc(d.err)}</p>` : ''}
    ${edit ? group([row({ title: '<span class="danger">Eliminar registro</span>', a: 'bodyDel' })]) : ''}</div>`;
}

function ringSvg(frac, size = 54, w = 6) {
  const r = (size - w) / 2, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${w}" fill="none"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - frac)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}

function streakWeeks(pid) { return streakWeeksOf(profEntries(pid), goalOf(pid)); }
// «Semana 3 seguida» solo cuando es verdad (2 o más semanas cumpliendo la meta); si no, no se muestra nada
function streakLine(pid) {
  const n = streakWeeks(pid); if (n < 2) return '';
  const cur = (weekCounts(profEntries(pid)).get(weekStart(today()).getTime()) || 0) >= goalOf(pid);
  return `<p class="wk-streak">${I.sparkle}${cur ? `Semana ${n} seguida` : `${n} semanas seguidas`}</p>`;
}
const goalOf = pid => Math.min(7, Math.max(1, store.profile(pid).weeklyGoal || set().weeklyGoal || 3));

function calendarHTML(entries) {
  const { y, m } = ui.cal;
  const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  const off = (first.getDay() + 6) % 7;
  const done = new Set(entries.map(x => dayKey(x.date)));
  const tk = dayKey(today());
  let cells = '';
  for (let i = 0; i < off; i++) cells += '<span></span>';
  for (let d = 1; d <= days; d++) { const k = `${y}-${m + 1}-${d}`; cells += `<span class="cd ${done.has(k) ? 'on' : ''} ${k === tk ? 'today' : ''}">${d}</span>`; }
  const t0 = first.toLocaleDateString('es', { month: 'long', year: 'numeric' }), title = t0.charAt(0).toUpperCase() + t0.slice(1);
  return `<div class="card cal"><div class="cal-head"><b>${title}</b><span><button class="iconbtn" data-a="calMove" data-d="-1" aria-label="Mes anterior">${I.chevL}</button><button class="iconbtn" data-a="calMove" data-d="1" aria-label="Mes siguiente">${I.chevR}</button></span></div><div class="cal-grid">${DAYS.map(d => `<i>${d}</i>`).join('')}${cells}</div></div>`;
}

// ───────────────────────── animación en el detalle del movimiento
function startAnim(id, fixed = null) {
  stopAnim(false);
  const m = MOVE_BY_ID[id];
  const stop = mountRig($('#mv'), m, { fixed });
  anim = fixed == null ? { id, stop } : { id: null, stop, fixedFor: id };
}
function stopAnim(clear = true) { if (anim && anim.stop) anim.stop(); if (clear) anim = null; }

// ───────────────────────── editores (sheets)
const itemOf = el => store.plan(el.dataset.p).sections[+el.dataset.s].items[+el.dataset.i];
const holderOf = el => { const it = itemOf(el); return el.dataset.side === 'b' ? it.b : it; };

function itemSheetHTML(pid, si, ii, side = 'a') {
  const p = store.plan(pid), it = p.sections[si].items[ii], duo = isDuo(p), pp = people(p);
  const h = side === 'b' ? it.b : it, m = MOVE_BY_ID[h.move], d = doseOf(h);
  const base = `data-p="${pid}" data-s="${si}" data-i="${ii}" data-side="${side}"`;
  const types = [['time', 'Tiempo'], ['reps', 'Repeticiones']];
  if (m.dose.type === 'phases' || d.type === 'phases') types.push(['phases', 'Fases']);
  let body = '';
  if (d.type === 'time') body = group([row({ title: 'Duración', right: stepper('dose', `${base} data-k="secs" data-st="5" data-min="5" data-max="600"`, fmtSecs(d.secs)) }), row({ title: 'Por lado', sub: 'Se repite en el lado izquierdo', right: toggle('dose:perSide', d.perSide, base) })]);
  if (d.type === 'reps') body = group([row({ title: 'Mínimo', right: stepper('dose', `${base} data-k="min" data-st="1" data-min="1" data-max="100"`, d.min) }), row({ title: 'Máximo', right: stepper('dose', `${base} data-k="max" data-st="1" data-min="1" data-max="100"`, d.max) }), row({ title: 'Por lado', right: toggle('dose:perSide', d.perSide, base) }), row({ title: 'Alternadas', right: toggle('dose:alternating', d.alternating, base) })]);
  if (d.type === 'phases') body = group(d.phases.map((ph, k) => row({ title: esc(ph.label) + (ph.perSide ? ' <span class="muted">· c/lado</span>' : ''), sub: `Posición ${ph.pos + 1}`, right: stepper('phase', `${base} data-k="${k}" data-st="5" data-min="5" data-max="300"`, fmtSecs(ph.secs)) })));
  return `<div class="sheet-head"><span></span><h2>${esc(duo ? 'Ejercicio en pareja' : m.name)}</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div>
    <div class="sheet-body">${duo ? seg('itemSide', base, [['a', esc(pp[0].name)], ['b', esc(pp[1].name)]], side) : ''}
    <div class="item-preview">${thumb(m, 1, duo ? pp[side === 'b' ? 1 : 0].model : undefined)}${thumb(m, 2, duo ? pp[side === 'b' ? 1 : 0].model : undefined)}</div>
    <p class="center item-name">${esc(m.name)}</p>
    ${seg('doseType', base, types, d.type)}${body}
    <p class="gf center">${esc(doseText(d))}</p>
    ${group([row({ title: '<span class="accent">Cambiar movimiento</span>', a: 'replaceMove', data: base, chev: true }), row({ title: '<span class="accent">Ver movimiento</span>', a: 'sheetOpenMove', data: `data-id="${m.id}"` }), row({ title: '<span class="danger">Quitar del plan</span>', a: 'delItem', data: base + ' data-close="1"' })])}</div>`;
}

function sectionSheetHTML(pid, si) {
  const p = store.plan(pid), sec = p.sections[si];
  const base = `data-p="${pid}" data-s="${si}"`;
  return `<div class="sheet-head"><span></span><h2>Bloque ${BADGE[si] || si + 1}</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div><div class="sheet-body">
    ${group([row({ title: 'Nombre', right: `<input class="inline" data-in="secName" ${base} value="${esc(sec.name)}">` }),
      row({ title: 'Tipo', right: seg('secKind', base, [['circuit', 'Circuito'], ['sequence', 'Secuencia']], sec.kind) }),
      ...(sec.kind === 'circuit' ? [row({ title: 'Rondas', right: stepper('secStep', `${base} data-k="rounds" data-st="1" data-min="1" data-max="10"`, sec.rounds) }), row({ title: 'Descanso entre rondas', right: stepper('secStep', `${base} data-k="rest" data-st="15" data-min="0" data-max="300"`, `${sec.rest} s`) })] : [])],
      { footer: (sec.kind === 'circuit' ? 'Circuito: haces todos los ejercicios seguidos y repites. Descansas al final de cada ronda.' : 'Secuencia: cada ejercicio una vez, en orden.') + (set().roundRest ? ` Ahora mismo Ajustes fija ${set().roundRest} s para todos los bloques.` : '') })}
    ${group([row({ title: 'Subir bloque', a: 'moveSection', data: `${base} data-d="-1"`, right: I.up }), row({ title: 'Bajar bloque', a: 'moveSection', data: `${base} data-d="1"`, right: I.down })])}
    ${group([row({ title: '<span class="danger">Eliminar bloque</span>', a: 'delSection', data: base })])}</div>`;
}

function peopleSheetHTML(pid) {
  const p = store.plan(pid), pp = people(p), opts = S().profiles.map(x => [x.id, esc(x.name)]);
  return `<div class="sheet-head"><span></span><h2>Participantes</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div><div class="sheet-body">
    ${pp.map((x, k) => group([row({ title: 'Perfil', right: seg('personProfile', `data-p="${pid}" data-k="${k}"`, opts, x.profile) }), row({ title: 'Dibujos', right: `<span class="muted">${GENDER[x.model]}</span>` })], { header: k === 0 ? 'Persona 1 · imagen de arriba' : 'Persona 2 · imagen de abajo' })).join('')}
    <p class="gf">El nombre, el género y las cargas se editan en Ajustes → Perfiles. Cada persona puede hacer un ejercicio distinto en el mismo turno: edita cada ejercicio del plan y elige la persona arriba.</p></div>`;
}

// ── calorías: hoja informativa (3 ideas, límites y fuentes)
function kcalInfoHTML() {
  const li = x => `<div class="row tip"><span class="num">${x[0]}</span><span class="rt"><span class="rtt">${x[1]}</span></span></div>`;
  return `<div class="sheet-head"><span></span><h2>Cómo se estiman las kcal</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div><div class="sheet-body">
    ${group([
      [1, 'Cada ejercicio tiene una intensidad (MET). Calorías ≈ MET × 3,5 × tu peso ÷ 200 × minutos reales; las pausas cuentan como reposo activo.'],
      [2, 'Se ajusta con tu metabolismo en reposo (peso, estatura, edad y sexo) y, si registraste mancuernas o kettlebell, un poco por la carga. Sin esos datos se usan promedios y se marca «estimado».'],
      [3, 'Es una aproximación: el error típico es de ±20 a 30 %. No es una medida ni una meta, y no sirve para «compensar» la comida.'],
    ].map(li))}
    ${group([row({ title: 'Cambiar el ajuste', sub: 'En Ajustes → Calorías', a: 'kcalSettings', chev: true })])}
    <p class="gf">Fuentes: Compendio de Actividad Física (Ainsworth et al. 2011, Med Sci Sports Exerc 43:1575; Herrmann et al. 2024, J Sport Health Sci 13:6) para los MET; Mifflin et al. 1990 (Am J Clin Nutr 51:241) para el metabolismo en reposo; Byrne et al. 2005 (J Appl Physiol 99:1112) para la corrección individual.</p></div>`;
}

// ── perfiles
const profOf = id => store.profile(id);
function profileSheetHTML(id) {
  const pr = profOf(id), L = pr.loads, last = pr.weights.length ? pr.weights[pr.weights.length - 1].kg : '';
  const base = `data-id="${id}"`, kg = v => v ? `${v} kg` : 'Sin';
  return `<div class="sheet-head"><span></span><h2>${esc(pr.name || 'Perfil')}</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div><div class="sheet-body">
    ${group([row({ title: 'Nombre', right: `<input class="inline" data-in="profName" ${base} value="${esc(pr.name)}" placeholder="Nombre" autocomplete="off" maxlength="24">` }),
      row({ title: 'Género', sub: 'Define el modelo de las animaciones', right: seg('profGender', base, [['f', 'Mujer'], ['m', 'Hombre']], pr.gender) }),
      row({ title: 'Perfil activo', sub: 'Se usa en los planes individuales', right: toggle('prof:active', pr.id === S().activeProfile, base) })])}
    ${group([row({ title: 'Año de nacimiento', right: `<input class="inline short" type="number" inputmode="numeric" data-in="profNum" data-k="birthYear" ${base} value="${pr.birthYear ?? ''}" placeholder="Opcional" min="1920" max="${new Date().getFullYear()}">` }),
      row({ title: 'Estatura (cm)', right: `<input class="inline short" type="number" inputmode="decimal" data-in="profNum" data-k="heightCm" ${base} value="${pr.heightCm ?? ''}" placeholder="Opcional" min="80" max="250">` }),
      row({ title: 'Peso actual (kg)', right: `<input class="inline short" type="number" inputmode="decimal" step="0.1" data-in="profWeight" ${base} value="${last}" placeholder="Opcional" min="20" max="400">` })],
      { header: 'Datos corporales', footer: 'Opcionales. Al cambiar el peso se guarda con la fecha de hoy.' })}
    ${group([row({ title: 'Peso y medidas', sub: 'Registros, gráfico y totales', a: 'openBody', data: base, chev: true })])}
    ${group([row({ title: 'Mancuernas', right: stepper('profStep', `${base} data-k="dumbbellKg" data-st="0.5" data-max="40"`, kg(L.dumbbellKg)) }),
      row({ title: 'Kettlebell', right: stepper('profStep', `${base} data-k="kettlebellKg" data-st="1" data-max="48"`, kg(L.kettlebellKg)) }),
      row({ title: 'Banda de brazos', right: seg('profLevel', `${base} data-k="band"`, LEVEL, L.band) }),
      row({ title: 'Mini banda (piernas)', right: seg('profLevel', `${base} data-k="miniBand"`, LEVEL, L.miniBand) })], { header: 'Cargas', footer: 'Lo que usas normalmente; sirve para sugerir y estimar.' })}</div>`;
}

let picker = null;
function pickerList() {
  const q = picker.q.toLowerCase();
  const list = MOVES.filter(m => (picker.cat === 'all' || groupOf(m) === picker.cat) && (!q || searchText(m).includes(q)));
  return group(list.map(m => row({ icon: thumb(m), title: esc(m.name), sub: esc(m.focus.join(' · ')), right: `<span class="checkc ${picker.sel.includes(m.id) ? 'on' : ''}">${picker.sel.includes(m.id) ? I.check : ''}</span>`, a: 'pickerToggle', data: `data-id="${m.id}"`, cls: 'withthumb' })));
}
function pickerBtnLabel() { return picker.mode === 'replace' ? 'Cambiar' : `Añadir${picker.sel.length ? ` (${picker.sel.length})` : ''}`; }
function pickerHTML() {
  return `<div class="sheet-head"><button class="navbtn" data-a="closeSheet">Cancelar</button><h2>${picker.mode === 'replace' ? 'Cambiar' : 'Añadir'}</h2><button class="navbtn strong" data-a="pickerDone" ${picker.sel.length ? '' : 'disabled'}>${pickerBtnLabel()}</button></div>
    <div class="sheet-body"><div class="searchbar">${I.search}<input type="search" placeholder="Buscar" value="${esc(picker.q)}" data-in="pickerSearch"></div>
    <div class="chips">${[['all', 'Todos'], ...groupsPresent().map(g => [g, GROUP_NAME[g]])].map(([id, n]) => `<button class="chip ${picker.cat === id ? 'on' : ''}" data-a="pickerCat" data-id="${id}">${n}</button>`).join('')}</div>
    <div id="pickList">${pickerList()}</div></div>`;
}

function planSave() { store.save(); render(); }
const newItem = (id, duo) => duo ? { move: id, dose: clone(MOVE_BY_ID[id].dose), b: { move: id, dose: clone(MOVE_BY_ID[id].dose) } } : { move: id, dose: clone(MOVE_BY_ID[id].dose) };
function toDuo(p) {
  const c = clone(p); c.id = uid(); c.mode = 'duo'; c.builtin = false; c.name = `${p.name} · en pareja`;
  c.people = defaultPeople();
  c.sections.forEach(sec => sec.items.forEach(it => { it.dose = clone(doseOf(it)); it.b = { move: it.move, dose: clone(it.dose) }; }));
  return c;
}

// ───────────────────────── ACCIONES
const A = {
  tab: el => { stopAnim(); switchTab(el.dataset.id); },
  back: () => { stopAnim(); back(); },
  openPlan: el => { if (nav.tab !== 'train') nav.tab = 'train'; push('plan', { id: el.dataset.id }); },
  openMove: el => { stopAnim(); ui.moveAuto = null; push('move', { id: el.dataset.id }); },
  sheetOpenMove: el => { closeSheet(); if (P.steps) return; push('move', { id: el.dataset.id }); },
  dismissInstall: () => { ui.dismissedInstall = true; sessionStorage.setItem('ptw.noinstall', '1'); render(); },
  closeSheet: () => closeSheet(),
  asPick: el => { const a = actionSheet.actions[+el.dataset.i]; closeSheet(); setTimeout(() => a.fn(), 50); },
  openFilters: () => openSheet(filtersHTML(), { onClose: render }),
  fToggle: el => { const a = ui.f[el.dataset.k], v = el.dataset.v, i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); refreshSheet(filtersHTML()); },
  fRemove: el => { const a = ui.f[el.dataset.k]; a.splice(a.indexOf(el.dataset.v), 1); render(); },
  fClear: () => { ui.f = { g: [], e: [], l: [] }; refreshSheet(filtersHTML()); },
  calMove: el => { let { y, m } = ui.cal; m += +el.dataset.d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } ui.cal = { y, m }; render(); },
  showPos: el => { stopAnim(); ui.moveShow[el.dataset.id] = +el.dataset.v; render(); },
  animMove: el => { const id = el.dataset.id; if (anim && anim.id === id) { stopAnim(); } else { stopAnim(); anim = { id }; } render(); },
  goalStep: el => { const pr = store.active; pr.weeklyGoal = clamp(goalOf(pr.id) + +el.dataset.d, 1, 7); store.save(); render(); },
  histTab: el => { ui.histTab = el.dataset.v; render(); },
  histProf: el => { ui.histPid = el.dataset.v; render(); },
  bodyAdd: el => { ui.bodyDraft = { pid: el.dataset.id || histPid(), orig: null, date: todayISO(), kg: '', cm: '' }; openSheet(bodySheetHTML(), { cls: 'tall' }); },
  bodyEdit: el => { const pr = store.profile(el.dataset.id), w = (pr.weights || []).find(x => x.date === el.dataset.date); if (!w) return; ui.bodyDraft = { pid: pr.id, orig: w.date, date: w.date, kg: String(w.kg), cm: w.cm ? String(w.cm) : '' }; openSheet(bodySheetHTML(), { cls: 'tall' }); },
  bodySave: () => {
    const d = ui.bodyDraft, pr = store.profile(d.pid), kg = Math.round(parseFloat(String(d.kg).replace(',', '.')) * 10) / 10, cm = parseFloat(String(d.cm).replace(',', '.'));
    const bad = m => { d.err = m; refreshSheet(bodySheetHTML()); };
    if (!(kg >= 20 && kg <= 400)) return bad('Escribe un peso entre 20 y 400 kg.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || d.date > todayISO()) return bad('Elige una fecha válida (hoy o antes).');
    if (d.cm !== '' && !(cm >= 80 && cm <= 250)) return bad('La estatura debe estar entre 80 y 250 cm.');
    pr.weights = (pr.weights || []).filter(w => w.date !== d.orig && w.date !== d.date);
    pr.weights.push({ date: d.date, kg, ...(cm > 0 ? { cm: Math.round(cm * 10) / 10 } : {}) });
    pr.weights.sort((a, b) => a.date < b.date ? -1 : 1);
    const lastCm = [...pr.weights].reverse().find(w => w.cm); if (lastCm) pr.heightCm = lastCm.cm;
    store.save(); ui.bodyDraft = null; closeSheet(); render(); toast('Registro guardado');
  },
  bodyDel: () => {
    const d = ui.bodyDraft, pr = store.profile(d.pid), removed = pr.weights.find(w => w.date === d.orig); if (!removed) return;
    pr.weights = pr.weights.filter(w => w !== removed); store.save(); ui.bodyDraft = null; closeSheet(); render();
    undoToast('Registro eliminado', () => { pr.weights.push(removed); pr.weights.sort((a, b) => a.date < b.date ? -1 : 1); store.save(); render(); });
  },
  openBody: el => { closeSheet(); ui.histTab = 'body'; ui.histPid = el.dataset.id; nav.tab = 'history'; nav.stacks.history = nav.stacks.history.slice(0, 1); render(); },
  kcalInfo: () => openSheet(kcalInfoHTML()),
  kcalSettings: () => { closeSheet(); if (P.steps) return; nav.tab = 'settings'; nav.stacks.settings = nav.stacks.settings.slice(0, 1); render(); setTimeout(() => { const g = document.getElementById('kcalGroup'); if (g) g.scrollIntoView({ block: 'center' }); }, 60); },
  muscleMap: () => openSheet(`<div class="sheet-head"><span></span><h2>Músculos</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div><div class="sheet-body"><img class="musclemap" src="img/muscle-map.webp" alt="Mapa de músculos de frente y de espalda"><p class="gf">En cada ejercicio, el <b>naranja</b> marca el músculo que debes sentir trabajar y el <b>amarillo</b> el de apoyo.</p></div>`),
  toggleEdit: el => { ui.editing[el.dataset.id] = !ui.editing[el.dataset.id]; render(); },
  start: el => startSession(el.dataset.id),
  startSection: el => startSession(el.dataset.p, +el.dataset.s),
  planMenu: el => {
    const p = store.plan(el.dataset.id), s = S();
    const acts = [];
    if (s.activePlanId !== p.id) acts.push({ label: 'Sugerir en Entrenar', fn: () => { s.activePlanId = p.id; planSave(); toast('Aparecerá en Entrenar'); } });
    if (isDuo(p)) acts.push({ label: 'Participantes', fn: () => openSheet(peopleSheetHTML(p.id), { onClose: render }) });
    acts.push({ label: 'Duplicar', fn: () => { const c = clone(p); c.id = uid(); c.name = p.name + ' (copia)'; c.builtin = false; s.plans.push(c); store.save(); push('plan', { id: c.id }); toast('Plan duplicado'); } });
    if (!isDuo(p)) acts.push({ label: 'Crear versión en pareja', fn: () => { const c = toDuo(p); s.plans.push(c); store.save(); push('plan', { id: c.id }); toast('Plan en pareja creado'); } });
    if (store.isBuiltin(p.id)) acts.push({ label: 'Restaurar plan original', destructive: true, fn: () => { store.restoreBuiltin(p.id); render(); toast('Plan restaurado'); } });
    if (s.plans.length > 1) acts.push({ label: 'Eliminar plan', destructive: true, fn: () => {
      const i = s.plans.indexOf(p); s.plans.splice(i, 1);
      if (store.isBuiltin(p.id)) s.hiddenBuiltins.push(p.id);
      if (s.activePlanId === p.id) s.activePlanId = s.plans[0].id;
      store.save(); back(); toast('Plan eliminado');
    } });
    actionSheet(p.name, acts);
  },
  newPlan: () => { ui.np = { mode: 'solo' }; openSheet(newPlanHTML(), { cls: 'newplan' }); const f = $('#npName'); if (f) f.focus(); },
  npMode: el => { const f = $('#npName'); ui.np.name = f ? f.value : ''; ui.np.mode = el.dataset.v; refreshSheet(newPlanHTML()); const g = $('#npName'); if (g) g.focus(); },
  npGo: () => createPlan(ui.np.mode, ($('#npName').value || '').trim() || 'Mi plan'),
  editItem: el => openSheet(itemSheetHTML(el.dataset.p, +el.dataset.s, +el.dataset.i, 'a'), { onClose: render }),
  itemSide: el => refreshSheet(itemSheetHTML(el.dataset.p, +el.dataset.s, +el.dataset.i, el.dataset.v)),
  editSection: el => openSheet(sectionSheetHTML(el.dataset.p, +el.dataset.s), { onClose: render }),
  delItem: el => {
    const sec = store.plan(el.dataset.p).sections[+el.dataset.s];
    const removed = sec.items.splice(+el.dataset.i, 1)[0]; store.save();
    if (el.dataset.close) closeSheet(); render();
    undoToast(`Quitado: ${MOVE_BY_ID[removed.move].name}`, () => { sec.items.splice(+el.dataset.i, 0, removed); planSave(); });
  },
  moveItem: el => { const sec = store.plan(el.dataset.p).sections[+el.dataset.s], i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= sec.items.length) return; [sec.items[i], sec.items[j]] = [sec.items[j], sec.items[i]]; planSave(); },
  addSection: el => { const p = store.plan(el.dataset.p); p.sections.push({ id: uid(), name: `Bloque ${p.sections.length + 1}`, kind: 'circuit', rounds: 3, rest: 45, items: [] }); planSave(); },
  moveSection: el => { const p = store.plan(el.dataset.p), i = +el.dataset.s, j = i + +el.dataset.d; if (j < 0 || j >= p.sections.length) return; [p.sections[i], p.sections[j]] = [p.sections[j], p.sections[i]]; store.save(); closeSheet(); },
  delSection: el => { const p = store.plan(el.dataset.p), i = +el.dataset.s; closeSheet(); setTimeout(() => confirmSheet(`¿Eliminar «${p.sections[i].name}»?`, 'Eliminar bloque', () => { p.sections.splice(i, 1); planSave(); }), 300); },
  secKind: el => { const sec = store.plan(el.dataset.p).sections[+el.dataset.s]; sec.kind = el.dataset.v; if (sec.kind === 'circuit' && !sec.rounds) sec.rounds = 3; store.save(); refreshSheet(sectionSheetHTML(el.dataset.p, +el.dataset.s)); },
  secStep: el => { const sec = store.plan(el.dataset.p).sections[+el.dataset.s], k = el.dataset.k; sec[k] = clamp((sec[k] || 0) + +el.dataset.d * +el.dataset.st, +el.dataset.min, +el.dataset.max); store.save(); refreshSheet(sectionSheetHTML(el.dataset.p, +el.dataset.s)); },
  personProfile: el => { const p = store.plan(el.dataset.p); p.people = people(p).map(x => ({ profile: x.profile })); p.people[+el.dataset.k].profile = el.dataset.v; store.save(); refreshSheet(peopleSheetHTML(p.id)); },
  editProfile: el => openSheet(profileSheetHTML(el.dataset.id), { onClose: render }),
  profGender: el => { profOf(el.dataset.id).gender = el.dataset.v; store.save(); applyTheme(); refreshSheet(profileSheetHTML(el.dataset.id)); },
  profLevel: el => { profOf(el.dataset.id).loads[el.dataset.k] = el.dataset.v; store.save(); refreshSheet(profileSheetHTML(el.dataset.id)); },
  profStep: el => { const L = profOf(el.dataset.id).loads, k = el.dataset.k; L[k] = Math.round(clamp((L[k] || 0) + +el.dataset.d * +el.dataset.st, 0, +el.dataset.max) * 10) / 10; store.save(); refreshSheet(profileSheetHTML(el.dataset.id)); },
  doseType: el => {
    const h = holderOf(el), m = MOVE_BY_ID[h.move], v = el.dataset.v;
    if (v === 'time') h.dose = { type: 'time', secs: 30 }; else if (v === 'reps') h.dose = { type: 'reps', min: 10, max: 12 }; else h.dose = clone(m.dose.type === 'phases' ? m.dose : doseOf(h));
    store.save(); refreshItem(el);
  },
  dose: el => {
    const h = holderOf(el); h.dose = clone(doseOf(h)); const k = el.dataset.k;
    h.dose[k] = clamp((h.dose[k] || 0) + +el.dataset.d * +el.dataset.st, +el.dataset.min, +el.dataset.max);
    if (k === 'min' && h.dose.max < h.dose.min) h.dose.max = h.dose.min;
    if (k === 'max' && h.dose.min > h.dose.max) h.dose.min = h.dose.max;
    store.save(); refreshItem(el);
  },
  phase: el => {
    const h = holderOf(el); h.dose = clone(doseOf(h)); const ph = h.dose.phases[+el.dataset.k];
    ph.secs = clamp(ph.secs + +el.dataset.d * +el.dataset.st, +el.dataset.min, +el.dataset.max);
    store.save(); refreshItem(el);
  },
  addMoves: el => { picker = { mode: 'add', p: el.dataset.p, s: +el.dataset.s, q: '', cat: 'all', sel: [] }; openSheet(pickerHTML(), { cls: 'tall' }); },
  replaceMove: el => { picker = { mode: 'replace', p: el.dataset.p, s: +el.dataset.s, i: +el.dataset.i, side: el.dataset.side, q: '', cat: 'all', sel: [] }; refreshSheet(pickerHTML()); $('#sheet-layer .sheet').classList.add('tall'); },
  pickerCat: el => { picker.cat = el.dataset.id; refreshSheet(pickerHTML()); },
  pickerToggle: el => {
    const id = el.dataset.id;
    if (picker.mode === 'replace') picker.sel = [id];
    else { const i = picker.sel.indexOf(id); if (i >= 0) picker.sel.splice(i, 1); else picker.sel.push(id); }
    $('#pickList').innerHTML = pickerList(); const b = $('[data-a="pickerDone"]'); b.disabled = !picker.sel.length; b.textContent = pickerBtnLabel();
  },
  pickerDone: () => {
    const p = store.plan(picker.p), sec = p.sections[picker.s];
    if (picker.mode === 'replace') {
      const it = sec.items[picker.i], h = picker.side === 'b' ? it.b : it, id = picker.sel[0];
      h.move = id; h.dose = clone(MOVE_BY_ID[id].dose); store.save();
      refreshSheet(itemSheetHTML(picker.p, picker.s, picker.i, picker.side)); $('#sheet-layer .sheet').classList.remove('tall'); toast('Movimiento cambiado'); return;
    }
    picker.sel.forEach(id => sec.items.push(newItem(id, isDuo(p))));
    toast(`${picker.sel.length} añadido${picker.sel.length > 1 ? 's' : ''}`); store.save(); closeSheet(); render();
  },
  addToPlan: el => {
    const id = el.dataset.id, acts = [];
    S().plans.forEach(p => p.sections.forEach(sec => acts.push({ label: `${p.name} · ${sec.name}`, fn: () => { sec.items.push(newItem(id, isDuo(p))); planSave(); toast(`Añadido a ${sec.name}`); } })));
    actionSheet('Añadir a…', acts);
  },
  openSession: el => {
    const x = S().history.find(h => h.id === el.dataset.id); if (!x) return;
    openSheet(`<div class="sheet-head"><span></span><h2>${esc(x.planName)}</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div><div class="sheet-body">
      <div class="sess-top"><span class="mood big">${x.mood || '✓'}</span><p>${new Date(x.date).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p></div>
      ${group([row({ title: 'Duración', right: `<span class="muted">${clock(x.secs)}</span>` }), ...(x.kcal ? S().profiles.filter(pr => x.kcal[pr.id] != null).map(pr => row({ title: `Calorías${Object.keys(x.kcal).length > 1 ? ' · ' + esc(pr.name) : ''}`, right: `<span class="muted">${kcalText(x.kcal[pr.id]) || '—'}${(x.kcalApprox || []).includes(pr.id) ? ' · estimado' : ''}</span>` })) : []), row({ title: 'Ejercicios', right: `<span class="muted">${x.worked} de ${x.total}</span>` }), row({ title: 'Bloques', right: `<span class="muted">${esc((x.sections || []).join(', '))}</span>` }), ...(x.people ? [row({ title: 'En pareja', right: `<span class="muted">${esc(x.people.join(' + '))}</span>` })] : [])])}
      ${x.note ? group([`<div class="row"><span class="rt"><span class="rtt">${esc(x.note)}</span></span></div>`], { header: 'Notas' }) : ''}
      ${group([row({ title: '<span class="danger">Eliminar sesión</span>', a: 'delSession', data: `data-id="${x.id}"` })])}</div>`);
  },
  delSession: el => { const h = S().history, i = h.findIndex(x => x.id === el.dataset.id); const rem = h.splice(i, 1)[0]; store.save(); closeSheet(); render(); undoToast('Sesión eliminada', () => { h.push(rem); planSave(); }); },
  setStep: el => { const st = set(), k = el.dataset.k; st[k] = Math.round(clamp(st[k] + +el.dataset.d * +el.dataset.st, +el.dataset.min, +el.dataset.max) * 10) / 10; afterSetting(); },
  setSeg: el => { set()[el.dataset.k] = el.dataset.v; afterSetting(); },
  testSound: () => { unlockAudio(); sfx.tick(); setTimeout(sfx.tick, 700); setTimeout(() => sfx.tick(true), 1400); setTimeout(sfx.go, 2100); setTimeout(sfx.side, 3000); setTimeout(sfx.rest, 3700); setTimeout(sfx.done, 4800); if (set().voice) setTimeout(() => say('Sentadilla goblet. Diez a doce repeticiones.'), 6200); },
  openMore: () => push('settingsMore'),
  openStorage: () => push('settingsStorage'),
  restorePlans: () => confirmSheet('Los planes incluidos volverán a su versión original. Tus planes propios no cambian.', 'Restaurar planes', () => { DEFAULT_PLANS.forEach(p => store.restoreBuiltin(p.id)); S().hiddenBuiltins = []; store.save(); render(); toast('Planes restaurados'); }),
  exportData: () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const name = `respaldo-entrenamiento-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    const done = () => { set().lastBackup = new Date().toISOString(); store.save(); render(); };
    if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'Respaldo' }).then(done).catch(() => {});
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); done(); }
  },
  importData: () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(t => { try { store.importJSON(t); configureAudio(set()); applyTheme(); render(); toast('Respaldo importado'); } catch (e) { toast('Archivo no válido'); } }); };
    inp.click();
  },
  resetAll: () => confirmSheet('Se borrarán tus planes editados, el historial y los ajustes.', 'Borrar todo', () => { store.reset(); configureAudio(set()); applyTheme(); render(); toast('Datos borrados'); }),
  installHelp: () => openSheet(`<div class="sheet-head"><span></span><h2>Instalar</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div><div class="sheet-body">
    ${group(['Abre esta página en <b>Safari</b>.', 'Toca el botón <b>Compartir</b> (cuadrado con flecha).', 'Elige <b>Agregar a inicio</b> y toca <b>Agregar</b>.', 'Abre siempre la app desde el ícono: funciona a pantalla completa, sin internet, y tus datos no caducan.'].map((t, i) => `<div class="row tip"><span class="num">${i + 1}</span><span class="rt"><span class="rtt">${t}</span></span></div>`))}
    <p class="gf">Safari y la app instalada guardan datos por separado. Si ya usaste la versión de Safari, exporta un respaldo allí e impórtalo en la app instalada.</p></div>`),
  // reproductor
  pToggle: () => P.toggle(), pNext: () => P.next(), pPrev: () => P.prev(), pDone: () => P.next(true), pAdd: () => P.addTime(15),
  pDuoDone: el => P.duoDone(el.dataset.w),
  pClose: () => P.askClose(), pSave: () => P.save(),
  pAnimToggle: () => { set().animate = !set().animate; store.save(); P.renderStep(); },
  pSettings: () => P.openSettings(),
};

function newPlanHTML() {
  return `<div class="sheet-head"><button class="navbtn" data-a="closeSheet">Cancelar</button><h2>Nuevo plan</h2><span></span></div>
    <div class="sheet-body new-plan"><input id="npName" class="field" placeholder="Nombre del plan" value="${esc((ui.np && ui.np.name) || '')}" maxlength="40" autocomplete="off" aria-label="Nombre del plan" enterkeyhint="next">
    ${seg('npMode', '', [['solo', 'Individual'], ['duo', 'En pareja']], ui.np.mode)}
    <p class="gf">${ui.np.mode === 'duo' ? 'Dos personas entrenan al mismo tiempo, cada una con su ejercicio.' : 'Empieza con un circuito de 3 rondas; luego eliges los movimientos.'}</p>
    <button class="btn primary big cta" data-a="npGo">Elegir movimientos</button></div>`;
}
// nombre → movimientos → listo: crea el plan con un bloque por defecto (circuito de 3 rondas, 45 s) y abre el selector
function createPlan(mode, name) {
  const p = { id: uid(), name, subtitle: '', frequency: '', mode, sections: [{ id: uid(), name: 'Bloque 1', kind: 'circuit', rounds: 3, rest: 45, items: [] }] };
  if (mode === 'duo') p.people = defaultPeople();
  S().plans.push(p); store.save(); ui.editing[p.id] = true;
  closeSheet();
  nav.tab = 'train'; push('plan', { id: p.id });
  setTimeout(() => A.addMoves({ dataset: { p: p.id, s: '0' } }), 320);
}
function refreshItem(el) { refreshSheet(itemSheetHTML(el.dataset.p, +el.dataset.s, +el.dataset.i, el.dataset.side || 'a')); }
// tras cambiar un ajuste: guarda, aplica y refresca la vista visible (o los ajustes rápidos del reproductor)
function afterSetting() {
  store.save(); configureAudio(set()); applyTheme();
  if (P.steps && sheetOpen('qs')) { P.settingsDirty = true; refreshSheet(P.settingsHTML()); }
  else render();
}

// inputs
const INPUT = {
  search: el => { ui.q = el.value; $('#catList').innerHTML = catalogList(); },
  pickerSearch: el => { picker.q = el.value; $('#pickList').innerHTML = pickerList(); },
  profName: el => { profOf(el.dataset.id).name = el.value.trim() || 'Perfil'; store.save(); },
  profNum: el => { const pr = profOf(el.dataset.id), v = parseFloat(el.value); if (v > 0) pr[el.dataset.k] = el.dataset.k === 'birthYear' ? Math.round(v) : v; else delete pr[el.dataset.k]; store.save(); },
  bodyDraft: el => { ui.bodyDraft[el.dataset.k] = el.value; if (ui.bodyDraft.err) { ui.bodyDraft.err = ''; const e = $('#sheet-layer .gf.err'); if (e) e.remove(); } },
  profWeight: el => { // agrega el peso con la fecha de hoy (reemplaza el de hoy si ya existía)
    const pr = profOf(el.dataset.id), v = Math.round(parseFloat(el.value) * 10) / 10, d = todayISO();
    pr.weights = pr.weights.filter(w => w.date !== d);
    if (v > 0) pr.weights.push({ date: d, kg: v }); pr.weights.sort((a, b) => a.date < b.date ? -1 : 1); store.save();
  },  planName: el => { const p = store.plan(el.dataset.p), v = el.value.trim(); if (p && v) { p.name = v; store.save(); } },
  planSub: el => { const p = store.plan(el.dataset.p); if (p) { p.subtitle = el.value.trim(); store.save(); } },
  secName: el => { store.plan(el.dataset.p).sections[+el.dataset.s].name = el.value; store.save(); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const f = A[el.dataset.a]; if (f) { e.preventDefault(); f(el, e); }
});
document.addEventListener('input', e => {
  const el = e.target; const k = el.dataset.in; if (!k) return;
  if (k.startsWith('set:') && el.type === 'range') { set()[k.slice(4)] = +el.value; store.save(); configureAudio(set()); return; }
  if (INPUT[k] && el.type !== 'checkbox') INPUT[k](el);
});
document.addEventListener('change', e => {
  const el = e.target; const k = el.dataset.in; if (!k || el.type !== 'checkbox') return;
  if (k.startsWith('set:')) { set()[k.slice(4)] = el.checked; if (k === 'set:voice' && el.checked) unlockAudio(); afterSetting(); return; }
  if (k === 'prof:active') { if (el.checked) S().activeProfile = el.dataset.id; store.save(); applyTheme(); refreshSheet(profileSheetHTML(el.dataset.id)); return; }
  if (k.startsWith('dose:')) { const h = holderOf(el); h.dose = clone(doseOf(h)); h.dose[k.slice(5)] = el.checked; store.save(); refreshItem(el); }
});

// Tema visual (rosa | estandar) y modo (light | dark). 'auto' de tema: rosa si el perfil activo es mujer, estándar si es hombre.
const THEME_BG = { rosa: { light: '#FAF5F6', dark: '#140E12' }, estandar: { light: '#F3F4F8', dark: '#0E0F14' } };
const resolveTheme = () => { const t = set().theme; return t === 'rosa' || t === 'estandar' ? t : (store.active.gender === 'm' ? 'estandar' : 'rosa'); };
const resolveMode = () => { const m = set().appearance; return m === 'dark' || m === 'light' ? m : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); };
function applyTheme() {
  const th = resolveTheme(), mode = resolveMode(), root = document.documentElement;
  if (root.dataset.theme !== th) root.dataset.theme = th;
  if (root.dataset.mode !== mode) root.dataset.mode = mode;
  const meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', document.body.classList.contains('playing') ? '#0E0A0D' : THEME_BG[th][mode]);
}

// ───────────────────────── REPRODUCTOR
const P = {
  steps: null, i: 0, endsAt: 0, remain: 0, paused: false, stepStart: 0, sessionStart: 0, active: 0, worked: 0, lastBeep: null, timer: null, stops: [], mood: null, plan: null, wake: null, doneSections: new Set(), onlySection: null, duoMarks: {}, log: {}, result: null,

  start(plan, onlySection) {
    this.plan = plan; this.onlySection = onlySection; this.steps = buildSteps(plan, set(), onlySection);
    this.totalWork = this.steps.filter(s => s.type === 'work').length;
    this.i = 0; this.worked = 0; this.mood = null; this.paused = false; this.active = 0; this.doneSections = new Set();
    this.sessionStart = Date.now(); this.lastTick = Date.now(); this.log = {}; this.result = null;
    $('#player').classList.add('on'); document.body.classList.add('playing'); applyTheme();
    this.enter(0);
    clearInterval(this.timer); this.timer = setInterval(() => this.update(), 100);
    this.requestWake();
  },
  get step() { return this.steps[this.i]; },
  get duo() { return isDuo(this.plan); },
  enter(i, silent = false) {
    this.i = i; const s = this.step; this.stepStart = Date.now(); this.lastBeep = null; this.duoMarks = {};
    if (s.secs != null) { this.remain = s.secs; this.endsAt = Date.now() + s.secs * 1000; }
    if (s.type === 'done') { this.finish(); return; }
    if (!silent) {
      const pp = people(this.plan);
      if (s.type === 'work') {
        sfx.go();
        if (s.duo) say(s.a.move.id === s.b.move.id ? s.a.move.name : `${pp[0].name}: ${s.a.move.name}. ${pp[1].name}: ${s.b.move.name}`);
        else say(s.title + (unitText(s) ? '. ' + unitText(s) : '') + (s.reps && !unitText(s) ? '. ' + s.reps.replace('–', ' a ') : ''));
      } else if (s.type === 'rest') { sfx.rest(); say(s.betweenSections ? `Descanso. Luego, ${s.section.name}` : 'Descanso'); }
      else if (s.type === 'transition' || s.type === 'ready') { const n = s.type === 'ready' ? s.nextWork : s; if (n && n.move) say(`A continuación: ${n.move.name}`); }
      else if (s.type === 'switch') { sfx.side(); say(s.title); }
    }
    this.renderStep(true);
  },
  // tiempo REAL de cada paso (sin pausas), por `key`: base de las calorías (ver summarize)
  credit(s, secs) {
    if (!s || !(secs > 0) || s.type === 'done') return;
    const e = this.log[s.key] || (this.log[s.key] = { kind: s.type === 'work' ? 'work' : 'rest', secs: 0, who: s.type !== 'work' ? [] : s.duo ? [s.a.move.id, s.b.move.id] : [s.move.id] });
    e.secs += secs;
  },
  update() {
    const now = Date.now();
    const dt = this.paused ? 0 : (now - this.lastTick) / 1000;
    this.active += dt;
    this.lastTick = now;
    const s = this.step; if (!s || s.type === 'done' || this.paused) return;
    if (s.secs != null) {
      let rem = (this.endsAt - now) / 1000, guard = 0;
      this.credit(s, rem > 0 ? dt : Math.max(0, dt + rem)); // si ya venció, solo cuenta hasta el vencimiento
      // si la pantalla estuvo bloqueada, avanza en silencio los pasos vencidos
      while (rem <= 0 && guard++ < 50) {
        const over = -rem;
        this.markWorked(this.step);
        if (this.i + 1 >= this.steps.length) return;
        const quiet = over > 1.5;
        this.enter(this.i + 1, quiet);
        const n = this.step; if (n.type === 'done') return;
        this.credit(n, n.secs != null ? Math.min(n.secs, over) : over);
        if (n.secs == null) return;
        if (quiet) { this.endsAt = now - over * 1000 + n.secs * 1000; rem = (this.endsAt - now) / 1000; } else return;
      }
      this.remain = rem;
      const sec = Math.ceil(rem), bl = set().beepLast;
      if (bl > 0 && sec <= bl && sec >= 1 && this.lastBeep !== sec) { this.lastBeep = sec; sfx.tick(sec === 1); }
    } else this.credit(s, dt);
    this.paint();
  },
  markWorked(s) { if (s && s.type === 'work' && !s._done) { s._done = true; this.worked++; this.doneSections.add(s.section.name); } },
  next(done = false) {
    const s = this.step; if (s.type === 'work' && (done || (s.secs != null && this.remain <= 1))) this.markWorked(s);
    if (this.i + 1 < this.steps.length) { sfx.tap(); this.paused = false; this.enter(this.i + 1); }
  },
  duoDone(w) { this.duoMarks[w] = !this.duoMarks[w]; sfx.tap(); if (this.duoMarks.a && this.duoMarks.b) this.next(true); else this.renderControls(); },
  prev() {
    const elapsed = (Date.now() - this.stepStart) / 1000;
    if (elapsed > 3 || this.i === 0) { this.enter(this.i); return; }
    let j = this.i - 1; while (j > 0 && this.steps[j].type !== 'work') j--;
    this.enter(Math.max(0, j));
  },
  toggle() {
    if (this.paused) { this.paused = false; if (this.step.secs != null) this.endsAt = Date.now() + this.remain * 1000; this.stepStart = Date.now() - 4000; }
    else this.paused = true;
    sfx.tap(); this.renderControls(); this.paint();
  },
  addTime(n) { if (this.step.secs != null) { this.endsAt += n * 1000; this.remain += n; this.paint(); } },
  async requestWake() { if (!set().wakeLock || !('wakeLock' in navigator)) return; try { this.wake = await navigator.wakeLock.request('screen'); } catch (e) { /* no soportado */ } },
  releaseWake() { try { this.wake && this.wake.release(); } catch (e) { } this.wake = null; },
  stopFrames() { this.stops.forEach(f => f()); this.stops = []; },

  // ── ajustes rápidos durante el entrenamiento: se aplican al resto de la sesión
  settingsHTML() {
    const st = set();
    return `<div class="sheet-head"><span></span><h2>Ajustes</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div><div class="sheet-body">
      ${timesGroup(st)}
      ${group([row({ title: 'Repeticiones', right: seg('setSeg', 'data-k="repsMode"', [['manual', 'Manual'], ['auto', 'Con tiempo']], st.repsMode) }), row({ title: 'Segundos por repetición', right: stepper('setStep', 'data-k="secsPerRep" data-min="1" data-max="8" data-st="1"', `${st.secsPerRep} s`) }), ...(this.duo ? [row({ title: 'Ritmo en pareja', right: seg('setSeg', 'data-k="duoGovern"', [['time', 'Tiempo'], ['reps', 'Reps']], st.duoGovern) })] : [])])}
      ${soundGroup(st)}</div>`;
  },
  openSettings() {
    this.wasRunning = !this.paused; if (this.wasRunning) this.toggle();
    this.settingsDirty = false;
    openSheet(this.settingsHTML(), { cls: 'qs', onClose: () => { if (this.settingsDirty) this.rebuild(); if (this.wasRunning && this.paused) this.toggle(); } });
  },
  rebuild() {
    if (!this.steps) return;
    const cur = this.step, done = new Set(this.steps.filter(s => s._done).map(s => s.key));
    const ns = buildSteps(this.plan, set(), this.onlySection);
    ns.forEach(s => { if (done.has(s.key)) s._done = true; });
    let j = ns.findIndex(s => s.key === cur.key);
    if (j < 0) { const ahead = this.steps.slice(this.i).map(s => s.key); j = ns.findIndex(s => ahead.includes(s.key)); if (j < 0) j = ns.length - 1; }
    this.steps = ns; this.totalWork = ns.filter(s => s.type === 'work').length;
    if (ns[j].key === cur.key && cur.secs != null && ns[j].secs != null) {
      this.i = j; this.remain = Math.min(this.remain, ns[j].secs); this.endsAt = Date.now() + this.remain * 1000; this.renderStep();
    } else this.enter(j, true);
    toast('Ajustes aplicados');
  },

  // ── pintado
  renderStep(enter = false) {
    const s = this.step, st = set(), el = $('#player'), pp = people(this.plan);
    this.stopFrames();
    const sec = s.section || (s.nextWork && s.nextWork.section), segs = this.segs();
    const duoProg = s.type === 'work' && s.duo ? ` · ${s.rounds > 1 ? `ronda ${s.round}/${s.rounds} · ` : ''}${s.itemIdx + 1}/${s.items}` : '';
    const roundTxt = s.type === 'rest' && !s.betweenSections && s.rounds > 1 ? `<small>Ronda ${s.nextRound}/${s.rounds}</small>` : '';
    const isWork = s.type === 'work';
    let center = '', layout = '';
    if (isWork && s.duo) {
      layout = 'duo-layout';
      const who = (u, k) => `<div class="duo-cap"><span class="who">${esc(pp[k].name)}</span><b>${esc(u.move.name)}</b><em>${esc(u.secs != null || u.reps == null ? unitText(u) : u.reps + (unitText(u) ? ' · ' + unitText(u) : ''))}</em></div>`;
      const meter = s.secs != null ? `<div class="p-ring sm">${bigRing()}<div class="p-time" id="pTime">${clock(Math.ceil(this.remain))}</div></div>` : `<div class="duo-reps"><em id="pTime">${clock(0)}</em></div>`;
      center = `<div class="duo-wrap"><div class="duo-p">${mediaHTML(s.a.move, s.a.pos ?? 0, { id: 'pmA' })}${who(s.a, 0)}</div>
        <div class="duo-mid">${meter}<div class="p-ctl" id="pCtl"></div></div>
        <div class="duo-p">${who(s.b, 1)}${mediaHTML(s.b.move, s.b.pos ?? 0, { id: 'pmB' })}</div></div>`;
    } else if (isWork) {
      const m = s.move;
      center = `${mediaHTML(m, s.pos ?? 0, { id: 'pm0', extra: s.pos == null && m.positions.length > 1 ? `<button class="p-animbtn" data-a="pAnimToggle" aria-label="Animación">${st.animate ? I.pause : I.play}</button>` : '' })}
        <div class="p-title"><h2>${esc(m.name)}</h2><p>${s.sideName ? `<span class="side-chip ${s.side === 1 ? 'r' : 'l'}">${esc(s.sideName)}</span>` : ''}${esc([s.sub, ...(s.dose && s.dose.note && s.dose.note !== s.sub ? [s.dose.note] : [])].filter(Boolean).join(' · '))}</p></div>
        <div class="p-meter">${s.secs != null ? `<div class="p-ring has-prog">${bigRing()}<div class="p-time" id="pTime">${clock(Math.ceil(this.remain))}</div>${progHTML(s)}</div>` : `<div class="p-reps"><b>${esc(s.reps.split(' ')[0])}</b><span>${esc(s.reps.split(' ').slice(1).join(' '))}</span><em id="pTime">${clock(0)}</em>${progHTML(s)}</div>`}
          <p class="p-cue">${I.check}${esc(m.cue)}</p></div>`;
    } else {
      const n = s.nextWork;
      const nextCard = (mv, u, k, cap) => `<div class="p-next"><span class="p-next-img ${u.mirror ? 'flip' : ''}"><img src="${imgOf(mv, keyIdx(mv)[0], k == null ? undefined : pp[k].model)}" alt=""></span><span><small>${k == null ? cap : esc(pp[k].name)}</small><b>${esc(mv.name)}</b><em>${esc(u.secs != null && u.reps == null ? fmtSecs(u.secs) : (u.reps || ''))}${unitText(u) ? ' · ' + esc(unitText(u)) : ''}</em></span></div>`;
      const nexts = cap => !n ? '' : n.duo ? nextCard(n.a.move, n.a, 0, cap) + nextCard(n.b.move, n.b, 1, cap) : nextCard(n.move, n, null, cap);
      if (s.type === 'ready') {
        // cuenta regresiva: cifra grande que «salta» cada segundo
        center = `<div class="p-ready"><span class="kick">Prepárate</span><div class="p-ring ready">${bigRing()}<div class="p-time" id="pTime">${Math.max(1, Math.ceil(this.remain))}</div></div></div><div class="p-nexts">${nexts('Empiezas con')}</div>`;
      } else {
        const label = s.type === 'rest' ? 'Descanso' : s.type === 'switch' ? s.title : 'Siguiente';
        center = `<div class="p-restlabel">${s.type === 'switch' ? `<span class="p-switchicon">${I.sides}</span>` : ''}${label}${s.sub ? `<small>${esc(s.sub)}</small>` : ''}${roundTxt}</div>
          <div class="p-ring rest">${bigRing()}<div class="p-time" id="pTime">${clock(Math.ceil(this.remain))}</div></div>
          ${s.type === 'rest' ? `<div class="p-restbtns"><button class="btn tinted dark" data-a="pAdd">+15 s</button><button class="btn tinted dark" data-a="pNext">Saltar</button></div>` : ''}
          <div class="p-nexts">${nexts('A continuación')}</div>`;
      }
    }
    el.className = `on t-${s.type} ${layout}`;
    el.innerHTML = `<div class="p-top"><button class="p-x" data-a="pClose" aria-label="Terminar">${I.x}</button><div class="p-info"><b>${esc(this.plan.name)}</b></div><button class="p-x" data-a="pSettings" aria-label="Ajustes">${I.gear}</button></div>
      <div class="p-prog-top"><p class="p-blk">${esc(sec ? sec.name : '')}${duoProg}</p><div class="p-segs" role="progressbar" aria-label="Progreso por bloques" aria-valuemin="0" aria-valuemax="100">${segs.map(g => `<i style="flex-grow:${Math.max(g.total, 20)}"><b></b></i>`).join('')}</div></div>
      <div class="p-center ${enter ? 'enter' : ''}">${center}</div>
      ${layout ? '' : '<div class="p-ctl" id="pCtl"></div>'}<div class="p-paused" aria-hidden="true">${I.pause}<span>En pausa</span></div>`;
    this.segEls = [...el.querySelectorAll('.p-segs b')];
    this.renderControls(); this.paint();
    if (isWork) {
      const go = (m, pos, id, model, mirror) => this.stops.push(mountRig($('#' + id), m, { model, mirror, fixed: pos ?? (st.animate ? null : 0), isPaused: () => this.paused }));
      if (s.duo) { go(s.a.move, s.a.pos, 'pmA', pp[0].model, s.a.mirror); go(s.b.move, s.b.pos, 'pmB', pp[1].model, s.b.mirror); } else go(s.move, s.pos, 'pm0', undefined, s.mirror);
    }
  },
  renderControls() {
    const s = this.step, c = $('#pCtl'); if (!c) return;
    const manual = s.type === 'work' && s.secs == null;
    const pp = people(this.plan);
    let main;
    if (manual && s.duo) main = `<span class="duo-done">${['a', 'b'].map((w, k) => `<button class="p-main done sm ${this.duoMarks[w] ? 'on' : ''}" data-a="pDuoDone" data-w="${w}">${I.check}<span>${esc(pp[k].name)}</span></button>`).join('')}</span>`;
    else if (manual) main = `<button class="p-main done" data-a="pDone">${I.check}<span>Hecho</span></button>`;
    else main = `<button class="p-main" data-a="pToggle" aria-label="${this.paused ? 'Continuar' : 'Pausar'}">${this.paused ? I.play : I.pause}</button>`;
    c.innerHTML = `<button class="p-sbtn" data-a="pPrev" aria-label="Anterior">${I.prev}</button>${main}<button class="p-sbtn" data-a="pNext" aria-label="Saltar">${I.next}</button>`;
    $('#player').classList.toggle('paused', this.paused);
  },
  paint() {
    const s = this.step; this.paintSegs(); const t = $('#pTime'); if (!t) return;
    if (s.secs != null) {
      const rem = Math.max(0, this.remain);
      if (s.type === 'ready') { // cifra entera; se reinicia la animación en cada número
        const n = Math.max(1, Math.ceil(rem));
        if (t._n !== n) { t._n = n; t.textContent = n; t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
      } else t.textContent = clock(Math.ceil(rem));
      const fg = $('#player .p-ring .ring-fg'); if (fg) { const c = +fg.dataset.c; fg.style.strokeDashoffset = (c * (1 - rem / s.secs)).toFixed(1); }
      t.classList.toggle('warn', s.type !== 'ready' && Math.ceil(rem) <= set().beepLast && rem > 0);
    } else t.textContent = clock((Date.now() - this.stepStart) / 1000);
  },
  // progreso por bloque: cada segmento se llena según el tiempo (estimado en repeticiones manuales) de sus pasos
  segs() {
    if (this._segs && this._segsFor === this.steps) return this._segs;
    const segs = [], by = new Map(), w = s => s.secs != null ? s.secs : (s.type === 'work' ? set().repSecondsEstimate : 0);
    this.steps.forEach((s, i) => {
      if (s.sectionIdx == null || s.betweenSections) return;
      let g = by.get(s.sectionIdx); if (!g) { g = { idx: s.sectionIdx, first: i, last: i, total: 0 }; by.set(s.sectionIdx, g); segs.push(g); }
      s._before = g.total; s._w = w(s); g.total += s._w; g.last = i;
    });
    this._segsFor = this.steps; return this._segs = segs;
  },
  paintSegs() {
    const segs = this.segs(), s = this.step, els = this.segEls || [];
    const frac = s && s.secs ? Math.min(1, Math.max(0, 1 - this.remain / s.secs)) : 0;
    let all = 0;
    segs.forEach((g, k) => {
      const f = this.i > g.last ? 1 : this.i < g.first ? 0 : g.total ? Math.min(1, ((s._before || 0) + (s._w || 0) * frac) / g.total) : 0;
      all += f;
      const w = (f * 100).toFixed(1) + '%', b = els[k]; if (b && b._w !== w) { b.style.width = w; b._w = w; }
      const i = b && b.parentElement; if (i) i.classList.toggle('cur', this.i >= g.first && this.i <= g.last);
    });
    const bar = $('#player .p-segs'); if (bar) bar.setAttribute('aria-valuenow', Math.round(all / (segs.length || 1) * 100));
  },

  // ── final
  finish() {
    clearInterval(this.timer); this.stopFrames(); this.releaseWake();
    this.result = this.summarize();
    sfx.done(); say('¡Entrenamiento completado! Muy bien.');
    this.renderDone();
  },
  // calorías y tiempos por movimiento de cada participante, a partir del tiempo real de cada paso (this.log)
  summarize() {
    const pids = this.duo ? people(this.plan).map(x => x.profile) : [S().activeProfile];
    const kcal = {}, moveSecs = {}, approx = [];
    pids.forEach((pid, k) => {
      const items = [], ms = {};
      Object.values(this.log).forEach(e => {
        const id = e.who[this.duo ? k : 0] || null;
        items.push({ secs: e.secs, kind: e.kind, moveId: id });
        if (e.kind === 'work' && id) ms[id] = (ms[id] || 0) + e.secs;
      });
      const r = sessionKcal(store.profile(pid), items, moveLookup, kcalOpts());
      kcal[pid] = r.kcal; if (r.estimated && !approx.includes(pid)) approx.push(pid);
      moveSecs[pid] = Object.fromEntries(Object.entries(ms).map(([id, v]) => [id, Math.round(v)]));
    });
    return { pids, kcal, approx, moveSecs };
  },
  renderDone() {
    const el = $('#player'); el.className = 'on t-done';
    const pp = this.duo ? people(this.plan) : [{ profile: S().activeProfile, name: store.active.name }];
    const R = this.result || (this.result = this.summarize());
    const who = pp.map(x => x.name).filter(Boolean).join(' y ');
    const sum = { secs: Math.round(this.active), worked: this.worked, blocks: this.doneSections.size, planId: this.plan.id, profiles: R.pids, kcal: R.kcal, result: R };
    const wpid = R.pids.includes(S().activeProfile) ? S().activeProfile : R.pids[0], goal = goalOf(wpid), week = weekSessions(wpid).length + 1;
    const ms = newMilestoneFor(wpid, R, this.sessionStart, Math.round(this.active));
    const streakNow = streakWeeksOf([...profEntries(wpid), { date: new Date(this.sessionStart).toISOString() }], goal);
    sum.milestone = ms;
    const kcalCell = (x, label) => `<div><b>${kcalText(R.kcal[x.profile]) ? `≈ ${R.kcal[x.profile]}` : '—'}</b><span>${label}</span></div>`;
    const kcals = this.duo ? pp.map(x => kcalCell(x, esc(x.name) + ' · kcal')).join('') : kcalCell(pp[0], `kcal${R.approx.length ? ' estimadas' : ''} <button class="p-info-btn" data-a="kcalInfo" aria-label="Cómo se estiman las calorías">${I.info}</button>`);
    el.innerHTML = `<div class="p-top"><span></span><div class="p-info"><b>${esc(this.plan.name)}</b></div><span></span></div>
      <div class="p-center done"><div class="p-done-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="halo" cx="60" cy="60" r="56"/><circle class="disc" cx="60" cy="60" r="44"/><path class="tick" d="M41 62l14 14 25-29"/></svg></div>
        <h2 class="rise d1">Listo${who ? ', ' + esc(who) : ''}</h2><p class="sub rise d1">Entrenamiento completado</p>
        <div class="p-stats rise d2"><div><b>${clock(this.active)}</b><span>Duración</span></div>${kcals}</div>
        <p class="p-weekline rise d3">${week >= goal ? '¡Meta semanal cumplida!' : `Esta semana: ${week} de ${goal}`}${week >= goal && streakNow >= 2 ? ` · Semana ${streakNow} seguida` : ''}</p>
        <div id="pDoneExtra" class="rise d3">${doneExtras(sum)}</div></div>
      <div class="p-ctl col rise d3"><button class="btn primary big cta" data-a="pSave">Terminar</button></div>`;
  },
  record(partial) {
    const R = this.result || this.summarize();
    S().history.push({ id: uid(), date: new Date(this.sessionStart).toISOString(), planId: this.plan.id, planName: this.plan.name, secs: Math.round(this.active), worked: this.worked, total: this.totalWork, sections: [...this.doneSections], blocks: this.doneSections.size, mood: this.mood, note: ($('#pNote') || {}).value || '', partial: !!partial, profiles: R.pids, kcal: R.kcal, ...(R.approx.length ? { kcalApprox: R.approx } : {}), moveSecs: R.moveSecs, ...(this.duo ? { people: people(this.plan).map(x => x.name) } : {}) });
    commitMilestones(R.pids, this.sessionStart, Math.round(this.active), R);
    store.save();
  },
  save() { this.record(false); this.close(); toast('Sesión guardada'); },
  askClose() {
    if (!this.paused) this.toggle();
    actionSheet('¿Terminar el entrenamiento?', [
      { label: 'Terminar y guardar', fn: () => { this.record(true); this.close(); toast('Sesión guardada'); } },
      { label: 'Salir sin guardar', destructive: true, fn: () => this.close() },
    ]);
  },
  close() {
    clearInterval(this.timer); this.stopFrames(); this.releaseWake();
    try { speechSynthesis.cancel(); } catch (e) { }
    $('#player').className = ''; $('#player').innerHTML = ''; document.body.classList.remove('playing'); applyTheme();
    this.steps = null; render();
  },
};

// Gancho para fases 4-5: devuelve HTML (kcal estimadas, hitos, progreso por grupo muscular) que se muestra bajo la meta semanal.
const doneExtras = sum => {
  const m = sum.milestone && MILESTONE_BY_ID[sum.milestone]; if (!m) return '';
  return `<div class="p-ms" role="status"><span class="ic">${I[m.icon] || I.sparkle}</span><span class="tx"><small>Logro desbloqueado</small><b>${esc(m.name)}</b><em>${esc(m.desc)}</em></span></div>`;
};
// hitos que esta sesión desbloquea (aún sin guardar): se muestra solo el más importante
function sessionEntry(R, start, secs) { return { date: new Date(start).toISOString(), secs, profiles: R.pids, kcal: R.kcal, moveSecs: R.moveSecs }; }
function newMilestoneFor(pid, R, start, secs) {
  const ids = newMilestones([...profEntries(pid), sessionEntry(R, start, secs)], pid, goalOf(pid), store.profile(pid).milestones || {});
  return ids.length ? ids[ids.length - 1] : null;
}
// al guardar la sesión: registra en silencio todos los hitos nuevos de cada participante
function commitMilestones(pids, start, secs, R) {
  pids.forEach(pid => {
    const pr = store.profile(pid), have = pr.milestones || (pr.milestones = {});
    // la sesión ya está en el historial: se evalúa el historial completo
    newMilestones(profEntries(pid), pid, goalOf(pid), have).forEach(id => { have[id] = localISO(start); });
  });
}

// "Ronda 1/3" (solo si el bloque tiene más de una ronda) + puntos del ejercicio dentro de la ronda
const progHTML = s => {
  if (s.type !== 'work' || s.duo) return '';
  const n = s.items, dots = n <= 8 ? Array.from({ length: n }, (_, k) => `<i class="${k < s.itemIdx ? 'd' : k === s.itemIdx ? 'c' : ''}"></i>`).join('') : `<span>${s.itemIdx + 1}/${n}</span>`;
  return `<div class="p-prog">${s.rounds > 1 ? `<span>Ronda ${s.round}/${s.rounds}</span>` : ''}<span class="dots" role="img" aria-label="Ejercicio ${s.itemIdx + 1} de ${n}">${dots}</span></div>`;
};
function bigRing() {
  const size = 240, w = 14, r = (size - w) / 2, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}"><circle cx="120" cy="120" r="${r}" class="ring-bg" stroke-width="${w}" fill="none"/><circle cx="120" cy="120" r="${r}" class="ring-fg" data-c="${c.toFixed(1)}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="0" transform="rotate(-90 120 120)"/></svg>`;
}

function startSession(pid, onlySection = null) {
  const p = store.plan(pid);
  if (!p || !p.sections.some(s => s.items.length)) { toast('Este plan no tiene movimientos'); return; }
  unlockAudio(); stopAnim();
  if (onlySection == null && S().activePlanId !== p.id) { S().activePlanId = p.id; store.save(); } // Entrenar sugiere el último plan usado
  store.persist().then(v => { ui.persisted = v; });
  P.start(p, onlySection);
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && P.steps) { P.requestWake(); P.update(); } });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

applyTheme();
render();
store.persist().then(v => { ui.persisted = v; if (top().v === 'settingsStorage') render(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
