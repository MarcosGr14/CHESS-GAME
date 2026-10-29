import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Piece from '../components/Piece';

const pieces = [
  [
    'p',
    'Peón',
    'Avanza una casilla; dos desde su salida. Captura en diagonal. Al llegar a la última fila, se transforma en dama, torre, alfil o caballo.',
  ],
  [
    'r',
    'Torre',
    'Se mueve en línea recta por filas y columnas, tantas casillas como estén libres.',
  ],
  [
    'b',
    'Alfil',
    'Se mueve en diagonal. Siempre recorre casillas del mismo color.',
  ],
  [
    'n',
    'Caballo',
    'Dibuja una L: dos casillas en una dirección y una perpendicular. Es la única pieza que salta sobre otras.',
  ],
  [
    'q',
    'Dama',
    'Combina la torre y el alfil: filas, columnas y diagonales. Es la pieza de mayor alcance.',
  ],
  [
    'k',
    'Rey',
    'Avanza una casilla en cualquier dirección. Nunca puede quedar bajo ataque. Protegerlo es el objetivo de la partida.',
  ],
];
export default function Guide() {
  return (
    <>
      <header className="page-heading">
        <div>
          <div className="breadcrumb">Lo esencial, a mano</div>
          <h1>
            Guía rápida<span className="title-period">.</span>
          </h1>
          <p>Las reglas para sentarte a jugar con confianza.</p>
        </div>
        <Link className="button primary" to="/jugar">
          Ir al tablero <Icon name="arrow" size={17} />
        </Link>
      </header>
      <section className="guide-controls">
        <h2>Cómo mover en Enroque</h2>
        <p>
          <strong>Con el dedo o el ratón:</strong> toca una pieza y después su
          destino, o arrástrala. Los puntos marcan movimientos y los aros
          señalan capturas.
        </p>
        <p>
          <strong>Con teclado:</strong> entra al tablero con Tab, navega con las
          flechas y pulsa Enter o Espacio para seleccionar y mover. Escape
          cancela la selección.
        </p>
        <p>
          <strong>Con reloj:</strong> comienza tras el primer movimiento y sigue
          al cambiar de pestaña o cerrar la página. Usa Pausar para detener
          ambos relojes. Deshacer recupera el tiempo anterior a la jugada.
        </p>
      </section>
      <div className="guide-pieces">
        {pieces.map(([type, name, text]) => (
          <section key={type}>
            <Piece type={type} color="w" />
            <div>
              <h2>{name}</h2>
              <p>{text}</p>
            </div>
          </section>
        ))}
      </div>
      <section className="guide-rules">
        <h2>Los movimientos especiales</h2>
        <p>
          <strong>Enroque.</strong> Mueve el rey dos casillas hacia una torre.
          Ninguna de las dos piezas debe haberse movido, el camino debe estar
          libre y el rey no puede estar en jaque, atravesarlo ni acabar en él.
        </p>
        <p>
          <strong>Captura al paso.</strong> Si un peón rival avanza dos casillas
          y queda al lado del tuyo, puedes capturarlo como si hubiera avanzado
          una. Debes hacerlo en la jugada siguiente.
        </p>
        <p>
          <strong>Jaque y mate.</strong> Si atacan a tu rey, debes protegerlo.
          Si no hay ninguna respuesta legal, es jaque mate.
        </p>
        <p>
          <strong>Tablas.</strong> La partida termina en empate por ahogado,
          material insuficiente, repetición triple, 50 movimientos de cada
          jugador sin capturas ni movimientos de peón, o acuerdo entre ambos
          jugadores.
        </p>
        <p>
          <strong>La planilla.</strong> Usamos notación algebraica
          internacional: K (rey), Q (dama), R (torre), B (alfil), N (caballo), x
          (captura), + (jaque), # (mate) y O-O / O-O-O (enroques).
        </p>
      </section>
    </>
  );
}
