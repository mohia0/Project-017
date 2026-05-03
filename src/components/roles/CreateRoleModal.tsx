"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useRolesStore } from '@/store/useRolesStore';
import { WorkspaceRole } from '@/types/roles';
import { SettingsInput, SettingsSelect } from '@/components/settings/SettingsField';
import { appToast } from '@/lib/toast';

interface CreateRoleModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onCreated?: (role: WorkspaceRole) => void;
}

export function CreateRoleModal({ open, onClose, workspaceId, onCreated }: CreateRoleModalProps) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const { roles, createRole } = useRolesStore();
  const [mounted, setMounted] = React.useState(false);
  const [name, setName] = useState('');
  const [copyFromId, setCopyFromId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => {
    if (!open) { setName(''); setCopyFromId(''); }
  }, [open]);

  if (!open || !mounted) return null;

  const copyOptions = [
    { label: 'No base permissions', value: '' },
    ...roles.map(r => ({ label: r.name, value: r.id }))
  ];

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) { appToast.error('Role name is required'); return; }

    setIsCreating(true);
    const baseRole = copyFromId ? roles.find(r => r.id === copyFromId) : null;
    const perms = baseRole ? { ...baseRole.permissions } : {};
    const created = await createRole(workspaceId, trimmed, perms);
    setIsCreating(false);

    if (created) {
      appToast.success('Role created');
      onCreated?.(created);
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn(
        "w-full max-w-[440px] rounded-2xl shadow-2xl overflow-hidden border animate-in fade-in zoom-in-95 duration-200",
        isDark ? "bg-[#1a1a1a] border-[#2e2e2e] text-[#eee]" : "bg-white border-[#f0f0f0] text-[#111]"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <h3 className="text-[17px] font-semibold tracking-tight">New Role</h3>
            <p className={cn("text-[13px] mt-0.5", isDark ? "text-white/40" : "text-black/40")}>
              Create a custom role and configure its permissions.
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-black/5 text-black/40"
            )}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-4 flex flex-col gap-4">
          <div>
            <label className={cn("block text-sm font-semibold mb-1.5", isDark ? "text-white" : "text-black")}>
              Role Name
            </label>
            <SettingsInput
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Designer, Accountant…"
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              autoFocus
            />
          </div>
          <div>
            <label className={cn("block text-sm font-semibold mb-1.5", isDark ? "text-white" : "text-black")}>
              Copy Permissions From
            </label>
            <SettingsSelect
              isDark={isDark}
              value={copyFromId}
              onChange={setCopyFromId}
              options={copyOptions}
            />
            {copyFromId && (
              <p className={cn("text-xs mt-1.5 flex items-center gap-1", isDark ? "text-white/40" : "text-black/40")}>
                <Copy size={11} /> Permissions will be copied from "{roles.find(r => r.id === copyFromId)?.name}"
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={cn(
          "flex items-center justify-end gap-3 px-6 py-4 border-t",
          isDark ? "bg-[#141414] border-[#252525]" : "bg-[#fafafa] border-[#ebebeb]"
        )}>
          <button
            onClick={onClose}
            className={cn(
              "px-4 py-2 text-[13px] font-medium rounded-lg transition-colors",
              isDark ? "hover:bg-white/5 text-[#888]" : "hover:bg-black/5 text-[#666]"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className={cn(
              "px-5 py-2 text-[13px] font-semibold rounded-lg transition-all shadow-sm",
              name.trim() && !isCreating
                ? "bg-primary text-[var(--brand-primary-foreground)] hover:opacity-90"
                : (isDark ? "bg-white/10 text-white/30 cursor-not-allowed" : "bg-black/5 text-black/30 cursor-not-allowed")
            )}
          >
            {isCreating ? 'Creating…' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
