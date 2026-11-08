import { MOVES, MOVE_BY_ID, CATEGORIES, EQUIPMENT } from '../data/catalog.js';
import { store, uid, clone } from './store.js';
import { buildSteps, estimateSecs, sectionEstimate, doseOf, doseText, fmtSecs, clock, isDuo } from './engine.js';
import { configure as configureAudio, unlock as unlockAudio, sfx, say } from './audio.js';
import { I } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = () => store.state;
const set = () => S().settings;
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
const ui = { q: '', cat: 'all', editing: {}, cal: null, moveShow: {}, dismissedInstall: sessionStorage.getItem('ptw.noinstall') === '1', persisted: null };
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
const today = () => new Date();
const dayKey = d => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
const weekStart = d => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - wd); return x; };

// ── imágenes y fotogramas
const imgOf = (m, i, model = set().model) => (model === 'm' && m.male) ? `img/moves/m/${m.id}-${i + 1}.webp` : m.positions[i].img;
const keyIdx = m => m.positions.map((p, i) => p.mid ? -1 : i).filter(i => i >= 0);
const thumb = (m, n = 1, model) => `<span class="thumb"><img src="${imgOf(m, keyIdx(m)[n - 1] ?? 0, model)}" alt="" loading="lazy"></span>`;
const breathHTML = ps => `${I.wind}<b>${ps.breath === 'in' ? 'INHALA' : 'EXHALA'}</b><span>${esc(ps.verb)}</span>`;
function seqOf(m) { const f = [...m.positions.keys()]; return f.length > 2 ? f.concat(f.slice(1, -1).reverse()) : f; } // ida y vuelta
const frameMs = (m, i) => set().animSpeed * 1000 * (m.positions[i].mid ? 0.45 : 1);
// Recorre los fotogramas del movimiento (posición 1 → intermedias → final → vuelta). Devuelve una función para detener.
function runFrames(m, onFrame, isPaused = () => false, start = 0) {
  const seq = seqOf(m); let k = Math.max(0, seq.indexOf(start)), alive = true, t;
  const tick = () => { if (!alive) return; if (!isPaused()) { k = (k + 1) % seq.length; onFrame(seq[k]); } t = setTimeout(tick, frameMs(m, seq[k])); };
  t = setTimeout(tick, frameMs(m, seq[k]));
  return () => { alive = false; clearTimeout(t); };
}
// caja de imagen con fotogramas apilados + borde que indica la respiración
function mediaHTML(m, cur, { id = '', cls = 'p-media', model, extra = '' } = {}) {
  const ps = m.positions[cur];
  return `<div class="${cls}" ${id ? `id="${id}"` : ''}>${m.positions.map((p, k) => `<img src="${imgOf(m, k, model)}" alt="${esc(p.label)}" class="${k === cur ? 'on' : ''}">`).join('')}<div class="glow ${ps.breath}"></div><div class="p-breath ${ps.breath}">${breathHTML(ps)}</div>${extra}</div>`;
}
function setFrame(box, m, i) {
  if (!box) return;
  box.querySelectorAll(':scope > img').forEach((im, k) => im.classList.toggle('on', k === i));
  const ps = m.positions[i];
  const g = box.querySelector('.glow'); if (g) g.className = `glow ${ps.breath}`;
  const b = box.querySelector('.p-breath'); if (b) { b.className = `p-breath ${ps.breath}`; b.innerHTML = breathHTML(ps); }
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
const people = p => (p.people && p.people.length === 2) ? p.people : [{ name: set().name || 'Persona 1', model: 'f' }, { name: 'Pareja', model: 'm' }];

// ───────────────────────── VISTAS
const VIEWS = {
  home() {
    const s = S(), p = store.plan(s.activePlanId);
    const now = today(), ws = weekStart(now);
    const week = s.history.filter(h => new Date(h.date) >= ws);
    const trainedDays = new Set(week.map(h => (new Date(h.date).getDay() + 6) % 7));
    const goal = 2;
    const dateStr = now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    let html = '';
    if (!standalone() && !ui.dismissedInstall) html += `<div class="card install">${I.share}<div><b>Instala la app para no perder datos</b><p>Estás en el navegador. Safari puede borrar los datos si no abres la página en 7 días, y no los comparte con la app instalada. Toca <b>Compartir → Agregar a inicio</b> y usa siempre el ícono.</p></div><button class="iconbtn" data-a="dismissInstall" aria-label="Cerrar">${I.x}</button></div>`;
    const daysSinceBackup = s.settings.lastBackup ? (Date.now() - new Date(s.settings.lastBackup)) / 864e5 : Infinity;
    if (standalone() && s.history.length >= 3 && daysSinceBackup > 30) html += `<div class="card install">${I.shield}<div><b>Guarda un respaldo</b><p>Tus datos viven solo en este teléfono. Exporta un respaldo por si cambias o pierdes el teléfono.</p><button class="btn tinted small" data-a="exportData">Exportar respaldo</button></div></div>`;
    html += `<div class="card week"><div class="wk-top"><div><p class="eyebrow">Esta semana</p><p class="wk-num"><b>${week.length}</b> de ${goal} sesiones</p></div><div class="ringmini">${ringSvg(Math.min(1, week.length / goal), 54, 6)}</div></div>
      <div class="days">${DAYS.map((d, i) => `<span class="day ${trainedDays.has(i) ? 'on' : ''} ${i === (now.getDay() + 6) % 7 ? 'today' : ''}"><i>${trainedDays.has(i) ? I.check : ''}</i>${d}</span>`).join('')}</div></div>`;
    if (p) {
      const nSec = p.sections.length, nMov = p.sections.reduce((a, x) => a + x.items.length, 0);
      html += `<div class="card hero"><div class="hero-img"><img src="img/cover.webp" alt="Ilustración de Anita"></div><div class="hero-body">
        <p class="eyebrow">Tu plan${isDuo(p) ? ' · en pareja' : ''}</p><h2>${esc(p.name)}</h2><p class="muted">${esc(isDuo(p) ? people(p).map(x => x.name).join(' + ') : (p.subtitle || ''))}</p>
        <div class="meta"><span>${I.clock}${planMins(p)}</span><span>${I.grid}${nSec} bloques</span><span>${I.figure}${nMov} mov.</span></div>
        <button class="btn primary big" data-a="start" data-id="${p.id}">${I.play}Comenzar</button>
        <button class="btn plain" data-a="openPlan" data-id="${p.id}">Ver y editar plan</button></div></div>`;
      html += group(p.sections.map((sec, i) => row({ icon: `<span class="badge">${BADGE[i] || i + 1}</span>`, title: esc(sec.name), sub: secSub(sec), right: `<span class="muted">${fmtMin(sectionEstimate(p, i, set()))}</span>`, chev: true, a: 'openPlan', data: `data-id="${p.id}"` })), { header: 'Bloques de hoy' });
    }
    html += group([...s.plans.map(pl => row({ icon: `<span class="ri-dot ${pl.id === s.activePlanId ? 'on' : ''}">${pl.id === s.activePlanId ? I.check : ''}</span>`, title: esc(pl.name) + (isDuo(pl) ? ' <span class="pill">Dúo</span>' : ''), sub: `${pl.sections.length} bloques · ${planMins(pl)}`, chev: true, a: 'openPlan', data: `data-id="${pl.id}"` })),
      row({ icon: `<span class="ri-plus">${I.plus}</span>`, title: '<span class="accent">Crear plan nuevo</span>', a: 'newPlan' })], { header: 'Mis planes', footer: 'Los planes usan movimientos del catálogo. Puedes crear planes individuales o en pareja.' });
    return { title: `Hola, ${set().name || ''}`.trim(), kicker: dateStr, large: true, html };
  },

  plan(t) {
    const p = store.plan(t.id);
    if (!p) return { title: 'Plan', html: '<p class="empty">Este plan ya no existe.</p>' };
    const editing = !!ui.editing[p.id], duo = isDuo(p), pp = people(p);
    const right = `<button class="navbtn strong" data-a="toggleEdit" data-id="${p.id}">${editing ? 'OK' : 'Editar'}</button>`;
    let html = `<div class="plan-head"><h1>${esc(p.name)}</h1>${duo ? `<p class="muted">${I.figure} ${esc(pp[0].name)} + ${esc(pp[1].name)}</p>` : (p.subtitle ? `<p class="muted">${esc(p.subtitle)}</p>` : '')}
      <div class="meta"><span>${I.clock}${planMins(p)}</span>${p.frequency ? `<span>${I.calendar}${esc(p.frequency)}</span>` : ''}${duo ? '<span class="pill">En pareja</span>' : ''}${p.id === S().activePlanId ? `<span class="pill">Plan principal</span>` : ''}</div>
      <div class="btnrow"><button class="btn primary" data-a="start" data-id="${p.id}">${I.play}Comenzar</button><button class="btn tinted icon" data-a="planMenu" data-id="${p.id}" aria-label="Más opciones">${I.more}</button></div>
      ${p.goal ? `<p class="goal">${esc(p.goal)}</p>` : ''}</div>`;
    p.sections.forEach((sec, si) => {
      const head = `<span class="gh-row"><span class="badge sm">${BADGE[si] || si + 1}</span><span class="gh-name">${esc(sec.name)}</span><span class="gh-meta">${secSub(sec)}</span>${editing ? `<button class="mini" data-a="editSection" data-p="${p.id}" data-s="${si}" aria-label="Editar bloque">${I.pencil}</button>` : `<button class="mini" data-a="startSection" data-p="${p.id}" data-s="${si}" aria-label="Comenzar solo este bloque">${I.play}</button>`}</span>`;
      const rows = sec.items.map((it, ii) => {
        const m = MOVE_BY_ID[it.move]; if (!m) return '';
        const mb = duo && it.b ? MOVE_BY_ID[it.b.move] : null;
        const d = doseOf(it);
        const icon = duo && mb ? `<span class="duo-th">${thumb(m, 1, pp[0].model)}${thumb(mb, 1, pp[1].model)}</span>` : thumb(m);
        const title = duo && mb ? (mb.id === m.id ? esc(m.name) : `${esc(m.name)} <span class="muted">/</span> ${esc(mb.name)}`) : esc(m.name);
        const sub = duo && mb ? `${esc(pp[0].name)}: ${esc(doseText(d))} · ${esc(pp[1].name)}: ${esc(doseText(doseOf(it.b)))}` : esc(doseText(d)) + (d.note ? ` · ${esc(d.note)}` : '');
        const base = `data-p="${p.id}" data-s="${si}" data-i="${ii}"`;
        if (editing) return `<div class="row edit ${duo ? 'duorow' : ''}"><button class="del" data-a="delItem" ${base} aria-label="Quitar">${I.minusCircle}</button>${icon}<button class="rt plain" data-a="editItem" ${base}><span class="rtt">${title}</span><span class="rts accent">${sub} · editar</span></button><span class="reorder"><button data-a="moveItem" ${base} data-d="-1" ${ii === 0 ? 'disabled' : ''} aria-label="Subir">${I.up}</button><button data-a="moveItem" ${base} data-d="1" ${ii === sec.items.length - 1 ? 'disabled' : ''} aria-label="Bajar">${I.down}</button></span></div>`;
        return row({ icon, title: `${sec.kind === 'circuit' && BADGE[si] !== 'A' ? `<span class="ord">${BADGE[si]}.${ii + 1}</span>` : ''}${title}`, sub, chev: true, a: duo ? 'editItem' : 'openMove', data: duo ? base : `data-id="${m.id}"`, cls: 'withthumb' + (duo ? ' duorow' : '') });
      });
      if (editing) rows.push(row({ icon: `<span class="ri-plus">${I.plus}</span>`, title: '<span class="accent">Añadir movimientos</span>', a: 'addMoves', data: `data-p="${p.id}" data-s="${si}"` }));
      if (!sec.items.length && !editing) rows.push(row({ title: '<span class="muted">Sin movimientos</span>' }));
      html += group(rows, { header: head, footer: !editing && sec.note ? esc(sec.note) : '' });
    });
    if (editing) html += group([row({ icon: `<span class="ri-plus">${I.plus}</span>`, title: '<span class="accent">Añadir bloque</span>', a: 'addSection', data: `data-p="${p.id}"` })]);
    return { title: p.name, backLabel: 'Entrenar', right, html };
  },

  catalog() {
    const chips = [['all', 'Todos'], ...CATEGORIES.map(c => [c.id, c.name])];
    const html = `<div class="searchbar">${I.search}<input type="search" placeholder="Buscar movimiento o músculo" value="${esc(ui.q)}" data-in="search" autocomplete="off"></div>
      <div class="chips">${chips.map(([id, n]) => `<button class="chip ${ui.cat === id ? 'on' : ''}" data-a="cat" data-id="${id}">${n}</button>`).join('')}</div>
      <div id="catList">${catalogList()}</div>`;
    return { title: 'Movimientos', large: true, right: `<button class="navbtn" data-a="muscleMap">Músculos</button>`, html };
  },

  move(t) {
    const m = MOVE_BY_ID[t.id];
    const keys = keyIdx(m);
    const cur = ui.moveShow[m.id] ?? 0;
    const inPlans = [];
    S().plans.forEach(p => p.sections.forEach(sec => sec.items.forEach(it => { if (it.move === m.id || (it.b && it.b.move === m.id)) inPlans.push(`${p.name} · ${sec.name}`); })));
    const playing = anim && anim.id === m.id;
    let html = mediaHTML(m, cur, { id: 'mv', cls: 'viewer', extra: m.imageStatus !== 'final' ? `<em class="ph">${m.imageStatus === 'vector' ? 'dibujo provisional' : 'ilustración provisional'}</em>` : '' });
    html += `<div class="viewer-ctl">${seg('showPos', `data-id="${m.id}"`, keys.map((k, n) => [k, `${n + 1} · ${esc(m.positions[k].label)}`]), playing ? -1 : cur)}<button class="iconbtn tinted" data-a="animMove" data-id="${m.id}" aria-label="${playing ? 'Detener animación' : 'Ver animación'}">${playing ? I.pause : I.play}</button></div>
      <h1 class="detail-title">${esc(m.name)}</h1>${m.alias ? `<p class="muted center">${esc(m.alias)}</p>` : ''}
      <div class="keycue">${I.check}<span>${esc(m.cue)}</span></div>`;
    html += group([row({ title: 'En foco', right: `<span class="tags">${m.focus.map(f => `<span class="tag"><u></u>${esc(f)}</span>`).join('')}</span>`, cls: 'tall' }),
      ...(m.support.length ? [row({ title: 'Apoyo', right: `<span class="tags">${m.support.map(f => `<span class="tag"><u class="s"></u>${esc(f)}</span>`).join('')}</span>`, cls: 'tall' })] : []),
      row({ title: 'Implementos', right: `<span class="muted">${m.equipment.map(e => EQUIPMENT[e]).join(', ')}${m.load ? ` · ${esc(m.load)}` : ''}</span>` }),
      row({ title: 'Dosis sugerida', right: `<span class="muted">${esc(doseText(m.dose))}</span>` })], { header: 'Detalles' });
    html += group(m.tips.map((tp, i) => `<div class="row tip"><span class="num">${i + 1}</span><span class="rt"><span class="rtt">${esc(tp)}</span></span></div>`), { header: 'Técnica' });
    html += group(keys.map((k, n) => { const ps = m.positions[k]; return row({ icon: `<span class="badge sm">${n + 1}</span>`, title: esc(ps.label), right: `<span class="breath-txt ${ps.breath}">${ps.breath === 'in' ? 'Inhala' : 'Exhala'} · ${esc(ps.verb)}</span>` }); }), { header: 'Respiración', footer: 'Indica cómo respirar para llegar a cada posición. El borde de la imagen se pone azul al inhalar y rosado al exhalar.' });
    html += group([...inPlans.map(x => row({ title: esc(x) })), row({ icon: `<span class="ri-plus">${I.plus}</span>`, title: '<span class="accent">Añadir a un plan</span>', a: 'addToPlan', data: `data-id="${m.id}"` })], { header: 'En tus planes' });
    return { title: m.name, backLabel: nav.tab === 'moves' ? 'Movimientos' : 'Atrás', html, after: () => { if (playing) startAnim(m.id); } };
  },

  history() {
    const h = [...S().history].sort((a, b) => new Date(b.date) - new Date(a.date));
    const now = today();
    const month = h.filter(x => { const d = new Date(x.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const mins = Math.round(h.reduce((a, x) => a + (x.secs || 0), 0) / 60);
    if (!ui.cal) ui.cal = { y: now.getFullYear(), m: now.getMonth() };
    let html = `<div class="stats"><div><b>${h.length}</b><span>Sesiones</span></div><div><b>${month.length}</b><span>Este mes</span></div><div><b>${mins}</b><span>Minutos</span></div><div><b>${streakWeeks()}</b><span>Semanas seguidas</span></div></div>`;
    html += calendarHTML();
    if (!h.length) html += `<div class="emptystate"><img src="img/cover.webp" alt=""><p><b>Aún no hay sesiones</b></p><p class="muted">Cuando termines un entrenamiento aparecerá aquí.</p></div>`;
    else {
      const byMonth = {};
      h.forEach(x => { const k = new Date(x.date).toLocaleDateString('es', { month: 'long', year: 'numeric' }); (byMonth[k] = byMonth[k] || []).push(x); });
      Object.entries(byMonth).forEach(([k, xs]) => {
        html += group(xs.map(x => row({ icon: `<span class="mood">${x.mood || '✓'}</span>`, title: esc(x.planName), sub: `${new Date(x.date).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtMin(x.secs)}${x.people ? ' · ' + esc(x.people.join(' + ')) : ''}${x.partial ? ' · parcial' : ''}`, chev: true, a: 'openSession', data: `data-id="${x.id}"` })), { header: k });
      });
    }
    return { title: 'Historial', large: true, html };
  },

  settings() {
    const st = set();
    let html = '';
    html += group([row({ title: 'Tu nombre', right: `<input class="inline" data-in="name" value="${esc(st.name)}" placeholder="Nombre" autocomplete="off">` })], { header: 'Perfil' });
    html += soundGroup(st) + timesGroup(st);
    html += group([
      row({ title: 'Ejercicios por repeticiones', right: seg('setSeg', 'data-k="repsMode"', [['manual', 'Manual'], ['auto', 'Con tiempo']], st.repsMode) }),
      row({ title: 'Segundos por repetición', sub: 'Para el modo «Con tiempo» y los planes en pareja', right: stepper('setStep', 'data-k="secsPerRep" data-min="1" data-max="8" data-st="1"', `${st.secsPerRep} s`) }),
    ], { header: 'Repeticiones', footer: st.repsMode === 'manual' ? 'Manual: haces tus repeticiones a tu ritmo y tocas «Hecho».' : 'Con tiempo: el reloj avanza solo (repeticiones máximas × segundos).' });
    html += group([row({ title: 'Ritmo compartido', right: seg('setSeg', 'data-k="duoGovern"', [['time', 'Manda el tiempo'], ['reps', 'Mandan las reps']], st.duoGovern) })],
      { header: 'Planes en pareja', footer: st.duoGovern === 'time' ? 'Ambas personas trabajan el mismo tiempo: las repeticiones se convierten a segundos y se usa el ejercicio más largo.' : 'Si alguna hace repeticiones, el reloj espera a que las dos toquen «Hecho».' });
    html += group([
      row({ title: 'Dibujos', right: seg('setSeg', 'data-k="model"', [['f', 'Mujer'], ['m', 'Hombre']], st.model) }),
      row({ title: 'Mantener pantalla encendida', right: toggle('set:wakeLock', st.wakeLock) }),
      row({ title: 'Animar movimientos', sub: 'Alterna las posiciones durante el ejercicio', right: toggle('set:animate', st.animate) }),
      row({ title: 'Velocidad de la animación', right: stepper('setStep', 'data-k="animSpeed" data-min="0.8" data-max="4" data-st="0.4"', `${st.animSpeed.toFixed(1)} s`) }),
      row({ title: 'Apariencia', right: seg('setSeg', 'data-k="theme"', [['auto', 'Auto'], ['light', 'Clara'], ['dark', 'Oscura']], st.theme) }),
    ], { header: 'Pantalla', footer: 'Si un movimiento aún no tiene dibujo masculino, se muestra el femenino.' });
    const persisted = ui.persisted;
    html += group([
      row({ title: 'Dónde se guardan', right: `<span class="muted">${standalone() ? 'App instalada' : 'Navegador'}</span>` }),
      row({ title: 'Protección contra borrado', right: `<span class="${persisted ? 'ok' : 'muted'}">${persisted == null ? '…' : persisted ? 'Activa' : (standalone() ? 'Instalada (sin límite)' : 'No')}</span>` }),
      row({ title: 'Último respaldo', right: `<span class="muted">${st.lastBackup ? new Date(st.lastBackup).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Nunca'}</span>` }),
      row({ title: 'Exportar respaldo', sub: 'Guarda planes, historial y ajustes en un archivo', a: 'exportData', chev: true }),
      row({ title: 'Importar respaldo', a: 'importData', chev: true }),
      row({ title: '<span class="danger">Borrar todos los datos</span>', a: 'resetAll' }),
    ], { header: 'Datos', footer: 'Todo se guarda solo en este teléfono, sin cuentas, y no caduca mientras uses la app instalada en la pantalla de inicio. En Safari (sin instalar), el iPhone puede borrar los datos tras 7 días sin abrirla. Safari y la app instalada no comparten datos.' });
    html += group([row({ title: 'Cómo instalar en el iPhone', a: 'installHelp', chev: true }), row({ title: 'Versión', right: '<span class="muted">1.1</span>' })], { header: 'Acerca de' });
    return { title: 'Ajustes', large: true, html };
  },
};

function soundGroup(st) {
  return group([
    row({ title: 'Sonidos', right: toggle('set:sound', st.sound) }),
    row({ title: 'Pitidos antes de terminar', sub: 'Últimos segundos de cada ejercicio y descanso', right: stepper('setStep', 'data-k="beepLast" data-min="0" data-max="10" data-st="1"', st.beepLast ? `${st.beepLast} s` : 'No') }),
    row({ title: 'Volumen', right: `<input type="range" min="0.1" max="1" step="0.1" value="${st.volume}" data-in="set:volume" class="slider">` }),
    row({ title: 'Sonar en modo silencio', sub: 'Si está apagado, los sonidos se mezclan con tu música', right: toggle('set:ignoreSilent', st.ignoreSilent) }),
    row({ title: 'Voz guía', sub: 'Anuncia cada ejercicio en voz alta', right: toggle('set:voice', st.voice) }),
    row({ title: 'Probar sonido', a: 'testSound', right: I.speaker, cls: 'accent-row' }),
  ], { header: 'Sonido' });
}
function timesGroup(st) {
  return group([
    row({ title: 'Cuenta regresiva inicial', right: stepper('setStep', 'data-k="getReady" data-min="0" data-max="30" data-st="1"', `${st.getReady} s`) }),
    row({ title: 'Pausa entre ejercicios', right: stepper('setStep', 'data-k="transition" data-min="0" data-max="60" data-st="5"', `${st.transition} s`) }),
    row({ title: 'Cambio de lado', right: stepper('setStep', 'data-k="switchSides" data-min="0" data-max="20" data-st="1"', `${st.switchSides} s`) }),
    row({ title: 'Cambio de posición', sub: 'Entre fases de un mismo ejercicio', right: stepper('setStep', 'data-k="phaseGap" data-min="0" data-max="15" data-st="1"', `${st.phaseGap} s`) }),
    row({ title: 'Descanso entre rondas', sub: st.roundRest ? 'Igual para todos los bloques' : 'El de cada bloque del plan', right: stepper('setStep', 'data-k="roundRest" data-min="0" data-max="180" data-st="15"', st.roundRest ? `${st.roundRest} s` : 'Plan') }),
    row({ title: 'Descanso entre bloques', right: stepper('setStep', 'data-k="sectionRest" data-min="0" data-max="180" data-st="15"', `${st.sectionRest} s`) }),
  ], { header: 'Tiempos', footer: 'Los cambios se aplican de inmediato, también durante un entrenamiento en curso (botón ⚙︎ del reproductor).' });
}

function catalogList() {
  const q = ui.q.trim().toLowerCase();
  const list = MOVES.filter(m => (ui.cat === 'all' || m.category === ui.cat) && (!q || (m.name + ' ' + (m.alias || '') + ' ' + m.focus.join(' ')).toLowerCase().includes(q)));
  return `<div class="grid">${list.map(m => `<button class="mcard" data-a="openMove" data-id="${m.id}"><span class="mimg"><img src="${imgOf(m, 0)}" alt="" loading="lazy">${m.imageStatus !== 'final' ? '<em class="ph">provisional</em>' : ''}</span><span class="mname">${esc(m.name)}</span><span class="mfocus">${esc(m.focus.join(' · '))}</span></button>`).join('')}</div>
    ${list.length ? `<p class="gf center">${list.length} movimientos</p>` : '<p class="empty">Sin resultados</p>'}`;
}

function secSub(sec) {
  const n = sec.items.length, rest = set().roundRest || sec.rest;
  return sec.kind === 'circuit' ? `Circuito · ${sec.rounds} rondas · ${n} ej.${rest ? ` · descanso ${rest} s` : ''}` : `Secuencia · ${n} ejercicios`;
}

function ringSvg(frac, size = 54, w = 6) {
  const r = (size - w) / 2, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${w}" fill="none"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - frac)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}

function streakWeeks() {
  const h = S().history; if (!h.length) return 0;
  const weeks = new Set(h.map(x => weekStart(x.date).getTime()));
  const w = weekStart(today()); if (!weeks.has(w.getTime())) w.setDate(w.getDate() - 7);
  let n = 0; while (weeks.has(w.getTime())) { n++; w.setDate(w.getDate() - 7); }
  return n;
}

function calendarHTML() {
  const { y, m } = ui.cal;
  const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  const off = (first.getDay() + 6) % 7;
  const done = new Set(S().history.map(x => dayKey(x.date)));
  const tk = dayKey(today());
  let cells = '';
  for (let i = 0; i < off; i++) cells += '<span></span>';
  for (let d = 1; d <= days; d++) { const k = `${y}-${m + 1}-${d}`; cells += `<span class="cd ${done.has(k) ? 'on' : ''} ${k === tk ? 'today' : ''}">${d}</span>`; }
  const t0 = first.toLocaleDateString('es', { month: 'long', year: 'numeric' }), title = t0.charAt(0).toUpperCase() + t0.slice(1);
  return `<div class="card cal"><div class="cal-head"><b>${title}</b><span><button class="iconbtn" data-a="calMove" data-d="-1" aria-label="Mes anterior">${I.chevL}</button><button class="iconbtn" data-a="calMove" data-d="1" aria-label="Mes siguiente">${I.chevR}</button></span></div><div class="cal-grid">${DAYS.map(d => `<i>${d}</i>`).join('')}${cells}</div></div>`;
}

// ───────────────────────── animación en el detalle del movimiento
function startAnim(id) {
  stopAnim(false);
  const m = MOVE_BY_ID[id];
  const stop = runFrames(m, i => { ui.moveShow[id] = i; setFrame($('#mv'), m, i); if (!$('#mv')) stopAnim(); }, () => false, ui.moveShow[id] ?? 0);
  anim = { id, stop };
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
  const p = store.plan(pid), pp = people(p);
  return `<div class="sheet-head"><span></span><h2>Participantes</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div><div class="sheet-body">
    ${pp.map((x, k) => group([row({ title: 'Nombre', right: `<input class="inline" data-in="personName" data-p="${pid}" data-k="${k}" value="${esc(x.name)}">` }), row({ title: 'Dibujos', right: seg('personModel', `data-p="${pid}" data-k="${k}"`, [['f', 'Mujer'], ['m', 'Hombre']], x.model) })], { header: k === 0 ? 'Persona 1 · imagen de arriba' : 'Persona 2 · imagen de abajo' })).join('')}
    <p class="gf">Cada persona puede hacer un ejercicio distinto en el mismo turno: edita cada ejercicio del plan y elige la persona arriba.</p></div>`;
}

let picker = null;
function pickerList() {
  const q = picker.q.toLowerCase();
  const list = MOVES.filter(m => (picker.cat === 'all' || m.category === picker.cat) && (!q || (m.name + ' ' + m.focus.join(' ')).toLowerCase().includes(q)));
  return group(list.map(m => row({ icon: thumb(m), title: esc(m.name), sub: esc(m.focus.join(' · ')), right: `<span class="checkc ${picker.sel.includes(m.id) ? 'on' : ''}">${picker.sel.includes(m.id) ? I.check : ''}</span>`, a: 'pickerToggle', data: `data-id="${m.id}"`, cls: 'withthumb' })));
}
function pickerBtnLabel() { return picker.mode === 'replace' ? 'Cambiar' : `Añadir${picker.sel.length ? ` (${picker.sel.length})` : ''}`; }
function pickerHTML() {
  return `<div class="sheet-head"><button class="navbtn" data-a="closeSheet">Cancelar</button><h2>${picker.mode === 'replace' ? 'Cambiar' : 'Añadir'}</h2><button class="navbtn strong" data-a="pickerDone" ${picker.sel.length ? '' : 'disabled'}>${pickerBtnLabel()}</button></div>
    <div class="sheet-body"><div class="searchbar">${I.search}<input type="search" placeholder="Buscar" value="${esc(picker.q)}" data-in="pickerSearch"></div>
    <div class="chips">${[['all', 'Todos'], ...CATEGORIES.map(c => [c.id, c.name])].map(([id, n]) => `<button class="chip ${picker.cat === id ? 'on' : ''}" data-a="pickerCat" data-id="${id}">${n}</button>`).join('')}</div>
    <div id="pickList">${pickerList()}</div></div>`;
}

function planSave() { store.save(); render(); }
const newItem = (id, duo) => duo ? { move: id, dose: clone(MOVE_BY_ID[id].dose), b: { move: id, dose: clone(MOVE_BY_ID[id].dose) } } : { move: id, dose: clone(MOVE_BY_ID[id].dose) };
function toDuo(p) {
  const c = clone(p); c.id = uid(); c.mode = 'duo'; c.builtin = false; c.name = `${p.name} · en pareja`;
  c.people = [{ name: set().name || 'Persona 1', model: 'f' }, { name: 'Pareja', model: 'm' }];
  c.sections.forEach(sec => sec.items.forEach(it => { it.dose = clone(doseOf(it)); it.b = { move: it.move, dose: clone(it.dose) }; }));
  return c;
}

// ───────────────────────── ACCIONES
const A = {
  tab: el => { stopAnim(); switchTab(el.dataset.id); },
  back: () => { stopAnim(); back(); },
  openPlan: el => { if (nav.tab !== 'train') nav.tab = 'train'; push('plan', { id: el.dataset.id }); },
  openMove: el => { stopAnim(); push('move', { id: el.dataset.id }); },
  sheetOpenMove: el => { closeSheet(); if (P.steps) return; push('move', { id: el.dataset.id }); },
  dismissInstall: () => { ui.dismissedInstall = true; sessionStorage.setItem('ptw.noinstall', '1'); render(); },
  closeSheet: () => closeSheet(),
  asPick: el => { const a = actionSheet.actions[+el.dataset.i]; closeSheet(); setTimeout(() => a.fn(), 50); },
  cat: el => { ui.cat = el.dataset.id; render(); },
  calMove: el => { let { y, m } = ui.cal; m += +el.dataset.d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } ui.cal = { y, m }; render(); },
  showPos: el => { stopAnim(); ui.moveShow[el.dataset.id] = +el.dataset.v; render(); },
  animMove: el => { const id = el.dataset.id; if (anim && anim.id === id) { stopAnim(); render(); } else { anim = { id }; render(); } },
  muscleMap: () => openSheet(`<div class="sheet-head"><span></span><h2>Músculos</h2><button class="navbtn strong" data-a="closeSheet">Listo</button></div><div class="sheet-body"><img class="musclemap" src="img/muscle-map.webp" alt="Mapa de músculos de frente y de espalda"><p class="gf">En cada ejercicio, el <b>naranja</b> marca el músculo que debes sentir trabajar y el <b>amarillo</b> el de apoyo.</p></div>`),
  toggleEdit: el => { ui.editing[el.dataset.id] = !ui.editing[el.dataset.id]; render(); },
  start: el => startSession(el.dataset.id),
  startSection: el => startSession(el.dataset.p, +el.dataset.s),
  planMenu: el => {
    const p = store.plan(el.dataset.id), s = S();
    const acts = [];
    if (s.activePlanId !== p.id) acts.push({ label: 'Usar como plan principal', fn: () => { s.activePlanId = p.id; planSave(); toast('Plan principal actualizado'); } });
    if (isDuo(p)) acts.push({ label: 'Participantes', fn: () => openSheet(peopleSheetHTML(p.id), { onClose: render }) });
    acts.push({ label: 'Renombrar', fn: () => { const n = prompt('Nombre del plan', p.name); if (n && n.trim()) { p.name = n.trim(); planSave(); } } });
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
  newPlan: () => actionSheet('Nuevo plan', [
    { label: 'Individual', fn: () => createPlan('solo') },
    { label: 'En pareja (dúo)', fn: () => createPlan('duo') },
  ]),
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
  personModel: el => { const p = store.plan(el.dataset.p); p.people = people(p); p.people[+el.dataset.k].model = el.dataset.v; store.save(); refreshSheet(peopleSheetHTML(p.id)); },
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
      ${group([row({ title: 'Duración', right: `<span class="muted">${clock(x.secs)}</span>` }), row({ title: 'Ejercicios', right: `<span class="muted">${x.worked} de ${x.total}</span>` }), row({ title: 'Bloques', right: `<span class="muted">${esc((x.sections || []).join(', '))}</span>` }), ...(x.people ? [row({ title: 'En pareja', right: `<span class="muted">${esc(x.people.join(' + '))}</span>` })] : [])])}
      ${x.note ? group([`<div class="row"><span class="rt"><span class="rtt">${esc(x.note)}</span></span></div>`], { header: 'Notas' }) : ''}
      ${group([row({ title: '<span class="danger">Eliminar sesión</span>', a: 'delSession', data: `data-id="${x.id}"` })])}</div>`);
  },
  delSession: el => { const h = S().history, i = h.findIndex(x => x.id === el.dataset.id); const rem = h.splice(i, 1)[0]; store.save(); closeSheet(); render(); undoToast('Sesión eliminada', () => { h.push(rem); planSave(); }); },
  setStep: el => { const st = set(), k = el.dataset.k; st[k] = Math.round(clamp(st[k] + +el.dataset.d * +el.dataset.st, +el.dataset.min, +el.dataset.max) * 10) / 10; afterSetting(); },
  setSeg: el => { set()[el.dataset.k] = el.dataset.v; afterSetting(); },
  testSound: () => { unlockAudio(); sfx.tick(); setTimeout(sfx.tick, 1000); setTimeout(sfx.tick, 2000); setTimeout(sfx.go, 3000); if (set().voice) setTimeout(() => say('Sentadilla goblet. Diez a doce repeticiones.'), 3500); },
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
  pClose: () => P.askClose(), pMood: el => { P.mood = el.dataset.v; P.renderDone(); }, pSave: () => P.save(), pDiscard: () => P.discard(),
  pAnimToggle: () => { set().animate = !set().animate; store.save(); P.renderStep(); },
  pSettings: () => P.openSettings(),
};

function createPlan(mode) {
  const name = prompt(mode === 'duo' ? 'Nombre del plan en pareja' : 'Nombre del nuevo plan', mode === 'duo' ? 'Entrenamos juntos' : 'Mi plan');
  if (!name || !name.trim()) return;
  const p = { id: uid(), name: name.trim(), subtitle: '', frequency: '', mode, sections: [{ id: uid(), name: 'Bloque 1', kind: 'circuit', rounds: 3, rest: 45, items: [] }] };
  if (mode === 'duo') p.people = [{ name: set().name || 'Persona 1', model: 'f' }, { name: 'Pareja', model: 'm' }];
  S().plans.push(p); store.save(); ui.editing[p.id] = true;
  nav.tab = 'train'; push('plan', { id: p.id });
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
  name: el => { set().name = el.value.trim(); store.save(); },
  secName: el => { store.plan(el.dataset.p).sections[+el.dataset.s].name = el.value; store.save(); },
  personName: el => { const p = store.plan(el.dataset.p); p.people = people(p); p.people[+el.dataset.k].name = el.value; store.save(); },
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
  if (k.startsWith('dose:')) { const h = holderOf(el); h.dose = clone(doseOf(h)); h.dose[k.slice(5)] = el.checked; store.save(); refreshItem(el); }
});

function applyTheme() {
  const t = set().theme; document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#000000' : '#F7F5F6');
}

// ───────────────────────── REPRODUCTOR
const P = {
  steps: null, i: 0, endsAt: 0, remain: 0, paused: false, stepStart: 0, sessionStart: 0, active: 0, worked: 0, lastBeep: null, timer: null, stops: [], mood: null, plan: null, wake: null, doneSections: new Set(), onlySection: null, duoMarks: {},

  start(plan, onlySection) {
    this.plan = plan; this.onlySection = onlySection; this.steps = buildSteps(plan, set(), onlySection);
    this.totalWork = this.steps.filter(s => s.type === 'work').length;
    this.i = 0; this.worked = 0; this.mood = null; this.paused = false; this.active = 0; this.doneSections = new Set();
    this.sessionStart = Date.now(); this.lastTick = Date.now();
    $('#player').classList.add('on'); document.body.classList.add('playing');
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
        else say(s.title + (s.sub ? '. ' + s.sub : '') + (s.reps && !s.sub ? '. ' + s.reps.replace('–', ' a ') : ''));
      } else if (s.type === 'rest') { sfx.rest(); say(s.betweenSections ? `Descanso. Luego, ${s.section.name}` : 'Descanso'); }
      else if (s.type === 'transition' || s.type === 'ready') { const n = s.type === 'ready' ? s.nextWork : s; if (n && n.move) say(`A continuación: ${n.move.name}`); }
      else if (s.type === 'switch') say(s.title);
    }
    this.renderStep();
  },
  update() {
    const now = Date.now();
    if (!this.paused) this.active += (now - this.lastTick) / 1000;
    this.lastTick = now;
    const s = this.step; if (!s || s.type === 'done' || this.paused) return;
    if (s.secs != null) {
      let rem = (this.endsAt - now) / 1000, guard = 0;
      // si la pantalla estuvo bloqueada, avanza en silencio los pasos vencidos
      while (rem <= 0 && guard++ < 50) {
        const over = -rem;
        this.markWorked(this.step);
        if (this.i + 1 >= this.steps.length) return;
        const quiet = over > 1.5;
        this.enter(this.i + 1, quiet);
        const n = this.step; if (n.type === 'done' || n.secs == null) return;
        if (quiet) { this.endsAt = now - over * 1000 + n.secs * 1000; rem = (this.endsAt - now) / 1000; } else return;
      }
      this.remain = rem;
      const sec = Math.ceil(rem), bl = set().beepLast;
      if (bl > 0 && sec <= bl && sec >= 1 && this.lastBeep !== sec) { this.lastBeep = sec; sfx.tick(); }
    }
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
  renderStep() {
    const s = this.step, st = set(), el = $('#player'), pp = people(this.plan);
    this.stopFrames();
    const prog = this.i / (this.steps.length - 1);
    const sec = s.section;
    const topInfo = sec ? `<b>${esc(sec.name)}</b>${s.rounds > 1 ? `<span>Ronda ${s.type === 'rest' && !s.betweenSections ? s.nextRound : s.round} de ${s.rounds} · ${this.worked}/${this.totalWork}</span>` : `<span>${this.worked}/${this.totalWork}</span>`}` : `<b>${esc(this.plan.name)}</b>`;
    const isWork = s.type === 'work';
    let center = '', layout = '';
    if (isWork && s.duo) {
      layout = 'duo-layout';
      const who = (u, k) => `<div class="duo-cap"><span class="who">${esc(pp[k].name)}</span><b>${esc(u.move.name)}</b><em>${esc(u.secs != null || u.reps == null ? (u.sub || '') : u.reps + (u.sub ? ' · ' + u.sub : ''))}</em></div>`;
      const meter = s.secs != null ? `<div class="p-ring sm">${bigRing()}<div class="p-time" id="pTime">${clock(Math.ceil(this.remain))}</div></div>` : `<div class="duo-reps"><em id="pTime">${clock(0)}</em></div>`;
      center = `<div class="duo-wrap"><div class="duo-p">${mediaHTML(s.a.move, s.a.pos ?? 0, { id: 'pmA', model: pp[0].model })}${who(s.a, 0)}</div>
        <div class="duo-mid">${meter}<div class="p-ctl" id="pCtl"></div></div>
        <div class="duo-p">${who(s.b, 1)}${mediaHTML(s.b.move, s.b.pos ?? 0, { id: 'pmB', model: pp[1].model })}</div></div>`;
    } else if (isWork) {
      const m = s.move;
      center = `${mediaHTML(m, s.pos ?? 0, { id: 'pm0', extra: s.pos == null && m.positions.length > 1 ? `<button class="p-animbtn" data-a="pAnimToggle" aria-label="Animación">${st.animate ? I.pause : I.play}</button>` : '' })}
        <div class="p-title"><h2>${esc(m.name)}</h2><p>${esc(s.sub || '')}${s.dose && s.dose.note ? ` · ${esc(s.dose.note)}` : ''}</p></div>
        <div class="p-meter">${s.secs != null ? `<div class="p-ring">${bigRing()}<div class="p-time" id="pTime">${clock(Math.ceil(this.remain))}</div></div>` : `<div class="p-reps"><b>${esc(s.reps.split(' ')[0])}</b><span>${esc(s.reps.split(' ').slice(1).join(' '))}</span><em id="pTime">${clock(0)}</em></div>`}
          <p class="p-cue">${I.check}${esc(m.cue)}</p></div>`;
    } else {
      const label = s.type === 'ready' ? 'Prepárate' : s.type === 'rest' ? 'Descanso' : s.type === 'switch' ? s.title : 'Siguiente';
      const n = s.nextWork;
      const nextCard = (mv, u, k) => `<div class="p-next"><span class="p-next-img"><img src="${imgOf(mv, keyIdx(mv)[0], k == null ? undefined : pp[k].model)}" alt=""></span><span><small>${k == null ? 'A continuación' : esc(pp[k].name)}</small><b>${esc(mv.name)}</b><em>${esc(u.secs != null && u.reps == null ? fmtSecs(u.secs) : (u.reps || ''))}${u.sub ? ' · ' + esc(u.sub) : ''}</em></span></div>`;
      let next = '';
      if (n && n.duo) next = nextCard(n.a.move, n.a, 0) + nextCard(n.b.move, n.b, 1);
      else if (n) next = nextCard(n.move, n);
      center = `<div class="p-restlabel">${label}${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</div>
        <div class="p-ring rest">${bigRing()}<div class="p-time" id="pTime">${clock(Math.ceil(this.remain))}</div></div>
        ${s.type === 'rest' ? `<div class="p-restbtns"><button class="btn tinted dark" data-a="pAdd">+15 s</button><button class="btn tinted dark" data-a="pNext">Saltar</button></div>` : ''}
        <div class="p-nexts">${next}</div>`;
    }
    el.className = `on t-${s.type} ${layout}`;
    el.innerHTML = `<div class="p-top"><button class="p-x" data-a="pClose" aria-label="Terminar">${I.x}</button><div class="p-info">${topInfo}</div><button class="p-x" data-a="pSettings" aria-label="Ajustes">${I.gear}</button></div>
      <div class="p-bar"><i style="width:${(prog * 100).toFixed(1)}%"></i></div>
      <div class="p-center">${center}</div>
      ${layout ? '' : '<div class="p-ctl" id="pCtl"></div>'}`;
    this.renderControls(); this.paint();
    if (isWork && st.animate) {
      const go = (m, pos, id) => { if (pos == null && m.positions.length > 1) this.stops.push(runFrames(m, i => setFrame($('#' + id), m, i), () => this.paused)); };
      if (s.duo) { go(s.a.move, s.a.pos, 'pmA'); go(s.b.move, s.b.pos, 'pmB'); } else go(s.move, s.pos, 'pm0');
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
    const s = this.step; const t = $('#pTime'); if (!t) return;
    if (s.secs != null) {
      const rem = Math.max(0, this.remain);
      t.textContent = clock(Math.ceil(rem));
      const fg = $('#player .p-ring .ring-fg'); if (fg) { const c = +fg.dataset.c; fg.style.strokeDashoffset = (c * (1 - rem / s.secs)).toFixed(1); }
      t.classList.toggle('warn', Math.ceil(rem) <= set().beepLast && rem > 0);
    } else t.textContent = clock((Date.now() - this.stepStart) / 1000);
  },

  // ── final
  finish() {
    clearInterval(this.timer); this.stopFrames(); this.releaseWake();
    sfx.done(); say('¡Entrenamiento completado! Muy bien.');
    this.renderDone();
  },
  renderDone() {
    const el = $('#player'); el.className = 'on t-done';
    const moods = ['😣', '😐', '🙂', '😄', '🔥'];
    const note = $('#pNote') ? $('#pNote').value : '';
    el.innerHTML = `<div class="p-top"><span></span><div class="p-info"><b>${esc(this.plan.name)}</b></div><span></span></div>
      <div class="p-center done"><div class="p-check">${I.check}</div><h2>¡Entrenamiento completado!</h2>
      <div class="p-stats"><div><b>${clock(this.active)}</b><span>Duración</span></div><div><b>${this.worked}</b><span>Ejercicios</span></div><div><b>${this.doneSections.size}</b><span>Bloques</span></div></div>
      <p class="p-q">¿Cómo te sentiste?</p><div class="p-moods">${moods.map(m => `<button class="${this.mood === m ? 'on' : ''}" data-a="pMood" data-v="${m}">${m}</button>`).join('')}</div>
      <textarea id="pNote" placeholder="Notas (peso, banda, sensaciones…)" rows="2">${esc(note)}</textarea></div>
      <div class="p-ctl col"><button class="btn primary big" data-a="pSave">Guardar</button><button class="btn plain light" data-a="pDiscard">No guardar</button></div>`;
  },
  record(partial) {
    S().history.push({ id: uid(), date: new Date(this.sessionStart).toISOString(), planId: this.plan.id, planName: this.plan.name, secs: Math.round(this.active), worked: this.worked, total: this.totalWork, sections: [...this.doneSections], mood: this.mood, note: ($('#pNote') || {}).value || '', partial: !!partial, ...(this.duo ? { people: people(this.plan).map(x => x.name) } : {}) });
    store.save();
  },
  save() { this.record(false); this.close(); toast('Sesión guardada'); },
  discard() { this.close(); },
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
    $('#player').className = ''; $('#player').innerHTML = ''; document.body.classList.remove('playing');
    this.steps = null; render();
  },
};

function bigRing() {
  const size = 240, w = 14, r = (size - w) / 2, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}"><circle cx="120" cy="120" r="${r}" class="ring-bg" stroke-width="${w}" fill="none"/><circle cx="120" cy="120" r="${r}" class="ring-fg" data-c="${c.toFixed(1)}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="0" transform="rotate(-90 120 120)"/></svg>`;
}

function startSession(pid, onlySection = null) {
  const p = store.plan(pid);
  if (!p || !p.sections.some(s => s.items.length)) { toast('Este plan no tiene movimientos'); return; }
  unlockAudio(); stopAnim();
  store.persist().then(v => { ui.persisted = v; });
  P.start(p, onlySection);
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && P.steps) { P.requestWake(); P.update(); } });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

applyTheme();
render();
store.persist().then(v => { ui.persisted = v; if (top().v === 'settings') render(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
