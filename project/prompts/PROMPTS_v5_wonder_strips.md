# Prompts v5: tiras de fotogramas con Wonder (animaciones de la app, v1.3)

Desde la v1.3 cada ejercicio se anima con 3-5 fotogramas del **mismo personaje**. La clave es pedir **todas las poses en una
sola imagen** ("keyframe strip"): así el modelo de imagen mantiene la cara, la ropa, la escala y el encuadre idénticos entre
fotogramas. Luego `project/tools/build_anim.py` recorta cada figura, la alinea (por los pies, la cabeza o el centro) y exporta
los fotogramas a `docs/img/anim/<f|m>/`.

## Cómo se generaron
- Herramienta: conector **Wonder** (`generate_image`, modelo GPT Image 2.5, 16:9, calidad máxima), archivo de Wonder
  "PT Home Workouts". Wonder no puede leer archivos locales: las referencias se pasan como URL pública de
  `raw.githubusercontent.com/santiago-larrain/pt-homeworkouts/main/project/references/...`.
- Referencias: hoja de personaje (`character-sheet.jpg` mujer / `character-sheet-male.jpg` hombre) + una imagen ya terminada
  del mismo ejercicio (`references/generated/…`) como ancla de estilo.
- Hombre: se pasa la **tira de la mujer** como segunda referencia y se pide recrearla igual cambiando solo el personaje
  (ver plantilla 2). Así los fotogramas de ambos modelos coinciden uno a uno.
- Revisar siempre cada tira: biomecánica, brazo/pierna correctos (lado cercano/lejano a la cámara), equipo (aro, banda) del
  mismo tamaño en todos los fotogramas y progresión pareja. Si falla, regenerar con ángulos explícitos por fotograma
  (el dead bug del hombre necesitó: "frame 2: far arm 30° back… frame 3: 60°…").
- Guardar la tira como `project/references/anim/<f|m>-<id>.jpg` y correr `python3 project/tools/build_anim.py <id>`.

## Plantilla 1: mujer (nuevo ejercicio)
```
Animation keyframe strip for a fitness app. The SAME woman as the attached character sheet (identical face, dark ponytail
with side braid, warm tan skin, pink leaf-pattern sports bra and high-waisted leggings, barefoot), in the exact cartoon style
of the references (brown outlines, soft flat shading). Pure white background with one thin light-grey floor line across the
whole width.   [o, en el suelo: "Pure white background; a long lavender yoga mat runs along the bottom across the whole width."]
FOUR frames in one horizontal row, left to right, evenly spaced with wide empty space between the figures (no divider lines,
no borders), identical camera, identical scale and identical floor height in every frame, so the frames play as a smooth
animation. View: RIGHT SIDE PROFILE, facing right.   [o FRONT / from BEHIND / THREE-QUARTER …; tendida: "HEAD toward the LEFT"]
Movement, <ejercicio> in 4 stages: 1) …; 2) …; 3) …; 4) …  [describir cada etapa con ángulos; decir qué NO se mueve]
Focus muscles drawn over the clothes with anatomical shape and fibre lines in ORANGE: …; helpers in YELLOW: …
Same muscles in every frame. Anatomically correct. No arrows, no text.
```

## Plantilla 2: hombre (a partir de la tira de la mujer)
```
Animation keyframe strip for a fitness app. Recreate the second attached image (a keyframe strip) EXACTLY: same number of
frames, same pose in each frame, same camera angle, same scale, same spacing between figures, same floor/mat, same props and
the same orange/yellow muscle highlights drawn over the clothes. But replace the woman with the SAME man as the first attached
image (character sheet): identical face, short dark-brown hair, warm tan skin, athletic male build, light-blue crew-neck
t-shirt, black athletic shorts, white socks and black sneakers. Same cartoon style (brown outlines, soft flat shading), pure
white background. Movement: <resumen del movimiento y qué no se mueve>. Focus muscles in ORANGE: …; helpers in YELLOW: …
No arrows, no text.
```

## Trucos
- Pedir "wide empty space between the figures": si dos figuras se tocan, el recorte necesita `--cuts` (ver `build_anim.py`).
- Objetos fijos (marco de puerta, gancho de pared) se dibujan **dentro de cada fotograma** y se alinea por ellos (`left`).
- Movimientos circulares (círculos de hombros, monster walk): `loop: true` en `docs/data/anim.js`.
- Dos vistas distintas en un mismo ejercicio (aro: piernas arriba + de lado): dos tiras; `build_anim.py` las une.

## Lo aprendido en la fase 3 (54 movimientos nuevos)
- **Vistas con escorzo**: la vista de espaldas pura (reverse-fly intentos 1-2) sale con proporciones raras; funcionó **TRES CUARTOS DESDE ATRÁS** (cámara detrás y ~35° a un lado) y, para un tronco inclinado, indicar el ángulo ("torso bent 45 degrees").
- **band-pull-apart** salió mal de frente (los músculos del dorso se dibujaban en el pecho). Regenerado en 3/4 desde atrás: "we see her BACK … rear deltoids and rhomboids in ORANGE, middle trapezius and infraspinatus in YELLOW drawn on her back". Si el músculo foco no se ve desde la vista, **cambiar de vista** antes que insistir con el prompt.
- El hombre se genera pasando como 2ª referencia la URL cdn.wonder.so de la tira de la mujer y la plantilla 2; para vistas de espaldas basta con decir "same three-quarter-from-behind camera angle (we see his back)". En mat: calcetas blancas; de pie: zapatillas negras.
- Un objeto fijo (pared, marco, silla) dibujado distinto en cada fotograma "salta": mejor **no dibujar la pared** (wall-angel: se indica en `setup`) o pedirla idéntica.
- Si en una tira horizontal dos figuras casi se tocan (mancuernas), usar `cuts` por modelo en `anim_config.json`.
- Revisar siempre el lado: en perfil trabaja la extremidad cercana a la cámara; con `mirror` el espejo muestra el otro lado.
- Decisiones de revisión (fase 3): kb-swing (la kettlebell se ve en todos los fotogramas, detrás de las piernas en los extremos), calf-raise (talón sube
  poco pero se lee), fire-hydrant (abducción de 60-70°, correcta), lateral-lunge, seated-twist-chair (último fotograma ~75°), curl-up/reverse-crunch
  (sutiles, se leen con la flecha), wall-angel (sin pared; `setup`) y overhead-triceps-ext (mancuerna vertical legible): **se conservan**, no se regeneraron.

## Movimientos alternantes: tira B (v2)
Los movimientos con `dose.alternating` (dead-bug, bird-dog, toe-taps, superman) tienen una **segunda tira B** `<f|m>-<id>-b.jpg` donde se
mueve el OTRO par de extremidades (misma cámara, escala, mat y músculos; el fotograma 1 de B ≈ el de A). `anim_config.json`: `"alt": "<id>-b"`
(+ `bodyAlign: true` en dead-bug: ancla = cabeza). `build_anim.py` corta A y B con el mismo lienzo (`strip_frames.cut_pair`) y alineadas en el fotograma 1;
`frames.js` recorre inicio → A → inicio → B → inicio. No espejar en horizontal (la cabeza cambiaría de lado).
- Prompt de B: pasar la tira A (URL cdn.wonder.so) como única referencia y pedir "recreate EXACTLY … but the OTHER arm and leg", **diciendo qué es near/far y qué se dibuja
  delante/detrás** (la extremidad cercana tapa el torso; la lejana queda detrás). Revisar siempre en el recorte que la lejana no cruce por delante.
- Dead bug (error de profundidad): el brazo lejano que baja debe quedar DETRÁS del brazo vertical cercano, del hombro y de la cabeza; se corrigió pasando la tira anterior como referencia.
- Superman: la tira A original levantaba brazo y pierna LEJANOS (mismo lado); se regeneró A (brazo lejano + pierna cercana) y B (brazo cercano + pierna lejana). Bird-dog B costó 2 intentos
  (el 1.º levantaba brazo y pierna cercanos).
- Hombre: 2.ª referencia = tira B de la mujer (+ la tira A del hombre como 3.ª para fijar el personaje).

## Rehechos de la v1.11 (figura 4, dead bug, floor press, toe taps y aro)
- **Tendida boca arriba**: la cámara ligeramente elevada (~30°) desde el lado muestra las dos piernas/brazos sin que una tape a la otra (figura 4: pedir «BOTH legs always fully drawn, two feet visible in every frame»; toe taps: «each with its own foot drawn completely»).
- **Floor press**: decir qué NO se mueve («head, torso, hips, legs and feet touch the mat at the same points in every frame; ONLY the arms and dumbbells move»). Comprobar con `docs/img/anim` que las piernas quedan en el mismo sitio (desfase ≤ 2 px).
- **Aro**: el aro entre las rodillas visto de lado queda de canto; la vista **desde los pies, algo elevada** (ring-squeeze) lo muestra de frente y se ve cómo se aplasta. De lado (ring-legs-side) pedir «BOTH legs stay pressed TOGETHER and rise as one unit» y «ring squeezed FLAT, wider than tall»; la primera versión levantaba solo la pierna de arriba y estiraba el aro.
- Mat escalonado en la vista desde los pies: `matfix` en `anim_config.json` rellena los recortes blancos.
- El filtro de contenido de Wonder rechazó varias veces una petición idéntica en estructura a otra aceptada (vista desde los pies del hombre); si pasa, usar otro prompt/referencia o arreglar la tira por código.

## Aro v1.12: seis posiciones quietas (fotos de referencia)
- Referencia del usuario: seis fotos (tumbada, sobre antebrazos, piernas a 45°, piernas verticales, lateral con piernas en el suelo, lateral con ambas piernas arriba). Es material con copyright: NO se guarda en el repo; las poses se describieron con palabras (la subida a Wonder no estaba disponible).
- Cada posición es una tira de 3 figuras IDÉNTICAS en las que solo cambia el aro (suelto → apretado un poco → más). Prompt: «In ALL three frames the pose is EXACTLY the <last> figure of the second image … The body does not move AT ALL between frames. ONLY the ring changes …», pasando como 2.ª referencia una tira anterior del mismo personaje (la tira de movimiento fija la pose).
- Piernas arriba (45° y 90°): el aro visto de canto es una barra y no se ve comprimirse → `still: true` (2 fotogramas iguales); lo marcan el borde, la pastilla y las flechas.
- Lateral con las dos piernas arriba: hay que decir «the BOTTOM leg also clearly lifted … visible gap of mat under the bottom foot»; sin eso solo sube la pierna de arriba.
- Hombre: plantilla 2 con la tira de la mujer como 2.ª referencia; salió a la primera en las seis.
- Dead bug (v1.12): se quitó el 5.º fotograma (`keep: 4`, `pos: [0, 2, 3]`); la tira B del hombre se regeneró desde la B de la mujer (plantilla 2 + «near arm lowers, far arm stays vertical, far arm behind»).

## Hip dips en plancha frontal (v1.14)
- Cuatro intentos de la v1.13 (perfil, desde atrás con pies elevados, 3/4 bajo, cabeza) fallaron. Funcionó la cámara **BAJA (15-20°) desde los PIES, algo ladeada**, mirando a lo largo del cuerpo: se ven las plantas, la pelvis rotando y la sombra bajo el cuerpo.
- Claves: 3 fotogramas, **un mat trapezoidal propio por fotograma** (perspectiva) con mucho espacio entre ellos; el 1.er intento salió «tumbada» y se corrigió pasando la tira como referencia y pidiendo «hips as high as shoulders, knees/thighs/belly OFF the mat, soft shadow under her»; luego un 3.º más exagerado («pelvis line tilted 40°»). Tira B: la A como única referencia y «mirror image of the rotation … to the LEFT».
- Hombre B: con la tira B de la mujer como única referencia copió la A (mismo lado); funcionó pasar la A del hombre + la B de la mujer y decir «draw the MAN from the first image doing the mirrored version shown in the second».
- `nofloor: true` en `anim_config.json`: sin él la detección de suelo extendía el mat de lado a lado (banda). Alineación `center` (mat y antebrazos quedan fijos).
