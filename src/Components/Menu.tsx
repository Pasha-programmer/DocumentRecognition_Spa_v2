import { RoutePaths } from '../Constants/RoutePaths';

const links = [
    {
        href: RoutePaths.Documents,
        label: 'Все документы',
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-icon">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
            </svg>
        ),
    },
    {
        href: RoutePaths.RecognizedDocuments,
        label: 'Распознанные',
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-icon">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
        ),
    },
    {
        href: RoutePaths.NotProcessedDocuments,
        label: 'Необработанные',
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-icon">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
        ),
    },
];

export default function Menu() {
    const current = window.location.pathname;

    return (
        <nav className="sidebar">
            <div className="sidebar-label">Навигация</div>
            {links.map((link) => (
                <a
                    key={link.href}
                    href={link.href}
                    className={`sidebar-link ${current === link.href ? 'active' : ''}`}
                >
                    {link.icon}
                    {link.label}
                </a>
            ))}
        </nav>
    );
}
