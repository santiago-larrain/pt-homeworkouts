# Sistema de diseño (v1.5)

Objetivo: abrir → empezar en un toque → sentirse premiada → salir. Elegante y simple, al nivel de las apps de Apple
(Human Interface Guidelines: foundations, controls, patterns, iOS). Para Anita el aspecto por defecto es refinado y femenino,
sin ser infantil; para un perfil principal masculino el aspecto es neutro. Todo el texto visible va en español.

## Principios
- **Contenido primero**: las ilustraciones son las protagonistas; listas agrupadas estilo Ajustes de iOS; sin adornos.
- **Un solo acento por tema** + colores semánticos mínimos (respiración azul/rojo, músculos naranja/amarillo, destructivo rojo).
- **Una acción principal por pantalla** (Comenzar, Hecho, Terminar). El resto es secundario o está un nivel más adentro.
- **Refuerzo positivo sin culpa**: meta semanal flexible, mensajes cálidos, nunca "perdiste tu racha".
- **Accesibilidad**: texto ≥ 4.5:1 (AA), zonas táctiles ≥ 44 pt, `aria-label` en íconos, la forma (no solo el color) distingue
  inhalar/exhalar, `prefers-reduced-motion` desactiva toda animación de interfaz.
- **Privacidad**: sin cuentas ni analítica; datos solo en `localStorage`.

## Temas y modos
`<html data-theme="rosa|estandar" data-mode="light|dark">`. Lo fija `applyTheme()` en `docs/js/app.js` (y un script mínimo en
`index.html` para no parpadear). `settings.theme` = `auto | rosa | estandar`; **auto** = rosa si el perfil **activo** es mujer,
estándar si es hombre. `settings.appearance` = `auto | light | dark` (auto sigue al sistema). `<meta name="theme-color">` se
actualiza con el fondo del tema (y con el del reproductor mientras se entrena).

| Token | Rosa claro | Rosa oscuro | Estándar claro | Estándar oscuro |
|---|---|---|---|---|
| `--bg` | `#FAF5F6` | `#140E12` | `#F3F4F8` | `#0E0F14` |
| `--card` | `#FFFFFF` | `#211719` | `#FFFFFF` | `#1A1C23` |
| `--card2` (superficie teñida) | `#FEF0F4` | `#2C1D24` | `#EEF0FC` | `#23263A` |
| `--label` (texto) | `#2A1D23` | `#FAF1F4` | `#15171D` | `#F2F3F8` |
| `--label2` (secundario) | `#6B5A62` | `#C4B0B8` | `#596072` | `#A9AFC2` |
| `--label3` (bordes, chevrones, placeholders; ≥ 3:1) | `#8E7E86` | `#7F6D75` | `#7C8397` | `#6C7287` |
| `--accent` (gráficos ≥ 3:1) | `#E0457B` | `#FF6E9C` | `#5B63E8` | `#8E9BFF` |
| `--accent-ink` (texto y relleno de botón) | `#C42E64` | `#FF6E9C` | `#4B55D6` | `#8E9BFF` |
| `--on-accent` (texto sobre `--accent-ink`) | `#FFFFFF` | `#2B0D18` | `#FFFFFF` | `#0E1030` |

Contraste medido en el navegador: `--label` sobre `--bg` ≥ 15:1;
`--label2` sobre `--card`/`--bg` ≥ 5.7:1 (claro) y ≥ 8.5:1 (oscuro); `--accent-ink` sobre `--card` 5.35:1 (rosa claro), 5.88:1 (estándar claro),
≥ 6.6:1 (oscuros) y sobre `--bg` ≥ 4.96:1; `--on-accent` sobre `--accent-ink` 5.35:1 / 5.88:1 / 6.8:1 / 7.3:1. El `--accent` del rosa claro
(`#E0457B`, 3.96:1) solo se usa en gráficos (anillos, puntos, íconos), nunca en texto. `--label3` ≥ 3:1 (no se usa para texto de lectura).
Respiración: pastilla sólida `--in-solid #1D4FBF` / `--ex-solid #C62F2F` con texto blanco (≥ 5:1); texto suelto `--in` / `--ex`
(variantes claras en oscuro). Otros tokens de color: `--sep`, `--fill`, `--bar` (material translúcido), `--accent-soft`,
`--grad-card`, `--bg-glow` (resplandor suave arriba de cada pantalla), `--danger`, `--ok`.

El **reproductor es siempre oscuro** y usa `--p-accent`, `--p-on-accent`, `--p-bg1/2` (trabajo) y `--p-bg-rest1/2` (descanso) del tema.

## Escala
- **Tipografía** (fuente del sistema, números en `ui-rounded` con `tabular-nums`): `--fs-2xs 11 · xs 12 · sm 13 · md 15 · base 17 · lg 20 · xl 22 · 2xl 28 · 3xl 34`;
  pesos `400/500/600/700`. Título grande 34/700 que pasa a la barra al hacer scroll; temporizador 44–66 (descanso 54–84, cuenta regresiva 100–150).
- **Espaciado** (múltiplos de 4): `--s1 4 · s2 8 · s3 12 · s4 16 · s5 20 · s6 24 · s7 32 · s8 40`. Margen lateral de pantalla 16.
- **Radios**: `--r-sm 8 · r-md 12 · r-lg 16 · r-xl 22 · r-pill 999`. Tarjetas grandes 22, listas 16, botón principal 20.
- **Elevación**: `--sh-1` (hairline + sombra mínima, tarjetas y listas), `--sh-2` (tarjeta principal, visor), `--sh-3` (sheets, toast);
  en oscuro la elevación se logra con superficies más claras y un contorno fino, no con sombras.
- **Movimiento**: `--dur-fast 120 ms` (pulsaciones), `--dur 220 ms` (cambios de estado), `--dur-slow 360 ms` (sheets, push);
  `--ease-out`, `--ease-inout`, `--ease-spring` (leve rebote). El cambio de paso del reproductor es de 280 ms.
  Con `prefers-reduced-motion` todas las animaciones y transiciones de interfaz se reducen a 0 (la animación del ejercicio es contenido y se puede apagar en Ajustes → Apariencia).
- **Zonas táctiles**: `--hit 44px`. Los controles visualmente más pequeños (stepper, segmentos, chips, íconos) amplían su zona con `::after`.

## Pantallas
- **Entrenar**: saludo corto con el nombre del perfil activo → tarjeta del plan de hoy (último usado o el primero): duración, bloques,
  implementos y botón **Comenzar** grande → franja semanal (7 puntos + «2 de 3 esta semana», meta `settings.weeklyGoal`) → otros planes → «Crear plan».
- **Plan**: bloques con miniaturas y dosis; modo **Editar** único (nombre, añadir movimientos, reordenar, dosis, rondas y descanso del bloque).
- **Movimientos**: búsqueda + chips; hoja «Filtros» (grupo muscular, implementos, nivel; multiselección con conteos); sin filtros, la
  cuadrícula se separa por grupo muscular. Usa los campos `group`, `equipment`, `level` de `MOVES` y tolera movimientos que no los tengan.
- **Ajustes**: grupos con texto de ayuda: Perfiles · Entrenamiento · Sonido y voz · Apariencia · Datos · Acerca de; lo poco usado va en subpantallas.
- **Reproductor**: barra segmentada por bloques, anillo con ronda/ejercicio, pastilla INHALA/EXHALA (sólida, con ↑/↓), borde de la imagen
  (inhala = brillo azul continuo que se expande hacia adentro; exhala = línea doble fina y brillo rojo suave que se disipa), cuenta regresiva
  «Prepárate» (cifra grande que «salta» cada segundo), descanso con el siguiente ejercicio y su miniatura, pausa con etiqueta visible, final breve
  (marca animada + «Listo, {nombre}» + duración y bloques + «Terminar»). `#pDoneExtra` es el gancho para kcal e hitos (fases 4–5).

## Sonido y háptica (`docs/js/audio.js`)
Todo se genera con Web Audio (senos/triángulos con envolvente corta, filtro pasa-bajos, sin ondas cuadradas): `tick` (cuenta final, el último
segundo es más agudo), `go` (inicio del trabajo), `rest` (inicio del descanso), `side` (cambio de lado, paneo izquierda→derecha), `done` (final),
`tap`. Respetan volumen y «Sonar en modo silencio» (si está apagado se mezclan con la música). `navigator.vibrate` se usa tras los mismos eventos si
`settings.haptics` está activo; iOS Safari lo ignora y no pasa nada.

## Componentes (docs/js/app.js)
`group()` / `row()` (listas), `toggle()`, `stepper()`, `seg()`, `openSheet()`, `actionSheet()`, `toast` / `undoToast`, `ringSvg()`, `thumb()`,
`mediaHTML()`. Las acciones usan `data-a="nombre"` con delegación de eventos (objeto `A`). Estilos por sección en `docs/css/app.css`.
