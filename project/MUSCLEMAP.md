# Mapa muscular (PLAN_V2 4b)

Figura del cuerpo de **frente y de espalda** donde cada músculo se tiñe (gradiente ámbar → naranja → rojo anaranjado) según cuánto
lo trabaja un plan. SVG en línea, dibujado a mano (sin imágenes), una región por músculo canónico de `catalog_v2/NOTES.md` §2.

| Archivo | Qué es |
|---|---|
| `docs/js/musclemap.js` | Lógica: carga por músculo, SVG, leyenda, montaje con toques, CSS (`MM_CSS`). Sin dependencias de la app. |
| `docs/data/muscles.js` | **Datos**: `MUSCLES` (id, nombre, grupo, geometría por vista), `SILHOUETTE`, `WARP` (mujer/hombre), `DETAILS`, alias. |
| `docs/dev/musclemap.html` | Página de prueba (no es parte de la app): `?mode=light\|dark&theme=rosa\|estandar&g=f\|m&p=all\|regions\|names`. |

Al integrar: agregar `js/musclemap.js` y `data/muscles.js` a la lista de archivos de `docs/sw.js` y subir `CACHE_VERSION`.

## API

```js
import { muscleLoad, muscleLoadFromMoves, topMuscles, muscleMapSVG, mountMuscleMap,
         muscleLegendHTML, injectMuscleMapCSS, heatColor, levelOf } from './musclemap.js';
```

- `muscleLoad(plan, movesById, settings)` → `{ 'Glúteo mayor': 1, 'Cuádriceps': 0.62, … }` (0..1, normalizado al máximo; solo músculos con carga).
  Peso de cada item = segundos de trabajo × rondas del bloque (solo `circuit`; `sequence` cuenta 1) × (1 `focus` · 0,5 `support`; si está en ambos, el mayor).
  Segundos: `time` → `secs`; `reps` → `max × settings.secsPerRep` (3 por defecto); `phases` → suma; ×2 si `perSide`.
  Sin dosis en el item usa la del movimiento. `movesById` = `MOVE_BY_ID` (o el del catálogo v2). Planes en pareja: `settings.person` = `0` (defecto) | `1` | `'both'`.
- `muscleLoadFromMoves(list, movesById?, settings?)` → igual, para un movimiento (`[move]`) o un historial: cada elemento es un movimiento,
  o `{ move | id, secs?, weight? }` (`weight` = nº de sesiones).
- `topMuscles(load, n = 3)` → `[{ name, value }]` de mayor a menor.
- `muscleMapSVG(load, { gender:'f'|'m', size, views:'both'|'front'|'back', labels:false|true|'num', titles:true, style:true, selected })` → string SVG.
  `size` = ancho en px (sin él, ocupa el ancho del contenedor). `labels:true` pinta el nombre y `'num'` un número (solo depuración). `style:false` omite el `<style>` incluido
  (si ya llamaste a `injectMuscleMapCSS()`). Cada región es `<g class="mm-r mm-lN" data-m="Nombre canónico" data-v="0.62">` con `<title>` (tooltip nativo).
- `mountMuscleMap(el, load, opts)` → `{ update(load, opts?), select(name), destroy() }`. Pinta el SVG + leyenda dentro de `el` y añade el toque:
  etiqueta flotante «Nombre / 62 % · medio» (se cierra a los 4 s o al tocar fuera), la región se resalta con el color de acento. Si el toque cae junto
  a una región (≤ 6 unidades) elige la más cercana. `opts`: los de `muscleMapSVG` + `legend:true`, `topN:3`, `onSelect(name, value)`, `format(name, value) → {title, sub}`.
- `muscleLegendHTML(load, { n:3 })` → barra «menos ↔ más» (gradiente real) + chips con los n músculos principales y su %.
- `heatColor(v, dark)` / `levelOf(v)` para que otros gráficos usen la misma rampa.

El % mostrado es **relativo al músculo más trabajado del plan** (no un total). El color usa una curva suave (`v^0,8`) para separar mejor las cargas medias del neutro.

## Tema y colores

Todo va por variables CSS con respaldo (se definen en `:root` dentro de `MM_CSS`; cualquier ancestro puede sobrescribirlas):
`--mm-c0` (músculo sin trabajo), `--mm-c1…--mm-c16` (rampa), `--mm-body`, `--mm-outline`, `--mm-line`, `--mm-shade`, `--mm-ink`, `--mm-ink2`, `--mm-sel`, `--mm-chip`.
Lee `data-mode="dark"` (y `prefers-color-scheme` si no hay `data-mode`) y, cuando existen, `--accent`, `--accent-ink`, `--label`, `--label2`, `--card` de `DESIGN.md`:
el neutro y el cuerpo se tiñen un 3–8 % con `--accent`, así `rosa` queda cálido y `estandar` lila-azulado, **pero la rampa de calor es la misma en ambos temas** (naranja = trabajo).
- Claro: del ámbar pálido `#FFDA85` al rojo anaranjado `#A81F12` (la luminosidad **baja** con la carga: 0,75 → 0,09).
- Oscuro: del rojo apagado `#7A3A2C` al ámbar brillante `#FFD785` (la luminosidad **sube**: 0,07 → 0,72). En ambos la intensidad se lee por luminosidad además del tono (apta para daltonismo), no solo por el rojo/naranja.
- 16 niveles discretos (`.mm-l1…16`); la carga > 0 siempre llega al menos al nivel 1 (nunca se confunde con «sin trabajo»).

## Dibujo y geometría

- Cada vista usa x = distancia al eje (dx) e y = altura (cabeza y≈8, planta y≈408). Se dibuja **solo la mitad** y el módulo la espeja → izquierda y derecha siempre idénticas.
  Contornos como cadena `"x,y x,y! …"`; `!` marca una esquina, el resto se suaviza (Catmull-Rom → Bézier). Los puntos con dx≈1,4 dejan la línea media (columna, línea alba, pliegue interglúteo).
- **Silueta única parametrizada**: `SILHOUETTE` (cuerpo, brazo, cabeza) + `WARP` escala dx por altura. `f`: hombros 0,93, cintura 0,93, caderas 1,07. `m`: hombros 1,08, cintura 1,03, caderas 0,95.
  Las **mismas** regiones se deforman con la silueta, así que mujer y hombre comparten ids y nunca se desalinean.
- Orden de pintado: contorno de la silueta → relleno → regiones (por `z`) → sombreado cilíndrico (degradado en los bordes de tronco y brazos) → etiquetas.
- Un músculo puede tener varios contornos (recto abdominal en 4 bloques, cuádriceps = vasto lateral + vasto medial, isquiotibiales = 2 cabezas, gemelos, sóleo).

## Regiones y decisiones de mapeo

| Músculo canónico | Vista | Dónde se dibuja |
|---|---|---|
| Deltoides anterior | frente | cara anterior-interna del hombro |
| Deltoides lateral | frente + espalda | borde externo del hombro |
| Deltoides posterior | espalda | cara posterior-interna del hombro |
| Supraespinoso | espalda | sobre la espina de la escápula |
| Infraespinoso | espalda | cuerpo de la escápula (bajo la espina) |
| **Manguito rotador** | espalda | **tira lateral inferior de la escápula (redondo menor/mayor)**, junto al deltoides posterior. Es el único «resto» del manguito que se ve; infra/supraespinoso tienen región propia |
| Trapecio superior | frente + espalda | pendiente cuello–hombro |
| Trapecio medio / inferior | espalda | banda horizontal entre las escápulas / triángulo hacia T12 |
| Romboides | espalda | paralelogramo entre columna y borde medial de la escápula (profundo, se muestra sobre el trapecio) |
| Dorsal ancho | espalda | alas laterales hasta la cintura |
| Erectores espinales | espalda | columnas a cada lado de la columna, zona lumbar y torácica baja |
| Cuadrado lumbar | espalda | pequeña zona lateral a los erectores sobre la cresta ilíaca |
| Pectoral mayor | frente | abanico esternón → húmero |
| Serrato anterior | frente | dientes de sierra sobre las costillas laterales |
| Recto abdominal | frente | 4 pares de bloques |
| Oblicuos | frente | flanco entre el serrato y el recto |
| **Transverso abdominal** | frente | **banda del bajo vientre (V bajo el ombligo)**; es profundo, no se ve: se muestra donde se siente al «meter la panza» |
| **Psoas** | frente | **franja diagonal del pliegue de la cadera (ingle)** |
| Glúteo mayor | espalda | masa principal del glúteo |
| Glúteo medio | espalda | porción superior-externa bajo la cresta ilíaca |
| Glúteo mínimo | espalda | pieza pequeña bajo el medio, hacia el trocánter (profundo) |
| Piriforme | espalda | tira fina del sacro al trocánter, sobre el glúteo mayor (profundo; se pinta encima, `z:2`) |
| Tensor de la fascia lata | frente | tira lateral de la cadera |
| Cuádriceps | frente | vasto lateral (externo) + vasto medial (gota interna). El recto femoral es propio |
| Recto femoral | frente | tira central del muslo |
| Aductores | frente | cara interna alta del muslo |
| Isquiotibiales | espalda | bíceps femoral + semitendinoso/semimembranoso |
| Gemelos | espalda (+ bordes en frente) | dos cabezas; de frente se ven los abultamientos laterales de la pantorrilla |
| Sóleo | espalda (+ frente) | flancos de la pantorrilla baja, bajo los gemelos |
| Tibial anterior | frente | canilla |
| Bíceps / Braquial | frente | vientre del bíceps / brazo externo-inferior |
| Tríceps | espalda | cara posterior del brazo |
| Antebrazos | frente + espalda | flexores / extensores |

Alias (`muscles.js`, sin importar tildes ni mayúsculas): `Transverso` → Transverso abdominal, `Zona lumbar`/`Lumbar` → Erectores espinales, `Abdominales` → Recto abdominal.
Los alias de **grupo** suman a todos sus miembros: `Deltoides`/`Hombros` → los 3 deltoides, `Trapecio` → superior+medio+inferior, `Glúteos` → mayor+medio, `Pantorrillas` → gemelos+sóleo, `Abductores` → glúteo medio + TFL.
`canonicalMuscles(nombre)` devuelve la lista (vacía si no se reconoce; esos nombres se ignoran en silencio).

## Cómo agregar un músculo

1. En `docs/data/muscles.js`, añade a `MUSCLES`: `{ id, name (canónico), group, front?: ['x,y x,y! …'], back?: [...], z? }`. Dibuja la mitad con dx ≥ 1,4 (usa `/dev/musclemap.html?p=regions` para ver y numerar todas).
2. Si es un nombre alternativo, agrégalo a los alias. Si hay que mostrarlo en otro grupo, usa un `group` de `GROUPS`.
3. Confirma en `?p=regions` (mujer y hombre) que queda dentro de la silueta y sin solaparse; sube `CACHE_VERSION` en `docs/sw.js`.

## Limitaciones conocidas

- Estilizado, no atlas anatómico: forma de cabeza, manos y pies simplificada; una sola silueta por género (sin tallas); la mujer no lleva busto en el contorno.
- Los músculos profundos (transverso, psoas, piriforme, glúteo mínimo, manguito) son una *convención* de ubicación, no su posición real.
- Regiones pequeñas (supraespinoso, glúteo mínimo, braquial, sóleo) son difíciles de tocar a 300 px; el toque «cercano» (6 unidades) ayuda pero puede elegir la vecina.
- Los ids de degradado (`mmShB`, `mmShA`) se repiten si hay varios mapas en la página (idénticos, sin problema) salvo que el primero esté en `display:none`.
- La región no es enfocable con teclado; el equivalente accesible es el `aria-label` del SVG y los chips de la leyenda.
- Cada mapa (2 vistas) pesa ≈ 55 kB de SVG; con muchos mapas en una lista conviene `views:'front'|'back'` o montarlos bajo demanda.
