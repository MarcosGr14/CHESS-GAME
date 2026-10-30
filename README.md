# Enroque

Ajedrez clásico en español, para dos personas en el mismo dispositivo o contra diez rivales con Stockfish WASM. React 18 + Vite + JavaScript, con todas las reglas de tablero delegadas a chess.js 1.4.0.

## Entrega: fases 1 a 4

Implementadas la base local, Stockfish, la progresión y la tienda. Incluye diez bots, elección de color, desbloqueos, perfil, XP, rangos, Elo, monedas, inventario y seis tableros y seis sets de piezas originales. Comprar, equipar y respaldar conserva todo el progreso. Los modos educativos interactivos corresponden a la fase 5.

### Instalación y desarrollo

Requiere Node.js 22.12 o superior y npm. Se ha verificado con Node 24.21.0.

```bash
npm ci
npm run dev
```

Abre la dirección que indica Vite, normalmente http://localhost:5173. El servidor escucha en `0.0.0.0`: para probar desde un teléfono en la misma red, utiliza la dirección `Network` que muestra Vite. El cortafuegos del equipo debe permitir el acceso.

```bash
npm test              # Pruebas de reglas, relojes, guardado y acciones
npm run test:watch
npm run bench:bots    # Muestra de 12 partidas para contrastar niveles bajos
npm run lint
npm run format:check
npm run format
npm run build         # Genera dist/
npm run preview       # Sirve la compilación
```

## Cómo jugar y comprobar la fase

1. Entra en **Jugar**. El tablero inicial permite jugar sin tiempo inmediatamente.
2. Selecciona una pieza y un destino, o arrástrala. Con teclado, Tab entra al tablero, las flechas navegan, Enter/Espacio seleccionan y mueven, y Escape cancela la selección.
3. **Nueva partida** permite escribir los nombres y elegir sin tiempo, 3+2, 5+0, 10+0 o 15+10. Reemplazar una partida requiere comenzar desde ese diálogo; se recomienda exportar antes su PGN.
4. Prueba el mate `1. f3 e5 2. g4 Qh4#`. Se muestra el resultado y se bloquean movimientos posteriores. **Deshacer** permite volver a jugar en modo local; los resultados contra bots son definitivos.
5. Para enrocar, juega `1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O`; mueve el rey e1→g1, la torre se mueve automáticamente. Para captura al paso: `1. e4 a6 2. e5 d5 3. exd6`.
6. **Girar tablero** cambia la orientación. En Ajustes se puede activar el giro en cada turno, ocultar destinos legales, cambiar el tema y usar el tablero de alto contraste.
7. Recarga: se recuperan posición, planilla, relojes, resultado y ajustes. El historial completo conserva la repetición triple.
8. **PGN** descarga una partida con nombres, fecha, jugadas y resultado. **Ajustes → Exportar copia** genera un JSON para restaurar partida, ajustes, rivales y perfil completo en otro navegador. La importación valida todo antes de solicitar reemplazar el guardado.

La partida termina automáticamente por mate, ahogado, material insuficiente, repetición triple y regla de 50 movimientos. También admite rendición, tablas de mutuo acuerdo y pérdida por tiempo. Si el rival solo tiene rey, el tiempo agotado se adjudica como tablas.

### Decisiones de relojes y persistencia

- El reloj comienza **con el primer movimiento**, indicado al elegir el ritmo. El primer movimiento de blancas no consume tiempo y sí recibe el incremento. A partir de ahí, cada turno consume tiempo real.
- El reloj usa marcas de tiempo, no un contador de intervalos: cambiar de pestaña, visitar otra ruta o cerrar el navegador no detiene una partida activa. **Pausar** detiene ambos relojes y bloquea los movimientos. La pausa también se guarda.
- Deshacer recupera el tiempo disponible justo antes de la jugada y revierte su incremento. Deshacer la primera jugada devuelve los relojes al estado inicial.
- Los respaldos congelan los relojes y restauran una partida en pausa, para que trasladar un archivo no consuma tiempo. Exportar no pausa la partida original.
- El guardado pertenece al origen del navegador: cambiar de puerto/dominio/dispositivo no lo traslada. La navegación privada o borrar datos puede eliminarlo. Si el navegador rechaza el guardado, se muestra un aviso y sigue siendo posible exportar.
- La regla de tablas por acuerdo es local: ambos jugadores comparten la pantalla, por lo que la confirmación se dirige explícitamente al rival.
- Las fuentes se incluyen en el build. No se depende de Google Fonts ni de servicios externos durante una partida. La instalación PWA y la caché offline corresponden a la fase 7.

## Arquitectura

```text
src/
  core/        Reglas, relojes, bots, XP, monedas, Elo, respaldos y validación pura
  data/        Catálogo de diez bots
  engine/      Bootstrap Worker, cliente UCI y coordinador de turnos
  storage/     Interfaz, LocalStorageAdapter y migraciones de esquema
  store/       Zustand + persist: game, settings, bot y profile
  components/  Tablero, piezas SVG originales, jugadores, planilla, diálogos e iconos
  pages/       Inicio, sala de juego, tienda/inventario, perfil, guía y ajustes
  themes/      Definiciones JSON, texturas y 72 piezas SVG originales
  styles/      Tokens de diseño y estilos responsive
```

**La UI y los stores no acceden a localStorage.** `src/storage/index.js` configura el adaptador y conecta Zustand mediante un `PersistStorage` que expone `getItem`, `setItem` y `removeItem`. La interfaz del adaptador incluye `getGame/saveGame`, `getSettings/saveSettings` y `getProfile/saveProfile`, utilizada por el perfil de la fase 3. Se pueden devolver promesas al sustituir el adaptador; la futura implementación remota deberá exponer un estado de hidratación para que la UI espere su lectura inicial.

Cada registro se envuelve en `{ schemaVersion, data }`; `migrations.js` centraliza su lectura y migraciones. El estado de partida también contiene `schemaVersion`. Las versiones desconocidas y los datos corruptos se rechazan sin romper la interfaz. Añade migraciones explícitas al cambiar el esquema; no basta con incrementar el número. El historial se reconstruye con chess.js, sin confiar en SAN o capturas importadas.

La lógica de juego y tiempo es pura en `src/core/game.js`. El almacén solo coordina acciones, fechas y persistencia. La economía y los respaldos también son funciones puras en `core/`, sin dependencias de React ni almacenamiento.

### Dependencias

| Paquete                                            | Motivo                                                        |
| -------------------------------------------------- | ------------------------------------------------------------- |
| React 18, react-dom, Vite y plugin-react           | Stack y compilación solicitados                               |
| chess.js                                           | Validación de movimientos y finales, sin reimplementar reglas |
| Zustand                                            | Estado global con persistencia intercambiable                 |
| react-router-dom                                   | Rutas SPA; versión 7 compatible con React 18                  |
| @fontsource/inter y @fontsource/cormorant-garamond | Fuentes locales reproducibles sin peticiones a terceros       |
| Vitest                                             | Pruebas deterministas de lógica y almacenamiento              |
| ESLint, sus plugins, globals y Prettier            | Calidad de JavaScript/React y formato                         |

No hay frameworks de UI, dependencias de servidor ni biblioteca adicional de arrastre.

## Cloudflare Pages

La salida está preparada, sin publicar ningún sitio en esta fase:

- Comando de instalación: `npm ci`.
- Comando de compilación: `npm run build`.
- Carpeta de salida: `dist`.
- Versión de Node: 22.12 o superior; se recomienda 24.
- `public/_redirects` se copia al build y aplica `/* /index.html 200` para rutas SPA.

Configura estos valores al conectar el repositorio en Cloudflare Pages. No se necesitan variables secretas, servidor ni cabeceras de aislamiento para esta fase. Stockfish utiliza la compilación lite de un solo hilo y no necesita cabeceras COOP/COEP. Los archivos de `dist/engine/` deben publicarse junto al resto de `dist`; no se deben sustituir por el fallback SPA. Cloudflare Pages sirve `.wasm` como `application/wasm`.

## Diseño y validación

La dirección es **Editorial greeting**, semilla `1728893013`, con paleta y tipografías del documento: marfil, nogal, fieltro verde y oro antiguo. El tablero y la planilla son los elementos distintivos; no hay estadísticas inventadas. La cuadrícula de la pantalla de juego sigue las reglas de detalle, sin imponer los bloques de métricas de una página de inicio.

Se han verificado reglas, relojes, guardado, migraciones, bots y UCI con 188 pruebas automatizadas (incluyen 11 pruebas con el motor WASM real). La revisión en el navegador incluye partida completa hasta mate, arrastre real, jugada con teclado, recarga, deshacer, pausa, PGN, exportación/importación JSON, modos claro/oscuro y anchos de escritorio, tableta y móvil. Véanse los informes de validación de cada fase en `docs/` para resultados y límites.

La validación visual en un navegador con tamaño móvil no sustituye una prueba física. Queda comprobar en Android/iOS el gesto táctil, el notch, el teclado y la rotación. No se afirma una puntuación Lighthouse; esa auditoría pertenece al pulido de la fase 7.

## Fase 2: jugar contra la máquina

En **Jugar → Nueva partida → Contra la máquina**, elige a Nilo y tu color. Al azar resuelve el color una vez al comenzar y lo guarda. Si eliges negras, el bot hace el primer movimiento; el tablero conserva tu perspectiva aunque esté activado el giro automático local. Puedes girarlo manualmente.

Nilo está disponible desde el inicio. Vencerlo abre la mesa de Clara, y así sucesivamente hasta Elena. Los desbloqueos se guardan por separado y se incluyen en los respaldos. También se puede acceder a un rival cuyo nivel sea igual o inferior al del jugador. Ambos caminos funcionan en la fase 3.

| Nivel | Rival | Elo orientativo | Skill Level | Profundidad máxima | Tiempo máximo (ms) | Error deliberado |
| ----- | ----- | --------------- | ----------- | ------------------ | ------------------ | ---------------- |
| 1     | Nilo  | 400             | 0           | 1                  | 250                | 85 %             |
| 2     | Clara | 600             | 0           | 2                  | 350                | 65 %             |
| 3     | Bruno | 800             | 2           | 3                  | 450                | 45 %             |
| 4     | Alma  | 1000            | 4           | 5                  | 600                | 28 %             |
| 5     | Tomás | 1200            | 7           | 7                  | 750                | 16 %             |
| 6     | Inés  | 1400            | 10          | 9                  | 950                | 8 %              |
| 7     | Darío | 1600            | 13          | 11                 | 1200               | 3 %              |
| 8     | Vera  | 1800            | 16          | 13                 | 1500               | 0 %              |
| 9     | León  | 2000            | 18          | 15                 | 1900               | 0 %              |
| 10    | Elena | 2200            | 20          | 18                 | 2400               | 0 %              |

Los valores Elo describen la dificultad pretendida: no son ratings calibrados ni una clasificación competitiva oficial del jugador. Cada turno se consulta a Stockfish; después, la rama de error puede sustituir su elección por otra jugada legal proporcionada por chess.js. Se conservan promociones, respuestas obligadas y reglas completas. Los nombres y personalidades son contenido original; no representan estilos de apertura calibrados.

### Motor y cancelación

La única dependencia nueva es **`stockfish@19.0.1`**. `postinstall`, `predev` y `prebuild` ejecutan `scripts/prepare-engine.mjs`, que copia únicamente el JS lite, su WASM (~1,85 MB), el bootstrap y los avisos a `public/engine/`. Aunque el paquete npm trae otros motores, no se distribuyen en `dist`. Los archivos generados están ignorados en Git y se reproducen con `npm ci` y `npm run build`.

El Worker clásico carga el motor original y recibe la URL exacta del WASM en su fragmento de URL. El cliente espera `uciok` y `readyok`, fija Hash a 16 MB y limita cada búsqueda con `go depth … movetime …`. Envía la posición inicial y **todo el historial UCI** para conservar las repeticiones. El motor se mantiene caliente entre turnos y no se descarga hasta necesitarlo.

- Deshacer durante el pensamiento revierte tu movimiento. Después de la respuesta, revierte tu movimiento y la respuesta del bot. Con negras, conserva la apertura del rival.
- Pausar, deshacer, reiniciar, importar o terminar invalida la respuesta pendiente mediante una revisión de estado que no se importa ni persiste. Si hay cálculo activo, se envía `stop` y se termina ese Worker. Una respuesta atrasada nunca se aplica a otra posición.
- La interfaz muestra preparación/pensamiento y solo permite mover el lado humano. La rendición siempre corresponde al humano, incluso si el bot está pensando. Las ofertas de tablas quedan limitadas al modo local.
- Si falla el motor, la partida se pausa y muestra **Reintentar motor**. Tanto la inicialización como la búsqueda tienen tiempo límite. Los errores asíncronos de descarga WASM se comunican inmediatamente desde el bootstrap.
- Un pequeño tiempo de respuesta visible (hasta 550 ms) también se puede cancelar y se reduce con poco tiempo en el reloj. Los botones siguen utilizables mientras calcula el Worker.
- Desde la fase 3, deshacer cuesta 5 monedas por defecto; se puede configurar como gratis, 5, 10 o 20 monedas. No se cobra si no hay turno para deshacer o falta saldo. En modo local siempre es gratuito.

### Guardado y compatibilidad

El estado de partida y la versión de persistencia Zustand pasan a **2**. La migración pura en `core/gameSchema.js`, reexportada desde `storage/migrations.js`, conserva los guardados de fase 1 como partidas locales. El sobre genérico del adaptador sigue en versión 1 porque su formato no cambió. Los JSON nuevos usan versión 2 y contienen partida, ajustes y rivales vencidos. Se siguen aceptando respaldos de versión 1; estos conservan los desbloqueos que ya existan en el navegador.

El bot continúa al visitar otras rutas. Recargar reanuda una búsqueda pendiente a partir del historial guardado; nunca guarda ni reutiliza una respuesta parcial. Los relojes mantienen las decisiones de la fase 1. La apertura del bot con blancas tampoco consume tiempo antes del primer movimiento.

### Validación de esta entrega

`npm test` incluye pruebas del cliente con transporte simulado (handshake, cancelación, resultados atrasados, errores, reintentos y tiempos límite), del estado real de juego, de migraciones, desbloqueos y errores deliberados. Once pruebas adicionales ejecutan el **mismo WASM npm** en un proceso Node de prueba: verifican los diez niveles y un mate en uno. Ese transporte solo se usa para pruebas; la aplicación usa Web Workers.

`npm run bench:bots` juega cuatro partidas por cada uno de los tres primeros bots, alternando colores, contra una referencia Skill 20 / profundidad 7 / 120 ms. En la muestra registrada los tres perdieron 4 de 4 (12 derrotas en total). Esto comprueba su debilidad frente a esa referencia y no predice la tasa de victoria de una persona ni calibra Elo. Los errores externos usan una semilla fija; las decisiones internas de Stockfish pueden variar. Resultados: `docs/phase-2-benchmark.json`.

La revisión de navegador incluye la compilación de producción, apertura al elegir negras, deshacer durante el pensamiento, recarga, JSON y fallo deliberado de descarga seguido de recuperación. Resultados y límites: `docs/phase-2-validation.md`.

### Stockfish y sus avisos

Los binarios originales de [Stockfish.js 19.0.1](https://github.com/nmrugg/stockfish.js/tree/v19.0.1) se distribuyen sin modificar bajo GPL-3.0. El build incluye `engine/COPYING.txt` y `engine/SOURCE.txt`, con enlace al código fuente correspondiente y sus instrucciones de compilación. El protocolo utilizado está documentado en la [referencia UCI oficial de Stockfish](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-&-Commands.html).

## Fase 3: tu progreso

Abre **Perfil** para ver nivel, barra de XP, rango, Elo, monedas, estadísticas y los últimos 20 resultados. Puedes cambiar el nombre. El resumen de progreso aparece al terminar contra un bot; la navegación y el inicio muestran el mismo saldo y nivel. Los logros se incorporarán en la fase 6.

- El nivel empieza en 1. Pasar de n a n+1 cuesta `round(100 * n^1.5)` XP: 100, 283, 520… El sobrante pasa al siguiente nivel.
- Rangos: Peón desde nivel 1; Caballo 5; Alfil 10; Torre 20; Dama 35; Rey 50.
- Una partida contra bot da 10 XP por jugar. Ganar añade 50 × multiplicador (1 a 3 según el nivel del bot); tablas añaden 25 XP. Victoria: 20 a 100 monedas; tablas: 10; derrota: 0.
- Se exige al menos un movimiento humano para registrar estadísticas, XP, monedas o Elo. Rendirse antes de mover no genera progreso. Las partidas locales tampoco afectan al perfil.
- Por cada bot y fecha local, las primeras cinco partidas aplican factores 100 %, 100 %, 75 %, 50 % y 25 % a XP y monedas, redondeando hacia abajo. Las siguientes dan cero; las estadísticas y el Elo siguen actualizándose. También cuentan las derrotas para no obtener XP ilimitada al rendirse repetidamente.
- Elo inicial 800, fórmula logística de diferencia de 400, K=32 y límites 100–4000. Es una referencia interna; la dificultad orientativa de los bots no es una calibración competitiva.
- Deshacer contra bots recupera un turno humano completo por un único descuento configurable. Si no alcanza el saldo, no cambia el tablero ni se descuentan monedas. Un resultado registrado contra bot es definitivo; empieza otra partida para volver a jugar.

Cada resultado se liquida una sola vez por ID: XP, saldo, Elo, estadísticas y marca de procesamiento se guardan juntos en el perfil. La recarga recupera una liquidación pendiente si se guardó antes la partida. Reimportar el mismo resultado no vuelve a pagarlo. Se conserva un registro completo de IDs procesados aunque la lista visible solo muestre 20 partidas.

La partida y los nuevos respaldos JSON usan **esquema 3**; el perfil nace en **esquema 1**. El sobre del adaptador sigue en versión 1. Se aceptan respaldos 1 y 2: conservan el perfil actual, migran partidas en curso y no premian finales antiguos. Un respaldo 3 restaura el perfil completo y avisa antes de reemplazarlo. Toda la copia se valida antes de aplicar cambios; los relojes se congelan como en fases anteriores.

Las tasas de lecciones, puzzles, misiones y torneos están definidas en `core/rewards.js`; sus flujos de completado y entrega se conectarán en sus respectivas fases. Esta entrega no incorpora tienda ni actividades ficticias.

Para comprobarlo: termina una partida contra un bot, abre **Perfil**, recarga y verifica que el resultado y saldo no cambian. Exporta un respaldo en Ajustes y restáuralo: no se duplica el premio. Con saldo disponible, mueve y usa **Deshacer** para ver el descuento. `npm test` comprueba curva de niveles, rangos, Elo, antifarmeo, monedero, liquidación única, deshacer, persistencia y respaldos. Detalle: [validación de fase 3](docs/phase-3-validation.md).

## Fase 4: tienda y estilos

Abre **Tienda** para explorar **Tableros** y **Sets de piezas**. Seleccionar un artículo solo cambia la vista previa, que muestra la posición actual de tu partida. Puedes combinar un tablero y un set antes de comprarlos, ampliar la mesa y desplegar las doce piezas. En móvil y tableta, seleccionar abre el detalle en un diálogo; en escritorio, el detalle permanece al lado del catálogo. La navegación inferior mantiene cinco destinos; la guía sigue accesible desde Inicio y Tienda.

**Comprar** añade el artículo al inventario; **Equipar tablero/piezas** lo aplica. Son acciones separadas. Solo se pueden equipar artículos poseídos. Equipar es gratis y no altera las jugadas, los relojes ni el ID de la partida. El cambio se refleja en Jugar, Inicio, capturas, coronaciones y las piezas de la interfaz, y persiste al recargar. **Mi inventario** filtra lo que ya es tuyo. También puedes abrirlo desde Perfil.

| Tablero           | Monedas | Material                                |
| ----------------- | ------: | --------------------------------------- |
| Marfil y nogal    |  Gratis | Clásico original                        |
| Mármol del jardín |      40 | Vetas de piedra verde y blanca          |
| Nogal de torneo   |      90 | Grano de madera y nudos                 |
| Atlas antiguo     |     120 | Fibras, marcas de esquina y oliva       |
| Jardín de tinta   |     160 | Pinceladas secas sobre papel            |
| Medianoche        |     220 | Marcas de cian sobre casillas nocturnas |

| Piezas           | Monedas | Arte                                 |
| ---------------- | ------: | ------------------------------------ |
| Staunton clásico |  Gratis | Siluetas torneadas originales        |
| Geometría        |      60 | Figuras mínimas y espacios abiertos  |
| Ocho bits        |     100 | Siluetas escalonadas                 |
| Trazo de tinta   |     140 | Contornos y pinceladas irregulares   |
| Salón dorado     |     180 | Pedestales escalonados y oro antiguo |
| Cristal tallado  |     240 | Planos y facetas de hielo y piedra   |

Los clásicos se incluyen y equipan por defecto, también al migrar de fase 3. Los 72 SVG de piezas y las diez texturas de tablero son dibujos originales del proyecto, sin imágenes externas, filtros ni dependencias nuevas. Las rarezas se identifican por texto y un borde discreto. El modo de alto contraste prevalece sobre el material del tablero en Jugar y conserva la elección para cuando lo desactives.

La compra usa exclusivamente el precio del catálogo. Saldo y propiedad se calculan juntos con una función pura y se guardan en un único registro del perfil. Si falta saldo, el ID no existe o la compra está duplicada, no se entrega ni se descuenta nada. El inventario vive junto al monedero para evitar una transacción entre dos registros separados. La lógica de tienda está en `core/shop.js`; no se duplican saldo ni propiedad en otro store.

El perfil pasa a **esquema 2**, con migración explícita desde el 1 que conserva XP, Elo, estadísticas y monedas. Los respaldos nuevos usan **versión 4** e incluyen propiedad y equipo; se siguen aceptando las versiones 1, 2 y 3. El esquema de partida permanece en 3 y el sobre del adaptador en 1.

Para comprobarlo, gana monedas contra bots, selecciona un estilo, cómpralo y equípalo. Abre Jugar y recarga para ver que se conserva. Exporta un respaldo desde Ajustes y restáuralo para comprobar el inventario. La compra duplicada y el saldo insuficiente también están cubiertos por Vitest. [Validación de la fase 4](docs/phase-4-validation.md).

### Añadir un skin

Solo requiere datos y archivos: una definición JSON en `src/themes/boards/` o `src/themes/pieces/`, con sus SVG cuando correspondan. El catálogo y el cargador los descubren automáticamente, sin editar la lógica de compra, `Piece` ni `Board`. La [guía para añadir skins](docs/adding-skins.md) contiene el esquema, los nombres de archivos, los tokens de tablero y las comprobaciones.
