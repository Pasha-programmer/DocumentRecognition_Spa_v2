import { useState } from 'react';
import './App.css';
import Menu from './Components/Menu';
import Router from './Components/Router';
import { RoutePaths } from './Constants/RoutePaths';
import { useTheme } from './Hooks/useTheme';

export default function App() {
    const { theme, toggle } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false); // новый стейт


    return (
        <div className="app-shell">
            <header className="app-header">
                {/* Гамбургер — виден только на мобиле (display:none на десктопе через CSS) */}
                <button
                    className="mobile-menu-btn"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    title="Меню"
                >
                    ☰
                </button>

                <a className="app-header-logo" href={RoutePaths.Home}>
                    Система распознавания символов
                </a>

                <button
                    className="btn btn-ghost btn-sm"
                    onClick={toggle}
                    title="Переключить тему"
                    style={{ fontSize: '18px', padding: '6px 10px' }}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </header>

            <div className="app-body">
                <Menu
                    mobileOpen={mobileOpen}
                    setMobileOpen={setMobileOpen}
                />
                <main className="main-content">
                    <Router />
                </main>
            </div>
        </div>
    );
}

