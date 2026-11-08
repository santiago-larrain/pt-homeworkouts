// Catálogo de movimientos (galería). Independiente de los planes:
// un plan solo referencia movimientos por `id` y define su propia dosis.
//
// Para agregar un movimiento nuevo:
//   1. Agrega 2 imágenes en docs/img/moves/<id>-1.webp y <id>-2.webp (posición 1 y 2).
//   2. Agrega un objeto a MOVES con el mismo `id`.
//   3. Sube CACHE_VERSION en docs/sw.js para que el iPhone descargue lo nuevo.
//
// breath: 'in' = inhala para LLEGAR a esa posición, 'ex' = exhala.
// imageStatus: 'final' (ilustración de ChatGPT) | 'vector' (dibujo vectorial de project/renderer, provisional) | 'placeholder'.
// positions puede tener 2 o más fotogramas; los marcados `mid: true` son intermedios (solo para la animación).
// Modelo masculino: si existen docs/img/moves/m/<id>-<n>.webp, agrega `male: true` al movimiento.

export const CATEGORIES = [
  { id: 'movilidad', name: 'Movilidad' },
  { id: 'piernas', name: 'Piernas y glúteos' },
  { id: 'torso', name: 'Torso y hombro' },
  { id: 'core', name: 'Core y Pilates' },
  { id: 'elongacion', name: 'Elongación' },
];

export const EQUIPMENT = {
  ninguno: 'Sin implementos',
  mat: 'Mat',
  mancuernas: 'Mancuernas',
  'mini-banda': 'Mini banda',
  banda: 'Banda elástica',
  aro: 'Aro de Pilates',
  puerta: 'Marco de puerta',
};

const img = (id, n) => `img/moves/${id}-${n}.webp`;

export const MOVES = [
  {
    id: 'cat-cow', name: 'Gato – Camello', category: 'movilidad', equipment: ['mat'],
    focus: ['Erectores espinales', 'Recto abdominal'], support: ['Glúteo medio', 'Transverso'],
    cue: 'Vértebra por vértebra, lento',
    tips: ['Muñecas bajo los hombros, rodillas bajo las caderas.', 'Camello: el ombligo baja y el pecho avanza; la mirada va al frente.', 'Gato: empuja el suelo y redondea, mentón al pecho.'],
    positions: [
      { label: 'Camello', breath: 'in', verb: 'arquea', img: img('cat-cow', 1) },
      { label: 'Gato', breath: 'ex', verb: 'redondea', img: img('cat-cow', 2) },
    ],
    dose: { type: 'time', secs: 45 }, imageStatus: 'final',
  },
  {
    id: 'shoulder-circles', name: 'Círculos de hombros', category: 'movilidad', equipment: ['ninguno'],
    focus: ['Trapecio superior', 'Romboides'], support: ['Trapecio medio'],
    cue: 'Círculos lentos hacia atrás',
    tips: ['Sube los hombros hacia las orejas, llévalos atrás y bájalos.', 'No fuerces el rango del hombro sensible.', 'Termina con las escápulas juntas y el pecho abierto.'],
    positions: [
      { label: 'Arriba', breath: 'in', verb: 'sube', img: img('shoulder-circles', 1) },
      { label: 'Atrás y abajo', breath: 'ex', verb: 'retrae', img: img('shoulder-circles', 2) },
    ],
    dose: { type: 'time', secs: 45 }, imageStatus: 'final',
  },
  {
    id: 'good-morning', name: 'Bisagra de cadera', alias: 'Good Morning sin peso', category: 'movilidad', equipment: ['ninguno'],
    focus: ['Isquiotibiales', 'Glúteo mayor'], support: ['Erectores espinales'],
    cue: 'Cadera atrás, espalda larga',
    tips: ['Manos en la nuca, codos abiertos.', 'Rodillas suaves (≈15°); la cadera viaja hacia atrás.', 'Baja hasta sentir los isquios sin redondear la espalda.'],
    positions: [
      { label: 'De pie', breath: 'ex', verb: 'sube', img: img('good-morning', 1) },
      { label: 'Bisagra', breath: 'in', verb: 'cadera atrás', img: img('good-morning', 2) },
    ],
    dose: { type: 'time', secs: 45 }, imageStatus: 'final',
  },
  {
    id: 'glute-bridge-iso', name: 'Puente de glúteos isométrico', category: 'movilidad', equipment: ['mat'],
    focus: ['Glúteo mayor'], support: ['Isquiotibiales', 'Transverso'],
    cue: 'Sostén 3 s arriba cada repetición',
    tips: ['Pies al ancho de cadera, talones a un palmo del glúteo.', 'Arriba: hombros, cadera y rodillas en una línea.', 'Aprieta glúteos; no arquees la zona lumbar.'],
    positions: [
      { label: 'Base', breath: 'in', verb: 'prepara', img: img('glute-bridge-iso', 1) },
      { label: 'Arriba', breath: 'ex', verb: 'sube y sostén', img: img('glute-bridge-iso', 2) },
    ],
    dose: { type: 'time', secs: 45, note: 'sostén 3 s arriba' }, imageStatus: 'final',
  },
  {
    id: 'goblet-squat', name: 'Sentadilla Goblet', category: 'piernas', equipment: ['mancuernas', 'mini-banda'],
    focus: ['Cuádriceps', 'Glúteo mayor'], support: ['Aductores', 'Glúteo medio'],
    cue: 'Rodillas empujan la banda hacia afuera',
    tips: ['Mancuerna vertical pegada al pecho, codos abajo.', 'Cadera atrás y abajo hasta muslos paralelos; talones apoyados.', 'Pecho alto, rodillas en línea con la punta de los pies.'],
    positions: [
      { label: 'Arriba', breath: 'ex', verb: 'sube', img: img('goblet-squat', 1) },
      { label: 'Abajo', breath: 'in', verb: 'baja', img: img('goblet-squat', 2) },
    ],
    dose: { type: 'reps', min: 10, max: 12 }, load: '3 kg + banda', imageStatus: 'final',
  },
  {
    id: 'b-stance-rdl', name: 'Peso muerto B-Stance', category: 'piernas', equipment: ['mancuernas'],
    focus: ['Isquiotibiales', 'Glúteo mayor'], support: ['Erectores espinales'],
    cue: '80 % del peso en la pierna de adelante',
    tips: ['Pie de atrás solo en punta, a la altura del talón delantero.', 'Rodilla delantera suave; la cadera empuja hacia atrás.', 'Mancuernas pegadas a la pierna, espalda neutra.'],
    positions: [
      { label: 'Arriba', breath: 'ex', verb: 'sube', img: img('b-stance-rdl', 1) },
      { label: 'Bisagra', breath: 'in', verb: 'baja', img: img('b-stance-rdl', 2) },
    ],
    dose: { type: 'reps', min: 10, max: 10, perSide: true }, load: '3 kg', imageStatus: 'final',
  },
  {
    id: 'monster-walk', name: 'Monster Walk lateral', category: 'piernas', equipment: ['mini-banda'],
    focus: ['Glúteo medio'], support: ['Glúteo mayor'],
    cue: 'Media sentadilla; los pies nunca se juntan',
    tips: ['Banda en los tobillos, siempre con tensión.', 'Pasos laterales cortos, puntas al frente.', 'No balancees el tronco.'],
    positions: [
      { label: 'Base', breath: 'in', verb: 'prepara', img: img('monster-walk', 1) },
      { label: 'Paso', breath: 'ex', verb: 'paso lateral', img: img('monster-walk', 2) },
    ],
    dose: { type: 'reps', min: 10, max: 10, perSide: true, unit: 'pasos' }, load: 'banda tobillos', imageStatus: 'final',
  },
  {
    id: 'face-pull', name: 'Face-Pull', category: 'torso', equipment: ['banda'],
    focus: ['Deltoides posterior', 'Romboides'], support: ['Infraespinoso', 'Trapecio medio'],
    cue: 'Codos altos, junta las escápulas',
    tips: ['Banda anclada a la altura de la cabeza.', 'Termina con las manos junto a las orejas y los antebrazos verticales.', 'Hombros lejos de las orejas.'],
    positions: [
      { label: 'Brazos largos', breath: 'in', verb: 'extiende', img: img('face-pull', 1) },
      { label: 'Jala', breath: 'ex', verb: 'codos altos', img: img('face-pull', 2) },
    ],
    dose: { type: 'reps', min: 12, max: 12 }, imageStatus: 'final',
  },
  {
    id: 'floor-press', name: 'Floor Press', category: 'torso', equipment: ['mancuernas', 'mat'],
    focus: ['Pectoral mayor'], support: ['Tríceps', 'Deltoides anterior'],
    cue: 'Codos a 45° del cuerpo',
    tips: ['El tríceps toca el suelo antes de subir: protege el hombro.', 'Empuja sobre el pecho, no sobre la cara.', 'Rodillas dobladas, espalda baja apoyada.'],
    positions: [
      { label: 'Abajo', breath: 'in', verb: 'baja', img: img('floor-press', 1) },
      { label: 'Arriba', breath: 'ex', verb: 'empuja', img: img('floor-press', 2) },
    ],
    dose: { type: 'reps', min: 10, max: 12 }, load: '3 kg', imageStatus: 'final',
  },
  {
    id: 'band-external-rotation', name: 'Rotación externa', category: 'torso', equipment: ['banda'],
    focus: ['Manguito rotador'], support: ['Deltoides posterior'],
    cue: 'Codo pegado a las costillas',
    tips: ['Pon una toalla enrollada entre el codo y las costillas.', 'Movimiento corto y controlado, sin dolor.', 'El codo no se mueve; solo gira el antebrazo.'],
    positions: [
      { label: 'Adentro', breath: 'in', verb: 'regresa', img: img('band-external-rotation', 1) },
      { label: 'Gira', breath: 'ex', verb: 'abre', img: img('band-external-rotation', 2), mid: true },
      { label: 'Afuera', breath: 'ex', verb: 'abre', img: img('band-external-rotation', 3) },
    ],
    dose: { type: 'reps', min: 10, max: 10, perSide: true }, imageStatus: 'vector',
  },
  {
    id: 'dead-bug', name: 'Dead Bug', alias: 'Bicho muerto', category: 'core', equipment: ['mat'],
    focus: ['Transverso abdominal'], support: ['Recto abdominal'],
    cue: 'Zona lumbar 100 % pegada al mat',
    tips: ['Brazos al techo, caderas y rodillas a 90°.', 'Estira brazo y pierna OPUESTOS, cerca del suelo.', 'Si la lumbar se despega, acorta el rango.'],
    positions: [
      { label: 'Mesa', breath: 'in', verb: 'prepara', img: img('dead-bug', 1) },
      { label: 'Baja', breath: 'ex', verb: 'estira', img: img('dead-bug', 2), mid: true },
      { label: 'Estira', breath: 'ex', verb: 'estira', img: img('dead-bug', 3) },
    ],
    dose: { type: 'reps', min: 10, max: 12, alternating: true }, imageStatus: 'vector',
  },
  {
    id: 'ring-adductor-lift', name: 'Aro: aductores + torso arriba', category: 'core', equipment: ['aro', 'mat'],
    focus: ['Aductores', 'Recto abdominal'], support: ['Transverso'],
    cue: 'Aprieta firme el aro entre las rodillas',
    tips: ['Posición 1: boca arriba, aprieta y suelta el aro.', 'Posición 2: sube el torso apoyándote en las manos, sin soltar el aro.', 'Cuello largo, hombros relajados.'],
    positions: [
      { label: 'Foto 1', breath: 'in', verb: 'aprieta el aro', img: img('ring-adductor-lift', 1) },
      { label: 'Foto 2', breath: 'ex', verb: 'sube el torso', img: img('ring-adductor-lift', 2) },
    ],
    dose: { type: 'phases', phases: [{ label: 'Posición 1', secs: 20, pos: 0 }, { label: 'Posición 2', secs: 20, pos: 1 }] }, imageStatus: 'final',
  },
  {
    id: 'ring-legs-side', name: 'Aro: piernas arriba + lateral', category: 'core', equipment: ['aro', 'mat'],
    focus: ['Aductores', 'Transverso', 'Glúteo medio'], support: ['Oblicuos'],
    cue: 'Aro firme entre los tobillos',
    tips: ['Piernas arriba: torso apenas elevado, brazos largos, respira profundo.', 'De lado: apóyate en el antebrazo y eleva la pierna de arriba.', 'Mantén el abdomen activo todo el tiempo.'],
    positions: [
      { label: 'Piernas arriba', breath: 'ex', verb: 'aprieta y respira', img: img('ring-legs-side', 1) },
      { label: 'De lado', breath: 'ex', verb: 'eleva la pierna', img: img('ring-legs-side', 2) },
    ],
    dose: { type: 'phases', phases: [{ label: 'Piernas arriba', secs: 20, pos: 0 }, { label: 'De lado', secs: 15, pos: 1, perSide: true }] }, imageStatus: 'final',
  },
  {
    id: 'doorway-pec', name: 'Pectoral en marco de puerta', category: 'elongacion', equipment: ['puerta'],
    focus: ['Pectoral mayor'], support: ['Deltoides anterior'],
    cue: 'Codo a la altura del hombro, sin dolor',
    tips: ['Antebrazo vertical apoyado en el marco.', 'Da un paso adelante hasta sentir el pecho abrirse.', 'Hombro abajo y relajado.'],
    positions: [
      { label: 'Apoya', breath: 'in', verb: 'antebrazo en el marco', img: img('doorway-pec', 1) },
      { label: 'Avanza', breath: 'ex', verb: 'abre el pecho', img: img('doorway-pec', 2) },
    ],
    dose: { type: 'time', secs: 30, perSide: true }, imageStatus: 'vector',
  },
  {
    id: 'child-pose-lateral', name: 'Postura del niño + lateral', category: 'elongacion', equipment: ['mat'],
    focus: ['Zona lumbar', 'Dorsal ancho'], support: ['Oblicuos'],
    cue: 'Cadera hacia los talones',
    tips: ['Frente en el mat, brazos largos adelante.', 'Lateral: camina las manos hacia un lado y respira en las costillas.', 'Suelta la tensión en cada exhalación.'],
    positions: [
      { label: 'Centro', breath: 'ex', verb: 'suelta', img: img('child-pose-lateral', 1) },
      { label: 'Lateral', breath: 'in', verb: 'alcanza', img: img('child-pose-lateral', 2) },
    ],
    dose: { type: 'phases', phases: [{ label: 'Centro', secs: 30, pos: 0 }, { label: 'Lateral', secs: 15, pos: 1, perSide: true }] }, imageStatus: 'vector',
  },
  {
    id: 'kneeling-hip-flexor', name: 'Psoas y cuádriceps', category: 'elongacion', equipment: ['mat'],
    focus: ['Psoas', 'Recto femoral'], support: ['Cuádriceps'],
    cue: 'Pelvis hacia adentro, glúteo apretado',
    tips: ['Rodilla de atrás en el mat, rodilla delantera a 90°.', 'Lleva la cadera un poco adelante sin arquear la espalda.', 'Para más intensidad, toma el pie de atrás.'],
    positions: [
      { label: 'Lunge', breath: 'ex', verb: 'cadera adelante', img: img('kneeling-hip-flexor', 1) },
      { label: 'Toma el pie', breath: 'in', verb: 'talón al glúteo', img: img('kneeling-hip-flexor', 2) },
    ],
    dose: { type: 'time', secs: 30, perSide: true }, imageStatus: 'final',
  },
  {
    id: 'figure-4', name: 'Figura 4', category: 'elongacion', equipment: ['mat'],
    focus: ['Glúteo mayor', 'Piriforme'], support: [],
    cue: 'Tobillo cruzado, pie activo',
    tips: ['Cruza el tobillo sobre la rodilla contraria.', 'Toma el muslo de abajo y acércalo al pecho.', 'Cabeza y hombros relajados en el mat.'],
    positions: [
      { label: 'Cruza', breath: 'in', verb: 'tobillo sobre rodilla', img: img('figure-4', 1) },
      { label: 'Acerca', breath: 'ex', verb: 'muslo al pecho', img: img('figure-4', 2) },
    ],
    dose: { type: 'time', secs: 30, perSide: true }, imageStatus: 'final',
  },
];

export const MOVE_BY_ID = Object.fromEntries(MOVES.map(m => [m.id, m]));
