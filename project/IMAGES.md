# Ilustraciones: estilo, estado y flujo de trabajo

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
