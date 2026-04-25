/**
 * Shared date utility functions used across Invoices, Proposals,
 * Projects, Forms, Schedulers, and Hooks pages.
 */

export function fmtDate(d: string | null | undefined): string {
    if (!d) return '—';
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export function timeAgo(d: string | null | undefined): string {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();

    // Set both to midnight for accurate calendar day comparison
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffDays = Math.round((dNow.getTime() - dDate.getTime()) / 86400000);
    const ms = now.getTime() - date.getTime();
    const isFuture = ms < 0;
    const absDays = Math.abs(diffDays);

    if (diffDays === 0) return 'today';
    if (diffDays === -1) return 'tomorrow';
    if (diffDays === 1) return 'yesterday';

    if (absDays < 30) {
        return isFuture ? `due in ${absDays} days` : `${absDays} days ago`;
    }

    const months = Math.floor(absDays / 30);
    if (isFuture) return `in about ${months} month${months > 1 ? 's' : ''}`;
    return `about ${months} month${months > 1 ? 's' : ''} ago`;
}

export function isThisMonth(d: string | null | undefined): boolean {
    if (!d) return false;
    const now = new Date();
    const then = new Date(d);
    return then.getMonth() === now.getMonth() && then.getFullYear() === now.getFullYear();
}

export function isThisYear(d: string | null | undefined): boolean {
    if (!d) return false;
    return new Date(d).getFullYear() === new Date().getFullYear();
}
