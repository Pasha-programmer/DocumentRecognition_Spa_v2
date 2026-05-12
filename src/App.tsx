import './App.css';
import Menu from './Components/Menu';
import Router from './Components/Router';
import { RoutePaths } from './Constants/RoutePaths';
import { useTheme } from './Hooks/useTheme';

export default function App() {
    const { theme, toggle } = useTheme();

    return (
        <div className="app-shell">
            <header className="app-header">
                <a className="app-header-logo" href={RoutePaths.Home}>
                    Система распознавания символов
                </a>

                {/* Кнопка переключения темы */}
                <button className="btn btn-ghost btn-sm"
                    onClick={toggle}
                    title="Переключить тему"
                    style={{ fontSize: '18px', padding: '6px 10px' }}>
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </header>
            <div className="app-body">
                <Menu />
                <main className="main-content">
                    <Router />
                </main>
            </div>
        </div>
    );
}
