# Enroque

Ajedrez clásico en español, para dos personas en el mismo dispositivo. React 18 + Vite + JavaScript, con todas las reglas de tablero delegadas a chess.js 1.4.0.

## Entrega: fase 1

Implementada la base del proyecto solicitado. La siguiente fase es Stockfish en un Worker; no se han adelantado bots, XP, monedas, tienda, currículo, torneos ni PWA. La guía rápida actual es una referencia de reglas, no el futuro modo de lecciones interactivas.

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
4. Prueba el mate `1. f3 e5 2. g4 Qh4#`. Se muestra el resultado y se bloquean movimientos posteriores. **Deshacer** permite volver a jugar.
5. Para enrocar, juega `1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O`; mueve el rey e1→g1, la torre se mueve automáticamente. Para captura al paso: `1. e4 a6 2. e5 d5 3. exd6`.
6. **Girar tablero** cambia la orientación. En Ajustes se puede activar el giro en cada turno, ocultar destinos legales, cambiar el tema y usar el tablero de alto contraste.
7. Recarga: se recuperan posición, planilla, relojes, resultado y ajustes. El historial completo conserva la repetición triple.
8. **PGN** descarga una partida con nombres, fecha, jugadas y resultado. **Ajustes → Exportar copia** genera un JSON para restaurar partida y ajustes en otro navegador. La importación valida todo antes de solicitar reemplazar el guardado.

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
  core/        Reglas adaptadas, relojes, reconstrucción, PGN, validación y descargas
  storage/     Interfaz, LocalStorageAdapter y migraciones de esquema
  store/       Zustand + persist: game y settings
  components/  Tablero, piezas SVG originales, jugadores, planilla, diálogos e iconos
  pages/       Inicio, sala de juego, guía de reglas y ajustes
  styles/      Tokens de diseño y estilos responsive
```

**La UI y los stores no acceden a localStorage.** `src/storage/index.js` configura el adaptador y conecta Zustand mediante un `PersistStorage` que expone `getItem`, `setItem` y `removeItem`. La interfaz del adaptador incluye `getGame/saveGame`, `getSettings/saveSettings` y `getProfile/saveProfile`, preparada para las siguientes fases. Se pueden devolver promesas al sustituir el adaptador; la futura implementación remota deberá exponer un estado de hidratación para que la UI espere su lectura inicial.

Cada registro se envuelve en `{ schemaVersion, data }`; `migrations.js` centraliza su lectura y migraciones. El estado de partida también contiene `schemaVersion`. Las versiones desconocidas y los datos corruptos se rechazan sin romper la interfaz. Añade migraciones explícitas al cambiar el esquema; no basta con incrementar el número. El historial se reconstruye con chess.js, sin confiar en SAN o capturas importadas.

La lógica de juego y tiempo es pura en `src/core/game.js`. El almacén solo coordina acciones, fechas y persistencia. Al añadir progreso, toda la economía debe seguir en módulos puros dentro de `core/`, sin dependencias de React ni almacenamiento.

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

Configura estos valores al conectar el repositorio en Cloudflare Pages. No se necesitan variables secretas, servidor ni cabeceras de aislamiento para esta fase. La futura selección de Stockfish será una compilación de un solo hilo.

## Diseño y validación

La dirección es **Editorial greeting**, semilla `1728893013`, con paleta y tipografías del documento: marfil, nogal, fieltro verde y oro antiguo. El tablero y la planilla son los elementos distintivos; no hay estadísticas inventadas. La cuadrícula de la pantalla de juego sigue las reglas de detalle, sin imponer los bloques de métricas de una página de inicio.

Se han verificado reglas, relojes y persistencia con 40 pruebas automatizadas. La revisión en el navegador incluye partida completa hasta mate, arrastre real, jugada con teclado, recarga, deshacer, pausa, PGN, exportación/importación JSON, modos claro/oscuro y anchos de escritorio, tableta y móvil. Véase `docs/phase-1-validation.md` para los resultados y límites de la comprobación.

La validación visual en un navegador con tamaño móvil no sustituye una prueba física. Queda comprobar en Android/iOS el gesto táctil, el notch, el teclado y la rotación. No se afirma una puntuación Lighthouse; esa auditoría pertenece al pulido de la fase 7.
