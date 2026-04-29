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
    editable?: boolean;
    onChange?: (blocks: any[]) => void;
}

export function SnippetPreview({ blocks, isDark, className, editable = false, onChange }: SnippetPreviewProps) {
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
        <div className={className}>
            <style jsx global>{`
                .snippet-preview-minimal .bn-editor {
                    padding-inline: 0 !important;
                    padding-block: 0 !important;
                    min-height: auto !important;
                }
                .snippet-preview-minimal .bn-container {
                    padding: 0 !important;
                }
                .snippet-preview-minimal .bn-block-content {
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .snippet-preview-minimal h1, 
                .snippet-preview-minimal h2, 
                .snippet-preview-minimal h3 {
                    font-size: 14px !important;
                    font-weight: 700 !important;
                    margin-top: 0 !important;
                    margin-bottom: 2px !important;
                }
                .snippet-preview-minimal p {
                    font-size: 13px !important;
                    line-height: 1.5 !important;
                    margin: 0 !important;
                    opacity: 0.8;
                }
            `}</style>
            <div className="snippet-preview-minimal">
                <BlockNoteView 
                    editor={editor} 
                    theme={customTheme}
                    editable={editable}
                    slashMenu={editable}
                    formattingToolbar={editable}
                    sideMenu={editable}
                    onChange={() => {
                        if (onChange) {
                            onChange(editor.document);
                        }
                    }}
                />
            </div>
        </div>
    );
}
