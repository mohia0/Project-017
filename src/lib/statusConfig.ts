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
  | 'Processing'
  | 'Accepted'
  | 'Paid'
  | 'Overdue'
  | 'Declined'
  | 'Cancelled'
  | 'Active'
  | 'Inactive'
  | 'Planning'
  | 'On Hold'
  | 'Completed';

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
  Processing: {
    badge:       'bg-[#eff6ff]',
    badgeText:   'text-[#1d4ed8]',
    badgeBorder: 'border-[#dbeafe]',
    bar:         '#3b82f6',
    label:       'Processing',
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
  Active: {
    badge:       'bg-[#f0fdf4]',
    badgeText:   'text-[#166534]',
    badgeBorder: 'border-[#dcfce7]',
    bar:         '#10b981',
    label:       'Active',
  },
  Inactive: {
    badge:       'bg-[#fff7ed]',
    badgeText:   'text-[#9a3412]',
    badgeBorder: 'border-[#ffedd5]',
    bar:         '#f97316',
    label:       'Inactive',
  },
  Planning: {
    badge:       'bg-[#eef2ff]',
    badgeText:   'text-[#4338ca]',
    badgeBorder: 'border-[#e0e7ff]',
    bar:         '#6366f1',
    label:       'Planning',
  },
  'On Hold': {
    badge:       'bg-[#fffbeb]',
    badgeText:   'text-[#92400e]',
    badgeBorder: 'border-[#fef3c7]',
    bar:         '#f59e0b',
    label:       'On Hold',
  },
  Completed: {
    badge:       'bg-[#f5f3ff]',
    badgeText:   'text-[#5b21b6]',
    badgeBorder: 'border-[#ede9fe]',
    bar:         '#3d0ebf',
    label:       'Completed',
  },
};

/**
 * Helper — get colors for a status key, falling back to Draft.
 * Now supports dynamic custom statuses from workspace settings.
 */
export function getStatusColors(statusName: string, customStatuses?: any[]): StatusColors & { dynamic?: { bg: string, text: string, border: string } } {
  // 1. Try to find in custom statuses from store
  const custom = customStatuses?.find(s => s.name === statusName);
  
  const baseColors = custom && custom.color 
    ? {
        badge:       '', 
        badgeText:   '', 
        badgeBorder: '', 
        bar:         custom.color,
        label:       custom.name,
      }
    : (STATUS_COLORS[statusName as StatusKey] ?? STATUS_COLORS.Draft);

  const c = baseColors.bar;
  return {
    ...baseColors,
    dynamic: {
      bg: `${c}15`,     // 8% opacity
      text: c,
      border: `${c}30` // 18% opacity
    }
  };
}

