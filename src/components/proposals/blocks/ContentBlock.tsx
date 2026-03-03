"use client";

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import { BlockProps } from './SectionBlockWrapper';

export interface ContentBlockProps {
    id: string;
    data: any;
    updateData: (id: string, data: any) => void;
}

export function ContentBlock({ id, data, updateData }: ContentBlockProps) {
    const [isFocused, setIsFocused] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Type \'/\' for commands or start typing...',
            }),
        ],
        content: data.content || '',
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            updateData(id, { ...data, content: editor.getHTML() });
        },
        onFocus: () => setIsFocused(true),
        onBlur: () => setIsFocused(false),
    });

    return (
        <div className="w-full max-w-full relative editor-content">
            <EditorContent
                editor={editor}
                className={cn(
                    "min-h-[24px] outline-none border-none prose prose-p:my-1 prose-headings:my-2 prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg focus:outline-none transition-colors rounded p-2",
                    isFocused ? "bg-black/5 dark:bg-white/5" : "bg-transparent"
                )}
            />

            <style jsx global>{`
                .editor-content .ProseMirror {
                    min-height: 24px;
                }
                .editor-content .ProseMirror:focus {
                    outline: none;
                }
                .editor-content .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #ccc;
                    pointer-events: none;
                    height: 0;
                    font-style: italic;
                }
            `}</style>
        </div>
    );
}
