/**
 * Reads the persisted theme from Zustand localStorage synchronously.
 * Safe to call during SSR — returns 'light' as fallback.
 */
export function getThemeFromStorage(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    try {
        const raw = localStorage.getItem('ui-storage');
        if (raw) {
            const parsed = JSON.parse(raw);
            const theme = parsed?.state?.theme;
            if (theme === 'dark' || theme === 'light') return theme;
        }
    } catch {
        // ignore
    }
    return 'light';
}
