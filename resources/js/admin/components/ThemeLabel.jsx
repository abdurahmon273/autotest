export default function ThemeLabel({ theme }) {
    return (
        <span className="theme-label">
            {theme.icon_url ? <img src={theme.icon_url} alt="" className="theme-icon" /> : theme.icon_type === 0 && theme.icon ? <span className="theme-icon-text">{theme.icon}</span> : null}
            <span>{theme.title ?? theme.title_krill}</span>
        </span>
    );
}
