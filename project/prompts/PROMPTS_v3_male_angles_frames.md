# Prompts v3: modelo masculino, ángulos 3/4 y fotogramas intermedios

Objetivo: (1) un **modelo hombre** con el mismo estilo; (2) mejores **ángulos** (vista 3/4) en los ejercicios donde
la vista de perfil esconde el músculo; (3) **fotogramas intermedios** para que la animación de la app sea fluida.

## Reglas de oro (léelas antes de empezar)
1. **Una imagen por mensaje, un solo panel** (ya no 2 paneles). Formato **3:2 horizontal** (1536 × 1024).
2. Para la posición 2 y los intermedios: **edita la imagen anterior** ("Edit this exact image…"). Así la cámara, el encuadre,
   el mat y el tamaño de la persona quedan idénticos, y la animación no "salta".
3. Izquierda/derecha **de la imagen**, nunca de la persona. "NEAR" = extremidad más cercana a la cámara; "FAR" = la lejana.
4. Sin texto en la imagen. Fondo blanco. Mat lavanda en el suelo.
5. Nombres de archivo al guardarlas (yo las convierto): `<id>-<n>.png`, por ejemplo `goblet-squat-1.png`, `goblet-squat-2.png` (intermedio), `goblet-squat-3.png`.
   Para el hombre agrega `m-` al inicio: `m-goblet-squat-1.png`.

---

## PROMPT A: hoja de personaje masculina (chat nuevo)
Adjunta: la hoja de personaje de Anita (`project/references/character-sheet.jpg`) + una imagen terminada (ej. el puente A4) + (opcional) una foto de él.
```
Create a CHARACTER SHEET of a MAN for the same fitness-guide series. Match EXACTLY the illustration style of the attached images:
cartoon with warm brown outlines, soft flat shading, white background, same proportions and line quality as the woman.
The man: early 30s, athletic and lean (not bulky), warm tan skin, short dark-brown hair, light stubble, friendly face
(if I attached a photo, use his facial features and hair). Outfit: fitted slate-blue sports tank top with a subtle darker leaf pattern,
charcoal knee-length training shorts, barefoot.
Show him in 4 views on one sheet, standing neutral: front, right side profile (facing right), back, and 3/4 front view.
No muscles highlighted, no text.
```

## PROMPT B: reglas fijas del hombre (pégalo una vez después)
```
From now on every image is ONE single panel, 3:2 landscape, of the SAME man from the character sheet (same face, hair, skin, outfit, body),
same cartoon style, white background, lavender yoga mat (#C9B8F0) when on the floor, light-grey floor line when standing.
Focus muscles drawn with real anatomical shape and fibre lines in ORANGE, helper muscles in YELLOW, over the clothes.
Navy-blue arrows only where I ask. No text. Never mirror the pose. LEFT/RIGHT always mean the left/right of the PICTURE.
NEAR = limb closest to the viewer; FAR = limb on the other side of the body.
When I say "edit", keep camera, framing, mat, character size and everything else identical and change only what I list.
```

## PROMPT C: plantilla por ejercicio (sirve para él o para Anita)
```
Exercise: <NAME>. View: <VIEW>. Attached: the pose reference image(s) from the app.
FRAME 1 (start): <...>
Focus muscles (orange): <...>. Helper (yellow): <...>.
```
y luego, en el mismo chat:
```
Edit this exact image → FRAME 2 (midway): <...>. Same muscles highlighted.
```
```
Edit this exact image → FRAME 3 (end): <...>. Same muscles highlighted. Add <arrow>.
```

---

## Ejercicios: vista recomendada y descripción de los 3 fotogramas

Las vistas marcadas **3/4** son cambios recomendados respecto de hoy (se ve mejor el músculo o la técnica).

| id | Vista | Fotograma 1 (inicio) | Fotograma 2 (intermedio) | Fotograma 3 (final) | Foco / apoyo |
|---|---|---|---|---|---|
| cat-cow | perfil (cabeza a la DERECHA) | Camello: espalda arqueada hacia abajo, pecho adelante, mirada al frente | Espalda plana (mesa), cuello neutro | Gato: espalda redondeada hacia arriba, mentón al pecho | Erectores / recto abdominal |
| shoulder-circles | **3/4 de espalda** | Hombros elevados hacia las orejas | Hombros llevados atrás, escápulas juntándose | Hombros abajo y atrás, escápulas juntas, pecho abierto | Trapecio superior, romboides / trapecio medio |
| good-morning | perfil | De pie, dedos entrelazados en la nuca, codos abiertos | Cadera atrás, torso inclinado 30° | Bisagra: torso a ~60°, espalda plana, rodillas suaves | Isquios, glúteo mayor / erectores |
| glute-bridge-iso | perfil (cabeza a la IZQUIERDA) | Acostada/o, rodillas dobladas, pies planos | Cadera a medio camino | Cadera arriba: línea hombro-cadera-rodilla | Glúteo mayor / isquios, transverso |
| goblet-squat | **3/4 de frente** (se ven las rodillas empujando la banda) | De pie, mancuerna vertical al pecho, mini banda sobre las rodillas | Media sentadilla | Sentadilla profunda, muslos paralelos, rodillas hacia afuera sobre la punta de los pies | Cuádriceps, glúteo mayor / aductores, glúteo medio |
| b-stance-rdl | **3/4 de frente** | De pie, pie trasero en punta junto al talón delantero, mancuernas frente a los muslos | Cadera atrás, mancuernas a la altura de las rodillas | Bisagra: torso casi paralelo, mancuernas a media canilla, rodilla delantera suave | Isquios y glúteo de la pierna delantera / erectores |
| monster-walk | **3/4 de espalda** | Media sentadilla, banda en tobillos, pies al ancho de cadera | Pierna derecha de la imagen despegándose hacia el lado | Paso lateral ancho, banda estirada | Glúteo medio / glúteo mayor |
| face-pull | **3/4 de espalda** (anclaje a la DERECHA) | Brazos estirados al frente sosteniendo la banda | Codos doblándose y subiendo | Codos altos y atrás, manos junto a las orejas, escápulas juntas | Deltoides posterior, romboides / infraespinoso |
| floor-press | **3/4 desde arriba** (se ve el codo a 45°) | Codos apoyados en el suelo a 45° del torso, antebrazos verticales | Brazos a mitad de camino | Brazos extendidos sobre el pecho | Pectoral / tríceps, deltoides anterior |
| band-external-rotation | **3/4 de espalda** (se ve el infraespinoso) | Codo a 90° pegado a las costillas (toalla), antebrazo cruzando el abdomen | Antebrazo apuntando al frente | Antebrazo rotado hacia afuera, banda estirada | Manguito rotador / deltoides posterior |
| dead-bug | perfil (cabeza a la IZQUIERDA) | Brazos al techo, cadera y rodillas a 90° | Brazo LEJANO bajando hacia atrás y pierna CERCANA estirándose a medias | Brazo LEJANO sobre la cabeza y pierna CERCANA estirada flotando; el otro brazo y la otra pierna NO se mueven | Transverso / recto abdominal |
| ring-adductor-lift | perfil | Boca arriba, aro entre las rodillas | Torso a medio subir | Torso arriba apoyado en las manos, aro apretado | Aductores, recto abdominal / transverso |
| ring-legs-side | perfil / de lado | Piernas casi verticales, aro entre tobillos, torso levemente elevado | (sin intermedio) | De lado sobre el antebrazo, piernas elevadas con el aro | Aductores, transverso, glúteo medio / oblicuos |
| doorway-pec | **3/4 de frente** | Junto al marco, antebrazo vertical en el marco, codo a la altura del hombro | Medio paso adelante | Paso adelante, pecho abierto atravesando el marco | Pectoral / deltoides anterior |
| child-pose-lateral | perfil y **3/4 desde atrás-arriba** | Centro: cadera a los talones, frente en el mat, brazos largos | (sin intermedio) | Manos caminadas hacia un lado; cuerpo en "C" visto desde atrás y arriba | Lumbar, dorsal / oblicuos |
| kneeling-hip-flexor | perfil | Lunge con rodilla trasera en el mat, pelvis hacia adentro | Cadera adelante | Toma el pie de atrás y lleva el talón al glúteo | Psoas, recto femoral / cuádriceps |
| figure-4 | perfil (cabeza a la IZQUIERDA) | Tobillo cruzado sobre la rodilla contraria, pie de abajo apoyado | Pie de abajo despegando del mat | Muslo de abajo llevado al pecho con las manos | Glúteo mayor, piriforme |

### Ejemplo completo (goblet squat, hombre, 3/4)
```
Exercise: Goblet squat with a mini band above the knees. View: 3/4 FRONT view (camera in front of him and slightly to the right of the picture),
so both knees and the band are visible. Attached: the app's pose references for this exercise.
FRAME 1: standing tall, feet shoulder-width, toes slightly out, one lilac 3 kg dumbbell held vertically against the chest with both hands, elbows down, pink mini band just above the knees.
Focus muscles (orange): quadriceps, gluteus maximus. Helper (yellow): adductors, gluteus medius.
```
```
Edit this exact image → FRAME 2: half squat (hips back and down halfway, knees bent ~60°), knees pushing the band outward. Keep everything else identical.
```
```
Edit this exact image → FRAME 3: deep squat, thighs parallel to the floor, heels down, chest up, knees over the toes pushing the band outward. Add one small navy arrow pointing DOWN beside the hips.
```

## Cuando tengas las imágenes
Mándamelas con sus nombres. Yo las recorto al mismo encuadre, las convierto a WebP y las conecto:
- Anita: `docs/img/moves/<id>-<n>.webp` (los intermedios quedan con `mid: true` en el catálogo).
- Hombre: `docs/img/moves/m/<id>-<n>.webp` y `male: true` en el movimiento. En la app se elige en **Ajustes → Dibujos** o por persona en los planes en pareja.
