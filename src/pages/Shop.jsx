import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProfileStore } from '../store/profileStore';
import { useGameStore } from '../store/gameStore';
import { restoreChess } from '../core/game';
import { getShopItem, SHOP_ITEMS, RARITY_LABELS } from '../data/shopItems';
import { formatNumber } from '../lib/dates';
import { SkinSwatch } from '../components/SkinBoard';
import SkinBoard from '../components/SkinBoard';
import StylePreview from '../components/StylePreview';
import Icon from '../components/Icon';
import Modal from '../components/Modal';

export default function Shop() {
  const profile = useProfileStore();
  const { initialFen, moves } = useGameStore();
  const position = useMemo(
    () => restoreChess({ initialFen, moves }).board(),
    [initialFen, moves],
  );
  const [params, setParams] = useSearchParams();
  const inventory = params.get('inventario') === '1';
  const category = params.get('categoria') === 'piezas' ? 'piezas' : 'tableros';
  const slot = category === 'tableros' ? 'board' : 'pieces';
  const [draft, setDraft] = useState(profile.collection.equipped);
  const [enlarged, setEnlarged] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const selectedId =
    inventory && !profile.collection.owned.includes(draft[slot])
      ? profile.collection.equipped[slot]
      : draft[slot];
  const previewStyles = { ...draft, [slot]: selectedId };
  const items = SHOP_ITEMS.filter(
    (item) =>
      item.categoria === category &&
      (!inventory || profile.collection.owned.includes(item.id)),
  );

  function changeCategory(nextCategory) {
    const next = new URLSearchParams(params);
    next.set('categoria', nextCategory);
    setParams(next);
  }
  function changeView(ownedOnly) {
    const next = new URLSearchParams(params);
    if (ownedOnly) {
      next.set('inventario', '1');
      setDraft(profile.collection.equipped);
    } else next.delete('inventario');
    setParams(next);
  }
  function tryItem(item) {
    setDraft((current) => ({ ...current, [slot]: item.id }));
    if (window.matchMedia('(max-width: 980px)').matches) setDetailOpen(true);
  }
  const previewProps = {
    itemId: selectedId,
    boardId: previewStyles.board,
    pieceSetId: previewStyles.pieces,
    position,
  };
  return (
    <>
      <header className="page-heading">
        <div>
          <div className="breadcrumb">Tu mesa, a tu manera</div>
          <h1>
            Tienda<span className="title-period">.</span>
          </h1>
          <p>Elige el lugar de tu próxima partida.</p>
        </div>
        <div className="shop-balance">
          <Icon name="coin" size={19} />
          <strong>{formatNumber(profile.wallet.balance)}</strong>
          <span>monedas disponibles</span>
        </div>
      </header>
      <div className="shop-toolbar">
        <div
          className="shop-view-options"
          role="group"
          aria-label="Colección de estilos"
        >
          <button aria-pressed={!inventory} onClick={() => changeView(false)}>
            Catálogo
          </button>
          <button aria-pressed={inventory} onClick={() => changeView(true)}>
            Mi inventario <span>{profile.collection.owned.length}</span>
          </button>
        </div>
        <div
          className="shop-category-options"
          role="group"
          aria-label="Categoría de estilos"
        >
          {['tableros', 'piezas'].map((value) => (
            <button
              key={value}
              aria-pressed={category === value}
              onClick={() => changeCategory(value)}
            >
              {value === 'tableros' ? 'Tableros' : 'Sets de piezas'}
            </button>
          ))}
        </div>
      </div>
      <div className="shop-layout">
        <section className="shop-catalog" aria-labelledby="catalog-title">
          <div className="section-heading">
            <h2 id="catalog-title">
              {inventory
                ? category === 'tableros'
                  ? 'Tus tableros'
                  : 'Tus piezas'
                : category === 'tableros'
                  ? 'Mesas para pensar'
                  : 'Formas de jugar'}
            </h2>
            <span className="small muted">
              {items.length} {items.length === 1 ? 'estilo' : 'estilos'}
            </span>
          </div>
          <div className="shop-items">
            {items.map((item) => {
              const itemSlot =
                item.categoria === 'tableros' ? 'board' : 'pieces';
              const isEquipped =
                profile.collection.equipped[itemSlot] === item.id;
              const isOwned = profile.collection.owned.includes(item.id);
              return (
                <button
                  key={item.id}
                  className={`shop-item ${selectedId === item.id ? 'selected' : ''}`}
                  data-rarity={item.rareza}
                  aria-pressed={selectedId === item.id}
                  aria-label={`Probar ${item.nombre}${isEquipped ? ', equipado' : isOwned ? ', en tu inventario' : `, ${item.precio} monedas`}`}
                  onClick={() => tryItem(item)}
                >
                  <SkinSwatch item={item} />
                  <span className="shop-item-description">
                    <span className="shop-item-meta">
                      <span>{RARITY_LABELS[item.rareza]}</span>
                      {isEquipped && (
                        <span className="item-equipped">
                          <Icon name="check" size={13} /> Equipado
                        </span>
                      )}
                    </span>
                    <strong>{item.nombre}</strong>
                    <span className="shop-item-footer">
                      <span>{item.estilo}</span>
                      <span>
                        {isOwned
                          ? isEquipped
                            ? 'En uso'
                            : 'En tu inventario'
                          : `${formatNumber(item.precio)} monedas`}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="shop-catalog-note">
            Selecciona un estilo para probarlo. El tablero y las piezas clásicos
            son tuyos desde el primer día.
          </p>
          <Link to="/guia" className="text-button">
            Repasar la guía de juego <Icon name="arrow" size={15} />
          </Link>
        </section>
        <aside
          className="shop-preview shop-preview-inline"
          aria-label="Estilo seleccionado"
        >
          <StylePreview
            key={selectedId}
            {...previewProps}
            onEnlarge={() => setEnlarged(true)}
          />
        </aside>
      </div>
      {detailOpen && (
        <Modal
          title="Vista previa"
          className="skin-preview-modal"
          onClose={() => setDetailOpen(false)}
        >
          <div className="shop-preview-dialog">
            <StylePreview key={selectedId} {...previewProps} />
          </div>
        </Modal>
      )}
      {enlarged && (
        <Modal
          title="Tu mesa en detalle"
          className="skin-preview-modal"
          onClose={() => setEnlarged(false)}
        >
          <SkinBoard
            position={position}
            boardId={previewStyles.board}
            pieceSetId={previewStyles.pieces}
          />
          <p className="muted centered">
            {getShopItem(previewStyles.board).nombre} ·{' '}
            {getShopItem(previewStyles.pieces).nombre}
          </p>
        </Modal>
      )}
    </>
  );
}
