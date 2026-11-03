# Diseño de la app

Pedido: estilo "gym y girly", **pocos colores, simple, elegante, parecido a las apps de Apple**.
Basado en Apple Human Interface Guidelines (skills `raintree-technology/apple-hig-skills`: foundations, patterns, controls, platforms/iOS).

## Principios aplicados
- **Contenido sobre adornos**: ilustraciones protagonistas en tarjetas blancas; listas agrupadas (inset grouped) estilo Ajustes de iOS.
- **Un solo acento**: rosa `#E0457B` (claro) / `#FF6E9C` (oscuro). El resto son grises del sistema.
  Los únicos otros colores son semánticos: naranja/amarillo (músculos, vienen de las ilustraciones), azul (INHALA), verde (switch de iOS), rojo (acciones destructivas).
- **Tipografía del sistema**: `-apple-system` (SF Pro). Números en `ui-rounded` (SF Pro Rounded) con `tabular-nums`, como Apple Fitness.
  Títulos grandes de 34 pt que pasan a la barra al hacer scroll.
- **Navegación iOS**: tab bar de 4 pestañas (Entrenar, Movimientos, Historial, Ajustes) con material translúcido; pilas push/pop con botón atrás;
  sheets desde abajo para editar; action sheets para confirmar o elegir; deshacer en vez de "¿estás segura?" para quitar elementos.
- **Reproductor**: siempre oscuro (sensación de gym, como Apple Fitness), anillo de progreso rosa en el trabajo y blanco en descansos,
  controles grandes (anterior / pausa / saltar), botón *Hecho* para repeticiones.
- **Accesibilidad**: zonas táctiles ≥ 44 pt, `aria-label` en íconos, contraste suficiente, modo oscuro automático, `prefers-reduced-motion` respetado.
- **Privacidad**: sin cuentas, sin analítica, datos solo en `localStorage`; respaldo manual exportable.

## Tokens (docs/css/app.css)
`--accent`, `--accent-soft`, `--bg` (#F7F5F6 / #000), `--card` (#FFF / #1C1C1E), `--label`, `--label2`, `--label3`, `--sep`, `--fill`, `--bar`.

## Componentes
`group()`/`row()` (listas), `toggle()`, `stepper()`, `seg()` (segmented control), `openSheet()`, `actionSheet()`, `toast`/`undoToast`, `ringSvg()`.
Todos en `docs/js/app.js`. Las acciones usan `data-a="nombre"` con delegación de eventos (objeto `A`).
