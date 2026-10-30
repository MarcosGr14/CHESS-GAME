import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfileStore } from '../store/profileStore';
import { useSettingsStore } from '../store/settingsStore';
import { getShopItem, RARITY_LABELS } from '../data/shopItems';
import { formatNumber } from '../lib/dates';
import SkinBoard from './SkinBoard';
import Piece from './Piece';
import Icon from './Icon';

export default function StylePreview({
  itemId,
  boardId,
  pieceSetId,
  position,
  onEnlarge,
}) {
  const profile = useProfileStore();
  const colorblind = useSettingsStore((state) => state.colorblind);
  const [message, setMessage] = useState(null);
  const item = getShopItem(itemId);
  const slot = item.categoria === 'tableros' ? 'board' : 'pieces';
  const owned = profile.collection.owned.includes(itemId);
  const equipped = profile.collection.equipped[slot] === itemId;
  const shortfall = Math.max(0, item.precio - profile.wallet.balance);
  function applySelection() {
    try {
      if (owned) {
        profile.equip(itemId);
        setMessage({
          text: `${item.nombre} equipado. Ya puedes verlo en tu partida.`,
          error: false,
        });
      } else {
        profile.purchase(itemId);
        setMessage({
          text: `${item.nombre} añadido a tu inventario. Equípalo cuando quieras.`,
          error: false,
        });
      }
    } catch (error) {
      setMessage({ text: error.message, error: true });
    }
  }
  return (
    <>
      {onEnlarge && (
        <div className="shop-preview-heading">
          <span>Vista previa</span>
          <button className="text-button" onClick={onEnlarge}>
            Ampliar <Icon name="plus" size={14} />
          </button>
        </div>
      )}
      <SkinBoard
        position={position}
        boardId={boardId}
        pieceSetId={pieceSetId}
      />
      <div className="shop-preview-info">
        <div className="shop-preview-meta">
          <span>
            {item.categoria === 'tableros' ? 'Tablero' : 'Set de piezas'}
          </span>
          <span>{RARITY_LABELS[item.rareza]}</span>
        </div>
        <h2>{item.nombre}</h2>
        <p>{item.descripcion}</p>
        <div className="shop-preview-price">
          {owned ? (
            <>
              <Icon name="check" size={15} /> En tu inventario
            </>
          ) : (
            <>
              <Icon name="coin" size={16} />
              <strong>{formatNumber(item.precio)}</strong> monedas
            </>
          )}
        </div>
      </div>
      <div className="shop-preview-actions">
        <button
          className="button primary"
          onClick={applySelection}
          disabled={equipped || (!owned && shortfall > 0)}
          aria-label={
            equipped
              ? `${item.nombre} equipado`
              : owned
                ? `Equipar ${item.nombre}`
                : `Comprar ${item.nombre} por ${item.precio} monedas`
          }
        >
          {equipped ? (
            <>
              <Icon name="check" size={16} /> Equipado
            </>
          ) : owned ? (
            item.categoria === 'tableros' ? (
              'Equipar tablero'
            ) : (
              'Equipar piezas'
            )
          ) : shortfall > 0 ? (
            `Te faltan ${formatNumber(shortfall)} monedas`
          ) : (
            `Comprar por ${formatNumber(item.precio)} monedas`
          )}
        </button>
        <p
          className={`shop-message ${message?.error ? 'error' : ''}`}
          role={message?.error ? 'alert' : 'status'}
        >
          {message?.text ||
            (equipped
              ? 'Este estilo ya está aplicado a tu partida.'
              : 'Probar no cambia tu partida. Equipar sí.')}
        </p>
        <Link to="/jugar" className="text-button">
          {!owned && shortfall
            ? 'Jugar para ganar monedas'
            : 'Ver en mi partida'}{' '}
          <Icon name="arrow" size={15} />
        </Link>
      </div>
      <p className="shop-combination">
        Combinación: {getShopItem(boardId).nombre} +{' '}
        {getShopItem(pieceSetId).nombre}.
      </p>
      {colorblind && (
        <p className="shop-contrast-note">
          El alto contraste tiene prioridad sobre el estilo del tablero en tu
          partida. Puedes cambiarlo en Ajustes.
        </p>
      )}
      <details className="piece-sheet">
        <summary>Ver las 12 piezas</summary>
        {['w', 'b'].map((color) => (
          <div key={color}>
            <span>{color === 'w' ? 'Blancas' : 'Negras'}</span>
            <div className="piece-sheet-row">
              {['k', 'q', 'r', 'b', 'n', 'p'].map((type) => (
                <Piece
                  key={type}
                  color={color}
                  type={type}
                  setId={pieceSetId}
                />
              ))}
            </div>
          </div>
        ))}
      </details>
    </>
  );
}
