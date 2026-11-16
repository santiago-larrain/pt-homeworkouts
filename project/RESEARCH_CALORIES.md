# Motor de calorías: diseño basado en investigación

Objetivo: estimar el gasto energético de una sesión (por perfil) con un modelo simple, transparente y honesto, sin servidor.
Siempre se muestra como **estimación** ("≈ 120 kcal"), redondeada a múltiplos de 5, nunca como medida exacta.

## 1. Fuentes y qué se verificó

| Fuente | Qué se usa | Estado |
|---|---|---|
| Ainsworth BE et al. *2011 Compendium of Physical Activities: a second update of codes and MET values.* Med Sci Sports Exerc 2011;43(8):1575-81 | Valores MET por actividad (fuerza, calistenia, yoga/estiramiento, caminata) | Cita verificada. **Valores MET verificados por búsqueda web** (ver sección 1b); la tabla original no se pudo abrir desde el entorno de desarrollo (pacompendium.com, cdn-links.lww.com y pmc.ncbi.nlm.nih.gov no resuelven allí), así que lo verificado son extractos de las páginas/PDF oficiales que devolvió el buscador. |
| Herrmann SD et al. *2024 Adult Compendium of Physical Activities: A third update of the energy costs of human activities.* J Sport Health Sci 2024;13(1):6-12 (doi 10.1016/j.jshs.2023.10.010) | Actualización: 1114 actividades (912 con valores medidos, 202 estimados), 22 categorías, solo adultos de 19-59 años | **Verificado por búsqueda** (existencia, alcance y cifras). Valores individuales de fuerza no verificados. |
| Byrne NM, Hills AP, Hunter GR, Weinsier RL, Schutz Y. *Metabolic equivalent: one size does not fit all.* J Appl Physiol 2005;99(3):1112-9 | El MET convencional (3,5 ml O2/kg/min = 1 kcal/kg/h) **sobreestima** el gasto en reposo: en promedio ≈35 % en VO2 y ≈20 % en energía (n = 769, 18-74 años); propone corregir con el RMR medido o predicho | **Verificado por búsqueda** |
| Kozey SL, Lyden K, Howe CA, Staudenmayer JW, Freedson PS. *Errors in MET estimates of physical activities using 3.5 ml/kg/min as the baseline oxygen consumption.* J Phys Act Health 2010 | Misma idea: el error del MET 3,5 depende de la persona (sexo, composición corporal, edad) | **De memoria** (no apareció en la búsqueda) |
| Mifflin MD et al. *A new predictive equation for resting energy expenditure in healthy individuals.* Am J Clin Nutr 1990;51:241-7 | Ecuación de RMR (498 sujetos sanos, 19-78 años); más exacta que Harris-Benedict original, que sobreestimó ≈5 % en ese estudio | Cita y coeficientes **verificados** por búsqueda (ver 1b, con 2 ejemplos) |
| Roza AM, Shizgal HM. *The Harris Benedict equation reevaluated.* Am J Clin Nutr 1984;40:168-82 | Harris-Benedict revisada (alternativa) | De memoria |
| Literatura de costo energético del entrenamiento de fuerza (p. ej. Ratamess et al., ACSM Position Stand 2009; Scott CB 2006; Vezina 2014) | Los METs de fuerza del Compendio (≈3,5-6,0) son promedios de la sesión incluyendo pausas; el gasto real varía mucho con carga, pausas y masa muscular; el EPOC aporta poco en cargas bajas | De memoria; sin cifras citables verificadas |

Aviso: los coeficientes de Harris-Benedict aparecen con constantes distintas según la versión; Mifflin está confirmado (sección 1b).

### 1b. Verificación (hecha al implementar la fase 4)
Método: búsqueda web (el entorno no permite abrir pacompendium.com ni los PDF directamente). Los valores salen de los extractos de la página oficial *Conditioning Exercise* y de los PDF del Compendio 2011 y 2024 que devolvió el buscador; donde dos fuentes discrepan, se indica.

| Actividad | Código | 2011 | 2024 | Estado |
|---|---|---|---|---|
| Fuerza (pesas), vigoroso | 02050 | 6.0 | 6.0 | Verificado |
| Fuerza, varios ejercicios, 8-15 rep., resistencia variada (ligera/moderada) | 02054 | 3.5 | 3.5 | Verificado |
| Fuerza, sentadillas / peso muerto, lento o explosivo | 02052 | 5.0 | 5.0 | Verificado |
| Ejercicios de peso corporal (sentadilla, zancada, flexión, abdominal) | 02056 | — | 3.0 | Verificado (2024); alta intensidad 02057 = 6.5 |
| Calistenia, vigorosa | 02020 | 8.0 | 7.5 | Verificado (cambió en 2024) |
| Calistenia, moderada | 02022 | 3.8 | 3.8 | Verificado |
| Calistenia, ligera | 02024 | 2.8 | 2.8 | Verificado. **Corrección:** antes se decía "ligera/moderada ≈ 3,8" |
| Calistenia, ligera o moderada, general | 02030 | 3.5 | 3.5 | Verificado |
| Circuito, esfuerzo moderado | 02035 | 4.3 | 5.0 | Verificado (cambió en 2024). Circuito con peso corporal: 02032 = 6.0 (2024) |
| Circuito con kettlebells/aeróbico, mínima pausa | 02040 | 8.0 | — | Verificado (2011) |
| Ejercicio en casa, general | 02064 | 3.8 | — | Verificado (2011) |
| Pilates, general | 02105 | 3.0 | ver nota | Verificado 2011. **Corrección de código** (antes 02064). 2024: un resultado menciona 2.8; **no verificado** |
| Yoga Hatha | 02150 | 2.5 | ver nota | Verificado 2011. 2024: **no verificado** (solo "videos de yoga/estiramiento, ligero" 02140 = 2.5) |
| Estiramiento suave | 02101 | 2.3 | ver nota | Verificado 2011. 2024: **no verificado** |
| Sentado en reposo / TV | 07021 / 07020 | 1.3 | 1.0 | Verificado, con discrepancia entre ediciones (1.3 en 2011, 1.0 en la web 2024) |

Consecuencias para la app: los `met` por movimiento de la sección 3 son **interpolaciones** entre estas anclas (fuerza 3,5-6,0; calistenia 2,8-3,8; estiramiento 2,3; yoga 2,5), no valores medidos por movimiento. El descanso se mantiene en 1,5 (heurística propia, algo por encima del 1,0-1,3 del Compendio por la recuperación entre series). Con 2011 y 2024 distintos, se usó el valor de 2011 salvo donde el 2024 está verificado.

**Mifflin-St Jeor verificado** (Mifflin et al., Am J Clin Nutr 1990;51:241-7): RMR = 10·kg + 6,25·cm − 5·edad + 5 (hombres) o − 161 (mujeres). Ejemplos calculados a mano:
1. Mujer 60 kg, 160 cm, 30 años: 600 + 1000 − 150 − 161 = **1289 kcal/día** → k = 1289 / (25,2 · 60) = 0,853.
2. Hombre 75 kg, 172 cm, 30 años: 750 + 1075 − 150 + 5 = **1680 kcal/día** → k = 1680 / (25,2 · 75) = 0,889.
(Con los valores por defecto: mujer 62 kg/160 cm/30 → 1309 → k = 0,838; hombre → 0,889, coherente con la sección 2.6.)

## 2. Fórmulas

### 2.1 Gasto bruto estándar
```
kcal/min = MET × 3.5 × kg / 200
```
(3,5 ml O2/kg/min × kg = ml O2/min; 1 L O2 ≈ 5 kcal, así que /1000 × 5 = /200.)

### 2.2 RMR (metabolismo en reposo, kcal/día)
```
Mifflin-St Jeor:   RMR = 10·kg + 6.25·cm − 5·edad + (hombre ? +5 : −161)
Harris-Benedict rev. (alternativa, Roza-Shizgal 1984):
   hombre: 88.362 + 13.397·kg + 4.799·cm − 5.677·edad
   mujer : 447.593 + 9.247·kg + 3.098·cm − 4.330·edad
```
Por defecto **Mifflin-St Jeor** (mejor desempeño general en revisiones; HB tiende a sobreestimar).

### 2.3 MET corregido (Byrne 2005, Kozey 2010)
El Compendio asume que 1 MET = 3,5 ml/kg/min. El reposo real promedio es menor, así que:
```
restVO2   = RMR / (7.2 · kg)            // ml O2/kg/min  (RMR en kcal/día; usa 5 kcal/L O2)
k         = restVO2 / 3.5  = RMR / (25.2 · kg)     // factor individual
k         = clamp(k, 0.75, 1.10)
kcalMin   = MET × 3.5 × kg / 200 × k     // algebraicamente = MET × RMR / 1440 (MET como múltiplo del reposo propio)
```
Ejemplo: mujer 60 kg, 160 cm, 30 años → RMR ≈ 1 290 kcal/día → k ≈ 0,85. Una sentadilla (MET 3,8) pasa de 4,0 a 3,4 kcal/min.

Nota honesta: en rigor, un MET *medido* del Compendio ya es VO2/3,5, es decir, absoluto; aplicar k a esos valores equivale a asumir que los METs están expresados como múltiplos del reposo propio. Es la lectura de Byrne/Kozey y produce cifras más conservadoras (≈15 % menos para una mujer típica). Se adopta como **valor por defecto** porque es mejor sobrestimar menos en una app motivacional; el ajuste "estándar" (k = 1) queda como opción en Ajustes y como cota superior.

### 2.4 Pausas y transiciones
El reproductor ya separa pasos de trabajo, descanso y cambio de lado:
```
trabajo (cada paso con met del movimiento)  → met = move.met (+ ajuste de carga)
descanso entre rondas / entre ejercicios    → met = 1.5   (rango 1.3-1.5)
cambio de lado / preparación (< 15 s)       → met = 1.5
```
1,3 MET es el valor del Compendio para estar sentado/de pie quieto; se usa 1,5 porque tras series de fuerza la frecuencia cardíaca y el VO2 siguen elevados (recuperación). Los pasos por repeticiones cuentan **todo el tiempo real del paso** con el MET del movimiento (el MET del Compendio ya promedia pausas intraserie).

Opcional "kcal netas" (sobre el reposo): `net = gross − 1.0 × 3.5 × kg / 200 × k × minutos`. Mostrar solo si se pide; el resumen usa el **gasto total durante la sesión**.

### 2.5 Ajuste opcional por carga externa (estimación acotada, **heurística propia**)
No proviene de una ecuación publicada; es un ajuste pequeño para que usar mancuernas más pesadas se refleje un poco:
```
si move.equipment incluye 'mancuernas' o 'kettlebell':
   loadKg = profile.loads.dumbbellKg  (o kettlebellKg)        // un solo implemento, conservador
   f      = loadKg / kg
   dMET   = min( 0.15 × move.met , 3 × f )                    // tope: +15 % del MET base
   met    = move.met + dMET
```
Con 3 kg y 60 kg de peso: f = 0,05 → +0,15 MET (≈ +4 %). Con kettlebell 12 kg: f = 0,2 → el tope (+15 %) manda. Se marca "estimación" y puede desactivarse. Bandas elásticas: sin ajuste.

### 2.6 Valores por defecto
| Dato | Si falta |
|---|---|
| peso | 62 kg (f) / 75 kg (m) *(referencias razonables, no de una fuente verificada)* |
| estatura | 160 cm (f) / 172 cm (m) |
| edad | 30 años (si hay `birthYear`: año actual − birthYear) |
| sexo | `profile.gender`; si no hay, promedio de las constantes de Mifflin (−78) |
| cargas | si el perfil no tiene `dumbbellKg`/`kettlebellKg`, no se aplica el ajuste 2.5 |
Con peso conocido pero sin estatura/edad: usar los valores por defecto para calcular k. Con todo por defecto: k ≈ 0,84 (f) / 0,89 (m). El peso es lo que más pesa en el resultado; pedirlo en Cuerpo es opcional pero se explica ("para una estimación más cercana").
Peso: usar el último registro de `weights`.

### 2.7 Pseudocódigo
```js
function kcalSession(profile, steps) {      // steps: [{secs, kind:'work'|'rest'|'switch', met?, equipment?}]
  const kg = lastWeight(profile) ?? DEF.kg[profile.gender];
  const k  = opts.corrected ? clamp(rmr(profile) / (25.2 * kg), .75, 1.10) : 1;
  let kcal = 0;
  for (const s of steps) {
    const met = s.kind === 'work' ? withLoad(s.met, s.equipment, profile, kg) : 1.5;
    kcal += met * 3.5 * kg / 200 * k * (s.secs / 60);
  }
  return Math.round(kcal / 5) * 5;
}
```
Planes en pareja: cada perfil usa su propio peso y su propio movimiento (`b.move`) con el mismo tiempo.

## 3. Tabla de METs por tipo de ejercicio (campo `met`)
Los METs "de esfuerzo" abajo son lo que se guarda en `met` (sin descanso). Anclas del Compendio (verificadas, sección 1b): *resistance training* ligero/moderado 3,5 y vigoroso 6,0; *calisthenics* ligera 2,8, moderada 3,8, vigorosa 8,0 (2011) / 7,5 (2024); *circuit training* moderado 4,3 (2011) / 5,0 (2024); *Pilates* 3,0 (2011); *yoga hatha* 2,5 (2011); *stretching* suave 2,3 (2011); sentado quieto 1,3 (2011) / 1,0 (2024).

| Nivel de esfuerzo | `met` | Tipo de ejercicio (ejemplos del catálogo) |
|---|---|---|
| Estiramiento estático | 2,3 | Figura 4, psoas, cuádriceps de pie, isquios tendida, inclinación lateral |
| Movilidad activa / yoga suave | 2,5 | Gato-camello, libro abierto, ángeles en la pared, esfinge |
| Fuerza ligera de aislamiento, core suave, bandas | 3,0 | Almeja, hidrante, pájaro, curl-up, bird-dog, Face-Pull, pull-apart, calf raise |
| Fuerza general liviana, peso corporal lento | 3,5 | Puente, remo, floor press, curls, sentadilla a la silla, wall-sit, marcha en el lugar |
| Peso corporal multiarticular, flexiones, plancha | 3,8-4,0 | Sentadilla, zancada dividida, flexiones inclinadas, plancha, press de hombros |
| Peso corporal / carga moderada con zancada o bisagra | 4,3-4,5 | Zancada atrás, peso muerto kettlebell, sumo, halo, goblet |
| Cardio de bajo impacto moderado-alto | 5,0 | Patinador sin salto, escalador lento |
| Combinado fuerza + cardio (thruster) | 6,0 | Sentadilla con press (equivale a "resistance vigorous") |
| Kettlebell balístico | 7,0 | Swing (**estimación mía**; la literatura sobre swings sostenidos da valores bastante mayores, ≈ 9-13 MET según la serie, de memoria y de calidad discutible; se deja 7,0 por prudencia) |

## 4. Limitaciones
- Es una **estimación**: el error individual del método MET ronda ±20-30 %; no reemplaza un reloj ni calorimetría.
- El Compendio tiene pocos datos medidos de ejercicios de fuerza en casa; la mayoría de los `met` de la tabla son interpolaciones razonables, no valores medidos para cada movimiento.
- No se modela EPOC (consumo posejercicio), que con cargas livianas es pequeño; tampoco temperatura, ritmo real de cada serie ni la masa muscular individual.
- Los METs del Compendio 2024 son para adultos de 19-59 años; los del Compendio de adultos mayores no se usan.
- La corrección por RMR depende de ecuaciones predictivas (error típico ±10 %) y de datos opcionales ingresados por la usuaria.
- El ajuste por carga (2.5) es una heurística propia, sin validación publicada.
- Los kcal no deben usarse para reprimir ni "ganarse" comida: la UI debe mostrarlos de forma neutral y opcional (principio de refuerzo positivo del Plan v2).
