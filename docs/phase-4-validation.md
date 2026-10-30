# Validación de la fase 4

Fecha: 30 de octubre de 2026. Versión 0.4.0.

## Entrega

Tienda con seis tableros y seis sets de piezas; inventario, compra, equipo, vista previa combinada, ampliación y lámina de doce piezas. El diseño conserva **Editorial greeting**, semilla **1728893013**, con marfil, nogal, fieltro, oro antiguo y fuentes locales. No se añadieron dependencias.

Los sets usan 72 SVG originales, con siluetas y lenguajes distintos: clásico, geométrico, pixel, tinta, art déco y cristal facetado. Los tableros usan tokens y diez texturas SVG originales para mármol, madera, pergamino, tinta y neón. Los 82 SVG suman unos 25,8 kB sin comprimir y se validaron como XML. No hay fotografías externas, recursos de terceros, filtros SVG ni sets copiados. Los dos clásicos siguen siendo gratuitos y se incluyen por defecto.

La tienda muestra el saldo real, precios, rarezas, propiedad y equipo. Seleccionar no modifica el guardado: la vista previa usa el mismo renderizado y la posición actual de la partida. Comprar entrega el artículo, y equipar lo aplica por separado. Los nombres de estilos aparecen en Jugar; Inicio y las piezas de capturas, coronación y diálogos usan el equipo del perfil.

## Economía y persistencia

`core/shop.js` contiene las operaciones puras. El precio procede del catálogo; solo se recibe un ID. Saldo, monedas gastadas y propiedad se calculan juntos y se persisten con un único `set` del perfil. Un error no permite un descuento parcial. Equipar requiere propiedad, conserva la otra categoría y no cobra. No se añade otro registro de tienda con saldo duplicado.

El perfil y la persistencia Zustand pasan de versión 1 a 2. La migración añade únicamente la colección clásica y conserva nombre, XP, Elo, monedas, resultados y límites diarios. Las nuevas copias JSON usan versión 4 e incluyen inventario y equipo; también se aceptan 1, 2 y 3. El estado de partida sigue en esquema 3 y el sobre del adaptador en 1. Toda la copia se valida antes de restaurar.

## Pruebas automatizadas

188 pruebas en doce archivos: las 157 anteriores más 31 de catálogo, recursos, economía, migración y persistencia. Las once pruebas del WASM real de Stockfish siguen pasando.

- Catálogo con al menos seis artículos por categoría, IDs únicos, precios enteros y rarezas válidas.
- Doce SVG resolubles por set, materiales existentes, siluetas de caballo distintas y ausencia de recursos SVG externos.
- Coordenadas con contraste mínimo 4.5:1 sobre los colores base de cada tablero; prioridad del alto contraste y desactivación de texturas.
- Clásicos gratuitos y equipados al crear un perfil.
- Compra sin mutar el original, saldo exacto, falta de saldo, duplicados, IDs inválidos e intento de enviar otro precio.
- Equipo exclusivo de artículos poseídos, independencia de categorías y ausencia de cobro por equipar.
- Rechazo de inventarios corruptos, duplicados, tipos cruzados y equipo no poseído.
- Migración del perfil y del registro Zustand de fase 3, conservación de acciones y respaldo completo.
- Compra y equipo persistentes, recarga sin cargos nuevos y conservación de ID, revisión y posición del juego al cambiar estilos.

`npm test`, `npm run lint` y `npm run build` terminan correctamente. La revisión final de formato usa `npm run format:check`.

## Navegador y compilación de producción

La validación se realizó en `localhost:4174`, separado del guardado real del usuario en `localhost:5174`. Los 100 créditos usados para comprar son un fixture de prueba; no se añadieron al perfil del usuario.

1. Importar una copia de fase 3 sin colección muestra 100 monedas y dos clásicos poseídos, conservando los demás datos.
2. Probar Mármol del jardín cambia el tablero de la vista previa; el clásico sigue marcado como equipado y el saldo continúa en 100.
3. Comprar el tablero por 40 deja saldo 60 e inventario 3. Equiparlo no descuenta más.
4. Comprar Geometría por 60 deja saldo 0 e inventario 4. Equiparlo y recargar conserva ambos estilos, sin otro cargo.
5. Jugar muestra `board-marble`, `pieces-minimal`, la textura real y los nombres de estilos. Inicio utiliza la misma combinación.
6. Se juega `e4 e5` por selección y destino, y `Nf3` mediante arrastre real con las nuevas piezas. La planilla contiene exactamente tres movimientos.
7. El inventario filtra las dos piezas y los dos tableros poseídos. Los estilos no poseídos siguen disponibles para probarse en el catálogo.
8. Probar Cristal tallado con saldo cero abre un detalle con su arte y botón deshabilitado «Te faltan 240 monedas». La lámina desplegada contiene las doce piezas.
9. El JSON exportado contiene versión 4, perfil 2, saldo 0, ganadas 100, gastadas 100, cuatro IDs únicos y los dos estilos equipados. Restaurarlo mantiene esos valores.
10. Una copia con un tablero equipado desconocido se rechaza con un mensaje; no abre la confirmación de restauración.
11. Activar alto contraste muestra los colores accesibles y `background-image: none`, conservando el ID del mármol y el set de piezas. Desactivarlo recupera el material elegido.
12. Se revisan tienda y detalle en claro y oscuro, móvil de 390 px, tableta de 768 px y escritorio de 1440 px. El DOM no tiene desbordamiento horizontal. En móvil la primera tarjeta empieza alrededor de 333 px dentro de una altura de 844 px.

Hasta 980 px, el catálogo usa dos columnas y seleccionar abre un diálogo de detalle; en escritorio el detalle permanece al lado. El diálogo mantiene foco y cierre nativos, permite desplazarse y muestra la compra o el saldo que falta. La navegación inferior conserva cinco destinos; la guía permanece accesible desde Inicio y Tienda. La barra lateral permite desplazamiento en pantallas bajas.

## Revisión de diseño

- Pregunta principal: «¿Cómo se verá mi mesa y puedo pagar este estilo?». El catálogo y el tablero real de prueba responden antes que la información secundaria.
- Objetos: doce artículos con nombre, categoría, precio, rareza y descripción; colección con propiedad y un equipo por categoría. Saldo y conteos se calculan desde el mismo perfil. Una cuenta nueva muestra cero monedas y dos artículos.
- Rasgo del producto: material del tablero y siluetas de ajedrez originales, sobre el diseño clásico ya establecido. No se introducen imágenes de relleno ni métricas ficticias.
- La compra, la propiedad y el equipo tienen estados diferentes y etiquetas explícitas. Las rarezas incluyen texto y borde, sin depender exclusivamente del color. Los controles nuevos principales tienen al menos 44 px de área táctil.
- Primera revisión: el detalle desplazaba el catálogo móvil por debajo del primer pantallazo. Se sustituyó por un diálogo al seleccionar. Se corrigieron las miniaturas para conservar proporciones de casillas y se reforzó el color del pergamino para alcanzar contraste de coordenadas.
- Crítica final subjetiva: jerarquía 8/10, identidad 9/10, estados 9/10 y coherencia 9/10. Los materiales son deliberadamente más expresivos que el clásico; la elección y el alto contraste permiten adecuarlos al juego.

El linter de diseño devuelve cero errores y once avisos: dos por el nombre interno `unlock`, dos por ceros en relojes/fechas y siete por declaraciones de sombras, incluida una declaración `box-shadow: none`. Las sombras efectivas corresponden al tablero existente y a interacciones/diálogos. La revisión se hizo con capturas y medidas DOM del navegador integrado; no se ejecutó el inspector CLI.

## Extensión y límites

El catálogo y los recursos se descubren automáticamente. [Cómo añadir un skin](adding-skins.md) documenta los JSON, tokens, nombres de los doce SVG y comprobaciones. No hace falta editar lógica de compra o renderizado para ampliar el catálogo.

La revisión móvil fue con un navegador redimensionado; sigue pendiente la prueba física en Android/iOS. No se afirma una puntuación Lighthouse ni instalación offline, que pertenecen al pulido de fase 7. No se implementaron actividades de fase 5. Las monedas y las compras siguen siendo locales, con la misma limitación ante modificaciones manuales del guardado que en fase 3.
