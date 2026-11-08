# CLAUDE.md: PT Home Workouts

Web app (PWA) de entrenamiento en casa para **Anita**, instalable en iPhone desde Safari ("Agregar a inicio"),
sin cuentas ni servidor. Se publica con **GitHub Pages desde la carpeta `/docs`** de la rama `main`.
Todo el contenido visible está en **español** (Chile/neutral). El código y los comentarios técnicos pueden estar en español.

## Mapa del repo

| Ruta | Qué es |
|---|---|
| `docs/` | **La app publicada** (raíz de GitHub Pages). Sin build: HTML + ES modules + CSS. |
| `docs/data/catalog.js` | **Galería de movimientos** (`MOVES`). Fuente de verdad de cada ejercicio. |
| `docs/data/plans.js` | **Planes incluidos** (`DEFAULT_PLANS`). Hoy: *Dynamic Reset 3×3*. |
| `docs/js/engine.js` | Convierte un plan en pasos del temporizador (`buildSteps`), textos de dosis y estimaciones. |
| `docs/js/app.js` | UI: navegación por pestañas, vistas, sheets, editor de planes y **reproductor** (`P`). |
| `docs/js/store.js` | Estado en `localStorage` (`ptw.state.v1`): ajustes, planes editados, historial. |
| `docs/js/audio.js` | Pitidos con Web Audio + voz guía (`speechSynthesis`). |
| `docs/sw.js` | Service worker (offline). **Subir `CACHE_VERSION` en cada cambio.** |
| `docs/js/rig/` | **Modelo animado** (fuente de verdad visual): `rig.js` (esqueleto, cuerpo, músculos, modelos mujer/hombre), `poses.js` (poses clave por movimiento), `anim.js` (interpolación en vivo, encuadre, miniaturas). |
| `docs/img/moves/<id>-N.webp` | Ilustraciones antiguas (ChatGPT/vector). **Ya no se usan en la app**; quedan como referencia visual. |
| `project/renderer/` | Versión Node antigua del dibujo (exporta PNG). La app usa `docs/js/rig/`. |
| `project/` | Contexto, investigación, decisiones de diseño, prompts de imágenes y material fuente (NO se publica como app, pero el repo es público). |

Lee también: `project/PROGRAM.md` (rutina original), `project/RESEARCH.md` (técnica de cada ejercicio),
`project/DESIGN.md` (sistema visual, HIG), `project/IMAGES.md` (cómo se generan y procesan las ilustraciones),
`project/ROADMAP.md` (pendientes).

## Modelo de datos

- **Movimiento** (`MOVES`): `id`, `name`, `category`, `equipment[]`, `focus[]` (músculos en foco: naranja), `support[]` (apoyo: amarillo),
  `cue` (clave técnica corta), `tips[]`, `positions[2]` con `{label, breath:'in'|'ex', verb, img}`, `dose` por defecto, `imageStatus` (`final` | `placeholder`).
  `breath` indica cómo respirar **para llegar** a esa posición (regla: exhala en el esfuerzo).
- **Dosis**: `{type:'time', secs, perSide?, note?}` | `{type:'reps', min, max, perSide?, alternating?, unit?}` |
  `{type:'phases', phases:[{label, secs, pos, perSide?}]}` (`pos` fija qué imagen se muestra).
- **Plan**: `{id, name, subtitle, goal, frequency, mode:'solo'|'duo', people?, sections:[{id, name, note, kind:'circuit'|'sequence', rounds, rest, items:[{move, dose?, b?}]}]}`.
  **Plan en pareja** (`mode:'duo'`): cada item agrega `b: {move, dose}` para la persona 2; `people: [{name, model:'f'|'m'}, …]`.
  Un solo ritmo para ambas: `settings.duoGovern` = `'time'` (reps → segundos con `secsPerRep`, se usa el más largo) o `'reps'` (espera "Hecho" de las dos).
  En el reproductor: persona 1 arriba, controles al centro, persona 2 abajo.
- **Animación (v1.2)**: cada movimiento tiene poses clave en `docs/js/rig/poses.js` (`RIG[id].keys`, en el orden de `positions`;
  `via` = poses de paso sin pausa; `morph:false` = vistas distintas, solo fundido). `anim.js` normaliza las poses a ángulos
  y las interpola en vivo (~30-40 fps) con suavizado; mismo esqueleto para todos los ejercicios y para ambos modelos.
  Para un movimiento nuevo: agrega sus poses en `RIG` (mismo formato que las existentes) y su entrada en `MOVES`.
  El borde de la imagen (`.glow`) se tiñe de azul (inhala) o rojo (exhala) según el fotograma visible.
- **Modelos**: `settings.model` ('f' | 'm') o `plan.people[i].model` en planes en pareja. `MODELS` en `rig.js` define colores, ropa, pelo y proporciones.
  Próximo paso visual: "skins" (piezas del cuerpo de ChatGPT pegadas a cada hueso), ver `project/prompts/PROMPTS_v4_body_parts_skin.md`.
  Los planes referencian movimientos por id: **galería y planes están desacoplados**.
- Los planes incluidos se copian al estado local al primer uso. Las ediciones de la usuaria nunca se sobrescriben;
  "Restaurar plan original" vuelve a copiar desde `plans.js`. Los planes nuevos de `plans.js` se agregan solos.

## Reglas al cambiar cosas

1. **Nunca romper datos guardados**: si cambias la forma del estado, migra en `store.load()` (no cambies `KEY` sin migración).
2. Movimiento nuevo: poses en `docs/js/rig/poses.js` + entrada en `MOVES`. Sube `CACHE_VERSION` en `docs/sw.js`.
   Verifica todas las poses con una página de prueba (render de cada pose y del punto medio) en claro, para ambos modelos.
3. Cambios de UI: respeta `project/DESIGN.md`: un solo color de acento (rosa `#E0457B` / `#FF6E9C` en oscuro),
   fuente del sistema, listas agrupadas, zonas táctiles ≥ 44 px, modo claro/oscuro, `prefers-reduced-motion`.
4. iOS: el audio solo se activa tras un toque (`unlockAudio()` al iniciar la sesión). El temporizador usa
   timestamps (`endsAt`) para seguir correcto si la pantalla se bloquea. La pantalla se mantiene encendida con Wake Lock.
   Cada paso tiene `key` estable: los ajustes cambiados durante una sesión (botón ⚙︎ del reproductor) reconstruyen los pasos
   (`P.rebuild`) sin perder la posición.
   Datos: `localStorage` + `navigator.storage.persist()`. En iOS la app instalada en inicio NO caduca; en Safari sin instalar,
   ITP puede borrar los datos tras 7 días sin uso. Safari y la app instalada tienen almacenamientos separados.
5. Las imágenes de una misma persona/estilo deben ser coherentes (ver `project/IMAGES.md`). Nunca subas fotos reales
   de Anita ni imágenes de terceros con copyright a este repo público.
6. Verifica en un viewport de iPhone antes de publicar (Playwright: `devices['iPhone 13']`, claro y oscuro), sirviendo
   `docs/` con `python3 -m http.server`.

## Publicación

GitHub → Settings → Pages → *Deploy from a branch* → `main` / `/docs`.
URL esperada: `https://santiago-larrain.github.io/pt-homeworkouts/`.
