# Atajo «Entrena»: recordatorios y Apple Salud (fase 6)

Una PWA instalada en el iPhone **no puede** programar notificaciones locales ni leer HealthKit. El único puente posible sin servidor
es un **Atajo de Apple** (app Atajos) que la usuaria instala una sola vez desde un enlace de iCloud. La app le entrega los datos con
`shortcuts://run-shortcut?name=Entrena&input=text&text=<JSON>` y el Atajo hace el trabajo nativo (Calendario, Recordatorios, Salud).

> **Estado:** el Atajo **no está construido todavía** (hay que crearlo y compartirlo desde un iPhone o iPad). Esta guía describe cómo
> hacerlo; los nombres exactos de algunas acciones cambian según la versión de iOS y el idioma (aquí van en español con el nombre
> en inglés entre paréntesis). La app ya funciona sin el Atajo: los recordatorios se pueden guardar en el Calendario con un archivo `.ics`
> y el peso/estatura se pueden registrar a mano.

## 1. Qué le manda la app al Atajo

Siempre es **un texto con un diccionario JSON**. El campo `action` dice qué hacer.

### `action: "reminders"` (crear, editar o apagar los recordatorios)
```json
{ "action": "reminders", "on": true, "days": [1, 3, 5], "time": "19:00",
  "title": "Entrenar · Cuerpo completo 20 min", "url": "https://…github.io/pt-homeworkouts/",
  "profile": "Anita", "calendar": "Entrena", "repeat": "weekly",
  "dates": ["2026-11-18T19:00:00", "2026-11-20T19:00:00", "2026-11-23T19:00:00"] }
```
- `days`: 0 = domingo … 6 = sábado. `time`: «HH:MM» (hora local).
- `dates`: **la próxima fecha en que cae cada día elegido**, ya calculada por la app (en hora local, `AAAA-MM-DDTHH:MM:SS`). Así el Atajo no
  tiene que calcular días de la semana: solo crea un evento por fecha, con repetición semanal.
- `on: false` → el Atajo solo **borra** los eventos y no crea nada.

### `action: "import"` (traer peso y estatura desde Salud)
```json
{ "action": "import", "profile": "p1", "name": "Anita", "app": "https://…github.io/pt-homeworkouts/" }
```
El Atajo responde abriendo `app + "?health=" + <JSON codificado>` con `{"weight":61.8,"height":165,"date":"2026-11-10","profile":"p1"}`
(`weightUnit`/`heightUnit` son opcionales: `kg`/`lb`, `cm`/`m`/`in`; la app convierte).

### `action: "log"` (guardar un entrenamiento terminado en Salud)
```json
{ "action": "log", "profile": "p1", "type": "Functional Strength Training",
  "start": "2026-11-17T22:00:00.000Z", "end": "2026-11-17T22:41:00.000Z", "minutes": 41, "kcal": 230, "title": "Dynamic Reset 3×3" }
```
`start`/`end` están en UTC (ISO 8601); `kcal` puede ser `null`.

## 2. Construir el Atajo «Entrena» (paso a paso)

En la app **Atajos** → **+** → nombre **Entrena**. Todas las acciones van dentro de un solo atajo con tres ramas.

1. **Recibir** (*Receive*): «Entrada de Atajo» → tipo **Texto**; si no hay entrada: *Continuar* (así también se puede probar a mano).
   Acción **Obtener diccionario de la entrada** (*Get Dictionary from Input*) → llámalo `D`.
2. **Obtener valor del diccionario** `D` → clave `action` → variable `accion`.
3. **Si** `accion` **es** `reminders`:
   1. **Obtener valor del diccionario** `D` → `title` → `titulo`; `url` → `enlace`; `on` → `activo`; `dates` → `fechas`; `calendar` → `cal`.
   2. **Buscar eventos del calendario** (*Find Calendar Events*): Calendario **es** `Entrena` **y** Título **contiene** `Entrenar` (un calendario propio
      «Entrena» que hay que crear antes en la app Calendario; así el Atajo nunca toca otros eventos). Límite: sin límite.
   3. **Eliminar** los eventos encontrados (acción *Eliminar eventos* / *Remove Events*; según la versión de iOS puede llamarse *Delete Calendar Events*; si tu
      iOS no la trae, el Atajo no puede borrar: en ese caso usa el calendario «Entrena» y borra el evento a mano al cambiar de horario).
   4. **Si** `activo` **es** `true` (Sí):
      - **Repetir con cada** elemento de `fechas`:
        - **Obtener fechas de la entrada** (*Get Dates from Input*) con el elemento → fecha.
        - **Agregar nuevo evento** (*Add New Event*): Título = `titulo`, Inicio = la fecha, Duración = 30 min, Calendario = `Entrena`, **Alerta** = *Al momento del evento*,
          **Repetir** = *Cada semana* (en **Mostrar más**), URL = `enlace`.
        - Si tu iOS no ofrece «Repetir» en esa acción: repite el evento 12 semanas con **Ajustar fecha** (*Adjust Date*, +7 días) dentro de un **Repetir** de 12 vueltas
          (los eventos se acabarán en 12 semanas; vuelve a tocar «Aplicar» en la app para renovarlos).
      - Alternativa con la app **Recordatorios**: **Agregar nuevo recordatorio** (lista `Entrena`, fecha y hora = la fecha, **Repetir** semanal, Alerta). Para borrar:
        **Buscar recordatorios** (lista `Entrena`) → **Eliminar recordatorios** no existe en todas las versiones; marcarlos como completados con **Editar recordatorios**.
   5. **Abrir URL** (*Open URLs*): `enlace` (vuelve a la app). Opcional.
4. **Si** `accion` **es** `import`:
   1. **Buscar muestras de Salud** (*Find Health Samples*): Tipo **Peso corporal** (*Body Mass*), Ordenar por **Fecha de inicio**, **Más reciente primero**, Límite **1**.
      Repite con **Estatura** (*Height*).
   2. **Obtener detalles de las muestras de Salud**: **Valor** (peso en `kg`; estatura en `cm`; si tu iPhone usa libras o pies, convierte con **Convertir medida** o
      envía `weightUnit`/`heightUnit` en el diccionario del paso siguiente). **Fecha de inicio** → formato **ISO 8601** (*Format Date*).
   3. **Diccionario**: `weight` = peso, `height` = estatura, `date` = fecha, `profile` = valor de `profile` del `D` (opcional: `weightUnit`, `heightUnit`).
   4. **Copiar al portapapeles** (*Copy to Clipboard*) ese diccionario como texto (respaldo: ver «Limitaciones»).
   5. **Codificar URL** (*URL Encode*) el diccionario como texto → `codif`.
   6. **Obtener valor del diccionario** `D` → `app`; **Texto**: `app` + `?health=` + `codif`; **Abrir URL** (*Open URLs*) con ese texto.
5. **Si** `accion` **es** `log`:
   1. Valores `type`, `start`, `end`, `minutes`, `kcal`.
   2. **Obtener fechas de la entrada** con `start` (fecha de inicio).
   3. **Registrar entrenamiento** (*Log Workout*): Tipo = `type` («Entrenamiento de fuerza funcional»), Duración = `minutes` min, Calorías activas = `kcal` (si no es `null`),
      Fecha/hora de inicio = la fecha obtenida (si la acción no ofrece fecha de inicio, el entrenamiento se registra «ahora»: ábrelo apenas termines).
   4. **Mostrar notificación** «Entrenamiento guardado en Salud».
6. Ajustes del atajo (ⓘ): **Mostrar en la hoja de compartir** desactivado; ícono y color a gusto; **Permitir ejecutar** sin avisar si la pantalla está bloqueada = *no*.
7. Pruébalo a mano: botón ▶︎ con la entrada vacía pide texto; pega uno de los JSON de arriba y comprueba que crea el evento, abre la app con `?health=` y registra el entrenamiento.

## 3. Compartirlo como enlace de iCloud y conectarlo con la app

1. En Atajos, mantén pulsado **Entrena** → **Compartir** → **Copiar enlace de iCloud** (si pide «Opciones de compartir», deja desactivado
   «Enviar datos personales» y revisa que no contenga tu nombre ni calendarios).
2. Pega el enlace (`https://www.icloud.com/shortcuts/<código>`) en **`docs/js/health.js`** → `HEALTH.installURL`. Si cambiaste el nombre del atajo,
   actualiza también `HEALTH.shortcutName` (debe coincidir letra por letra); el calendario es `HEALTH.calendarName`.
3. Sube `CACHE_VERSION` en `docs/sw.js` y publica. Mientras `installURL` conserve el texto de ejemplo, la app muestra el botón «Instalar atajo» desactivado
   y explica que falta el enlace.
4. En el iPhone: Ajustes de la app → Apple Salud → **Instalar atajo** → agregar → vuelve a la app y toca **Ya lo instalé**.
   La primera vez que se ejecuta, iOS pide permisos (Calendario, Salud lectura/escritura, «Permitir compartir con Atajos»); hay que aceptarlos.

## 4. Limitaciones (conviene saberlas)

- **El retorno `?health=` abre Safari, no la app instalada.** iOS abre las URL `https://` en Safari aunque la PWA esté en la pantalla de inicio, y Safari y la app
  instalada **no comparten datos**. Por eso el Atajo también copia el JSON al portapapeles y la app ofrece **«Pegar datos del atajo»** (Ajustes → Apple Salud y
  en Historial → Cuerpo): después de ejecutar el Atajo, abre la app instalada y pulsa ese botón. Si usas la app desde Safari (sin instalar), el retorno automático funciona.
- **Registrar entrenamiento** (*Log Workout*) existe desde iOS 16.x con distinta cantidad de campos; en versiones antiguas no está y habrá que usar **Registrar muestra de Salud**
  (Calorías activas y Tiempo de ejercicio) o dejar de usar esa opción.
- **Repetición semanal** en «Agregar nuevo evento»: no está en todas las versiones (ver el paso 3.4). Los recordatorios con el `.ics` no tienen esa limitación.
- Un atajo **no puede enviar notificaciones por sí mismo**: lo que avisa es la alerta del evento de Calendario o del recordatorio. Si quieres que además se **ejecute solo**, crea una
  **Automatización** personal (Hora del día) que corra «Entrena» con entrada fija; es opcional y no la necesita la app.
- El primer uso de cada rama pide permisos y puede tardar unos segundos; con el iPhone bloqueado, algunas acciones (Salud) no se ejecutan.
- No hay manera de saber desde la web si el Atajo está instalado: por eso la app solo recuerda el botón «Ya lo instalé».
- El `.ics` y el Atajo **no se sincronizan entre sí**: si usas ambos, aparecerán dos eventos. Usa uno solo.

## 5. Recordatorios sin Atajo (archivo `.ics`)

Ajustes → Recordatorios → **Guardar en mi Calendario**: la app genera `entrena-<perfil>.ics` con **un** evento semanal (`RRULE:FREQ=WEEKLY;BYDAY=…`), una alerta
a la hora de inicio (`VALARM`, `TRIGGER:PT0S`), el título «Entrenar · {plan}», la URL de la app y un `UID` estable por perfil.
Cada edición sube `SEQUENCE`, para que Calendario lo trate como una actualización del mismo evento (puede preguntar si quieres **reemplazar** el anterior).
Si apagas los recordatorios, el botón genera una versión `METHOD:CANCEL` para **quitar** el evento (Calendario puede pedir confirmación; si no lo quita, bórralo a mano).
