/**
 * ─── Global Status Color System ───────────────────────────────────────────
 *
 * Single source of truth for proposal & invoice status colors.
 * Designed to be future-proof for user-customizable themes.
 *
 * Palette philosophy:
 *   - Muted, desaturated tones that feel premium and on-brand
 *   - Works on both white (#fff) and light-gray (#f7f7f7) backgrounds
 *   - Dark mode uses opacity-based neutrals (theme-consistent)
 *   - `bar` uses slightly richer color for the status bar accent strip
 *
 * To support future user customization, replace hard-coded values here
 * with values read from a store / user settings object.
 * ──────────────────────────────────────────────────────────────────────────
 */

export type StatusKey =
  | 'Draft'
  | 'Pending'
  | 'Accepted'
  | 'Paid'
  | 'Overdue'
  | 'Declined'
  | 'Cancelled';

export interface StatusColors {
  /** Tailwind bg class — badge / chip background (light mode) */
  badge: string;
  /** Tailwind text class — badge / chip label (light mode) */
  badgeText: string;
  /** Tailwind border class — badge / chip border (light mode) */
  badgeBorder: string;
  /** Solid hex color for the status bar accent strip */
  bar: string;
  /** Human-readable label */
  label: string;
}

/**
 * Muted, desaturated status palette.
 * Edit these values to restyle all statuses across the entire app.
 */
export const STATUS_COLORS: Record<StatusKey | 'All', StatusColors> = {
  All: {
    badge:       'bg-[#f8fafc]',
    badgeText:   'text-[#475569]',
    badgeBorder: 'border-[#e2e8f0]',
    bar:         '#94a3b8',
    label:       'All',
  },
  Draft: {
    badge:       'bg-[#eef2ff]',
    badgeText:   'text-[#4f46e5]',
    badgeBorder: 'border-[#e0e7ff]',
    bar:         '#6366f1',
    label:       'Draft',
  },
  Pending: {
    badge:       'bg-[#fffbeb]',
    badgeText:   'text-[#b45309]',
    badgeBorder: 'border-[#fef3c7]',
    bar:         '#f59e0b',
    label:       'Pending',
  },
  Accepted: {
    badge:       'bg-[#f0fdf4]',
    badgeText:   'text-[#166534]',
    badgeBorder: 'border-[#dcfce7]',
    bar:         '#22c55e',
    label:       'Accepted',
  },
  Paid: {
    badge:       'bg-[#f0fdf4]',
    badgeText:   'text-[#166534]',
    badgeBorder: 'border-[#dcfce7]',
    bar:         '#22c55e',
    label:       'Paid',
  },
  Overdue: {
    badge:       'bg-[#fef2f2]',
    badgeText:   'text-[#b91c1c]',
    badgeBorder: 'border-[#fee2e2]',
    bar:         '#ef4444',
    label:       'Overdue',
  },
  Declined: {
    badge:       'bg-[#fafaf9]',
    badgeText:   'text-[#57534e]',
    badgeBorder: 'border-[#e7e5e4]',
    bar:         '#78716c',
    label:       'Declined',
  },
  Cancelled: {
    badge:       'bg-[#f8fafc]',
    badgeText:   'text-[#475569]',
    badgeBorder: 'border-[#e2e8f0]',
    bar:         '#94a3b8',
    label:       'Cancelled',
  },
};

/**
 * Helper — get colors for a status key, falling back to Draft.
 */
export function getStatusColors(status: string): StatusColors {
  return STATUS_COLORS[status as StatusKey] ?? STATUS_COLORS.Draft;
}
