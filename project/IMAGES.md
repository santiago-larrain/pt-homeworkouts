# Ilustraciones

> **v1.3: animaciones por fotogramas.** Cada ejercicio es una secuencia de 3-5 fotogramas del mismo personaje (mujer y
> hombre), generada con Wonder como una sola "tira" y recortada con `project/tools/build_anim.py` →
> `docs/img/anim/<f|m>/<id>-<k>.webp`. Prompts y proceso: `prompts/PROMPTS_v5_wonder_strips.md`. Tiras originales:
> `references/anim/`. Configuración por ejercicio: `docs/data/anim.js`.
>
> Lo de abajo describe las ilustraciones anteriores (ChatGPT, 2 paneles), que siguen como referencia de estilo y como
> ancla al generar tiras nuevas. El modelo vectorial de `docs/js/rig/` (v1.2) queda solo como respaldo.

## Fotogramas (v1.3, pipeline v2 de la fase 3)
- `project/tools/anim_config.json` es la **única fuente de configuración** por movimiento (71): `frames`, `anchor`, `cuts` por modelo,
  `loop`, `pos`, `nowall`, `parts` (tiras unidas; ya sin uso), `matfix` (fracción de altura bajo la cual se rellena el mat escalonado) y `arrows` (`false` = sin flecha, o flechas manuales).
  `python3 project/tools/build_anim.py [id …]` corta todo (en paralelo) y **genera** `docs/data/anim.js` (`n`, `pos`, `loop`),
  `docs/data/arrows.js` (flechas) y `docs/img/anim/list.json`. No edites `anim.js` / `arrows.js` a mano.
- `strip_frames.py <tira> <N> <salida> <prefijo> [--anchor=feet|center|left|right] [--cuts=x1,…] [--nowall]` (también `cut_strip()` importable):
  separa las figuras por regiones conectadas, reconoce y reconstruye el suelo/mat, alinea por el punto de apoyo y exporta fotogramas del mismo tamaño.
- Ancla: `feet` de pie / en cuatro apoyos, `left` tendida con la cabeza a la izquierda (o el marco de puerta), `right` cuando
  los pies quedan fijos a la derecha, `center` para pasos laterales y vistas desde arriba. Si lo que debe quedar quieto se mueve, probar otra.
- **Aro (v1.11)**: cada ejercicio es propio y tiene su tira: `ring-squeeze` (vista desde los pies: el aro se ve de frente y se aplasta), `ring-adductor-lift` (torso arriba), `ring-legs-up` y `ring-legs-side` (de lado, las dos piernas suben juntas). Mismo aro en todas (metal gris con almohadillas rosadas). Flechas manuales por pares hacia el aro (`s` = escala); al soltar `frames.js` las invierte.
- Peso: fotogramas ≤ 640 px de ancho, WebP q80.

### Lo aprendido con el cortador (v2)
- **Ropa/calcetas blancas sobre el mat**: el blanco no es "tinta" frente al papel, así que el mat las borraba. Ahora, sobre el mat solo se
  descarta lo que se parece al color del mat (distancia < 60) y las zonas casi blancas CERRADAS por el contorno que tocan el suelo se
  recuperan como figura (`HOLE_MAX`). Solo con mat grueso (>12 px); con una línea fina de suelo no hace falta y puede unir figuras.
- **Pared pálida** pegada a una silla (incline-pushup): `nowall: true` quita las columnas grises claras casi de arriba abajo. En wall-sit la pared
  es parte del dibujo y se conserva.
- **Mat por figura** (child-pose-lateral, floor-fly): cada figura trae su propio rectángulo; se alinea por el centro y funciona sin tratamiento especial.
- `build_anim.py <id>` solo borra los fotogramas de ese id exacto (antes `glute-bridge` borraba `glute-bridge-iso`).
- Un error en un hijo del pool ya no cuelga la compilación (se informa al final).

### Flechas de movimiento
`project/tools/arrows.py` compara las máscaras alineadas de dos posiciones consecutivas: zona desocupada (de dónde sale) vs. zona ocupada de
nuevo (adónde va); centroide de la mayor componente de cada lado; descarta lo < 6 % del lado mayor (segundo intento a 3,5 % si no salió
ninguna); hasta 2 flechas; la curvatura sale de los fotogramas intermedios; evita la cara (mancha de pelo oscuro) y la excluye como origen.
Es una heurística: sirve bien en movimientos de una extremidad o de la cadera (puentes, elevaciones, zancadas, patadas) y falla en rotaciones
sobre un punto fijo y en cambios muy pequeños. Se sobreescribe a mano con `arrows` en `anim_config.json` (`{f: [[{from,to,curve}…]], m: …}`,
una lista por transición, coordenadas 0..1 del fotograma) o se apaga con `arrows: false` (calf-raise, overhead-triceps-ext, doorway-pec,
standing-side-bend, db-thruster). Revisión visual: `docs/dev/anim.html`.

### Revisión de flechas (v1.11)
`build_anim.py` pasa todas las flechas por `sanitize()`: descarta las de largo < 0,10 (la punta es mayor que el cuerpo y se lee como una mancha, p. ej. face-pull) y endereza las cortas (< 0,2) con curvatura > 0,15 (se veían como ganchos). Cada flecha admite `s` (escala del trazo; las cortas por pares usan 0,75). Si la figura casi no se mueve salvo una parte (floor-press, toe-taps) conviene fijar la flecha a mano: las automáticas salían de pequeñas derivas de las piernas.

### Fluidez
Se probó interpolación por flujo óptico (OpenCV DIS) para fotogramas intermedios en 6 movimientos variados: con movimientos grandes (sentadilla,
kb-halo, bird dog) deja fantasmas y desgarros iguales o peores que el fundido, así que **no se publica**. Lo que sí mejoró `frames.js`:
decodificar todo antes de animar, tiempos con aceleración/frenado suaves entre posiciones (mismo tiempo de traslado sin importar el nº de fotogramas),
y fundido corto con la figura nueva sobre la anterior opaca.

## Estilo definitivo (generado con ChatGPT)
Basado en `references/character-sheet.jpg`: la misma mujer (Anita) con piel morena clara, pelo castaño oscuro en coleta alta con una
trenza fina al costado, cuerpo atlético delgado, **top y calzas rosado/malva con estampado de hojas**, descalza. Estilo cartoon con
contorno café y sombreado suave, fondo blanco, **mat lavanda** en el suelo, línea gris clara si está de pie. Músculos en foco con forma anatómica
y fibras en **naranja**, de apoyo en **amarillo**, dibujados sobre la ropa. Flechas de movimiento azul marino. Sin texto.
Formato: 2 paneles (posición 1 | posición 2) separados por una línea gris vertical.

Referencias de estilo usadas originalmente (NO incluidas por copyright o privacidad): una ilustración cartoon de yoga (estilo y proporciones),
una lámina anatómica de 3DLABZ (músculos en naranja) y una foto real de Anita (rasgos). **No subir fotos reales al repo público.**

## Estado por movimiento
| id | Estado | Nota |
|---|---|---|
| cat-cow, shoulder-circles, good-morning, glute-bridge-iso, goblet-squat, b-stance-rdl, monster-walk, face-pull, floor-press, ring-adductor-lift, ring-legs-side, kneeling-hip-flexor, figure-4 | ✅ final | Generadas con ChatGPT (`references/generated/`) |
| dead-bug | 🟡 vector (3 fotogramas) | ChatGPT no logró brazo y pierna **opuestos**. Dibujo de `project/renderer` con la paleta del personaje |
| band-external-rotation | 🟡 vector (3 fotogramas) | Ídem. Ideal: vista 3/4 de espalda (ver prompts v3) |
| doorway-pec | 🟡 vector | Ídem |
| child-pose-lateral | 🟡 vector | Ídem (pos. 2 vista desde arriba) |

Prompts vigentes: `prompts/PROMPTS_v3_male_angles_frames.md` (modelo masculino, vistas 3/4 recomendadas y fotogramas intermedios;
una imagen por mensaje, editando la anterior para mantener el encuadre). `PROMPTS_v2_missing.md` sigue sirviendo para los 4 vectoriales.

`references/generated/3-3-ring-legs-side-panels-swapped.jpg` trae los paneles invertidos: el panel derecho es la posición 1 (foto 4).

## Cómo reemplazar una ilustración
1. Genera la imagen de 2 paneles (ver prompts). Guárdala en `project/references/generated/`.
2. Recorta los paneles: `project/tools/split_panels.py` detecta la línea divisoria, recorta el alto común de ambos paneles y exporta
   `docs/img/moves/<id>-1.webp` y `-2.webp` (ancho ≤ 900, calidad 82). Las rutas de entrada están al inicio del script; ajústalas.
   Si el divisor no es una línea gris (por ejemplo, dos imágenes pegadas), recorta a mano (ver el caso `ring-legs-side` en el historial).
3. Cambia `imageStatus` a `'final'` en `docs/data/catalog.js` y sube `CACHE_VERSION` en `docs/sw.js`.

## Trucos para que ChatGPT no confunda izquierda y derecha
- Nunca decir izquierda/derecha **de ella**: usar izquierda/derecha **de la imagen** y lado **cercano/lejano** a la cámara.
- Generar la posición 1 sola, y luego **editar esa misma imagen** cambiando solo la extremidad que se mueve.
- Adjuntar un diagrama de palitos (`references/diagrams/`, código en `tools/diagrams.js`): azul = lado cercano, gris = lado lejano.
- Adjuntar siempre la hoja de personaje y una imagen ya lista como ancla de estilo.

## Material heredado
- `legacy-renderer/`: generador vectorial anterior (Node + Playwright) que dibujaba las 34 poses en SVG (`rig2.js`, `poses2.js`)
  y la guía PDF v3 (`build2.js`). Sirve para crear placeholders o diagramas de pose nuevos.
- `references/legacy-guide-v3.pdf` y `references/legacy-pose-contact-sheet.png`: versión PDF previa y hoja de poses de referencia.
