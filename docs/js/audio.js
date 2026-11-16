// Sonidos (Web Audio, sin archivos), háptica y voz guía (speechSynthesis).
// Todo suena suave: senos con envolvente corta (ataque ~10 ms, caída exponencial), parciales tipo campanilla, sin ondas cuadradas.
// iOS solo permite audio después de un toque: llamar unlock() desde un evento de usuario.
let ctx = null, master = null;
let cfg = { sound: true, volume: 0.8, voice: false, ignoreSilent: false, haptics: true };

export function configure(settings) { cfg = settings; applySession(); }

function applySession() {
  // Safari 16.4+: 'playback' suena aunque el iPhone esté en silencio; 'ambient' se mezcla con la música
  try { if (navigator.audioSession) navigator.audioSession.type = cfg.ignoreSilent ? 'playback' : 'ambient'; } catch (e) { /* no soportado */ }
}

export function unlock() {
  applySession();
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      ctx = new AC();
      // compresor suave para que varias notas juntas no saturen
      master = ctx.createDynamicsCompressor(); master.threshold.value = -14; master.ratio.value = 3; master.connect(ctx.destination);
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  // "despierta" el motor con un buffer silencioso
  if (ctx) { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); }
  if (cfg.voice && 'speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(''); speechSynthesis.speak(u); }
}

// Una nota: fundamental + parciales [multiplicador, amplitud]; pan -1..1; el volumen sale de settings.volume
function note(freq, dur, when = 0, { gain = 1, attack = 0.01, partials = [], pan = 0 } = {}) {
  if (!cfg.sound || !ctx || !master) return;
  const t = ctx.currentTime + when + 0.005;
  const peak = Math.max(0.0002, cfg.volume * 0.5 * gain);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(peak, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out = env;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; env.connect(p); out = p; }
  out.connect(master);
  [[1, 1], ...partials].forEach(([mul, amp]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq * mul, t); g.gain.value = amp;
    o.connect(g); g.connect(env); o.start(t); o.stop(t + dur + 0.04);
  });
}

// Háptica: patrones en ms. iOS Safari no implementa navigator.vibrate (no hace nada, sin errores).
const BUZZ = { tick: 8, tickFinal: 18, go: 28, rest: [14, 40, 14], side: [10, 30, 10], done: [30, 50, 30, 50, 100], tap: 6 };
export function haptic(kind) {
  if (!cfg.haptics || !navigator.vibrate) return;
  try { navigator.vibrate(BUZZ[kind] || 8); } catch (e) { /* ignorar */ }
}

const N = { G4: 392, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, As5: 932.33, B5: 987.77, C6: 1046.5, E6: 1318.5 };

export const sfx = {
  // cuenta regresiva: un «toc» suave; el último segundo es más agudo y brillante
  tick(final = false) {
    if (final) note(N.C6, 0.2, 0, { gain: 1, partials: [[2, 0.18]] });
    else note(N.G5, 0.11, 0, { gain: 0.8, partials: [[2, 0.12]] });
    haptic(final ? 'tickFinal' : 'tick');
  },
  // empieza el trabajo: dos notas ascendentes, claras
  go() { note(N.E5, 0.2, 0, { partials: [[2, 0.25]] }); note(N.B5, 0.42, 0.1, { gain: 1, partials: [[2, 0.22], [3, 0.07]] }); haptic('go'); },
  // empieza el descanso: dos notas descendentes, más lentas y calmadas
  rest() { note(N.G5, 0.26, 0, { attack: 0.02, gain: 0.8 }); note(N.D5, 0.5, 0.15, { attack: 0.025, gain: 0.8, partials: [[2, 0.12]] }); haptic('rest'); },
  // cambio de lado / de posición: dos notas rápidas que cruzan de izquierda a derecha
  side() { note(N.F5, 0.14, 0, { pan: -0.7, gain: 0.8, partials: [[2, 0.15]] }); note(N.As5, 0.2, 0.12, { pan: 0.7, gain: 0.8, partials: [[2, 0.15]] }); haptic('side'); },
  // final: arpegio mayor ascendente con la última nota sostenida
  done() {
    [[N.C5, 0], [N.E5, 0.13], [N.G5, 0.26], [N.C6, 0.4]].forEach(([f, w], i) => note(f, i === 3 ? 1.1 : 0.34, w, { attack: 0.012, gain: i === 3 ? 1 : 0.85, partials: [[2, 0.2], [3, 0.06]] }));
    note(N.E6, 0.9, 0.4, { gain: 0.35, attack: 0.03 });
    haptic('done');
  },
  tap() { note(880, 0.05, 0, { gain: 0.3 }); haptic('tap'); },
};

export function say(text) {
  if (!cfg.voice || !('speechSynthesis' in window) || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    const v = speechSynthesis.getVoices().find(v => /^es(-|_)(MX|US|419|CL|ES)/i.test(v.lang)) || speechSynthesis.getVoices().find(v => /^es/i.test(v.lang));
    if (v) u.voice = v;
    u.rate = 1.02; u.volume = Math.min(1, cfg.volume + 0.2);
    speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}
