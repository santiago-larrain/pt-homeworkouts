// Planes que vienen con la app. La usuaria puede editarlos, duplicarlos o crear nuevos;
// sus cambios se guardan en el dispositivo (localStorage) y nunca pisan estos originales.
//
// section.kind: 'circuit' → se repiten todos los ejercicios `rounds` veces con `rest` s al final de cada ronda.
//               'sequence' → cada ejercicio una vez, en orden.
// item.dose: ver docs/data/catalog.js (time | reps | phases). Si se omite, usa la dosis del movimiento.

export const DEFAULT_PLANS = [
  {
    id: 'dynamic-reset-3x3',
    name: 'Dynamic Reset 3×3',
    subtitle: 'Postura, hombro protegido y fuerza',
    goal: 'Recomposición corporal, salud postural, protección articular de hombro y alta adherencia.',
    frequency: '2× por semana',
    builtin: true,
    mode: 'solo',
    sections: [
      {
        id: 'A', name: 'Activación', note: 'Sin saltos ni impacto. Lubrica articulaciones y activa estabilizadores.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [
          { move: 'cat-cow', dose: { type: 'time', secs: 45 } },
          { move: 'shoulder-circles', dose: { type: 'time', secs: 45 } },
          { move: 'good-morning', dose: { type: 'time', secs: 45 } },
          { move: 'glute-bridge-iso', dose: { type: 'time', secs: 45, note: 'sostén 3 s arriba' } },
        ],
      },
      {
        id: 'B1', name: 'Tren inferior', note: 'Glúteos y muslos. Tri-set sin pausa entre ejercicios.',
        kind: 'circuit', rounds: 3, rest: 45,
        items: [
          { move: 'goblet-squat', dose: { type: 'reps', min: 10, max: 12 } },
          { move: 'b-stance-rdl', dose: { type: 'reps', min: 10, max: 10, perSide: true } },
          { move: 'monster-walk', dose: { type: 'reps', min: 10, max: 10, perSide: true, unit: 'pasos' } },
        ],
      },
      {
        id: 'B2', name: 'Torso postural', note: 'Espalda, pecho y hombro protegido.',
        kind: 'circuit', rounds: 3, rest: 45,
        items: [
          { move: 'face-pull', dose: { type: 'reps', min: 12, max: 12 } },
          { move: 'floor-press', dose: { type: 'reps', min: 10, max: 12 } },
          { move: 'band-external-rotation', dose: { type: 'reps', min: 10, max: 10, perSide: true } },
        ],
      },
      {
        id: 'B3', name: 'Core y Pilates con aro', note: 'Estabilidad de core + circuito de aro.',
        kind: 'circuit', rounds: 3, rest: 45,
        items: [
          { move: 'dead-bug', dose: { type: 'reps', min: 10, max: 12, alternating: true } },
          { move: 'ring-adductor-lift' },
          { move: 'ring-legs-side' },
        ],
      },
      {
        id: 'C', name: 'Descompresión', note: 'Compensa las horas sentada estudiando.',
        kind: 'sequence', rounds: 1, rest: 0,
        items: [
          { move: 'doorway-pec', dose: { type: 'time', secs: 30, perSide: true } },
          { move: 'child-pose-lateral' },
          { move: 'kneeling-hip-flexor', dose: { type: 'time', secs: 30, perSide: true } },
          { move: 'figure-4', dose: { type: 'time', secs: 30, perSide: true } },
        ],
      },
    ],
  },
];
