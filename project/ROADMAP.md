# Pendientes e ideas

## Hecho en v1.1
- Ajustes de tiempo aplicados en vivo (también durante una sesión, botón ⚙︎) y "Descanso entre rondas" global.
- Protección de datos: `storage.persist()`, avisos de Safari vs app instalada y recordatorio de respaldo.
- Borde de respiración (azul/rojo), fotogramas intermedios, planes en pareja (dúo), soporte de modelo masculino.
- 4 movimientos redibujados con la paleta del personaje (`project/renderer`).

## Hecho en v1.2
- Modelo animado único para los 17 ejercicios (interpolación en vivo), versión mujer y hombre, mejor volumen y sombreado.
  (Reemplazado en v1.3 por fotogramas; las "skins" de los prompts v4 ya no son necesarias.)

## Hecho en v1.3
- Animaciones por fotogramas generadas con Wonder (mismo personaje en todos los ejercicios, mujer y hombre, con músculos
  en foco/apoyo), biomecánica revisada fotograma a fotograma; reemplazan al modelo vectorial (que queda de respaldo).
  Incluye los 4 que antes eran vectoriales (dead bug con brazo y pierna opuestos, rotación externa, pectoral en marco,
  postura del niño lateral) y vistas nuevas (monster walk de espalda, rotación externa en 3/4, postura del niño desde arriba).
- Herramientas: `project/tools/strip_frames.py` y `build_anim.py`; prompts en `project/prompts/PROMPTS_v5_wonder_strips.md`.

## Pendiente inmediato
- [ ] Revisar en el iPhone la fluidez de los fundidos y la velocidad (Ajustes → Velocidad de la animación).
- [ ] Detalle menor: en el gato-camello del hombre queda un contorno muy tenue de la calceta vecina junto a las manos.
- [ ] Probar en el iPhone de Anita: sonido con el interruptor de silencio, voz guía en español, Wake Lock y "Agregar a inicio".

## Ideas futuras
- Más movimientos en el catálogo (con imágenes del mismo estilo) y más planes incluidos.
- Movimientos personalizados creados por la usuaria (nombre, foto opcional, dosis).
- Registro de peso o banda por ejercicio y gráfico de progreso.
- Recordatorios (las notificaciones web en iOS requieren que la app esté instalada; iOS 16.4+).
- Modo "solo un bloque" en la pantalla de inicio y plan de calentamiento rápido.
- Sincronización opcional entre dispositivos (hoy solo exportar/importar JSON).
