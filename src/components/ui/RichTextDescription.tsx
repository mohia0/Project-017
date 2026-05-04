"use client";

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function escapeText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function sanitizeHTML(html: string): string {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    function clean(node: Node): string {
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeText(node.textContent || '').replace(/\n/g, '<br>');
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // Allowed inline — normalise strong→b, em→i, strike→s
        if (['b', 'strong', 'i', 'em', 'u', 's', 'strike'].includes(tag)) {
            const inner = Array.from(el.childNodes).map(clean).join('');
            if (!inner) return '';
            const normTag = ['b', 'strong'].includes(tag) ? 'b' 
                          : ['i', 'em'].includes(tag) ? 'i'
                          : ['s', 'strike'].includes(tag) ? 's' : 'u';
            return `<${normTag}>${inner}</${normTag}>`;
        }

        // <br> → keep
        if (tag === 'br') return '<br>';

        // Block elements → children + separator <br>
        if (['p', 'div', 'li', 'tr', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            const inner = Array.from(el.childNodes).map(clean).join('');
            return inner ? inner + '<br>' : '';
        }

        // Anything else — drop the tag, recurse into children
        return Array.from(el.childNodes).map(clean).join('');
    }

    const result = Array.from(doc.body.childNodes).map(clean).join('');
    // Strip trailing <br>
    return result.replace(/(<br>\s*)+$/, '');
}

/* ─────────────────────────────────────────────
   Floating toolbar — rendered via Portal so it
   has zero impact on the pricing table layout
───────────────────────────────────────────── */
interface ToolbarProps {
    anchor: { top: number; left: number; width: number } | null;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    isStrike: boolean;
    onBold: () => void;
    onItalic: () => void;
    onUnderline: () => void;
    onStrike: () => void;
    isDark: boolean;
}

function FloatingToolbar({ anchor, isBold, isItalic, isUnderline, isStrike, onBold, onItalic, onUnderline, onStrike, isDark }: ToolbarProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted || !anchor) return null;

    return createPortal(
        <div
            className={cn(
                "fixed z-[99999] flex items-center gap-0.5 px-1 py-0.5 rounded-[6px] border shadow-lg pointer-events-auto select-none",
                isDark
                    ? "bg-[#1f1f1f] border-[#333] shadow-black/40"
                    : "bg-white border-[#d2d2eb] shadow-black/10"
            )}
            style={{
                top: anchor.top - 38,
                left: anchor.left + anchor.width / 2,
                transform: 'translateX(-50%)',
            }}
            onMouseDown={e => e.preventDefault()}
        >
            <Tooltip content="Bold (⌘/Ctrl+B)">
                <button
                    onClick={onBold}
                    className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-[4px] text-[12px] font-bold transition-colors",
                        isBold
                            ? (isDark ? "bg-white/15 text-white" : "bg-black/10 text-black")
                            : (isDark ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-black/50 hover:bg-black/5 hover:text-black")
                    )}
                >
                    B
                </button>
            </Tooltip>
            <Tooltip content="Italic (⌘/Ctrl+I)">
                <button
                    onClick={onItalic}
                    className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-[4px] text-[12px] font-bold italic transition-colors",
                        isItalic
                            ? (isDark ? "bg-white/15 text-white" : "bg-black/10 text-black")
                            : (isDark ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-black/50 hover:bg-black/5 hover:text-black")
                    )}
                >
                    I
                </button>
            </Tooltip>
            <Tooltip content="Underline (⌘/Ctrl+U)">
                <button
                    onClick={onUnderline}
                    className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-[4px] text-[12px] font-bold underline transition-colors",
                        isUnderline
                            ? (isDark ? "bg-white/15 text-white" : "bg-black/10 text-black")
                            : (isDark ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-black/50 hover:bg-black/5 hover:text-black")
                    )}
                >
                    U
                </button>
            </Tooltip>
            <Tooltip content="Strikethrough">
                <button
                    onClick={onStrike}
                    className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-[4px] text-[12px] font-bold line-through transition-colors",
                        isStrike
                            ? (isDark ? "bg-white/15 text-white" : "bg-black/10 text-black")
                            : (isDark ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-black/50 hover:bg-black/5 hover:text-black")
                    )}
                >
                    S
                </button>
            </Tooltip>
        </div>,
        document.body
    );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
interface RichTextDescriptionProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
    isDark?: boolean;
    dir?: string;
}

export function RichTextDescription({
    value,
    onChange,
    placeholder = 'Description (optional)...',
    className,
    style,
    isDark = false,
    dir,
}: RichTextDescriptionProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    // Tracks when we set innerHTML ourselves so we don't echo it back to parent
    const isInternalUpdate = useRef(false);
    // Tracks the last value WE emitted — so we skip rewriting when parent
    // hands it back to us (prevents cursor-jump / layout-shift on every keystroke)
    const lastEmittedRef = useRef<string | null>(null);

    const [toolbar, setToolbar] = useState<{ top: number; left: number; width: number } | null>(null);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrike, setIsStrike] = useState(false);
    const [isEmpty, setIsEmpty] = useState(!value);

    /* ── Initial sync: set content once on mount ── */
    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        const sanitized = sanitizeHTML(value || '');
        isInternalUpdate.current = true;
        el.innerHTML = sanitized;
        setIsEmpty(!sanitized);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally runs only on mount

    /* ── External value changes (e.g. undo, reset) ── */
    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        // Skip if this is a value we just emitted ourselves — prevents
        // the parent→child→parent echo that causes innerHTML rewrites mid-type
        if (value === lastEmittedRef.current) return;

        const sanitized = sanitizeHTML(value || '');
        if (el.innerHTML !== sanitized) {
            isInternalUpdate.current = true;
            el.innerHTML = sanitized;
            setIsEmpty(!sanitized);
        }
    }, [value]);

    /* ── Selection tracker → show/hide toolbar ── */
    const updateSelectionState = useCallback(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
            setToolbar(null);
            return;
        }
        setIsBold(document.queryCommandState('bold'));
        setIsItalic(document.queryCommandState('italic'));
        setIsUnderline(document.queryCommandState('underline'));
        setIsStrike(document.queryCommandState('strikeThrough'));

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0) { setToolbar(null); return; }
        setToolbar({ top: rect.top, left: rect.left, width: rect.width });
    }, []);

    /* ── Input → emit to parent ── */
    const handleInput = useCallback(() => {
        if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
        const el = editorRef.current;
        if (!el) return;
        const html = el.innerHTML;
        lastEmittedRef.current = html; // record so we skip the echo
        setIsEmpty(!html || html === '<br>');
        onChange(html);
    }, [onChange]);

    /* ── Keyboard shortcuts ── */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const mod = navigator.platform.toUpperCase().includes('MAC') ? e.metaKey : e.ctrlKey;
        if (mod && e.key === 'b') { e.preventDefault(); document.execCommand('bold'); handleInput(); }
        if (mod && e.key === 'i') { e.preventDefault(); document.execCommand('italic'); handleInput(); }
        if (mod && e.key === 'u') { e.preventDefault(); document.execCommand('underline'); handleInput(); }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertLineBreak');
            handleInput();
        }
    }, [handleInput]);

    /* ── Paste: sanitize HTML, escape plain text ── */
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');
        const text = e.clipboardData.getData('text/plain');
        const sanitized = html
            ? sanitizeHTML(html)
            : escapeText(text).replace(/\n/g, '<br>');
        document.execCommand('insertHTML', false, sanitized);
        handleInput();
    }, [handleInput]);

    /* ── Global selection change listener ── */
    useEffect(() => {
        document.addEventListener('selectionchange', updateSelectionState);
        return () => document.removeEventListener('selectionchange', updateSelectionState);
    }, [updateSelectionState]);

    const handleBlur = useCallback(() => {
        setTimeout(() => setToolbar(null), 150);
    }, []);

    return (
        // Wrapper with `relative` so the placeholder can be position:absolute
        // and NEVER contribute to layout height — eliminates the shift on focus
        <div className={cn("relative", className)} style={style}>
            <FloatingToolbar
                anchor={toolbar}
                isBold={isBold}
                isItalic={isItalic}
                isUnderline={isUnderline}
                isStrike={isStrike}
                onBold={() => { document.execCommand('bold'); handleInput(); }}
                onItalic={() => { document.execCommand('italic'); handleInput(); }}
                onUnderline={() => { document.execCommand('underline'); handleInput(); }}
                onStrike={() => { document.execCommand('strikeThrough'); handleInput(); }}
                isDark={isDark}
            />

            {/* Placeholder — position:absolute so it takes zero layout space */}
            {isEmpty && (
                <span
                    aria-hidden
                    className="absolute inset-0 pointer-events-none opacity-30 leading-tight overflow-hidden"
                    style={{ fontSize: 'inherit', fontWeight: 'inherit' }}
                >
                    {placeholder}
                </span>
            )}

            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                dir={dir || 'auto'}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={handleBlur}
                className={cn(
                    "w-full bg-transparent p-0 border-none leading-tight break-words",
                    "[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_s]:line-through [&_strike]:line-through",
                )}
                style={{
                    outline: 'none',
                    boxShadow: 'none',
                    WebkitBoxShadow: 'none',
                    // min-height: 1 line so the row never collapses on empty
                    minHeight: '1.2em',
                }}
            />
        </div>
    );
}
