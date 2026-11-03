// Sonidos (Web Audio, sin archivos) y voz guía (speechSynthesis).
// iOS solo permite audio después de un toque: llamar unlock() desde un evento de usuario.
let ctx = null;
let cfg = { sound: true, volume: 0.8, voice: false, ignoreSilent: false };

export function configure(settings) { cfg = settings; applySession(); }

function applySession() {
  // Safari 16.4+: 'playback' suena aunque el iPhone esté en silencio; 'ambient' se mezcla con la música
  try { if (navigator.audioSession) navigator.audioSession.type = cfg.ignoreSilent ? 'playback' : 'ambient'; } catch (e) { /* no soportado */ }
}

export function unlock() {
  applySession();
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  // "despierta" el motor con un buffer silencioso
  if (ctx) { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); }
  if (cfg.voice && 'speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(''); speechSynthesis.speak(u); }
}

function tone(freq, dur, when = 0, type = 'sine', gain = 1) {
  if (!cfg.sound || !ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  const v = Math.max(0.0001, cfg.volume * 0.5 * gain);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  tick() { tone(880, 0.09, 0, 'sine', 0.9); },            // clic de cuenta regresiva
  go() { tone(988, 0.12, 0, 'triangle'); tone(1319, 0.22, 0.12, 'triangle'); }, // empieza el trabajo
  rest() { tone(784, 0.16, 0, 'sine'); tone(523, 0.3, 0.16, 'sine'); },          // empieza el descanso
  done() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, i * 0.13, 'triangle')); },
  tap() { tone(1200, 0.03, 0, 'sine', 0.4); },
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
