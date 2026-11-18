# CLAUDE.md: PT Home Workouts

Web app (PWA) de entrenamiento en casa para **Anita**, instalable en iPhone desde Safari ("Agregar a inicio"),
sin cuentas ni servidor. Se publica con **GitHub Pages desde la carpeta `/docs`** de la rama `main`.
Todo el contenido visible está en **español** (Chile/neutral). El código y los comentarios técnicos pueden estar en español.

## Mapa del repo

| Ruta | Qué es |
|---|---|
| `docs/` | **La app publicada** (raíz de GitHub Pages). Sin build: HTML + ES modules + CSS. |
| `docs/data/catalog.js` | **Galería de movimientos** (`MOVES`, 73): los 17 originales + `moves2.js`. Fuente de verdad de cada ejercicio. |
| `docs/data/moves2.js` | Movimientos v2 (`MOVES2`, 56) con `CATEGORIES2` y `EQUIPMENT2`; lo genera `project/tools/gen_moves2.py` desde `project/catalog_v2/moves.json`. `catalog.js` los concatena. |
| `docs/data/plans.js` | **Planes incluidos** (`DEFAULT_PLANS`): *Dynamic Reset 3×3* + `PLANS2`. |
| `docs/data/plans2.js` | Planes v2 (`PLANS2`, 5): Cuerpo completo 20, Glúteos y piernas con bandas, Tren superior con mancuernas, Core y postura, Movilidad 10. |
| `docs/js/musclemap.js` · `docs/data/muscles.js` | **Mapa muscular** (SVG frente/espalda teñido por carga) y su geometría/alias. Ver `project/MUSCLEMAP.md`. |
| `docs/js/health.js` | Fase 6 (v1.8): configuración del Atajo de Apple (nombre, enlace iCloud), `.ics` de recordatorios, URLs `shortcuts://`, lectura de `?health=`. Ver `project/SHORTCUT.md`. |
| `docs/js/calories.js` | Motor de calorías (funciones puras): MET × peso con corrección Mifflin, descansos, carga acotada. Autotest: `node project/tools/test_calories.mjs`. Ver `project/RESEARCH_CALORIES.md`. |
| `docs/js/progress.js` | Semanas, meta semanal, racha en SEMANAS e hitos (puras). Los hitos se guardan por perfil en `profile.milestones`. |
| `docs/js/engine.js` | Convierte un plan en pasos del temporizador (`buildSteps`), textos de dosis y estimaciones. |
| `docs/js/app.js` | UI: navegación por pestañas, vistas, sheets, editor de planes y **reproductor** (`P`). |
| `docs/js/store.js` | Estado en `localStorage` (`ptw.state.v1`): ajustes, planes editados, historial. |
| `docs/js/audio.js` | Pitidos con Web Audio + voz guía (`speechSynthesis`). |
| `docs/sw.js` | Service worker (offline). **Subir `CACHE_VERSION` en cada cambio.** Al instalar guarda el núcleo + la miniatura de cada movimiento; los fotogramas de los planes de la usuaria los pide la app con un mensaje `warm` y el resto se guarda al verlos. |
| `docs/data/anim.js` · `docs/data/arrows.js` | **Animaciones** (`ANIM`): fotogramas por movimiento y qué fotograma es cada posición; `ARROWS`: flechas de movimiento (se generan, no se editan a mano). |
| `docs/js/frames.js` | Reproductor de fotogramas (`FrameAnimator`): precarga, fundidos, pausas en cada posición, respiración y capa SVG de flechas (se espeja con `.flip`). |
| `docs/img/anim/<f\|m>/<id>-<k>.webp` | **Fotogramas** (fuente de verdad visual, v1.3), mujer `f` y hombre `m`. `list.json` = lista para el service worker. |
| `docs/js/rig/` | Modelo vectorial anterior (v1.2). Solo **respaldo** para movimientos sin fotogramas. |
| `docs/img/equipment/<id>.webp` | Ilustraciones de implementos (v1.9, Wonder, 360 px) para la hoja de cada implemento (chips de equipo → `eqSheetHTML` en `app.js`; cargas por perfil en `profile.loads`). Fuentes en `project/references/equipment/`. |
| `docs/img/moves/<id>-N.webp` | Ilustraciones antiguas (ChatGPT/vector). **Ya no se usan en la app**; quedan como referencia visual. |
| `project/renderer/` | Versión Node antigua del dibujo (exporta PNG). La app usa `docs/js/rig/`. |
| `project/references/anim/` | Tiras originales de Wonder (`<f\|m>-<id>.jpg`), fuente de los fotogramas. |
| `project/tools/anim_config.json` | **Configuración por movimiento** (fotogramas, ancla, cortes por modelo, `pos`, `loop`, flechas manuales…). Dirige `build_anim.py`. |
| `project/tools/build_anim.py` | Recorta las tiras → `docs/img/anim/`, y genera `anim.js`, `arrows.js` y `list.json` (usa `strip_frames.py` y `arrows.py`). |
| `project/` | Contexto, investigación, decisiones de diseño, prompts de imágenes y material fuente (NO se publica como app, pero el repo es público). |

Lee también: `project/PROGRAM.md` (rutina original), `project/RESEARCH.md` (técnica de cada ejercicio),
`project/DESIGN.md` (sistema visual, HIG), `project/IMAGES.md` (cómo se generan y procesan las ilustraciones),
`project/ROADMAP.md` (pendientes).

## Modelo de datos

- **Movimiento** (`MOVES`): `id`, `name`, `category`, `group` (grupo muscular para filtrar), `level` (1-3), `met`, `sided`/`mirror`, `equipment[]`, `focus[]` (músculos en foco: naranja), `support[]` (apoyo: amarillo),
  `cue` (clave técnica corta), `setup?` (nota de preparación: se muestra bajo la clave técnica en el detalle y en el reproductor), `tips[]`, `positions[2]` con `{label, breath:'in'|'ex', verb, img}`, `dose` por defecto, `imageStatus` (`final` | `placeholder`).
  `breath` indica cómo respirar **para llegar** a esa posición (regla: exhala en el esfuerzo).
- **Dosis**: `{type:'time', secs, perSide?, note?}` | `{type:'reps', min, max, perSide?, alternating?, unit?}` |
  `{type:'phases', phases:[{label, secs, pos, perSide?}]}` (`pos` fija qué imagen se muestra).
- **Plan**: `{id, name, subtitle, goal, frequency, mode:'solo'|'duo', people?, sections:[{id, name, note, kind:'circuit'|'sequence', rounds, rest, gap?, items:[{move, dose?, b?}]}]}`.
  `gap?` (s) fija la pausa entre ejercicios de ese bloque (el motor usa el menor entre `gap` y Ajustes → Descanso entre ejercicios); sin `gap`, vale Ajustes. `rest` solo actúa en circuitos (entre rondas).
  **Plan en pareja** (`mode:'duo'`): cada item agrega `b: {move, dose}` para la persona 2; `people: [{name, model:'f'|'m'}, …]`.
  Un solo ritmo para ambas: `settings.duoGovern` = `'time'` (reps → segundos con `secsPerRep`, se usa el más largo) o `'reps'` (espera "Hecho" de las dos).
  En el reproductor: persona 1 arriba, controles al centro, persona 2 abajo.
- **Animación (v1.3)**: cada movimiento es una secuencia de 3-5 **fotogramas** del mismo personaje, generados con Wonder
  como una "tira" (todas las poses en una sola imagen, así el personaje sale idéntico) y recortados/alineados por
  `project/tools/build_anim.py`. `ANIM[id]` en `docs/data/anim.js`: `n` fotogramas, `pos` (fotograma de cada posición),
  `loop` (ciclo en vez de ida y vuelta). `FrameAnimator` recorre los fotogramas con fundidos y se detiene en cada posición;
  con una posición fija (fases, `dose.phases[].pos`) muestra ese fotograma quieto. Las miniaturas usan el fotograma de la posición.
  El borde de la imagen (`.glow`) se tiñe de azul (inhala) o rojo (exhala) según la posición hacia la que va.
  Movimientos sin entrada en `ANIM` usan el modelo vectorial de `docs/js/rig/` (v1.2) como respaldo.
- **Modelos**: `settings.model` ('f' | 'm') o `plan.people[i].model` en planes en pareja → carpeta `img/anim/f` o `img/anim/m`.
  Mujer: hoja `project/references/character-sheet.jpg`; hombre: `character-sheet-male.jpg`.
  Los planes referencian movimientos por id: **galería y planes están desacoplados**.
- **Historial (v1.6)**: cada sesión guarda `profiles`, `kcal:{perfil:n}`, `kcalApprox` (perfiles que usaron datos por defecto), `moveSecs:{perfil:{movimiento:segundos}}`, `secs`, `planId`, `blocks`. Las sesiones anteriores no tienen kcal. Perfil: `weights:[{date,kg,cm?}]`, `weeklyGoal`, `milestones:{id:fecha}`.
- **Mapa muscular**: `muscleLoad(plan)` / `muscleLoadFromMoves(...)` → carga 0..1 por músculo canónico (foco 1, apoyo 0,5, por tiempo de trabajo). Tarjetas «Qué trabaja» en el detalle del plan (con selector de persona en pareja) y del movimiento, mapa semanal/mensual en Historial → Actividad (a partir de `moveSecs`), mapa de la sesión en su detalle y «Hoy trabajaste» en el cierre del reproductor (solo si cabe sin desplazarse). Los nombres de `focus`/`support` se reconocen con los alias de `muscles.js` (`canonicalMuscles`); la búsqueda y el filtro «Músculo específico» del catálogo usan lo mismo.
- **Recordatorios y Salud (v1.8)**: `profile.reminders = {on, days:[0-6 (0=domingo)], time:'HH:MM', seq}`; `settings.healthShortcut` (¿instalado el Atajo?), `settings.healthLog` (guardar entrenamientos en Salud), `settings.reminderOffer` (oferta de recordatorio descartada). Pesos importados de Salud llevan `source:'salud'`. El puente con iOS es solo un Atajo (`project/SHORTCUT.md`): ni notificaciones locales ni HealthKit son posibles en una PWA.
- **Aro (v1.11, `state.version` 6)**: `ring-squeeze` / `ring-adductor-lift` («torso arriba») / `ring-legs-up` / `ring-legs-side` («lateral») son ejercicios propios (aprieta y suelta, 2 posiciones, dosis de repeticiones) con flechas por pares hacia el aro. `store.migrateRing` convierte los items antiguos de dos fases (sin dosis o con dosis `phases`) en los ejercicios nuevos; el motor sigue aceptando dosis `phases`.
- Los planes incluidos se copian al estado local al primer uso. Las ediciones de la usuaria nunca se sobrescriben;
  "Restaurar plan original" vuelve a copiar desde `plans.js`. Los planes nuevos de `plans.js` se agregan solos.

## Reglas al cambiar cosas

1. **Nunca romper datos guardados**: si cambias la forma del estado, migra en `store.load()` (no cambies `KEY` sin migración).
2. Movimiento nuevo: entrada en `project/catalog_v2/moves.json` (y `python3 project/tools/gen_moves2.py` → `docs/data/moves2.js`) o en `MOVES` de `catalog.js`;
   tiras de Wonder para mujer y hombre (`project/prompts/PROMPTS_v5_wonder_strips.md`) guardadas en `project/references/anim/<f|m>-<id>.jpg`;
   su entrada en `project/tools/anim_config.json` (fotogramas, ancla, cortes, `pos`, `loop`, flechas) y `python3 project/tools/build_anim.py <id>`,
   que genera los fotogramas, `docs/data/anim.js`, `docs/data/arrows.js` y `docs/img/anim/list.json` (ya no hay que editar `ANIM` ni `STRIPS` a mano).
   Revisa la tira (biomecánica, lados, aro/banda), los fotogramas recortados y las flechas (`docs/dev/anim.html`) antes de publicar.
   Sube `CACHE_VERSION` en `docs/sw.js`; si el movimiento usa archivos JS nuevos, agrégalos a `CORE`.
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
