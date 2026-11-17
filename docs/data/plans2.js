// Planes incluidos nuevos (v2): 5 planes de project/catalog_v2/NOTES.md §5, en la forma de DEFAULT_PLANS (plans.js).
// Para integrar: agregar PLANS2 al final de DEFAULT_PLANS (los ids son estables; los planes nuevos se agregan solos al estado local).
// Usan solo ids de MOVES (catalog.js) y MOVES2 (moves2.js). Sin `dose` = dosis por defecto del movimiento (p. ej. child-pose-lateral por fases).
// Nota: en secuencias de 1 ronda `rest` no se usa en el motor; se deja la pausa propuesta (5 s en Movilidad) por si luego se usa.

const reps = (move, min, max = min, extra = {}) => ({ move, dose: { type: 'reps', min, max, ...extra } });
const time = (move, secs, extra = {}) => ({ move, dose: { type: 'time', secs, ...extra } });
const side = { perSide: true };

export const PLANS2 = [
  {
    id: 'cuerpo-completo-20',
    name: 'Cuerpo completo 20 min',
    subtitle: 'Peso corporal, sin implementos',
    goal: 'Fuerza general sin implementos: piernas, empuje, core y glúteos en un circuito corto.',
    frequency: '3× por semana',
    builtin: true,
    mode: 'solo',
    sections: [
      {
        id: 'A', name: 'Calentamiento', note: 'Sube el pulso y suelta articulaciones.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [time('march-in-place', 45), time('cat-cow', 45), time('shoulder-circles', 30), time('good-morning', 40)],
      },
      {
        id: 'B', name: 'Circuito', note: 'Sin pausa entre ejercicios. Si la flexión inclinada cuesta, cámbiala por la de rodillas.',
        kind: 'circuit', rounds: 3, rest: 45,
        items: [
          reps('bodyweight-squat', 12, 15),
          reps('incline-pushup', 8, 12),
          reps('reverse-lunge', 8, 10, side),
          reps('bird-dog', 8, 10, { alternating: true }),
          reps('glute-bridge', 12, 15),
        ],
      },
      {
        id: 'C', name: 'Core', note: 'Abdomen profundo, sin arquear la espalda.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [time('plank', 25), reps('dead-bug', 10, 12, { alternating: true })],
      },
      {
        id: 'D', name: 'Vuelta a la calma', note: 'Respira lento y suelta.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [{ move: 'child-pose-lateral' }, time('figure-4', 30, side), time('standing-quad-stretch', 30, side)],
      },
    ],
  },
  {
    id: 'gluteos-piernas-bandas',
    name: 'Glúteos y piernas con bandas',
    subtitle: 'Mini banda, glúteo medio y mayor',
    goal: 'Glúteo medio y mayor y piernas con mini banda; activación, dos tri-sets y estiramiento.',
    frequency: '2-3× por semana',
    builtin: true,
    mode: 'solo',
    sections: [
      {
        id: 'A', name: 'Activación', note: 'Despierta los glúteos antes de cargar.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [reps('glute-bridge', 12), reps('fire-hydrant', 10, 10, side), reps('clamshell', 12, 12, side)],
      },
      {
        id: 'B1', name: 'Tri-set A', note: 'Mini banda sobre las rodillas. Goblet con ~3 kg.',
        kind: 'circuit', rounds: 3, rest: 50,
        items: [reps('banded-bridge', 15), reps('goblet-squat', 10, 12), reps('monster-walk', 10, 10, { perSide: true, unit: 'pasos' })],
      },
      {
        id: 'B2', name: 'Tri-set B', note: 'Un lado a la vez, control en la bajada.',
        kind: 'circuit', rounds: 2, rest: 45,
        items: [reps('single-leg-bridge', 8, 10, side), reps('side-lying-leg-raise', 12, 12, side), reps('donkey-kick', 12, 12, side)],
      },
      {
        id: 'C', name: 'Estiramiento', note: 'Cadera, glúteo y muslo.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [time('kneeling-hip-flexor', 30, side), time('figure-4', 30, side), time('standing-quad-stretch', 30, side)],
      },
    ],
  },
  {
    id: 'tren-superior-mancuernas',
    name: 'Tren superior con mancuernas',
    subtitle: 'Amigable con el hombro',
    goal: 'Espalda, pecho, hombros y brazos con mancuernas, con rangos cómodos para el hombro.',
    frequency: '2× por semana',
    builtin: true,
    mode: 'solo',
    sections: [
      {
        id: 'A', name: 'Movilidad', note: 'Hombros y columna listos.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [time('shoulder-circles', 30), time('wall-angel', 40), time('cat-cow', 30)],
      },
      {
        id: 'B1', name: 'Tri-set A', note: 'Empuje, tirón y press sin pausa entre ejercicios.',
        kind: 'circuit', rounds: 3, rest: 60,
        items: [reps('floor-press', 10, 12), reps('bent-over-row', 10, 12), reps('db-shoulder-press', 8, 10)],
      },
      {
        id: 'B2', name: 'Brazos y hombro posterior', note: 'Peso ligero, técnica limpia.',
        kind: 'circuit', rounds: 2, rest: 45,
        items: [reps('biceps-curl', 12), reps('overhead-triceps-ext', 10, 12), reps('reverse-fly', 12), reps('lateral-raise', 10)],
      },
      {
        id: 'C', name: 'Estiramiento', note: 'Pecho, espalda y costados.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [time('doorway-pec', 30, side), { move: 'child-pose-lateral' }, time('standing-side-bend', 20, side)],
      },
    ],
  },
  {
    id: 'core-postura',
    name: 'Core y postura',
    subtitle: 'Abdomen profundo y espalda alta',
    goal: 'Abdomen profundo y espalda alta: estabilidad de core y activación postural con banda.',
    frequency: '3-4× por semana',
    builtin: true,
    mode: 'solo',
    sections: [
      {
        id: 'A', name: 'Entrada', note: 'Columna móvil antes del core.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [time('cat-cow', 45), reps('thoracic-open-book', 8, 8, side), time('sphinx', 30)],
      },
      {
        id: 'B1', name: 'Circuito de core', note: 'Lento y controlado, la espalda baja pegada al suelo.',
        kind: 'circuit', rounds: 3, rest: 30,
        items: [
          reps('dead-bug', 10, 12, { alternating: true }),
          reps('bird-dog', 8, 10, { alternating: true }),
          reps('curl-up', 10, 12),
          time('side-plank-knee', 20, side),
          reps('toe-taps', 10, 10, { alternating: true }),
        ],
      },
      {
        id: 'B2', name: 'Postura', note: 'Escápulas atrás y abajo.',
        kind: 'circuit', rounds: 2, rest: 30,
        items: [reps('band-pull-apart', 12, 15), reps('face-pull', 12), reps('band-external-rotation', 10, 10, side)],
      },
      {
        id: 'C', name: 'Cierre', note: 'Pecho y espalda baja.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [time('doorway-pec', 30, side), { move: 'child-pose-lateral' }],
      },
    ],
  },
  {
    id: 'movilidad-10',
    name: 'Movilidad 10 min',
    subtitle: 'Caderas, columna y hombros',
    goal: 'Soltar caderas, columna y hombros; para cualquier día, sin esfuerzo.',
    frequency: 'Cualquier día',
    builtin: true,
    mode: 'solo',
    sections: [
      {
        id: 'A', name: 'Secuencia', note: 'Sin prisa; respira lento y no fuerces el rango.',
        kind: 'sequence', rounds: 1, rest: 5,
        items: [
          time('cat-cow', 45),
          reps('thoracic-open-book', 6, 6, side),
          time('sphinx', 30),
          { move: 'child-pose-lateral' },
          time('shoulder-circles', 30),
          time('wall-angel', 40),
          time('good-morning', 30),
          time('kneeling-hip-flexor', 30, side),
          time('figure-4', 30, side),
          time('hamstring-stretch-supine', 30, side),
          time('standing-side-bend', 20, side),
          time('seated-twist-chair', 20, side),
        ],
      },
    ],
  },
];
