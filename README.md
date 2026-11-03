# Entrena · Anita

App de entrenamiento en casa: planes con temporizador, galería de movimientos ilustrados con los músculos
en foco, editor de planes e historial. Funciona en el iPhone sin cuentas y sin internet.

**Abrir:** https://santiago-larrain.github.io/pt-homeworkouts/

## Instalar en el iPhone
1. Abre el link en **Safari**.
2. Toca **Compartir** (cuadrado con flecha) → **Agregar a inicio** → **Agregar**.
3. Ábrela desde el ícono rosado: pantalla completa y funciona sin internet.

## Qué hace
- **Entrenar**: plan principal (*Dynamic Reset 3×3*), progreso de la semana y botón *Comenzar*.
- **Reproductor**: cuenta regresiva, ejercicios por tiempo o por repeticiones (botón *Hecho* o con tiempo),
  descansos entre rondas y bloques, cambio de lado, pitidos en los últimos segundos (configurable),
  voz guía opcional, pausa, saltar, retroceder, +15 s de descanso, animación de las 2 posiciones e indicación
  de **inhala/exhala**. La pantalla se mantiene encendida.
- **Planes**: editar bloques (circuito o secuencia, rondas, descansos), agregar, quitar o reordenar movimientos
  del catálogo, cambiar tiempos y repeticiones, duplicar y crear planes nuevos.
- **Movimientos**: galería con búsqueda y filtros, técnica, músculos y respiración de cada ejercicio.
- **Historial**: calendario, rachas, sesiones con ánimo y notas.
- **Ajustes**: sonidos, tiempos, modo de repeticiones, tema claro/oscuro y respaldo (exportar/importar).

Los datos quedan solo en el teléfono. Conviene exportar un respaldo de vez en cuando (Ajustes → Datos).

## Desarrollo
Sin build. Sirve la carpeta `docs/`:

```bash
cd docs && python3 -m http.server 8000
```

Contexto completo para seguir desarrollando: [`CLAUDE.md`](CLAUDE.md) y la carpeta [`project/`](project/).
