import React, { useState, useRef, useEffect } from 'react';
import { X, PenLine, Upload, Type, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface AcceptSignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: (signatureData: any) => void;
    documentType?: 'proposal' | 'invoice' | 'document';
}

export function AcceptSignModal({ 
    isOpen, 
    onClose, 
    onAccept,
    documentType = 'proposal'
}: AcceptSignModalProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState<'type' | 'draw' | 'upload'>('type');
    const [fullName, setFullName] = useState('');
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    
    // Drawing refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // Handle initial canvas setup and resizing
    useEffect(() => {
        if (activeTab === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.strokeStyle = '#000000'; // Always use black for signatures to ensure visibility on paper
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                }
            }
        }
    }, [activeTab, isDark, isOpen]);

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

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setSignatureImage(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className={cn(
                "relative w-full max-w-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                isDark ? "bg-[#1c1c1e] text-white" : "bg-white text-[#111]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <h2 className="text-lg font-bold">Accept & Sign</h2>
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
                                { id: 'type', label: 'Type signature', icon: Type },
                                { id: 'draw', label: 'Draw signature', icon: PenLine },
                                { id: 'upload', label: 'Upload signature', icon: Upload },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
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
                        <div className={cn(
                            "h-[120px] flex items-center justify-center m-3 rounded-lg border border-dashed bg-white",
                            isDark ? "border-[#444]" : "border-[#d2d2d2]",
                            /* Dotted background pattern */
                            "bg-[radial-gradient(#e5e5e5_1px,transparent_1px)]"
                        )} style={{ backgroundSize: '12px 12px' }}>
                            
                            {activeTab === 'type' && (
                                <div className="text-center px-4 w-full">
                                    {fullName ? (
                                        <div className="text-4xl font-serif opacity-80 text-black" style={{ fontFamily: '"Brush Script MT", cursive, serif' }}>
                                            {fullName}
                                        </div>
                                    ) : (
                                        <span className={cn("text-[13px] font-medium flex items-center gap-2", isDark ? "text-[#666]" : "text-[#999]")}>
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
                                    <button 
                                        onClick={clearCanvas}
                                        className={cn(
                                            "absolute top-2 right-2 p-1.5 rounded-full transition-all opacity-40 hover:opacity-100",
                                            isDark ? "bg-white/10 text-white" : "bg-black/5 text-black"
                                        )}
                                        title="Clear drawing"
                                    >
                                        <RotateCcw size={12} />
                                    </button>
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
                                <span className={cn("text-[13px] font-medium", isDark ? "text-[#666]" : "text-[#999]")}>
                                    Drag and drop or browse
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer (if we need confirm button natively, but here usually signature finishes process) */}
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
                        onClick={() => {
                            if (activeTab === 'type' && !fullName) return;
                            if (activeTab === 'draw' && !signatureImage) return;
                            onAccept({ 
                                type: activeTab, 
                                name: fullName, 
                                image: signatureImage 
                            });
                            onClose();
                        }}
                        disabled={(activeTab === 'type' && !fullName) || (activeTab === 'draw' && !signatureImage)}
                        className={cn(
                            "px-6 py-2 rounded-[8px] text-[13px] font-semibold transition-all",
                            ((activeTab === 'type' && !fullName) || (activeTab === 'draw' && !signatureImage))
                                ? isDark ? "bg-[#333] text-[#555] cursor-not-allowed" : "bg-[#e5e5e5] text-[#999] cursor-not-allowed"
                                : isDark ? "bg-white text-black hover:bg-[#ddd]" : "bg-black text-white hover:bg-[#222]"
                        )}
                    >
                        Accept {documentType.charAt(0).toUpperCase() + documentType.slice(1)}
                    </button>
                </div>

            </div>
        </div>
    );
}
