# Plan v2: de "la rutina de Anita" a una app completa de entrenamiento en casa

Objetivo: app corta de usar, elegante y motivadora (no molesta). Usuaria principal: Anita (diseño "girly"); también sirve
para otras personas (tema estándar para perfil principal masculino). Todo visible en español. Sin servidor ni cuentas.
Rama de trabajo: `v2`; se fusiona a `main` (GitHub Pages) al cerrar cada fase verificada. Nunca romper datos guardados.

## Contratos de datos (todas las fases los respetan)
- Estado: misma `KEY` (`ptw.state.v1`) + campo `version` y migraciones en `store.load()`.
- `profiles: [{id, name, gender:'f'|'m', birthYear?, heightCm?, weights:[{date:'YYYY-MM-DD', kg}], loads:{dumbbellKg, kettlebellKg, band:'suave'|'media'|'fuerte', miniBand:'suave'|'media'|'fuerte'}}]`
  y `activeProfile` (id). Perfil 1 = principal (migrado de `settings.model`; nombre por defecto "Anita"); perfil 2 = pareja
  (nombre y género editables). El género define el modelo de las animaciones (`img/anim/f|m`) y el tema por defecto.
- Planes dúo: `people[i]` pasa a `{profile: id}` (migrar desde `{name, model}`).
- Historial: cada sesión guarda `profiles: [ids]`, `kcal: {profileId: n}`, `secs`, `planId`, bloques completados.
- Movimiento (`MOVES`): se agregan `group` (grupo muscular), `sided` (true = se hace por lado), `mirror` (true = el otro lado
  se muestra espejando la imagen), `met` (intensidad, ver RESEARCH_CALORIES.md), `level` (1-3). `equipment[]` usa los ids:
  `ninguno, mat, mancuernas, kettlebell, banda (brazos), mini-banda (piernas), aro, silla, puerta`.
- Ajustes nuevos: `theme:'auto'|'rosa'|'estandar'`, `weeklyGoal` (sesiones/semana), `reminders:{on, days:[0-6], time:'HH:MM'}`.

## Fases
1. **Fundamentos** (código): perfiles (nombre/género de ambos, datos corporales, cargas por perfil), cambio de lado claro
   (paso "Cambia de lado" + imagen espejada + etiqueta Derecho/Izquierdo), colores de respiración con más contraste,
   progreso del reproductor: barra horizontal segmentada (un segmento por bloque) + anillo del ejercicio con "ronda 1/3" dentro.
2. **Rediseño UI/UX**: sistema visual nuevo (tema rosa y tema estándar), ícono nuevo (Wonder), inicio con un toque para
   empezar, ajustes reorganizados, editor de planes más simple, reproductor pulido (temporizador, pitidos, voz, hápticos).
3. **Catálogo**: ~50 movimientos nuevos (peso corporal, mancuernas, kettlebell, bandas, mini-bandas, silla, aro, mat),
   tiras de Wonder mujer+hombre con músculos en foco, 5-6 fotogramas cuando caben, flechas de movimiento automáticas
   (overlay SVG calculado en `build_anim.py`), filtros por músculo, grupo muscular y equipo, planes incluidos nuevos.
4. **Cuerpo y calorías**: motor de calorías (MET del Compendium of Physical Activities, corregido por peso/talla/edad/sexo),
   registro manual de peso/talla con gráfico, carga estimada (kg de mancuernas del perfil).
5. **Motivación**: meta semanal (no racha diaria), resumen breve al terminar, hitos, progreso por grupo muscular.
6. **Recordatorios y Salud**: Atajo de Apple ("Conectar con Apple Salud": lee peso/talla, registra entrenamientos, y
   crea/edita/apaga la cadena de recordatorios desde la app vía `shortcuts://run-shortcut`), más entrada manual.
   Nota: un atajo instalable debe crearse/firmarse en un dispositivo Apple; se documentan los pasos y la app enlaza el iCloud link.

## Principios de UX
- Abrir → entrenar en un toque. Nada de pantallas obligatorias; los datos corporales son opcionales.
- Refuerzo positivo sin culpa: meta semanal flexible, hitos, nunca "perdiste tu racha".
- HIG de Apple: zonas táctiles ≥ 44 px, claro/oscuro, `prefers-reduced-motion`, un color de acento por tema.
