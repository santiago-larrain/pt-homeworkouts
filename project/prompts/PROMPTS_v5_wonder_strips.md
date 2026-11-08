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
