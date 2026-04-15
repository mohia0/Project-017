"use client";

import React, { useCallback, useMemo } from 'react';
import { BlockNoteView, lightDefaultTheme, darkDefaultTheme } from "@blocknote/mantine";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems, combineByGroup } from "@blocknote/core";
import * as locales from "@blocknote/core/locales";
import { 
    withMultiColumn, 
    multiColumnDropCursor, 
    locales as multiColumnLocales,
    getMultiColumnSlashMenuItems
} from "@blocknote/xl-multi-column";
import "@blocknote/mantine/style.css";

export interface ContentBlockProps {
    id: string;
    data: any;
    updateData: (id: string, patch: any) => void;
    backgroundColor?: string;
    readOnly?: boolean;
}

// Create a schema that includes multi-column support
const schema = withMultiColumn(
    BlockNoteSchema.create({
        blockSpecs: {
            ...defaultBlockSpecs,
        },
    })
);

export function ContentBlock({ id, data, updateData, backgroundColor, readOnly }: ContentBlockProps) {
    // Determine if the background is dark to switch editor theme
    const isDarkBg = backgroundColor ? (
        backgroundColor.includes('dark') || 
        ['#1a1f2e', '#1e1e1e', '#111827', '#161616', '#0d0d0d', '#080808'].includes(backgroundColor) ||
        (backgroundColor.startsWith('#') && parseInt(backgroundColor.replace('#', ''), 16) < 0x888888)
    ) : false;

    // Initialize BlockNote editor with multi-column support
    const editor = useCreateBlockNote({
        schema,
        initialContent: data.blocks?.length
            ? data.blocks
            : [{ type: "paragraph", content: "" }],
        dropCursor: multiColumnDropCursor,
        dictionary: {
            ...locales.en,
            multi_column: multiColumnLocales.en,
        },
    });

    // Custom slash menu items including columns
    const getSlashMenuItems = useMemo(() => {
        return async (query: string) => {
            // Get defaults and filter out Audio/File as requested
            const defaultItems = getDefaultReactSlashMenuItems(editor).filter(item => 
                item.title !== "Audio" && item.title !== "File"
            );
            
            // Setup Grid items
            const gridItems = getMultiColumnSlashMenuItems(editor).map(item => ({
                ...item,
                group: "Grids"
            }));

            // Split default items into their respective groups for custom ordering
            const headingItems = defaultItems.filter(i => i.group === "Headings");
            const basicItems = defaultItems.filter(i => i.group === "Basic Blocks");
            const listItems = defaultItems.filter(i => i.group === "List");
            const mediaItems = defaultItems.filter(i => i.group === "Media");
            const otherItems = defaultItems.filter(i => 
                i.group === undefined || !["Headings", "Basic Blocks", "List", "Media"].includes(i.group)
            );

            // Combine with strict ordering: Headings -> Grids -> Basic -> List -> Media -> Others
            const orderedItems = combineByGroup(
                headingItems,
                gridItems,
                basicItems,
                listItems,
                mediaItems,
                otherItems
            );

            return filterSuggestionItems(orderedItems, query);
        };
    }, [editor]);

    // Persist changes
    const onChange = useCallback(async () => {
        const editorBlocks = editor.document;
        const html = await editor.blocksToHTMLLossy(editorBlocks);
        updateData(id, { blocks: editorBlocks, content: html });
    }, [editor, id, updateData]);

    const baseTheme = isDarkBg ? darkDefaultTheme : lightDefaultTheme;
    const customTheme = {
        ...baseTheme,
        colors: {
            ...baseTheme.colors,
            editor: {
                ...baseTheme.colors.editor,
                text: isDarkBg ? "#ffffff" : "#000000",
                background: "transparent",
            },
            ...('colors' in baseTheme.colors ? {
                colors: {
                    ...(baseTheme.colors as any).colors,
                    brown: "#000000",
                }
            } : {})
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
                slashMenu={false}
            >
                <SuggestionMenuController
                    triggerCharacter={"/"}
                    getItems={getSlashMenuItems}
                />
            </BlockNoteView>
            <style jsx global>{`
                .bn-container {
                    background: transparent !important;
                }
                .bn-editor {
                    padding-inline: 0 !important;
                    background: transparent !important;
                }
                /* Ensure columns have some spacing and look good */
                .bn-column-list {
                    gap: 24px !important;
                }
            `}</style>
        </div>
    );
}
