# Motor de calorías: diseño basado en investigación

Objetivo: estimar el gasto energético de una sesión (por perfil) con un modelo simple, transparente y honesto, sin servidor.
Siempre se muestra como **estimación** ("≈ 120 kcal"), redondeada a múltiplos de 5, nunca como medida exacta.

## 1. Fuentes y qué se verificó

| Fuente | Qué se usa | Estado |
|---|---|---|
| Ainsworth BE et al. *2011 Compendium of Physical Activities: a second update of codes and MET values.* Med Sci Sports Exerc 2011;43(8):1575-81 | Valores MET por actividad (fuerza, calistenia, yoga/estiramiento, caminata) | Cita **de memoria** (la búsqueda no devolvió las tablas). Los valores de la sección 4 son los que recuerdo del Compendio; verificar en pacompendium.com antes de publicar. |
| Herrmann SD et al. *2024 Adult Compendium of Physical Activities: A third update of the energy costs of human activities.* J Sport Health Sci 2024;13(1):6-12 (doi 10.1016/j.jshs.2023.10.010) | Actualización: 1114 actividades (912 con valores medidos, 202 estimados), 22 categorías, solo adultos de 19-59 años | **Verificado por búsqueda** (existencia, alcance y cifras). Valores individuales de fuerza no verificados. |
| Byrne NM, Hills AP, Hunter GR, Weinsier RL, Schutz Y. *Metabolic equivalent: one size does not fit all.* J Appl Physiol 2005;99(3):1112-9 | El MET convencional (3,5 ml O2/kg/min = 1 kcal/kg/h) **sobreestima** el gasto en reposo: en promedio ≈35 % en VO2 y ≈20 % en energía (n = 769, 18-74 años); propone corregir con el RMR medido o predicho | **Verificado por búsqueda** |
| Kozey SL, Lyden K, Howe CA, Staudenmayer JW, Freedson PS. *Errors in MET estimates of physical activities using 3.5 ml/kg/min as the baseline oxygen consumption.* J Phys Act Health 2010 | Misma idea: el error del MET 3,5 depende de la persona (sexo, composición corporal, edad) | **De memoria** (no apareció en la búsqueda) |
| Mifflin MD et al. *A new predictive equation for resting energy expenditure in healthy individuals.* Am J Clin Nutr 1990;51:241-7 | Ecuación de RMR (498 sujetos sanos, 19-78 años); más exacta que Harris-Benedict original, que sobreestimó ≈5 % en ese estudio | Cita verificada; los coeficientes son de memoria (ver abajo) |
| Roza AM, Shizgal HM. *The Harris Benedict equation reevaluated.* Am J Clin Nutr 1984;40:168-82 | Harris-Benedict revisada (alternativa) | De memoria |
| Literatura de costo energético del entrenamiento de fuerza (p. ej. Ratamess et al., ACSM Position Stand 2009; Scott CB 2006; Vezina 2014) | Los METs de fuerza del Compendio (≈3,5-6,0) son promedios de la sesión incluyendo pausas; el gasto real varía mucho con carga, pausas y masa muscular; el EPOC aporta poco en cargas bajas | De memoria; sin cifras citables verificadas |

Aviso: los coeficientes de Mifflin y Harris-Benedict aparecen con constantes distintas en algunas páginas; los usados abajo son los canónicos que conozco (Mifflin: 10·kg + 6,25·cm − 5·años + 5 hombres / −161 mujeres). Validar con 2-3 casos conocidos al implementarlos.

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
Los METs "de esfuerzo" abajo son lo que se guarda en `met` (sin descanso). Referencias del Compendio de memoria: *resistance training* ligero/moderado ≈ 3,5 y vigoroso ≈ 6,0; *calisthenics* ligero/moderado ≈ 3,8 y vigoroso ≈ 8,0; *circuit training* moderado ≈ 4,3; *Pilates* ≈ 3,0; *yoga hatha* ≈ 2,5; *stretching* ≈ 2,3; sentado/de pie quieto ≈ 1,3.

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
