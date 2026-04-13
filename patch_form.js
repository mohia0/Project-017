const fs = require('fs');

let content = fs.readFileSync('src/components/schedulers/SchedulerEditor.tsx', 'utf8');

const stateBlock = `    const [canvasStep, setCanvasStep] = useState<CanvasStep>('scheduler');
    const [openFieldIndex, setOpenFieldIndex] = useState<number | null>(null);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const updateFields = (newFields: FormField[]) => updateMeta({ fields: newFields });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = (meta.fields || []).findIndex(f => f.id === active.id);
            const newIndex = (meta.fields || []).findIndex(f => f.id === over.id);
            updateFields(arrayMove(meta.fields || [], oldIndex, newIndex));
        }
    };

    const addField = (def: FieldTypeDef, index: number) => {
        const newField: FormField = {
            id: uuidv4(),
            type: def.type,
            label: def.defaultLabel,
            required: false,
            placeholder: '',
            description: ''
        };
        const current = meta.fields || [];
        const copy = [...current];
        copy.splice(index, 0, newField);
        updateFields(copy);
        setSelectedFieldId(newField.id);
    };

    const removeField = (id: string) => {
        updateFields((meta.fields || []).filter(f => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };`;

content = content.replace("    const [canvasStep, setCanvasStep] = useState<CanvasStep>('scheduler');", stateBlock);

const formRenderBlock = `{canvasStep === 'form' && (
                                                <div className="max-w-[460px] mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4">
                                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                                        <SortableContext items={(meta.fields || []).map(f => f.id)} strategy={verticalListSortingStrategy}>
                                                            <div className="space-y-0 relative">
                                                                {(meta.fields || []).length === 0 && (
                                                                    <div className="py-12 border-2 border-dashed rounded-xl text-center opacity-50"
                                                                        style={{ borderColor: isColorDark(design.blockBackgroundColor || '#fff') ? '#444' : '#ccc' }}>
                                                                        No custom form fields added.
                                                                    </div>
                                                                )}
                                                                {(meta.fields || []).map((f: FormField, i: number) => (
                                                                    <div key={f.id}>
                                                                        {i === 0 && (
                                                                            <FieldInsertArea index={0} totalFields={(meta.fields || []).length} openIndex={openFieldIndex}
                                                                                setOpenIndex={setOpenFieldIndex} onAdd={addField} isDark={isColorDark(design.blockBackgroundColor || '#fff')}
                                                                                primaryColor={design.primaryColor || '#4dbf39'} borderRadius={design.borderRadius || 16} />
                                                                        )}
                                                                        
                                                                        <FieldPreview
                                                                            field={f}
                                                                            isDark={isColorDark(design.blockBackgroundColor || '#fff')}
                                                                            isSelected={selectedFieldId === f.id}
                                                                            onClick={() => setSelectedFieldId(f.id)}
                                                                            onRemove={() => removeField(f.id)}
                                                                            primaryColor={design.primaryColor || '#4dbf39'}
                                                                            borderRadius={design.borderRadius || 16}
                                                                        />

                                                                        <FieldInsertArea index={i + 1} totalFields={(meta.fields || []).length} openIndex={openFieldIndex}
                                                                            setOpenIndex={setOpenFieldIndex} onAdd={addField} isDark={isColorDark(design.blockBackgroundColor || '#fff')}
                                                                            primaryColor={design.primaryColor || '#4dbf39'} borderRadius={design.borderRadius || 16} />
                                                                    </div>
                                                                ))}
                                                                {(meta.fields || []).length === 0 && (
                                                                    <FieldInsertArea index={0} totalFields={0} openIndex={openFieldIndex}
                                                                        setOpenIndex={setOpenFieldIndex} onAdd={addField} isDark={isColorDark(design.blockBackgroundColor || '#fff')}
                                                                        primaryColor={design.primaryColor || '#4dbf39'} borderRadius={design.borderRadius || 16} centered />
                                                                )}
                                                            </div>
                                                        </SortableContext>
                                                    </DndContext>
                                                    
                                                    <div className="flex gap-3 pt-2">
                                                        <button className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all"
                                                            style={{ 
                                                                borderColor: isColorDark(design.blockBackgroundColor || '#fff') ? '#333' : '#e5e5e5', 
                                                                color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#555',
                                                                borderRadius: \`\${Math.max(0, (design.borderRadius ?? 16) - 4)}px\`,
                                                            }}>← Back</button>
                                                        <button className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all text-white"
                                                            style={{ 
                                                                background: design.primaryColor || '#4dbf39',
                                                                color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000',
                                                                borderRadius: \`\${Math.max(0, (design.borderRadius ?? 16) - 4)}px\`,
                                                            }}>Schedule →</button>
                                                    </div>
                                                </div>
                                            )}`;

// I need to properly replace just the canvasStep === 'form' block.
// To do this reliably, I'll use a regex matching '{canvasStep === 'form' && (' inside the component.
const regex = /{canvasStep === 'form' && \(\s*<div.*?Your details.*?<\/div>\s*\)}/s;

// Since it's nested deep, I will do a substring replacement manually by matching exact content.
const startMarker = "{canvasStep === 'form' && (";
const endMarker = "Schedule \u2192</button>\n                                                    </div>\n                                                </div>\n                                            )}"; // "Schedule →</button>"

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const fullEndIdx = endIdx + endMarker.length;
    content = content.substring(0, startIdx) + formRenderBlock + content.substring(fullEndIdx);
} else {
    // If not found, log it so the command fails.
    console.error("Could not find the form render block");
    process.exit(1);
}

// Modify button functionality (the times slots inside 'scheduler' step)
const timesMarker = "onClick={() => setCanvasStep('form')}";
if (content.indexOf(timesMarker) === -1) {
    content = content.replace("className=\"w-full py-2.5 rounded-lg text-[12px] font-semibold border text-center transition-all hover:opacity-80\"",
                              "onClick={() => setCanvasStep('form')}\n                                                                className=\"w-full py-2.5 rounded-lg text-[12px] font-semibold border text-center transition-all hover:opacity-80\"");
}

fs.writeFileSync('src/components/schedulers/SchedulerEditor.tsx', content);
