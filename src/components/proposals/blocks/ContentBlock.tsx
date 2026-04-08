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
}

export function ContentBlock({ id, data, updateData }: ContentBlockProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

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
                theme={isDark ? "dark" : "light"}
                onChange={onChange}
                className="min-h-[50px]"
            />

            <style jsx global>{`
                .blocknote-editor .bn-container {
                    background: transparent !important;
                    padding: 0 !important;
                }
                .blocknote-editor .bn-editor {
                    padding-inline: 0 !important;
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
