// ─── Filter Types ─────────────────────────────────────────────────────────────

export type FilterOperator = 'is' | 'is_not';

export type FilterFieldType = 'enum' | 'date' | 'text' | 'number';

export interface FilterField {
  key: string;
  label: string;
  type: FilterFieldType;
  options?: string[]; // for enum type
}

export interface FilterRow {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any; // string | string[] | { preset: string } | number
}

export interface SavedFilter {
  id: string;
  name: string;
  rows: FilterRow[];
}

// ─── Date Presets ─────────────────────────────────────────────────────────────

export type DatePreset =
  | 'today'
  | 'tomorrow'
  | 'yesterday'
  | 'next_7_days'
  | 'last_7_days'
  | 'next_30_days'
  | 'last_30_days'
  | 'this_month'
  | 'next_month'
  | 'last_month'
  | 'this_year';

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today',       label: 'Today' },
  { value: 'tomorrow',    label: 'Tomorrow' },
  { value: 'yesterday',   label: 'Yesterday' },
  { value: 'next_7_days', label: 'Next 7 days' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'next_30_days',label: 'Next 30 days' },
  { value: 'last_30_days',label: 'Last 30 days' },
  { value: 'this_month',  label: 'This month' },
  { value: 'next_month',  label: 'Next month' },
  { value: 'last_month',  label: 'Last month' },
  { value: 'this_year',   label: 'This year' },
];

// ─── Date Preset Matching ─────────────────────────────────────────────────────

function dateMatchesPreset(dateStr: string | null | undefined, preset: DatePreset): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();

  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = startOf(now);
  const dDay  = startOf(d);

  const diffDays = Math.round((dDay.getTime() - today.getTime()) / 86400000);

  switch (preset) {
    case 'today':       return diffDays === 0;
    case 'tomorrow':    return diffDays === 1;
    case 'yesterday':   return diffDays === -1;
    case 'last_7_days': return diffDays >= -7 && diffDays < 0;
    case 'next_7_days': return diffDays > 0 && diffDays <= 7;
    case 'last_30_days':return diffDays >= -30 && diffDays < 0;
    case 'next_30_days':return diffDays > 0 && diffDays <= 30;
    case 'this_month': {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    case 'next_month': {
      const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return d.getMonth() === nm.getMonth() && d.getFullYear() === nm.getFullYear();
    }
    case 'last_month': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    }
    case 'this_year':   return d.getFullYear() === now.getFullYear();
    default:            return false;
  }
}

// ─── Core Matcher ─────────────────────────────────────────────────────────────

function matchesRow(item: Record<string, any>, row: FilterRow, fields: FilterField[]): boolean {
  const field = fields.find(f => f.key === row.field);
  if (!field) return true; // unknown field — skip

  const rawVal = item[row.field];
  let matches = false;

  if (field.type === 'enum') {
    // value is a string[] of selected options
    const selected: string[] = Array.isArray(row.value) ? row.value : row.value ? [row.value] : [];
    if (selected.length === 0) return true;
    matches = selected.includes(String(rawVal ?? ''));

  } else if (field.type === 'date') {
    const preset = row.value?.preset as DatePreset | undefined;
    if (!preset) return true;
    matches = dateMatchesPreset(rawVal, preset);

  } else if (field.type === 'text') {
    const q = String(row.value ?? '').toLowerCase().trim();
    if (!q) return true;
    matches = String(rawVal ?? '').toLowerCase().includes(q);

  } else if (field.type === 'number') {
    const amount = Number(rawVal ?? 0);
    const { op = 'gte', num = 0 } = (row.value ?? {}) as { op?: string; num?: number };
    if (row.value == null || row.value === '') return true;
    if (op === 'eq')  matches = amount === num;
    if (op === 'gte') matches = amount >= num;
    if (op === 'lte') matches = amount <= num;
    if (op === 'gt')  matches = amount > num;
    if (op === 'lt')  matches = amount < num;
  }

  return row.operator === 'is_not' ? !matches : matches;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function applyFilters<T extends Record<string, any>>(
  items: T[],
  rows: FilterRow[],
  fields: FilterField[]
): T[] {
  const activeRows = rows.filter(r => r.field && r.value != null && r.value !== '' && !(Array.isArray(r.value) && r.value.length === 0));
  if (activeRows.length === 0) return items;
  return items.filter(item => activeRows.every(row => matchesRow(item, row, fields)));
}

export function makeFilterRow(): FilterRow {
  return {
    id: Math.random().toString(36).slice(2),
    field: '',
    operator: 'is',
    value: null,
  };
}
