# Cómo añadir un skin

El catálogo descubre los JSON con `import.meta.glob`; las piezas y las texturas se resuelven de la misma forma. Añadir un estilo requiere únicamente datos y archivos. Los cambios se detectan al desarrollar y se incluyen en la siguiente compilación. No hay un registro manual ni ramas por nombre de estilo dentro de los componentes.

## Datos comunes

Cada artículo define `id`, `nombre`, `categoria`, `precio`, `rareza`, `estilo` y `descripcion`. El ID debe ser único y estable; no cambies ni elimines un ID ya publicado porque puede estar en un inventario o respaldo. `precio` es un entero no negativo en monedas del juego. Las categorías son `tableros` y `piezas`; las rarezas, `común`, `raro`, `épico` y `legendario`. Usa textos breves en español y arte propio.

Los dos artículos iniciales son `board-classic` y `pieces-classic`. Son gratuitos y forman parte de todos los perfiles. Los nuevos artículos aparecen en el catálogo; la propiedad requiere comprarlos. No modifiques inventarios existentes para conceder una compra.

## Tablero

Crea, por ejemplo, `src/themes/boards/pizarra.json`:

```json
{
  "id": "board-pizarra",
  "nombre": "Pizarra de estudio",
  "categoria": "tableros",
  "precio": 80,
  "rareza": "raro",
  "estilo": "Pizarra",
  "descripcion": "Piedra clara y pizarra oscura para una mesa de estudio.",
  "tokens": {
    "--board-light": "#e3e5e2",
    "--board-dark": "#4f5d5f",
    "--board-edge": "#293638",
    "--coordinate-dark": "#283537",
    "--coordinate-light": "#f8fbf7",
    "--legal": "#193a2b",
    "--last": "#d4b877"
  }
}
```

Para añadir material, crea SVG transparentes y ligeros en la misma carpeta y añade a ese JSON:

```json
"textures": {
  "light": "pizarra-light.svg",
  "dark": "pizarra-dark.svg"
}
```

Cada textura se escala a una casilla completa, con fondo transparente que deja ver su color base. Usa `viewBox="0 0 64 64"`, trazos discretos y formas originales. Evita filtros costosos o recursos externos. Los estilos incluidos muestran vetas, grano de madera, fibras, pinceladas y marcas de luz. Comprueba que el material no compita con las piezas o las coordenadas. Las dos combinaciones de coordenadas con su fondo deben alcanzar al menos 4.5:1; los tests comprueban los colores base, y la inspección visual debe revisar también la textura.

El cargador aplica estos tokens solamente al tablero, a Inicio y a las vistas previas. El alto contraste de Ajustes tiene prioridad en la partida y desactiva texturas; no cambia el ID equipado.

## Set de piezas

Crea `src/themes/pieces/linea.json`:

```json
{
  "id": "pieces-linea",
  "nombre": "Línea de estudio",
  "categoria": "piezas",
  "precio": 90,
  "rareza": "raro",
  "estilo": "Trazo lineal",
  "descripcion": "Siluetas propias de trazo limpio para estudiar cada posición.",
  "assetFolder": "linea"
}
```

Dibuja las doce piezas en `src/themes/pieces/linea/`:

| Tipo    | Blancas   | Negras    |
| ------- | --------- | --------- |
| Rey     | `w-k.svg` | `b-k.svg` |
| Dama    | `w-q.svg` | `b-q.svg` |
| Torre   | `w-r.svg` | `b-r.svg` |
| Alfil   | `w-b.svg` | `b-b.svg` |
| Caballo | `w-n.svg` | `b-n.svg` |
| Peón    | `w-p.svg` | `b-p.svg` |

Todos usan `viewBox="0 0 64 64"`, con el dibujo dentro del lienzo y margen para el contorno. Incluye colores, rellenos y trazos directamente en el SVG: al renderizarse mediante una imagen externa no heredan las variables internas de la página. Conserva una diferencia clara entre blancas y negras y contornos visibles tanto sobre casillas claras como oscuras. Prueba también el tablero nocturno y el alto contraste. El arte nuevo debe cambiar la silueta y el lenguaje de dibujo, además de la paleta.

`Piece` recibe el set equipado o un `setId` explícito para una vista previa. El mismo recurso se utiliza al mover, arrastrar, coronar y mostrar capturas. No necesita código específico para un nuevo set. Los SVG pequeños se incluyen como URL de datos en el build y no producen descargas externas.

## Comprobación

1. Ejecuta `npm test`, `npm run lint`, `npm run format:check` y `npm run build`.
2. Revisa la tarjeta del nuevo artículo en Tienda, su detalle ampliado y las doce piezas si corresponde.
3. Prueba la combinación con otros estilos, en claro y oscuro, con ancho móvil y con alto contraste.
4. Compra con el saldo exacto y comprueba que se entrega sin equiparse automáticamente. Equipa, recarga y restaura un JSON.
5. Comprueba movimiento, arrastre y coronación; el skin no debe modificar las reglas ni las acciones del juego.

Las pruebas recorren automáticamente los artículos y recursos descubiertos. Cubren metadatos, doce piezas por set, texturas existentes, coordenadas, precios, propiedad, equipo, saldo insuficiente, compras duplicadas, migración y respaldos. El catálogo inicial contiene seis tableros y seis sets; añadir más no requiere cambiar esos tests.
