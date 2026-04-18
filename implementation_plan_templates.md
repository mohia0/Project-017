# Block Templates & Snippets System

A three-part feature system built on top of the existing `templates` table and `SaveTemplateModal`. This plan is detailed enough for any engineer (or AI) to implement without ambiguity.

---

## Overview

| Feature | What it does |
|---|---|
| **Section Templates** | Save individual document blocks/sections from any editor (Proposal, Invoice) as reusable content you can insert anywhere |
| **Snippets** | Save short text phrases/paragraphs from the BlockNote `ContentBlock` to instantly re-insert via the slash `/` menu |
| **Templates Page Redesign** | Split the existing single-category template page into two tabs: **Document Templates** (current) and **Section Templates** (new) |

---

## Part 1 — Database Schema

### New table: `section_templates`

```sql
CREATE TABLE IF NOT EXISTS section_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    block_type TEXT NOT NULL,         -- e.g. 'content', 'pricing', 'signature', 'header'
    source_entity TEXT NOT NULL,      -- 'proposal' | 'invoice' — where it was saved from
    block_data JSONB NOT NULL DEFAULT '{}',  -- the raw block object (same shape as blocks[])
    background_color TEXT,            -- optional section bg colour (from SectionBlockWrapper)
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE section_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can manage section templates" ON section_templates
    FOR ALL TO authenticated
    USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
```

### New table: `snippets`

```sql
CREATE TABLE IF NOT EXISTS snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,               -- user-given name/title
    content_blocks JSONB NOT NULL,    -- BlockNote block[] JSON (the raw BlockNote document)
    content_text TEXT,                -- plain text preview (for search/display)
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can manage snippets" ON snippets
    FOR ALL TO authenticated
    USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
```

> [!IMPORTANT]
> Run these as a Supabase migration file: `supabase/migrations/20260419000000_add_section_templates_and_snippets.sql`

---

## Part 2 — Zustand Stores

### [NEW] `src/store/useSectionTemplateStore.ts`

```typescript
export interface SectionTemplate {
    id: string;
    workspace_id: string;
    name: string;
    description?: string;
    block_type: string;
    source_entity: string;
    block_data: any;
    background_color?: string;
    tags: string[];
    created_at: string;
}

// State: sectionTemplates[], isLoading, error
// Actions: fetchSectionTemplates(), addSectionTemplate(), deleteSectionTemplate(), updateSectionTemplate()
// Pattern: identical to useTemplateStore — filter by workspace_id, same error handling
```

### [NEW] `src/store/useSnippetStore.ts`

```typescript
export interface Snippet {
    id: string;
    workspace_id: string;
    name: string;
    content_blocks: any[];   // BlockNote block[] JSON
    content_text: string;    // plain text for preview
    tags: string[];
    created_at: string;
}

// State: snippets[], isLoading, error
// Actions: fetchSnippets(), addSnippet(), deleteSnippet(), updateSnippet()
```

---

## Part 3 — New UI Components

### 3A. `src/components/modals/SaveSectionTemplateModal.tsx` [NEW]

**Reuses the existing `SaveTemplateModal` visual design** (copy its structure). Changes:
- Title: **"Save Section as Template"**
- Icon: `LayoutPanelTop` (Lucide) instead of `LayoutTemplate`
- Remove the "Set as Default" checkbox (not applicable for section templates)
- Add a **Tags** input (comma-separated, pill display)
- `onSave(name, description, tags)` callback

**Visual:**
```
┌─────────────────────────────────────┐
│ ▤ Save Section as Template      [X] │
├─────────────────────────────────────┤
│ Section Name                        │
│ ┌─────────────────────────────────┐ │
│ │ e.g., Services Overview         │ │
│ └─────────────────────────────────┘ │
│ Description (Optional)              │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ Tags (comma separated)              │
│ ┌─────────────────────────────────┐ │
│ │ pricing, services...            │ │
│ └─────────────────────────────────┘ │
│              [Cancel]  [Save Block] │
└─────────────────────────────────────┘
```

### 3B. `src/components/modals/SaveSnippetModal.tsx` [NEW]

Similar structure. Changes:
- Title: **"Save as Snippet"**
- Icon: `Zap` (Lucide)
- Only asks for **name** and **tags**
- Shows a read-only content preview (first 120 chars of `content_text`)
- `onSave(name, tags)` callback

**Visual:**
```
┌─────────────────────────────────────┐
│ ⚡ Save as Snippet              [X] │
├─────────────────────────────────────┤
│ Preview                             │
│ ┌──────────────────────────────── ┐ │
│ │ "Our team has over 15 years of  │ │
│ │  experience in..."              │ │
│ └─────────────────────────────────┘ │
│ Snippet Name                        │
│ ┌─────────────────────────────────┐ │
│ │ e.g., About Us paragraph        │ │
│ └─────────────────────────────────┘ │
│ Tags                                │
│ ┌─────────────────────────────────┐ │
│ │ intro, about...                 │ │
│ └─────────────────────────────────┘ │
│              [Cancel] [Save Snippet]│
└─────────────────────────────────────┘
```

### 3C. Section Template Browser Drawer [NEW]  
**`src/components/templates/SectionTemplateBrowser.tsx`**

A slide-in right panel (like the right panel drawer pattern already used in the app). Triggered from the block insertion menu in the editor.

```
┌──── Section Templates ────────────┐
│ [Search sections...            🔍]│
│                                   │
│ [All] [content] [pricing] [sign]  │ ← filter pills by block_type
│                                   │
│ ┌─────────────┐ ┌─────────────┐  │
│ │ ░░░░░░░░░░ │ │ ░░░░░░░░░░ │  │ ← mini preview (lines as placeholders)
│ │ Services    │ │ Pricing     │  │
│ │ Overview    │ │ Table       │  │
│ │ [Insert]  ↗│ │ [Insert]  ↗│  │
│ └─────────────┘ └─────────────┘  │
└───────────────────────────────────┘
```

- Two-column card grid
- Each card shows: block_type badge, name, date, **[Insert]** button
- **[Insert]** calls `onInsertBlock(sectionTemplate.block_data)` passed from the parent editor

---

## Part 4 — Editor Integration (SectionBlockWrapper)

### Modify `src/components/proposals/blocks/SectionBlockWrapper.tsx` [MODIFY]

Add a **"Save as Section Template"** button to the existing floating action bar (alongside the existing Copy and Delete buttons).

```tsx
// In the hovered action bar:
<button
    onClick={() => onSaveAsTemplate?.(id)}
    title="Save section as template"
    className="p-2 rounded-lg transition-all ..."
>
    <LayoutPanelTop size={13} />
</button>
```

New prop: `onSaveAsTemplate?: (id: string) => void`

### How it wires up in ProposalEditor / InvoiceEditor [MODIFY]

In the editor that renders `SectionBlockWrapper`:
1. Pass `onSaveAsTemplate={(blockId) => { setSavingSectionId(blockId); setSaveSectionModalOpen(true); }}`
2. When `SaveSectionTemplateModal` confirms:
   - Find the block in the `blocks[]` array by id
   - Call `addSectionTemplate({ name, description, tags, block_type: block.type, source_entity: 'proposal', block_data: block, background_color: block.backgroundColor })`
   - Show success toast

---

## Part 5 — ContentBlock Snippets Integration

### Modify `src/components/proposals/blocks/ContentBlock.tsx` [MODIFY]

The BlockNote editor's slash `/` menu already uses `SuggestionMenuController`. We add a **second** `SuggestionMenuController` triggered by `::` (double colon) that shows snippets.

```tsx
// Add a second suggestion controller for snippets
<SuggestionMenuController
    triggerCharacter="::"
    getItems={async (query) => {
        const snippets = useSnippetStore.getState().snippets;
        return snippets
            .filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
            .map(snippet => ({
                title: snippet.name,
                subtext: snippet.content_text?.slice(0, 60) + '...',
                icon: <Zap size={14} />,
                onItemClick: () => {
                    editor.insertBlocks(snippet.content_blocks, editor.getTextCursorPosition().block, 'after');
                }
            }));
    }}
/>
```

Additionally, add a **"Save as Snippet"** button to the ContentBlock's own floating toolbar (visible when text is selected inside BlockNote). This uses BlockNote's `FormattingToolbarController` to inject a custom button.

> [!NOTE]
> BlockNote exposes `FormattingToolbarController` from `@blocknote/react`. We add a custom button that grabs the current editor content (`editor.document`) and opens `SaveSnippetModal`.

---

## Part 6 — Templates Page Redesign

### Modify `src/app/templates/page.tsx` [MODIFY]

**New layout: Two top-level tabs**

```
┌──── Templates ─────────────────────────────────────────────────┐
│                                                                 │
│  [📄 Document Templates]   [⬜ Section Templates]   [⚡ Snippets]│
│  ─────────────────────     ──────────────────────               │
│                                                                 │
│  ← (existing sidebar + grid for Document Templates)            │
└─────────────────────────────────────────────────────────────────┘
```

Three top-level tab buttons replace the current sidebar (which moves INSIDE the Document Templates tab):

| Tab | State value | Content |
|---|---|---|
| `document` | Current full proposal/invoice/form grid | Existing sidebar + grid |
| `section` | New section template grid | No sidebar needed; filter by `block_type` via pills |
| `snippet` | New snippet list | Simple list with name, preview, delete |

**Section Templates tab UI:**
- Filter bar with pills: `[All] [content] [pricing] [signature] [header]`
- Card grid (same card style as document templates but smaller, no paper mini-preview)
- Card shows: block type badge (color-coded), name, source entity, date, **[Insert into editor]** button (prompts a toast saying "Copied! Now paste into any editor block")
- Actually: **[Copy Block]** → stores the block_data in `localStorage['clipboard_block']`, then in editors there's a "Paste from Library" button

> [!IMPORTANT]
> "Insert into editor" is tricky across pages. The recommended approach is **Copy to Clipboard (block data)** + an **in-editor paste button** in the block add menu. Do NOT attempt cross-page state injection.

**Snippet tab UI:**
- Simple list (no cards), each row has: name, content_text preview, tags, delete button
- Edit snippet name inline (double-click)

---

## Part 7 — In-Editor "Insert Section" Entry Point

In the existing "Add Block" button/menu in ProposalEditor, add a new option:

```
[ + Add Block ]
  ├── Content  
  ├── Pricing Table
  ├── Signature
  ├── Header
  └── ── From Template ──────  ← new separator
      └── Browse Section Templates  → opens SectionTemplateBrowser drawer
```

When a section template is inserted:
1. Generate a new `id` (uuid)
2. Merging `block_data` with the new id
3. Push to the `blocks[]` array at the correct position
4. Auto-scroll to the new block

---

## Verification Plan

### Automated
No automated test suite currently exists in this project. All verification is manual.

### Manual Verification

**Test 1 — Saving a section template:**
1. Open any Proposal or Invoice
2. Hover over any block → action bar appears
3. Click the new **"Save as Section Template"** button (LayoutPanelTop icon)
4. Modal opens → fill in name "Test Section" → click Save
5. ✅ Toast shows "Section saved"
6. Go to `/templates` → click "Section Templates" tab
7. ✅ Card appears with name "Test Section"

**Test 2 — Inserting a section template:**
1. In an editor, click **"+ Add Block"** → "Browse Section Templates"
2. ✅ Drawer opens, shows "Test Section"
3. Click **[Insert]**
4. ✅ Block appears in the editor at bottom of block list

**Test 3 — Saving a snippet:**
1. In a ContentBlock, type some text
2. Select all text → formatting toolbar appears
3. Click **"Save as Snippet"** button (Zap icon)
4. Modal opens → fill in name "Intro Text" → Save
5. ✅ Toast shows "Snippet saved"
6. Go to `/templates` → click "Snippets" tab
7. ✅ Row appears with preview text

**Test 4 — Using a snippet via `::` trigger:**
1. In a ContentBlock, type `::` → suggestion menu appears
2. ✅ "Intro Text" appears in the list
3. Click it → blocks are inserted at cursor position
4. ✅ Text appears in the editor

**Test 5 — Templates page tab switching:**
1. Navigate to `/templates`
2. ✅ Three tabs are visible: "Document Templates", "Section Templates", "Snippets"
3. Clicking each tab shows the correct content
4. ✅ Document Templates tab still works exactly as before (no regression)
