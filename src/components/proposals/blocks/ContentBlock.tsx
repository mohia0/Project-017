"use client";

import React from 'react';
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import { useUIStore } from '@/store/useUIStore';

export interface ContentBlockProps {
    id: string;
    data: any;
    updateData: (id: string, data: any) => void;
}

export function ContentBlock({ id, data, updateData }: ContentBlockProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    // Initialize editor with initial content
    // BlockNote can take initialContent as partial blocks
    const editor = useCreateBlockNote({
        initialContent: data.blocks || (data.content ? undefined : [
            {
                type: "paragraph",
                content: "Start typing...",
            }
        ]),
    });

    // Handle change
    const onChange = () => {
        // We can save as blocks for full Notion fidelity, or HTML for compatibility
        // The store seems to support 'blocks: any[]' so lets use that if available,
        // otherwise fallback to HTML for 'content'
        const blocks = editor.document;
        updateData(id, { 
            ...data, 
            blocks: blocks,
            content: "" // Clear HTML if we are using blocks now
        });
    };

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
