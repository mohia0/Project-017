"use client";

import React, { useCallback } from 'react';
import { BlockNoteView, lightDefaultTheme, darkDefaultTheme } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import { useUIStore } from '@/store/useUIStore';

export interface ContentBlockProps {
    id: string;
    data: any;
    updateData: (id: string, patch: any) => void;
    backgroundColor?: string;
    readOnly?: boolean;
}

export function ContentBlock({ id, data, updateData, backgroundColor, readOnly }: ContentBlockProps) {
    // Determine if the background is dark to switch editor theme (for readable text)
    const isDarkBg = backgroundColor ? (
        backgroundColor.includes('dark') || 
        ['#1a1f2e', '#1e1e1e', '#111827', '#161616', '#0d0d0d', '#080808'].includes(backgroundColor) ||
        (backgroundColor.startsWith('#') && parseInt(backgroundColor.replace('#', ''), 16) < 0x888888)
    ) : false;

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

    // Define a custom theme to ensure text contrast and transparent background
    const baseTheme = isDarkBg ? darkDefaultTheme : lightDefaultTheme;
    const customTheme = {
        ...baseTheme,
        colors: {
            ...baseTheme.colors,
            editor: {
                ...baseTheme.colors.editor,
                text: isDarkBg ? "#ffffff" : "#555555",
                background: "transparent",
            },
        },
    };

    return (
        <div className="w-full max-w-full relative blocknote-editor">
            <BlockNoteView 
                editor={editor} 
                theme={customTheme}
                onChange={onChange}
                editable={!readOnly}
                className="min-h-[50px]"
            />
            <style jsx global>{`
                .bn-container {
                    background: transparent !important;
                }
                .bn-editor {
                    padding-inline: 0 !important;
                    background: transparent !important;
                }
            `}</style>
        </div>
    );
}
