# Validación de la fase 1

Fecha: 29 de octubre de 2026.

## Comprobaciones automatizadas

- 40 pruebas Vitest en tres archivos: `core/game.test.js`, `store/gameStore.test.js` y `storage/localAdapter.test.js`.
- Incluyen mate completo, movimientos ilegales, enroque y su reversión, captura al paso, cuatro coronaciones, material, ahogado, regla de 50 movimientos y repetición triple tras serializar.
- Relojes: incremento, turno activo, pausa, reanudación, deshacer, tiempo al cerrar la página, timeout y rey solo del rival.
- Persistencia: rehidratación conservando acciones, JSON corrupto, almacenamiento rechazado, sobre versionado y migración del envoltorio sin versión.
- Validación de importación: estructura, tiempos, nombres, acciones desconocidas, historial y reconstrucción de SAN mediante chess.js.
- Compilación Vite, ESLint, Prettier y auditoría npm ejecutados antes del commit.

## Comprobaciones en navegador

- Clic e2→e4 y e7→e5 con destinos legales.
- Recarga recupera e4/e5 y conserva el contador de movimientos.
- Arrastre real de g1→f3: caballo y notación Nf3 correctos.
- Teclado: Enter en b8, flechas hasta c6 y Enter; notación Nc6 correcta.
- Nueva partida 3+2; partida completa `f3 e5 g4 Qh4#`; resultado «Ganan las negras / Jaque mate».
- Descarga de PGN, deshacer el mate y pausa con relojes detenidos.
- Exportación JSON e importación mediante selector de archivos; confirmación con tres movimientos, restauración del historial y los relojes en pausa.
- Tema oscuro y giro automático guardados y reflejados tras importar.
- Revisiones visuales en escritorio, tableta y móvil, con navegación inferior y sin desbordamiento horizontal.

## Límites y decisiones visuales

- El inspector CLI de la guía de diseño no pudo iniciarse porque no hay Chrome/Chromium independiente instalado. Se utilizó el navegador integrado para revisar la interfaz y medir el DOM. El linter de diseño no detectó errores; los avisos restantes corresponden al reloj `00:00`, los anillos de selección, el tablero físico y las sombras del diálogo o la pieza arrastrada.
- Las fuentes y las piezas SVG son locales. Las piezas se dibujaron para el proyecto.
- El marco del tablero lleva una sombra suave por su carácter de objeto sobre la mesa; los paneles de datos no llevan sombra.
- El dorado se utiliza en pequeños detalles y el verde en el turno activo y la acción principal. Los datos de partida proceden del estado real.
- Falta una prueba en teléfonos físicos Android/iOS. No hay medición Lighthouse en esta fase.
- Bots, economía, lecciones interactivas, torneos, misiones, logros y PWA siguen fuera del alcance de la fase 1.
