// Fase 6 (v1.8): recordatorios y Apple Salud. Sin servidor y sin APIs nativas:
//  · una PWA de iOS no puede programar notificaciones locales ni leer HealthKit;
//  · el puente es un Atajo de Apple («Entrena») que la usuaria instala una sola vez desde un enlace de iCloud
//    (pasos para construirlo y compartirlo: project/SHORTCUT.md);
//  · los recordatorios también se pueden guardar en el Calendario con un archivo .ics, sin Atajo.
// Todo aquí son funciones puras (sin DOM), para poder probarlas con Node.

// ──────────── CONFIGURACIÓN (único lugar que hay que editar al compartir el Atajo) ────────────
export const HEALTH = {
  shortcutName: 'Entrena',                                              // nombre exacto del Atajo en la app Atajos
  installURL: 'https://www.icloud.com/shortcuts/REEMPLAZAR-CON-EL-ENLACE-DEL-ATAJO', // enlace de iCloud (Compartir → Copiar enlace de iCloud)
  calendarName: 'Entrena',                                              // calendario donde el Atajo crea los eventos
  workoutType: 'Functional Strength Training',                         // tipo de entrenamiento que se registra en Salud
};
export const hasInstallURL = () => /^https:\/\/www\.icloud\.com\/shortcuts\/[A-Za-z0-9]{8,}$/.test(HEALTH.installURL);

// ──────────── Días y horas ────────────
// Los días van como en JavaScript (0 = domingo … 6 = sábado). La interfaz los muestra de lunes a domingo.
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const DAY_LABEL = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };
export const DAY_NAME = { 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábado', 0: 'domingo' };
const ICS_DAY = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' };
const p2 = n => String(n).padStart(2, '0');
export const DEFAULT_REMINDER = { on: false, days: [1, 3, 5], time: '19:00', seq: 0 };

export function cleanReminder(r) {
  const o = { ...DEFAULT_REMINDER, ...(r || {}) };
  o.on = !!o.on;
  o.days = [...new Set((Array.isArray(o.days) ? o.days : []).map(Number).filter(d => d >= 0 && d <= 6))].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  o.time = /^([01]\d|2[0-3]):[0-5]\d$/.test(o.time) ? o.time : DEFAULT_REMINDER.time;
  o.seq = Math.max(0, Math.round(+o.seq) || 0);
  return o;
}
export const daysText = days => {
  const d = [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (d.length === 7) return 'todos los días';
  const s = d.map(x => DAY_NAME[x]);
  return s.length > 1 ? `${s.slice(0, -1).join(', ')} y ${s[s.length - 1]}` : s[0] || 'ningún día';
};
// «YYYY-MM-DDTHH:MM:SS» en hora local (sin zona): lo entiende Calendario como «hora flotante» y Atajos como fecha local
export const localStamp = (d, time = null) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${time ? time.replace(':', '') + '00' : `${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`}`;
const isoLocal = (d, time) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${time}:00`;
// Próxima fecha (hoy o más adelante) en que cae cada día elegido, a la hora indicada; `from` = ahora
export function nextDates(days, time, from = new Date()) {
  const [h, m] = time.split(':').map(Number);
  return [...days].map(day => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h, m, 0);
    let add = (day - d.getDay() + 7) % 7;
    if (add === 0 && d <= from) add = 7;               // la hora de hoy ya pasó
    d.setDate(d.getDate() + add);
    return d;
  }).sort((a, b) => a - b);
}

// ──────────── URL de la app y del Atajo ────────────
// URL de inicio de la app (sin parámetros ni #): es a donde vuelve el Atajo
export const appStartURL = (loc = (typeof location !== 'undefined' ? location : null)) => (loc ? `${loc.origin}${loc.pathname}` : '');
// Ejecuta el Atajo con un texto de entrada (JSON). Formato oficial de la app Atajos.
export const shortcutURL = (payload, name = HEALTH.shortcutName) => `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${encodeURIComponent(JSON.stringify(payload))}`;

export function remindersPayload({ profileName, reminder, planName, url, now = new Date() }) {
  const r = cleanReminder(reminder);
  return { action: 'reminders', on: r.on && r.days.length > 0, days: r.days, time: r.time, title: `Entrenar · ${planName}`, url, profile: profileName, calendar: HEALTH.calendarName, dates: nextDates(r.days, r.time, now).map(d => isoLocal(d, r.time)), repeat: 'weekly' };
}
export const importPayload = ({ profileId, profileName, app }) => ({ action: 'import', profile: profileId, name: profileName, app });
export const logPayload = ({ profileId, start, end, kcal, title }) => ({ action: 'log', profile: profileId, type: HEALTH.workoutType, start: new Date(start).toISOString(), end: new Date(end).toISOString(), minutes: Math.max(1, Math.round((end - start) / 60000)), kcal: kcal > 0 ? Math.round(kcal) : null, title });

// ──────────── Lectura de ?health=… (vuelta del Atajo) y del portapapeles ────────────
// Acepta {weight, height, date, profile, weightUnit?, heightUnit?}; devuelve {kg, cm?, date, profile?} o null.
export function parseHealth(raw, today = new Date()) {
  let o = raw;
  if (typeof raw === 'string') { try { o = JSON.parse(raw); } catch (e) { return null; } }
  if (!o || typeof o !== 'object') return null;
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
  let kg = num(o.weight ?? o.kg), cm = num(o.height ?? o.cm);
  const wu = String(o.weightUnit || 'kg').toLowerCase(), hu = String(o.heightUnit || '').toLowerCase();
  if (/^(lb|lbs|libras?)$/.test(wu)) kg *= 0.45359237;
  if (/^(g|gramos?)$/.test(wu)) kg /= 1000;
  if (/^(m|metros?)$/.test(hu) || (!hu && cm > 0 && cm < 3)) cm *= 100;
  else if (/^(in|inch|pulgadas?)$/.test(hu)) cm *= 2.54;
  else if (/^(ft|pies)$/.test(hu)) cm *= 30.48;
  kg = Math.round(kg * 10) / 10; cm = Math.round(cm * 10) / 10;
  const okKg = kg >= 20 && kg <= 400, okCm = cm >= 80 && cm <= 250;
  if (!okKg && !okCm) return null;
  let date = String(o.date || '').slice(0, 10);
  const t = `${today.getFullYear()}-${p2(today.getMonth() + 1)}-${p2(today.getDate())}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > t) date = t;
  return { ...(okKg ? { kg } : {}), ...(okCm ? { cm } : {}), date, ...(o.profile ? { profile: String(o.profile) } : {}) };
}
// Lee `?health=` de una URL (location.search); devuelve el objeto de parseHealth o null
export function healthFromSearch(search, today = new Date()) {
  const v = new URLSearchParams(search || '').get('health');
  return v ? parseHealth(v, today) : null;
}

// ──────────── Archivo .ics (Calendario, sin Atajo) ────────────
// Un solo VEVENT semanal (RRULE BYDAY) con una alarma a la hora de inicio. UID estable por perfil;
// SEQUENCE sube en cada edición para que Calendario lo trate como actualización. «Apagar» = METHOD:CANCEL.
const esc = t => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// plegado de líneas a 75 octetos (RFC 5545 §3.1)
function fold(line) {
  const enc = new TextEncoder(), out = []; let cur = '', n = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ch; n = b; } else { cur += ch; n += b; }
  }
  out.push(cur);
  return out.join('\r\n ');
}
export const icsUID = profileId => `entrena-${String(profileId).replace(/[^A-Za-z0-9_-]/g, '')}@pt-homeworkouts`;
export function buildICS({ profileId, title, url, reminder, minutes = 30, cancel = false, now = new Date() }) {
  const r = cleanReminder(reminder);
  const first = nextDates(r.days.length ? r.days : [now.getDay()], r.time, now)[0];
  const end = new Date(first.getTime() + Math.max(10, minutes) * 60000);
  const stamp = `${now.getUTCFullYear()}${p2(now.getUTCMonth() + 1)}${p2(now.getUTCDate())}T${p2(now.getUTCHours())}${p2(now.getUTCMinutes())}${p2(now.getUTCSeconds())}Z`;
  const L = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Entrena//Recordatorios 1.8//ES', 'CALSCALE:GREGORIAN', `METHOD:${cancel ? 'CANCEL' : 'PUBLISH'}`,
    'BEGIN:VEVENT', `UID:${icsUID(profileId)}`, `DTSTAMP:${stamp}`, `SEQUENCE:${r.seq}`,
    `DTSTART:${localStamp(first)}`, `DTEND:${localStamp(end)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${(r.days.length ? r.days : [first.getDay()]).map(d => ICS_DAY[d]).join(',')}`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc('Hora de entrenar. Abre la app para empezar.')}`,
    ...(url ? [`URL:${url}`] : []),
    `STATUS:${cancel ? 'CANCELLED' : 'CONFIRMED'}`, 'TRANSP:TRANSPARENT',
    ...(cancel ? [] : ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'TRIGGER:PT0S', 'END:VALARM']),
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return L.map(fold).join('\r\n') + '\r\n';
}
