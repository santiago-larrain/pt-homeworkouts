// Autotest del motor de calorías: node project/tools/test_calories.mjs
// Los valores esperados están calculados a mano (ver comentarios).
import { rmr, kFactor, bodyOf, loadedMet, kcalPerMin, sessionKcal, round5, lastWeight, kcalText } from '../../docs/js/calories.js';

let fails = 0;
const near = (name, got, want, tol = 0.01) => { const ok = Math.abs(got - want) <= tol; if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${typeof got === 'number' ? +got.toFixed(4) : got} (esperado ${want})`); };
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${JSON.stringify(got)} (esperado ${JSON.stringify(want)})`); };

const Y = 2026;
const woman = { gender: 'f', heightCm: 160, birthYear: Y - 30, weights: [{ date: '2026-01-01', kg: 62 }, { date: '2026-05-01', kg: 60 }] }; // gana el más reciente
const man = { gender: 'm', heightCm: 172, birthYear: Y - 30, weights: [{ date: '2026-02-01', kg: 75 }] };
const lookup = id => ({ squat: { met: 3.8, equipment: ['ninguno'] }, goblet: { met: 4.3, equipment: ['mancuernas', 'mini-banda'] }, swing: { met: 7, equipment: ['kettlebell'] }, nometa: { equipment: [] } })[id];

// 1. Mifflin: mujer 60 kg/160 cm/30 → 600+1000−150−161 = 1289 ; hombre 75/172/30 → 750+1075−150+5 = 1680
near('RMR mujer', rmr(bodyOf(woman, Y)), 1289, 0.001);
near('RMR hombre', rmr(bodyOf(man, Y)), 1680, 0.001);
// 2. k = RMR/(25,2·kg): 1289/1512 = 0,85251 ; 1680/1890 = 0,88889
near('k mujer', kFactor(bodyOf(woman, Y)), 1289 / 1512, 1e-6);
near('k hombre', kFactor(bodyOf(man, Y)), 1680 / 1890, 1e-6);
near('k estándar = 1', kFactor(bodyOf(woman, Y), false), 1, 0);
eq('último peso por fecha', lastWeight(woman), 60);
// 3. Acotado: 200 kg, 150 cm, 60 años, mujer → RMR 2476,5 → 0,49 → 0,75 ; hombre 40 kg/190 cm/19 → 1497,5/1008 = 1,49 → 1,10
near('k mínimo', kFactor({ kg: 200, cm: 150, age: 60, gender: 'f' }), 0.75, 0);
near('k máximo', kFactor({ kg: 40, cm: 190, age: 19, gender: 'm' }), 1.10, 0);
// 4. Fórmula base: 3,8 MET × 3,5 × 60 / 200 = 3,99 kcal/min
near('kcal/min base', kcalPerMin(3.8, 60), 3.99, 1e-9);
// 5. Sesión: 10 min de sentadilla (3,8) + 5 min de descanso (1,5), mujer 60 kg.
//    estándar: 39,9 + 1,5·3,5·60/200·5 = 39,9 + 7,875 = 47,775 → 50
//    corregido: 47,775 × 0,85251 = 40,73 → 40
const items = [{ secs: 600, kind: 'work', moveId: 'squat' }, { secs: 300, kind: 'rest' }];
const std = sessionKcal(woman, items, lookup, { corrected: false, year: Y });
const cor = sessionKcal(woman, items, lookup, { corrected: true, year: Y });
near('sesión estándar (bruto)', std.raw, 47.775, 1e-6); eq('sesión estándar (redondeo)', std.kcal, 50);
near('sesión corregida (bruto)', cor.raw, 47.775 * 1289 / 1512, 1e-6); eq('sesión corregida (redondeo)', cor.kcal, 40);
eq('con peso y datos: no marca estimado', cor.estimated, false);
// 6. Valores por defecto: perfil vacío mujer → 62 kg, 160 cm, 30 años → RMR 1309, k = 1309/1562,4 = 0,83781 ; marca «estimado»
const empty = { gender: 'f', weights: [] };
const d = sessionKcal(empty, items, lookup, { year: Y });
eq('defaults listados', d.defaults, ['peso', 'estatura', 'edad']); eq('estimado', d.estimated, true);
near('k por defecto mujer', d.k, 1309 / 1562.4, 1e-6);
// hombre por defecto: 75 kg/172/30 → k = 0,88889
near('k por defecto hombre', sessionKcal({ gender: 'm' }, items, lookup, { year: Y }).k, 1680 / 1890, 1e-6);
// solo falta la edad: lista solo «edad»
eq('solo edad', bodyOf({ gender: 'f', heightCm: 160, weights: [{ date: '2026-01-01', kg: 60 }] }, Y).defaults, ['edad']);
// 7. Carga: goblet 4,3 MET con 3 kg y 60 kg → +min(0,645; 3·0,05 = 0,15) = 4,45 ; kettlebell 12 kg → min(0,15·7 = 1,05; 3·0,2 = 0,6) = 7,6 ; sin kg → sin ajuste
near('carga mancuernas', loadedMet(4.3, ['mancuernas'], { dumbbellKg: 3 }, 60), 4.45, 1e-9);
near('carga kettlebell (no llega al tope)', loadedMet(7, ['kettlebell'], { kettlebellKg: 12 }, 60), 7.6, 1e-9);
near('carga kettlebell pesada (tope +15 %)', loadedMet(7, ['kettlebell'], { kettlebellKg: 40 }, 60), 8.05, 1e-9);
near('sin carga registrada', loadedMet(4.3, ['mancuernas'], { dumbbellKg: 0 }, 60), 4.3, 0);
near('banda: sin ajuste', loadedMet(3.0, ['banda'], { dumbbellKg: 5 }, 60), 3.0, 0);
const g1 = sessionKcal({ ...woman, loads: { dumbbellKg: 3 } }, [{ secs: 600, kind: 'work', moveId: 'goblet' }], lookup, { corrected: false, year: Y });
near('goblet con carga (bruto)', g1.raw, 4.45 * 3.5 * 60 / 200 * 10, 1e-6); // 46,725
const g0 = sessionKcal({ ...woman, loads: { dumbbellKg: 3 } }, [{ secs: 600, kind: 'work', moveId: 'goblet' }], lookup, { corrected: false, load: false, year: Y });
near('goblet sin ajuste de carga (bruto)', g0.raw, 4.3 * 3.5 * 60 / 200 * 10, 1e-6); // 45,15
// 8. Movimiento sin MET → 3,5 ; id desconocido → 3,5 ; segundos 0 o negativos se ignoran
near('sin met', sessionKcal(woman, [{ secs: 60, kind: 'work', moveId: 'nometa' }], lookup, { corrected: false, year: Y }).raw, 3.5 * 3.5 * 60 / 200, 1e-9);
near('id desconocido', sessionKcal(woman, [{ secs: 60, kind: 'work', moveId: 'x' }, { secs: 0, kind: 'rest' }, { secs: -5, kind: 'rest' }], lookup, { corrected: false, year: Y }).raw, 3.5 * 3.5 * 60 / 200, 1e-9);
// 9. Redondeo a múltiplos de 5 y texto
eq('round5', [round5(2), round5(2.5), round5(47.4), round5(47.6), round5(40.7)], [0, 5, 45, 50, 40]);
eq('texto', [kcalText(120), kcalText(2), kcalText(null)], ['≈ 120 kcal', null, null]);
// 10. Plausibilidad: 20 min de fuerza liviana (3,5 MET) mujer 60 kg, corregido ≈ 20·3,5·3,5·60/200·0,8525 = 62,6 kcal
near('20 min fuerza liviana', sessionKcal(woman, [{ secs: 1200, kind: 'work', moveId: 'nometa' }], lookup, { year: Y }).raw, 20 * 3.5 * 3.5 * 60 / 200 * (1289 / 1512), 1e-6);

console.log(fails ? `\n${fails} fallo(s)` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
