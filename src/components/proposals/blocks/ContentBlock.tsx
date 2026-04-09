"use client";

import React, { useCallback } from 'react';
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import { useUIStore } from '@/store/useUIStore';

export interface ContentBlockProps {
    id: string;
    data: any;
    updateData: (id: string, patch: any) => void;
    backgroundColor?: string;
}

export function ContentBlock({ id, data, updateData, backgroundColor }: ContentBlockProps) {
    // Determine if the background is dark to switch editor theme (for readable text)
    // Common dark colors in our palette: #1a1f2e (Slate), #1e1e1e (Charcoal), #111827 (Ink)
    const isDarkBg = backgroundColor && (
        backgroundColor === '#1a1f2e' || 
        backgroundColor === '#1e1e1e' || 
        backgroundColor === '#111827' ||
        backgroundColor.startsWith('var') // Document dark themes usually define this
    );

    // Prefer saved BlockNote blocks; fall back to a blank paragraph if no content at all
    const editor = useCreateBlockNote({
        initialContent: data.blocks?.length
            ? data.blocks
            : [{ type: "paragraph", content: "" }],
    });

    // On every editor change, persist both the block structure (lossless) and HTML (for preview)
    const onChange = useCallback(async () => {
        const editorBlocks = editor.document;
        const html = await editor.blocksToHTMLLossy(editorBlocks);
        updateData(id, { blocks: editorBlocks, content: html });
    }, [editor, id, updateData]);

    return (
        <div className="w-full max-w-full relative blocknote-editor">
            <BlockNoteView 
                editor={editor} 
                theme={isDarkBg ? "dark" : "light"}
                onChange={onChange}
                className="min-h-[50px]"
            />

            <style jsx global>{`
                .blocknote-editor .bn-container,
                .blocknote-editor .bn-editor {
                    background: transparent !important;
                    padding: 0 !important;
                }
                .blocknote-editor .bn-editor {
                    min-height: 50px;
                }
                .bn-block-content[data-is-empty-and-focused] .bn-inline-content:before {
                    color: #ccc;
                    opacity: 0.5;
                }
            `}</style>
        </div>
    );
}
