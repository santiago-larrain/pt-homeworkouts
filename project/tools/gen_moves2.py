"""Genera docs/data/moves2.js (MOVES2, CATEGORIES2, EQUIPMENT2) a partir de project/catalog_v2/moves.json + notas de montaje.
Uso: python3 project/tools/gen_moves2.py   (el archivo generado se integra a mano en catalog.js; ver project/catalog_v2/NOTES.md)"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
moves = json.load(open(os.path.join(ROOT, 'project/catalog_v2/moves.json')))
SETUP = {
    'wall-angel': 'Espalda, glúteos y cabeza contra una pared (la pared no se dibuja).',
    'wall-sit': 'Espalda contra una pared; pies a unos 40 cm de ella, al ancho de la cadera.',
    'incline-pushup': 'Silla firme con el respaldo contra la pared (que no resbale); manos en el borde del asiento.',
    'chair-squat': 'Silla firme y estable detrás de ti; solo rózala, no te sientes.',
    'one-arm-row-chair': 'Silla firme: apoya la mano libre y la rodilla del mismo lado en el asiento.',
    'db-shoulder-press': 'Siéntate en una silla de respaldo recto, con la espalda apoyada.',
    'overhead-triceps-ext': 'Siéntate en una silla de respaldo recto; sostén una mancuerna con ambas manos.',
    'seated-twist-chair': 'Silla de respaldo recto; pies planos y caderas de frente.',
    'standing-quad-stretch': 'Mano libre en el respaldo de una silla para el equilibrio.',
    'band-chest-press': 'Ancla la banda en una puerta cerrada, por el lado de las bisagras (o con tope de puerta). Tira para comprobar que no se suelta.',
    'band-triceps-pushdown': 'Ancla la banda en lo alto de una puerta cerrada, por el lado de las bisagras (o con tope). Tira para comprobar que no se suelta.',
    'band-row': 'Sentada/o con la banda alrededor de las plantas de los pies, piernas casi rectas.',
    'band-pull-apart': 'Banda a la altura de los hombros, manos al ancho de los hombros.',
    'banded-bridge': 'Mini banda justo sobre las rodillas.',
    'clamshell': 'Mini banda justo sobre las rodillas; pies y caderas apilados.',
    'ring-bridge': 'Aro entre las rodillas, a la altura de los muslos.',
    'ring-chest-press': 'Aro entre las palmas, a la altura del pecho.',
    'hamstring-stretch-supine': 'Banda (o toalla) alrededor de la planta del pie estirado.',
    'floor-fly': 'Mancuernas ligeras; los codos no bajan del nivel del suelo.',
    'db-pullover': 'Una mancuerna sostenida con ambas manos; rango cómodo para el hombro.',
    'kb-swing': 'Kettlebell en el suelo, a un pie delante de ti; la fuerza viene de la cadera, no de los brazos.',
    'kb-halo': 'Kettlebell con el asa hacia abajo, cerca de la cara.',
    'kb-sumo-squat': 'Kettlebell sostenida con ambas manos frente a ti.',
    'kb-deadlift': 'Kettlebell entre los pies, a la altura de los empeines.',
    'mountain-climber-slow': 'Plancha alta sobre el mat, manos bajo los hombros.',
}
def js(v): return json.dumps(v, ensure_ascii=False)
out = ['// Catálogo v2: 54 movimientos nuevos (generado por project/tools/gen_moves2.py desde project/catalog_v2/moves.json).',
       '// Misma forma que MOVES de catalog.js (+ group, sided, mirror, met, level, setup). Sin `img` por posición: usan fotogramas (ANIM).',
       '// Para integrar: concatenar MOVES2 a MOVES, y CATEGORIES2/EQUIPMENT2 a CATEGORIES/EQUIPMENT.',
       '',
       "export const CATEGORIES2 = [",
       "  { id: 'espalda', name: 'Espalda' },",
       "  { id: 'brazos', name: 'Brazos' },",
       "  { id: 'cardio', name: 'Cardio suave' },",
       "];", '',
       "export const EQUIPMENT2 = {",
       "  kettlebell: 'Kettlebell',",
       "  silla: 'Silla',",
       "};", '',
       'export const MOVES2 = [']
for m in moves:
    pos = ', '.join('{ label: %s, breath: %s, verb: %s }' % (js(p['label']), js(p['breath']), js(p['verb'])) for p in m['positions'])
    L = ["  {",
         f"    id: {js(m['id'])}, name: {js(m['name'])}, category: {js(m['category'])}, equipment: {js(m['equipment'])},",
         f"    group: {js(m['group'])}, sided: {js(m['sided']).lower()}, mirror: {js(m['mirror']).lower()}, met: {m['met']}, level: {m['level']},",
         f"    focus: {js(m['focus'])}, support: {js(m['support'])},",
         f"    cue: {js(m['cue'])},"]
    if m['id'] in SETUP: L.append(f"    setup: {js(SETUP[m['id']])},")
    L += [f"    tips: {js(m['tips'])},",
          f"    positions: [{pos}],",
          f"    dose: {js(m['dose'])}, imageStatus: 'final',",
          "  },"]
    out += L
out += ['];', '']
open(os.path.join(ROOT, 'docs/data/moves2.js'), 'w').write('\n'.join(out))
print(len(moves), 'movimientos,', len(SETUP), 'con setup')
