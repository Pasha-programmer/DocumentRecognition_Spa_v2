import './App.css';
import Menu from './Components/Menu';
import Router from './Components/Router';
import { RoutePaths } from './Constants/RoutePaths';

export default function App() {
    return (
        <div className="app-shell">
            <header className="app-header">
                <a className="app-header-logo" href={RoutePaths.Home}>
                    Система распознавания символов
                </a>
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
