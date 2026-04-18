import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, PenLine, Upload, Type, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentDesign } from '@/types/design';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface AcceptSignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: (signatureData: any) => void;
    documentType?: 'proposal' | 'invoice' | 'document';
    design?: Partial<DocumentDesign>;
}

export function AcceptSignModal({ 
    isOpen, 
    onClose, 
    onAccept,
    documentType = 'proposal',
    design = {}
}: AcceptSignModalProps) {
    const isDark = design.actionTheme ? design.actionTheme === 'dark' : false;

    const [activeTab, setActiveTab] = useState<'type' | 'draw' | 'upload'>('type');
    const [fullName, setFullName] = useState('');
    const [signatureImage, setSignatureImage] = useState<string | null>(null);

    // Drawing refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // Upload ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ink colour: white on dark backgrounds, black on light
    const inkColor = isDark ? '#ffffff' : '#000000';

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setSignatureImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Setup canvas when draw tab is active
    useEffect(() => {
        if (activeTab === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.strokeStyle = inkColor;
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                }
            }
        }
    }, [activeTab, isDark, isOpen, inkColor]);

    const getCoord = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: any) => {
        isDrawing.current = true;
        const pos = getCoord(e);
        lastPos.current = pos;
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    };

    const draw = (e: any) => {
        if (!isDrawing.current) return;
        if (e.cancelable) e.preventDefault();
        const pos = getCoord(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastPos.current = pos;
        }
    };

    const stopDrawing = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        if (canvasRef.current) {
            setSignatureImage(canvasRef.current.toDataURL());
        }
    };

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Re-apply stroke settings after clear
            ctx.strokeStyle = inkColor;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            setSignatureImage(null);
        }
    }, [inkColor]);

    const isReady =
        (activeTab === 'type' && fullName.trim().length > 0) ||
        (activeTab === 'draw' && !!signatureImage) ||
        (activeTab === 'upload' && !!signatureImage);

    const handleAccept = () => {
        if (!isReady) return;
        onAccept({
            type: activeTab,
            name: fullName,
            image: signatureImage,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div
                className={cn(
                    "relative w-full max-w-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                    isDark ? "bg-[#1c1c1e] text-white" : "bg-white text-[#111]"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <h2 className="text-lg font-bold">Accept &amp; Sign</h2>
                    <button
                        onClick={onClose}
                        className={cn(
                            "p-1.5 rounded-full transition-colors",
                            isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                        )}
                    >
                        <X size={18} opacity={0.6} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 pb-6 space-y-4">
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Full name"
                        className={cn(
                            "w-full px-4 py-3 rounded-xl border outline-none font-medium transition-colors text-[14px]",
                            isDark
                                ? "bg-[#111] border-[#333] focus:border-[#555] text-white placeholder-white/30"
                                : "bg-[#fdfdfd] border-[#e2e2e2] focus:border-[#ccc] text-black placeholder-black/30"
                        )}
                    />

                    {/* Signature Tabs Container */}
                    <div className={cn(
                        "rounded-xl border flex flex-col overflow-hidden",
                        isDark ? "border-[#333] bg-[#222]" : "border-[#e2e2e2] bg-[#f9f9f9]"
                    )}>
                        {/* Tab Headers */}
                        <div className={cn(
                            "flex items-center border-b",
                            isDark ? "border-[#333]" : "border-[#e2e2e2]"
                        )}>
                            {[
                                { id: 'type', label: 'Type', icon: Type },
                                { id: 'draw', label: 'Draw', icon: PenLine },
                                { id: 'upload', label: 'Upload', icon: Upload },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as any);
                                        setSignatureImage(null);
                                    }}
                                    className={cn(
                                        "flex-1 flex justify-center items-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors border-r last:border-r-0 relative",
                                        isDark ? "border-[#333]" : "border-[#e2e2e2]",
                                        activeTab === tab.id
                                            ? isDark ? "bg-[#333] text-white" : "bg-white text-black"
                                            : isDark ? "text-white/50 hover:bg-[#2c2c2e]" : "text-black/50 hover:bg-[#f1f1f1]"
                                    )}
                                >
                                    <tab.icon size={12} />
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-current" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Signature Working Area */}
                        <div
                            className={cn(
                                "h-[120px] flex items-center justify-center m-3 rounded-lg border border-dashed",
                                isDark ? "border-[#444] bg-[#1a1a1a]" : "border-[#d2d2d2] bg-white"
                            )}
                            style={{ 
                                backgroundSize: '12px 12px',
                                backgroundImage: `radial-gradient(${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5e5'} 1px, transparent 1px)`
                            }}
                        >
                            {activeTab === 'type' && (
                                <div className="text-center px-4 w-full">
                                    {fullName ? (
                                        <div
                                            className="text-5xl opacity-80 leading-tight py-2"
                                            style={{
                                                fontFamily: 'var(--font-mr-dafoe), cursive',
                                                color: isDark ? '#ffffff' : '#000000',
                                            }}
                                        >
                                            {fullName}
                                        </div>
                                    ) : (
                                        <span className={cn("text-[13px] font-medium flex items-center justify-center gap-2", isDark ? "text-[#666]" : "text-[#999]")}>
                                            ↑ Please type your name in the field above ↑
                                        </span>
                                    )}
                                </div>
                            )}

                            {activeTab === 'draw' && (
                                <div className="relative w-full h-full cursor-crosshair">
                                    <canvas
                                        ref={canvasRef}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                        className="w-full h-full touch-none"
                                    />
                                    {!signatureImage && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 transition-opacity">
                                            <span className={cn("text-[12px] font-medium tracking-wide uppercase", isDark ? "text-white" : "text-black")}>
                                                Use mouse or finger to sign
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'upload' && (
                                <div className="flex flex-col items-center justify-center w-full h-full relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    {signatureImage ? (
                                        <div className="relative w-full h-full flex items-center justify-center group overflow-hidden p-2">
                                            <img src={signatureImage} className="max-h-full w-auto object-contain z-10" alt="Uploaded signature" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSignatureImage(null); }}
                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20"
                                            >
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 text-white backdrop-blur-sm">
                                                    <RotateCcw size={14} />
                                                    <span className="text-[12px] font-semibold">Change image</span>
                                                </div>
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className={cn(
                                                "flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-black/5 transition-colors",
                                                isDark ? "hover:bg-white/5" : ""
                                            )}
                                        >
                                            <Upload size={18} className={cn("mb-2 opacity-50", isDark ? "text-white" : "text-black")} />
                                            <span className={cn("text-[13px] font-medium", isDark ? "text-[#ccc]" : "text-[#666]")}>
                                                Click to browse image
                                            </span>
                                            <span className={cn("text-[11px] mt-1 opacity-50", isDark ? "text-white" : "text-black")}>
                                                JPEG, PNG, SVG
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Reset button — only visible in Draw tab */}
                        {activeTab === 'draw' && (
                            <div className={cn(
                                "flex items-center justify-end px-3 pb-3",
                            )}>
                                <button
                                    onClick={clearCanvas}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                                        isDark
                                            ? "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                                            : "bg-black/5 text-black/50 hover:bg-black/10 hover:text-black"
                                    )}
                                >
                                    <RotateCcw size={11} />
                                    Reset
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={cn(
                    "flex justify-end gap-3 px-5 py-4 border-t bg-opacity-50",
                    isDark ? "border-[#333] bg-[#1a1a1c]" : "border-[#ebebf5] bg-[#fafafa]"
                )}>
                    <button
                        onClick={onClose}
                        className={cn(
                            "px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-colors",
                            isDark ? "text-white/70 hover:bg-white/10" : "text-black/70 hover:bg-black/5"
                        )}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={!isReady}
                        className={cn(
                            "px-6 py-2 rounded-[8px] text-[13px] font-semibold transition-all",
                            !isReady
                                ? isDark
                                    ? "bg-[#333] text-[#555] cursor-not-allowed"
                                    : "bg-[#e5e5e5] text-[#999] cursor-not-allowed"
                                : isDark
                                    ? "bg-white text-black hover:bg-[#ddd]"
                                    : "bg-black text-white hover:bg-[#222]"
                        )}
                    >
                        Accept {documentType.charAt(0).toUpperCase() + documentType.slice(1)}
                    </button>
                </div>
            </div>
        </div>
    );
}
