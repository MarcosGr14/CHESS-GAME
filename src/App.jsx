import { useEffect, useSyncExternalStore } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useSettingsStore } from './store/settingsStore';
import { useGameStore } from './store/gameStore';
import { getStorageError, subscribeStorage } from './storage';
import Icon from './components/Icon';
import Home from './pages/Home';
import Play from './pages/Play';
import Settings from './pages/Settings';
import Guide from './pages/Guide';
import { useBotOpponent } from './engine/useBotOpponent';
import Profile from './pages/Profile';
import ProfileShortcut from './components/ProfileShortcut';
import { useProfileStore } from './store/profileStore';
import { formatNumber } from './lib/dates';
import Shop from './pages/Shop';

const navigation = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/jugar', label: 'Jugar', icon: 'board' },
  { to: '/tienda', label: 'Tienda', icon: 'shop' },
  { to: '/perfil', label: 'Perfil', icon: 'profile' },
  { to: '/guia', label: 'Guía rápida', icon: 'book' },
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
];

export default function App() {
  useBotOpponent();
  const coins = useProfileStore((state) => state.wallet.balance);
  const theme = useSettingsStore((state) => state.theme);
  const update = useSettingsStore((state) => state.update);
  const storageError = useSyncExternalStore(subscribeStorage, getStorageError);
  const location = useLocation();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content =
      theme === 'dark' ? '#191b19' : '#f6f4ee';
  }, [theme]);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `Enroque · ${navigation.find((item) => item.to === location.pathname)?.label || 'Página no encontrada'}`;
  }, [location.pathname]);
  // The clock also expires while visiting another route, not just on the board.
  useEffect(() => {
    const interval = setInterval(
      () => useGameStore.getState().checkTimeout(),
      500,
    );
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="Enroque, inicio">
          <svg
            viewBox="0 0 40 48"
            className="brand-mark"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 6h6v8h6V6h6v8h6V6h0v16l-7 5 2 12H13l2-12-7-5ZM11 40h18M8 45h24" />
            <path d="M16 29h8" />
          </svg>
          <span>
            enroque<span className="brand-dot">.</span>
            <small>El juego de pensar</small>
          </span>
        </Link>
        <div className="sidebar-context">Tu club, en cualquier lugar</div>
        <nav aria-label="Navegación principal" className="main-nav">
          {navigation.map((item) => (
            <NavLink
              to={item.to}
              end={item.to === '/'}
              key={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              <Icon name="chevron" size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ProfileShortcut />
          <button
            className="theme-toggle"
            onClick={() => update('theme', theme === 'dark' ? 'light' : 'dark')}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            <span>Modo {theme === 'dark' ? 'claro' : 'oscuro'}</span>
          </button>
          <div className="local-label">
            <span /> Jugamos en local
          </div>
        </div>
      </aside>
      <div className="mobile-header">
        <Link to="/" className="mobile-brand">
          enroque<span>.</span>
        </Link>
        <Link
          to="/perfil"
          className="mobile-wallet"
          aria-label={`Saldo: ${formatNumber(coins)} monedas`}
        >
          <Icon name="coin" size={18} />
          <span>{formatNumber(coins)}</span>
        </Link>
        <button
          className="icon-button"
          aria-label={`Activar modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          onClick={() => update('theme', theme === 'dark' ? 'light' : 'dark')}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>
      <main id="main-content" className="main-content">
        {storageError && (
          <div className="storage-warning" role="alert">
            <Icon name="info" size={18} />
            {storageError}
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jugar" element={<Play />} />
          <Route path="/guia" element={<Guide />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/tienda" element={<Shop />} />
          <Route path="/ajustes" element={<Settings />} />
          <Route
            path="*"
            element={
              <div className="not-found">
                <h1>Esta casilla no existe.</h1>
                <p className="muted">Volvamos a un tablero conocido.</p>
                <Link className="button primary" to="/jugar">
                  Ir a jugar <Icon name="arrow" size={17} />
                </Link>
              </div>
            }
          />
        </Routes>
        <footer className="page-footer">
          <span>Enroque · Ajedrez sin distracciones</span>
          <span>Piensa. Mueve. Disfruta.</span>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {navigation
          .filter((item) => item.to !== '/guia')
          .map((item) => (
            <NavLink
              end={item.to === '/'}
              to={item.to}
              key={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>
    </div>
  );
}
