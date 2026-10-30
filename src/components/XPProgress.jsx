import { getLevelProgress } from '../core/xp';
import { formatNumber } from '../lib/dates';

export default function XPProgress({ xp, compact = false }) {
  const progress = getLevelProgress(xp);
  return (
    <div className={`xp-progress ${compact ? 'compact' : ''}`}>
      <div className="xp-labels">
        <span>Nivel {progress.level}</span>
        <span>
          {formatNumber(progress.xpIntoLevel)} /{' '}
          {formatNumber(progress.requiredXp)} XP
        </span>
      </div>
      <progress
        value={progress.xpIntoLevel}
        max={progress.requiredXp}
        aria-label={`Progreso del nivel ${progress.level}: ${progress.xpIntoLevel} de ${progress.requiredXp} XP`}
      />
      {!compact && (
        <p>
          Te faltan {formatNumber(progress.remainingXp)} XP para el nivel{' '}
          {progress.level + 1}.
        </p>
      )}
    </div>
  );
}
