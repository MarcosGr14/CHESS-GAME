import { findReceipt } from '../core/profile';
import { useProfileStore } from '../store/profileStore';
import { formatNumber } from '../lib/dates';
import { Link } from 'react-router-dom';

export default function RewardSummary({ game }) {
  const profile = useProfileStore();
  if (game.mode !== 'bot')
    return (
      <p className="reward-explanation">
        Las partidas locales no modifican tu perfil.
      </p>
    );
  if (!game.progressTracking)
    return (
      <p className="reward-explanation">
        Esta partida anterior se conserva sin modificar tu progreso.
      </p>
    );
  const receipt = findReceipt(profile, game.id);
  if (!receipt)
    return (
      <p className="reward-explanation">
        {profile.processedGameIds.includes(game.id)
          ? 'Este resultado ya está registrado en tu perfil.'
          : 'Registrando el resultado…'}
      </p>
    );
  if (!receipt.eligible)
    return (
      <p className="reward-explanation">
        Terminar antes de mover no da XP, monedas ni modifica el Elo.
      </p>
    );
  const delta = receipt.ratingAfter - receipt.ratingBefore;
  return (
    <section className="reward-summary" aria-label="Progreso de la partida">
      <div className="reward-values">
        <div>
          <span>Experiencia</span>
          <strong>
            +{formatNumber(receipt.xp)}
            <small> XP</small>
          </strong>
        </div>
        <div>
          <span>Monedas</span>
          <strong>+{formatNumber(receipt.coins)}</strong>
        </div>
        <div>
          <span>Elo interno</span>
          <strong className={delta < 0 ? 'rating-negative' : ''}>
            {delta > 0 ? '+' : ''}
            {delta === 0 ? 'Sin cambio' : delta}
          </strong>
        </div>
      </div>
      {receipt.levelAfter > receipt.levelBefore && (
        <p className="level-up" role="status">
          Has alcanzado el nivel {receipt.levelAfter}.
        </p>
      )}
      {receipt.factor < 1 && (
        <p className="reward-explanation">
          {receipt.factor === 0
            ? 'Alcanzaste el límite diario de recompensas contra este rival.'
            : `Recompensa al ${receipt.factor * 100} % por repetir rival hoy.`}{' '}
          Las estadísticas y el Elo sí se actualizan.
        </p>
      )}
      <Link to="/perfil" className="text-button">
        Ver tu perfil <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
