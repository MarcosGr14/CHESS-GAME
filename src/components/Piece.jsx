import { useProfileStore } from '../store/profileStore';
import { getPieceAsset } from '../themes';

export default function Piece({ type, color, setId, className = '', style }) {
  const equipped = useProfileStore((state) => state.collection.equipped.pieces);
  const activeSet = setId || equipped;
  return (
    <svg
      viewBox="0 0 64 64"
      className={`piece piece-${color} ${className}`}
      style={style}
      data-piece-set={activeSet}
      aria-hidden="true"
      focusable="false"
    >
      <image
        href={getPieceAsset(activeSet, type, color)}
        width="64"
        height="64"
      />
    </svg>
  );
}
