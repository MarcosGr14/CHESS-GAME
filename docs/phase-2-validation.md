# Validación de la fase 2

Fecha: 29 de octubre de 2026. Se conserva la dirección visual y la base de la fase 1.

## Pruebas automatizadas

89 pruebas en siete archivos, incluidas las 40 originales. Once ejecutan el WASM real de Stockfish 19.0.1 lite-single. Se comprueban los diez niveles y un mate en uno. El transporte Node de estas pruebas no se incluye en la aplicación.

El resto cubre handshake UCI, historial y límites, abortar durante la carga o el cálculo, reiniciar tras fallos, señales atrasadas, promociones, jugadas forzadas, errores deliberados, migración de la fase 1, validación, controles de turno, deshacer para ambos colores, respuesta pendiente tras volver al mismo FEN, pausa/reanudación y desbloqueos persistentes e idempotentes.

La muestra separada de fuerza consta de 12 partidas contra la referencia descrita en README. Nilo, Clara y Bruno perdieron sus cuatro partidas cada uno. El archivo `phase-2-benchmark.json` conserva resultados y configuración. No se interpreta como calibración de Elo humano.

## Navegador y compilación de producción

- Servidor de desarrollo propio en 5174 y previsualización del build en 4174. El servicio preexistente de 5173 pertenece a otro proyecto y se conservó; también se conservó la pestaña anterior del usuario.
- Diez rivales visibles en el selector; el primero disponible y los siguientes con el nombre del rival que hay que vencer.
- Selección de negras: perspectiva correcta, apertura legal del bot y devolución del turno al humano.
- Movimiento humano seguido de Deshacer mientras responde el bot: se conserva solo la apertura y no aparece una respuesta atrasada.
- El modo local sigue disponible; las ofertas de tablas se muestran solo allí.
- Fallo provocado retirando temporalmente el WASM del build: aparece aviso inmediato, partida pausada y botón Reintentar motor. Al restaurar el archivo, reintentar recupera la apertura sin perder el estado.
- Archivo WASM restaurado después de la prueba. El build final incluye únicamente la variante lite-single y sus avisos.
- Comprobación de guardado/recarga, respaldo JSON, color aleatorio y pantalla móvil realizada antes del commit.

## Decisiones y límites

- La orientación automática por turno se reserva al modo local. En modo bot se conserva la perspectiva del humano, con giro manual disponible.
- Deshacer contra bots recupera el último turno humano y es gratuito hasta incorporar la economía. Los desbloqueos por victoria ya persisten; los desbloqueos por nivel tienen función pura preparada para el perfil de la fase 3.
- El Elo de cada bot es orientativo; no se presenta como resultado de una calibración.
- La evaluación ocurre en un Worker de un solo hilo. No requiere servidor de ajedrez ni cabeceras COOP/COEP. La carga inicial del motor se hace al necesitarlo.
- La revisión de pantalla móvil usa un navegador redimensionado. Sigue pendiente una prueba física en Android/iOS; no se afirma una medición de rendimiento en esos dispositivos ni una puntuación Lighthouse.
- La fase 3 (XP, niveles, Elo del jugador y monedas) queda fuera de esta entrega.
