'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Minus, Check, X, ChevronDown, Save, SlidersHorizontal, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FilterRow,
  FilterField,
  SavedFilter,
  FilterOperator,
  DATE_PRESETS,
  makeFilterRow,
} from '@/lib/filterUtils';

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldSelect({
  value, fields, onChange, isDark,
}: {
  value: string;
  fields: FilterField[];
  onChange: (v: string) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = fields.find(f => f.key === value)?.label ?? 'Select field';

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium border min-w-[100px] max-w-[130px] truncate transition-all',
          isDark
            ? 'bg-white/5 border-white/10 text-[#ccc] hover:border-white/20'
            : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#333] hover:border-[#d0d0d0]'
        )}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown size={10} className="opacity-40 shrink-0" />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full left-0 mt-1 z-[200] rounded-[10px] border shadow-xl py-1 min-w-[150px]',
          isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-white border-[#e0e0e0]'
        )}>
          {fields.map(f => (
            <button
              key={f.key}
              onClick={() => { onChange(f.key); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-1.5 text-[11.5px] text-left transition-colors',
                value === f.key
                  ? isDark ? 'bg-white/8 text-white' : 'bg-[#f0f0f0] text-[#111]'
                  : isDark ? 'text-[#ccc] hover:bg-white/5' : 'text-[#333] hover:bg-[#f5f5f5]'
              )}
            >
              {f.label}
              {value === f.key && <Check size={10} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OperatorToggle({
  value, onChange, isDark,
}: {
  value: FilterOperator;
  onChange: (v: FilterOperator) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium border w-[80px] transition-all',
          isDark
            ? 'bg-white/5 border-white/10 text-[#ccc] hover:border-white/20'
            : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#333] hover:border-[#d0d0d0]'
        )}
      >
        <span className="flex-1 text-left">{value === 'is' ? 'Is' : 'Is not'}</span>
        <ChevronDown size={10} className="opacity-40 shrink-0" />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full left-0 mt-1 z-[200] rounded-[10px] border shadow-xl py-1 min-w-[100px]',
          isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-white border-[#e0e0e0]'
        )}>
          {(['is', 'is_not'] as FilterOperator[]).map(op => (
            <button
              key={op}
              onClick={() => { onChange(op); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-1.5 text-[11.5px] text-left transition-colors',
                value === op
                  ? isDark ? 'bg-white/8 text-white' : 'bg-[#f0f0f0] text-[#111]'
                  : isDark ? 'text-[#ccc] hover:bg-white/5' : 'text-[#333] hover:bg-[#f5f5f5]'
              )}
            >
              {op === 'is' ? 'Is' : 'Is not'}
              {value === op && <Check size={10} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EnumValue({
  value, options, onChange, isDark,
}: {
  value: string[];
  options: string[];
  onChange: (v: string[]) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected: string[] = Array.isArray(value) ? value : [];
  const label = selected.length === 0 ? 'Select…' : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    onChange(next);
  };

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium border transition-all',
          isDark
            ? 'bg-white/5 border-white/10 text-[#ccc] hover:border-white/20'
            : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#333] hover:border-[#d0d0d0]'
        )}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown size={10} className="opacity-40 shrink-0" />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full left-0 mt-1 z-[200] rounded-[10px] border shadow-xl py-1 min-w-[140px] max-h-[220px] overflow-y-auto',
          isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-white border-[#e0e0e0]'
        )}>
          {options.map(opt => {
            const isOn = selected.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-1.5 text-[11.5px] text-left transition-colors',
                  isOn
                    ? isDark ? 'bg-white/8 text-white' : 'bg-[#f0f0f0] text-[#111]'
                    : isDark ? 'text-[#ccc] hover:bg-white/5' : 'text-[#333] hover:bg-[#f5f5f5]'
                )}
              >
                <div className={cn(
                  'w-[13px] h-[13px] shrink-0 rounded-[3px] border flex items-center justify-center',
                  isOn ? 'bg-primary border-primary' : isDark ? 'border-[#444]' : 'border-[#d0d0d0]'
                )}>
                  {isOn && <Check size={9} strokeWidth={3} className="text-black" />}
                </div>
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateValue({
  value, onChange, isDark,
}: {
  value: { preset: string } | null;
  onChange: (v: { preset: string } | null) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLabel = DATE_PRESETS.find(p => p.value === value?.preset)?.label ?? 'Select…';

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium border transition-all',
          isDark
            ? 'bg-white/5 border-white/10 text-[#ccc] hover:border-white/20'
            : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#333] hover:border-[#d0d0d0]'
        )}
      >
        <span className="flex-1 text-left">{currentLabel}</span>
        <ChevronDown size={10} className="opacity-40 shrink-0" />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full left-0 mt-1 z-[200] rounded-[10px] border shadow-xl py-1 min-w-[150px] max-h-[260px] overflow-y-auto',
          isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-white border-[#e0e0e0]'
        )}>
          {DATE_PRESETS.map(p => {
            const isOn = value?.preset === p.value;
            return (
              <button
                key={p.value}
                onClick={() => { onChange({ preset: p.value }); setOpen(false); }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-1.5 text-[11.5px] text-left transition-colors',
                  isOn
                    ? isDark ? 'bg-white/8 text-white' : 'bg-[#f0f0f0] text-[#111]'
                    : isDark ? 'text-[#ccc] hover:bg-white/5' : 'text-[#333] hover:bg-[#f5f5f5]'
                )}
              >
                {p.label}
                {isOn && (
                  <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Check size={9} className="text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TextValue({
  value, onChange, isDark, placeholder = 'Enter value…',
}: {
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'flex-1 px-2.5 py-1.5 rounded-[6px] text-[11.5px] border outline-none transition-all min-w-0',
        isDark
          ? 'bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/25'
          : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#bbb] focus:border-[#c0c0c0]'
      )}
    />
  );
}

function NumberValue({
  value, onChange, isDark,
}: {
  value: { op?: string; num?: number } | null;
  onChange: (v: { op: string; num: number }) => void;
  isDark: boolean;
}) {
  const [opOpen, setOpOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const op = value?.op ?? 'gte';
  const num = value?.num ?? '';
  const opLabels: Record<string, string> = { eq: '=', gte: '≥', lte: '≤', gt: '>', lt: '<' };

  useEffect(() => {
    if (!opOpen) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [opOpen]);

  return (
    <div className="flex items-center gap-1 flex-1">
      <div ref={ref} className="relative shrink-0">
        <button
          onClick={() => setOpOpen(v => !v)}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-[6px] text-[11.5px] font-medium border transition-all w-[40px] justify-center',
            isDark
              ? 'bg-white/5 border-white/10 text-[#ccc] hover:border-white/20'
              : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#333] hover:border-[#d0d0d0]'
          )}
        >
          {opLabels[op]}
        </button>
        {opOpen && (
          <div className={cn(
            'absolute top-full left-0 mt-1 z-[200] rounded-[10px] border shadow-xl py-1 min-w-[60px]',
            isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-white border-[#e0e0e0]'
          )}>
            {Object.entries(opLabels).map(([k, v]) => (
              <button key={k} onClick={() => { onChange({ op: k, num: Number(num) }); setOpOpen(false); }}
                className={cn(
                  'w-full px-3 py-1.5 text-[11.5px] text-center transition-colors',
                  op === k
                    ? isDark ? 'bg-white/8 text-white' : 'bg-[#f0f0f0] text-[#111]'
                    : isDark ? 'text-[#ccc] hover:bg-white/5' : 'text-[#333] hover:bg-[#f5f5f5]'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="number"
        value={num}
        onChange={e => onChange({ op, num: Number(e.target.value) })}
        placeholder="0"
        className={cn(
          'w-[120px] px-2.5 py-1.5 rounded-[6px] text-[11.5px] border outline-none transition-all min-w-0',
          isDark
            ? 'bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/25'
            : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#bbb] focus:border-[#c0c0c0]'
        )}
      />
    </div>
  );
}

// ─── Save Dialog ──────────────────────────────────────────────────────────────

function SaveDialog({
  isDark, onSave, onCancel,
}: {
  isDark: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all animate-in fade-in duration-200" onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'w-[320px] rounded-[16px] border shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200',
          isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-white border-[#e0e0e0]'
        )}
      >
        <div className="flex items-center justify-between">
          <span className={cn('text-[13px] font-semibold', isDark ? 'text-white' : 'text-[#111]')}>
            Create filter
          </span>
          <button onClick={onCancel} className={cn('p-1 rounded-lg transition-colors', isDark ? 'text-[#666] hover:bg-white/5' : 'text-[#aaa] hover:bg-[#f5f5f5]')}>
            <X size={14} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Filter name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
          className={cn(
            'w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none transition-all',
            isDark
              ? 'bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/25'
              : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#bbb] focus:border-[#c0c0c0]'
          )}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className={cn(
              'flex-1 py-1.5 rounded-[8px] text-[12px] font-medium border transition-colors',
              isDark ? 'border-[#2e2e2e] text-[#777] hover:text-white hover:border-[#444]' : 'border-[#e0e0e0] text-[#666] hover:text-[#111]'
            )}
          >
            Cancel
          </button>
          <button
            disabled={!name.trim()}
            onClick={() => name.trim() && onSave(name.trim())}
            className="flex-1 py-1.5 rounded-[8px] text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            Save filter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main FilterPanel ─────────────────────────────────────────────────────────

export interface FilterPanelProps {
  fields: FilterField[];
  rows: FilterRow[];
  savedFilters: SavedFilter[];
  onChange: (rows: FilterRow[]) => void;
  onApply: (rows: FilterRow[]) => void;
  onSave: (name: string, rows: FilterRow[]) => void;
  onLoadSaved: (f: SavedFilter) => void;
  onDeleteSaved: (id: string) => void;
  isDark: boolean;
  onClose: () => void;
}

export function FilterPanel({
  fields, rows, savedFilters,
  onChange, onApply, onSave, onLoadSaved, onDeleteSaved,
  isDark, onClose,
}: FilterPanelProps) {
  const [localRows, setLocalRows] = useState<FilterRow[]>(rows.length > 0 ? rows : [makeFilterRow()]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync from outside when opened
  useEffect(() => {
    setLocalRows(rows.length > 0 ? rows : [makeFilterRow()]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showSaveDialog) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, showSaveDialog]);

  const updateRow = useCallback((id: string, patch: Partial<FilterRow>) => {
    setLocalRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      // Reset value when field changes
      if (patch.field && patch.field !== r.field) updated.value = null;
      return updated;
    }));
  }, []);

  const removeRow = useCallback((id: string) => {
    setLocalRows(prev => {
      const next = prev.filter(r => r.id !== id);
      return next.length === 0 ? [makeFilterRow()] : next;
    });
  }, []);

  const addRow = useCallback(() => {
    setLocalRows(prev => [...prev, makeFilterRow()]);
  }, []);

  const handleApply = () => {
    onChange(localRows);
    onApply(localRows);
    onClose();
  };

  const handleClear = () => {
    const fresh = [makeFilterRow()];
    setLocalRows(fresh);
    onChange([]);
    onApply([]);
    onClose();
  };

  const handleSave = (name: string) => {
    onSave(name, localRows);
    setShowSaveDialog(false);
    // Also apply
    onChange(localRows);
    onApply(localRows);
    onClose();
  };

  const getValueInput = (row: FilterRow) => {
    const field = fields.find(f => f.key === row.field);
    if (!field) return (
      <div className={cn('flex-1 px-2.5 py-1.5 rounded-[6px] text-[11.5px] border', isDark ? 'border-white/10 text-[#444]' : 'border-[#e0e0e0] text-[#ccc]')}>
        —
      </div>
    );

    if (field.type === 'enum') return (
      <EnumValue
        value={Array.isArray(row.value) ? row.value : []}
        options={field.options ?? []}
        onChange={v => updateRow(row.id, { value: v })}
        isDark={isDark}
      />
    );
    if (field.type === 'date') return (
      <DateValue
        value={row.value}
        onChange={v => updateRow(row.id, { value: v })}
        isDark={isDark}
      />
    );
    if (field.type === 'number') return (
      <NumberValue
        value={row.value}
        onChange={v => updateRow(row.id, { value: v })}
        isDark={isDark}
      />
    );
    return (
      <TextValue
        value={row.value ?? ''}
        onChange={v => updateRow(row.id, { value: v })}
        isDark={isDark}
      />
    );
  };

  const hasActiveFilter = localRows.some(r => r.field && r.value != null && r.value !== '' && !(Array.isArray(r.value) && r.value.length === 0));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-sm transition-all animate-in fade-in duration-200" onClick={onClose}>
      <div
        ref={panelRef}
        onClick={e => e.stopPropagation()}
        className={cn(
          'w-[420px] rounded-[14px] border shadow-2xl flex flex-col animate-in zoom-in-95 duration-200',
          isDark ? 'bg-[#191919] border-[#2a2a2a]' : 'bg-white border-[#e0e0e0]'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isDark ? 'border-[#252525]' : 'border-[#efefef]'
        )}>
          <span className={cn('text-[12.5px] font-semibold', isDark ? 'text-white' : 'text-[#111]')}>
            Filter options
          </span>
          <button onClick={onClose} className={cn('p-1 rounded-lg transition-colors', isDark ? 'text-[#555] hover:bg-white/5 hover:text-white' : 'text-[#aaa] hover:bg-[#f5f5f5] hover:text-[#333]')}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-0 p-3 pb-4">
          {/* Add filter button */}
          <button
            onClick={addRow}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-[8px] text-[11.5px] font-medium border border-dashed w-full transition-all mb-2',
              isDark
                ? 'border-[#333] text-[#666] hover:border-[#444] hover:text-[#999] hover:bg-white/[0.02]'
                : 'border-[#ddd] text-[#aaa] hover:border-[#bbb] hover:text-[#666] hover:bg-[#fafafa]'
            )}
          >
            <Plus size={13} strokeWidth={2} />
            Add filter option
          </button>

          {/* Filter rows */}
          <div className="flex flex-col gap-0">
            {localRows.map((row, i) => (
              <div key={row.id}>
                {/* AND divider between rows */}
                {i > 0 && (
                  <div className="flex items-center gap-2 my-1.5 px-1">
                    <span className={cn('text-[10px] font-semibold uppercase tracking-wider shrink-0', isDark ? 'text-[#444]' : 'text-[#ccc]')}>
                      AND
                    </span>
                    <div className={cn('h-px flex-1', isDark ? 'bg-[#252525]' : 'bg-[#ebebeb]')} />
                  </div>
                )}

                {/* Filter row */}
                <div className="flex items-center gap-1.5">
                  <FieldSelect
                    value={row.field}
                    fields={fields}
                    onChange={field => updateRow(row.id, { field })}
                    isDark={isDark}
                  />
                  <OperatorToggle
                    value={row.operator}
                    onChange={op => updateRow(row.id, { operator: op })}
                    isDark={isDark}
                  />
                  {getValueInput(row)}

                  {/* Remove row */}
                  <button
                    onClick={() => removeRow(row.id)}
                    className={cn(
                      'p-1.5 rounded-[6px] transition-colors shrink-0',
                      isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#ccc] hover:text-[#555] hover:bg-[#f0f0f0]'
                    )}
                  >
                    <Minus size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={cn(
          'flex items-center justify-between px-3 py-2.5 border-t gap-2',
          isDark ? 'border-[#252525]' : 'border-[#efefef]'
        )}>
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasActiveFilter}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11.5px] font-medium border transition-colors disabled:opacity-30',
              isDark
                ? 'border-[#2e2e2e] text-[#777] hover:text-white hover:border-[#444]'
                : 'border-[#e0e0e0] text-[#666] hover:text-[#111] hover:border-[#c0c0c0]'
            )}
          >
            <Save size={12} />
            Save filter
          </button>

          <div className="flex items-center gap-1.5">
            {rows.length > 0 && (
              <button
                onClick={handleClear}
                className={cn(
                  'px-3 py-1.5 rounded-[8px] text-[11.5px] font-medium transition-colors',
                  isDark ? 'text-[#666] hover:text-white' : 'text-[#aaa] hover:text-[#444]'
                )}
              >
                Clear
              </button>
            )}
            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded-[8px] text-[11.5px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              Apply filter
            </button>
          </div>
        </div>
      </div>

      {showSaveDialog && (
        <SaveDialog
          isDark={isDark}
          onSave={handleSave}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}

// ─── FilterButton — toolbar trigger with active indicator ─────────────────────

export function FilterButton({
  activeCount,
  onClick,
  isDark,
}: {
  activeCount: number;
  onClick: () => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors shrink-0",
        activeCount > 0
          ? isDark ? "bg-white/10 text-white" : "bg-[#ebebf5] text-[#111]"
          : isDark ? "text-[#777] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]"
      )}
    >
      <SlidersHorizontal size={11} className="opacity-60" />
      Filter
      {activeCount > 0 && (
        <span className={cn(
          'ml-0.5 min-w-[15px] h-[15px] px-1 rounded-[4px] text-[9.5px] font-semibold flex items-center justify-center',
          isDark ? 'bg-white/10 text-white' : 'bg-black/[0.06] text-[#222]'
        )}>
          {activeCount}
        </span>
      )}
    </button>
  );
}

// ─── SavedFilterPills — toolbar row ──────────────────────────────────────────

import { Trash2 } from 'lucide-react';

export function SavedFilterPills({
  saved,
  activeId,
  onLoad,
  onDelete,
  onClear,
  isDark,
}: {
  saved: SavedFilter[];
  activeId: string | null;
  onLoad: (f: SavedFilter) => void;
  onDelete: (id: string) => void;
  onClear?: () => void;
  isDark: boolean;
}) {
  if (saved.length === 0) return null;
  return (
    <div className="flex flex-col py-1">
      {saved.map(f => (
        <div
          key={f.id}
          className={cn(
            'flex items-center justify-between px-3.5 py-2 text-[11.5px] transition-colors group',
            activeId === f.id
              ? isDark ? 'bg-white/5 text-white' : 'bg-black/[0.03] text-[#111]'
              : isDark ? 'text-[#aaa] hover:bg-white/5' : 'text-[#555] hover:bg-black/[0.03]'
          )}
        >
          <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => onLoad(f)}>
            <BookmarkCheck size={11} className={cn("opacity-40", activeId === f.id ? "text-primary opacity-100" : "")} />
            <span className={cn("font-medium", activeId === f.id ? "font-semibold" : "")}>{f.name}</span>
          </div>
          
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {activeId === f.id && onClear && (
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  isDark ? 'hover:bg-white/10 text-[#888] hover:text-white' : 'hover:bg-black/5 text-[#888] hover:text-[#111]'
                )}
                title="Clear filter"
              >
                <X size={10} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(f.id); }}
              className={cn(
                'p-1.5 rounded-md transition-all',
                isDark ? 'hover:bg-white/10 text-[#888] hover:text-red-400' : 'hover:bg-black/5 text-[#888] hover:text-red-500'
              )}
              title="Delete saved filter"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
