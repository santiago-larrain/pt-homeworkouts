// Animaciones por fotogramas (v1.3): img/anim/<f|m>/<id>-<k>.webp, generadas con Wonder y recortadas con
// project/tools/build_anim.py. Mismo personaje (mujer u hombre) y mismo estilo en todos los ejercicios.
//   n:   número de fotogramas (iguales para ambos modelos).
//   pos: fotograma (base 0) que corresponde a cada posición de MOVES[id].positions (por defecto: primero y último).
//   loop: ciclo 1→…→n→1 (movimientos circulares) en vez de ida y vuelta.
// Los fotogramas intermedios se recorren con fundidos suaves; en las posiciones la animación se detiene un momento.
export const ANIM = {
  'cat-cow': { n: 4 },
  'shoulder-circles': { n: 4, pos: [1, 3], loop: true },          // arriba (hombros a las orejas) → atrás y abajo
  'good-morning': { n: 4 },
  'glute-bridge-iso': { n: 4 },
  'goblet-squat': { n: 5 },
  'b-stance-rdl': { n: 4 },
  'monster-walk': { n: 4, pos: [0, 2], loop: true },              // base → paso lateral (luego la otra pierna sigue)
  'face-pull': { n: 4 },
  'floor-press': { n: 4 },
  'band-external-rotation': { n: 4, pos: [0, 2, 3] }, // adentro, gira, afuera
  'dead-bug': { n: 4, pos: [0, 2, 3] },               // mesa, baja, estira
  'ring-adductor-lift': { n: 4 },
  'ring-legs-side': { n: 5, pos: [2, 4] },            // 1-3 piernas arriba, 4-5 de lado (vistas distintas)
  'doorway-pec': { n: 3 },
  'child-pose-lateral': { n: 4 },
  'kneeling-hip-flexor': { n: 4 },
  'figure-4': { n: 4 },
};
