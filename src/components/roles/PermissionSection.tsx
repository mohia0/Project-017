"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { PERMISSION_KEY_LABELS } from '@/types/roles';
import { SettingsToggle } from '@/components/settings/SettingsField';

interface PermissionSectionProps {
  sectionKey: string;
  label: string;
  icon: React.ReactNode;
  permissionKeys: string[];
  permissions: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
  disabled?: boolean;
}

export function PermissionSection({
  sectionKey,
  label,
  icon,
  permissionKeys,
  permissions,
  onChange,
  disabled,
}: PermissionSectionProps) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(true);

  const allEnabled = permissionKeys.every(k => permissions[k] === true);
  const someEnabled = permissionKeys.some(k => permissions[k] === true);

  const handleMasterToggle = (checked: boolean) => {
    permissionKeys.forEach(k => onChange(k, checked));
  };

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      isDark ? "border-[#252525] bg-[#141414]" : "border-[#ebebeb] bg-[#fafafa]"
    )}>
      {/* Section header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 cursor-pointer transition-colors select-none",
          isDark ? "hover:bg-white/[0.02]" : "hover:bg-black/[0.02]"
        )}
        onClick={() => setIsOpen(o => !o)}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isDark ? "bg-white/8" : "bg-black/5")}>
            {icon}
          </div>
          <span className="text-sm font-semibold">{label}</span>
          {!allEnabled && someEnabled && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-600"
            )}>
              Partial
            </span>
          )}
        </div>
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <SettingsToggle
            checked={allEnabled}
            onChange={handleMasterToggle}
            disabled={disabled}
          />
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200",
            isOpen ? "rotate-180" : ""
          )}>
            <ChevronDown size={14} className="opacity-40" />
          </div>
        </div>
      </div>

      {/* Permission rows */}
      {isOpen && (
        <div className={cn(
          "border-t divide-y",
          isDark ? "border-[#252525] divide-[#252525]" : "border-[#ebebeb] divide-[#ebebeb]"
        )}>
          {permissionKeys.map(key => (
            <PermissionRow
              key={key}
              label={PERMISSION_KEY_LABELS[key] ?? key}
              checked={permissions[key] === true}
              onChange={val => onChange(key, val)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PermissionRowProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function PermissionRow({ label, checked, onChange, disabled }: PermissionRowProps) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2.5",
      isDark ? "bg-[#0d0d0d]" : "bg-white"
    )}>
      <span className={cn("text-sm", isDark ? "text-white/70" : "text-black/70")}>{label}</span>
      <SettingsToggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
