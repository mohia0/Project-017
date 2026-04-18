"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { BlockNoteView, lightDefaultTheme, darkDefaultTheme } from "@blocknote/mantine";
import { 
    useCreateBlockNote, 
    SuggestionMenuController, 
    getDefaultReactSlashMenuItems,
    FormattingToolbarController,
    FormattingToolbar,
    BlockTypeSelect,
    BasicTextStyleButton,
    TextAlignButton,
    ColorStyleButton,
    NestBlockButton,
    UnnestBlockButton,
    CreateLinkButton 
} from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems, combineByGroup, withPageBreak } from "@blocknote/core";
import * as locales from "@blocknote/core/locales";
import { 
    withMultiColumn, 
    multiColumnDropCursor, 
    locales as multiColumnLocales,
    getMultiColumnSlashMenuItems
} from "@blocknote/xl-multi-column";
import { getPageBreakReactSlashMenuItems } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import { Zap } from 'lucide-react';
import { useSnippetStore } from '@/store/useSnippetStore';
import { SaveSnippetModal } from '@/components/modals/SaveSnippetModal';
import { appToast } from '@/lib/toast';
import { Tooltip } from '@/components/ui/Tooltip';

export interface ContentBlockProps {
    id: string;
    data: any;
    updateData: (id: string, patch: any) => void;
    backgroundColor?: string;
    readOnly?: boolean;
}

// Create a schema that includes multi-column and page break support
const schema = withPageBreak(
    withMultiColumn(
        BlockNoteSchema.create({
            blockSpecs: {
                ...defaultBlockSpecs,
            },
        })
    )
);

// Block types that exist in our current schema — used to filter out
// stale / incompatible blocks from older saved data.
const VALID_BLOCK_TYPES = new Set([
    'paragraph', 'heading', 'bulletListItem', 'numberedListItem',
    'checkListItem', 'table', 'image', 'video', 'audio', 'file',
    'quote', 'codeBlock', 'column', 'columnList', 'pageBreak',
]);

function sanitizeBlocks(blocks: any[]): any[] | undefined {
    try {
        const filtered = blocks.filter(
            (b) => b && typeof b === 'object' && typeof b.type === 'string' && VALID_BLOCK_TYPES.has(b.type)
        );
        return filtered.length > 0 ? filtered : undefined;
    } catch {
        return undefined;
    }
}

/** Extract plain text from BlockNote blocks for preview */
function extractPlainText(blocks: any[]): string {
    if (!blocks?.length) return '';
    const parts: string[] = [];
    for (const block of blocks) {
        if (block.content) {
            if (Array.isArray(block.content)) {
                for (const c of block.content) {
                    if (c.type === 'text') parts.push(c.text);
                }
            }
        }
        if (block.children?.length) {
            parts.push(extractPlainText(block.children));
        }
    }
    return parts.join(' ').trim();
}

export function ContentBlock({ id, data, updateData, backgroundColor, readOnly }: ContentBlockProps) {
    const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
    const [blocksToSave, setBlocksToSave] = useState<any[]>([]);
    const { addSnippet } = useSnippetStore();

    // Determine if the background is dark to switch editor theme
    const isDarkBg = backgroundColor ? (
        backgroundColor.includes('dark') || 
        ['#1a1f2e', '#1e1e1e', '#111827', '#161616', '#0d0d0d', '#080808'].includes(backgroundColor) ||
        (backgroundColor.startsWith('#') && parseInt(backgroundColor.replace('#', ''), 16) < 0x888888)
    ) : false;

    // Sanitize saved blocks before passing as initialContent.
    const safeInitialContent: any = React.useMemo(() => {
        if (!data.blocks?.length) return [{ type: 'paragraph', content: '' }];
        const sanitized = sanitizeBlocks(data.blocks);
        return sanitized ?? [{ type: 'paragraph', content: '' }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — initialContent is only read once by BlockNote

    // Initialize BlockNote editor with multi-column support
    const editor = useCreateBlockNote({
        schema,
        initialContent: safeInitialContent,
        dropCursor: multiColumnDropCursor,
        dictionary: {
            ...locales.en,
            multi_column: multiColumnLocales.en,
        },
    });

    // Custom slash menu items including columns and snippets
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

            // Add page break items
            const pageBreakItems = getPageBreakReactSlashMenuItems(editor).map(item => ({
                ...item,
                group: "Basic Blocks"
            }));

            // Add custom snippets from the store
            const storeSnippets = useSnippetStore.getState().snippets || [];
            const snippetItems = storeSnippets.map(snippet => ({
                title: snippet.name,
                subtext: snippet.content_text
                    ? snippet.content_text.slice(0, 60) + (snippet.content_text.length > 60 ? '...' : '')
                    : '',
                icon: React.createElement(Zap, { size: 14 }),
                group: 'Snippets',
                onItemClick: () => {
                    const cursorBlock = editor.getTextCursorPosition().block;
                    try {
                        editor.insertBlocks(
                            snippet.content_blocks,
                            cursorBlock,
                            'after'
                        );
                    } catch (e) {
                        console.warn('[ContentBlock] snippet insert failed:', e);
                    }
                }
            }));


            // Combine with strict ordering: Headings -> Grids -> Basic -> List -> Media -> Others -> Snippets
            const orderedItems = combineByGroup(
                headingItems,
                gridItems,
                basicItems,
                listItems,
                mediaItems,
                pageBreakItems,
                otherItems,
                snippetItems
            );

            return filterSuggestionItems(orderedItems, query);
        };
    }, [editor]);

    // :: snippet suggestion menu items
    const getSnippetMenuItems = useCallback(async (query: string) => {
        const snippets = useSnippetStore.getState().snippets;
        return snippets
            .filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
            .map(snippet => ({
                title: snippet.name,
                subtext: snippet.content_text
                    ? snippet.content_text.slice(0, 60) + (snippet.content_text.length > 60 ? '...' : '')
                    : '',
                icon: React.createElement(Zap, { size: 14 }),
                onItemClick: () => {
                    const cursorBlock = editor.getTextCursorPosition().block;
                    try {
                        editor.insertBlocks(
                            snippet.content_blocks,
                            cursorBlock,
                            'after'
                        );
                    } catch (e) {
                        console.warn('[ContentBlock] snippet insert failed:', e);
                    }
                },
                group: 'Snippets',
            }));
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

    const handleSaveSnippet = async (name: string, tags: string[]) => {
        const text = extractPlainText(blocksToSave);
        const ok = await addSnippet({
            name,
            content_blocks: blocksToSave,
            content_text: text,
            tags,
        });
        if (ok) {
            setBlocksToSave([]);
            appToast.success('Snippet saved', `"${name}" is ready to insert with ::`);
        } else {
            appToast.error('Save failed', 'Could not save snippet');
        }
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
                formattingToolbar={false}
            >
                {/* Slash / menu */}
                <SuggestionMenuController
                    triggerCharacter={"/"}
                    getItems={getSlashMenuItems}
                />
                {/* ::: snippet trigger */}
                <SuggestionMenuController
                    triggerCharacter={":::"}
                    getItems={getSnippetMenuItems}
                />

                {/* Custom Formatting Toolbar */}
                <FormattingToolbarController
                    formattingToolbar={() => (
                        <FormattingToolbar>
                            {/* Snippet custom button moved to left */}
                            <Tooltip content="Save as Snippet" side="top">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const selected = editor.getSelection();
                                        if (selected) {
                                            setBlocksToSave(selected.blocks);
                                            setIsSnippetModalOpen(true);
                                        } else {
                                            appToast.error("Selection Required", "Please select text to save as a snippet");
                                        }
                                    }}
                                    className="w-[30px] h-[30px] flex items-center justify-center bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-md transition-all active:scale-90"
                                >
                                    <Zap size={14} fill="currentColor" />
                                </button>
                            </Tooltip>

                            <BlockTypeSelect key={"blockTypeSelect"} />

                            <BasicTextStyleButton basicTextStyle={"bold"} key={"boldStyleButton"} />
                            <BasicTextStyleButton basicTextStyle={"italic"} key={"italicStyleButton"} />
                            <BasicTextStyleButton basicTextStyle={"underline"} key={"underlineStyleButton"} />
                            <BasicTextStyleButton basicTextStyle={"strike"} key={"strikeStyleButton"} />

                            <TextAlignButton textAlignment={"left"} key={"textAlignLeftButton"} />
                            <TextAlignButton textAlignment={"center"} key={"textAlignCenterButton"} />
                            <TextAlignButton textAlignment={"right"} key={"textAlignRightButton"} />
                            <ColorStyleButton key={"colorStyleButton"} />
                            <NestBlockButton key={"nestBlockButton"} />
                            <UnnestBlockButton key={"unnestBlockButton"} />
                            <CreateLinkButton key={"createLinkButton"} />
                        </FormattingToolbar>
                    )}
                />
            </BlockNoteView>

            <SaveSnippetModal
                open={isSnippetModalOpen}
                onClose={() => {
                    setIsSnippetModalOpen(false);
                    setBlocksToSave([]);
                }}
                contentPreview={blocksToSave}
                onSave={handleSaveSnippet}
            />
        </div>
    );
}
