# Validación de la fase 3

Fecha: 30 de octubre de 2026. Versión 0.3.0.

## Alcance y decisiones

Perfil persistente con nombre, XP, nivel, rango, Elo interno, monedero, estadísticas, rachas y últimos 20 resultados. Inicio y navegación leen los mismos datos. El resultado contra bot muestra su recibo y anuncia los ascensos de nivel. Los rivales se abren por victoria previa o nivel del jugador.

Toda la economía reside en funciones puras de `src/core/`. La fecha de finalización y la clave del día local se reciben como entradas; los stores coordinan el reloj y la persistencia. La UI no accede a localStorage. No se añadieron dependencias.

El monedero cumple `saldo = ganadas − gastadas`, con enteros no negativos. El perfil guarda el ID de cada resultado junto con XP, monedas, Elo y estadísticas. Deshacer propone primero los estados de tablero y perfil: si falta saldo, ninguno cambia. Por defecto cuesta 5 monedas contra bots, configurable a 0/5/10/20; un turno completo recibe un único cargo. El modo local sigue siendo gratuito y no da progreso.

Se exige una jugada humana. Las primeras cinco partidas por bot y día aplican 100/100/75/50/25 % a XP y monedas; después no pagan. Las estadísticas y el Elo continúan contando. Un resultado contra bot es definitivo. Esto evita deshacer un final y cobrar otro resultado del mismo ID.

Partidas y respaldos nuevos usan esquema 3; perfil, esquema 1. Se migran las partidas de las fases 1 y 2. Los finales antiguos no reciben premios retroactivos y las partidas antiguas en curso pueden registrar su futuro final. Los respaldos antiguos conservan el perfil actual; un respaldo 3 lo reemplaza tras informar al usuario. Se valida toda la copia antes de cambiar estados.

## Pruebas automatizadas

157 pruebas en diez archivos, incluidas las 89 de fases anteriores y las once que ejecutan el mismo WASM real de Stockfish distribuido con la app.

Las nuevas pruebas cubren:

- Umbrales exactos de XP, sobrante al subir de nivel, los seis rangos y entradas inválidas.
- Créditos y débitos puros, saldo exacto, fondos insuficientes, cantidades negativas/fraccionarias y desbordamiento numérico.
- Elo por victoria, derrota y tablas, fuerza del rival y límites.
- Recompensas por nivel del bot, disminución diaria, separación por rival/día y persistencia del límite.
- Registro único, rachas, final sin jugada humana, modo local y recuperación de una liquidación pendiente después de guardar la partida.
- Rehidratar, reimportar un resultado, conservar acciones del store, nombre y desbloqueos por nivel.
- Deshacer con un solo cargo, rechazo sin saldo, cancelación de respuestas atrasadas, modo gratis/local y bloqueo de finales contra bot.
- JSON completo, relojes congelados sin modificar la partida original, respaldo 1/2/3, perfil inválido y versiones desconocidas.

Comandos de cierre: `npm test`, `npm run lint`, `npm run format:check` y `npm run build`.

## Navegador de producción

Pruebas mediante el navegador integrado en el origen independiente `localhost:4174`, con posiciones JSON de prueba. No se importaron fixtures ni se añadieron monedas al guardado del usuario en `localhost:5174`.

- Perfil nuevo: cero XP y monedas, nivel 1, rango Peón, Elo 800 e historial vacío real.
- Cambiar nombre y recargar conserva el nombre.
- Restaurar una posición legal pausada tras `1. f3 e5 2. g4`, reanudar y jugar `Qh4#` registra 60 XP, 20 monedas, Elo 803 y una victoria.
- Recargar y restaurar el JSON exportado conserva exactamente esos valores y un único resultado, sin otro premio.
- Un segundo final de prueba con ID distinto alcanza 120 XP: nivel 2, 20/283 XP hacia nivel 3, 40 monedas y Elo 806. El diálogo anuncia el ascenso.
- En una nueva partida real contra Nilo, mover y deshacer deja cero movimientos, saldo 35, ganadas 40 y gastadas 5. La recarga conserva estos valores.
- Con saldo cero, Deshacer aparece deshabilitado y explica el saldo necesario.
- Cambiar el costo a 10 y recargar conserva la selección; se devuelve a 5 al terminar la comprobación.
- Perfil claro y oscuro, navegación inferior, historial de cinco columnas y rangos revisados a 390 px; distribución de tableta a 900 px y escritorio a 1440 px. El DOM no presenta desbordamiento horizontal en esos anchos.
- Fuentes Inter 400 y Cormorant Garamond 500 cargadas localmente; sin errores de consola en la sesión de revisión.

## Revisión visual

Se conserva la dirección **Editorial greeting**, semilla **1728893013**, con marfil, nogal, fieltro y oro antiguo. La pregunta del perfil es «¿cómo avanza mi juego y cuánto puedo gastar?». El nivel y monedero responden primero; estadísticas, camino de seis piezas y planilla completan el recorrido. El acceso al tablero está a un clic.

Los objetos son perfil, monedero, rivales y recibos; XP y monedas se muestran como enteros. Una cuenta nueva imprime ceros. Las cifras se calculan desde el mismo perfil persistido, con totales coherentes. El nombre admite hasta 32 caracteres y puede partirse para conservar el ancho. Los botones nuevos respetan un área de 44 px. La planilla limita la presentación a 20 filas sin olvidar los IDs procesados.

No se añadieron imágenes externas ni datos ficticios de logros. Las piezas de los rangos son los SVG originales del proyecto. Las cantidades del recorrido de prueba anterior son fixtures de validación, no progreso del usuario.

Crítica final, escala subjetiva de 0 a 10: jerarquía 8, identidad 8, claridad de estados 9, coherencia 9. En escritorio bajo, los rangos y el historial requieren desplazarse; se priorizan nivel, saldo y estadísticas. El linter de diseño devuelve cero errores. Sus diez avisos corresponden al nombre interno `unlock`, relleno de ceros en fechas/relojes y sombras existentes de interacción/diálogos. La inspección se realizó con capturas y DOM del navegador integrado; no se ejecutó el inspector CLI que requiere Chrome independiente.

## Límites

El guardado local y el reloj del dispositivo no son una autoridad contra modificaciones manuales. Cambiar de origen/puerto no traslada el perfil; un respaldo permite transportarlo. Una futura economía remota debe aplicar estas reglas en el servidor y coordinar la hidratación asíncrona.

La revisión móvil se realizó redimensionando el navegador, sin afirmar pruebas físicas en Android/iOS. Los logros, torneos y misiones corresponden a fase 6; tienda y skins a fase 4. Las tasas de esas futuras actividades están definidas como funciones puras, pero no se muestran flujos de completado simulados.
