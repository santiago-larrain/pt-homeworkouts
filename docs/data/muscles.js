// Mapa muscular: nombres canónicos, grupos, alias y GEOMETRÍA de cada región (ver project/MUSCLEMAP.md).
//
// Sistema de coordenadas de cada vista: x = distancia al eje central del cuerpo (dx, positiva hacia afuera),
// y = altura (cabeza arriba, y≈8; planta del pie, y≈408). Se dibuja SOLO LA MITAD y el módulo la espeja
// (izquierda y derecha siempre quedan iguales). Un punto con «!» es una esquina; los demás se suavizan
// (Catmull-Rom → Bézier). Los puntos con dx ≈ 1.2 dejan una línea fina en el centro (columna, línea alba, pliegue).
//
// Para agregar un músculo: una entrada en MUSCLES (ver la guía al final de project/MUSCLEMAP.md).

// ───────────────────────────── Músculos ─────────────────────────────
// front / back: lista de contornos (cadena "x,y x,y! …"). Si falta una vista, el músculo no se dibuja en ella.
// z: orden de pintado (los números mayores quedan encima). Por defecto 0.
export const MUSCLES = [
  // ── Hombros ──
  { id: 'deltoides-anterior', name: 'Deltoides anterior', group: 'hombros',
    front: ['39,88! 45,83 50.5,83 52.5,100 52,119 46.5,118 42,108 40,97'] },
  { id: 'deltoides-lateral', name: 'Deltoides lateral', group: 'hombros',
    front: ['51.5,83 56,85 60.5,92 62.5,104 61,116 55,121 53.5,118 54,100'],
    back: ['51.5,84 56,86 60.5,93 62.5,105 61,117 55,121 53.5,118 54,100'] },
  { id: 'deltoides-posterior', name: 'Deltoides posterior', group: 'hombros',
    back: ['38,93! 45,86 50.5,84.5 52.5,100 52,119 46,118 42,108 39.5,99'] },
  { id: 'supraespinoso', name: 'Supraespinoso', group: 'hombros',
    back: ['23,94! 27,90 37,88 40,90 34.5,95.5 27,98'] },
  { id: 'infraespinoso', name: 'Infraespinoso', group: 'hombros',
    back: ['19.5,104! 29,99 40,95.5 40,104 35,113 27,118 20,115'] },
  { id: 'manguito-rotador', name: 'Manguito rotador', group: 'hombros',
    back: ['35,115 40.5,106 44.5,108 44,116 38,123 32,121'] },

  // ── Espalda ──
  { id: 'trapecio-superior', name: 'Trapecio superior', group: 'espalda',
    front: ['10.5,69 24,76.5 38,81 45.5,83.5 40,87.5 27,86.5 15,82 10.5,76'],
    back: ['1.4,60! 8.5,66 23,75.5 38,80 46,83 41,88 28,86.5 15,88 1.4,91!'], z: 1 },
  { id: 'trapecio-medio', name: 'Trapecio medio', group: 'espalda',
    back: ['1.4,92.5! 14,89.5 21,95.5 19,104 1.4,106!'], z: 1 },
  { id: 'trapecio-inferior', name: 'Trapecio inferior', group: 'espalda',
    back: ['1.4,127! 10,125.5 16.5,126.5 10,141 1.4,158!'], z: 2 },
  { id: 'romboides', name: 'Romboides', group: 'espalda',
    back: ['3.5,108! 18,105 20.5,117 17,124 3.5,124!'], z: 1 },
  { id: 'dorsal-ancho', name: 'Dorsal ancho', group: 'espalda',
    back: ['22,130! 28,125.5 36,121.5 40,119.5 36.5,129 33,146 30.5,164 31,172.5 26,177 17,171 15,158 16.5,145 19,136'] },
  { id: 'erectores-espinales', name: 'Erectores espinales', group: 'espalda',
    back: ['1.4,127! 11,126 13,148 14.5,171 14.8,190 1.4,194!'] },

  // ── Pecho ──
  { id: 'pectoral-mayor', name: 'Pectoral mayor', group: 'pecho',
    front: ['1.4,91! 12,89.5 26,90 36,93 39.5,98 41,106 40,113 32,124 20,130 8,131.5 1.4,130!'] },
  { id: 'serrato-anterior', name: 'Serrato anterior', group: 'pecho',
    front: ['28.5,127.5! 33.5,123.5 37,125.5 35,129.5 37,134 34,137 36,141.5 32.5,144 34,149 28.5,148 26,137'] },

  // ── Core ──
  { id: 'recto-abdominal', name: 'Recto abdominal', group: 'core',
    front: [
      '1.4,131! 7,130.2 12.4,131 13,136 12.4,141 7,142.2 1.4,141.4!',
      '1.4,144! 7,143.4 12.6,144 13.2,149 12.6,154 7,155.2 1.4,154.6!',
      '1.4,157! 7,156.4 12.6,157 13.2,162 12.6,167 7,168.2 1.4,167.6!',
      '1.4,170! 7,169.4 12.2,170 12.6,175 11.6,181.5 7,184 1.4,185!'] },
  { id: 'oblicuos', name: 'Oblicuos', group: 'core',
    front: ['15,140! 25,146.5 29.5,153 28.5,166 30.5,178 34,189 26,191.5 15.5,189 14.5,165'] },
  { id: 'transverso-abdominal', name: 'Transverso abdominal', group: 'core',
    front: ['1.4,191! 12,191 26,194 33,196 29.5,201 20,206 9,210.5 1.4,212!'] },
  { id: 'psoas', name: 'Psoas', group: 'core',
    front: ['36,198! 38.5,203.5 26,210 10,217.5 3.5,216 12,211 26,203'] },
  { id: 'cuadrado-lumbar', name: 'Cuadrado lumbar', group: 'core',
    back: ['16.5,165! 22,164 25.5,172 24,182 19,190 16.4,188'] },

  // ── Glúteos ──
  { id: 'gluteo-mayor', name: 'Glúteo mayor', group: 'gluteos',
    back: ['1.4,201! 12,203.5 26,209 36,215 40.5,228 39,243 31,252 19,256 8,254 1.4,249!'] },
  { id: 'gluteo-medio', name: 'Glúteo medio', group: 'gluteos',
    back: ['15,197! 24.5,191.5 34.5,194.5 39.5,202.5 41.5,211.5 36,214 27,209 17,204'], z: 1 },
  { id: 'gluteo-minimo', name: 'Glúteo mínimo', group: 'gluteos',
    back: ['24.5,207 33,208.5 41,214.5 41.5,221 33,217 25.5,212'], z: 2 },
  { id: 'piriforme', name: 'Piriforme', group: 'gluteos',
    back: ['5,207! 14,209 24,214 31,221 29.5,224 19.5,218.5 8,213.5 5,211.5!'], z: 2 },
  { id: 'tensor-fascia-lata', name: 'Tensor de la fascia lata', group: 'gluteos',
    front: ['34.5,206 41,212 42.5,226 39.5,238 35.5,228 33.5,215'] },

  // ── Piernas ──
  { id: 'recto-femoral', name: 'Recto femoral', group: 'piernas',
    front: ['24,208! 29,214 29,232 28.2,262 26.5,284 24,291! 21.4,284 20.4,262 19.2,232 19.6,214'] },
  { id: 'cuadriceps', name: 'Cuádriceps', group: 'piernas',
    front: [
      '30,228 33,216 40,220 43,238 41,266 37.5,290 31.5,297 27.2,290 28.8,264 30.2,242',
      '18.6,246 13,256.5 10.8,271 11.5,286.5 16,295 21,293 22.5,285 20,264'] },
  { id: 'aductores', name: 'Aductores', group: 'piernas',
    front: ['2.8,219! 12,215 18.2,227 17.6,244 13.5,257 9.5,248 7,230'] },
  { id: 'isquiotibiales', name: 'Isquiotibiales', group: 'piernas',
    back: [
      '9.8,257 21,259.5 23,275 21,292 16,298 12.4,292 10.6,271',
      '26,259 40,250 42,266 38.5,290 31.5,298.5 27.5,294 24.8,274'] },
  { id: 'tibial-anterior', name: 'Tibial anterior', group: 'piernas',
    front: ['21.5,309 30,309 29.4,332 26.5,357 22.5,373 20.4,357 19.4,332'] },
  { id: 'gemelos', name: 'Gemelos', group: 'piernas',
    front: [
      '30.6,308 35.6,310 36.2,322 34,335 30.6,343 29.6,324',
      '15.6,307 20.8,308.5 20.6,326 19,339 16.2,335 15,320'],
    back: [
      '16,303 24.5,304.5 26.2,318 24.2,331 20.8,340 17.4,334 15.6,320',
      '27.2,305 35.4,306.5 36.2,318 33.6,330 29.8,338 27.4,326'] },
  { id: 'soleo', name: 'Sóleo', group: 'piernas',
    front: [
      '31.4,346 34.6,340 33.6,353 29.6,366 28.6,354',
      '17.6,345 20.4,343 21.2,356 19.8,368 17,358'],
    back: [
      '30.2,336 34.2,328 36,333 34.4,350 29.4,367 26.4,353 27.6,342',
      '17.2,338 21.5,342 25.4,341 24,353 22.5,370 18.6,365 15.8,351'] },

  // ── Brazos ──
  { id: 'biceps', name: 'Bíceps', group: 'brazos',
    front: ['50,112 57.5,110 60.8,122 61.5,136 59,147 54,149 51.5,138 49,124'] },
  { id: 'braquial', name: 'Braquial', group: 'brazos',
    front: ['61,127 64.5,131 67,142.5 65,150.5 61.4,148.5 61.6,137'] },
  { id: 'triceps', name: 'Tríceps', group: 'brazos',
    back: ['48.5,118 58,114 64,125 66,140 63,151 56,152 51.5,137'] },
  { id: 'antebrazos', name: 'Antebrazos', group: 'brazos',
    front: ['55.5,155 66,156.5 71,172 74,192 73,204 68.5,204 64.5,190 59.5,172'],
    back: ['55.5,155 66,156.5 71,172 74,192 73,204 68.5,204 64.5,190 59.5,172'] },
];

// ───────────────────────────── Silueta ─────────────────────────────
// Por vista: cuerpo (tronco + piernas), brazo, cabeza + cuello. Misma silueta de frente y de espalda.
export const SILHOUETTE = {
  body: '0,60! 9,61.5 10,73 24,78 42,81 50,86 47,104 40.5,112 37.5,128 33.5,146 30,165 31.5,178 37,196 41,212 44,232 43,258 40.5,285 38.5,300 37,315 36.3,335 32.5,360 26,383 25,388 27,396 26.5,404 20.5,408.5 10,408.5 9,398 11,388 13.5,370 15.5,340 14.5,318 12.5,300 11,280 9,250 6,225 2.5,214 0,212!',
  arm: '50,83.5 57,88.5 60.5,100 63.5,120 66.5,136 69,150 72.4,170 74.7,190 76.5,205 77,212 78.5,224 78,235 75,241 71.8,239 69.5,229 68,218 67.5,205 63.7,190 58.4,170 54,150 48.5,125 45,106',
  headFront: { cx: 0, cy: 31, rx: 17, ry: 23 },
  neck: '8.6,50 9.6,76 -9.6,76 -8.6,50',
};

// Escala horizontal por altura (y): da la silueta femenina y masculina a partir de la MISMA geometría.
// [y, factor]. Mujer: hombros algo más angostos, cintura marcada, caderas anchas. Hombre: hombros anchos, caderas rectas.
export const WARP = {
  f: [[0, 1], [68, 1], [84, 0.93], [112, 0.94], [165, 0.93], [200, 1.07], [235, 1.07], [270, 1.03], [320, 1], [410, 1]],
  m: [[0, 1], [68, 1], [84, 1.08], [112, 1.07], [165, 1.03], [200, 0.95], [235, 0.95], [270, 0.97], [320, 1], [410, 1]],
};

// Líneas de detalle anatómico (no son músculos): contornos abiertos «x,y x,y …»; ~ cerrado si termina en «z».
export const DETAILS = {
  front: ['20,294 24,291.4 28,294 28,300 24,303 20,300 z'],
  back: [],
};

// ───────────────────────────── Alias ─────────────────────────────
// Nombre alternativo → uno o varios nombres canónicos (se suman completos). La comparación ignora mayúsculas y tildes.
const A = {
  'transverso': 'Transverso abdominal',
  'zona lumbar': 'Erectores espinales',
  'lumbar': 'Erectores espinales',
  'espalda baja': 'Erectores espinales',
  'abdominales': 'Recto abdominal',
  'abdominal': 'Recto abdominal',
  'abdomen': 'Recto abdominal',
  'oblicuo': 'Oblicuos',
  'cuadriceps': 'Cuádriceps',
  'cuadriceps femoral': 'Cuádriceps',
  'biceps femoral': 'Isquiotibiales',
  'isquios': 'Isquiotibiales',
  'isquiotibial': 'Isquiotibiales',
  'gluteo': ['Glúteo mayor', 'Glúteo medio'],
  'gluteos': ['Glúteo mayor', 'Glúteo medio'],
  'gluteo maximo': 'Glúteo mayor',
  'gluteo mediano': 'Glúteo medio',
  'pantorrillas': ['Gemelos', 'Sóleo'],
  'pantorrilla': ['Gemelos', 'Sóleo'],
  'gemelo': 'Gemelos',
  'aductor': 'Aductores',
  'abductores': ['Glúteo medio', 'Tensor de la fascia lata'],
  'deltoides': ['Deltoides anterior', 'Deltoides lateral', 'Deltoides posterior'],
  'hombro': ['Deltoides anterior', 'Deltoides lateral', 'Deltoides posterior'],
  'hombros': ['Deltoides anterior', 'Deltoides lateral', 'Deltoides posterior'],
  'trapecio': ['Trapecio superior', 'Trapecio medio', 'Trapecio inferior'],
  'trapecios': ['Trapecio superior', 'Trapecio medio', 'Trapecio inferior'],
  'dorsales': 'Dorsal ancho',
  'dorsal': 'Dorsal ancho',
  'pectoral': 'Pectoral mayor',
  'pectorales': 'Pectoral mayor',
  'pecho': 'Pectoral mayor',
  'triceps braquial': 'Tríceps',
  'biceps braquial': 'Bíceps',
  'antebrazo': 'Antebrazos',
  'serrato': 'Serrato anterior',
  'rotadores': 'Manguito rotador',
  'manguito rotador': 'Manguito rotador',
  'erector espinal': 'Erectores espinales',
  'erectores': 'Erectores espinales',
  'tensor de fascia lata': 'Tensor de la fascia lata',
  'psoas iliaco': 'Psoas',
  'iliopsoas': 'Psoas',
};

const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const MUSCLE_BY_NAME = Object.fromEntries(MUSCLES.map(m => [m.name, m]));
export const MUSCLE_BY_ID = Object.fromEntries(MUSCLES.map(m => [m.id, m]));
const BY_FOLD = Object.fromEntries(MUSCLES.map(m => [fold(m.name), [m.name]]));
Object.entries(A).forEach(([k, v]) => { BY_FOLD[fold(k)] = Array.isArray(v) ? v : [v]; });

// Devuelve la lista de nombres canónicos para un nombre cualquiera ([] si no se reconoce).
export const canonicalMuscles = name => BY_FOLD[fold(name)] || [];

export const GROUPS = {
  piernas: 'Piernas', gluteos: 'Glúteos', core: 'Core', espalda: 'Espalda', pecho: 'Pecho', hombros: 'Hombros', brazos: 'Brazos',
};
