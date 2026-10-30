import { Link } from 'react-router-dom';
import { useProfileStore } from '../store/profileStore';
import { getLevelProgress, getRank } from '../core/xp';
import { formatNumber } from '../lib/dates';
import XPProgress from './XPProgress';
import Icon from './Icon';

export default function ProfileShortcut() {
  const profile = useProfileStore();
  const rank = getRank(getLevelProgress(profile.xp).level);
  return (
    <Link to="/perfil" className="profile-shortcut">
      <div className="shortcut-identity">
        <span>{profile.name}</span>
        <small>{rank.name}</small>
      </div>
      <XPProgress xp={profile.xp} compact />
      <div className="shortcut-wallet">
        <span>
          <Icon name="coin" size={16} /> Monedas
        </span>
        <strong>{formatNumber(profile.wallet.balance)}</strong>
      </div>
    </Link>
  );
}
