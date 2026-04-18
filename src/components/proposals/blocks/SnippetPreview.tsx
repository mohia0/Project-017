"use client";

import React, { useMemo } from 'react';
import { BlockNoteView, lightDefaultTheme, darkDefaultTheme } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs, withPageBreak } from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import "@blocknote/mantine/style.css";

// Same schema as ContentBlock for compatibility
const schema = withPageBreak(
    withMultiColumn(
        BlockNoteSchema.create({
            blockSpecs: {
                ...defaultBlockSpecs,
            },
        })
    )
);

interface SnippetPreviewProps {
    blocks: any[];
    isDark?: boolean;
    className?: string;
}

export function SnippetPreview({ blocks, isDark, className }: SnippetPreviewProps) {
    // Sanitize blocks
    const safeBlocks = useMemo(() => {
        if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
            return [{ type: 'paragraph', content: '' }];
        }
        return blocks;
    }, [blocks]);

    const editor = useCreateBlockNote({
        schema,
        initialContent: safeBlocks,
    });

    const baseTheme = isDark ? darkDefaultTheme : lightDefaultTheme;
    const customTheme = {
        ...baseTheme,
        colors: {
            ...baseTheme.colors,
            editor: {
                ...baseTheme.colors.editor,
                text: isDark ? "#ffffff" : "#000000",
                background: "transparent",
            },
        },
    };

    return (
        <div className={className} style={{ pointerEvents: 'none' }}>
            <style jsx global>{`
                .snippet-preview-minimal .bn-editor {
                    padding-inline: 0 !important;
                    padding-block: 0 !important;
                }
                .snippet-preview-minimal .bn-container {
                    padding: 0 !important;
                }
            `}</style>
            <div className="snippet-preview-minimal">
                <BlockNoteView 
                    editor={editor} 
                    theme={customTheme}
                    editable={false}
                    slashMenu={false}
                    formattingToolbar={false}
                    sideMenu={false}
                />
            </div>
        </div>
    );
}
