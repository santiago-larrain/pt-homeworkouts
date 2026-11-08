# Prompts v4: partes del cuerpo para "vestir" el modelo animado (skins)

Desde la v1.2 la app dibuja **un solo modelo animado** (`docs/js/rig/`): un esqueleto vectorial que se interpola en vivo.
Para que se vea como las ilustraciones de ChatGPT, la idea es pegar sobre cada hueso una **imagen recortada** de esa parte
del cuerpo (técnica de animación "cutout", como Spine o Live2D). Para eso necesito las partes **por separado**, **rectas**,
**en el mismo tamaño** y con **fondo transparente**.

## Cómo pedirlas
- Un chat nuevo. Adjunta la hoja de personaje (`project/references/character-sheet.jpg`) y una imagen terminada (ej. el puente A4).
- **Una lámina por vista** (perfil, frente, espalda y 3/4). Si ChatGPT no deja el fondo transparente, pide fondo **blanco puro**: yo lo quito.
- Guarda cada lámina como `skin-f-side.png`, `skin-f-front.png`, `skin-f-back.png`, `skin-f-34.png` (y `skin-m-…` para el hombre).
- Si alguna parte sale torcida o con otra luz, pide solo esa parte de nuevo ("redo only the forearm, straight, same scale").

## PROMPT 1: reglas (pégalo una vez)
```
I need a BODY-PART SPRITE SHEET of the woman from the attached character sheet, for 2D cut-out animation (like Spine).
Same exact cartoon style, colours, outline weight and soft shading as the attached illustrations.
Rules for every sheet:
- Transparent background (if impossible, pure white #FFFFFF), PNG, 2048 x 1536.
- Each body part is a SEPARATE piece, with at least 60 px of empty space around it. Nothing overlaps.
- Every limb piece is drawn perfectly STRAIGHT and VERTICAL: the joint closest to the body at the TOP, the far joint at the BOTTOM
  (upper arm: shoulder on top, elbow at bottom; thigh: hip on top, knee at bottom; etc.).
- Round, slightly extended ends at every joint so the pieces can overlap when rotated (like a paper puppet).
- All pieces at the SAME SCALE (the full body would be about 1300 px tall). Light always from the top-left.
- Clothing: the pink/mauve leaf-pattern sports bra and high-waisted leggings, barefoot. No muscles highlighted. No text, no labels, no shadows on the floor.
```

## PROMPT 2: lámina de PERFIL (mirando a la derecha)
```
Sheet 1: RIGHT SIDE PROFILE pieces (the character faces the RIGHT edge of the picture). Arrange them in this exact order, left to right, top row then bottom row:
TOP ROW: (1) head in profile with the high ponytail and side braid, neck stub included; (2) torso from neck base to hips, side view, with sports bra and leggings waistband;
(3) pelvis + buttock piece, side view (leggings); (4) upper arm; (5) forearm; (6) open hand, fingers together; (7) closed fist.
BOTTOM ROW: (8) thigh (leggings); (9) lower leg / shin (leggings ending above the ankle); (10) bare foot, flat, toes pointing right;
(11) bare foot pointed (toes down); (12) the same head looking slightly down; (13) the same head looking slightly up.
```

## PROMPT 3: lámina de FRENTE
```
Sheet 2: FRONT VIEW pieces (she faces the viewer). Same rules and order:
TOP ROW: (1) head front view with ponytail visible behind, neck stub; (2) torso front with sports bra and leggings waistband, from neck base to hips;
(3) pelvis front (leggings); (4) upper arm; (5) forearm; (6) open hand palm forward; (7) closed fist.
BOTTOM ROW: (8) thigh; (9) shin; (10) foot seen from the front; (11) head front, eyes closed, calm smile.
```

## PROMPT 4: lámina de ESPALDA
```
Sheet 3: BACK VIEW pieces (we see her back). Same rules and order:
TOP ROW: (1) head from behind with ponytail and braid; (2) back of torso with racer-back sports bra; (3) pelvis and glutes from behind (leggings);
(4) upper arm; (5) forearm; (6) hand back view.
BOTTOM ROW: (7) thigh (back); (8) shin with calf (back); (9) heel / foot from behind.
```

## PROMPT 5: lámina 3/4 (opcional)
```
Sheet 4: THREE-QUARTER FRONT VIEW pieces (body turned 45° to the right of the picture). Same rules and order as sheet 2.
```

## Hombre
Repite los prompts con la hoja de personaje masculina y cambia la ropa por: *"fitted slate-blue sports tank top with a subtle darker leaf pattern and charcoal knee-length training shorts, barefoot; short dark-brown hair, light stubble"*.

## Qué hago yo con ellas
1. Quito el fondo, recorto cada pieza y marco sus dos articulaciones (arriba = pivote).
2. En `docs/js/rig/` cada segmento del esqueleto dibujará su pieza rotada y estirada entre sus dos articulaciones,
   con los músculos naranjo/amarillo encima usando la silueta de la pieza como máscara.
3. Se mantiene la animación fluida (interpolación en vivo) y se aplica a los 17 ejercicios y a ambos modelos.
