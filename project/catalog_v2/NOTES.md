# Catálogo v2: notas de integración

`moves.json` contiene 54 movimientos nuevos (ninguno repite los 17 de `docs/data/catalog.js`). Cada uno trae `group`, `sided`, `mirror`,
`met`, `level` y `strip` (parámetros de `build_anim.py` + `prompt_f`, el prompt completo de Wonder para la tira de la **mujer**; la tira del hombre
sale con la Plantilla 2 de `PROMPTS_v5`). Las imágenes no existen todavía: `imageStatus: 'placeholder'` hasta generarlas.

## 1. Categorías, grupos y equipo nuevos

**Categorías** (`CATEGORIES`, para la galería): existentes `movilidad`, `piernas`, `torso`, `core`, `elongacion`. **Nuevas:**
`espalda` ("Espalda"), `brazos` ("Brazos"), `cardio` ("Cardio suave").

**Grupos** (`group`, para filtrar; id fijo, ver también la sección 2): `piernas`, `gluteos` ("Glúteos"), `core`, `espalda`, `pecho`, `hombros`, `brazos`, `movilidad`, `cardio`.
Los estiramientos estáticos usan `group: 'movilidad'`; el músculo estirado se filtra por `focus`.

**Equipo** (`EQUIPMENT`): existentes `ninguno, mat, mancuernas, mini-banda, banda, aro, puerta`. **Nuevos:** `kettlebell` ("Kettlebell"), `silla` ("Silla").
Nota: `banda` = banda elástica de brazos; `mini-banda` = banda corta de piernas. "Wall/pared" no es equipo (ninguno).

**Campos del `strip`:** `frames` 4-6 (6 solo en la sentadilla con press; el resto 4-5), `anchor` (`feet` de pie, `left`/`right` tendida con la parte fija a ese lado,
`center` para pasos laterales y vistas desde arriba/atrás), `loop` (cíclico), `pos` (fotograma de cada posición, base 0), `ground` (`floor-line` o `mat`).
Ejercicios con soporte fijo (pared, marco, silla) lo incluyen en `props` del prompt: dibujar en cada fotograma.
`sided: true` = se hace por lado (la dosis lleva `perSide`); `mirror: true` = la imagen espejada muestra correctamente el otro lado.
En vistas de perfil la pierna/brazo que trabaja es el **cercano a la cámara**; el espejo muestra el lado contrario.

## 2. Lista canónica de músculos y grupo muscular

Nombre canónico (usar en `focus`/`support`) → grupo para el filtro "por músculo / grupo muscular".

| Grupo | Músculos canónicos |
|---|---|
| piernas | Cuádriceps, Recto femoral, Isquiotibiales, Aductores, Gemelos, Sóleo, Tibial anterior |
| gluteos | Glúteo mayor, Glúteo medio, Glúteo mínimo, Piriforme, Tensor de la fascia lata |
| core | Recto abdominal, Transverso abdominal, Oblicuos, Cuadrado lumbar, Psoas |
| espalda | Erectores espinales, Dorsal ancho, Romboides, Trapecio superior, Trapecio medio, Trapecio inferior |
| pecho | Pectoral mayor, Serrato anterior |
| hombros | Deltoides anterior, Deltoides lateral, Deltoides posterior, Manguito rotador, Infraespinoso, Supraespinoso |
| brazos | Bíceps, Braquial, Tríceps, Antebrazos |

Alias a normalizar al migrar el catálogo viejo: `Transverso` → `Transverso abdominal`; `Zona lumbar` → `Erectores espinales` (y `Cuadrado lumbar` si es estiramiento lateral).
`Psoas` se cuenta en *core* (flexor de cadera profundo). Un movimiento pertenece a su `group` propio; el filtro por músculo busca en `focus` (principal) y `support` (apoyo).
Nota sobre `sided`/`mirror` en los movimientos que se alternan cada repetición (Dead Bug, Bird dog, Toe taps, Superman): `sided: false`, `mirror: true`
(el espejo sirve para mostrar el lado contrario en la repetición siguiente).

## 3. Metadatos para los 17 movimientos existentes

| id | group | sided | mirror | met | level |
|---|---|---|---|---|---|
| cat-cow | movilidad | no | no | 2.5 | 1 |
| shoulder-circles | movilidad | no | no | 2.5 | 1 |
| good-morning | gluteos | no | no | 3.0 | 1 |
| glute-bridge-iso | gluteos | no | no | 3.0 | 1 |
| goblet-squat | piernas | no | no | 4.3 | 2 |
| b-stance-rdl | gluteos | sí | sí | 3.8 | 2 |
| monster-walk | gluteos | sí | sí | 3.8 | 2 |
| face-pull | espalda | no | no | 3.0 | 1 |
| floor-press | pecho | no | no | 3.5 | 1 |
| band-external-rotation | hombros | sí | sí | 3.0 | 1 |
| dead-bug | core | no | sí | 3.0 | 1 |
| ring-adductor-lift | core | no | no | 3.5 | 2 |
| ring-legs-side | core | sí | sí | 3.5 | 2 |
| doorway-pec | movilidad | sí | sí | 2.3 | 1 |
| child-pose-lateral | movilidad | sí | sí | 2.3 | 1 |
| kneeling-hip-flexor | movilidad | sí | sí | 2.3 | 1 |
| figure-4 | movilidad | sí | sí | 2.3 | 1 |

(`met` según la tabla de `project/RESEARCH_CALORIES.md`; son valores de esfuerzo, el descanso usa 1,5.)

## 4. Resumen de `moves.json`

| Grupo | n | Ids |
|---|---|---|
| piernas | 8 | bodyweight-squat, chair-squat, reverse-lunge, split-squat, lateral-lunge, wall-sit, calf-raise, kb-sumo-squat |
| gluteos | 10 | glute-bridge, single-leg-bridge, banded-bridge, ring-bridge, donkey-kick, fire-hydrant, clamshell, side-lying-leg-raise, kb-deadlift, kb-swing |
| core | 6 | plank, side-plank-knee, bird-dog, curl-up, reverse-crunch, toe-taps |
| espalda | 7 | superman, db-pullover, bent-over-row, one-arm-row-chair, band-row, band-pull-apart, reverse-fly |
| pecho | 5 | incline-pushup, knee-pushup, floor-fly, band-chest-press, ring-chest-press |
| hombros | 3 | db-shoulder-press, lateral-raise, kb-halo |
| brazos | 4 | biceps-curl, hammer-curl, overhead-triceps-ext, band-triceps-pushdown |
| movilidad | 7 | thoracic-open-book, wall-angel, hamstring-stretch-supine, sphinx, seated-twist-chair, standing-quad-stretch, standing-side-bend |
| cardio | 4 | march-in-place, low-impact-skater, mountain-climber-slow, db-thruster |

Sin barra de dominadas. Niveles: 1 = principiante (31), 2 = intermedio (22), 3 = avanzado (1: kb-swing). Favorecidos: sin sobrecarga de hombro
(floor-fly con tope del suelo, press en silla con agarre neutro, pullover con rango cómodo), apoyo de silla/pared para equilibrio.

Revisión pendiente antes de generar imágenes: las vistas "desde atrás" (reverse-fly, fire-hydrant), "desde arriba" (floor-fly) y la "frontal" (band-pull-apart, thoracic-open-book)
requieren escorzo; si Wonder falla, regenerar con ángulos explícitos por fotograma o cambiar de vista (ver "Trucos" de PROMPTS_v5).
Seguridad: la banda anclada en la puerta (band-chest-press, band-triceps-pushdown) debe ir por el lado de las bisagras o con un tope de puerta; indicarlo en la UI.

## 5. Planes incluidos propuestos

Dosis en formato de `plans.js`; `rest` en segundos entre rondas. Duraciones estimadas con 30-40 s por serie de reps.

### 5.1 Cuerpo completo 20 min (peso corporal), `goal`: fuerza general sin implementos, `frequency`: 3×/semana
- **Calentamiento** (sequence, 1 ronda): march-in-place `time 45`, cat-cow `time 45`, shoulder-circles `time 30`, good-morning `time 40`
- **Circuito** (circuit, 3 rondas, rest 45): bodyweight-squat `reps 12-15`, incline-pushup `reps 8-12` (o knee-pushup), reverse-lunge `reps 8-10 perSide`, bird-dog `reps 8-10 alternating`, glute-bridge `reps 12-15`
- **Core** (sequence, 1 ronda): plank `time 25`, dead-bug `reps 10-12 alternating`
- **Vuelta a la calma** (sequence): child-pose-lateral (fases por defecto), figure-4 `time 30 perSide`, standing-quad-stretch `time 30 perSide`

### 5.2 Glúteos y piernas con bandas, `goal`: glúteo medio/mayor y piernas con mini-banda, `frequency`: 2-3×/semana, ≈ 30 min
- **Activación** (sequence): glute-bridge `reps 12`, fire-hydrant `reps 10 perSide`, clamshell `reps 12 perSide`
- **Tri-set A** (circuit, 3 rondas, rest 50): banded-bridge `reps 15`, goblet-squat `reps 10-12` (3 kg + banda), monster-walk `reps 10 perSide unit pasos`
- **Tri-set B** (circuit, 2 rondas, rest 45): single-leg-bridge `reps 8-10 perSide`, side-lying-leg-raise `reps 12 perSide`, donkey-kick `reps 12 perSide`
- **Estiramiento** (sequence): kneeling-hip-flexor `time 30 perSide`, figure-4 `time 30 perSide`, standing-quad-stretch `time 30 perSide`

### 5.3 Tren superior con mancuernas (amigable con el hombro), `goal`: espalda, pecho, hombros y brazos, ≈ 30 min
- **Movilidad** (sequence): shoulder-circles `time 30`, wall-angel `time 40`, cat-cow `time 30`
- **Tri-set A** (circuit, 3 rondas, rest 60): floor-press `reps 10-12`, bent-over-row `reps 10-12`, db-shoulder-press `reps 8-10`
- **Brazos y hombro posterior** (circuit, 2 rondas, rest 45): biceps-curl `reps 12`, overhead-triceps-ext `reps 10-12`, reverse-fly `reps 12`, lateral-raise `reps 10`
- **Estiramiento** (sequence): doorway-pec `time 30 perSide`, child-pose-lateral (fases por defecto), standing-side-bend `time 20 perSide`

### 5.4 Core y postura, `goal`: abdomen profundo y espalda alta, `frequency`: 3-4×/semana, ≈ 20 min
- **Entrada** (sequence): cat-cow `time 45`, thoracic-open-book `reps 8 perSide`, sphinx `time 30`
- **Circuito de core** (circuit, 3 rondas, rest 30): dead-bug `reps 10-12 alternating`, bird-dog `reps 8-10 alternating`, curl-up `reps 10-12`, side-plank-knee `time 20 perSide`, toe-taps `reps 10 alternating`
- **Postura** (circuit, 2 rondas, rest 30): band-pull-apart `reps 12-15`, face-pull `reps 12`, band-external-rotation `reps 10 perSide`
- **Cierre** (sequence): doorway-pec `time 30 perSide`, child-pose-lateral (fases por defecto)

### 5.5 Movilidad 10 min, `goal`: soltar caderas, columna y hombros, para cualquier día, sin esfuerzo
- **Secuencia** (sequence, 1 ronda, pausa 5 s): cat-cow `time 45`, thoracic-open-book `reps 6 perSide`, sphinx `time 30`, child-pose-lateral (fases por defecto), shoulder-circles `time 30`, wall-angel `time 40`, good-morning `time 30`, kneeling-hip-flexor `time 30 perSide`, figure-4 `time 30 perSide`, hamstring-stretch-supine `time 30 perSide`, standing-side-bend `time 20 perSide`, seated-twist-chair `time 20 perSide`

Estos planes usan solo ids de `moves.json` y del catálogo actual; `mode: 'solo'`. Para parejas, un `b.move` equivalente en cada item (p. ej. incline-pushup ↔ knee-pushup).
