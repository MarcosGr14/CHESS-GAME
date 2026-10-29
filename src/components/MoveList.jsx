import { useEffect, useRef } from 'react';
import Icon from './Icon';

export default function MoveList({ moves }) {
  const endRef = useRef(null);
  useEffect(() => {
    const container = endRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [moves.length]);
  const rows = Array.from(
    { length: Math.ceil(moves.length / 2) },
    (_, index) => ({
      number: index + 1,
      white: moves[index * 2],
      black: moves[index * 2 + 1],
    }),
  );
  return (
    <section className="move-section" aria-labelledby="moves-title">
      <div className="section-heading">
        <h2 id="moves-title">Planilla de jugadas</h2>
        <span className="muted small">
          {moves.length} {moves.length === 1 ? 'movimiento' : 'movimientos'}
        </span>
      </div>
      <div className="move-columns" aria-hidden="true">
        <span>N.º</span>
        <span>Blancas</span>
        <span>Negras</span>
      </div>
      <div className="move-scroll" ref={endRef}>
        {rows.length ? (
          <table className="move-table">
            <caption className="sr-only">
              Jugadas en notación algebraica
            </caption>
            <thead className="sr-only">
              <tr>
                <th>Turno</th>
                <th>Blancas</th>
                <th>Negras</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.number}>
                  <td>{row.number}.</td>
                  <td
                    className={row.white === moves.at(-1) ? 'latest-san' : ''}
                  >
                    {row.white?.san || '—'}
                  </td>
                  <td
                    className={
                      row.black && row.black === moves.at(-1)
                        ? 'latest-san'
                        : ''
                    }
                  >
                    {row.black?.san || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="moves-empty">
            <Icon name="book" size={28} />
            <p>
              La historia empieza
              <br />
              con tu primera jugada.
            </p>
            <span>Las blancas mueven primero.</span>
          </div>
        )}
      </div>
    </section>
  );
}
